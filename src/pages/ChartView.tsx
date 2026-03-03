import { fetchWithAuth } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { MultiChartLayout } from '../components/chart/MultiChartLayout';

export default function ChartView() {
  const [pair, setPair] = useState('XAUUSD');
  const [htfTimeframe, setHtfTimeframe] = useState('H1');
  const [ltfTimeframe, setLtfTimeframe] = useState('M5');

  const [htfData, setHtfData] = useState<any[]>([]);
  const [ltfData, setLtfData] = useState<any[]>([]);
  const [htfZones, setHtfZones] = useState<any[]>([]);

  useEffect(() => {
    // Fetch HTF candles
    if (!supabase) return;
    supabase.from('candles')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', htfTimeframe)
      .order('time', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
           console.error(error);
           return;
        }
        if (!data || data.length === 0) {
           setHtfData([]);
           return;
        }
        const formattedData = data.map((d: any, index: number) => {
           let markers = [];
           // Mock BOS/CHoCH markers
           if (index % 50 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'aboveBar', color: '#eab308', shape: 'arrowDown', text: 'BOS' });
           } else if (index % 80 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'belowBar', color: '#ec4899', shape: 'arrowUp', text: 'CHoCH' });
           }

           return {
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume || Math.random() * 1000,
            markers
          };
        });
        setHtfData(formattedData);

        // Fetch Real Zones from Backend
        supabase.from('zones')
          .select('*')
          .eq('pair', pair)
          .eq('timeframe', htfTimeframe)
          .order('time', { ascending: false })
          .limit(100)
          .then(({ data: zones, error }) => {
             if (error) {
                 console.error(error);
                 return;
             }
             if (zones && formattedData.length > 0) {
                // Since the backend currently only returns top/bottom prices for unmitigated zones,
                // we will render them as rectangles extending from 50 candles ago to the latest candle.
                // In the future, the backend should be updated to return creation_time for the start of the box.
                const time1 = formattedData[Math.max(0, formattedData.length - 50)].time;
                const time2 = formattedData[formattedData.length - 1].time;

                const mappedZones = zones.map((zone: any) => ({
                    time1: time1,
                    time2: time2,
                    price1: zone.top,
                    price2: zone.bottom,
                    color: zone.type === 'OB' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'
                }));
                setHtfZones(mappedZones);
             }
          });
      });

    // Fetch LTF candles
    supabase.from('candles')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', ltfTimeframe)
      .order('time', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
           console.error(error);
           return;
        }
        if (!data || data.length === 0) {
           setLtfData([]);
           return;
        }
        const formattedData = data.map((d: any, index: number) => {
           let markers = [];

           if (index % 60 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'belowBar', color: '#3b82f6', shape: 'circle', text: 'Liquidity Sweep' });
           }

           // Mock Trade Execution Sequence
           if (index === data.length - 30) {
               markers.push({ time: d.time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'ENTRY' });
           }
           if (index === data.length - 25) {
               markers.push({ time: d.time, position: 'belowBar', color: '#ef4444', shape: 'circle', text: 'SL Hit' });
           }
           if (index === data.length - 15) {
               markers.push({ time: d.time, position: 'aboveBar', color: '#22c55e', shape: 'arrowDown', text: 'ENTRY (Short)' });
           }
           if (index === data.length - 5) {
               markers.push({ time: d.time, position: 'belowBar', color: '#22c55e', shape: 'square', text: 'TP Hit (WIN)' });
           }

           return {
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume || Math.random() * 500,
            markers
          };
        });
        setLtfData(formattedData);
      });
  }, [pair, htfTimeframe, ltfTimeframe]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Interactive Chart</h1>
          <p className="text-gray-400 mt-1">Split-view HTF & LTF sync.</p>
        </div>
        <div className="flex gap-4">
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="bg-black border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 outline-none"
          >
            <option value="XAUUSD">XAUUSD</option>
            <option value="EURUSD">EURUSD</option>
            <option value="GBPUSD">GBPUSD</option>
            <option value="USDJPY">USDJPY</option>
            <option value="AUDUSD">AUDUSD</option>
            <option value="USDCAD">USDCAD</option>
          </select>
          <div className="flex items-center gap-2">
             <span className="text-sm text-gray-400">HTF:</span>
             <select
                value={htfTimeframe}
                onChange={(e) => setHtfTimeframe(e.target.value)}
                className="bg-black border border-white/10 text-white rounded-lg px-2 py-1 focus:ring-2 focus:ring-yellow-500 outline-none text-sm"
              >
                <option value="H1">H1</option>
                <option value="H4">H4</option>
              </select>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-sm text-gray-400">LTF:</span>
             <select
                value={ltfTimeframe}
                onChange={(e) => setLtfTimeframe(e.target.value)}
                className="bg-black border border-white/10 text-white rounded-lg px-2 py-1 focus:ring-2 focus:ring-yellow-500 outline-none text-sm"
              >
                <option value="M1">M1</option>
                <option value="M5">M5</option>
              </select>
          </div>
        </div>
      </div>

      <MultiChartLayout
        htfData={htfData}
        ltfData={ltfData}
        htfZones={htfZones}
        htfTitle={`SMC Context (${htfTimeframe})`}
        ltfTitle={`Sniper Entry (${ltfTimeframe})`}
      />
    </div>
  );
}
