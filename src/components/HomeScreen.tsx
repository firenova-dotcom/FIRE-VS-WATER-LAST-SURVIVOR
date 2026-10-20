import React from 'react';
import { FlameSkin } from '../types.ts';
import { FlameCanvasPreview } from './FlameCanvasPreview.tsx';
import { Trophy, Play, Palette, HelpCircle, Settings as SettingsIcon, Flame, Droplets } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface HomeScreenProps {
  bestScore: number;
  currentSkin: FlameSkin;
  onPlay: () => void;
  onOpenSkins: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  bestScore,
  currentSkin,
  onPlay,
  onOpenSkins,
  onOpenHowToPlay,
  onOpenSettings,
}) => {
  const handlePlayClick = () => {
    sound.playClick();
    onPlay();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-sky-600/90 via-sky-500/80 to-sky-900/95 backdrop-blur-xs select-none">
      {/* Top Header & Best Score */}
      <div className="w-full max-w-md flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 px-3.5 py-1.5 rounded-2xl shadow-inner">
          <Trophy className="w-5 h-5 text-amber-300 drop-shadow-sm" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">Best Score</span>
            <span className="text-lg font-extrabold text-amber-100 leading-none tabular-nums">{bestScore}</span>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onOpenSettings();
          }}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white transition-all shadow-md"
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon className="w-5 h-5 text-sky-100" />
        </button>
      </div>

      {/* Main Centerpiece & Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center">
        {/* Game Title Lockup */}
        <div className="relative mb-4">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-orange-500/30 border border-orange-400/40 text-2xl shadow-lg">
              🔥
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
              FIRE <span className="text-amber-300 font-black">VS</span> WATER
            </h1>
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-sky-400/30 border border-sky-300/40 text-2xl shadow-lg">
              💧
            </span>
          </div>
          <p className="text-sky-100 text-sm sm:text-base font-semibold mt-1 drop-shadow-sm tracking-wide">
            {bestScore > 0 ? `Can you beat your record of ${bestScore} pts?` : 'Survive the hazards and set your record!'}
          </p>
        </div>

        {/* Hero Character Emblem */}
        <div className="relative group my-2 cursor-pointer" onClick={onOpenSkins}>
          <div className="absolute inset-0 rounded-full bg-orange-500/25 blur-xl group-hover:bg-orange-500/40 transition-all scale-110" />
          <div className="relative flex flex-col items-center">
            <div className="w-36 h-36 rounded-full bg-radial from-white/20 to-sky-950/40 border-2 border-white/30 flex items-center justify-center shadow-2xl backdrop-blur-sm">
              <FlameCanvasPreview skin={currentSkin} size={130} />
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20 text-xs font-bold text-white shadow-sm">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{currentSkin.name}</span>
            </div>
          </div>
        </div>

        {/* Primary Play Button */}
        <button
          onClick={handlePlayClick}
          className="mt-6 group relative px-10 py-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 active:scale-95 text-white font-extrabold text-2xl tracking-wide shadow-[0_10px_25px_rgba(234,88,12,0.45)] border-t-2 border-amber-200 transition-all flex items-center gap-3"
        >
          <Play className="w-7 h-7 fill-white drop-shadow-sm group-hover:scale-110 transition-transform" />
          <span>PLAY</span>
        </button>

        <p className="text-sky-200/80 text-xs mt-3 font-medium">
          Tap or press <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[11px]">SPACE</kbd> to jump
        </p>
      </div>

      {/* Bottom Nav Buttons */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 pb-2">
        <button
          onClick={() => {
            sound.playClick();
            onOpenSkins();
          }}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 border border-white/25 text-white font-bold text-sm shadow-md transition-all"
        >
          <Palette className="w-4 h-4 text-pink-300" />
          <span>Skins & Color</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenHowToPlay();
          }}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 border border-white/25 text-white font-bold text-sm shadow-md transition-all"
        >
          <HelpCircle className="w-4 h-4 text-cyan-300" />
          <span>How to Play</span>
        </button>
      </div>
    </div>
  );
};
