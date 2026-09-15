import React, { useState } from 'react';
import { ModelType, AchievementRarity } from '../types/achievement.types';
import { AchievementModel } from './AchievementModel';
import { AchievementParticles } from './AchievementParticles';
import { GlowController } from './GlowController';

export interface AchievementSceneProps {
  modelType: ModelType;
  rarity: AchievementRarity;
  glowColor: string;
  currentProgress?: number;
  targetProgress?: number;
  isUnlocked: boolean;
  particleColor?: string;
  className?: string;
  interactive?: boolean;
  height?: string;
}

/**
 * Full 3D WebGL Studio Showcase Scene optimized for Light Theme with luxury marble pedestal and studio lighting.
 */
export const AchievementScene: React.FC<AchievementSceneProps> = ({
  modelType,
  rarity,
  glowColor,
  currentProgress = 0,
  targetProgress = 100,
  isUnlocked,
  particleColor = '#8b5cf6',
  className = '',
  interactive = true,
  height = 'h-64'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative w-full ${height} overflow-hidden rounded-3xl bg-gradient-to-b from-slate-50/90 via-indigo-50/30 to-white border border-slate-200/80 shadow-[inset_0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Soft Ambient Studio Lighting Halo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 blur-3xl transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`
        }}
      />

      {/* Luxury White Marble & Glass Pedestal Ring */}
      <div className="absolute bottom-6 w-44 h-8 rounded-full border border-slate-300/70 bg-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.06)] flex items-center justify-center pointer-events-none">
        <div
          className="w-32 h-4 rounded-full blur-md opacity-60"
          style={{ backgroundColor: isUnlocked ? glowColor : '#cbd5e1' }}
        />
      </div>

      {/* Ambient Celestial Particles */}
      {(isUnlocked || (currentProgress > 0 && targetProgress > 0)) && (
        <AchievementParticles
          particleCount={rarity === 'mythic' ? 44 : isUnlocked ? 26 : 14}
          color={particleColor || glowColor}
          speed={0.7}
          radius={2.0}
        />
      )}

      {/* 3D Model with Ambient Glow */}
      <GlowController
        baseColor={glowColor}
        rarity={rarity}
        currentProgress={currentProgress}
        targetProgress={targetProgress}
        isUnlocked={isUnlocked}
        isHovered={isHovered}
        className="w-full h-full flex items-center justify-center z-10"
      >
        <AchievementModel
          type={modelType}
          rarity={rarity}
          glowColor={glowColor}
          currentProgress={currentProgress}
          targetProgress={targetProgress}
          isUnlocked={isUnlocked}
          interactive={interactive}
          autoRotate={true}
          scale={1.22}
          className="w-full h-full"
        />
      </GlowController>

      {/* 360 Rotation Control Badge */}
      {interactive && (
        <div className="absolute bottom-2.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white tracking-wider flex items-center gap-1.5 pointer-events-none shadow-md">
          <span className="material-symbols-outlined text-[13px] text-amber-300 animate-pulse">
            3d_rotation
          </span>
          <span>DRAG TO ROTATE 360°</span>
        </div>
      )}
    </div>
  );
};

export default AchievementScene;
