/**
 * Browser client for @stoqey/ibkr patterns (see https://github.com/stoqey/ibkr).
 * Connects via the Express backend; IBKR_HOST / IBKR_PORT live in server/.env.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function apiFetch(path) {
  const url = `${API_BASE}${path}${path.includes('?') ? '&' : '?'}_=${Date.now()}`;
  let res;
  try {
    res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
  } catch {
    throw new Error(
      'Cannot reach the IBKR API server. Run `npm run server` in a separate terminal (port 3001), keep `npm run dev` running, then refresh. ' +
        'If the error persists, set VITE_API_BASE=http://127.0.0.1:3001/api in .env.development.'
    );
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

/** @returns {boolean} whether the backend is connected to TWS/Gateway */
export default async function ibkr() {
  const { connected } = await apiFetch('/status');
  return connected;
}

export class Portfolios {
  static _instance;

  positions = [];

  static get Instance() {
    return this._instance || (this._instance = new Portfolios());
  }

  /** Refresh positions from the server (mirrors Portfolios.init / getPortfolios). */
  init = async () => {
    const raw = await apiFetch('/positions');
    this.positions = raw.map(normalizePosition);
    return this.positions;
  };

  getPortfolios = () => this.init();
}

export class AccountSummary {
  static _instance;

  accountSummary = null;

  static get Instance() {
    return this._instance || (this._instance = new AccountSummary());
  }

  init = async () => {
    this.accountSummary = await apiFetch('/account-summary');
    return this.accountSummary;
  };

  getAccountSummary = () => this.init();
}

function normalizePosition(row) {
  return {
    symbol: row.symbol ?? row.ticker,
    secType: row.secType ?? row.assetClass,
    position: row.position,
    averageCost: row.averageCost ?? row.avgPrice,
    marketPrice: row.marketPrice ?? row.mktPrice,
    marketValue: row.marketValue ?? row.mktValue,
    unrealizedPNL: row.unrealizedPNL ?? row.unrealizedPnl,
    realizedPNL: row.realizedPNL ?? row.realizedPnl,
    accountName: row.accountName,
    conId: row.conId,
  };
}

/** @deprecated Use `Portfolios.Instance.getPortfolios()` instead */
export async function fetchIBKRPositions() {
  const started = await ibkr();
  if (!started) {
    throw new Error(
      'IBKR not connected. Ensure TWS/Gateway is running and API is enabled.'
    );
  }
  return Portfolios.Instance.getPortfolios();
}
