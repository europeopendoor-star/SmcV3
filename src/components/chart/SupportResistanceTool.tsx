import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IChartApi, ISeriesApi, MouseEventParams, IPriceLine } from 'lightweight-charts';
import { Minus } from 'lucide-react';

interface SRLine {
  id: string;
  price: number;
}

interface SupportResistanceToolProps {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>;
}

export const SupportResistanceTool: React.FC<SupportResistanceToolProps> = ({ chartRef, seriesRef }) => {
  const [lines, setLines] = useState<SRLine[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const priceLinesRef = useRef<{ id: string, line: IPriceLine }[]>([]);

  const handleChartClick = useCallback((param: MouseEventParams) => {
    if (!param.point || !param.time || !seriesRef.current || !isDrawing) return;

    const price = seriesRef.current.coordinateToPrice(param.point.y);
    if (price === null) return;

    const newLine: SRLine = {
      id: Math.random().toString(36).substring(7),
      price
    };

    setLines(prev => [...prev, newLine]);
    setIsDrawing(false); // Disable drawing after one click (standard behavior)
  }, [isDrawing, seriesRef]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (isDrawing) {
      chart.subscribeClick(handleChartClick);
    } else {
      chart.unsubscribeClick(handleChartClick);
    }

    return () => {
      chart.unsubscribeClick(handleChartClick);
    };
  }, [isDrawing, handleChartClick, chartRef]);

  useEffect(() => {
    if (!seriesRef.current) return;

    // Remove old lines that are no longer in state
    const currentLineIds = lines.map(l => l.id);
    priceLinesRef.current = priceLinesRef.current.filter(pl => {
        if (!currentLineIds.includes(pl.id)) {
            seriesRef.current?.removePriceLine(pl.line);
            return false;
        }
        return true;
    });

    // Add new lines
    const existingIds = priceLinesRef.current.map(pl => pl.id);
    lines.forEach(l => {
        if (!existingIds.includes(l.id)) {
            const priceLine = seriesRef.current!.createPriceLine({
                price: l.price,
                color: '#3b82f6', // blue color for S/R
                lineWidth: 2,
                lineStyle: 0, // Solid
                axisLabelVisible: true,
                title: 'S/R',
            });
            priceLinesRef.current.push({ id: l.id, line: priceLine });
        }
    });

  }, [lines, seriesRef]);

  // Clean up on unmount
  useEffect(() => {
     return () => {
         if (seriesRef.current) {
             priceLinesRef.current.forEach(pl => seriesRef.current?.removePriceLine(pl.line));
         }
     }
  }, [seriesRef]);

  return (
    <div className="absolute top-4 right-[160px] z-20 flex gap-2"> {/* Offset to the left of RR tool */}
      <button
        onClick={() => setIsDrawing(prev => !prev)}
        className={`p-2 rounded-lg border transition-colors ${
          isDrawing
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-black/50 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
        }`}
        title="Support/Resistance Level (Click to add horizontal line)"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
};
