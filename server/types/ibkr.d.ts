declare module '@stoqey/ibkr' {
  import type { EventEmitter } from 'events';

  interface IBContract {
    conId?: number;
    symbol?: string;
    secType?: string;
    [key: string]: unknown;
  }

  interface CachedPosition extends IBContract {
    position?: number;
    marketPrice?: number;
    marketValue?: number;
    averageCost?: number;
    unrealizedPNL?: number;
    realizedPNL?: number;
    accountName?: string;
  }

  interface PortfoliosInstance {
    ib: EventEmitter | null;
    currentPortfolios?: CachedPosition[];
    reqAccountUpdates(): void;
  }

  interface AccountSummaryInstance {
    ib: EventEmitter | null;
    accountSummary: Record<string, string | number | undefined> | null;
    AccountId?: string;
    reqAccountSummary(): void;
  }

  export const AppEvents: {
    Instance: EventEmitter;
  };

  export const APPEVENTS: {
    PORTFOLIOS: string;
  };

  export const Portfolios: {
    Instance: PortfoliosInstance;
  };

  export const AccountSummary: {
    Instance: AccountSummaryInstance;
  };

  export default function ibkr(): Promise<boolean>;
}
