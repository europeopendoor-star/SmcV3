import React, { useState, useEffect } from 'react';
import { TradingChart, ExtendedCandlestickData, ZoneData } from './TradingChart';
import { IChartApi, ISeriesApi, LogicalRange } from 'lightweight-charts';
import { useReplay } from '../../hooks/useReplay';
import { ReplayControls } from './ReplayControls';

interface MultiChartLayoutProps {
  htfData: ExtendedCandlestickData[];
  ltfData: ExtendedCandlestickData[];
  htfZones?: ZoneData[];
  ltfZones?: ZoneData[];
  htfTitle: string;
  ltfTitle: string;
}

export const MultiChartLayout: React.FC<MultiChartLayoutProps> = ({
  htfData,
  ltfData,
  htfZones = [],
  ltfZones = [],
  htfTitle,
  ltfTitle
}) => {
  const [htfChart, setHtfChart] = useState<{ chart: IChartApi, series: ISeriesApi<"Candlestick"> } | null>(null);
  const [ltfChart, setLtfChart] = useState<{ chart: IChartApi, series: ISeriesApi<"Candlestick"> } | null>(null);

  const {
    visibleData: htfVisibleData,
    isPlaying: htfIsPlaying,
    isFinished: htfIsFinished,
    togglePlay: htfTogglePlay,
    stepForward: htfStepForward,
    reset: htfReset,
    currentIndex: htfCurrentIndex,
    totalCount: htfTotalCount
  } = useReplay({ initialData: htfData, initialVisibleCount: Math.floor(htfData.length * 0.8), playSpeedMs: 1000 });

  const {
    visibleData: ltfVisibleData,
    isPlaying: ltfIsPlaying,
    isFinished: ltfIsFinished,
    togglePlay: ltfTogglePlay,
    stepForward: ltfStepForward,
    reset: ltfReset,
    currentIndex: ltfCurrentIndex,
    totalCount: ltfTotalCount
  } = useReplay({ initialData: ltfData, initialVisibleCount: Math.floor(ltfData.length * 0.8), playSpeedMs: 200 });

  // Sync Crosshair and TimeScale
  useEffect(() => {
    if (!htfChart || !ltfChart) return;

    // TimeScale Sync
    let isSyncing = false;
    const getRangeSyncParams = (sourceChart: IChartApi, targetChart: IChartApi, range: LogicalRange | null) => {
      if (!range) return null;
      // We sync based on logical range to keep the "number of visible bars" exactly the same
      // OR we sync by TimeRange if we want the exact same dates. TimeRange is usually better for Multi-timeframe
      return range;
    };

    const handleHtfVisibleTimeRangeChange = (newTimeRange: any) => {
      if (isSyncing || !newTimeRange) return;
      isSyncing = true;
      try {
        ltfChart.chart.timeScale().setVisibleRange(newTimeRange);
      } catch (e) {
        // Range might be out of bounds for the other chart, ignore
      }
      isSyncing = false;
    };

    const handleLtfVisibleTimeRangeChange = (newTimeRange: any) => {
      if (isSyncing || !newTimeRange) return;
      isSyncing = true;
      try {
        htfChart.chart.timeScale().setVisibleRange(newTimeRange);
      } catch (e) {
        // Range might be out of bounds
      }
      isSyncing = false;
    };

    htfChart.chart.timeScale().subscribeVisibleTimeRangeChange(handleHtfVisibleTimeRangeChange);
    ltfChart.chart.timeScale().subscribeVisibleTimeRangeChange(handleLtfVisibleTimeRangeChange);

    // Crosshair Sync
    const handleHtfCrosshair = (param: any) => {
      if (!param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
         ltfChart.chart.clearCrosshairPosition();
         return;
      }
      ltfChart.chart.setCrosshairPosition((param.seriesData.get(htfChart.series) as any)?.close || 0, param.time, ltfChart.series);
    };

    const handleLtfCrosshair = (param: any) => {
      if (!param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
         htfChart.chart.clearCrosshairPosition();
         return;
      }
      htfChart.chart.setCrosshairPosition((param.seriesData.get(ltfChart.series) as any)?.close || 0, param.time, htfChart.series);
    };

    htfChart.chart.subscribeCrosshairMove(handleHtfCrosshair);
    ltfChart.chart.subscribeCrosshairMove(handleLtfCrosshair);

    return () => {
      htfChart.chart.timeScale().unsubscribeVisibleTimeRangeChange(handleHtfVisibleTimeRangeChange);
      ltfChart.chart.timeScale().unsubscribeVisibleTimeRangeChange(handleLtfVisibleTimeRangeChange);
      htfChart.chart.unsubscribeCrosshairMove(handleHtfCrosshair);
      ltfChart.chart.unsubscribeCrosshairMove(handleLtfCrosshair);
    };
  }, [htfChart, ltfChart]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col md:flex-row w-full h-[600px] gap-4">
        <div className="flex-1 min-w-0 relative flex flex-col">
          <TradingChart data={htfVisibleData} zones={htfZones} title={htfTitle} onChartInit={(chart, series) => setHtfChart({ chart, series })} />
          <ReplayControls
             isPlaying={htfIsPlaying}
             onTogglePlay={htfTogglePlay}
             onStepForward={htfStepForward}
             onReset={htfReset}
             isFinished={htfIsFinished}
             currentIndex={htfCurrentIndex}
             totalCount={htfTotalCount}
          />
        </div>
        <div className="flex-1 min-w-0 relative flex flex-col">
          <TradingChart data={ltfVisibleData} zones={ltfZones} title={ltfTitle} onChartInit={(chart, series) => setLtfChart({ chart, series })} />
          <ReplayControls
             isPlaying={ltfIsPlaying}
             onTogglePlay={ltfTogglePlay}
             onStepForward={ltfStepForward}
             onReset={ltfReset}
             isFinished={ltfIsFinished}
             currentIndex={ltfCurrentIndex}
             totalCount={ltfTotalCount}
          />
        </div>
      </div>
    </div>
  );
};
