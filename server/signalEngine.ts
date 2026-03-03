import db from './db.js';

export async function runSignalEngine() {
  const pairs = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
  const htfTimeframes = ['H1', 'H4'];

  for (const pair of pairs) {
    for (const tf of htfTimeframes) {
      // Get recent unmitigated zones
      const { data: zones, error } = await db.from('zones')
        .select('*')
        .eq('pair', pair)
        .eq('timeframe', tf)
        .eq('mitigated', 0)
        .order('time', { ascending: false })
        .limit(1);

      if (error || !zones) continue;

      for (const zone of zones) {
        // Generate SMC Context Signal
        const signalId = `smc-${pair}-${tf}-${zone.id}`;
        const now = Math.floor(Date.now() / 1000);

        const { data: existing } = await db.from('signals').select('id').eq('id', signalId).single();
        if (existing) continue;

        const direction = zone.direction === 'bullish' ? 'LONG' : 'SHORT';
        const entryLow = zone.bottom;
        const entryHigh = zone.top;
        const sl = direction === 'LONG' ? entryLow - 0.005 : entryHigh + 0.005;
        const tp1 = direction === 'LONG' ? entryHigh + 0.010 : entryLow - 0.010;
        const tp2 = direction === 'LONG' ? entryHigh + 0.020 : entryLow - 0.020;

        const { error: insertErr } = await db.from('signals').insert({
            id: signalId,
            pair,
            direction,
            created_at: now,
            status: 'waiting',
            entry_model: 'smc',
            timeframe: tf,
            entry_zone_low: entryLow,
            entry_zone_high: entryHigh,
            stop_loss: sl,
            take_profit_1: tp1,
            take_profit_2: tp2,
            setup_type: 'SMC Context',
            htf_timeframe: tf,
            htf_structure_type: 'BOS',
            htf_zone_type: zone.type,
            htf_zone_price_range: `${zone.bottom}-${zone.top}`
        });

        if (!insertErr) {
            console.log(`Generated SMC Context Signal: ${signalId}`);
        } else {
            console.error(`Error generating SMC Context Signal:`, insertErr);
        }
      }
    }
  }
}

// Update signal statuses (e.g., hit SL, hit TP)
export async function updateSignalStatuses() {
  const { data: activeSignals, error } = await db.from('signals').select('*').eq('status', 'active');
  if (error || !activeSignals) return;

  for (const signal of activeSignals) {
    const { data: currentPriceCandle } = await db.from('candles')
        .select('close')
        .eq('pair', signal.pair)
        .order('time', { ascending: false })
        .limit(1)
        .single();

    if (!currentPriceCandle) continue;
    const currentPrice = currentPriceCandle.close;

    if (signal.direction === 'LONG') {
      if (currentPrice <= signal.stop_loss) {
        await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
      } else if (currentPrice >= signal.take_profit_1) {
        // Partial close or full close depending on strategy
        await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
      }
    } else {
      if (currentPrice >= signal.stop_loss) {
        await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
      } else if (currentPrice <= signal.take_profit_1) {
        await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
      }
    }
  }
}
