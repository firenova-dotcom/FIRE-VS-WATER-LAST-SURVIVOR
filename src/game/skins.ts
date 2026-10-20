import { FlameSkin } from '../types.ts';

export const FLAME_SKINS: FlameSkin[] = [
  {
    id: 'flamby',
    name: 'Flamby (Classic)',
    modelType: 'FLAME',
    scoreRequirement: 0,
    description: 'The cheerful original fire spark with a warm golden heart.',
    specialTrait: 'Balanced running & agile jumps',
    colors: {
      outer: '#f97316', // Orange-500
      inner: '#facc15', // Yellow-400
      core: '#ffffff',
      glow: 'rgba(249, 115, 22, 0.45)',
      eyes: '#1e293b',
      pupils: '#0f172a',
      particles: ['#fb923c', '#fde047', '#ef4444'],
      accent: '#ea580c',
    },
  },
  {
    id: 'magma',
    name: 'Magma Golem (Lava Titan)',
    modelType: 'MAGMA',
    scoreRequirement: 10,
    description: 'Heavy molten volcanic titan forged deep in boiling lava caves.',
    specialTrait: 'Molten rock armor plates & heavy impact',
    colors: {
      outer: '#b91c1c', // Red-700
      inner: '#f97316', // Orange-500
      core: '#fef08a', // Yellow-200
      glow: 'rgba(220, 38, 38, 0.55)',
      eyes: '#7f1d1d',
      pupils: '#fef08a',
      particles: ['#ef4444', '#f97316', '#78350f'],
      accent: '#292524', // Volcanic stone
    },
  },
  {
    id: 'plasma',
    name: 'Plasma Spark (Electric Cyan)',
    modelType: 'PLASMA',
    scoreRequirement: 20,
    description: 'High-voltage neon azure spark crackling with hyper-energy lightning.',
    specialTrait: 'Electric lightning crest & ultra-fast burst',
    colors: {
      outer: '#0284c7', // Sky-600
      inner: '#38bdf8', // Sky-400
      core: '#e0f2fe',
      glow: 'rgba(14, 165, 233, 0.6)',
      eyes: '#0c4a6e',
      pupils: '#38bdf8',
      particles: ['#38bdf8', '#7dd3fc', '#06b6d4'],
      accent: '#67e8f9',
    },
  },
  {
    id: 'dragon',
    name: 'Draco Ember (Dragon Fire)',
    modelType: 'DRAGON',
    scoreRequirement: 35,
    description: 'Mythical dragon flame adorned with curved horns and soaring wing embers.',
    specialTrait: 'Dragon horns, side wings & wide steam blast',
    colors: {
      outer: '#15803d', // Emerald-700
      inner: '#4ade80', // Green-400
      core: '#fef08a',
      glow: 'rgba(34, 197, 94, 0.55)',
      eyes: '#14532d',
      pupils: '#facc15',
      particles: ['#22c55e', '#86efac', '#eab308'],
      accent: '#ca8a04', // Golden horns
    },
  },
  {
    id: 'wisp',
    name: 'Spirit Wisp (Ghost Violet)',
    modelType: 'WISP',
    scoreRequirement: 50,
    description: 'Ethereal celestial will-o-the-wisp drifting with twin mystical spirit orbs.',
    specialTrait: 'Floating spirit orbs & ethereal glide',
    colors: {
      outer: '#7c3aed', // Violet-600
      inner: '#c084fc', // Purple-400
      core: '#faf5ff',
      glow: 'rgba(147, 51, 234, 0.6)',
      eyes: '#581c87',
      pupils: '#f472b6',
      particles: ['#c084fc', '#f472b6', '#a855f7'],
      accent: '#f472b6',
    },
  },
  {
    id: 'phoenix',
    name: 'Solar Phoenix (Golden Sun Bird)',
    modelType: 'PHOENIX',
    scoreRequirement: 75,
    description: 'Majestic solar-crowned bird flame blessed with eternal golden embers.',
    specialTrait: 'Golden solar feather crest & blazing wing plumes',
    colors: {
      outer: '#d97706', // Amber-600
      inner: '#fde047', // Yellow-300
      core: '#ffffff',
      glow: 'rgba(245, 158, 11, 0.65)',
      eyes: '#78350f',
      pupils: '#b45309',
      particles: ['#fbbf24', '#fde047', '#f59e0b'],
      accent: '#f59e0b',
    },
  },
];

export function getSkinById(id: string): FlameSkin {
  return FLAME_SKINS.find((s) => s.id === id) || FLAME_SKINS[0];
}

/**
 * Procedurally draws the adorable flame character and custom models onto any HTML5 canvas.
 */
