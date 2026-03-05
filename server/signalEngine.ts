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

            // If we generated a new signal, we should cancel older waiting/active signals
            // for the same pair in the OPPOSITE direction, as the market structure has shifted.
            const { data: opposingSignals } = await db.from('signals')
              .select('id')
              .eq('pair', pair)
              .neq('direction', direction)
              .in('status', ['waiting', 'active']);

            if (opposingSignals && opposingSignals.length > 0) {
              for (const opp of opposingSignals) {
                 await db.from('signals').update({ status: 'closed' }).eq('id', opp.id);
                 console.log(`Closed opposing signal due to structure shift: ${opp.id}`);
              }
            }
        } else {
            console.error(`Error generating SMC Context Signal:`, insertErr);
        }
      }
    }
  }
}

// Update signal statuses (e.g., hit SL, hit TP, or activate waiting signals)
export async function updateSignalStatuses() {
  const { data: signals, error } = await db.from('signals')
    .select('*')
    .in('status', ['active', 'waiting']);
  if (error || !signals) return;

  for (const signal of signals) {
    const { data: currentPriceCandle } = await db.from('candles')
        .select('close, high, low')
        .eq('pair', signal.pair)
        .order('time', { ascending: false })
        .limit(1)
        .single();

    if (!currentPriceCandle) continue;
    const currentPrice = currentPriceCandle.close;
    const currentHigh = currentPriceCandle.high;
    const currentLow = currentPriceCandle.low;

    if (signal.status === 'waiting') {
      // Check if price has entered the entry zone
      const inZone = currentLow <= signal.entry_zone_high && currentHigh >= signal.entry_zone_low;

      // Check if price has completely invalidated the setup before entry
      const invalidated = signal.direction === 'LONG'
        ? currentLow <= signal.stop_loss
        : currentHigh >= signal.stop_loss;

      if (invalidated) {
        await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
      } else if (inZone) {
        await db.from('signals').update({ status: 'active' }).eq('id', signal.id);
      }
      continue;
    }

    if (signal.status === 'active') {
      if (signal.direction === 'LONG') {
        if (currentLow <= signal.stop_loss) {
          await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
        } else if (currentHigh >= signal.take_profit_1) {
          // Partial close or full close depending on strategy
          await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
        }
      } else {
        if (currentHigh >= signal.stop_loss) {
          await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
        } else if (currentLow <= signal.take_profit_1) {
          await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
        }
      }
    }
  }
}
