const TRADIER_API_BASE = 'https://api.tradier.com/v1';
const TRADIER_API_TOKEN = process.env.TRADIER_API_TOKEN;

if (!TRADIER_API_TOKEN) {
  console.warn('TRADIER_API_TOKEN is not set in .env');
}

async function tradierFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${TRADIER_API_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${TRADIER_API_TOKEN}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tradier API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

interface TradierQuote {
  last?: number;
  bid?: number;
  ask?: number;
  close?: number;
  prevclose?: number;
}

interface TradierQuotesResponse {
  quotes: {
    quote: TradierQuote | TradierQuote[];
  };
}

export async function getMarketData(symbol: string): Promise<number> {
  const data = await tradierFetch<TradierQuotesResponse>(`/markets/quotes?symbols=${encodeURIComponent(symbol)}`);
  const quote = data.quotes.quote;
  const q = Array.isArray(quote) ? quote[0] : quote;
  if (!q) throw new Error(`No quote data for ${symbol}`);
  const price = q.last ?? q.bid ?? q.ask ?? q.close ?? q.prevclose;
  if (price == null) throw new Error(`No price available for ${symbol}`);
  return price;
}

interface TradierExpirationsResponse {
  expirations: {
    date: string | string[];
  };
}

export async function getOptionsExpirations(symbol: string): Promise<string[]> {
  const data = await tradierFetch<TradierExpirationsResponse>(`/markets/options/expirations?symbol=${encodeURIComponent(symbol)}`);
  const dates = data.expirations.date;
  const list = Array.isArray(dates) ? dates : [dates];
  return list.map(d => d.replace(/-/g, '')).sort();
}

interface TradierGreeks {
  delta?: number;
}

interface TradierOption {
  symbol: string;
  type: 'call' | 'put' | 'option';
  option_type: 'call' | 'put';
  strike: number;
  expiration_date: string;
  bid?: number;
  ask?: number;
  greeks?: TradierGreeks;
  volume?: number;
  open_interest?: number;
}

interface TradierChainResponse {
  options: {
    option: TradierOption | TradierOption[];
  };
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

export async function getOptionsChain(symbol: string, expiration: string): Promise<OptionContract[]> {
  const underlyingPrice = await getMarketData(symbol);
  console.log(`[Tradier] ${symbol} underlying price: ${underlyingPrice}`);

  const tradierExpiration = expiration.length === 8
    ? `${expiration.substring(0, 4)}-${expiration.substring(4, 6)}-${expiration.substring(6, 8)}`
    : expiration;

  const data = await tradierFetch<TradierChainResponse>(
    `/markets/options/chains?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(tradierExpiration)}&greeks=true`
  );
  const options = data.options.option;
  const list = Array.isArray(options) ? options : [options];

  return list
    .filter((o) => {
      if (o.strike == null || o.expiration_date == null) return false;
      if (o.option_type === 'call') return o.strike > underlyingPrice;
      return o.strike < underlyingPrice;
    })
    .map((o) => ({
      conId: 0,
      symbol: o.symbol,
      right: o.option_type === 'call' ? 'C' : 'P',
      strike: o.strike,
      expiration: o.expiration_date.replace(/-/g, ''),
      bid: o.bid,
      ask: o.ask,
      delta: o.greeks?.delta,
      volume: o.volume,
      openInterest: o.open_interest,
    }));
}
