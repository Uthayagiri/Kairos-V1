import { useState, useEffect, useRef } from 'react';
import { AchievementRarity } from '../types/achievement.types';
import { calculateGlow, ComputedGlow } from '../utils/glowCalculator';

interface UseAchievementGlowProps {
  baseColor: string;
  rarity: AchievementRarity;
  currentProgress?: number;
  targetProgress?: number;
  isUnlocked: boolean;
  isHovered?: boolean;
  isActive?: boolean;
}

export function useAchievementGlow({
  baseColor,
  rarity,
  currentProgress = 0,
  targetProgress = 100,
  isUnlocked,
  isHovered = false,
  isActive = false
}: UseAchievementGlowProps): ComputedGlow {
  const [time, setTime] = useState(0);
  const animFrameRef = useRef<number>();

  useEffect(() => {
    let startTime = performance.now();

    const update = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      setTime(elapsed);
      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const intensityMultiplier = (isHovered ? 1.35 : 1.0) * (isActive ? 1.75 : 1.0);

  return calculateGlow({
    baseColor,
    rarity,
    currentProgress,
    targetProgress,
    isUnlocked,
    time,
    intensityMultiplier
  });
}
