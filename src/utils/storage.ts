import { GameSettings } from '../types.ts';

const BEST_SCORE_KEY = 'fire_vs_water_best_score';
const SETTINGS_KEY = 'fire_vs_water_settings';
const SPARKS_KEY = 'fire_vs_water_sparks';
const UNLOCKED_SKINS_KEY = 'fire_vs_water_unlocked_skins';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  selectedSkinId: 'flamby',
  unlockedSkinIds: ['flamby'],
};

export function getBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const parsed = parseInt(raw || '0', 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): boolean {
  try {
    const current = getBestScore();
    if (score > current) {
      localStorage.setItem(BEST_SCORE_KEY, score.toString());
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getTotalSparks(): number {
  try {
    const raw = localStorage.getItem(SPARKS_KEY);
    const parsed = parseInt(raw || '0', 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function addSparks(amount: number): number {
  try {
    const current = getTotalSparks();
    const updated = current + Math.max(0, amount);
    localStorage.setItem(SPARKS_KEY, updated.toString());
    return updated;
  } catch {
    return 0;
  }
}

export function spendSparks(amount: number): boolean {
  try {
    const current = getTotalSparks();
    if (current >= amount) {
      const remaining = current - amount;
      localStorage.setItem(SPARKS_KEY, remaining.toString());
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getUnlockedSkinIds(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCKED_SKINS_KEY);
    if (!raw) return ['flamby'];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (!parsed.includes('flamby')) parsed.push('flamby');
      return parsed;
    }
    return ['flamby'];
  } catch {
    return ['flamby'];
  }
}

export function unlockSkinId(skinId: string): string[] {
  try {
    const current = getUnlockedSkinIds();
    if (!current.includes(skinId)) {
      const next = [...current, skinId];
      localStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(next));
      return next;
    }
    return current;
  } catch {
    return ['flamby'];
  }
}

export function getStoredSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const unlocked = getUnlockedSkinIds();
    if (!raw) return { ...DEFAULT_SETTINGS, unlockedSkinIds: unlocked };
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : true,
      vibrationEnabled: typeof parsed.vibrationEnabled === 'boolean' ? parsed.vibrationEnabled : true,
      selectedSkinId: typeof parsed.selectedSkinId === 'string' ? parsed.selectedSkinId : 'flamby',
      unlockedSkinIds: unlocked,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveStoredSettings(updates: Partial<GameSettings>): GameSettings {
  const current = getStoredSettings();
  const next = { ...current, ...updates };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
  return next;
}

export function resetAllGameData(): void {
  try {
    localStorage.removeItem(BEST_SCORE_KEY);
    localStorage.removeItem(SPARKS_KEY);
    localStorage.removeItem(UNLOCKED_SKINS_KEY);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  } catch {
    // Ignore
  }
}

export function triggerVibration(pattern: number | number[] = 40): void {
  const settings = getStoredSettings();
  if (settings.vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error
    }
  }
}
