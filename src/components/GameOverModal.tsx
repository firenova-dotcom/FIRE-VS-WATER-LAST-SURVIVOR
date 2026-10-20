import React from 'react';
import { GameStats } from '../types.ts';
import { FLAME_SKINS } from '../game/skins.ts';
import { RotateCcw, Home, Trophy, Sparkles, Palette } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface GameOverModalProps {
  stats: GameStats;
  onPlayAgain: () => void;
  onHome: () => void;
  onOpenSkins: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onPlayAgain,
  onHome,
  onOpenSkins,
}) => {
  // Check if a new skin was unlocked with this score or what the next skin milestone is
  const highestScore = Math.max(stats.score, stats.bestScore);
  const nextLockedSkin = FLAME_SKINS.find((s) => s.scoreRequirement > highestScore);
  const justUnlockedSkin = FLAME_SKINS.find(
    (s) => s.scoreRequirement > 0 && stats.score >= s.scoreRequirement && (stats.score - 1) < s.scoreRequirement
  );

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 border-2 border-white/20 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
        {/* Extinguished Banner */}
        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center text-3xl mb-3 shadow-inner">
          💨
        </div>

        <h2 className="text-3xl font-black text-white tracking-wide">
          {stats.isNewRecord ? 'RECORD SHATTERED!' : 'EXTINGUISHED!'}
        </h2>
        <p className="text-sky-200 text-xs font-semibold mb-4">
          {stats.isNewRecord
            ? '🔥 You defeated your past self and set a new personal record!'
            : stats.bestScore > stats.score
            ? `⚡ ${stats.bestScore - stats.score} more points to defeat your personal best!`
            : 'Water put out the flame!'}
        </p>

        {/* Score Card */}
        <div className="w-full bg-white/10 rounded-2xl p-4 border border-white/15 mb-4 shadow-inner flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs uppercase font-extrabold text-sky-200 tracking-wider">Final Score</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-white tabular-nums drop-shadow-sm">{stats.score}</span>
              {stats.isNewRecord && (
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-sm animate-bounce">
                  NEW BEST!
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="bg-black/30 rounded-xl p-1.5">
              <span className="block text-[9px] font-bold text-sky-300">BEST</span>
              <span className="font-extrabold text-amber-300 text-sm tabular-nums">
                {Math.max(stats.score, stats.bestScore)}
              </span>
            </div>
            <div className="bg-black/30 rounded-xl p-1.5">
              <span className="block text-[9px] font-bold text-sky-300">STAGE</span>
              <span className="font-extrabold text-white text-sm tabular-nums">{stats.stage}</span>
            </div>
            <div className="bg-black/30 rounded-xl p-1.5">
              <span className="block text-[9px] font-bold text-orange-400">STREAK</span>
              <span className="font-extrabold text-amber-300 text-sm tabular-nums">{stats.maxCombo || 0}x</span>
            </div>
            <div className="bg-black/30 rounded-xl p-1.5">
              <span className="block text-[9px] font-bold text-emerald-300">QUESTS</span>
              <span className="font-extrabold text-emerald-400 text-sm tabular-nums">{stats.challengesDone || 0}</span>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-black/40 rounded-xl border border-white/10 text-[11px] text-sky-200 flex items-center justify-between">
            <span>Biome: <strong className="text-amber-300">{stats.biomeName}</strong></span>
            <span>Attack: <strong className="text-rose-300">{stats.attackName}</strong></span>
          </div>
        </div>

        {/* Skin Unlock Alert or Progress */}
        {justUnlockedSkin ? (
          <div
            onClick={onOpenSkins}
            className="w-full mb-4 p-3 bg-gradient-to-r from-amber-500/25 to-pink-500/25 border border-amber-400/50 rounded-2xl cursor-pointer hover:scale-102 transition-all flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-400/30 flex items-center justify-center text-xl">
              ✨
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider block">Skin Unlocked!</span>
              <span className="text-xs font-bold text-white">{justUnlockedSkin.name}</span>
            </div>
          </div>
        ) : nextLockedSkin ? (
          <div className="w-full mb-4 px-3 py-2 bg-black/30 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-sky-200 text-[11px] font-medium">Next Skin: <strong className="text-white">{nextLockedSkin.name}</strong></span>
            <span className="font-bold text-amber-300 text-[11px]">{highestScore} / {nextLockedSkin.scoreRequirement} pts</span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={() => {
              sound.playClick();
              onPlayAgain();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 active:scale-95 text-white font-extrabold text-lg shadow-lg border-t border-amber-200 flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-5 h-5 fill-white" />
            <span>Play Again</span>
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => {
                sound.playClick();
                onOpenSkins();
              }}
              className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs border border-white/15 flex items-center justify-center gap-1.5 transition-all"
            >
              <Palette className="w-4 h-4 text-pink-300" />
              <span>Skins</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onHome();
              }}
              className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 font-bold text-xs border border-white/15 flex items-center justify-center gap-1.5 transition-all"
            >
              <Home className="w-4 h-4 text-slate-300" />
              <span>Main Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
