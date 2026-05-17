import { Portfolios } from '@stoqey/ibkr';
import type { EventEmitter } from 'events';
import pLimit from 'p-limit';

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
            ib.off('error', onError);
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
            reject(new Error(`IBKR error for ${symbol}: ${err} (code: ${code})`));
        }
    };

    ib.on('tickPrice', onTickPrice);
    ib.on('error', onError);
    
    // Request delayed data (3) to avoid "Requested market data is not subscribed" error
    try { ib.reqMarketDataType(3); } catch (e) {}
    console.log(`[getMarketData] Requesting market data for ${symbol} (reqId: ${reqId})`);
    ib.reqMktData(reqId, { symbol, secType: 'STK', currency: 'USD', exchange: 'SMART' }, '', false, false);
    
    setTimeout(() => {
        if (!resolved) {
            resolved = true;
            ib.off('tickPrice', onTickPrice);
            ib.off('error', onError);
            try { ib.cancelMktData(reqId); } catch (e) {}
            reject(new Error(`Timeout fetching market data for ${symbol} after 8s`));
        }
    }, 8000);
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
  
  // Fetch underlying price to filter ITM options
  console.log(`[getOptionsChain] Fetching underlying price for ${symbol}`);
  const underlyingPrice = await getMarketData(symbol);
  console.log(`[getOptionsChain] ${symbol} price: ${underlyingPrice}`);
  
  return new Promise((resolve, reject) => {
    const contracts: OptionContract[] = [];
    
    const onContractDetails = (id: number, contractDetails: any) => {
      if (id === reqId) {
          const summary = contractDetails.summary;
          const exp = summary.expiry || summary.lastTradeDateOrContractMonth;
          if (exp === expiration || exp?.startsWith(expiration)) {
              const isITM = summary.right === 'C' 
                  ? summary.strike < underlyingPrice 
                  : summary.strike > underlyingPrice;
              if (isITM) {
                  contracts.push({
                      conId: summary.conId,
                      symbol: summary.symbol,
                      right: summary.right,
                      strike: summary.strike,
                      expiration: exp,
                  });
              }
          }
      }
    };
    
    const onContractDetailsEnd = async (id: number) => {
        if (id === reqId) {
            ib.off('contractDetails', onContractDetails);
            ib.off('contractDetailsEnd', onContractDetailsEnd);
            
            contracts.sort((a,b) => a.strike - b.strike);
            
            // Try to set delayed data for options if live data isn't available
            try { ib.reqMarketDataType(3); } catch (e) {}

            const limit = pLimit(20); // 20 concurrent requests max
            const fetchPromises = contracts.map(contract => limit(() => new Promise<void>((res) => {
                const mReqId = getReqId();
                let resolved = false;

                const onTickPrice = (tId: number, tickType: number, price: number) => {
                    if (tId === mReqId && price > 0) {
                        // 1=bid, 2=ask, 66=delayed bid, 67=delayed ask
                        if (tickType === 1 || tickType === 66) contract.bid = price;
                        if (tickType === 2 || tickType === 67) contract.ask = price;
                    }
                };

                const onTickOption = (tId: number, tickType: number, impliedVol: number, delta: number) => {
                    if (tId === mReqId && delta !== null && delta !== undefined) {
                        // tickType 13 = model computation, 10 = bid, 11 = ask
                        contract.delta = delta;
                    }
                };

                const cleanup = () => {
                    ib.off('tickPrice', onTickPrice);
                    ib.off('tickOptionComputation', onTickOption);
                    ib.off('error', onError);
                    ib.off('tickSnapshotEnd', onSnapshotEnd);
                };

                const onError = (err: any, code: number, eId: number) => {
                    if (eId === mReqId && !resolved) {
                        resolved = true;
                        cleanup();
                        try { ib.cancelMktData(mReqId); } catch(e){}
                        res();
                    }
                };

                const onSnapshotEnd = (tId: number) => {
                    if (tId === mReqId && !resolved) {
                        resolved = true;
                        cleanup();
                        try { ib.cancelMktData(mReqId); } catch(e){}
                        res();
                    }
                };

                ib.on('tickPrice', onTickPrice);
                ib.on('tickOptionComputation', onTickOption);
                ib.on('error', onError);
                ib.on('tickSnapshotEnd', onSnapshotEnd);

                // Request snapshot
                ib.reqMktData(mReqId, { conId: contract.conId, exchange: 'SMART' }, '', true, false);

                // Timeout after 2.5s for each contract
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        cleanup();
                        try { ib.cancelMktData(mReqId); } catch(e){}
                        res();
                    }
                }, 2500);
            })));

            await Promise.all(fetchPromises);
            resolve(contracts);
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
