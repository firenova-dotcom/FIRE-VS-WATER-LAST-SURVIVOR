import React, { useState } from 'react';
import { GameSettings } from '../types.ts';
import { Volume2, VolumeX, Smartphone, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/audio.ts';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (updates: Partial<GameSettings>) => void;
  onResetProgress: () => void;
  onBack: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  onBack,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const toggleSound = () => {
    sound.playClick();
    onUpdateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const toggleVibration = () => {
    sound.playClick();
    onUpdateSettings({ vibrationEnabled: !settings.vibrationEnabled });
  };

  const handleConfirmReset = () => {
    sound.playClick();
    onResetProgress();
    setShowConfirmReset(false);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 border-2 border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
          <h2 className="text-xl font-black text-white tracking-wide">SETTINGS</h2>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Sound Toggle */}
          <div
            onClick={toggleSound}
            className="flex items-center justify-between p-3.5 bg-white/10 rounded-2xl border border-white/15 cursor-pointer hover:bg-white/15 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-sky-300" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-white">Sound Effects</span>
                <span className="text-[11px] text-sky-200">Arcade audio & chimes</span>
              </div>
            </div>

            <div
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                settings.soundEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Vibration Toggle */}
          <div
            onClick={toggleVibration}
            className="flex items-center justify-between p-3.5 bg-white/10 rounded-2xl border border-white/15 cursor-pointer hover:bg-white/15 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-amber-300" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-white">Haptic Vibration</span>
                <span className="text-[11px] text-sky-200">Tactile impact rumble</span>
              </div>
            </div>

            <div
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                settings.vibrationEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Reset Saved Data Option */}
          <button
            onClick={() => {
              sound.playClick();
              setShowConfirmReset(true);
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 active:scale-95 text-red-300 border border-red-500/30 text-xs font-bold transition-all mt-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset High Score & Progress</span>
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="w-full py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-sm border border-white/20 transition-all text-center"
        >
          Done
        </button>

        {/* Confirmation Modal */}
        {showConfirmReset && (
          <div className="absolute inset-0 bg-slate-950/90 rounded-3xl p-6 flex flex-col items-center justify-center text-center z-40">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-2" />
            <h3 className="text-lg font-black text-white mb-1">Reset Progress?</h3>
            <p className="text-xs text-sky-200 mb-6 leading-relaxed">
              This will clear your high score and reset unlocked skins back to default. This cannot be undone!
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
