import db from './db.js';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
const symbolMap: Record<string, string> = {
  'XAUUSD': 'GC=F', // Gold Futures
  'EURUSD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USDJPY': 'JPY=X',
  'AUDUSD': 'AUDUSD=X',
  'USDCAD': 'CAD=X'
};

// @ts-ignore
if (yahooFinance.suppressNotices) {
  // @ts-ignore
  yahooFinance.suppressNotices(['yahooFinance.chart']);
}

async function fetchAndStore(pair: string, timeframe: string, yfInterval: '1m' | '5m' | '1h', daysBack: number) {
  const symbol = symbolMap[pair];
  const period1 = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  
  try {
    const result = await yahooFinance.chart(symbol, {
      period1,
      interval: yfInterval,
    }) as any;

    if (result && result.quotes) {
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO candles (pair, timeframe, time, open, high, low, close, volume)
        VALUES (@pair, @timeframe, @time, @open, @high, @low, @close, @volume)
      `);

      db.transaction(() => {
        for (const q of result.quotes) {
          if (q.open === null || q.close === null) continue;
          insertStmt.run({
            pair,
            timeframe,
            time: Math.floor(new Date(q.date).getTime() / 1000),
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume || 0
          });
        }
      })();
    }
  } catch (error) {
    console.error(`Failed to fetch ${timeframe} for ${pair}:`, error);
  }
}

async function buildH4FromH1(pair: string) {
  const h1Candles = db.prepare(`SELECT * FROM candles WHERE pair = ? AND timeframe = 'H1' ORDER BY time ASC`).all(pair) as any[];
  if (h1Candles.length === 0) return;

  const h4Candles = [];
  let currentH4: any = null;

  for (const c of h1Candles) {
    const h4Time = Math.floor(c.time / 14400) * 14400; // 4 hours in seconds
    if (!currentH4 || currentH4.time !== h4Time) {
      if (currentH4) h4Candles.push(currentH4);
      currentH4 = { pair, timeframe: 'H4', time: h4Time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume };
    } else {
      currentH4.high = Math.max(currentH4.high, c.high);
      currentH4.low = Math.min(currentH4.low, c.low);
      currentH4.close = c.close;
      currentH4.volume += c.volume;
    }
  }
  if (currentH4) h4Candles.push(currentH4);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO candles (pair, timeframe, time, open, high, low, close, volume)
    VALUES (@pair, @timeframe, @time, @open, @high, @low, @close, @volume)
  `);

  db.transaction(() => {
    for (const c of h4Candles) {
      insertStmt.run(c);
    }
  })();
}

export async function ingestHistoricalData() {
  const count = db.prepare('SELECT COUNT(*) as c FROM candles').get() as { c: number };
  if (count.c === 0) {
    console.log('Fetching historical data from Yahoo Finance...');
    for (const pair of pairs) {
      await fetchAndStore(pair, 'H1', '1h', 30); // Last 30 days of H1
      await buildH4FromH1(pair);
      await fetchAndStore(pair, 'M5', '5m', 5);  // Last 5 days of M5
      await fetchAndStore(pair, 'M1', '1m', 2);  // Last 2 days of M1
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('Historical data ingestion complete.');
  }
}

// Start live ingestion
export function startLiveIngestion() {
  setInterval(async () => {
    for (const pair of pairs) {
      // Fetch the latest 1m data
      await fetchAndStore(pair, 'M1', '1m', 1);
      
      const now = new Date();
      const minutes = now.getMinutes();
      
      // Every 5 minutes, update M5
      if (minutes % 5 === 0) {
        await fetchAndStore(pair, 'M5', '5m', 1);
      }
      
      // Every hour, update H1 and rebuild H4
      if (minutes === 0) {
        await fetchAndStore(pair, 'H1', '1h', 1);
        await buildH4FromH1(pair);
      }
      
      // Small delay between pairs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 60000); // Run every minute
}
