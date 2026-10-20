import React from 'react';
import { Pause, Flame, Volume2, VolumeX, Heart, Crown, Zap, Shield, Sparkles, Award } from 'lucide-react';
import { ActiveSuperpower, InRunChallenge } from '../types.ts';
import { sound } from '../utils/audio.ts';

interface GameHUDProps {
  score: number;
  bestScore: number;
  stage: number;
  lives: number;
  biomeName: string;
  attackName: string;
  activePlayTime: number;
  isNewRecord: boolean;
  soundEnabled: boolean;
  activeSuperpower?: ActiveSuperpower | null;
  combo?: { count: number; multiplier: number; timerRatio: number };
  activeChallenge?: InRunChallenge | null;
  onPause: () => void;
  onToggleSound: () => void;
  onAttack?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  bestScore,
  stage,
  lives,
  biomeName,
  isNewRecord,
  soundEnabled,
  activeSuperpower,
  combo,
  activeChallenge,
  onPause,
  onToggleSound,
  onAttack,
}) => {
  // Personal record progress: racing against past self!
  const hasPastRecord = bestScore > 0;
  const isSurpassing = hasPastRecord && score >= bestScore;
  const pointsRemaining = hasPastRecord ? Math.max(0, bestScore - score) : 0;
  const recordProgressPct = hasPastRecord ? Math.min(100, (score / bestScore) * 100) : 100;

  // Superpower progress % (depleting from 100% to 0% over 10s)
  const powerProgressPct = activeSuperpower
    ? Math.max(0, Math.min(100, (activeSuperpower.timeRemaining / activeSuperpower.duration) * 100))
    : 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Left Cluster: Live Score & Flame Heart Lives */}
        <div className="flex flex-col gap-1.5">
          {/* Glassmorphic Score Card */}
          <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-2xl shadow-xl w-fit">
            <span className="text-3xl font-black text-white tabular-nums drop-shadow-md leading-none tracking-tight">
              {score}
            </span>
            {isSurpassing && (
              <span className="flex items-center gap-1 text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md animate-pulse">
                <Crown className="w-3 h-3 fill-slate-950" />
                <span>LEAD!</span>
              </span>
            )}
          </div>

          {/* 3 Flame Lives */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-black/35 backdrop-blur-md rounded-xl border border-white/10 w-fit shadow-md">
            {[1, 2, 3].map((heartIndex) => {
              const isAlive = heartIndex <= lives;
              return (
                <div
                  key={heartIndex}
                  className={`transition-all duration-300 transform ${
                    isAlive
                      ? 'scale-100 text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.85)]'
                      : 'scale-90 opacity-20 text-slate-500'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isAlive ? 'fill-rose-500 stroke-white stroke-1' : 'fill-slate-600 stroke-transparent'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Dynamic Combo & Streak Multiplier Bar */}
          {combo && combo.count >= 2 && (
            <div className="flex flex-col gap-0.5 mt-0.5 animate-scale-in">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 border border-amber-200/90 shadow-[0_0_12px_rgba(249,115,22,0.7)] text-slate-950 font-black text-[11px] leading-tight">
                <Flame className="w-3 h-3 fill-slate-950 stroke-none animate-pulse" />
                <span>{combo.count}x STREAK</span>
                <span className="bg-slate-950 text-amber-300 text-[9px] px-1 py-0.2 rounded font-extrabold ml-0.5">
                  x{combo.multiplier.toFixed(1)}
                </span>
              </div>
              <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden border border-white/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-300 to-yellow-200 transition-all duration-75 ease-linear rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, combo.timerRatio * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center: "RIVAL SELF" Personal Record Battle Bar */}
        <div className="flex flex-col items-center max-w-[210px] w-full mx-2">
          <div className="w-full flex items-center justify-between text-[10px] font-black tracking-wide uppercase px-1 mb-1">
            {hasPastRecord ? (
              isSurpassing ? (
                <span className="text-amber-300 flex items-center gap-1 mx-auto drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]">
                  <Crown className="w-3.5 h-3.5 fill-amber-300" />
                  <span>RECORD BROKEN (+{score - bestScore})</span>
                </span>
              ) : (
                <>
                  <span className="text-sky-200">BEAT BEST: {bestScore}</span>
                  <span className="text-amber-300 font-extrabold">{pointsRemaining} TO GO!</span>
                </>
              )
            ) : (
              <span className="text-amber-300 mx-auto">SETTING YOUR RECORD</span>
            )}
          </div>

          {/* Rivalry Progress Fill Bar */}
          <div className="w-full h-2 bg-black/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/15 shadow-inner">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                isSurpassing
                  ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse'
                  : 'bg-gradient-to-r from-sky-400 to-amber-400'
              }`}
              style={{ width: `${recordProgressPct}%` }}
            />
          </div>

          {/* Minimalist Biome & Stage Stamp */}
          <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold text-sky-200/90 tracking-wide uppercase">
            <span>{biomeName}</span>
            <span>•</span>
            <span className="text-amber-300">STAGE {stage}</span>
          </div>

          {/* Active In-Run Challenge Mini-Badge */}
          {activeChallenge && !activeChallenge.completed && (
            <div className="flex items-center gap-1 px-2 py-0.5 mt-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-[9px] text-white shadow-md max-w-full">
              <span className="text-xs leading-none">{activeChallenge.icon}</span>
              <span className="font-black text-amber-300 uppercase tracking-tight shrink-0">{activeChallenge.title}:</span>
              <span className="text-slate-200 truncate max-w-[95px]">{activeChallenge.description}</span>
              <span className="text-sky-300 font-extrabold ml-auto shrink-0">+{activeChallenge.rewardPoints}pt</span>
            </div>
          )}
        </div>

        {/* Right Cluster: Compact Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            className="p-2.5 rounded-2xl bg-black/40 hover:bg-black/60 active:scale-95 border border-white/15 text-white shadow-md transition-all backdrop-blur-md cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
            aria-label={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-sky-200" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onPause();
            }}
            className="p-2.5 rounded-2xl bg-black/40 hover:bg-black/60 active:scale-95 border border-white/15 text-white shadow-md transition-all backdrop-blur-md cursor-pointer"
            title="Pause Game"
            aria-label="Pause Game"
          >
            <Pause className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Middle Top: Active 10-Second Superpower Banner */}
      {activeSuperpower && (
        <div className="self-center flex flex-col items-center animate-bounce-subtle pointer-events-none mt-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]">
            <span className="text-lg leading-none">{activeSuperpower.icon}</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-300 tracking-wider uppercase">
                  {activeSuperpower.name}
                </span>
                <span className="text-xs font-extrabold text-white tabular-nums bg-amber-500/30 px-1.5 py-0.2 rounded-md">
                  {activeSuperpower.timeRemaining.toFixed(1)}s
                </span>
              </div>
              <div className="w-28 sm:w-36 h-1.5 bg-black/60 rounded-full mt-1 overflow-hidden border border-white/15">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-100 rounded-full"
                  style={{ width: `${powerProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Area: Combat & Jump Controls */}
      <div className="flex items-end justify-between w-full pointer-events-auto pb-1 sm:pb-2">
        {/* Left Side: Jump hint / indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/35 backdrop-blur-sm border border-white/10 text-white/80 text-[11px] font-bold">
          <span>TAP ANYWHERE TO JUMP</span>
        </div>

        {/* Right Side: FIRE ATTACK BUTTON to fight back against water! */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAttack?.();
          }}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-2xl active:scale-95 transition-all cursor-pointer border ${
            activeSuperpower?.type === 'FIRE_BLASTER'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(249,115,22,0.8)] animate-pulse'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 border-amber-200/80 shadow-[0_0_14px_rgba(245,158,11,0.5)]'
          }`}
          title="Shoot Fireball (F / X key)"
          aria-label="Shoot Fireball"
        >
          <Flame className="w-4 h-4 fill-slate-950 stroke-none" />
          <span>FIRE BLAST 🔥</span>
        </button>
      </div>
    </div>
  );
};
