import { Biome } from '../types.ts';

export const BIOMES: Biome[] = [
  {
    id: 'sunny_lagoon',
    name: 'Sunny Lagoon',
    skyTop: '#0284c7', // Sky-600
    skyMid: '#38bdf8', // Sky-400
    skyBottom: '#bae6fd', // Sky-200
    grassColor: '#22c55e', // Emerald/Green
    grassBladeColor: '#16a34a',
    dirtColor: '#78350f',
    dirtSubColor: '#451a03',
    waterColor: '#0284c7',
    waterHighlight: '#7dd3fc',
    weather: 'BUBBLES',
    sunColor: '#fef08a',
    sunGlow: 'rgba(253, 224, 71, 0.45)',
    celestial: 'SUN',
  },
  {
    id: 'thunder_tempest',
    name: 'Thunder Tempest',
    skyTop: '#1e1b4b', // Indigo-950
    skyMid: '#312e81', // Indigo-900
    skyBottom: '#475569', // Slate-600
    grassColor: '#15803d', // Dark Forest Moss
    grassBladeColor: '#166534',
    dirtColor: '#334155', // Slate Earth
    dirtSubColor: '#1e293b',
    waterColor: '#1e293b',
    waterHighlight: '#93c5fd',
    weather: 'RAIN',
    sunColor: '#c7d2fe',
    sunGlow: 'rgba(168, 85, 247, 0.35)',
    celestial: 'STORM_LIGHTNING',
  },
  {
    id: 'glacial_tundra',
    name: 'Glacial Tundra',
    skyTop: '#0f172a', // Slate-900
    skyMid: '#0e7490', // Cyan-700
    skyBottom: '#cffafe', // Cyan-100
    grassColor: '#67e8f9', // Frosted Cyan
    grassBladeColor: '#22d3ee',
    dirtColor: '#164e63',
    dirtSubColor: '#083344',
    waterColor: '#0369a1',
    waterHighlight: '#e0f2fe',
    weather: 'SNOW',
    sunColor: '#e0f2fe',
    sunGlow: 'rgba(207, 250, 254, 0.6)',
    celestial: 'ICE_HALO',
  },
  {
    id: 'sunset_horizon',
    name: 'Sunset Horizon',
    skyTop: '#4c0519', // Rose-950
    skyMid: '#9a3412', // Orange-800
    skyBottom: '#fde047', // Yellow-300
    grassColor: '#ca8a04', // Amber Prairie
    grassBladeColor: '#a16207',
    dirtColor: '#7c2d12',
    dirtSubColor: '#451a03',
    waterColor: '#7c2d12',
    waterHighlight: '#fdba74',
    weather: 'TWILIGHT_MOTES',
    sunColor: '#fb923c',
    sunGlow: 'rgba(249, 115, 22, 0.7)',
    celestial: 'SUNSET_ORB',
  },
  {
    id: 'midnight_abyss',
    name: 'Midnight Abyss',
    skyTop: '#030712', // Gray-950
    skyMid: '#0f172a', // Slate-900
    skyBottom: '#1e1b4b', // Indigo-950
    grassColor: '#6366f1', // Bioluminescent Indigo
    grassBladeColor: '#4f46e5',
    dirtColor: '#18181b',
    dirtSubColor: '#09090b',
    waterColor: '#020617',
    waterHighlight: '#818cf8',
    weather: 'NEON_EMBERS',
    sunColor: '#f1f5f9',
    sunGlow: 'rgba(255, 255, 255, 0.65)',
    celestial: 'FULL_MOON',
  },
];

export interface WaveAttack {
  stage: number;
  name: string;
  subtitle: string;
  icon: string;
  accentColor: string;
}

export const WAVE_ATTACKS: Record<number, WaveAttack> = {
  1: {
    stage: 1,
    name: 'Sunny Lagoon',
    subtitle: 'Easy ground puddles',
    icon: '💧',
    accentColor: '#38bdf8',
  },
  2: {
    stage: 2,
    name: 'Puddle Rush',
    subtitle: 'Faster puddles & falling drops',
    icon: '🌧️',
    accentColor: '#60a5fa',
  },
  3: {
    stage: 3,
    name: 'Falling Drops & Waves',
    subtitle: 'Water waves & falling drops',
    icon: '🌊',
    accentColor: '#818cf8',
  },
  4: {
    stage: 4,
    name: 'Water Attack',
    subtitle: 'Side splashes & flying bubbles',
    icon: '💦',
    accentColor: '#f43f5e',
  },
  5: {
    stage: 5,
    name: 'Aqua Storm',
    subtitle: 'Controlled combination attacks',
    icon: '⚡',
    accentColor: '#fbbf24',
  },
  6: {
    stage: 6,
    name: 'Survival Chaos',
    subtitle: 'Water showers & moving barriers',
    icon: '🌪️',
    accentColor: '#ec4899',
  },
  7: {
    stage: 7,
    name: 'Tsunami Surge',
    subtitle: 'Rapid geysers & wave barrage',
    icon: '🌊',
    accentColor: '#34d399',
  },
  8: {
    stage: 8,
    name: 'Maelstrom Frenzy',
    subtitle: 'Maximum water onslaught!',
    icon: '🌀',
    accentColor: '#f97316',
  },
};

export function getBiomeForStage(stage: number): Biome {
  const safeStage = Math.max(1, Math.floor(stage || 1));
  const rawIndex = Math.floor((safeStage - 1) / 2);
  const index = Math.abs(rawIndex) % BIOMES.length;
  return BIOMES[index] || BIOMES[0];
}

export function getWaveAttackForStage(stage: number): WaveAttack {
  const safeStage = Math.max(1, Math.floor(stage || 1));
  if (WAVE_ATTACKS[safeStage]) {
    return WAVE_ATTACKS[safeStage];
  }
  return {
    stage: safeStage,
    name: `Maelstrom LVL ${safeStage}`,
    subtitle: 'Unstoppable Water Deluge',
    icon: '🌀',
    accentColor: '#f97316',
  };
}
