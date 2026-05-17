import { Portfolios } from '@stoqey/ibkr';
import type { EventEmitter } from 'events';

let nextReqId = 1000;
const getReqId = () => nextReqId++;

function getIb(): EventEmitter & Record<string, any> {
  const ib = Portfolios.Instance.ib;
  if (!ib) throw new Error('IBKR not connected');
  return ib;
}

export async function getMarketData(symbol: string): Promise<number> {
  const ib = getIb();
  const reqId = getReqId();
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    const onTickPrice = (id: number, tickType: number, price: number) => {
      // 1 = bid, 2 = ask, 4 = last, 6 = high, 9 = close
      if (id === reqId && price > 0 && !resolved) {
          if (tickType === 4 || tickType === 9 || tickType === 1 || tickType === 2) {
            resolved = true;
            ib.off('tickPrice', onTickPrice);
            ib.cancelMktData(reqId);
            resolve(price);
          }
      }
    };

    const onError = (err: any, code: number, id: number) => {
        if (id === reqId && !resolved) {
            resolved = true;
            ib.off('tickPrice', onTickPrice);
            ib.off('error', onError);
            try { ib.cancelMktData(reqId); } catch (e) {}
            resolve(0);
        }
    };

    ib.on('tickPrice', onTickPrice);
    ib.on('error', onError);
    
    // Request delayed data (3) to avoid "Requested market data is not subscribed" error
    try { ib.reqMarketDataType(3); } catch (e) {}
    ib.reqMktData(reqId, { symbol, secType: 'STK', currency: 'USD', exchange: 'SMART' }, '', false, false);
    
    setTimeout(() => {
        if (!resolved) {
            resolved = true;
            ib.off('tickPrice', onTickPrice);
            ib.off('error', onError);
            try { ib.cancelMktData(reqId); } catch (e) {}
            resolve(0); // Timeout, return 0
        }
    }, 2500);
  });
}

export async function getOptionsExpirations(symbol: string): Promise<string[]> {
  const ib = getIb();
  const reqId = getReqId();
  
  return new Promise((resolve, reject) => {
    let conId: number | undefined;

    const onContractDetails = (id: number, contractDetails: any) => {
      if (id === reqId && contractDetails?.summary?.conId && !conId) {
        conId = contractDetails.summary.conId;
        const optReqId = getReqId();
        
        let allExpirations = new Set<string>();
        
        const onOptParams = (oId: number, exchange: string, uConId: number, tradingClass: string, multiplier: string, expirations: string[], strikes: number[]) => {
          if (oId === optReqId) {
            expirations.forEach(e => allExpirations.add(e));
          }
        };
        
        const onOptParamsEnd = (oId: number) => {
            if (oId === optReqId) {
                ib.off('securityDefinitionOptionParameter', onOptParams);
                ib.off('securityDefinitionOptionParameterEnd', onOptParamsEnd);
                resolve(Array.from(allExpirations).sort());
            }
        };

        ib.on('securityDefinitionOptionParameter', onOptParams);
        ib.on('securityDefinitionOptionParameterEnd', onOptParamsEnd);
        
        ib.reqSecDefOptParams(optReqId, symbol, '', 'STK', conId);
      }
    };
    
    const onContractDetailsEnd = (id: number) => {
        if (id === reqId) {
            ib.off('contractDetails', onContractDetails);
            ib.off('contractDetailsEnd', onContractDetailsEnd);
            if (!conId) {
                resolve([]); // No STK found
            }
        }
    };

    ib.on('contractDetails', onContractDetails);
    ib.on('contractDetailsEnd', onContractDetailsEnd);
    
    ib.reqContractDetails(reqId, { symbol, secType: 'STK', currency: 'USD', exchange: 'SMART' });
    
    setTimeout(() => {
        ib.off('contractDetails', onContractDetails);
        ib.off('contractDetailsEnd', onContractDetailsEnd);
        reject(new Error('Timeout fetching expirations'));
    }, 8000);
  });
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
}

export async function getOptionsChain(symbol: string, expiration: string): Promise<OptionContract[]> {
  const ib = getIb();
  const reqId = getReqId();
  
  return new Promise((resolve, reject) => {
    const contracts: OptionContract[] = [];
    
    const onContractDetails = (id: number, contractDetails: any) => {
      if (id === reqId) {
          const summary = contractDetails.summary;
          contracts.push({
              conId: summary.conId,
              symbol: summary.symbol,
              right: summary.right,
              strike: summary.strike,
              expiration: summary.expiry || summary.lastTradeDateOrContractMonth,
          });
      }
    };
    
    const onContractDetailsEnd = (id: number) => {
        if (id === reqId) {
            ib.off('contractDetails', onContractDetails);
            ib.off('contractDetailsEnd', onContractDetailsEnd);
            
            // Wait to fetch market data for all contracts? This might be too slow and hit pacing limits.
            // For now, we will return the contracts without realtime bid/ask/delta, 
            // or we can stream market data separately. The client usually requests it.
            // Let's just return the contracts to avoid hitting IBKR pacing limits.
            resolve(contracts.sort((a,b) => a.strike - b.strike));
        }
    };

    ib.on('contractDetails', onContractDetails);
    ib.on('contractDetailsEnd', onContractDetailsEnd);
    
    ib.reqContractDetails(reqId, { 
        symbol, 
        secType: 'OPT', 
        currency: 'USD', 
        exchange: 'SMART',
        lastTradeDateOrContractMonth: expiration 
    });
    
    setTimeout(() => {
        ib.off('contractDetails', onContractDetails);
        ib.off('contractDetailsEnd', onContractDetailsEnd);
        resolve(contracts);
    }, 15000);
  });
}
