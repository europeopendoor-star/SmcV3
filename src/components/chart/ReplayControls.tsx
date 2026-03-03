import React from 'react';
import { Play, Pause, StepForward, RotateCcw } from 'lucide-react';

interface ReplayControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  isFinished: boolean;
  currentIndex: number;
  totalCount: number;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onStepForward,
  onReset,
  isFinished,
  currentIndex,
  totalCount
}) => {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-2 mt-4">
      <div className="flex gap-1">
        <button
          onClick={onReset}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={onTogglePlay}
          disabled={isFinished}
          className={`p-2 rounded-lg transition-colors ${isFinished ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-white/10 text-white'}`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button
          onClick={onStepForward}
          disabled={isFinished || isPlaying}
          className={`p-2 rounded-lg transition-colors ${isFinished || isPlaying ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-white/10 text-white'}`}
          title="Step Forward"
        >
          <StepForward className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 h-2 bg-black rounded-full overflow-hidden border border-white/5">
        <div
          className="h-full bg-yellow-500 transition-all duration-300"
          style={{ width: `${totalCount > 0 ? (currentIndex / totalCount) * 100 : 0}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 font-mono w-24 text-right">
        {currentIndex} / {totalCount}
      </div>
    </div>
  );
};
