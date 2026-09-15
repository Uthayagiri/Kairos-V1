import { AchievementRarity, GlowStage } from '../types/achievement.types';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';

export interface GlowEffectParams {
  baseColor: string;
  rarity: AchievementRarity;
  currentProgress: number;
  targetProgress: number;
  isUnlocked: boolean;
  time: number;
  intensityMultiplier?: number;
}

export interface ComputedGlow {
  stage: GlowStage;
  progressRatio: number;
  primaryHex: string;
  glowOpacity: number;
  pulseRadius: number;
  bloomIntensity: number;
  particleSpeed: number;
  particleCount: number;
  boxShadowStyle: string;
  metallicFactor: number;
  saturationFactor: number;
  emissiveFactor: number;
}

/**
 * Calculates dynamic ambient glow and material shaders based on the 5-stage progression model.
 */
export function calculateGlow({
  baseColor,
  rarity,
  currentProgress,
  targetProgress,
  isUnlocked,
  time,
  intensityMultiplier = 1.0
}: GlowEffectParams): ComputedGlow {
  const rarityMeta = ACHIEVEMENT_RARITIES[rarity] || ACHIEVEMENT_RARITIES.common;
  const rawRatio = targetProgress > 0 ? currentProgress / targetProgress : 0;
  const progressRatio = Math.min(1.0, Math.max(0.0, rawRatio));

  // Determine 5-Stage Status
  let stage: GlowStage = 'LOCKED';
  if (isUnlocked || progressRatio >= 1.0) {
    stage = 'UNLOCKED';
  } else if (progressRatio >= 0.75) {
    stage = 'NEAR_COMPLETION';
  } else if (progressRatio > 0.25) {
    stage = 'IN_PROGRESS';
  } else if (progressRatio > 0.0) {
    stage = 'DISCOVERED';
  } else {
    stage = 'LOCKED';
  }

  const pulse = Math.sin(time * 2.2) * 0.5 + 0.5; // 0.0 to 1.0
  const colorHex = baseColor || rarityMeta.glowColor;
  const rarityMult = rarityMeta.multiplier * intensityMultiplier;

  switch (stage) {
    case 'LOCKED':
      return {
        stage,
        progressRatio,
        primaryHex: '#475569',
        glowOpacity: 0.05,
        pulseRadius: 4,
        bloomIntensity: 0.1,
        particleSpeed: 0.1,
        particleCount: 0,
        boxShadowStyle: 'none',
        metallicFactor: 0.2,
        saturationFactor: 0.2,
        emissiveFactor: 0.02
      };

    case 'DISCOVERED':
      return {
        stage,
        progressRatio,
        primaryHex: colorHex,
        glowOpacity: 0.15 + pulse * 0.05,
        pulseRadius: 8 + pulse * 4,
        bloomIntensity: 0.25 * rarityMult,
        particleSpeed: 0.3,
        particleCount: Math.round(rarityMeta.particleCount * 0.25),
        boxShadowStyle: `0 0 10px 1px ${hexToRgba(colorHex, 0.15)}`,
        metallicFactor: 0.4,
        saturationFactor: 0.5,
        emissiveFactor: 0.15
      };

    case 'IN_PROGRESS': {
      const opacity = (0.28 + pulse * 0.12) * Math.min(1.0, rarityMult * 0.8);
      const radius = Math.round(12 + pulse * 8 * rarityMult);
      return {
        stage,
        progressRatio,
        primaryHex: colorHex,
        glowOpacity: opacity,
        pulseRadius: radius,
        bloomIntensity: (0.5 + pulse * 0.2) * rarityMult,
        particleSpeed: 0.6 + pulse * 0.2,
        particleCount: Math.round(rarityMeta.particleCount * 0.6),
        boxShadowStyle: `0 0 ${radius}px ${Math.round(radius / 4)}px ${hexToRgba(colorHex, opacity)}`,
        metallicFactor: 0.7,
        saturationFactor: 0.8,
        emissiveFactor: 0.4
      };
    }

    case 'NEAR_COMPLETION': {
      const opacity = (0.45 + pulse * 0.2) * Math.min(1.0, rarityMult);
      const radius = Math.round(18 + pulse * 12 * rarityMult);
      return {
        stage,
        progressRatio,
        primaryHex: colorHex,
        glowOpacity: opacity,
        pulseRadius: radius,
        bloomIntensity: (0.9 + pulse * 0.35) * rarityMult,
        particleSpeed: 0.9 + pulse * 0.3,
        particleCount: Math.round(rarityMeta.particleCount * 0.85),
        boxShadowStyle: `0 0 ${radius}px ${Math.round(radius / 3)}px ${hexToRgba(colorHex, opacity)}`,
        metallicFactor: 0.85,
        saturationFactor: 0.95,
        emissiveFactor: 0.7
      };
    }

    case 'UNLOCKED':
    default: {
      const opacity = (0.55 + pulse * 0.25) * Math.min(1.0, rarityMult);
      const radius = Math.round(24 + pulse * 16 * rarityMult);
      const bloom = (1.2 + pulse * 0.5) * rarityMult;
      return {
        stage,
        progressRatio: 1.0,
        primaryHex: colorHex,
        glowOpacity: opacity,
        pulseRadius: radius,
        bloomIntensity: bloom,
        particleSpeed: 1.0 + pulse * 0.4,
        particleCount: rarityMeta.particleCount,
        boxShadowStyle: `0 0 ${radius}px ${Math.round(radius / 3)}px ${hexToRgba(colorHex, opacity)}`,
        metallicFactor: 0.95,
        saturationFactor: 1.0,
        emissiveFactor: 0.95
      };
    }
  }
}

/**
 * Helper to convert 6-char hex color to rgba CSS string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 79;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 70;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 229;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}
