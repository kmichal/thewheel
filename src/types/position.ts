export interface Position {
  symbol?: string;
  secType?: string;
  position?: number;
  averageCost?: number;
  marketPrice?: number;
  marketValue?: number;
  unrealizedPNL?: number;
  realizedPNL?: number;
  accountName?: string;
  conId?: number;
}

export type AccountSummaryData = Record<string, string | number | undefined>;
