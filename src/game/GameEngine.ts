import {
  FlameSkin,
  GameStats,
  Obstacle,
  Particle,
  FloatingText,
  Biome,
  WeatherEffect,
  ShowerDrop,
  ActiveSuperpower,
  PowerUpItem,
  Fireball,
  SuperpowerType,
  InRunChallenge,
  GeyserObstacle,
} from '../types.ts';
import { getSkinById, drawFlameCharacter } from './skins.ts';
import { BIOMES, WAVE_ATTACKS, getBiomeForStage, getWaveAttackForStage, WaveAttack } from './biomes.ts';
import { sound } from '../utils/audio.ts';
import { triggerVibration, saveBestScore, getBestScore, addSparks } from '../utils/storage.ts';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, isNewRecord: boolean) => void;
  onStageUpdate: (stage: number) => void;
  onTimeUpdate: (activeSeconds: number) => void;
  onLivesUpdate: (lives: number) => void;
  onWaveAttackChange?: (attack: WaveAttack, biome: Biome) => void;
  onGameOver: (stats: GameStats) => void;
  onPauseChange?: (isPaused: boolean) => void;
  onSuperpowerUpdate?: (power: ActiveSuperpower | null) => void;
  onComboUpdate?: (combo: number, multiplier: number, timerRatio: number) => void;
  onChallengeUpdate?: (challenge: InRunChallenge | null) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Animation and timing
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Active play timing
  private activePlayTime: number = 0;
  private stage: number = 1;
  private score: number = 0;
  private bestScore: number = 0;
  private isNewRecord: boolean = false;
  private obstaclesCleared: number = 0;

  // 3 Lives System
  private lives: number = 3;
  private maxLives: number = 3;
  private invulnerableTimer: number = 0; // seconds

  // Biome & Attack Wave
  private currentBiome: Biome;
  private currentAttack: WaveAttack;
  private waveBannerTimer: number = 0;
  private stageBannerTimer: number = 0;
  private stageGraceTimer: number = 0;

  // Combo & Streak Multiplier System
  private combo: number = 0;
  private comboMultiplier: number = 1.0;
  private comboTimer: number = 0;
  private readonly maxComboTimer: number = 3.2;
  private highestComboRun: number = 0;

  // In-Run Challenge System
  private currentChallenge: InRunChallenge | null = null;
  private completedChallengesCount: number = 0;
  private challengePool: InRunChallenge[] = [];
  private airborneClearStreak: number = 0;
  private runVaporizedCount: number = 0;

  // Canvas Dimensions
  private width: number = 480;
  private height: number = 800;
  private dpr: number = 1;

  // Player physics
  private player = {
    x: 80,
    y: 0,
    width: 44,
    height: 52,
    vy: 0,
    isGrounded: true,
    runCycle: 0,
    blinkTimer: 0,
    isBlinking: false,
    squash: 1,
    stretch: 1,
    tilt: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    skin: getSkinById('flamby'),
  };

  // Physics constants
  private gravity: number = 1750;
  private jumpForce: number = -650;
  private groundY: number = 660; // baseline for ground
  private currentSpeed: number = 310; // horizontal speed (px/sec)

  // Input states
  private inputHeld: boolean = false;

  // World obstacles
  private obstacles: Obstacle[] = [];
  private nextObstacleId: number = 1;
  private minSpawnDistance: number = 420;
  private distanceSinceLastSpawn: number = 320;

  // Superpowers & Combat System (10-second looted power-ups)
  private powerUps: PowerUpItem[] = [];
  private fireballs: Fireball[] = [];
  private activeSuperpower: ActiveSuperpower | null = null;
  private nextPowerUpId: number = 1;
  private nextFireballId: number = 1;
  private powerUpSpawnTimer: number = 6.0;
  private autoFireCooldown: number = 0;
  private playerFireCooldown: number = 0;
  private powerupsLooted: number = 0;

  // Visual effects
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private screenShake: number = 0;
  private hitstopTimer: number = 0;
  private lightningTimer: number = 0;
  private isLightningFlash: boolean = false;

  // Death sequence
  private isDying: boolean = false;
  private deathTimer: number = 0;
  private deathDuration: number = 0.65;

  // Parallax background elements
  private clouds: { x: number; y: number; speed: number; scale: number; alpha: number }[] = [];
  private weatherParticles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; wobble: number }[] = [];

  // Dynamic Atmospheric Weather (Fog & Light Wind)
  private windStrength: number = 0.35; // Dynamically fluctuates between 0.15 and 0.85
  private windGustTimer: number = 6.0;
  private isWindGusting: boolean = false;
  private windWisps: {
    x: number;
    y: number;
    length: number;
    speed: number;
    alpha: number;
    thickness: number;
    wobble: number;
  }[] = [];
  private fogTime: number = 0;
  private fogDensity: number = 0.15; // Smoothly breathes with time & stage

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks, initialSkinId: string = 'flamby') {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D context could not be created');
    }
    this.ctx = context;
    this.callbacks = callbacks;
    this.bestScore = getBestScore();
    this.player.skin = getSkinById(initialSkinId);

    this.currentBiome = getBiomeForStage(1);
    this.currentAttack = getWaveAttackForStage(1);

    this.handleResize();
    this.initBackgroundElements();
    this.initChallenges();

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleBlur);
  }

  public setSkin(skinId: string) {
    this.player.skin = getSkinById(skinId);
  }

  public addShake(amount: number) {
    this.screenShake = Math.min(32, this.screenShake + amount);
  }

  private handleResize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    this.width = Math.max(320, Math.floor(rect.width));
    this.height = Math.max(480, Math.floor(rect.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.groundY = Math.floor(this.height * 0.8);
    if (this.player.isGrounded && !this.isDying) {
      this.player.y = this.groundY - this.player.height;
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden && this.isRunning && !this.isPaused && !this.isDying) {
      this.pause();
    }
  };

  private handleBlur = () => {
    this.inputHeld = false;
  };

  private initBackgroundElements() {
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: 40 + Math.random() * (this.height * 0.28),
        speed: 15 + Math.random() * 25,
        scale: 0.6 + Math.random() * 0.7,
        alpha: 0.35 + Math.random() * 0.45,
      });
    }

    this.weatherParticles = [];
    for (let i = 0; i < 24; i++) {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0,
        vy: 20 + Math.random() * 50,
        size: 3 + Math.random() * 6,
        alpha: 0.3 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    this.windWisps = [];
    for (let i = 0; i < 14; i++) {
      this.windWisps.push({
        x: Math.random() * this.width,
        y: 60 + Math.random() * (this.groundY - 80),
        length: 45 + Math.random() * 85,
        speed: 110 + Math.random() * 150,
        alpha: 0.15 + Math.random() * 0.25,
        thickness: 1.2 + Math.random() * 1.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  public start() {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  public pause() {
    if (!this.isRunning || this.isPaused || this.isDying) return;
    this.isPaused = true;
    if (this.callbacks.onPauseChange) {
      this.callbacks.onPauseChange(true);
    }
  }

  public resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    if (this.callbacks.onPauseChange) {
      this.callbacks.onPauseChange(false);
    }
    this.loop(this.lastTimestamp);
  }

  public reset() {
    this.activePlayTime = 0;
    this.stage = 1;
    this.score = 0;
    this.lives = 3;
    this.invulnerableTimer = 0;
    this.isNewRecord = false;
    this.obstaclesCleared = 0;
    this.currentSpeed = 310;
    this.minSpawnDistance = 420;
    this.distanceSinceLastSpawn = 350;

    this.isDying = false;
    this.deathTimer = 0;
    this.hitstopTimer = 0;
    this.screenShake = 0;
    this.lightningTimer = 0;
    this.isLightningFlash = false;
    this.waveBannerTimer = 2.4;

    this.currentBiome = getBiomeForStage(1);
    this.currentAttack = getWaveAttackForStage(1);

    this.player.y = this.groundY - this.player.height;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.coyoteTimer = 0;
    this.player.jumpBufferTimer = 0;
    this.player.squash = 1;
    this.player.stretch = 1;
    this.player.tilt = 0;
    this.inputHeld = false;

    this.obstacles = [];
    this.powerUps = [];
    this.fireballs = [];
    this.activeSuperpower = null;
    this.powerUpSpawnTimer = 6.0;
    this.autoFireCooldown = 0;
    this.playerFireCooldown = 0;
    this.powerupsLooted = 0;
    this.particles = [];
    this.floatingTexts = [];

    this.windStrength = 0.35;
    this.windGustTimer = 6.0;
    this.isWindGusting = false;
    this.fogTime = 0;
    this.fogDensity = 0.15;

    this.stageBannerTimer = 0;
    this.stageGraceTimer = 0;
    this.combo = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.highestComboRun = 0;
    this.airborneClearStreak = 0;
    this.runVaporizedCount = 0;
    this.completedChallengesCount = 0;
    this.initChallenges();

    this.bestScore = getBestScore();
    this.callbacks.onScoreUpdate(0, false);
    this.callbacks.onStageUpdate(1);
    this.callbacks.onTimeUpdate(0);
    this.callbacks.onLivesUpdate(this.lives);
    this.callbacks.onSuperpowerUpdate?.(null);
    this.callbacks.onComboUpdate?.(0, 1.0, 0);
    if (this.callbacks.onWaveAttackChange) {
      this.callbacks.onWaveAttackChange(this.currentAttack, this.currentBiome);
    }
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleBlur);
  }

  // --- CONTROLS ---

  public triggerJumpPress() {
    if (this.isPaused || this.isDying) return;

    if (!this.isRunning) {
      this.start();
      return;
    }

    if (this.inputHeld) return;
    this.inputHeld = true;

    this.player.jumpBufferTimer = 0.14;
    this.attemptJump();
  }

  public triggerJumpRelease() {
    this.inputHeld = false;
  }

  public triggerFireAttack() {
    if (this.isPaused || this.isDying || !this.isRunning) return;
    if (this.playerFireCooldown > 0) return;

    const isBlaster = this.activeSuperpower?.type === 'FIRE_BLASTER';
    this.playerFireCooldown = isBlaster ? 0.12 : 0.24;

    const fbX = this.player.x + this.player.width + 6;
    const fbY = this.player.y + this.player.height * 0.45;
    const color = isBlaster ? '#ef4444' : (this.player.skin.colors.accent || this.player.skin.colors.inner);

    this.fireballs.push({
      id: this.nextFireballId++,
      x: fbX,
      y: fbY,
      vx: isBlaster ? 780 : 660,
      vy: 0,
      radius: isBlaster ? 16 : 11,
      life: 0,
      maxLife: 1.1,
      color,
    });

    sound.playFireBlast();
    triggerVibration(18);

    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: fbX,
        y: fbY,
        vx: -60 - Math.random() * 80,
        vy: (Math.random() - 0.5) * 60,
        size: 3 + Math.random() * 3,
        alpha: 0.9,
        color: this.player.skin.colors.particles[i % this.player.skin.colors.particles.length],
        life: 0,
        maxLife: 0.22,
        type: 'SPARK',
      });
    }

    this.player.squash = 0.88;
    this.player.stretch = 1.12;
  }

  private attemptJump() {
    if (this.player.isGrounded || this.player.coyoteTimer > 0) {
      this.executeJump();
    }
  }

  private executeJump() {
    this.player.vy = this.jumpForce;
    this.player.isGrounded = false;
    this.player.coyoteTimer = 0;
    this.player.jumpBufferTimer = 0;

    this.player.stretch = 1.35;
    this.player.squash = 0.75;
    this.player.tilt = 0.12;

    sound.playJump();
    triggerVibration(25);

    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.player.x + this.player.width / 2 + (Math.random() * 16 - 8),
        y: this.groundY,
        vx: -(this.currentSpeed * 0.3) + (Math.random() * 60 - 30),
        vy: -(20 + Math.random() * 40),
        size: 3 + Math.random() * 4,
        alpha: 0.9,
        color: this.player.skin.colors.particles[i % this.player.skin.colors.particles.length],
        life: 0,
        maxLife: 0.25 + Math.random() * 0.15,
        type: 'SPARK',
      });
    }
  }

  // --- MAIN LOOP ---

  private loop = (timestamp: number) => {
    if (!this.isRunning || this.isPaused) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // --- UPDATE ---

  private update(dt: number) {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 28);
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }

    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer -= dt;
    }
    if (this.stageBannerTimer > 0) {
      this.stageBannerTimer -= dt;
    }
    if (this.stageGraceTimer > 0) {
      this.stageGraceTimer -= dt;
    }

    // Dynamic combo countdown
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboMultiplier = 1.0;
        this.callbacks.onComboUpdate?.(0, 1.0, 0);
      } else {
        this.callbacks.onComboUpdate?.(this.combo, this.comboMultiplier, this.comboTimer / this.maxComboTimer);
      }
    }

    if (this.isDying) {
      this.deathTimer += dt;
      this.updateParticles(dt);
      this.updateFloatingTexts(dt);

      if (this.deathTimer >= this.deathDuration) {
        this.stop();
        this.callbacks.onGameOver({
          score: this.score,
          bestScore: this.bestScore,
          stage: this.stage,
          lives: this.lives,
          activePlayTime: Math.floor(this.activePlayTime),
          obstaclesCleared: this.obstaclesCleared,
          powerupsLooted: this.powerupsLooted,
          sparksCollected: this.powerupsLooted * 3,
          totalSparks: this.powerupsLooted * 3,
          maxCombo: this.highestComboRun,
          challengesDone: this.completedChallengesCount,
          isNewRecord: this.isNewRecord,
          biomeName: this.currentBiome.name,
          attackName: this.currentAttack.name,
        });
      }
      return;
    }

    // --- Active 10-Second Difficulty Progression ---
    this.activePlayTime += dt;
    this.callbacks.onTimeUpdate(Math.floor(this.activePlayTime));

    const calculatedStage = Math.min(12, 1 + Math.floor(this.activePlayTime / 10));
    if (calculatedStage !== this.stage) {
      this.stage = calculatedStage;
      this.currentBiome = getBiomeForStage(this.stage);
      this.currentAttack = getWaveAttackForStage(this.stage);

      this.stageBannerTimer = 3.2; // 3.2s cinematic transition banner
      this.stageGraceTimer = 1.2; // 1.2s grace shield
      sound.playStageTransitionFanfare();
      sound.triggerHaptic('stage');
      this.addShake(10); // Subtle cinematic rumble on stage progression

      // Festive biome celebration sparks
      for (let c = 0; c < 18; c++) {
        this.particles.push({
          x: this.width * Math.random(),
          y: Math.random() * (this.height * 0.45),
          vx: (Math.random() - 0.5) * 160,
          vy: 40 + Math.random() * 110,
          size: 4 + Math.random() * 4,
          alpha: 1,
          color: this.currentBiome.sunColor,
          life: 0,
          maxLife: 1.1,
          type: 'CONFETTI',
        });
      }

      this.callbacks.onStageUpdate(this.stage);
      if (this.callbacks.onWaveAttackChange) {
        this.callbacks.onWaveAttackChange(this.currentAttack, this.currentBiome);
      }

      // Check challenge for stage progression
      if (this.currentChallenge?.id === 'stage_3' && this.stage >= this.currentChallenge.target) {
        this.completeChallenge();
      }

      // Speed scale: gentle ramp capped at 520 px/s
      this.currentSpeed = Math.min(520, 310 + (this.stage - 1) * 32);
      this.minSpawnDistance = Math.max(380, 420 + (this.stage - 1) * 16);
    }

    if (this.player.coyoteTimer > 0) {
      this.player.coyoteTimer -= dt;
    }
    if (this.player.jumpBufferTimer > 0) {
      this.player.jumpBufferTimer -= dt;
      this.attemptJump();
    }

    if (this.playerFireCooldown > 0) {
      this.playerFireCooldown -= dt;
    }

    this.updatePlayerPhysics(dt);
    this.updateObstacles(dt);
    this.updateSuperpowers(dt);
    this.updateFireballs(dt);
    this.spawnObstacles(dt);
    this.checkCollisions();
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateWeatherAndBackground(dt);
  }

  private updatePlayerPhysics(dt: number) {
    const p = this.player;

    p.vy += this.gravity * dt;
    p.y += p.vy * dt;

    if (p.isGrounded) {
      p.runCycle += dt * (this.currentSpeed * 0.035);
    } else {
      const targetTilt = p.vy < 0 ? -0.1 : 0.15;
      p.tilt += (targetTilt - p.tilt) * dt * 10;
    }

    p.blinkTimer += dt;
    if (p.blinkTimer > 3.5) {
      p.isBlinking = true;
      if (p.blinkTimer > 3.65) {
        p.isBlinking = false;
        p.blinkTimer = Math.random() * 1.5;
      }
    }

    const charBase = this.groundY - p.height;
    const isOverGap = this.obstacles.some(
      (obs) => obs.type === 'GAP' && p.x + p.width * 0.7 > obs.x && p.x + p.width * 0.3 < obs.x + obs.width
    );

    if (!isOverGap) {
      if (p.y >= charBase) {
        if (!p.isGrounded && p.vy > 0) {
          p.squash = 1.35;
          p.stretch = 0.75;
          p.tilt = 0;
          sound.playLand();
          sound.triggerHaptic('tap');
          this.airborneClearStreak = 0;
          if (p.vy > 650) {
            this.addShake(5);
          }
        }
        p.y = charBase;
        p.vy = 0;
        p.isGrounded = true;
        p.coyoteTimer = 0.09;
      }
    } else {
      p.isGrounded = false;
      if (p.y > this.height - 40) {
        if (this.lives > 1) {
          this.lives -= 1;
          this.callbacks.onLivesUpdate(this.lives);
          this.invulnerableTimer = 1.6;
          this.addShake(22);
          sound.playDamageHurt();
          sound.playRecover();
          triggerVibration([80, 50, 100]);

          this.addFloatingText('-1 CHANCE!', p.x + 20, this.groundY - 60, '#f43f5e', 22);

          p.y = this.groundY - p.height - 20;
          p.vy = -620;
          p.isGrounded = false;

          for (let i = 0; i < 18; i++) {
            this.particles.push({
              x: p.x + p.width / 2,
              y: this.height - 20,
              vx: (Math.random() - 0.5) * 140,
              vy: -(120 + Math.random() * 200),
              size: 6 + Math.random() * 8,
              alpha: 0.9,
              color: '#ffffff',
              life: 0,
              maxLife: 0.5,
              type: 'STEAM',
            });
          }
        } else {
          this.lives = 0;
          this.callbacks.onLivesUpdate(0);
          this.triggerDeath('FELL INTO WATER CHASM');
          return;
        }
      }
    }

    p.squash += (1 - p.squash) * dt * 12;
    p.stretch += (1 - p.stretch) * dt * 12;

    if (Math.random() < 0.45) {
      const windPush = this.windStrength * (this.isWindGusting ? 120 : 50);
      this.particles.push({
        x: p.x + 8 + Math.random() * 8,
        y: p.y + p.height * 0.4 + Math.random() * (p.height * 0.5),
        vx: -(this.currentSpeed * 0.4) - windPush - Math.random() * 40,
        vy: -(15 + Math.random() * 35),
        size: 2.5 + Math.random() * 3.5,
        alpha: 0.8,
        color: p.skin.colors.particles[Math.floor(Math.random() * p.skin.colors.particles.length)],
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        type: 'EMBED',
      });
    }
  }

  // --- MULTI-ATTACK GENERATOR ---

  private spawnObstacles(dt: number) {
    const moveDist = this.currentSpeed * dt;
    this.distanceSinceLastSpawn += moveDist;

    if (this.distanceSinceLastSpawn < this.minSpawnDistance) {
      return;
    }

    const spawnX = this.width + 60;
    const stage = this.stage;

    // Pick attack according to Stage-Wise Attack System
    // Stage 1: Easy puddles only
    // Stage 2: Faster puddles + occasional falling drops
    // Stage 3: Water waves + flying bubbles
    // Stage 4: Side splashes + varied falling attacks
    // Stage 5: Controlled combination attacks
    // Stage 6+: Water showers, moving barriers, and advanced combinations

    const roll = Math.random();

    if (stage === 1) {
      this.spawnPuddle(spawnX, 50 + Math.random() * 25);
    } else if (stage === 2) {
      if (roll < 0.18) {
        this.spawnGeyser(spawnX);
      } else if (roll < 0.75) {
        this.spawnPuddle(spawnX, 60 + Math.random() * 25);
      } else {
        this.spawnDroplet(spawnX + 30);
      }
    } else if (stage === 3) {
      if (roll < 0.18) {
        this.spawnGeyser(spawnX);
      } else if (roll < 0.52) {
        this.spawnWaterWave(spawnX);
      } else if (roll < 0.8) {
        this.spawnDroplet(spawnX + 40);
      } else {
        this.spawnFlyingBubble(spawnX, Math.random() < 0.5 ? 'LOW' : 'HIGH');
      }
    } else if (stage === 4) {
      if (roll < 0.16) {
        this.spawnGeyser(spawnX);
      } else if (roll < 0.44) {
        this.spawnSideSplash(spawnX);
      } else if (roll < 0.72) {
        this.spawnWaterWave(spawnX);
      } else if (roll < 0.88) {
        this.spawnFlyingBubble(spawnX, 'LOW');
      } else {
        this.spawnDroplet(spawnX + 40);
      }
    } else if (stage === 5) {
      if (roll < 0.15) {
        this.spawnGeyser(spawnX);
      } else if (roll < 0.5) {
        this.spawnPuddle(spawnX, 55);
        this.spawnDroplet(spawnX + 170);
      } else if (roll < 0.8) {
        this.spawnWaterWave(spawnX);
        this.spawnFlyingBubble(spawnX + 40, 'HIGH');
      } else {
        this.spawnSideSplash(spawnX);
      }
    } else {
      if (roll < 0.15) {
        this.spawnGeyser(spawnX);
      } else if (roll < 0.38) {
        this.spawnWaterShower(spawnX);
      } else if (roll < 0.58) {
        this.spawnMovingBarrier(spawnX);
      } else if (roll < 0.8) {
        this.spawnPuddle(spawnX, 50);
        this.spawnDroplet(spawnX + 180);
      } else {
        this.spawnSideSplash(spawnX);
        this.spawnFlyingBubble(spawnX + 120, 'HIGH');
      }
    }

    const extraRnd = Math.random() * 150;
    this.distanceSinceLastSpawn = -extraRnd;
  }

  // --- ATTACK SPAWNERS ---

  private spawnPuddle(x: number, width: number) {
    this.obstacles.push({
      id: this.nextObstacleId++,
      type: 'PUDDLE',
      x,
      y: this.groundY - 8,
      width,
      height: 18,
      hasScored: false,
      depth: 12,
      rippleOffset: Math.random() * 10,
    });
  }

  private spawnDroplet(targetGroundX: number) {
    sound.playWarningChirp();
    this.obstacles.push({
      id: this.nextObstacleId++,
      type: 'DROPLET',
      x: targetGroundX,
      y: -35,
      width: 18,
      height: 24,
      hasScored: false,
      vy: 420,
      targetGroundX,
      fallDelay: 0.75, // 750ms visible ground warning circle
      hasLanded: false,
      splashAnim: 0,
    });
  }

  private spawnWaterWave(x: number) {
    sound.playWaterWhoosh();
    this.obstacles.push({
      id: this.nextObstacleId++,
      type: 'WATER_WAVE',
      x,
      y: this.groundY - 36,
      width: 52,
      height: 38,
      hasScored: false,
      speedBonus: 25,
      wavePhase: 0,
      waveHeight: 38,
    });
  }

  private spawnSideSplash(x: number) {
    this.obstacles.push({
      id: this.nextObstacleId++,
      type: 'SIDE_SPLASH',
      x,
      y: this.groundY - 20,
      width: 32,
      height: 32,
      hasScored: false,
      vx: -(this.currentSpeed * 0.95),
      vy: -520,
      gravity: 1050,
      radius: 14,
      warningTimer: 0.55, // 550ms bubbling telegraph
      isLaunched: false,
    });
  }

  private spawnFlyingBubble(x: number, altitude: 'LOW' | 'HIGH') {
    const baseY = altitude === 'LOW' ? this.groundY - 45 : this.groundY - 110;
    this.obstacles.push({
      id: this.nextObstacleId++,
      type: 'FLYING_BUBBLE',
      x,
      y: baseY,
      width: 34,
      height: 34,
      hasScored: false,
      altitude,
      radius: 17,
      floatOffset: Math.random() * Math.PI * 2,
      baseY,
    });
  }

  private spawnMovingBarrier(x: number) {
    this.obstacles.push({
      id: this.nextObstacleId++,
      type: 'MOVING_BARRIER',
      x,
      y: this.groundY - 60,
      width: 30,
      height: 60,
      hasScored: false,
      minY: this.groundY - 100,
      maxY: this.groundY - 35,
      speed: 75,
      direction: 1,
    });
  }

  private spawnWaterShower(x: number) {
    sound.playWarningChirp();
    const drops: ShowerDrop[] = [
      { xOffset: 0, y: -30, vy: 410, fallDelay: 0.65, hasLanded: false, splashAnim: 0 },
      { xOffset: 85, y: -45, vy: 430, fallDelay: 0.95, hasLanded: false, splashAnim: 0 },
      { xOffset: 170, y: -60, vy: 450, fallDelay: 1.25, hasLanded: false, splashAnim: 0 },
    ];

    this.obstacles.push({
      id: this.nextObstacleId++,
      type: 'WATER_SHOWER',
      x,
      y: this.groundY - 10,
      width: 200,
      height: 30,
      hasScored: false,
      drops,
    });
  }

  private spawnGeyser(x: number) {
    this.obstacles.push({
      id: this.nextObstacleId++,
      type: 'GEYSER',
      x,
      y: this.groundY - 12,
      width: 48,
      height: 120,
      hasScored: false,
      state: 'TELEGRAPH',
      timer: 0.9, // 900ms telegraph warning
      maxHeight: 130,
    });
  }

  // --- COMBO & STREAK MULTIPLIER HELPER ---

  private registerComboHit(bonusLabel?: string) {
    this.combo += 1;
    this.comboTimer = this.maxComboTimer;
    this.highestComboRun = Math.max(this.highestComboRun, this.combo);

    if (this.combo >= 15) {
      this.comboMultiplier = 3.0;
    } else if (this.combo >= 10) {
      this.comboMultiplier = 2.5;
    } else if (this.combo >= 6) {
      this.comboMultiplier = 2.0;
    } else if (this.combo >= 3) {
      this.comboMultiplier = 1.5;
    } else {
      this.comboMultiplier = 1.0;
    }

    if (this.combo >= 2) {
      sound.playComboHit(this.combo);
      sound.triggerHaptic('combo');
    }

    // Dynamic celebratory callouts
    if (this.combo === 3) {
      this.addFloatingText('COMBO 3x! 🔥', this.player.x + 10, this.player.y - 30, '#fde047', 20);
    } else if (this.combo === 6) {
      this.addFloatingText('INFERNO 6x! ⚡', this.player.x + 10, this.player.y - 30, '#fb923c', 22);
      this.addShake(4);
    } else if (this.combo === 10) {
      this.addFloatingText('SUPERNOVA 10x! 💥', this.player.x + 10, this.player.y - 35, '#ec4899', 24);
      this.addShake(8);
    } else if (this.combo === 15) {
      this.addFloatingText('GODLIKE 15x! 👑', this.player.x + 10, this.player.y - 40, '#facc15', 26);
      this.addShake(12);
    }

    // Challenge check
    if (this.currentChallenge?.id === 'combo_5' && this.combo >= 5) {
      this.completeChallenge();
    } else if (this.currentChallenge?.id === 'combo_10' && this.combo >= 10) {
      this.completeChallenge();
    }

    this.callbacks.onComboUpdate?.(this.combo, this.comboMultiplier, 1.0);
  }

  // --- IN-RUN CHALLENGE MINI-QUEST SYSTEM ---

  private initChallenges() {
    this.challengePool = [
      {
        id: 'airborne_3',
        title: 'AIR TIME',
        description: 'Clear 3 obstacles in mid-air',
        target: 3,
        progress: 0,
        completed: false,
        rewardPoints: 150,
        rewardSparks: 5,
        icon: '🪶',
      },
      {
        id: 'combo_5',
        title: 'INFERNO STREAK',
        description: 'Reach a 5x Combo streak',
        target: 5,
        progress: 0,
        completed: false,
        rewardPoints: 200,
        rewardSparks: 8,
        icon: '🔥',
      },
      {
        id: 'vaporize_3',
        title: 'WATER BREAKER',
        description: 'Blast 3 obstacles with Fire Blast/Dash',
        target: 3,
        progress: 0,
        completed: false,
        rewardPoints: 250,
        rewardSparks: 10,
        icon: '💥',
      },
      {
        id: 'stage_3',
        title: 'STAGE SURVIVOR',
        description: 'Reach Stage 3',
        target: 3,
        progress: 0,
        completed: false,
        rewardPoints: 350,
        rewardSparks: 15,
        icon: '⭐',
      },
      {
        id: 'combo_10',
        title: 'SUPERNOVA',
        description: 'Reach an epic 10x Combo',
        target: 10,
        progress: 0,
        completed: false,
        rewardPoints: 500,
        rewardSparks: 20,
        icon: '👑',
      },
    ];

    this.currentChallenge = this.challengePool.length > 0 ? { ...this.challengePool[0] } : null;
    this.callbacks.onChallengeUpdate?.(this.currentChallenge);
  }

  private advanceChallenge() {
    this.completedChallengesCount++;
    const nextIdx = this.completedChallengesCount % this.challengePool.length;
    this.currentChallenge = { ...this.challengePool[nextIdx] };
    this.callbacks.onChallengeUpdate?.(this.currentChallenge);
  }

  private completeChallenge() {
    if (!this.currentChallenge || this.currentChallenge.completed) return;
    this.currentChallenge.completed = true;
    const c = this.currentChallenge;
    this.score += c.rewardPoints;
    addSparks(c.rewardSparks);
    sound.playAchievementUnlock();
    sound.triggerHaptic('powerup');
    this.addFloatingText(`CHALLENGE: ${c.title}! +${c.rewardPoints}`, this.player.x + 20, this.player.y - 35, '#facc15', 22);

    // Confetti celebration
    for (let i = 0; i < 22; i++) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 60,
        y: this.player.y - 20,
        vx: (Math.random() - 0.5) * 160,
        vy: -(60 + Math.random() * 120),
        size: 4 + Math.random() * 4,
        alpha: 1,
        color: ['#facc15', '#fb923c', '#38bdf8', '#ffffff', '#ec4899'][i % 5],
        life: 0,
        maxLife: 0.9,
        type: 'CONFETTI',
      });
    }

    this.callbacks.onScoreUpdate(this.score, this.isNewRecord);
    this.callbacks.onChallengeUpdate?.(this.currentChallenge);

    setTimeout(() => {
      this.advanceChallenge();
    }, 1200);
  }

  // --- UPDATE OBSTACLES ---

  private updateObstacles(dt: number) {
    const baseMoveDist = this.currentSpeed * dt;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      if (obs.type === 'PUDDLE') {
        obs.x -= baseMoveDist;
        obs.rippleOffset += dt * 3.5;
      } else if (obs.type === 'WATER_WAVE') {
        // Wave surges slightly faster than ground speed
        obs.x -= (this.currentSpeed + obs.speedBonus) * dt;
        obs.wavePhase += dt * 8;
      } else if (obs.type === 'DROPLET') {
        obs.x -= baseMoveDist;
        if (obs.fallDelay > 0) {
          obs.fallDelay -= dt;
        } else if (!obs.hasLanded) {
          obs.y += obs.vy * dt;
          if (obs.y >= this.groundY - 14) {
            obs.y = this.groundY - 14;
            obs.hasLanded = true;
            obs.splashAnim = 0.35;
          }
        } else if (obs.splashAnim > 0) {
          obs.splashAnim -= dt;
        }
      } else if (obs.type === 'SIDE_SPLASH') {
        if (obs.warningTimer > 0) {
          obs.warningTimer -= dt;
          obs.x -= baseMoveDist;
          if (obs.warningTimer <= 0) {
            obs.isLaunched = true;
            sound.playWaterWhoosh();
          }
        } else {
          obs.x += obs.vx * dt;
          obs.vy += obs.gravity * dt;
          obs.y += obs.vy * dt;
        }
      } else if (obs.type === 'FLYING_BUBBLE') {
        obs.x -= (this.currentSpeed * 0.92) * dt;
        obs.floatOffset += dt * 3;
        obs.y = obs.baseY + Math.sin(obs.floatOffset) * 8;
      } else if (obs.type === 'MOVING_BARRIER') {
        obs.x -= baseMoveDist;
        obs.y += obs.direction * obs.speed * dt;
        if (obs.y <= obs.minY) {
          obs.y = obs.minY;
          obs.direction = 1;
        } else if (obs.y >= obs.maxY) {
          obs.y = obs.maxY;
          obs.direction = -1;
        }
      } else if (obs.type === 'WATER_SHOWER') {
        obs.x -= baseMoveDist;
        for (const drop of obs.drops) {
          if (drop.fallDelay > 0) {
            drop.fallDelay -= dt;
          } else if (!drop.hasLanded) {
            drop.y += drop.vy * dt;
            if (drop.y >= this.groundY - 14) {
              drop.y = this.groundY - 14;
              drop.hasLanded = true;
              drop.splashAnim = 0.35;
            }
          } else if (drop.splashAnim > 0) {
            drop.splashAnim -= dt;
          }
        }
      } else if (obs.type === 'GEYSER') {
        obs.x -= baseMoveDist;
        obs.timer -= dt;

        if (obs.state === 'TELEGRAPH') {
          if (Math.random() < 0.25) {
            this.particles.push({
              x: obs.x + obs.width * 0.5 + (Math.random() - 0.5) * 16,
              y: this.groundY - 6,
              vx: (Math.random() - 0.5) * 20,
              vy: -(25 + Math.random() * 45),
              size: 3 + Math.random() * 3,
              alpha: 0.65,
              color: '#e0f2fe',
              life: 0,
              maxLife: 0.35,
              type: 'STEAM',
            });
          }
          if (obs.timer <= 0) {
            obs.state = 'ERUPTING';
            obs.timer = 1.35;
            sound.playSteamBounce();
            this.addShake(4);
          }
        } else if (obs.state === 'ERUPTING') {
          if (Math.random() < 0.45) {
            this.particles.push({
              x: obs.x + obs.width * 0.5 + (Math.random() - 0.5) * 20,
              y: this.groundY - Math.random() * obs.maxHeight,
              vx: (Math.random() - 0.5) * 30,
              vy: -(120 + Math.random() * 140),
              size: 4 + Math.random() * 6,
              alpha: 0.85,
              color: ['#ffffff', '#bae6fd', '#38bdf8', '#e0f2fe'][Math.floor(Math.random() * 4)],
              life: 0,
              maxLife: 0.38,
              type: 'STEAM',
            });
          }

          // Check if Flame enters the thermal steam updraft to soar!
          const px = this.player.x + this.player.width * 0.5;
          const py = this.player.y + this.player.height;
          if (
            px >= obs.x - 14 &&
            px <= obs.x + obs.width + 14 &&
            py >= this.groundY - obs.maxHeight - 20 &&
            py <= this.groundY + 12
          ) {
            this.player.vy = -760;
            this.player.isGrounded = false;
            this.player.stretch = 1.35;
            this.player.squash = 0.75;
            sound.playSteamBounce();
            sound.triggerHaptic('tap');
            this.registerComboHit('STEAM LAUNCH! 🚀');

            const bonus = Math.floor(2 * this.comboMultiplier);
            this.score += bonus;
            this.callbacks.onScoreUpdate(this.score, this.isNewRecord);
            this.addFloatingText(`STEAM LAUNCH! 🚀 +${bonus}`, obs.x + obs.width * 0.5, this.groundY - obs.maxHeight - 15, '#38bdf8', 20);

            for (let s = 0; s < 12; s++) {
              this.particles.push({
                x: px,
                y: py,
                vx: (Math.random() - 0.5) * 120,
                vy: -(70 + Math.random() * 120),
                size: 4 + Math.random() * 7,
                alpha: 0.9,
                color: '#ffffff',
                life: 0,
                maxLife: 0.38,
                type: 'STEAM',
              });
            }
          }

          if (obs.timer <= 0) {
            obs.state = 'RETRACTING';
            obs.timer = 0.45;
          }
        } else if (obs.state === 'RETRACTING') {
          if (obs.timer <= 0) {
            obs.state = 'DORMANT';
          }
        }
      }

      // Check scoring
      if (!obs.hasScored && obs.x + obs.width < this.player.x) {
        obs.hasScored = true;
        this.obstaclesCleared += 1;

        // Check if player is airborne for challenge
        if (!this.player.isGrounded) {
          this.airborneClearStreak++;
          if (this.currentChallenge?.id === 'airborne_3' && this.airborneClearStreak >= 3) {
            this.completeChallenge();
          }
        }

        this.registerComboHit();

        const points = Math.max(1, Math.floor(1 * this.comboMultiplier));
        this.score += points;

        sound.playScore();

        const isRecord = saveBestScore(this.score);
        if (isRecord && !this.isNewRecord && this.score > 1) {
          this.isNewRecord = true;
          this.bestScore = this.score;
          sound.playNewRecord();
          this.addShake(10);
          this.addFloatingText('NEW BEST!', this.player.x + 30, this.player.y - 30, '#ec4899', 22);
        } else if (this.comboMultiplier > 1) {
          this.addFloatingText(`+${points} (x${this.comboMultiplier.toFixed(1)})`, this.player.x + 20, this.player.y - 15, '#facc15', 18);
        } else {
          this.addFloatingText('+1', this.player.x + 20, this.player.y - 15, '#38bdf8', 18);
        }

        this.callbacks.onScoreUpdate(this.score, this.isNewRecord);
      }

      // Cleanup offscreen
      if (obs.x + obs.width < -140 || obs.y > this.height + 60) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  // --- SUPERPOWERS & LOOT SYSTEM (10-SECOND POWER-UPS) ---

  private updateSuperpowers(dt: number) {
    // 1. Active 10-Second Superpower Countdown
    if (this.activeSuperpower) {
      this.activeSuperpower.timeRemaining -= dt;

      // Type-specific active mechanics
      if (this.activeSuperpower.type === 'FIRE_BLASTER') {
        this.autoFireCooldown -= dt;
        if (this.autoFireCooldown <= 0) {
          this.autoFireCooldown = 0.32; // auto burst
          this.triggerFireAttack();
        }
      } else if (this.activeSuperpower.type === 'INFERNO_DASH') {
        // Fast fiery trailing sparks
        if (Math.random() < 0.6) {
          this.particles.push({
            x: this.player.x - 5,
            y: this.player.y + this.player.height * 0.4 + (Math.random() * 20 - 10),
            vx: -200 - Math.random() * 100,
            vy: (Math.random() - 0.5) * 40,
            size: 4 + Math.random() * 5,
            alpha: 0.9,
            color: '#facc15',
            life: 0,
            maxLife: 0.28,
            type: 'SPARK',
          });
        }
      }

      // Check for exact 10-second expiration
      if (this.activeSuperpower.timeRemaining <= 0) {
        // SPECIFIC SOUND EFFECT FOR POWER-UP EXPIRATION
        sound.playPowerupExpire();
        this.addFloatingText('POWER EXPIRED', this.player.x + 10, this.player.y - 25, '#94a3b8', 18);
        this.activeSuperpower = null;
        this.callbacks.onSuperpowerUpdate?.(null);
      } else {
        this.callbacks.onSuperpowerUpdate?.(this.activeSuperpower);
      }
    }

    // 2. Power-up Spawn Timer (Spawns floating lootable orbs every 13-17s)
    this.powerUpSpawnTimer -= dt;
    if (this.powerUpSpawnTimer <= 0) {
      this.powerUpSpawnTimer = 13 + Math.random() * 4;
      this.spawnPowerUp();
    }

    // 3. Update & Loot Power-Ups
    const p = this.player;
    const px = p.x + p.width * 0.5;
    const py = p.y + p.height * 0.5;
    const pr = 22;

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.x -= this.currentSpeed * dt;
      pu.pulseTimer += dt * 3.5;

      const bobY = pu.y + Math.sin(pu.pulseTimer) * 7;

      // Subtle sparkle trail
      if (Math.random() < 0.25) {
        this.particles.push({
          x: pu.x + (Math.random() * 16 - 8),
          y: bobY + (Math.random() * 16 - 8),
          vx: -(this.currentSpeed * 0.35),
          vy: (Math.random() - 0.5) * 20,
          size: 2.5 + Math.random() * 3,
          alpha: 0.8,
          color: pu.type === 'FIRE_BLASTER' ? '#f97316' : pu.type === 'STEAM_SHIELD' ? '#38bdf8' : pu.type === 'INFERNO_DASH' ? '#eab308' : '#ec4899',
          life: 0,
          maxLife: 0.25,
          type: 'SPARK',
        });
      }

      // Loot collision with player
      const dx = px - pu.x;
      const dy = py - bobY;
      if (dx * dx + dy * dy < (pr + pu.size) * (pr + pu.size)) {
        pu.collected = true;
        this.powerupsLooted++;

        // SPECIFIC SOUND EFFECT FOR COLLECTING POWER-UP
        sound.playPowerupCollect();
        triggerVibration([50, 40, 90]);
        this.addShake(12);

        const defs: Record<SuperpowerType, { name: string; color: string; icon: string; description: string }> = {
          FIRE_BLASTER: { name: 'FIRE BLASTER', color: '#f97316', icon: '🔥', description: 'Blasts fireballs to vaporize water hazards!' },
          STEAM_SHIELD: { name: 'STEAM SHIELD', color: '#38bdf8', icon: '🛡️', description: 'Invincible forcefield evaporates obstacles!' },
          INFERNO_DASH: { name: 'INFERNO DASH', color: '#eab308', icon: '⚡', description: 'Supersonic dash destroys all obstacles!' },
          EMBER_MAGNET: { name: 'EMBER MAGNET', color: '#ec4899', icon: '🧲', description: 'Attracts power & double multiplier!' },
        };

        const def = defs[pu.type];
        this.activeSuperpower = {
          type: pu.type,
          name: def.name,
          duration: 10.0, // EXACTLY 10 SECONDS
          timeRemaining: 10.0,
          color: def.color,
          icon: def.icon,
          description: def.description,
        };

        this.callbacks.onSuperpowerUpdate?.(this.activeSuperpower);
        this.addFloatingText(`${def.icon} ${def.name}! (10s)`, p.x + 20, p.y - 35, def.color, 22);

        // Burst of celebratory stars and sparks
        for (let s = 0; s < 18; s++) {
          const angle = (s / 18) * Math.PI * 2;
          const speed = 70 + Math.random() * 90;
          this.particles.push({
            x: pu.x,
            y: bobY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 4 + Math.random() * 4,
            alpha: 1,
            color: def.color,
            life: 0,
            maxLife: 0.45,
            type: 'SPARK',
          });
        }

        this.powerUps.splice(i, 1);
        continue;
      }

      if (pu.x < -60) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  private spawnPowerUp() {
    const types: SuperpowerType[] = ['FIRE_BLASTER', 'STEAM_SHIELD', 'INFERNO_DASH', 'EMBER_MAGNET'];
    const type = types[Math.floor(Math.random() * types.length)];
    const spawnX = this.width + 50;
    const spawnY = this.groundY - 55 - Math.random() * 55;

    this.powerUps.push({
      id: this.nextPowerUpId++,
      type,
      x: spawnX,
      y: spawnY,
      size: 22,
      collected: false,
      pulseTimer: Math.random() * 6,
    });
  }

  // --- FIREBALL PROJECTILES & VAPORIZATION ---

  private updateFireballs(dt: number) {
    for (let f = this.fireballs.length - 1; f >= 0; f--) {
      const fb = this.fireballs[f];
      fb.x += fb.vx * dt;
      fb.life += dt;

      // Trailing sparks
      if (Math.random() < 0.6) {
        this.particles.push({
          x: fb.x - fb.radius * 0.8,
          y: fb.y + (Math.random() * 8 - 4),
          vx: -120 - Math.random() * 80,
          vy: (Math.random() - 0.5) * 40,
          size: 3 + Math.random() * 3,
          alpha: 0.85,
          color: fb.color,
          life: 0,
          maxLife: 0.22,
          type: 'SPARK',
        });
      }

      // Check collision with water obstacles to vaporize them!
      let hit = false;
      for (let o = this.obstacles.length - 1; o >= 0; o--) {
        const obs = this.obstacles[o];

        const obsLeft = obs.x;
        const obsRight = obs.x + obs.width;
        const obsTop = obs.y;
        const obsBottom = obs.y + obs.height;

        if (
          fb.x + fb.radius >= obsLeft &&
          fb.x - fb.radius <= obsRight &&
          fb.y + fb.radius >= obsTop - 12 &&
          fb.y - fb.radius <= obsBottom + 12
        ) {
          // Vaporize obstacle!
          hit = true;
          sound.playVaporize();
          this.addShake(8);
          sound.triggerHaptic('collect');

          this.runVaporizedCount++;
          if (this.currentChallenge?.id === 'vaporize_3' && this.runVaporizedCount >= 3) {
            this.completeChallenge();
          }

          this.registerComboHit('VAPORIZED! 💨');
          const bonus = Math.floor(2 * this.comboMultiplier);
          this.score += bonus;
          this.obstaclesCleared++;
          this.callbacks.onScoreUpdate(this.score, this.isNewRecord);
          this.addFloatingText(`+${bonus} VAPORIZED! 💨`, obs.x + obs.width * 0.5, obs.y - 15, '#38bdf8', 20);

          // Steam cloud explosion
          for (let s = 0; s < 16; s++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 40 + Math.random() * 90;
            this.particles.push({
              x: fb.x,
              y: fb.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd - 30,
              size: 5 + Math.random() * 8,
              alpha: 0.9,
              color: ['#ffffff', '#bae6fd', '#38bdf8', '#fed7aa'][s % 4],
              life: 0,
              maxLife: 0.45,
              type: 'STEAM',
            });
          }

          this.obstacles.splice(o, 1);
          break;
        }
      }

      if (hit || fb.life >= fb.maxLife || fb.x > this.width + 60) {
        this.fireballs.splice(f, 1);
      }
    }
  }

  // --- COLLISION DETECTION ---

  private checkCollisions() {
    if (this.isDying || this.invulnerableTimer > 0 || this.stageGraceTimer > 0) return;

    const px = this.player.x + this.player.width * 0.5;
    const py = this.player.y + this.player.height * 0.55;
    const pr = 17; // player hit circle radius

    for (const obs of this.obstacles) {
      if (obs.type === 'PUDDLE') {
        const puddleLeft = obs.x + 6;
        const puddleRight = obs.x + obs.width - 6;
        const puddleY = this.groundY - 8;

        if (this.player.y + this.player.height >= puddleY + 2) {
          if (px + pr > puddleLeft && px - pr < puddleRight) {
            this.handleTakeDamage('WATER PUDDLE!');
            return;
          }
        }
      } else if (obs.type === 'WATER_WAVE') {
        // Wave hitbox (curling crest)
        const waveLeft = obs.x + 4;
        const waveRight = obs.x + obs.width - 4;
        const waveTop = obs.y + 4;
        const waveBottom = this.groundY;

        const closestX = Math.max(waveLeft, Math.min(px, waveRight));
        const closestY = Math.max(waveTop, Math.min(py, waveBottom));
        const dx = px - closestX;
        const dy = py - closestY;

        if (dx * dx + dy * dy < pr * pr) {
          this.handleTakeDamage('TIDAL WAVE!');
          return;
        }
      } else if (obs.type === 'DROPLET') {
        if (!obs.hasLanded && obs.fallDelay <= 0) {
          const dropX = obs.x + obs.width * 0.5;
          const dropY = obs.y + obs.height * 0.5;
          const dropR = 8;
          const dx = px - dropX;
          const dy = py - dropY;
          if (dx * dx + dy * dy < (pr + dropR) * (pr + dropR)) {
            this.handleTakeDamage('WATER DROPLET!');
            return;
          }
        }
      } else if (obs.type === 'SIDE_SPLASH') {
        if (obs.isLaunched) {
          const splashX = obs.x + obs.radius;
          const splashY = obs.y + obs.radius;
          const dx = px - splashX;
          const dy = py - splashY;
          if (dx * dx + dy * dy < (pr + obs.radius) * (pr + obs.radius)) {
            this.handleTakeDamage('SIDE SPLASH!');
            return;
          }
        }
      } else if (obs.type === 'FLYING_BUBBLE') {
        const bubbleX = obs.x + obs.radius;
        const bubbleY = obs.y + obs.radius;
        const dx = px - bubbleX;
        const dy = py - bubbleY;
        if (dx * dx + dy * dy < (pr + obs.radius) * (pr + obs.radius)) {
          this.handleTakeDamage('FLYING BUBBLE!');
          return;
        }
      } else if (obs.type === 'MOVING_BARRIER') {
        const bLeft = obs.x + 3;
        const bRight = obs.x + obs.width - 3;
        const bTop = obs.y;
        const bBottom = obs.y + obs.height;

        const closestX = Math.max(bLeft, Math.min(px, bRight));
        const closestY = Math.max(bTop, Math.min(py, bBottom));
        const dx = px - closestX;
        const dy = py - closestY;
        if (dx * dx + dy * dy < pr * pr) {
          this.handleTakeDamage('MOVING WATER BARRIER!');
          return;
        }
      } else if (obs.type === 'WATER_SHOWER') {
        for (const drop of obs.drops) {
          if (!drop.hasLanded && drop.fallDelay <= 0) {
            const dropX = obs.x + drop.xOffset;
            const dropY = drop.y;
            const dropR = 8;
            const dx = px - dropX;
            const dy = py - dropY;
            if (dx * dx + dy * dy < (pr + dropR) * (pr + dropR)) {
              this.handleTakeDamage('WATER SHOWER DROP!');
              return;
            }
          }
        }
      }
    }
  }

  private handleTakeDamage(cause: string) {
    if (this.activeSuperpower?.type === 'STEAM_SHIELD' || this.activeSuperpower?.type === 'INFERNO_DASH') {
      sound.playVaporize();
      this.runVaporizedCount++;
      if (this.currentChallenge?.id === 'vaporize_3' && this.runVaporizedCount >= 3) {
        this.completeChallenge();
      }

      this.registerComboHit('SHIELD SMASH! 🛡️');
      const bonus = Math.floor(3 * this.comboMultiplier);
      this.score += bonus;
      this.obstaclesCleared++;
      this.callbacks.onScoreUpdate(this.score, this.isNewRecord);
      this.addFloatingText(`+${bonus} SHIELDED! 🛡️`, this.player.x + 20, this.player.y - 25, '#38bdf8', 20);
      this.addShake(8);
      for (let i = 0; i < 12; i++) {
        this.particles.push({
          x: this.player.x + this.player.width / 2,
          y: this.player.y + this.player.height / 2,
          vx: (Math.random() - 0.5) * 120,
          vy: -(30 + Math.random() * 80),
          size: 4 + Math.random() * 6,
          alpha: 0.9,
          color: '#ffffff',
          life: 0,
          maxLife: 0.4,
          type: 'STEAM',
        });
      }
      return;
    }

    // Break combo streak on damage
    this.combo = 0;
    this.comboMultiplier = 1.0;
    this.airborneClearStreak = 0;
    this.callbacks.onComboUpdate?.(0, 1.0, 0);

    this.lives -= 1;
    this.callbacks.onLivesUpdate(this.lives);

    this.addShake(28);
    this.hitstopTimer = 0.04;

    if (this.lives > 0) {
      this.invulnerableTimer = 1.4; // 1.4s temporary invulnerability
      sound.playDamageHurt();
      sound.triggerHaptic('damage');

      this.player.vy = -380;
      this.player.stretch = 1.25;

      this.addFloatingText('-1 CHANCE!', this.player.x + 20, this.player.y - 30, '#f43f5e', 22);

      for (let i = 0; i < 14; i++) {
        this.particles.push({
          x: this.player.x + this.player.width / 2,
          y: this.player.y + this.player.height / 2,
          vx: (Math.random() - 0.5) * 100,
          vy: -(30 + Math.random() * 80),
          size: 4 + Math.random() * 6,
          alpha: 0.85,
          color: '#ffffff',
          life: 0,
          maxLife: 0.4,
          type: 'STEAM',
        });
      }
    } else {
      this.triggerDeath(cause);
    }
  }

  private triggerDeath(cause: string) {
    if (this.isDying) return;
    this.isDying = true;
    this.deathTimer = 0;
    this.hitstopTimer = 0.05;
    this.addShake(34);

    sound.playDeath();
    triggerVibration([100, 50, 150]);

    this.addFloatingText('EXTINGUISHED!', this.player.x + 10, this.player.y - 35, '#f43f5e', 26);

    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 140;
      this.particles.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 5 + Math.random() * 9,
        alpha: 0.9,
        color: ['#e2e8f0', '#ffffff', '#cbd5e1', '#38bdf8', '#fed7aa'][i % 5],
        life: 0,
        maxLife: 0.5 + Math.random() * 0.35,
        type: 'STEAM',
      });
    }
  }

  // --- PARTICLES & FLOATING TEXTS ---

  private addFloatingText(text: string, x: number, y: number, color: string, size: number) {
    this.floatingTexts.push({
      id: Math.random(),
      text,
      x,
      y,
      alpha: 1,
      color,
      size,
      life: 0,
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'STEAM') {
        p.vy -= 80 * dt;
        p.size += dt * 10;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      } else if (p.type === 'SPARK' || p.type === 'EMBED' || p.type === 'WATER') {
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y -= 45 * dt;
      ft.alpha = Math.max(0, 1 - ft.life / 0.85);

      if (ft.life >= 0.85) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateWeatherAndBackground(dt: number) {
    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -140) {
        cloud.x = this.width + 60;
        cloud.y = 40 + Math.random() * (this.height * 0.28);
      }
    }

    const weather = this.currentBiome.weather;
    for (const wp of this.weatherParticles) {
      wp.wobble += dt * 3;

      if (weather === 'BUBBLES') {
        wp.y -= wp.vy * dt;
        wp.x += Math.sin(wp.wobble) * 0.7;
        if (wp.y < -20) {
          wp.y = this.height + 20;
          wp.x = Math.random() * this.width;
        }
      } else if (weather === 'RAIN') {
        wp.y += (wp.vy * 5 + 300) * dt;
        wp.x -= (this.currentSpeed * 0.4) * dt;
        if (wp.y > this.height) {
          wp.y = -20;
          wp.x = Math.random() * this.width * 1.3;
        }
      } else if (weather === 'SNOW') {
        wp.y += (wp.vy * 0.8 + 40) * dt;
        wp.x += Math.sin(wp.wobble) * 1.5 - (this.currentSpeed * 0.15) * dt;
        if (wp.y > this.height) {
          wp.y = -20;
          wp.x = Math.random() * this.width;
        }
      } else if (weather === 'TWILIGHT_MOTES' || weather === 'NEON_EMBERS') {
        wp.y -= (wp.vy * 0.5 + 20) * dt;
        wp.x += Math.sin(wp.wobble) * 1.2 - (this.currentSpeed * 0.2) * dt;
        if (wp.y < -20) {
          wp.y = this.height + 20;
          wp.x = Math.random() * this.width;
        }
      }
    }

    if (this.currentBiome.celestial === 'STORM_LIGHTNING') {
      this.lightningTimer += dt;
      if (this.lightningTimer > 4.5 && Math.random() < 0.04) {
        this.isLightningFlash = true;
        this.addShake(6);
        setTimeout(() => {
          this.isLightningFlash = false;
        }, 80);
        this.lightningTimer = 0;
      }
    }

    // --- Dynamic Atmospheric Weather (Fog & Light Wind) ---
    this.fogTime += dt;
    this.fogDensity = 0.12 + Math.sin(this.fogTime * 0.22) * 0.05 + (this.stage > 3 ? 0.04 : 0);
    this.windStrength = 0.35 + Math.sin(this.fogTime * 0.28) * 0.2 + Math.sin(this.fogTime * 0.65) * 0.12;

    this.windGustTimer -= dt;
    if (this.windGustTimer <= 0) {
      this.windGustTimer = 8.5 + Math.random() * 7.5;
      this.isWindGusting = true;
      sound.playWindBreeze();
      setTimeout(() => {
        this.isWindGusting = false;
      }, 2400);
    }

    const gustMult = this.isWindGusting ? 2.2 : 1.0;
    for (const wisp of this.windWisps) {
      wisp.x -= (wisp.speed * this.windStrength * gustMult + this.currentSpeed * 0.35) * dt;
      wisp.wobble += dt * 3.2;
      if (wisp.x < -wisp.length - 30) {
        wisp.x = this.width + 40 + Math.random() * 80;
        wisp.y = 50 + Math.random() * (this.groundY - 80);
        wisp.length = 45 + Math.random() * 85;
        wisp.speed = 110 + Math.random() * 150;
      }
    }
  }

  // --- RENDERING ---

  public render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      const shakeAngle = (Math.random() - 0.5) * (this.screenShake * 0.0015);

      ctx.translate(this.width / 2, this.height / 2);
      ctx.rotate(shakeAngle);
      ctx.translate(-this.width / 2 + shakeX, -this.height / 2 + shakeY);
    }

    this.renderSky(ctx);
    this.renderClouds(ctx);
    this.renderAtmosphericHaze(ctx);
    this.renderWeather(ctx);
    this.renderWindWisps(ctx);
    this.renderSpeedLines(ctx);
    this.renderGround(ctx);
    this.renderGroundMist(ctx);
    this.renderPlayerFirelight(ctx);
    this.renderObstacles(ctx);
    this.renderPowerUps(ctx);
    this.renderFireballs(ctx);
    this.renderParticles(ctx);
    this.renderPlayer(ctx);
    this.renderFloatingTexts(ctx);
    this.renderStageTransitionBanner(ctx);
    this.renderCinematicVignette(ctx);

    if (this.isLightningFlash) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  private renderPowerUps(ctx: CanvasRenderingContext2D) {
    for (const pu of this.powerUps) {
      ctx.save();
      const bobY = pu.y + Math.sin(pu.pulseTimer) * 7;
      ctx.translate(pu.x, bobY);

      const colorMap: Record<SuperpowerType, { glow: string; core: string; icon: string }> = {
        FIRE_BLASTER: { glow: 'rgba(249, 115, 22, 0.45)', core: '#f97316', icon: '🔥' },
        STEAM_SHIELD: { glow: 'rgba(56, 189, 248, 0.45)', core: '#38bdf8', icon: '🛡️' },
        INFERNO_DASH: { glow: 'rgba(234, 179, 8, 0.45)', core: '#eab308', icon: '⚡' },
        EMBER_MAGNET: { glow: 'rgba(236, 72, 153, 0.45)', core: '#ec4899', icon: '🧲' },
      };
      const def = colorMap[pu.type];

      // Pulsing outer aura glow
      const pulse = 1 + Math.sin(pu.pulseTimer * 2) * 0.12;
      const glowGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, pu.size * 1.8 * pulse);
      glowGrad.addColorStop(0, def.glow);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, pu.size * 1.8 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Outer rotating segmented energy ring
      ctx.save();
      ctx.rotate(pu.pulseTimer * 1.5);
      ctx.strokeStyle = def.core;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, pu.size * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Shiny orb bubble
      const orbGrad = ctx.createRadialGradient(-pu.size * 0.3, -pu.size * 0.3, 2, 0, 0, pu.size);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.3, def.core);
      orbGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(0, 0, pu.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Central Emoji Icon
      ctx.font = '16px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, 0, 1);

      // Top mini sparkle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-pu.size * 0.35, -pu.size * 0.35, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderFireballs(ctx: CanvasRenderingContext2D) {
    for (const fb of this.fireballs) {
      ctx.save();
      ctx.translate(fb.x, fb.y);

      // Fiery aura
      const fbGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, fb.radius * 1.6);
      fbGrad.addColorStop(0, '#ffffff');
      fbGrad.addColorStop(0.35, fb.color);
      fbGrad.addColorStop(0.75, '#ea580c');
      fbGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = fbGrad;
      ctx.beginPath();
      ctx.arc(0, 0, fb.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Core flame projectile
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(2, 0, fb.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderSky(ctx: CanvasRenderingContext2D) {
    const biome = this.currentBiome;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, biome.skyTop);
    skyGrad.addColorStop(0.5, biome.skyMid);
    skyGrad.addColorStop(0.85, biome.skyBottom);
    skyGrad.addColorStop(1, biome.waterColor);

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    const sunX = this.width - 70;
    const sunY = 70;

    const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 90);
    sunGlow.addColorStop(0, biome.sunGlow);
    sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = biome.sunColor;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();

    if (biome.celestial === 'FULL_MOON') {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(sunX - 8, sunY - 6, 6, 0, Math.PI * 2);
      ctx.arc(sunX + 10, sunY + 8, 8, 0, Math.PI * 2);
      ctx.arc(sunX + 4, sunY - 12, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderClouds(ctx: CanvasRenderingContext2D) {
    const isDark = this.currentBiome.celestial === 'STORM_LIGHTNING' || this.currentBiome.celestial === 'FULL_MOON';
    ctx.fillStyle = isDark ? '#475569' : '#ffffff';

    for (const c of this.clouds) {
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);

      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.arc(22, -10, 28, 0, Math.PI * 2);
      ctx.arc(50, -4, 22, 0, Math.PI * 2);
      ctx.arc(68, 6, 18, 0, Math.PI * 2);
      ctx.arc(30, 12, 22, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private renderAtmosphericHaze(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const biome = this.currentBiome;
    const horizonY = this.groundY - 130;
    const hazeHeight = 160;

    // Soft atmospheric perspective haze band along the horizon
    const hazeGrad = ctx.createLinearGradient(0, horizonY, 0, horizonY + hazeHeight);
    hazeGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    hazeGrad.addColorStop(0.5, biome.skyBottom);
    hazeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.globalAlpha = Math.min(0.28, this.fogDensity * 0.45);
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, horizonY, this.width, hazeHeight);

    // Drifting midground mist billow
    const wave = Math.sin(this.fogTime * 0.55) * 18;
    const mistGrad = ctx.createRadialGradient(
      this.width * 0.5 + wave,
      this.groundY - 60,
      15,
      this.width * 0.5 + wave,
      this.groundY - 60,
      this.width * 0.7
    );
    mistGrad.addColorStop(0, biome.waterHighlight);
    mistGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.globalAlpha = Math.min(0.22, this.fogDensity * 0.35);
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, this.groundY - 140, this.width, 140);

    ctx.restore();
  }

  private renderWeather(ctx: CanvasRenderingContext2D) {
    const weather = this.currentBiome.weather;

    for (const wp of this.weatherParticles) {
      ctx.save();

      if (weather === 'BUBBLES') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(wp.x - wp.size * 0.35, wp.y - wp.size * 0.35, wp.size * 0.28, 0, Math.PI * 2);
        ctx.fill();
      } else if (weather === 'RAIN') {
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(wp.x, wp.y);
        ctx.lineTo(wp.x - 6, wp.y + 16);
        ctx.stroke();
      } else if (weather === 'SNOW') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (weather === 'TWILIGHT_MOTES') {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.7)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (weather === 'NEON_EMBERS') {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.75)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderWindWisps(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const gustBoost = this.isWindGusting ? 1.6 : 1.0;

    for (const wisp of this.windWisps) {
      const alpha = Math.min(0.38, wisp.alpha * this.windStrength * gustBoost);
      if (alpha <= 0.02) continue;

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = wisp.thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();

      const startY = wisp.y;
      const midY = wisp.y + Math.sin(wisp.wobble) * 5;
      const endY = wisp.y + Math.sin(wisp.wobble + 1.2) * 3;

      ctx.moveTo(wisp.x, startY);
      ctx.quadraticCurveTo(wisp.x + wisp.length * 0.5, midY, wisp.x + wisp.length, endY);
      ctx.stroke();

      // Delicate breeze mote caught in the wind
      if (this.isWindGusting && Math.random() < 0.12) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 1.4})`;
        ctx.beginPath();
        ctx.arc(wisp.x + wisp.length * 0.8, midY, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private renderGround(ctx: CanvasRenderingContext2D) {
    const gy = this.groundY;
    const gh = this.height - gy;
    const biome = this.currentBiome;

    const waterGrad = ctx.createLinearGradient(0, gy, 0, this.height);
    waterGrad.addColorStop(0, biome.waterColor);
    waterGrad.addColorStop(1, '#020617');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, gy, this.width, gh);

    const waveTime = performance.now() * 0.003;
    ctx.fillStyle = biome.waterHighlight;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(0, this.height - 25);
    for (let x = 0; x <= this.width; x += 20) {
      const y = this.height - 25 + Math.sin(x * 0.04 + waveTime) * 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Solid grass and ground
    ctx.fillStyle = biome.dirtColor;
    ctx.fillRect(0, gy + 14, this.width, gh - 14);

    ctx.fillStyle = biome.dirtSubColor;
    ctx.fillRect(0, gy + 45, this.width, gh - 45);

    ctx.fillStyle = biome.grassColor;
    ctx.fillRect(0, gy, this.width, 14);

    ctx.fillStyle = biome.grassBladeColor;
    for (let x = 4; x < this.width - 4; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, gy + 14);
      ctx.lineTo(x + 7, gy + 22);
      ctx.lineTo(x + 14, gy + 14);
      ctx.fill();
    }
  }

  private renderGroundMist(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const gy = this.groundY;
    const biome = this.currentBiome;
    const time = this.fogTime;

    // Layer 1: Low undulating ground mist rolling over the surface
    const mistY = gy - 16;
    ctx.fillStyle = biome.waterHighlight;
    ctx.globalAlpha = Math.min(0.22, this.fogDensity * 1.15);

    ctx.beginPath();
    ctx.moveTo(0, gy);
    for (let x = 0; x <= this.width; x += 25) {
      const wave1 = Math.sin(x * 0.025 + time * 1.2) * 5;
      const wave2 = Math.cos(x * 0.055 - time * 0.8) * 3;
      ctx.lineTo(x, mistY + wave1 + wave2);
    }
    ctx.lineTo(this.width, gy + 6);
    ctx.lineTo(0, gy + 6);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Soft feathered misty gradient across the ground plane
    const vaporGrad = ctx.createLinearGradient(0, gy - 26, 0, gy + 4);
    vaporGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vaporGrad.addColorStop(0.55, biome.waterHighlight);
    vaporGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.globalAlpha = Math.min(0.18, this.fogDensity * 0.85);
    ctx.fillStyle = vaporGrad;
    ctx.fillRect(0, gy - 26, this.width, 30);

    ctx.restore();
  }

  private renderObstacles(ctx: CanvasRenderingContext2D) {
    const gy = this.groundY;

    for (const obs of this.obstacles) {
      if (obs.type === 'PUDDLE') {
        // Attack 1: Ground Water Puddle
        ctx.save();
        const puddleGrad = ctx.createLinearGradient(obs.x, gy - 4, obs.x, gy + 10);
        puddleGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
        puddleGrad.addColorStop(1, 'rgba(2, 132, 199, 0.98)');

        ctx.fillStyle = puddleGrad;
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.width / 2, gy + 2, obs.width / 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const ripW = obs.width * 0.35;
        const ripX = obs.x + obs.width * 0.5 + Math.sin(obs.rippleOffset) * 6;
        ctx.ellipse(ripX, gy, ripW, 2.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      } else if (obs.type === 'WATER_WAVE') {
        // Attack 3: Animated Water Wave
        ctx.save();
        const waveX = obs.x;
        const waveY = obs.y;
        const w = obs.width;
        const h = obs.height;

        // Wave body
        const waveGrad = ctx.createLinearGradient(waveX, waveY, waveX, gy);
        waveGrad.addColorStop(0, '#38bdf8');
        waveGrad.addColorStop(0.5, '#0284c7');
        waveGrad.addColorStop(1, '#0369a1');

        ctx.fillStyle = waveGrad;
        ctx.beginPath();
        ctx.moveTo(waveX + w, gy);
        // Back of wave slope
        ctx.quadraticCurveTo(waveX + w * 0.7, gy - h * 0.3, waveX + w * 0.45, waveY + 4);
        // Curling crest
        ctx.bezierCurveTo(waveX + w * 0.3, waveY - 4, waveX + 4, waveY + 8, waveX, waveY + 18);
        ctx.lineTo(waveX, gy);
        ctx.closePath();
        ctx.fill();

        // Wave foaming crest
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(waveX + w * 0.35, waveY + 5, 8, 4, -0.3, 0, Math.PI * 2);
        ctx.ellipse(waveX + 6, waveY + 16, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Foaming water splashes ahead of wave
        ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
        for (let s = 0; s < 3; s++) {
          const spX = waveX - 4 - s * 6 + Math.sin(obs.wavePhase + s) * 3;
          const spY = gy - 4 - s * 4;
          ctx.beginPath();
          ctx.arc(spX, spY, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (obs.type === 'DROPLET') {
        // Attack 2: Falling Water Drop
        ctx.save();

        if (!obs.hasLanded) {
          // Natural water shadow ripple on ground (no text)
          const warnAlpha = Math.min(1, 0.4 + (1 - obs.fallDelay / 0.75) * 0.6);
          ctx.strokeStyle = `rgba(56, 189, 248, ${warnAlpha})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width / 2, gy + 2, 16, 5, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(2, 132, 199, ${warnAlpha * 0.4})`;
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width / 2, gy + 2, 12, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        if (obs.fallDelay <= 0 && !obs.hasLanded) {
          ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(0, 4, 7, 0, Math.PI);
          ctx.lineTo(0, -9);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#bae6fd';
          ctx.beginPath();
          ctx.arc(2, 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.hasLanded && obs.splashAnim > 0) {
          const splashProgress = 1 - obs.splashAnim / 0.35;
          ctx.strokeStyle = `rgba(56, 189, 248, ${1 - splashProgress})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width / 2, gy, 12 + splashProgress * 18, 4 + splashProgress * 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      } else if (obs.type === 'SIDE_SPLASH') {
        // Attack 4: Side Water Splash
        ctx.save();

        if (!obs.isLaunched) {
          // Natural bubbling froth on ground (no text)
          const tProg = 1 - obs.warningTimer / 0.55;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(obs.x, gy, 15 + tProg * 5, 6, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(obs.x - 4, gy - 6 - tProg * 8, 3, 0, Math.PI * 2);
          ctx.arc(obs.x + 5, gy - 4 - tProg * 10, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // In flight: Glowing water projectile with splash tail
          ctx.translate(obs.x + obs.radius, obs.y + obs.radius);

          // Splash tail
          ctx.fillStyle = 'rgba(125, 211, 252, 0.5)';
          ctx.beginPath();
          ctx.arc(10, 0, obs.radius * 0.7, 0, Math.PI * 2);
          ctx.arc(20, 0, obs.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();

          // Water orb body
          const sGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, obs.radius);
          sGrad.addColorStop(0, '#ffffff');
          sGrad.addColorStop(0.4, '#38bdf8');
          sGrad.addColorStop(1, '#0284c7');

          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (obs.type === 'FLYING_BUBBLE') {
        // Attack 5: Flying Water Bubbles (LOW or HIGH)
        ctx.save();
        const bX = obs.x + obs.radius;
        const bY = obs.y + obs.radius;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(bX, bY, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Iridescent reflection highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bX - obs.radius * 0.35, bY - obs.radius * 0.35, obs.radius * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (obs.type === 'MOVING_BARRIER') {
        // Attack 6: Moving Water Barrier (smoothly oscillating vertical column)
        ctx.save();
        const bGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y);
        bGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
        bGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
        bGrad.addColorStop(1, 'rgba(2, 132, 199, 0.9)');

        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 14);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + 10, 4, 0, Math.PI * 2);
        ctx.arc(obs.x + obs.width / 2, obs.y + obs.height - 10, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (obs.type === 'WATER_SHOWER') {
        // Attack 7: Water Shower (Sequential falling drops with ground telegraphs)
        ctx.save();

        for (const drop of obs.drops) {
          const dropGroundX = obs.x + drop.xOffset;

          if (!drop.hasLanded) {
            const wAlpha = Math.min(1, 0.4 + (1 - drop.fallDelay / 0.95) * 0.6);
            ctx.strokeStyle = `rgba(56, 189, 248, ${wAlpha})`;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(dropGroundX, gy + 2, 14, 4, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (drop.fallDelay <= 0 && !drop.hasLanded) {
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(dropGroundX, drop.y, 6, 0, Math.PI);
            ctx.lineTo(dropGroundX, drop.y - 10);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#bae6fd';
            ctx.beginPath();
            ctx.arc(dropGroundX + 1.5, drop.y - 1.5, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (drop.hasLanded && drop.splashAnim > 0) {
            const spProgress = 1 - drop.splashAnim / 0.35;
            ctx.strokeStyle = `rgba(56, 189, 248, ${1 - spProgress})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(dropGroundX, gy, 10 + spProgress * 14, 3 + spProgress * 5, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.restore();
      } else if (obs.type === 'GEYSER') {
        ctx.save();
        const gx = obs.x;
        const gw = obs.width;

        // Rock vent opening
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(gx + gw / 2, gy - 2, gw / 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (obs.state === 'TELEGRAPH') {
          // Bubbling steam & water
          const pulse = Math.sin(Date.now() * 0.015) * 3;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.beginPath();
          ctx.ellipse(gx + gw / 2, gy - 2, gw * 0.35 + pulse, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(224, 242, 254, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gx + gw * 0.3, gy - 4);
          ctx.quadraticCurveTo(gx + gw * 0.25, gy - 20, gx + gw * 0.35, gy - 32);
          ctx.moveTo(gx + gw * 0.7, gy - 4);
          ctx.quadraticCurveTo(gx + gw * 0.75, gy - 18, gx + gw * 0.65, gy - 30);
          ctx.stroke();
        } else if (obs.state === 'ERUPTING') {
          const jetH = obs.maxHeight;
          const jetGrad = ctx.createLinearGradient(gx, gy, gx, gy - jetH);
          jetGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
          jetGrad.addColorStop(0.3, 'rgba(186, 230, 253, 0.9)');
          jetGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.85)');
          jetGrad.addColorStop(1, 'rgba(224, 242, 254, 0.3)');

          ctx.fillStyle = jetGrad;
          ctx.beginPath();
          ctx.moveTo(gx + 6, gy - 4);
          ctx.lineTo(gx + 2, gy - jetH);
          ctx.quadraticCurveTo(gx + gw / 2, gy - jetH - 14, gx + gw - 2, gy - jetH);
          ctx.lineTo(gx + gw - 6, gy - 4);
          ctx.closePath();
          ctx.fill();

          // Steam puff crown
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.beginPath();
          ctx.arc(gx + gw / 2, gy - jetH - 4, 16, 0, Math.PI * 2);
          ctx.arc(gx + gw * 0.25, gy - jetH + 4, 11, 0, Math.PI * 2);
          ctx.arc(gx + gw * 0.75, gy - jetH + 4, 11, 0, Math.PI * 2);
          ctx.fill();

          // Updraft spring arrow hints
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const arrowY = gy - jetH * 0.5;
          ctx.moveTo(gx + gw / 2, arrowY + 12);
          ctx.lineTo(gx + gw / 2, arrowY - 12);
          ctx.lineTo(gx + gw / 2 - 6, arrowY - 4);
          ctx.moveTo(gx + gw / 2, arrowY - 12);
          ctx.lineTo(gx + gw / 2 + 6, arrowY - 4);
          ctx.stroke();
        }

        ctx.restore();
      }
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;

    ctx.save();

    if (this.invulnerableTimer > 0) {
      const flicker = Math.floor(this.invulnerableTimer * 20) % 2 === 0;
      if (flicker) {
        ctx.globalAlpha = 0.45;
      }

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      const shieldGrad = ctx.createRadialGradient(
        p.x + p.width / 2,
        p.y + p.height / 2,
        5,
        p.x + p.width / 2,
        p.y + p.height / 2,
        p.width * 0.75
      );
      shieldGrad.addColorStop(0, 'rgba(250, 204, 21, 0.15)');
      shieldGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = shieldGrad;
      ctx.fill();
    }

    // Active STEAM_SHIELD sphere rendering
    if (this.activeSuperpower?.type === 'STEAM_SHIELD' && !this.isDying) {
      const shieldTime = performance.now() * 0.005;
      const shieldPulse = 1 + Math.sin(shieldTime * 4) * 0.08;
      const sRadius = p.width * 0.85 * shieldPulse;
      const scx = p.x + p.width / 2;
      const scy = p.y + p.height / 2;

      ctx.save();
      const sGrad = ctx.createRadialGradient(scx, scy, 10, scx, scy, sRadius);
      sGrad.addColorStop(0, 'rgba(56, 189, 248, 0.1)');
      sGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.35)');
      sGrad.addColorStop(1, 'rgba(2, 132, 199, 0.6)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(scx, scy, sRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Orbiting water-shield sparks
      for (let s = 0; s < 3; s++) {
        const angle = shieldTime * 3 + (s * Math.PI * 2) / 3;
        const ox = scx + Math.cos(angle) * sRadius;
        const oy = scy + Math.sin(angle) * sRadius;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox, oy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawFlameCharacter(
      ctx,
      p.x,
      p.y,
      p.width,
      p.height,
      p.skin,
      {
        isGrounded: p.isGrounded,
        vy: p.vy,
        runCycle: p.runCycle,
        blink: p.isBlinking,
        squash: p.squash,
        stretch: p.stretch,
        tilt: p.tilt,
        deathProgress: this.isDying ? Math.min(1, this.deathTimer / 0.5) : 0,
        superpowerActive: !!this.activeSuperpower,
        superpowerType: this.activeSuperpower?.type,
      }
    );

    // Intense combo streak fiery aura
    if (this.combo >= 4 && !this.isDying) {
      const auraPulse = Math.sin(Date.now() * 0.02) * 5;
      const auraRadius = p.width * 0.95 + auraPulse;
      const auraGrad = ctx.createRadialGradient(
        p.x + p.width / 2,
        p.y + p.height / 2,
        6,
        p.x + p.width / 2,
        p.y + p.height / 2,
        auraRadius
      );
      auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
      auraGrad.addColorStop(0.7, 'rgba(249, 115, 22, 0.2)');
      auraGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, auraRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `800 ${ft.size}px 'Fredoka', cursive, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;

      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private renderStageTransitionBanner(ctx: CanvasRenderingContext2D) {
    if (this.stageBannerTimer <= 0) return;

    ctx.save();
    // Fade in and out smoothly
    const alpha = Math.min(1, Math.min(this.stageBannerTimer, 3.2 - this.stageBannerTimer) * 2.5);
    ctx.globalAlpha = Math.max(0, alpha);

    const bannerW = Math.min(this.width - 24, 380);
    const bannerH = 54;
    const bannerX = (this.width - bannerW) / 2;
    const bannerY = 86;

    // Glowing backdrop
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.strokeStyle = this.currentBiome.sunColor || '#facc15';
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 16);
    ctx.fill();
    ctx.stroke();

    // Biome badge icon & title
    ctx.font = '900 14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = this.currentBiome.sunColor || '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`✦ STAGE ${this.stage}: ${this.currentBiome.name.toUpperCase()} ✦`, this.width / 2, bannerY + 19);

    // Wave Attack info
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#bae6fd';
    ctx.fillText(`WAVE ATTACK: ${this.currentAttack.name} • SPEED SURGE!`, this.width / 2, bannerY + 38);

    ctx.restore();
  }

  private renderSpeedLines(ctx: CanvasRenderingContext2D) {
    if (this.currentSpeed < 340) return;

    const intensity = Math.min(1, (this.currentSpeed - 340) / 160);
    const time = performance.now() * 0.005;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 6; i++) {
      const lineY = 60 + i * 45 + Math.sin(time + i) * 10;
      const length = 50 + ((time * 180 + i * 70) % 180);
      const startX = (this.width - ((time * 350 + i * 110) % (this.width + 200)));

      ctx.globalAlpha = intensity * 0.45;
      ctx.beginPath();
      ctx.moveTo(startX, lineY);
      ctx.lineTo(startX + length, lineY);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderPlayerFirelight(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    ctx.save();

    // Warm radial fire glow lighting the ground & water beneath player
    const lightX = p.x + p.width / 2;
    const lightY = p.y + p.height * 0.6;
    const radius = 95 + Math.sin(p.runCycle * 2) * 5;

    const fireGlow = ctx.createRadialGradient(lightX, lightY, 8, lightX, lightY, radius);
    fireGlow.addColorStop(0, p.skin.colors.glow);
    fireGlow.addColorStop(0.5, 'rgba(249, 115, 22, 0.12)');
    fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.arc(lightX, lightY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderCinematicVignette(ctx: CanvasRenderingContext2D) {
    ctx.save();

    const vignette = ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.48,
      this.height * 0.32,
      this.width / 2,
      this.height * 0.48,
      this.height * 0.78
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(3, 7, 18, 0.25)');
    vignette.addColorStop(1, 'rgba(2, 6, 23, 0.65)');

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.restore();
  }
}
