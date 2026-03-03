import { useState, useEffect, useCallback, useRef } from 'react';
import { CandlestickData } from 'lightweight-charts';

interface UseReplayProps {
  initialData: CandlestickData[];
  initialVisibleCount?: number;
  playSpeedMs?: number;
}

export const useReplay = ({
  initialData,
  initialVisibleCount = 100,
  playSpeedMs = 500
}: UseReplayProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (initialData.length > 0) {
      setCurrentIndex(Math.max(initialVisibleCount, 0));
      setIsPlaying(false);
    }
  }, [initialData, initialVisibleCount]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const stepForward = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= initialData.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [initialData]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(Math.max(initialVisibleCount, 0));
  }, [initialData, initialVisibleCount]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        stepForward();
      }, playSpeedMs);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, stepForward, playSpeedMs]);

  const visibleData = initialData.slice(0, currentIndex + 1);
  const isFinished = initialData.length > 0 && currentIndex >= initialData.length - 1;

  return {
    visibleData,
    isPlaying,
    isFinished,
    togglePlay,
    stepForward,
    reset,
    currentIndex,
    totalCount: initialData.length
  };
};
