import dotenv from 'dotenv';
dotenv.config();
import db from './db.js';

// The pairs we trade
const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];

const MT5_API_URL = process.env.MT5_API_URL || 'http://127.0.0.1:8000';

async function fetchAndStore(pair: string, timeframe: string, period: '1m' | '5m' | '1h') {
  try {
    const url = `${MT5_API_URL}/history?symbol=${pair}&period=${period}&limit=500`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Local MT5 API returned ${response.status} for ${pair} ${period}`);
      return;
    }

    const result = await response.json();

    if (result && result.status && result.response) {
      const inserts = [];
      const candles = result.response;

      for (const q of candles) {
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
      console.warn(`MT5 API returned an error or empty data for ${pair} ${timeframe}:`, result);
    }
  } catch (error) {
    console.error(`Failed to fetch ${timeframe} for ${pair} from local MT5 API:`, error);
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

// Queue system is no longer needed because local MT5 doesn't have 3 req/min limits.
// However, we still fetch sequentially to avoid slamming the local API.

export async function ingestHistoricalData() {
  const { count, error } = await db.from('candles').select('*', { count: 'exact', head: true });

  if (count === 0 || error) {
    console.log('Fetching historical data from local MT5 API...');

    for (const pair of pairs) {
      await fetchAndStore(pair, 'H1', '1h');
      await buildH4FromH1(pair);
      await fetchAndStore(pair, 'M5', '5m');
      await fetchAndStore(pair, 'M1', '1m');
    }
    console.log('Finished initial historical ingestion from MT5.');
  }
}

// Keep track of which pair to update next to stagger load
let currentPairIndex = 0;

// Start live ingestion
export function startLiveIngestion() {
  // Since we are running locally, we can run significantly faster than 25s.
  // We'll run every 5 seconds, cycling through pairs.
  setInterval(async () => {
    const pair = pairs[currentPairIndex];
    const now = new Date();
    const minutes = now.getMinutes();

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
  }, 5000); // 5 seconds means all 6 pairs are updated roughly every 30 seconds
}
