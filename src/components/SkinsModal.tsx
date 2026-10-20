import React from 'react';
import { FLAME_SKINS, getSkinById } from '../game/skins.ts';
import { FlameCanvasPreview } from './FlameCanvasPreview.tsx';
import { ArrowLeft, Lock, Check, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface SkinsModalProps {
  bestScore: number;
  currentSkinId: string;
  onSelectSkin: (skinId: string) => void;
  onBack: () => void;
}

export const SkinsModal: React.FC<SkinsModalProps> = ({
  bestScore,
  currentSkinId,
  onSelectSkin,
  onBack,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm max-h-[90vh] bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 border-2 border-white/20 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onBack();
            }}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-black text-white tracking-wide">FLAME SKINS</h2>
            <span className="text-[11px] text-amber-300 font-bold">Best Score: {bestScore} pts</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Skins Grid List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {FLAME_SKINS.map((skin) => {
            const isUnlocked = bestScore >= skin.scoreRequirement;
            const isSelected = skin.id === currentSkinId;

            return (
              <div
                key={skin.id}
                onClick={() => {
                  if (isUnlocked) {
                    sound.playClick();
                    onSelectSkin(skin.id);
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-lg scale-101'
                    : isUnlocked
                    ? 'bg-white/10 border-white/15 hover:bg-white/15 active:scale-99 cursor-pointer'
                    : 'bg-black/35 border-white/5 opacity-70 cursor-not-allowed'
                }`}
              >
                {/* Left: Character Preview */}
                <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                  <FlameCanvasPreview skin={skin} size={64} animate={isUnlocked} />
                </div>

                {/* Center: Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-extrabold text-white truncate">{skin.name}</h3>
                    {isSelected && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                        Equipped
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-sky-200 line-clamp-1 mt-0.5">{skin.description}</p>

                  <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                    {isUnlocked ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Unlocked</span>
                      </span>
                    ) : (
                      <span className="text-amber-300/90 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Requires {skin.scoreRequirement} pts ({bestScore}/{skin.scoreRequirement})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Equip / Lock Button */}
                <div className="shrink-0">
                  {isUnlocked ? (
                    <button
                      disabled={isSelected}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 cursor-default'
                          : 'bg-white/20 hover:bg-white/30 text-white'
                      }`}
                    >
                      {isSelected ? 'In Use' : 'Equip'}
                    </button>
                  ) : (
                    <div className="p-2 rounded-xl bg-black/40 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Back Button */}
        <div className="pt-3 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onBack();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-sm border border-white/20 transition-all text-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
