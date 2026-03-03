import { fetchWithAuth } from '../lib/api';
import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, ISeriesApi } from 'lightweight-charts';

export default function ChartView() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [pair, setPair] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('H1');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Fetch candles
    fetchWithAuth(`/api/candles/${pair}/${timeframe}`)
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data.map((d: any) => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));
        candlestickSeries.setData(formattedData);

        // Fetch and draw zones after candles are loaded
        fetchWithAuth(`/api/zones/${pair}/${timeframe}`)
          .then(res => res.json())
          .then(zones => {
            zones.forEach((zone: any) => {
              const color = zone.type === 'OB' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(168, 85, 247, 0.5)';
              candlestickSeries.createPriceLine({
                price: zone.top,
                color: color,
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: `${zone.type} Top`,
              });
              candlestickSeries.createPriceLine({
                price: zone.bottom,
                color: color,
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: `${zone.type} Bot`,
              });
            });
          });
      })
      .catch((err) => console.error(err));

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [pair, timeframe]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Interactive Chart</h1>
          <p className="text-gray-400 mt-1">View SMC structures and Sniper zones.</p>
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
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-black border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 outline-none"
          >
            <option value="M1">M1 (Sniper)</option>
            <option value="M5">M5 (Sniper)</option>
            <option value="H1">H1 (SMC)</option>
            <option value="H4">H4 (SMC)</option>
          </select>
        </div>
      </div>

      <div className="bg-black border border-white/10 rounded-2xl overflow-hidden p-1">
        <div ref={chartContainerRef} className="w-full h-[600px]" />
      </div>

      <div className="grid md:grid-cols-4 gap-4 text-sm">
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500"></div>
          <span className="text-gray-300">Order Block (OB)</span>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500"></div>
          <span className="text-gray-300">Fair Value Gap (FVG)</span>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
          <div className="w-4 h-0.5 bg-yellow-500"></div>
          <span className="text-gray-300">Liquidity Sweep</span>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-white/50"></div>
          <span className="text-gray-300">BOS / CHoCH</span>
        </div>
      </div>
    </div>
  );
}
