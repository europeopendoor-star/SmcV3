import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IChartApi, ISeriesApi, MouseEventParams, Time, IPriceLine } from 'lightweight-charts';
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
  const priceLinesRef = useRef<IPriceLine[]>([]);

  // Function to clear all price lines
  const clearPriceLines = useCallback(() => {
     if (seriesRef.current) {
         priceLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
         priceLinesRef.current = [];
     }
  }, [seriesRef]);

  // Sync Price Lines whenever boxes change
  useEffect(() => {
     clearPriceLines();
     if (!seriesRef.current) return;

     boxes.forEach(box => {
         const entryLine = seriesRef.current!.createPriceLine({
            price: box.entryPrice,
            color: '#a3a3a3',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Entry',
         });
         const slLine = seriesRef.current!.createPriceLine({
            price: box.slPrice,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'SL',
         });
         const tpLine = seriesRef.current!.createPriceLine({
            price: box.tpPrice,
            color: '#22c55e',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'TP',
         });
         priceLinesRef.current.push(entryLine, slLine, tpLine);
     });

     // also handle temp drawing lines
     if (drawingState === 'setting_sl' && tempEntry && tempSl) {
        // temp Sl is just current crosshair essentially
         const entryLine = seriesRef.current!.createPriceLine({
            price: tempEntry.price,
            color: '#a3a3a3',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: 'Entry',
         });
         const currentLine = seriesRef.current!.createPriceLine({
            price: tempSl.price,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: 'SL',
         });

         const direction = tempSl.price < tempEntry.price ? 'long' : 'short';
         const risk = Math.abs(tempEntry.price - tempSl.price);
         const tpPrice = direction === 'long'
             ? tempEntry.price + (risk * targetRR)
             : tempEntry.price - (risk * targetRR);

         const tpLine = seriesRef.current!.createPriceLine({
            price: tpPrice,
            color: '#22c55e',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: 'TP',
         });
         priceLinesRef.current.push(entryLine, currentLine, tpLine);
     }
  }, [boxes, drawingState, tempEntry, tempSl, targetRR, clearPriceLines, seriesRef]);

  // Clean up on unmount
  useEffect(() => {
      return () => clearPriceLines();
  }, [clearPriceLines]);


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
    </>
  );
};
