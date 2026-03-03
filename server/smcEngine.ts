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
function detectStructure(swings: any[], pair: string, timeframe: string) {
  // Simplified structure detection
  let currentTrend = 'neutral';
  let lastHigh = null;
  let lastLow = null;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO structures (pair, timeframe, type, direction, price, time)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const swing of swings) {
    if (swing.type === 'high') {
      if (lastHigh && swing.price > lastHigh.price) {
        if (currentTrend === 'bearish') {
          insert.run(pair, timeframe, 'CHoCH', 'bullish', swing.price, swing.time);
          currentTrend = 'bullish';
        } else if (currentTrend === 'bullish') {
          insert.run(pair, timeframe, 'BOS', 'bullish', swing.price, swing.time);
        }
      }
      lastHigh = swing;
    } else {
      if (lastLow && swing.price < lastLow.price) {
        if (currentTrend === 'bullish') {
          insert.run(pair, timeframe, 'CHoCH', 'bearish', swing.price, swing.time);
          currentTrend = 'bearish';
        } else if (currentTrend === 'bearish') {
          insert.run(pair, timeframe, 'BOS', 'bearish', swing.price, swing.time);
        }
      }
      lastLow = swing;
    }
  }
}

// Detect FVG
function detectFVG(candles: any[], pair: string, timeframe: string) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO zones (pair, timeframe, type, direction, top, bottom, time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG
    if (c1.high < c3.low) {
      insert.run(pair, timeframe, 'FVG', 'bullish', c3.low, c1.high, c2.time);
    }
    // Bearish FVG
    if (c1.low > c3.high) {
      insert.run(pair, timeframe, 'FVG', 'bearish', c1.low, c3.high, c2.time);
    }
  }
}

// Detect Order Blocks
function detectOB(candles: any[], pair: string, timeframe: string) {
  // Simplified OB detection: last opposite candle before displacement
  const insert = db.prepare(`
    INSERT OR IGNORE INTO zones (pair, timeframe, type, direction, top, bottom, time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    // Bullish OB: Bearish candle followed by strong bullish displacement
    if (curr.close < curr.open && next.close > next.open && (next.close - next.open) > (curr.open - curr.close) * 1.5) {
      insert.run(pair, timeframe, 'OB', 'bullish', curr.high, curr.low, curr.time);
    }
    // Bearish OB: Bullish candle followed by strong bearish displacement
    if (curr.close > curr.open && next.close < next.open && (next.open - next.close) > (curr.close - curr.open) * 1.5) {
      insert.run(pair, timeframe, 'OB', 'bearish', curr.high, curr.low, curr.time);
    }
  }
}

export function runSMCEngine() {
  const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
  const timeframes = ['H1', 'H4'];

  for (const pair of pairs) {
    for (const tf of timeframes) {
      const candles = db.prepare(`
        SELECT * FROM candles WHERE pair = ? AND timeframe = ? ORDER BY time ASC
      `).all(pair, tf);

      if (candles.length < 5) continue;

      const swings = detectSwings(candles);
      detectStructure(swings, pair, tf);
      detectFVG(candles, pair, tf);
      detectOB(candles, pair, tf);
    }
  }
}
