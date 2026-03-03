import db from './db.js';

// Detect swing highs and lows
function detectSwings(candles: any[]) {
  const swings = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    const p1 = candles[i - 1];
    const p2 = candles[i - 2];
    const n1 = candles[i + 1];
    const n2 = candles[i + 2];

    if (c.high > p1.high && c.high > p2.high && c.high > n1.high && c.high > n2.high) {
      swings.push({ type: 'high', price: c.high, time: c.time });
    }
    if (c.low < p1.low && c.low < p2.low && c.low < n1.low && c.low < n2.low) {
      swings.push({ type: 'low', price: c.low, time: c.time });
    }
  }
  return swings;
}

// Detect BOS and CHoCH
async function detectStructure(swings: any[], pair: string, timeframe: string) {
  let currentTrend = 'neutral';
  let lastHigh = null;
  let lastLow = null;

  const inserts = [];

  for (const swing of swings) {
    if (swing.type === 'high') {
      if (lastHigh && swing.price > lastHigh.price) {
        if (currentTrend === 'bearish') {
          inserts.push({ pair, timeframe, type: 'CHoCH', direction: 'bullish', price: swing.price, time: swing.time });
          currentTrend = 'bullish';
        } else if (currentTrend === 'bullish') {
          inserts.push({ pair, timeframe, type: 'BOS', direction: 'bullish', price: swing.price, time: swing.time });
        }
      }
      lastHigh = swing;
    } else {
      if (lastLow && swing.price < lastLow.price) {
        if (currentTrend === 'bullish') {
          inserts.push({ pair, timeframe, type: 'CHoCH', direction: 'bearish', price: swing.price, time: swing.time });
          currentTrend = 'bearish';
        } else if (currentTrend === 'bearish') {
          inserts.push({ pair, timeframe, type: 'BOS', direction: 'bearish', price: swing.price, time: swing.time });
        }
      }
      lastLow = swing;
    }
  }

  if (inserts.length > 0) {
    // Avoid inserting exact duplicates if possible or run a soft upsert / insert ignore
    for (const data of inserts) {
       const { error } = await db.from('structures')
         .select('id')
         .eq('pair', data.pair)
         .eq('timeframe', data.timeframe)
         .eq('type', data.type)
         .eq('time', data.time)
         .single();

       if (error && error.code === 'PGRST116') { // Not found
           await db.from('structures').insert(data);
       }
    }
  }
}

// Detect FVG
async function detectFVG(candles: any[], pair: string, timeframe: string) {
  const inserts = [];

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG
    if (c1.high < c3.low) {
      inserts.push({ pair, timeframe, type: 'FVG', direction: 'bullish', top: c3.low, bottom: c1.high, time: c2.time });
    }
    // Bearish FVG
    if (c1.low > c3.high) {
      inserts.push({ pair, timeframe, type: 'FVG', direction: 'bearish', top: c1.low, bottom: c3.high, time: c2.time });
    }
  }

  if (inserts.length > 0) {
    for (const data of inserts) {
       const { error } = await db.from('zones')
         .select('id')
         .eq('pair', data.pair)
         .eq('timeframe', data.timeframe)
         .eq('type', data.type)
         .eq('time', data.time)
         .single();

       if (error && error.code === 'PGRST116') { // Not found
           await db.from('zones').insert(data);
       }
    }
  }
}

// Detect Order Blocks
async function detectOB(candles: any[], pair: string, timeframe: string) {
  const inserts = [];

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    // Bullish OB: Bearish candle followed by strong bullish displacement
    if (curr.close < curr.open && next.close > next.open && (next.close - next.open) > (curr.open - curr.close) * 1.5) {
      inserts.push({ pair, timeframe, type: 'OB', direction: 'bullish', top: curr.high, bottom: curr.low, time: curr.time });
    }
    // Bearish OB: Bullish candle followed by strong bearish displacement
    if (curr.close > curr.open && next.close < next.open && (next.open - next.close) > (curr.close - curr.open) * 1.5) {
      inserts.push({ pair, timeframe, type: 'OB', direction: 'bearish', top: curr.high, bottom: curr.low, time: curr.time });
    }
  }

  if (inserts.length > 0) {
    for (const data of inserts) {
       const { error } = await db.from('zones')
         .select('id')
         .eq('pair', data.pair)
         .eq('timeframe', data.timeframe)
         .eq('type', data.type)
         .eq('time', data.time)
         .single();

       if (error && error.code === 'PGRST116') { // Not found
           await db.from('zones').insert(data);
       }
    }
  }
}

export async function runSMCEngine() {
  const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
  const timeframes = ['H1', 'H4'];

  for (const pair of pairs) {
    for (const tf of timeframes) {
      const { data: candles, error } = await db.from('candles')
        .select('*')
        .eq('pair', pair)
        .eq('timeframe', tf)
        .order('time', { ascending: true });

      if (error || !candles || candles.length < 5) continue;

      const swings = detectSwings(candles);
      await detectStructure(swings, pair, tf);
      await detectFVG(candles, pair, tf);
      await detectOB(candles, pair, tf);
    }
  }
}
