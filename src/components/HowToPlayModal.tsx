import React from 'react';
import { ArrowLeft, Flame, Droplets, Zap, ShieldAlert, Award, Sparkles, Volume2 } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface HowToPlayModalProps {
  onBack: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onBack }) => {
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
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-white tracking-wide">HOW TO PLAY</h2>
          <div className="w-9" />
        </div>

        {/* Content list with scroll if screen is small */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left">
          {/* Card 1: 10-Second Superpowers */}
          <div className="p-3 bg-gradient-to-r from-amber-500/20 to-orange-500/10 rounded-2xl border border-amber-400/30 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/30 text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wide">10s Superpower Loot</h3>
              <p className="text-xs text-sky-100 leading-relaxed mt-0.5">
                Loot glowing orbs to unlock powers for <strong>exactly 10 seconds</strong>:
                <br />• 🔥 <strong>Fire Blaster</strong>: Rapid auto-fireballs vaporize water!
                <br />• 🛡️ <strong>Steam Shield</strong>: Invulnerable forcefield evaporates hazards on contact!
                <br />• ⚡ <strong>Inferno Dash</strong>: Supersonic flame flight burns obstacles!
                <br />• 🧲 <strong>Ember Magnet</strong>: Draws sparks with double score multiplier!
              </p>
            </div>
          </div>

          {/* Card 2: Fight Back / Fire Blast */}
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-orange-300 uppercase tracking-wide">Fire Blast Combat</h3>
              <p className="text-xs text-sky-100 leading-relaxed mt-0.5">
                Tap the <strong>FIRE BLAST 🔥</strong> button or press <kbd className="px-1 py-0.2 bg-black/40 rounded text-[10px] text-white">F</kbd> / <kbd className="px-1 py-0.2 bg-black/40 rounded text-[10px] text-white">X</kbd> to launch fireballs. Hitting water obstacles vaporizes them into steam clouds for bonus points!
              </p>
            </div>
          </div>

          {/* Card 3: Specific Sound Effects */}
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wide">Superpower Sound FX</h3>
              <p className="text-xs text-sky-100 leading-relaxed mt-0.5">
                Features custom synthesized Web Audio FX: A triumphant sparkling chime when you <strong>collect a power-up</strong>, and a distinct descending power-down sound when the <strong>10s duration expires</strong>!
              </p>
            </div>
          </div>

          {/* Card 4: Jump Controls */}
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-yellow-300 uppercase tracking-wide">Tap to Jump</h3>
              <p className="text-xs text-sky-100 leading-relaxed mt-0.5">
                Tap anywhere or press <kbd className="px-1 py-0.2 bg-black/40 rounded text-[10px] text-white">SPACE</kbd> / <kbd className="px-1 py-0.2 bg-black/40 rounded text-[10px] text-white">↑</kbd> to leap over hazards.
              </p>
            </div>
          </div>

          {/* Card 5: Combo Streak Multipliers */}
          <div className="p-3 bg-gradient-to-r from-orange-500/20 to-amber-500/10 rounded-2xl border border-orange-400/30 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/30 text-amber-300 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wide">Combo Streak Multipliers</h3>
              <p className="text-xs text-sky-100 leading-relaxed mt-0.5">
                Dodge obstacles, blast water, or collect sparks in quick succession to build up your streak multiplier (up to <strong>3.0x score!</strong>). The audio pitch rises as your flame blazes brighter!
              </p>
            </div>
          </div>

          {/* Card 6: Interactive Steam Geysers */}
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-sky-300 uppercase tracking-wide">Steam Geysers & Updrafts</h3>
              <p className="text-xs text-sky-100 leading-relaxed mt-0.5">
                Watch for bubbling ground vents: when they erupt into towering steam columns, jump into the thermal updraft for a <strong>super high airborne launch</strong> and bonus air combo!
              </p>
            </div>
          </div>

          {/* Card 7: In-Run Mini-Quests */}
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wide">In-Run Quests & Badges</h3>
              <p className="text-xs text-sky-100 leading-relaxed mt-0.5">
                Complete dynamic mid-run challenges (Air Time, Inferno Streak, Water Breaker) to unlock instant bonus scores and collectable Sparks for skin unlocks!
              </p>
            </div>
          </div>

          {/* Card 8: 3 Lives & Shifting Biomes */}
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-rose-300 uppercase tracking-wide">3 Lives & Biome Transitions</h3>
              <p className="text-xs text-sky-100 leading-relaxed mt-0.5">
                You have 3 chances per run. Every 10 seconds of active survival unlocks a new biome with transition fanfares and dynamic atmospheric weather!
              </p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="pt-3 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onBack();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-sm border border-white/20 transition-all text-center cursor-pointer"
          >
            Got it, let's blaze!
          </button>
        </div>
      </div>
    </div>
  );
};
