import db from './db.js';

export function runSniperEngine() {
  const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
  const ltfTimeframes = ['M1', 'M5'];

  for (const pair of pairs) {
    for (const ltf of ltfTimeframes) {
      // Get recent LTF candles
      const candles = db.prepare(`
        SELECT * FROM candles WHERE pair = ? AND timeframe = ? ORDER BY time DESC LIMIT 50
      `).all(pair, ltf) as any[];

      if (candles.length < 10) continue;

      // Get active HTF zones (unmitigated)
      const htfZones = db.prepare(`
        SELECT * FROM zones WHERE pair = ? AND timeframe IN ('H1', 'H4') AND mitigated = 0 ORDER BY time DESC LIMIT 5
      `).all(pair) as any[];

      for (const zone of htfZones) {
        // Check if price is inside HTF zone
        const currentPrice = candles[0].close;
        const inZone = currentPrice >= zone.bottom && currentPrice <= zone.top;

        if (inZone) {
          // Detect LTF liquidity sweep and displacement
          // Simplified: Look for a recent sweep of a low/high followed by a strong candle
          const recentLow = Math.min(...candles.slice(1, 10).map(c => c.low));
          const recentHigh = Math.max(...candles.slice(1, 10).map(c => c.high));

          const sweepLow = candles[0].low < recentLow && candles[0].close > recentLow;
          const sweepHigh = candles[0].high > recentHigh && candles[0].close < recentHigh;

          if (zone.direction === 'bullish' && sweepLow) {
            // Generate Sniper Long Signal
            generateSniperSignal(pair, 'LONG', zone, candles[0], ltf);
          } else if (zone.direction === 'bearish' && sweepHigh) {
            // Generate Sniper Short Signal
            generateSniperSignal(pair, 'SHORT', zone, candles[0], ltf);
          }
        }
      }
    }
  }
}

function generateSniperSignal(pair: string, direction: string, htfZone: any, ltfCandle: any, ltf: string) {
  const signalId = `sniper-${pair}-${Date.now()}`;
  const now = Math.floor(Date.now() / 1000);

  // Check if signal already exists recently
  const existing = db.prepare(`
    SELECT id FROM signals WHERE pair = ? AND direction = ? AND created_at > ?
  `).get(pair, direction, now - 3600);

  if (existing) return;

  const entryLow = direction === 'LONG' ? ltfCandle.low : ltfCandle.high - (ltfCandle.high - ltfCandle.low) * 0.2;
  const entryHigh = direction === 'LONG' ? ltfCandle.low + (ltfCandle.high - ltfCandle.low) * 0.2 : ltfCandle.high;
  const sl = direction === 'LONG' ? ltfCandle.low - 0.001 : ltfCandle.high + 0.001;
  const tp1 = direction === 'LONG' ? entryHigh + 0.005 : entryLow - 0.005;
  const tp2 = direction === 'LONG' ? entryHigh + 0.010 : entryLow - 0.010;

  db.prepare(`
    INSERT INTO signals (
      id, pair, direction, created_at, status, entry_model, timeframe,
      entry_zone_low, entry_zone_high, stop_loss, take_profit_1, take_profit_2, setup_type,
      htf_timeframe, htf_structure_type, htf_zone_type, htf_zone_price_range,
      ltf_timeframe, sweep_type, sweep_price, displacement_candle_time, micro_zone_type, micro_structure_break_price
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `).run(
    signalId, pair, direction, now, 'active', 'sniper', ltf,
    entryLow, entryHigh, sl, tp1, tp2, 'Sniper Entry',
    htfZone.timeframe, 'BOS', htfZone.type, `${htfZone.bottom}-${htfZone.top}`,
    ltf, direction === 'LONG' ? 'Sweep Low' : 'Sweep High', ltfCandle.close, ltfCandle.time, 'Micro OB', ltfCandle.close
  );

  console.log(`Generated Sniper Signal: ${signalId}`);
}
