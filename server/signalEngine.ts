import db from './db.js';

export function runSignalEngine() {
  const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
  const htfTimeframes = ['H1', 'H4'];

  for (const pair of pairs) {
    for (const tf of htfTimeframes) {
      // Get recent unmitigated zones
      const zones = db.prepare(`
        SELECT * FROM zones WHERE pair = ? AND timeframe = ? AND mitigated = 0 ORDER BY time DESC LIMIT 1
      `).all(pair, tf) as any[];

      for (const zone of zones) {
        // Generate SMC Context Signal
        const signalId = `smc-${pair}-${tf}-${zone.id}`;
        const now = Math.floor(Date.now() / 1000);

        const existing = db.prepare(`SELECT id FROM signals WHERE id = ?`).get(signalId);
        if (existing) continue;

        const direction = zone.direction === 'bullish' ? 'LONG' : 'SHORT';
        const entryLow = zone.bottom;
        const entryHigh = zone.top;
        const sl = direction === 'LONG' ? entryLow - 0.005 : entryHigh + 0.005;
        const tp1 = direction === 'LONG' ? entryHigh + 0.010 : entryLow - 0.010;
        const tp2 = direction === 'LONG' ? entryHigh + 0.020 : entryLow - 0.020;

        db.prepare(`
          INSERT INTO signals (
            id, pair, direction, created_at, status, entry_model, timeframe,
            entry_zone_low, entry_zone_high, stop_loss, take_profit_1, take_profit_2, setup_type,
            htf_timeframe, htf_structure_type, htf_zone_type, htf_zone_price_range
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?
          )
        `).run(
          signalId, pair, direction, now, 'waiting', 'smc', tf,
          entryLow, entryHigh, sl, tp1, tp2, 'SMC Context',
          tf, 'BOS', zone.type, `${zone.bottom}-${zone.top}`
        );

        console.log(`Generated SMC Context Signal: ${signalId}`);
      }
    }
  }
}

// Update signal statuses (e.g., hit SL, hit TP)
export function updateSignalStatuses() {
  const activeSignals = db.prepare(`SELECT * FROM signals WHERE status = 'active'`).all() as any[];

  for (const signal of activeSignals) {
    const currentPrice = db.prepare(`
      SELECT close FROM candles WHERE pair = ? ORDER BY time DESC LIMIT 1
    `).get(signal.pair) as { close: number };

    if (!currentPrice) continue;

    if (signal.direction === 'LONG') {
      if (currentPrice.close <= signal.stop_loss) {
        db.prepare(`UPDATE signals SET status = 'closed' WHERE id = ?`).run(signal.id);
      } else if (currentPrice.close >= signal.take_profit_1) {
        // Partial close or full close depending on strategy
        db.prepare(`UPDATE signals SET status = 'closed' WHERE id = ?`).run(signal.id);
      }
    } else {
      if (currentPrice.close >= signal.stop_loss) {
        db.prepare(`UPDATE signals SET status = 'closed' WHERE id = ?`).run(signal.id);
      } else if (currentPrice.close <= signal.take_profit_1) {
        db.prepare(`UPDATE signals SET status = 'closed' WHERE id = ?`).run(signal.id);
      }
    }
  }
}
