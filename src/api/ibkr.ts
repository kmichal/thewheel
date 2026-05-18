import type { AccountSummaryData, Position } from '../types/position';

/**
 * Browser client for @stoqey/ibkr patterns (see https://github.com/stoqey/ibkr).
 * Connects via the Express backend; IBKR_HOST / IBKR_PORT live in server/.env.
 */

const API_BASE = '/api';

interface ApiErrorBody {
  error?: string;
}

interface RawPositionRow {
  symbol?: string;
  ticker?: string;
  secType?: string;
  assetClass?: string;
  position?: number;
  averageCost?: number;
  avgPrice?: number;
  marketPrice?: number;
  mktPrice?: number;
  marketValue?: number;
  mktValue?: number;
  unrealizedPNL?: number;
  unrealizedPnl?: number;
  realizedPNL?: number;
  realizedPnl?: number;
  accountName?: string;
  conId?: number;
}

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}${path.includes('?') ? '&' : '?'}_=${Date.now()}`;
  let res: Response;
  try {
    res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
  } catch {
    throw new Error(
      'Cannot reach the IBKR API server. Ensure `npm run server` is running in a separate terminal.'
    );
  }
  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(errorData.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Whether the backend is connected to TWS/Gateway */
export default async function ibkr(): Promise<boolean> {
  const { connected } = await apiFetch<{ connected: boolean }>('/status');
  return connected;
}

export class Portfolios {
  private static _instance: Portfolios | undefined;

  positions: Position[] = [];

  static get Instance(): Portfolios {
    return (this._instance ??= new Portfolios());
  }

  /** Refresh positions from the server (mirrors Portfolios.init / getPortfolios). */
  init = async (): Promise<Position[]> => {
    const raw = await apiFetch<RawPositionRow[]>('/positions');
    this.positions = raw.map(normalizePosition);
    return this.positions;
  };

  getPortfolios = (): Promise<Position[]> => this.init();
}

export class AccountSummary {
  private static _instance: AccountSummary | undefined;

  accountSummary: AccountSummaryData | null = null;

  static get Instance(): AccountSummary {
    return (this._instance ??= new AccountSummary());
  }

  init = async (): Promise<AccountSummaryData> => {
    this.accountSummary = await apiFetch<AccountSummaryData>('/account-summary');
    return this.accountSummary;
  };

  getAccountSummary = (): Promise<AccountSummaryData> => this.init();
}

function normalizePosition(row: RawPositionRow): Position {
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

export async function fetchMarketData(symbol: string): Promise<number> {
  const data = await apiFetch<{ price: number }>(`/market-data?symbol=${encodeURIComponent(symbol)}`);
  return data.price;
}

export async function fetchOptionsExpirations(symbol: string): Promise<string[]> {
  return apiFetch<string[]>(`/options/expirations?symbol=${encodeURIComponent(symbol)}`);
}

export interface OptionContract {
  conId: number;
  symbol: string;
  right: 'C' | 'P';
  strike: number;
  expiration: string;
  bid?: number;
  ask?: number;
  delta?: number;
  volume?: number;
  openInterest?: number;
}

export async function fetchOptionsChain(symbol: string, expiration: string): Promise<OptionContract[]> {
  return apiFetch<OptionContract[]>(`/options/chain?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(expiration)}`);
}

/** @deprecated Use `Portfolios.Instance.getPortfolios()` instead */
export async function fetchIBKRPositions(): Promise<Position[]> {
  const started = await ibkr();
  if (!started) {
    throw new Error(
      'IBKR not connected. Ensure TWS/Gateway is running and API is enabled.'
    );
  }
  return Portfolios.Instance.getPortfolios();
}
