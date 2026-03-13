import db from './db.js';

const MT5_API_URL = process.env.MT5_API_URL || 'http://127.0.0.1:8000';

async function executeMT5Trade(signal: any) {
  try {
    const action = signal.direction === 'LONG' ? 'buy' : 'sell';
    const volume = 0.01;

    const request = {
      symbol: signal.pair,
      action: action,
      volume: volume,
      sl: signal.stop_loss,
      tp: signal.take_profit_1,
      magic: 234000
    };

    const response = await fetch(`${MT5_API_URL}/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const result = await response.json();
    if (result.status === 'success') {
      console.log(`Successfully executed SNIPER ${action} for ${signal.pair} on MT5. Order ID: ${result.order_id}`);
      return result.order_id;
    } else {
      console.error(`MT5 Trade failed for ${signal.pair}:`, result);
      return null;
    }
  } catch (error) {
    console.error(`Failed to execute MT5 trade for ${signal.pair}:`, error);
    return null;
  }
}

async function closeMT5Trade(ticket: number) {
  try {
     const response = await fetch(`${MT5_API_URL}/trade/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket })
     });
     const result = await response.json();
     if (result.status === 'success') {
        console.log(`Successfully closed MT5 trade ${ticket}`);
        return true;
     }
     console.error(`Failed to close MT5 trade ${ticket}:`, result);
     return false;
  } catch (error) {
     console.error(`Error closing MT5 trade ${ticket}:`, error);
     return false;
  }
}

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

  const newSignal = {
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
  };

  // Execute on MT5 before inserting into DB
  const mt5OrderId = await executeMT5Trade(newSignal);

  if (mt5OrderId) {
     (newSignal as any).mt5_order_id = mt5OrderId;
  }

  const { error } = await db.from('signals').insert(newSignal);

  if (!error) {
    console.log(`Generated Sniper Signal: ${signalId}`);
  } else {
    console.error(`Error generating sniper signal:`, error);
    if (mt5OrderId) {
       console.error(`Closing orphaned MT5 trade ${mt5OrderId} due to database error`);
       await closeMT5Trade(mt5OrderId);
    }
  }
}
