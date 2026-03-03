import React, { useState, useEffect, useCallback } from 'react';
import { IChartApi, ISeriesApi, MouseEventParams, Time } from 'lightweight-charts';
import { Crosshair } from 'lucide-react';

interface RRBox {
  id: string;
  entryTime: Time;
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  direction: 'long' | 'short';
  rrRatio: number;
}

interface RiskRewardToolProps {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>;
}

export const RiskRewardTool: React.FC<RiskRewardToolProps> = ({ chartRef, seriesRef }) => {
  const [boxes, setBoxes] = useState<RRBox[]>([]);
  const [drawingState, setDrawingState] = useState<'idle' | 'setting_entry' | 'setting_sl'>('idle');
  const [tempEntry, setTempEntry] = useState<{ time: Time, price: number } | null>(null);
  const [tempSl, setTempSl] = useState<{ time: Time, price: number } | null>(null);
  const [crosshairPoint, setCrosshairPoint] = useState<{ time: Time, price: number } | null>(null);

  const [targetRR, setTargetRR] = useState<number>(3); // Selectable RR ratio

  const handleChartClick = useCallback((param: MouseEventParams) => {
    if (!param.point || !param.time || !seriesRef.current) return;

    // Approximate price using coordinate
    const price = seriesRef.current.coordinateToPrice(param.point.y);
    if (price === null) return;

    if (drawingState === 'setting_entry') {
      setTempEntry({ time: param.time, price });
      setDrawingState('setting_sl');
    } else if (drawingState === 'setting_sl') {
      if (!tempEntry) {
         setDrawingState('idle');
         return;
      }

      // Determine direction based on SL vs Entry
      const direction = price < tempEntry.price ? 'long' : 'short';
      const risk = Math.abs(tempEntry.price - price);
      const tpPrice = direction === 'long'
         ? tempEntry.price + (risk * targetRR)
         : tempEntry.price - (risk * targetRR);

      const newBox: RRBox = {
        id: Math.random().toString(36).substring(7),
        entryTime: tempEntry.time,
        entryPrice: tempEntry.price,
        slPrice: price,
        tpPrice,
        direction,
        rrRatio: targetRR
      };

      setBoxes(prev => [...prev, newBox]);
      setDrawingState('idle');
      setTempEntry(null);
      setTempSl(null);
    }
  }, [drawingState, tempEntry, targetRR, seriesRef]);

  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
     if (!param.point || !param.time || !seriesRef.current) {
        setCrosshairPoint(null);
        return;
     }
     const price = seriesRef.current.coordinateToPrice(param.point.y);
     if (price !== null) {
         setCrosshairPoint({ time: param.time, price });
         if (drawingState === 'setting_sl') {
             setTempSl({ time: param.time, price });
         }
     }
  }, [drawingState, seriesRef]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (drawingState !== 'idle') {
      chart.subscribeClick(handleChartClick);
      chart.subscribeCrosshairMove(handleCrosshairMove);
    } else {
      chart.unsubscribeClick(handleChartClick);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      setCrosshairPoint(null);
    }

    return () => {
      chart.unsubscribeClick(handleChartClick);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, [drawingState, handleChartClick, handleCrosshairMove, chartRef]);

  // Rendering overlay boxes
  const [renderedBoxes, setRenderedBoxes] = useState<any[]>([]);

  const updateBoxes = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;

    let boxesToRender = [];

    // Draw finalized boxes
    for (const box of boxes) {
        try {
            const timeScale = chartRef.current.timeScale();
            const series = seriesRef.current;

            const x = timeScale.timeToCoordinate(box.entryTime as any);
            const entryY = series.priceToCoordinate(box.entryPrice);
            const slY = series.priceToCoordinate(box.slPrice);
            const tpY = series.priceToCoordinate(box.tpPrice);

            if (x !== null && entryY !== null && slY !== null && tpY !== null) {
               const logicalX = timeScale.coordinateToLogical(x);
               if (logicalX === null) continue;
               const endX = timeScale.logicalToCoordinate((logicalX + 10) as any);
               if (endX === null) continue;

               const width = endX - x;

               boxesToRender.push({
                   id: box.id,
                   x, width,
                   slBox: { y: Math.min(entryY, slY), h: Math.abs(entryY - slY), color: 'rgba(239, 68, 68, 0.3)' },
                   tpBox: { y: Math.min(entryY, tpY), h: Math.abs(entryY - tpY), color: 'rgba(34, 197, 94, 0.3)' },
                   label: `${box.direction.toUpperCase()} - ${box.rrRatio}R`
               });
            }
        } catch (e) {}
    }

    // Draw active drawing temp box
    if (drawingState === 'setting_sl' && tempEntry && crosshairPoint) {
       try {
            const timeScale = chartRef.current.timeScale();
            const series = seriesRef.current;

            const x = timeScale.timeToCoordinate(tempEntry.time as any);
            const entryY = series.priceToCoordinate(tempEntry.price);
            const currentY = series.priceToCoordinate(crosshairPoint.price);

            if (x !== null && entryY !== null && currentY !== null) {
                const logicalX = timeScale.coordinateToLogical(x);
                if (logicalX !== null) {
                   const endX = timeScale.logicalToCoordinate((logicalX + 10) as any);
                   if (endX !== null) {
                      const width = endX - x;
                      const risk = Math.abs(tempEntry.price - crosshairPoint.price);
                      const direction = crosshairPoint.price < tempEntry.price ? 'long' : 'short';
                      const tpPrice = direction === 'long'
                         ? tempEntry.price + (risk * targetRR)
                         : tempEntry.price - (risk * targetRR);
                      const tpY = series.priceToCoordinate(tpPrice);

                      if (tpY !== null) {
                          boxesToRender.push({
                               id: 'temp',
                               x, width,
                               slBox: { y: Math.min(entryY, currentY), h: Math.abs(entryY - currentY), color: 'rgba(239, 68, 68, 0.3)' },
                               tpBox: { y: Math.min(entryY, tpY), h: Math.abs(entryY - tpY), color: 'rgba(34, 197, 94, 0.3)' },
                               label: `Drawing...`
                          });
                      }
                   }
                }
            }
       } catch(e){}
    }

    setRenderedBoxes(boxesToRender);
  }, [boxes, drawingState, tempEntry, crosshairPoint, chartRef, seriesRef, targetRR]);

  useEffect(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(updateBoxes);
    timeScale.subscribeVisibleTimeRangeChange(updateBoxes);
    timeScale.subscribeSizeChange(updateBoxes);
    updateBoxes();
    return () => {
        timeScale.unsubscribeVisibleLogicalRangeChange(updateBoxes);
        timeScale.unsubscribeVisibleTimeRangeChange(updateBoxes);
        timeScale.unsubscribeSizeChange(updateBoxes);
    };
  }, [updateBoxes, chartRef]);

  return (
    <>
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <select
           value={targetRR}
           onChange={(e) => setTargetRR(Number(e.target.value))}
           className="bg-black/50 text-gray-300 border border-white/10 rounded-lg px-2 text-sm outline-none hover:bg-white/10"
        >
           <option value={1}>1:1 R/R</option>
           <option value={2}>1:2 R/R</option>
           <option value={3}>1:3 R/R</option>
           <option value={4}>1:4 R/R</option>
           <option value={5}>1:5 R/R</option>
        </select>
        <button
          onClick={() => setDrawingState(prev => prev === 'idle' ? 'setting_entry' : 'idle')}
          className={`p-2 rounded-lg border transition-colors ${
            drawingState !== 'idle'
              ? 'bg-yellow-500 text-black border-yellow-500'
              : 'bg-black/50 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title="Risk/Reward Tool (Click Entry, then Stop Loss)"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>

      {/* Render Boxes */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-10">
          {renderedBoxes.map(b => (
             <div key={b.id} style={{ position: 'absolute', left: `${b.x}px`, width: `${b.width}px` }}>
                {/* Stop Loss Box */}
                <div
                   style={{
                      position: 'absolute',
                      top: `${b.slBox.y}px`,
                      height: `${b.slBox.h}px`,
                      width: '100%',
                      backgroundColor: b.slBox.color,
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                   }}
                />
                {/* Take Profit Box */}
                <div
                   style={{
                      position: 'absolute',
                      top: `${b.tpBox.y}px`,
                      height: `${b.tpBox.h}px`,
                      width: '100%',
                      backgroundColor: b.tpBox.color,
                      border: '1px solid rgba(34, 197, 94, 0.5)',
                   }}
                >
                    <span className="absolute text-[10px] font-mono text-white/70 bottom-1 right-1">{b.label}</span>
                </div>
             </div>
          ))}
      </div>
    </>
  );
};
