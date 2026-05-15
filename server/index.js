require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ibkr = require('@stoqey/ibkr').default;
const { AccountSummary, AppEvents, APPEVENTS, Portfolios } = require('@stoqey/ibkr');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

let isConnected = false;

const FRESH_DATA_TIMEOUT_MS = 8000;

function mapPosition(pos) {
  return {
    symbol: pos.symbol,
    secType: pos.secType,
    position: pos.position,
    averageCost: pos.averageCost,
    marketPrice: pos.marketPrice,
    marketValue: pos.marketValue,
    unrealizedPNL: pos.unrealizedPNL,
    realizedPNL: pos.realizedPNL,
    accountName: pos.accountName,
    conId: pos.conId,
  };
}

/** Persistent cache — IB only sends updatePortfolio on first subscribe or when positions change */
const positionsCache = new Map();
let positionsFetchInFlight = null;
let positionListenersAttached = false;

function positionKey(contract, accountName) {
  const id = contract?.conId ?? contract?.symbol ?? 'unknown';
  const secType = contract?.secType ?? '';
  return `${id}:${secType}:${accountName ?? ''}`;
}

function upsertCachedPosition(entry) {
  const key = positionKey(entry, entry.accountName);
  const qty = Number(entry.position);
  if (!qty) {
    positionsCache.delete(key);
    return;
  }
  positionsCache.set(key, entry);
}

function getCachedPositions() {
  return Array.from(positionsCache.values()).map(mapPosition);
}

/** Accumulate every updatePortfolio into positionsCache (deduped by conId) */
function attachPositionListeners(ib) {
  if (positionListenersAttached || !ib) return;
  positionListenersAttached = true;

  ib.on(
    'updatePortfolio',
    (contract, position, marketPrice, marketValue, averageCost, unrealizedPNL, realizedPNL, accountName) => {
      upsertCachedPosition({
        ...contract,
        position,
        marketPrice,
        marketValue,
        averageCost,
        unrealizedPNL,
        realizedPNL,
        accountName,
      });
    }
  );

  AppEvents.Instance.on(APPEVENTS.PORTFOLIOS, (data) => {
    const list = data?.portfolios ?? (Array.isArray(data) ? data : []);
    for (const pos of list) {
      upsertCachedPosition(pos);
    }
  });
}

/**
 * Request a refresh from IB, then return the persistent cache.
 * IB does not re-send all updatePortfolio events on every reqAccountUpdates —
 * only accountDownloadEnd (often immediately), which left a per-request Map empty.
 */
function fetchFreshPositions() {
  if (positionsFetchInFlight) {
    return positionsFetchInFlight;
  }

  const portfoliosInstance = Portfolios.Instance;
  const ib = portfoliosInstance.ib;

  positionsFetchInFlight = new Promise((resolve) => {
    if (!ib) {
      resolve([]);
      return;
    }

    let settleTimer = null;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (settleTimer) clearTimeout(settleTimer);
      clearTimeout(hardTimeout);
      ib.off('updatePortfolio', onRefreshUpdate);
      ib.off('accountDownloadEnd', onDownloadEnd);
      const positions = getCachedPositions();
      console.log(`fetchFreshPositions: returning ${positions.length} position(s)`);
      resolve(positions);
    };

    const scheduleFinish = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(finish, 400);
    };

    const onRefreshUpdate = () => scheduleFinish();
    const onDownloadEnd = () => scheduleFinish();

    const hardTimeout = setTimeout(finish, FRESH_DATA_TIMEOUT_MS);

    ib.on('updatePortfolio', onRefreshUpdate);
    ib.once('accountDownloadEnd', onDownloadEnd);
    portfoliosInstance.reqAccountUpdates();

    // If IB sends no new events, return whatever we already have from init
    if (positionsCache.size > 0) {
      scheduleFinish();
    }
  }).finally(() => {
    positionsFetchInFlight = null;
  });

  return positionsFetchInFlight;
}

function fetchFreshAccountSummary() {
  const accountInstance = AccountSummary.Instance;
  const ib = accountInstance.ib;

  return new Promise((resolve) => {
    if (!ib) {
      return resolve(accountInstance.accountSummary || {});
    }

    const finish = () => {
      ib.off('accountSummaryEnd', onEnd);
      clearTimeout(timeout);
      resolve(accountInstance.accountSummary);
    };

    const onEnd = () => finish();

    const timeout = setTimeout(finish, FRESH_DATA_TIMEOUT_MS);

    ib.once('accountSummaryEnd', onEnd);
    accountInstance.reqAccountSummary();
  });
}

function waitForAccountDownload(ib) {
  return new Promise((resolve) => {
    const done = () => {
      ib.off('accountDownloadEnd', done);
      clearTimeout(timer);
      resolve();
    };
    ib.once('accountDownloadEnd', done);
    const timer = setTimeout(done, FRESH_DATA_TIMEOUT_MS);
  });
}

/** ibkr() already runs AccountSummary + Portfolios init before CONNECTED — attach listeners then re-subscribe */
async function seedPositionsCache() {
  const ib = AccountSummary.Instance.ib;
  if (!ib) return;

  attachPositionListeners(ib);

  for (const pos of Portfolios.Instance.currentPortfolios || []) {
    upsertCachedPosition(pos);
  }

  if (positionsCache.size > 0) {
    console.log(`Initial positions cached: ${positionsCache.size}`);
    return;
  }

  const accountId =
    AccountSummary.Instance.accountSummary?.AccountId ||
    AccountSummary.Instance.AccountId;

  if (!accountId) {
    console.warn('No account ID available to seed positions');
    return;
  }

  console.log('Re-subscribing to account updates to load positions...');
  ib.reqAccountUpdates(false, accountId);
  ib.reqAccountUpdates(true, accountId);
  await waitForAccountDownload(ib);
  console.log(`Initial positions cached: ${positionsCache.size}`);
}

async function startIBKR() {
  try {
    console.log(`Attempting to connect to IBKR on ${process.env.IBKR_HOST || '127.0.0.1'}:${process.env.IBKR_PORT || 7497}...`);
    const started = await ibkr();

    if (started) {
      isConnected = true;
      console.log('Successfully connected to IBKR TWS/Gateway');
      await seedPositionsCache();
    } else {
      console.error('Failed to connect to IBKR');
    }
  } catch (error) {
    console.error('Error starting IBKR:', error);
  }
}

app.get('/api/status', (req, res) => {
  res.json({ connected: isConnected });
});

app.get('/api/positions', async (req, res) => {
  if (!isConnected) {
    return res.status(503).json({ error: 'IBKR not connected. Please ensure TWS/Gateway is running and API is enabled.' });
  }
  try {
    const positions = await fetchFreshPositions();
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions from IBKR.' });
  }
});

app.get('/api/account-summary', async (req, res) => {
  if (!isConnected) {
    return res.status(503).json({ error: 'IBKR not connected. Please ensure TWS/Gateway is running and API is enabled.' });
  }
  try {
    const summary = await fetchFreshAccountSummary();
    if (!summary || Object.keys(summary).length === 0) {
      return res.status(503).json({ error: 'Account summary not yet available.' });
    }
    res.json(summary);
  } catch (error) {
    console.error('Error fetching account summary:', error);
    res.status(500).json({ error: 'Failed to fetch account summary from IBKR.' });
  }
});

app.listen(port, () => {
  console.log(`IBKR Server listening at http://localhost:${port}`);
  startIBKR();
});
