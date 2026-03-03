import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType, CandlestickSeries, HistogramSeries, CrosshairMode, createSeriesMarkers } from 'lightweight-charts';
import { RiskRewardTool } from './RiskRewardTool';

export interface ZoneData {
  time1: string;
  time2: string;
  price1: number;
  price2: number;
  color: string;
}

export interface ExtendedCandlestickData extends CandlestickData {
  volume?: number;
  markers?: { time: string, position: 'aboveBar' | 'belowBar' | 'inBar', color: string, shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square', text?: string }[];
}

interface TradingChartProps {
  data: ExtendedCandlestickData[];
  zones?: ZoneData[];
  onChartInit?: (chart: IChartApi, series: ISeriesApi<"Candlestick">) => void;
  title: string;
}

export const TradingChart: React.FC<TradingChartProps> = ({ data, zones = [], onChartInit, title }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<any>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [tooltipData, setTooltipData] = useState<{ date: string, open: string, high: string, low: string, close: string, left: number, top: number } | null>(null);
  const [renderedZones, setRenderedZones] = useState<any[]>([]);

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
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      }
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // leave top 80% for candlestick
        bottom: 0,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series, []);
    volumeSeriesRef.current = volumeSeries;

    if (onChartInit) {
      onChartInit(chart, series);
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    // Crosshair Tooltip logic
    chart.subscribeCrosshairMove(param => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        setTooltipData(null);
      } else {
        const dataPoint = param.seriesData.get(series);
        if (dataPoint) {
           const ohlc = dataPoint as CandlestickData;
           setTooltipData({
              date: param.time.toString(), // or format this properly
              open: ohlc.open.toFixed(5),
              high: ohlc.high.toFixed(5),
              low: ohlc.low.toFixed(5),
              close: ohlc.close.toFixed(5),
              left: param.point.x,
              top: param.point.y,
           });
        }
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update data dynamically
  useEffect(() => {
    if (seriesRef.current && volumeSeriesRef.current && data.length > 0) {
      seriesRef.current.setData(data as CandlestickData[]);

      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'
      }));
      volumeSeriesRef.current.setData(volumeData);

      // Extract and set markers
      const allMarkers: any[] = [];
      data.forEach(d => {
         if (d.markers) {
             d.markers.forEach(m => {
                 allMarkers.push({
                     time: d.time,
                     position: m.position,
                     color: m.color,
                     shape: m.shape,
                     text: m.text,
                     size: 1
                 });
             });
         }
      });
      if (markersRef.current) markersRef.current.setMarkers(allMarkers);
    }
  }, [data]);

  const updateZones = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;
    if (zones.length === 0) { setRenderedZones([]); return; }

    const newRenderedZones = zones.map((z, i) => {
        try {
            // we use try/catch because timeToCoordinate might throw if time is completely out of chart range
            const timeScale = chartRef.current!.timeScale();
            const series = seriesRef.current!;

            const x1 = timeScale.timeToCoordinate(z.time1 as any);
            const x2 = timeScale.timeToCoordinate(z.time2 as any);
            const y1 = series.priceToCoordinate(z.price1);
            const y2 = series.priceToCoordinate(z.price2);

            if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
                const minX = Math.min(x1, x2);
                const maxX = Math.max(x1, x2);
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);
                return {
                    id: i,
                    x: minX,
                    y: minY,
                    w: maxX - minX,
                    h: maxY - minY,
                    color: z.color
                };
            }
        } catch (e) {
            // ignore
        }
        return null;
    }).filter(Boolean);

    setRenderedZones(newRenderedZones);
  }, [zones]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Subscribe to multiple events to keep zones synchronized
    const timeScale = chartRef.current.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(updateZones);
    timeScale.subscribeVisibleTimeRangeChange(updateZones);
    timeScale.subscribeSizeChange(updateZones);

    // Initial render
    updateZones();

    return () => {
        timeScale.unsubscribeVisibleLogicalRangeChange(updateZones);
        timeScale.unsubscribeVisibleTimeRangeChange(updateZones);
        timeScale.unsubscribeSizeChange(updateZones);
    };
  }, [updateZones]);

  // Handle data updates requiring zone repositioning
  useEffect(() => {
      updateZones();
  }, [data, updateZones]);

  return (
    <div className="relative w-full h-full flex flex-col bg-black border border-white/10 rounded-2xl overflow-hidden p-1 group">
      <div className="absolute top-4 left-4 z-10 text-white/50 font-bold pointer-events-none text-2xl">
        {title}
      </div>

      <div ref={chartContainerRef} className="w-full flex-grow h-0 relative">
        {/* Render interactive zones overlaid on the chart */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
          {renderedZones.map(z => (
             <div
                key={z.id}
                style={{
                   position: 'absolute',
                   left: `${z.x}px`,
                   top: `${z.y}px`,
                   width: `${Math.max(z.w, 1)}px`, // minimum 1px width
                   height: `${Math.max(z.h, 1)}px`,
                   backgroundColor: z.color,
                   border: `1px solid ${z.color.replace(/[\d.]+\)$/g, '1)')}`,
                   opacity: 0.5
                }}
             />
          ))}
       </div>

       {chartRef.current && seriesRef.current && (
           <RiskRewardTool chartRef={chartRef} seriesRef={seriesRef} />
       )}

      </div>

      {tooltipData && (
        <div
          ref={tooltipRef}
          className="absolute z-50 pointer-events-none bg-black/80 border border-white/20 p-3 rounded-lg text-xs font-mono shadow-xl backdrop-blur-sm"
          style={{
            left: Math.min(Math.max(tooltipData.left + 15, 0), (chartContainerRef.current?.clientWidth || 0) - 150),
            top: Math.min(Math.max(tooltipData.top + 15, 0), (chartContainerRef.current?.clientHeight || 0) - 120),
          }}
        >
           <div className="text-gray-400 mb-1 border-b border-white/10 pb-1">{tooltipData.date}</div>
           <div className="flex justify-between gap-4"><span className="text-gray-500">O</span><span className="text-white">{tooltipData.open}</span></div>
           <div className="flex justify-between gap-4"><span className="text-gray-500">H</span><span className="text-white">{tooltipData.high}</span></div>
           <div className="flex justify-between gap-4"><span className="text-gray-500">L</span><span className="text-white">{tooltipData.low}</span></div>
           <div className="flex justify-between gap-4"><span className="text-gray-500">C</span><span className="text-white">{tooltipData.close}</span></div>
        </div>
      )}
    </div>
  );
};
