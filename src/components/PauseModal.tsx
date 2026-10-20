import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface PauseModalProps {
  score: number;
  stage: number;
  soundEnabled: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onToggleSound: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  score,
  stage,
  soundEnabled,
  onResume,
  onRestart,
  onHome,
  onToggleSound,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-xs bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 border-2 border-white/20 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
        {/* Title */}
        <h2 className="text-2xl font-black text-white tracking-wide mb-1">
          GAME PAUSED
        </h2>
        <div className="flex items-center gap-2 mb-6 text-xs font-bold text-sky-200">
          <span>Current Score: <strong className="text-amber-300">{score}</strong></span>
          <span>•</span>
          <span>Stage: <strong className="text-orange-400">{stage}</strong></span>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-3">
          {/* Resume Button */}
          <button
            onClick={() => {
              sound.playClick();
              onResume();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-white font-extrabold text-lg shadow-lg border-t border-amber-200 flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Resume</span>
          </button>

          {/* Restart Button */}
          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-sm border border-white/20 flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <RotateCcw className="w-4 h-4 text-sky-300" />
            <span>Restart</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-sky-100 font-bold text-xs border border-white/15 flex items-center justify-center gap-2 transition-all"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-sky-300" />
                <span>Sound: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Sound: OFF</span>
              </>
            )}
          </button>

          {/* Home Button */}
          <button
            onClick={() => {
              sound.playClick();
              onHome();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 font-bold text-sm border border-white/15 flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-4 h-4 text-slate-300" />
            <span>Back to Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
