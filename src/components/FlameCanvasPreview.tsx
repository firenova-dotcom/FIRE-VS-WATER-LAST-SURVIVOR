import React, { useEffect, useRef } from 'react';
import { FlameSkin } from '../types.ts';
import { drawFlameCharacter } from '../game/skins.ts';

interface FlameCanvasPreviewProps {
  skin: FlameSkin;
  size?: number;
  className?: string;
  animate?: boolean;
}

export const FlameCanvasPreview: React.FC<FlameCanvasPreviewProps> = ({
  skin,
  size = 120,
  className = '',
  animate = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let cycle = 0;
    let blinkTimer = 0;
    let isBlinking = false;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      if (animate) {
        cycle += 0.05;
        blinkTimer += 0.016;
        if (blinkTimer > 3.2) {
          isBlinking = true;
          if (blinkTimer > 3.35) {
            isBlinking = false;
            blinkTimer = 0;
          }
        }
      }

      const charW = size * 0.45;
      const charH = size * 0.55;
      const x = (size - charW) / 2;
      const y = (size - charH) / 2 + Math.sin(cycle) * 3;

      drawFlameCharacter(ctx, x, y, charW, charH, skin, {
        isGrounded: true,
        runCycle: cycle,
        blink: isBlinking,
        squash: 1 + Math.sin(cycle * 2) * 0.04,
        stretch: 1 - Math.sin(cycle * 2) * 0.04,
      });

      if (animate) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [skin, size, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};