export function drawFlameCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  skin: FlameSkin,
  options: {
    isGrounded?: boolean;
    vy?: number;
    runCycle?: number;
    blink?: boolean;
    squash?: number; // scale factor
    stretch?: number;
    tilt?: number; // radians
    deathProgress?: number; // 0 to 1
    superpowerActive?: boolean;
    superpowerType?: string;
  } = {}
) {
  const {
    isGrounded = true,
    vy = 0,
    runCycle = 0,
    blink = false,
    squash = 1,
    stretch = 1,
    tilt = 0,
    deathProgress = 0,
    superpowerActive = false,
  } = options;

  ctx.save();
  ctx.translate(x + width / 2, y + height);

  // If death animation is active, dissolve / shrink
  if (deathProgress > 0) {
    const scale = Math.max(0, 1 - deathProgress);
    const alpha = Math.max(0, 1 - deathProgress * 1.2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
  } else {
    // Dynamic squash and stretch based on physics & jump
    ctx.scale(squash, stretch);
    ctx.rotate(tilt);
  }

  // Draw soft outer ambient fire glow
  const glowGrad = ctx.createRadialGradient(0, -height * 0.5, 5, 0, -height * 0.5, width * 0.95);
  glowGrad.addColorStop(0, skin.colors.glow);
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, -height * 0.5, width * 0.95, 0, Math.PI * 2);
  ctx.fill();

  // If Superpower is active, draw an extra vibrant spinning aura
  if (superpowerActive && deathProgress === 0) {
    ctx.save();
    const auraPulse = 1 + Math.sin(runCycle * 4) * 0.15;
    ctx.scale(auraPulse, auraPulse);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -runCycle * 15;
    ctx.beginPath();
    ctx.arc(0, -height * 0.52, width * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Little running feet (trotting dots when grounded)
  if (isGrounded && deathProgress === 0) {
    const footOffset1 = Math.sin(runCycle) * 6;
    const footOffset2 = Math.sin(runCycle + Math.PI) * 6;

    ctx.fillStyle = skin.colors.outer;
    // Left foot
    ctx.beginPath();
    ctx.ellipse(-12 + footOffset1 * 0.5, -2 + Math.abs(footOffset1) * 0.3, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right foot
    ctx.beginPath();
    ctx.ellipse(12 + footOffset2 * 0.5, -2 + Math.abs(footOffset2) * 0.3, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flame teardrop body
  const bodyH = height * 0.95;
  const tipWobble = Math.sin(runCycle * 1.5) * 4 - (vy * 0.04);

  // --- MODEL SPECIFIC BACK ACCESSORIES (Wings, Orbs, Crests) ---
  if (deathProgress === 0) {
    if (skin.modelType === 'DRAGON') {
      // Dragon mini wings flapping on sides
      const wingFlap = Math.sin(runCycle * 3) * 6;
      ctx.fillStyle = skin.colors.accent || '#ca8a04';
      // Left Wing
      ctx.beginPath();
      ctx.moveTo(-width * 0.35, -bodyH * 0.55);
      ctx.lineTo(-width * 0.85, -bodyH * 0.8 + wingFlap);
      ctx.lineTo(-width * 0.6, -bodyH * 0.45);
      ctx.closePath();
      ctx.fill();
      // Right Wing
      ctx.beginPath();
      ctx.moveTo(width * 0.35, -bodyH * 0.55);
      ctx.lineTo(width * 0.85, -bodyH * 0.8 + wingFlap);
      ctx.lineTo(width * 0.6, -bodyH * 0.45);
      ctx.closePath();
      ctx.fill();
    } else if (skin.modelType === 'PHOENIX') {
      // Golden Phoenix side wing feathers
      const wingAngle = Math.sin(runCycle * 2.5) * 0.15;
      ctx.fillStyle = skin.colors.inner;
      // Left wing
      ctx.save();
      ctx.translate(-width * 0.4, -bodyH * 0.5);
      ctx.rotate(-wingAngle);
      ctx.beginPath();
      ctx.ellipse(-10, 0, 14, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Right wing
      ctx.save();
      ctx.translate(width * 0.4, -bodyH * 0.5);
      ctx.rotate(wingAngle);
      ctx.beginPath();
      ctx.ellipse(10, 0, 14, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (skin.modelType === 'WISP') {
      // Floating celestial spirit orbs orbiting
      const orbAngle = runCycle * 2;
      const orbDist = width * 0.72;
      const ox1 = Math.cos(orbAngle) * orbDist;
      const oy1 = -bodyH * 0.5 + Math.sin(orbAngle) * 12;
      const ox2 = Math.cos(orbAngle + Math.PI) * orbDist;
      const oy2 = -bodyH * 0.5 + Math.sin(orbAngle + Math.PI) * 12;

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(ox1, oy1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ox2, oy2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer Flame Silhouette
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.bezierCurveTo(width * 0.55, -2, width * 0.6, -bodyH * 0.45, width * 0.35, -bodyH * 0.75);
  ctx.bezierCurveTo(width * 0.15, -bodyH * 0.9, tipWobble + 6, -bodyH * 1.05, tipWobble, -bodyH * 1.12);
  ctx.bezierCurveTo(tipWobble - 8, -bodyH * 0.95, -width * 0.25, -bodyH * 0.8, -width * 0.55, -bodyH * 0.45);
  ctx.bezierCurveTo(-width * 0.6, -2, -width * 0.2, -2, 0, -2);
  ctx.closePath();

  // Outer Gradient fill
  const bodyGrad = ctx.createLinearGradient(0, -bodyH * 1.1, 0, 0);
  bodyGrad.addColorStop(0, skin.colors.outer);
  bodyGrad.addColorStop(0.55, skin.colors.outer);
  bodyGrad.addColorStop(1, skin.colors.inner);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Inner warm flame core
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(width * 0.35, -6, width * 0.38, -bodyH * 0.35, width * 0.2, -bodyH * 0.6);
  ctx.bezierCurveTo(width * 0.08, -bodyH * 0.75, tipWobble * 0.6 + 3, -bodyH * 0.85, tipWobble * 0.5, -bodyH * 0.92);
  ctx.bezierCurveTo(tipWobble * 0.5 - 5, -bodyH * 0.8, -width * 0.15, -bodyH * 0.65, -width * 0.35, -bodyH * 0.35);
  ctx.bezierCurveTo(-width * 0.38, -6, -width * 0.15, -6, 0, -6);
  ctx.closePath();

  const coreGrad = ctx.createLinearGradient(0, -bodyH * 0.9, 0, -6);
  coreGrad.addColorStop(0, skin.colors.inner);
  coreGrad.addColorStop(0.7, skin.colors.core);
  coreGrad.addColorStop(1, '#ffffff');
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // --- MODEL SPECIFIC FOREGROUND ACCESSORIES (Horns, Rock Plates, Lightning Bolts) ---
  if (deathProgress === 0) {
    if (skin.modelType === 'MAGMA') {
      // Dark volcanic obsidian plates on shoulders and brow
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(-14, -bodyH * 0.6, 6, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(14, -bodyH * 0.6, 6, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Lava crack lines
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-8, -bodyH * 0.6);
      ctx.lineTo(0, -bodyH * 0.68);
      ctx.lineTo(8, -bodyH * 0.6);
      ctx.stroke();
    } else if (skin.modelType === 'DRAGON') {
      // Twin curved dragon horns at the crown
      ctx.fillStyle = skin.colors.accent || '#ca8a04';
      // Left horn
      ctx.beginPath();
      ctx.moveTo(-10, -bodyH * 0.82);
      ctx.quadraticCurveTo(-20, -bodyH * 1.05, -14, -bodyH * 1.15);
      ctx.quadraticCurveTo(-10, -bodyH * 0.98, -4, -bodyH * 0.86);
      ctx.closePath();
      ctx.fill();
      // Right horn
      ctx.beginPath();
      ctx.moveTo(10, -bodyH * 0.82);
      ctx.quadraticCurveTo(20, -bodyH * 1.05, 14, -bodyH * 1.15);
      ctx.quadraticCurveTo(10, -bodyH * 0.98, 4, -bodyH * 0.86);
      ctx.closePath();
      ctx.fill();
    } else if (skin.modelType === 'PLASMA') {
      // Zig-zag electric lightning bolt crest
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(tipWobble - 2, -bodyH * 1.1);
      ctx.lineTo(tipWobble + 6, -bodyH * 1.22);
      ctx.lineTo(tipWobble - 2, -bodyH * 1.24);
      ctx.lineTo(tipWobble + 7, -bodyH * 1.36);
      ctx.stroke();
    } else if (skin.modelType === 'PHOENIX') {
      // Triple golden solar feather crown
      ctx.fillStyle = '#f59e0b';
      [-8, 0, 8].forEach((fOffset, i) => {
        ctx.beginPath();
        ctx.ellipse(tipWobble + fOffset, -bodyH * 1.14 - (i === 1 ? 5 : 0), 4, 9, fOffset * 0.05, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // Expressive Eyes!
  if (deathProgress === 0) {
    const eyeY = -bodyH * 0.42;
    const eyeSpacing = 11;
    const eyeW = 7;
    const eyeH = blink ? 2 : 11;

    [-eyeSpacing, eyeSpacing].forEach((eyeX) => {
      ctx.save();
      ctx.translate(eyeX, eyeY);

      if (blink) {
        // Blinking line
        ctx.strokeStyle = skin.colors.eyes;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.quadraticCurveTo(0, 3, 4, 0);
        ctx.stroke();
      } else {
        // Eye whites
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark pupil looking right/forward
        ctx.fillStyle = skin.colors.pupils;
        ctx.beginPath();
        ctx.ellipse(1.5, 0.5, eyeW * 0.55, eyeH * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(2.8, -2.5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Tiny secondary shine
        ctx.beginPath();
        ctx.arc(0.2, 2.5, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Cute blush cheeks
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-18, -bodyH * 0.32, 4.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(18, -bodyH * 0.32, 4.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Little cheerful smile!
    ctx.strokeStyle = skin.colors.eyes;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, -bodyH * 0.28);
    ctx.quadraticCurveTo(0, -bodyH * 0.24, 3, -bodyH * 0.28);
    ctx.stroke();
  }

  ctx.restore();
}
