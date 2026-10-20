export type GameScreen =
  | 'MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'SETTINGS'
  | 'HOW_TO_PLAY'
  | 'SKINS';

export type CharacterModelType = 'FLAME' | 'MAGMA' | 'PLASMA' | 'DRAGON' | 'WISP' | 'PHOENIX';

export interface FlameSkin {
  id: string;
  name: string;
  modelType: CharacterModelType;
  scoreRequirement: number;
  sparkCost?: number;
  description: string;
  specialTrait?: string;
  colors: {
    outer: string;
    inner: string;
    core: string;
    glow: string;
    eyes: string;
    pupils: string;
    particles: string[];
    accent?: string;
  };
}

export type SuperpowerType = 'FIRE_BLASTER' | 'STEAM_SHIELD' | 'INFERNO_DASH' | 'EMBER_MAGNET';

export interface ActiveSuperpower {
  type: SuperpowerType;
  name: string;
  duration: number; // 10.0 seconds
  timeRemaining: number;
  color: string;
  icon: string;
  description: string;
}

export interface Fireball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface PowerUpItem {
  id: number;
  type: SuperpowerType;
  x: number;
  y: number;
  size: number;
  collected: boolean;
  pulseTimer: number;
}

export interface CollectibleSpark {
  id: number;
  x: number;
  y: number;
  size: number;
  collected: boolean;
  value: number;
  pulseTimer: number;
}

export type ObstacleType =
  | 'PUDDLE'
  | 'GAP'
  | 'DROPLET'
  | 'WATER_WAVE'
  | 'SIDE_SPLASH'
  | 'FLYING_BUBBLE'
  | 'MOVING_BARRIER'
  | 'WATER_SHOWER'
  | 'GEYSER'
  | 'LEAPING_FISH';

export interface BaseObstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  hasScored: boolean;
}

export interface PuddleObstacle extends BaseObstacle {
  type: 'PUDDLE';
  depth: number;
  rippleOffset: number;
}

export interface GapObstacle extends BaseObstacle {
  type: 'GAP';
  waterLevel: number;
}

export interface DropletObstacle extends BaseObstacle {
  type: 'DROPLET';
  vy: number;
  targetGroundX: number;
  fallDelay: number;
  hasLanded: boolean;
  splashAnim: number;
}

export interface WaterWaveObstacle extends BaseObstacle {
  type: 'WATER_WAVE';
  speedBonus: number;
  wavePhase: number;
  waveHeight: number;
}

export interface SideSplashObstacle extends BaseObstacle {
  type: 'SIDE_SPLASH';
  vx: number;
  vy: number;
  gravity: number;
  radius: number;
  warningTimer: number;
  isLaunched: boolean;
}

export interface FlyingBubbleObstacle extends BaseObstacle {
  type: 'FLYING_BUBBLE';
  altitude: 'LOW' | 'HIGH';
  radius: number;
  floatOffset: number;
  baseY: number;
}

export interface MovingBarrierObstacle extends BaseObstacle {
  type: 'MOVING_BARRIER';
  minY: number;
  maxY: number;
  speed: number;
  direction: number;
}

export interface ShowerDrop {
  xOffset: number;
  y: number;
  vy: number;
  fallDelay: number;
  hasLanded: boolean;
  splashAnim: number;
}

export interface WaterShowerObstacle extends BaseObstacle {
  type: 'WATER_SHOWER';
  drops: ShowerDrop[];
}

export interface GeyserObstacle extends BaseObstacle {
  type: 'GEYSER';
  state: 'TELEGRAPH' | 'ERUPTING' | 'RETRACTING' | 'DORMANT';
  timer: number;
  maxHeight: number;
}

export interface LeapingFishObstacle extends BaseObstacle {
  type: 'LEAPING_FISH';
  vy: number;
  vx: number;
  gravity: number;
  rotation: number;
  apexReached: boolean;
}

export type Obstacle =
  | PuddleObstacle
  | GapObstacle
  | DropletObstacle
  | WaterWaveObstacle
  | SideSplashObstacle
  | FlyingBubbleObstacle
  | MovingBarrierObstacle
  | WaterShowerObstacle
  | GeyserObstacle
  | LeapingFishObstacle;

export type WeatherEffect = 'BUBBLES' | 'RAIN' | 'SNOW' | 'TWILIGHT_MOTES' | 'NEON_EMBERS';

export interface Biome {
  id: string;
  name: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  grassColor: string;
  grassBladeColor: string;
  dirtColor: string;
  dirtSubColor: string;
  waterColor: string;
  waterHighlight: string;
  weather: WeatherEffect;
  sunColor: string;
  sunGlow: string;
  celestial: 'SUN' | 'STORM_LIGHTNING' | 'ICE_HALO' | 'SUNSET_ORB' | 'FULL_MOON';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'EMBED' | 'STEAM' | 'WATER' | 'SPARK' | 'CONFETTI' | 'RAIN' | 'SNOW' | 'LIGHTNING' | 'POWERUP_AURA';
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
  size: number;
  life: number;
}

export interface InRunChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardPoints: number;
  rewardSparks: number;
  icon: string;
}

export interface GameStats {
  score: number;
  bestScore: number;
  stage: number;
  lives: number;
  activePlayTime: number;
  obstaclesCleared: number;
  sparksCollected?: number;
  totalSparks?: number;
  powerupsLooted?: number;
  maxCombo?: number;
  challengesDone?: number;
  isNewRecord: boolean;
  biomeName: string;
  attackName: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  selectedSkinId: string;
  unlockedSkinIds: string[];
}

