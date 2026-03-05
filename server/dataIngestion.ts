import dotenv from 'dotenv';
dotenv.config();
import db from './db.js';

// Fallback logic, we'll implement fully in the next steps
const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];

// Map our symbols to FCSAPI formats
const symbolMap: Record<string, string> = {
  'XAUUSD': 'XAU/USD', // Gold against USD
  'EURUSD': 'EUR/USD',
  'GBPUSD': 'GBP/USD',
  'USDJPY': 'USD/JPY',
  'AUDUSD': 'AUD/USD',
  'USDCAD': 'USD/CAD'
};

async function fetchAndStore(pair: string, timeframe: string, period: '1m' | '5m' | '1h') {
  const symbol = symbolMap[pair];
  const apiKey = process.env.FCSAPI_KEY;

  if (!apiKey) {
    console.warn('FCSAPI_KEY is not set. Skipping data ingestion.');
    return;
  }

  const url = `https://fcsapi.com/api-v3/forex/history?symbol=${symbol}&period=${period}&access_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (result && result.status && result.response) {
      const inserts = [];
      const candles = Object.values(result.response);

      for (const q of candles as any[]) {
        if (q.o === null || q.c === null) continue;
        inserts.push({
          pair,
          timeframe,
          time: parseInt(q.t, 10),
          open: parseFloat(q.o),
          high: parseFloat(q.h),
          low: parseFloat(q.l),
          close: parseFloat(q.c),
          volume: parseFloat(q.v || '0')
        });
      }

      if (inserts.length > 0) {
        // Supabase upsert
        await db.from('candles').upsert(inserts, { onConflict: 'pair, timeframe, time', ignoreDuplicates: true });
      }
    } else {
      console.warn(`FCSAPI returned an error or empty data for ${pair} ${timeframe}:`, result);
    }
  } catch (error) {
    console.error(`Failed to fetch ${timeframe} for ${pair}:`, error);
  }
}

async function buildH4FromH1(pair: string) {
  const { data: h1Candles, error } = await db.from('candles')
    .select('*')
    .eq('pair', pair)
    .eq('timeframe', 'H1')
    .order('time', { ascending: true });

  if (error || !h1Candles || h1Candles.length === 0) return;

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

  if (h4Candles.length > 0) {
    await db.from('candles').upsert(h4Candles, { onConflict: 'pair, timeframe, time', ignoreDuplicates: true });
  }
}

// Queue system to manage rate limits (3 requests per minute for free tier)
const requestQueue: (() => Promise<void>)[] = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const batch = requestQueue.splice(0, 2); // Take up to 2 requests to be safe (limit is 3/min, we stay under it)

    for (const task of batch) {
      await task();
    }

    if (requestQueue.length > 0) {
      // Wait for 60 seconds before processing the next batch to respect the limit
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  isProcessingQueue = false;
}

function queueFetch(pair: string, timeframe: string, period: '1m' | '5m' | '1h') {
  requestQueue.push(() => fetchAndStore(pair, timeframe, period));
  processQueue();
}

export async function ingestHistoricalData() {
  const { count, error } = await db.from('candles').select('*', { count: 'exact', head: true });

  if (count === 0 || error) {
    console.log('Fetching historical data from FCSAPI...');

    for (const pair of pairs) {
      // Push tasks to queue
      requestQueue.push(async () => {
        await fetchAndStore(pair, 'H1', '1h');
        await buildH4FromH1(pair);
      });
      requestQueue.push(() => fetchAndStore(pair, 'M5', '5m'));
      requestQueue.push(() => fetchAndStore(pair, 'M1', '1m'));
    }

    processQueue();
  }
}

// Keep track of which pair to update next to avoid hitting rate limit
let currentPairIndex = 0;

// Start live ingestion
export function startLiveIngestion() {
  // Instead of fetching all pairs every minute, we fetch one pair at a time
  // and stagger them. The limit is 3 requests per minute.
  // To be safe, we'll do 1 request every 25 seconds.

  setInterval(async () => {
    const pair = pairs[currentPairIndex];
    const now = new Date();
    const minutes = now.getMinutes();

    // We only fetch one timeframe per cycle to respect the 3 req/min limit.
    // Prioritize M1, then M5, then H1
    if (minutes === 0) {
      await fetchAndStore(pair, 'H1', '1h');
      await buildH4FromH1(pair);
    } else if (minutes % 5 === 0) {
      await fetchAndStore(pair, 'M5', '5m');
    } else {
      await fetchAndStore(pair, 'M1', '1m');
    }

    currentPairIndex = (currentPairIndex + 1) % pairs.length;
  }, 25000); // Run every 25 seconds (max ~2.4 req/min, safe within 3 req/min)
}
