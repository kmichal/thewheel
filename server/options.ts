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
  
  console.log(`[getOptionsExpirations] Requesting STK contract details for ${symbol} (reqId: ${reqId})`);
  
  return new Promise((resolve, reject) => {
    let conId: number | undefined;

    const onContractDetails = (id: number, contractDetails: any) => {
      if (id === reqId && contractDetails?.summary?.conId && !conId) {
        conId = contractDetails.summary.conId;
        const optReqId = getReqId();
        
        console.log(`[getOptionsExpirations] Found STK conId=${conId} for ${symbol}, requesting option params (optReqId: ${optReqId})`);
        
        let allExpirations = new Set<string>();
        
        const onOptParams = (oId: number, exchange: string, uConId: number, tradingClass: string, multiplier: string, expirations: string[], strikes: number[]) => {
          if (oId === optReqId) {
            expirations.forEach(e => allExpirations.add(e));
            console.log(`[getOptionsExpirations] optParams for ${symbol}: exchange=${exchange}, tradingClass=${tradingClass}, multiplier=${multiplier}, expirations=${expirations.length}, strikes=${strikes.length}`);
          }
        };
        
        const onOptParamsEnd = (oId: number) => {
            if (oId === optReqId) {
                ib.off('securityDefinitionOptionParameter', onOptParams);
                ib.off('securityDefinitionOptionParameterEnd', onOptParamsEnd);
                console.log(`[getOptionsExpirations] Resolved ${allExpirations.size} expirations for ${symbol}`);
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
                console.log(`[getOptionsExpirations] No STK conId found for ${symbol}`);
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
  
  // Fetch underlying price to filter ITM options
  console.log(`[getOptionsChain] Fetching underlying price for ${symbol}`);
  const underlyingPrice = await getMarketData(symbol);
  console.log(`[getOptionsChain] ${symbol} price: ${underlyingPrice}`);
  
  // Step 1: Get STK conId
  const stkReqId = getReqId();
  console.log(`[getOptionsChain] Step 1: Getting STK conId for ${symbol} (reqId: ${stkReqId})`);
  
  const conId = await new Promise<number | null>((resolve) => {
    let done = false;
    
    const onSTKDetails = (id: number, contractDetails: any) => {
      if (id === stkReqId && contractDetails?.summary?.conId && !done) {
        done = true;
        ib.off('contractDetails', onSTKDetails);
        ib.off('contractDetailsEnd', onSTKDetailsEnd);
        ib.off('error', onError);
        resolve(contractDetails.summary.conId);
      }
    };
    
    const onSTKDetailsEnd = (id: number) => {
      if (id === stkReqId && !done) {
        done = true;
        ib.off('contractDetails', onSTKDetails);
        ib.off('contractDetailsEnd', onSTKDetailsEnd);
        ib.off('error', onError);
        resolve(null);
      }
    };
    
    const onError = (err: any, code: number, eId: number) => {
      if (eId === stkReqId && !done) {
        console.log(`[getOptionsChain] IBKR error getting STK conId: ${err} (code: ${code})`);
      }
    };

    ib.on('contractDetails', onSTKDetails);
    ib.on('contractDetailsEnd', onSTKDetailsEnd);
    ib.on('error', onError);
    
    ib.reqContractDetails(stkReqId, { symbol, secType: 'STK', currency: 'USD', exchange: 'SMART' });
    
    setTimeout(() => {
      if (!done) {
        done = true;
        ib.off('contractDetails', onSTKDetails);
        ib.off('contractDetailsEnd', onSTKDetailsEnd);
        ib.off('error', onError);
        resolve(null);
      }
    }, 8000);
  });
  
  if (!conId) {
    console.log(`[getOptionsChain] No STK conId found for ${symbol}`);
    return [];
  }
  
  console.log(`[getOptionsChain] Found STK conId=${conId} for ${symbol}`);
  
  // Step 2: Get option params (trading class, multiplier, strikes)
  const optReqId = getReqId();
  console.log(`[getOptionsChain] Step 2: Requesting option params for ${symbol} (optReqId: ${optReqId})`);
  
  const allStrikes = await new Promise<Map<string, { tradingClass: string, multiplier: string, strikes: number[] }>>((resolve) => {
    const result = new Map<string, { tradingClass: string, multiplier: string, strikes: number[] }>();
    let done = false;
    
    const onOptParams = (oId: number, exchange: string, uConId: number, tradingClass: string, multiplier: string, expirations: string[], strikes: number[]) => {
      if (oId === optReqId) {
        for (const exp of expirations) {
          if (exp === expiration || exp.startsWith(expiration)) {
            result.set(exp, { tradingClass, multiplier, strikes });
          }
        }
      }
    };
    
    const onOptParamsEnd = (oId: number) => {
      if (oId === optReqId && !done) {
        done = true;
        ib.off('securityDefinitionOptionParameter', onOptParams);
        ib.off('securityDefinitionOptionParameterEnd', onOptParamsEnd);
        ib.off('error', onError);
        resolve(result);
      }
    };
    
    const onError = (err: any, code: number, eId: number) => {
      if (eId === optReqId && !done) {
        console.log(`[getOptionsChain] IBKR error getting option params: ${err} (code: ${code})`);
      }
    };

    ib.on('securityDefinitionOptionParameter', onOptParams);
    ib.on('securityDefinitionOptionParameterEnd', onOptParamsEnd);
    ib.on('error', onError);
    
    ib.reqSecDefOptParams(optReqId, symbol, '', 'STK', conId);
    
    setTimeout(() => {
      if (!done) {
        done = true;
        ib.off('securityDefinitionOptionParameter', onOptParams);
        ib.off('securityDefinitionOptionParameterEnd', onOptParamsEnd);
        ib.off('error', onError);
        resolve(result);
      }
    }, 8000);
  });
  
  if (allStrikes.size === 0) {
    console.log(`[getOptionsChain] No matching expiration found for ${symbol} ${expiration}`);
    return [];
  }
  
  // Step 3: Build ITM contracts
  const contracts: OptionContract[] = [];
  
  for (const [exp, data] of allStrikes) {
    const { tradingClass, multiplier, strikes } = data;
    console.log(`[getOptionsChain] Step 3: Building contracts for ${symbol} exp=${exp}, tradingClass=${tradingClass}, multiplier=${multiplier}, total strikes=${strikes.length}`);
    
    for (const strike of strikes) {
      const isCallITM = strike < underlyingPrice;
      const isPutITM = strike > underlyingPrice;
      
      if (isCallITM) {
        contracts.push({ conId: 0, symbol, right: 'C', strike, expiration: exp });
      }
      if (isPutITM) {
        contracts.push({ conId: 0, symbol, right: 'P', strike, expiration: exp });
      }
    }
  }
  
  contracts.sort((a, b) => a.strike - b.strike);
  console.log(`[getOptionsChain] Built ${contracts.length} ITM contracts. Resolving conIds...`);
  
  // Step 4: Resolve conIds sequentially to avoid listener leak
  await resolveConIdsSequentially(contracts, symbol, ib);
  
  const validContracts = contracts.filter(c => c.conId > 0);
  console.log(`[getOptionsChain] ${validContracts.length}/${contracts.length} contracts with valid conIds. Fetching market data...`);
  
  // Step 5: Fetch market data
  return fetchOptionMarketData(validContracts, ib);
}

async function resolveConIdsSequentially(
  contracts: OptionContract[],
  symbol: string,
  ib: EventEmitter & Record<string, any>
): Promise<void> {
  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    const reqId = getReqId();
    
    await new Promise<void>(res => {
      let done = false;
      
      const onDetails = (id: number, details: any) => {
        if (id === reqId && details?.summary?.conId && !done) {
          done = true;
          contract.conId = details.summary.conId;
          ib.off('contractDetails', onDetails);
          ib.off('contractDetailsEnd', onEnd);
          ib.off('error', onError);
          res();
        }
      };
      
      const onEnd = (id: number) => {
        if (id === reqId && !done) {
          done = true;
          ib.off('contractDetails', onDetails);
          ib.off('contractDetailsEnd', onEnd);
          ib.off('error', onError);
          res();
        }
      };
      
      const onError = (err: any, code: number, eId: number) => {
        if (eId === reqId && !done) {
          done = true;
          ib.off('contractDetails', onDetails);
          ib.off('contractDetailsEnd', onEnd);
          ib.off('error', onError);
          res();
        }
      };
      
      ib.on('contractDetails', onDetails);
      ib.on('contractDetailsEnd', onEnd);
      ib.on('error', onError);
      
      ib.reqContractDetails(reqId, {
        symbol,
        secType: 'OPT',
        currency: 'USD',
        exchange: 'SMART',
        lastTradeDateOrContractMonth: contract.expiration,
        strike: contract.strike,
        right: contract.right,
        multiplier: '100',
      });
      
      setTimeout(() => {
        if (!done) {
          done = true;
          ib.off('contractDetails', onDetails);
          ib.off('contractDetailsEnd', onEnd);
          ib.off('error', onError);
          res();
        }
      }, 3000);
    });
    
    if ((i + 1) % 20 === 0) {
      console.log(`[getOptionsChain] Resolved conIds for ${i + 1}/${contracts.length} contracts...`);
    }
  }
}

async function fetchOptionMarketData(
  contracts: OptionContract[],
  ib: EventEmitter & Record<string, any>
): Promise<OptionContract[]> {
  if (contracts.length === 0) return [];
  
  try { ib.reqMarketDataType(3); } catch (e) {}

  const limit = pLimit(20);
  const fetchPromises = contracts.map(contract => limit(() => new Promise<void>((res) => {
    const mReqId = getReqId();
    let resolved = false;

    const onTickPrice = (tId: number, tickType: number, price: number) => {
      if (tId === mReqId && price > 0) {
        if (tickType === 1 || tickType === 66) contract.bid = price;
        if (tickType === 2 || tickType === 67) contract.ask = price;
      }
    };

    const onTickOption = (tId: number, tickType: number, impliedVol: number, delta: number) => {
      if (tId === mReqId && delta !== null && delta !== undefined) {
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

    ib.reqMktData(mReqId, { conId: contract.conId, exchange: 'SMART' }, '', true, false);

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
  console.log(`[getOptionsChain] Resolved ${contracts.length} contracts for ${contracts[0]?.symbol || 'unknown'} (with bids/asks/deltas)`);
  return contracts;
}
