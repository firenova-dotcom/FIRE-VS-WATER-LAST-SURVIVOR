/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameScreen, GameStats, GameSettings, Biome, ActiveSuperpower, InRunChallenge } from './types.ts';
import { GameEngine } from './game/GameEngine.ts';
import { getSkinById } from './game/skins.ts';
import { BIOMES, WAVE_ATTACKS, WaveAttack } from './game/biomes.ts';
import { sound } from './utils/audio.ts';
import {
  getBestScore,
  getStoredSettings,
  saveStoredSettings,
  resetAllGameData,
} from './utils/storage.ts';

// UI Components
import { HomeScreen } from './components/HomeScreen.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { HowToPlayModal } from './components/HowToPlayModal.tsx';
import { SkinsModal } from './components/SkinsModal.tsx';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High level UI Screen state
  const [screen, setScreen] = useState<GameScreen>('MENU');

  // Game stats
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => getBestScore());
  const [stage, setStage] = useState(1);
  const [lives, setLives] = useState(3);
  const [biomeName, setBiomeName] = useState('Sunny Lagoon');
  const [attackName, setAttackName] = useState('Puddle Rush');
  const [activePlayTime, setActivePlayTime] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [gameOverStats, setGameOverStats] = useState<GameStats | null>(null);
  const [activeSuperpower, setActiveSuperpower] = useState<ActiveSuperpower | null>(null);

  // Combo & Streak state
  const [combo, setCombo] = useState<{ count: number; multiplier: number; timerRatio: number }>({
    count: 0,
    multiplier: 1.0,
    timerRatio: 0,
  });

  // Active in-run challenge
  const [activeChallenge, setActiveChallenge] = useState<InRunChallenge | null>(null);

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => getStoredSettings());

  // Keep audio controller sound & vibration setting in sync
  useEffect(() => {
    sound.setSoundEnabled(settings.soundEnabled);
    sound.setVibrationEnabled(settings.vibrationEnabled);
  }, [settings.soundEnabled, settings.vibrationEnabled]);

  // Callbacks for the Game Engine
  const handleScoreUpdate = useCallback((newScore: number, isRecord: boolean) => {
    setScore(newScore);
    if (isRecord) {
      setIsNewRecord(true);
      setBestScore(newScore);
    }
  }, []);

  const handleStageUpdate = useCallback((newStage: number) => {
    setStage(newStage);
  }, []);

  const handleLivesUpdate = useCallback((newLives: number) => {
    setLives(newLives);
  }, []);

  const handleWaveAttackChange = useCallback((attack?: WaveAttack, biome?: Biome) => {
    if (attack?.name) {
      setAttackName(attack.name);
    }
    if (biome?.name) {
      setBiomeName(biome.name);
    }
  }, []);

  const handleTimeUpdate = useCallback((seconds: number) => {
    setActivePlayTime(seconds);
  }, []);

  const handleGameOver = useCallback((finalStats: GameStats) => {
    setGameOverStats(finalStats);
    setScreen('GAME_OVER');
  }, []);

  const handlePauseChange = useCallback((isPaused: boolean) => {
    if (isPaused) {
      setScreen('PAUSED');
    }
  }, []);

  const handleSuperpowerUpdate = useCallback((power: ActiveSuperpower | null) => {
    setActiveSuperpower(power ? { ...power } : null);
  }, []);

  const handleComboUpdate = useCallback((comboCount: number, multiplier: number, timerRatio: number) => {
    setCombo({ count: comboCount, multiplier, timerRatio });
  }, []);

  const handleChallengeUpdate = useCallback((challenge: InRunChallenge | null) => {
    setActiveChallenge(challenge ? { ...challenge } : null);
  }, []);

  // Initialize engine once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(
      canvas,
      {
        onScoreUpdate: handleScoreUpdate,
        onStageUpdate: handleStageUpdate,
        onTimeUpdate: handleTimeUpdate,
        onLivesUpdate: handleLivesUpdate,
        onWaveAttackChange: handleWaveAttackChange,
        onGameOver: handleGameOver,
        onPauseChange: handlePauseChange,
        onSuperpowerUpdate: handleSuperpowerUpdate,
        onComboUpdate: handleComboUpdate,
        onChallengeUpdate: handleChallengeUpdate,
      },
      settings.selectedSkinId
    );

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [
    handleScoreUpdate,
    handleStageUpdate,
    handleTimeUpdate,
    handleLivesUpdate,
    handleWaveAttackChange,
    handleGameOver,
    handlePauseChange,
    handleSuperpowerUpdate,
    handleComboUpdate,
    handleChallengeUpdate,
  ]);

  // Sync skin when changed
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSkin(settings.selectedSkinId);
    }
  }, [settings.selectedSkinId]);

  // Global Keyboard event handlers (Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      sound.unlockAudio();

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (screen === 'MENU') {
          handleStartGame();
        } else if (screen === 'PLAYING' && engineRef.current) {
          engineRef.current.triggerJumpPress();
        } else if (screen === 'GAME_OVER') {
          handleRestartGame();
        }
      } else if (e.code === 'KeyF' || e.code === 'KeyX' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        if (screen === 'PLAYING' && engineRef.current) {
          engineRef.current.triggerFireAttack();
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (screen === 'PLAYING') {
          handlePauseGame();
        } else if (screen === 'PAUSED') {
          handleResumeGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (engineRef.current) {
          engineRef.current.triggerJumpRelease();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen]);

  // --- ACTIONS ---

  const handleStartGame = () => {
    sound.unlockAudio();
    setScore(0);
    setIsNewRecord(false);
    setStage(1);
    setLives(3);
    setBiomeName('Sunny Lagoon');
    setAttackName('Puddle Rush');
    setActivePlayTime(0);
    setCombo({ count: 0, multiplier: 1.0, timerRatio: 0 });
    setScreen('PLAYING');

    if (engineRef.current) {
      engineRef.current.start();
    }
  };

  const handlePauseGame = () => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
    setScreen('PAUSED');
  };

  const handleResumeGame = () => {
    if (engineRef.current) {
      engineRef.current.resume();
    }
    setScreen('PLAYING');
  };

  const handleRestartGame = () => {
    sound.unlockAudio();
    setScore(0);
    setIsNewRecord(false);
    setStage(1);
    setLives(3);
    setBiomeName('Sunny Lagoon');
    setAttackName('Puddle Rush');
    setActivePlayTime(0);
    setCombo({ count: 0, multiplier: 1.0, timerRatio: 0 });
    setScreen('PLAYING');

    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.start();
    }
  };

  const handleGoHome = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setBestScore(getBestScore());
    setScreen('MENU');
  };

  const handleUpdateSettings = (updates: Partial<GameSettings>) => {
    const updated = saveStoredSettings(updates);
    setSettings(updated);
  };

  const handleToggleSound = () => {
    handleUpdateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const handleSelectSkin = (skinId: string) => {
    handleUpdateSettings({ selectedSkinId: skinId });
  };

  const handleResetProgress = () => {
    resetAllGameData();
    setBestScore(0);
    setSettings(getStoredSettings());
  };

  const handleAttack = useCallback(() => {
    if (engineRef.current && screen === 'PLAYING') {
      engineRef.current.triggerFireAttack();
    }
  }, [screen]);

  // Pointer event handlers for Canvas / Gameplay area (Mobile & Mouse clicks)
  const handlePointerDown = (e: React.PointerEvent) => {
    sound.unlockAudio();
    if (screen === 'PLAYING' && engineRef.current) {
      engineRef.current.triggerJumpPress();
    }
  };

  const handlePointerUp = () => {
    if (engineRef.current) {
      engineRef.current.triggerJumpRelease();
    }
  };

  const currentSkin = getSkinById(settings.selectedSkinId);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Game Canvas Container */}
      <div className="relative w-full h-full max-w-lg mx-auto overflow-hidden shadow-2xl bg-sky-900">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none block"
        />

        {/* HUD Overlay (visible when playing) */}
        {screen === 'PLAYING' && (
          <GameHUD
            score={score}
            bestScore={bestScore}
            stage={stage}
            lives={lives}
            biomeName={biomeName}
            attackName={attackName}
            activePlayTime={activePlayTime}
            isNewRecord={isNewRecord}
            soundEnabled={settings.soundEnabled}
            activeSuperpower={activeSuperpower}
            combo={combo}
            activeChallenge={activeChallenge}
            onPause={handlePauseGame}
            onToggleSound={handleToggleSound}
            onAttack={handleAttack}
          />
        )}

        {/* Home Screen */}
        {screen === 'MENU' && (
          <HomeScreen
            bestScore={bestScore}
            currentSkin={currentSkin}
            onPlay={handleStartGame}
            onOpenSkins={() => setScreen('SKINS')}
            onOpenHowToPlay={() => setScreen('HOW_TO_PLAY')}
            onOpenSettings={() => setScreen('SETTINGS')}
          />
        )}

        {/* Pause Modal */}
        {screen === 'PAUSED' && (
          <PauseModal
            score={score}
            stage={stage}
            soundEnabled={settings.soundEnabled}
            onResume={handleResumeGame}
            onRestart={handleRestartGame}
            onHome={handleGoHome}
            onToggleSound={handleToggleSound}
          />
        )}

        {/* Game Over Modal */}
        {screen === 'GAME_OVER' && gameOverStats && (
          <GameOverModal
            stats={gameOverStats}
            onPlayAgain={handleRestartGame}
            onHome={handleGoHome}
            onOpenSkins={() => setScreen('SKINS')}
          />
        )}

        {/* Settings Modal */}
        {screen === 'SETTINGS' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetProgress={handleResetProgress}
            onBack={() => setScreen('MENU')}
          />
        )}

        {/* How to Play Modal */}
        {screen === 'HOW_TO_PLAY' && (
          <HowToPlayModal onBack={() => setScreen('MENU')} />
        )}

        {/* Skins Modal */}
        {screen === 'SKINS' && (
          <SkinsModal
            bestScore={bestScore}
            currentSkinId={settings.selectedSkinId}
            onSelectSkin={handleSelectSkin}
            onBack={() => setScreen('MENU')}
          />
        )}
      </div>
    </main>
  );
}
