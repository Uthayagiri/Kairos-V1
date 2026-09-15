import React from 'react';
import { AchievementRarity } from '../types/achievement.types';
import { useAchievementGlow } from '../hooks/useAchievementGlow';
import { hexToRgba } from '../utils/glowCalculator';

export interface GlowControllerProps {
  baseColor: string;
  rarity: AchievementRarity;
  currentProgress?: number;
  targetProgress?: number;
  isUnlocked: boolean;
  isHovered?: boolean;
  isActive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Dynamic Aura & Fresnel Glow Controller for cards and 3D preview containers.
 */
export const GlowController: React.FC<GlowControllerProps> = ({
  baseColor,
  rarity,
  currentProgress = 0,
  targetProgress = 100,
  isUnlocked,
  isHovered = false,
  isActive = false,
  className = '',
  children
}) => {
  const glow = useAchievementGlow({
    baseColor,
    rarity,
    currentProgress,
    targetProgress,
    isUnlocked,
    isHovered,
    isActive
  });

  const ambientGlowStyle: React.CSSProperties = {
    boxShadow: glow.boxShadowStyle !== 'none' ? glow.boxShadowStyle : undefined,
    transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  return (
    <div className={`relative ${className}`} style={ambientGlowStyle}>
      {/* Dynamic Background Halo Layer */}
      {glow.glowOpacity > 0.08 && (
        <div
          className="absolute inset-0 rounded-full blur-2xl pointer-events-none -z-10 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle, ${hexToRgba(glow.primaryHex, glow.glowOpacity)} 0%, transparent 70%)`,
            transform: `scale(${1 + glow.pulseRadius / 60})`
          }}
        />
      )}
      {children}
    </div>
  );
};

export default GlowController;
