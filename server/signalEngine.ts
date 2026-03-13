import db from './db.js';

const MT5_API_URL = process.env.MT5_API_URL || 'http://127.0.0.1:8000';

async function executeMT5Trade(signal: any) {
  try {
    const action = signal.direction === 'LONG' ? 'buy' : 'sell';

    // Default volume for now, this could be calculated based on risk
    const volume = 0.01;

    const request = {
      symbol: signal.pair,
      action: action,
      volume: volume,
      sl: signal.stop_loss,
      tp: signal.take_profit_1, // Aiming for TP1 by default
      magic: 234000 // A default magic number for our bot
    };

    const response = await fetch(`${MT5_API_URL}/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const result = await response.json();
    if (result.status === 'success') {
      console.log(`Successfully executed ${action} for ${signal.pair} on MT5. Order ID: ${result.order_id}`);
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
              .select('id, mt5_order_id')
              .eq('pair', pair)
              .neq('direction', direction)
              .in('status', ['waiting', 'active']);

            if (opposingSignals && opposingSignals.length > 0) {
              for (const opp of opposingSignals) {
                 await db.from('signals').update({ status: 'closed' }).eq('id', opp.id);
                 if (opp.mt5_order_id) {
                     await closeMT5Trade(opp.mt5_order_id);
                 }
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

    // We get current close/high/low to evaluate if price enters zone
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
        // ACTIVATE SIGNAL! Execute the trade on MT5.
        const orderId = await executeMT5Trade(signal);
        if (orderId) {
            const { error: updateError } = await db.from('signals').update({ status: 'active', mt5_order_id: orderId }).eq('id', signal.id);
            if (updateError) {
                 console.error(`Failed to update signal ${signal.id} with active status. Closing MT5 trade ${orderId} to prevent orphaned trades.`);
                 await closeMT5Trade(orderId);
            }
        }
      }
      continue;
    }

    if (signal.status === 'active') {
      // If we have an active MT5 trade, MT5 automatically handles SL and TP closures.
      // But we need to sync our DB status when the trade closes.
      if (signal.mt5_order_id) {
        try {
           // We can verify if the order still exists in the open positions
           const posResponse = await fetch(`${MT5_API_URL}/positions?symbol=${signal.pair}`);
           const posResult = await posResponse.json();

           if (posResult.status === 'success') {
             const isOpen = posResult.positions.find((p: any) => p.ticket === signal.mt5_order_id);

             if (!isOpen) {
               // Trade closed on MT5 (hit SL or TP)
               console.log(`MT5 trade ${signal.mt5_order_id} for ${signal.pair} closed.`);
               await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
             }
           }
        } catch (e) {
           console.error("Failed to sync position with MT5:", e);
        }
      } else {
        // Fallback simulated logic if no MT5 order ID
        if (signal.direction === 'LONG') {
          if (currentLow <= signal.stop_loss) {
            await db.from('signals').update({ status: 'closed' }).eq('id', signal.id);
          } else if (currentHigh >= signal.take_profit_1) {
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
}
