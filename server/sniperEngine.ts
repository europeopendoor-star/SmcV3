import db from './db.js';

export async function runSniperEngine() {
  const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
  const ltfTimeframes = ['M1', 'M5'];

  for (const pair of pairs) {
    for (const ltf of ltfTimeframes) {
      // Get recent LTF candles
      const { data: candles, error: candlesErr } = await db.from('candles')
        .select('*')
        .eq('pair', pair)
        .eq('timeframe', ltf)
        .order('time', { ascending: false })
        .limit(50);

      if (candlesErr || !candles || candles.length < 10) continue;

      // Get active HTF zones (unmitigated)
      const { data: htfZones, error: zonesErr } = await db.from('zones')
        .select('*')
        .eq('pair', pair)
        .in('timeframe', ['H1', 'H4'])
        .eq('mitigated', 0)
        .order('time', { ascending: false })
        .limit(5);

      if (zonesErr || !htfZones) continue;

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
            await generateSniperSignal(pair, 'LONG', zone, candles[0], ltf);
          } else if (zone.direction === 'bearish' && sweepHigh) {
            // Generate Sniper Short Signal
            await generateSniperSignal(pair, 'SHORT', zone, candles[0], ltf);
          }
        }
      }
    }
  }
}

async function generateSniperSignal(pair: string, direction: string, htfZone: any, ltfCandle: any, ltf: string) {
  const signalId = `sniper-${pair}-${Date.now()}`;
  const now = Math.floor(Date.now() / 1000);

  // Check if signal already exists recently
  const { data: existing } = await db.from('signals')
    .select('id')
    .eq('pair', pair)
    .eq('direction', direction)
    .gt('created_at', now - 3600)
    .limit(1)
    .single();

  if (existing) return;

  const entryLow = direction === 'LONG' ? ltfCandle.low : ltfCandle.high - (ltfCandle.high - ltfCandle.low) * 0.2;
  const entryHigh = direction === 'LONG' ? ltfCandle.low + (ltfCandle.high - ltfCandle.low) * 0.2 : ltfCandle.high;
  const sl = direction === 'LONG' ? ltfCandle.low - 0.001 : ltfCandle.high + 0.001;
  const tp1 = direction === 'LONG' ? entryHigh + 0.005 : entryLow - 0.005;
  const tp2 = direction === 'LONG' ? entryHigh + 0.010 : entryLow - 0.010;

  const { error } = await db.from('signals').insert({
    id: signalId,
    pair,
    direction,
    created_at: now,
    status: 'active',
    entry_model: 'sniper',
    timeframe: ltf,
    entry_zone_low: entryLow,
    entry_zone_high: entryHigh,
    stop_loss: sl,
    take_profit_1: tp1,
    take_profit_2: tp2,
    setup_type: 'Sniper Entry',
    htf_timeframe: htfZone.timeframe,
    htf_structure_type: 'BOS',
    htf_zone_type: htfZone.type,
    htf_zone_price_range: `${htfZone.bottom}-${htfZone.top}`,
    ltf_timeframe: ltf,
    sweep_type: direction === 'LONG' ? 'Sweep Low' : 'Sweep High',
    sweep_price: ltfCandle.close,
    displacement_candle_time: ltfCandle.time,
    micro_zone_type: 'Micro OB',
    micro_structure_break_price: ltfCandle.close
  });

  if (!error) {
    console.log(`Generated Sniper Signal: ${signalId}`);
  } else {
    console.error(`Error generating sniper signal:`, error);
  }
}
