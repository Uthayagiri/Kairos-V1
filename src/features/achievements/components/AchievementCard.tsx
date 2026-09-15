import React, { useState } from 'react';
import { Achievement } from '../types/achievement.types';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';
import { getProgressPercentage } from '../utils/achievementHelpers';
import { GlowController } from './GlowController';
import { AchievementModel } from './AchievementModel';

export interface AchievementCardProps {
  achievement: Achievement;
  onSelect: (achievement: Achievement) => void;
  onUnlock?: (id: string) => void;
  className?: string;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  onSelect,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const rarityMeta = ACHIEVEMENT_RARITIES[achievement.rarity] || ACHIEVEMENT_RARITIES.common;
  const isUnlocked = achievement.unlocked || achievement.isUnlocked || false;
  const progressPct = getProgressPercentage(achievement);

  const glowStageLabels = {
    LOCKED: 'Locked',
    DISCOVERED: 'Discovered',
    IN_PROGRESS: 'In Progress',
    NEAR_COMPLETION: 'Near Completion',
    UNLOCKED: 'Unlocked'
  };

  const glowStageColors = {
    LOCKED: 'text-slate-500 bg-slate-100 border-slate-200',
    DISCOVERED: 'text-blue-700 bg-blue-50 border-blue-200',
    IN_PROGRESS: 'text-purple-700 bg-purple-50 border-purple-200',
    NEAR_COMPLETION: 'text-amber-800 bg-amber-50 border-amber-200 animate-pulse',
    UNLOCKED: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-bold'
  };

  return (
    <div
      onClick={() => onSelect(achievement)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden p-4 sm:p-5 flex flex-col justify-between ${
        isUnlocked
          ? 'bg-white border-slate-200/90 shadow-sm hover:shadow-[0_16px_36px_-6px_rgba(79,70,229,0.15)] hover:border-primary/40 hover:-translate-y-1'
          : achievement.currentProgress > 0
          ? 'bg-white/90 border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
          : 'bg-slate-50/70 border-dashed border-slate-200/90 opacity-80 hover:opacity-100 hover:bg-white hover:border-slate-300'
      } ${className}`}
    >
      {/* Background Soft Ambient Light */}
      {(isUnlocked || achievement.currentProgress > 0) && (
        <div
          className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-15 pointer-events-none transition-opacity duration-300 group-hover:opacity-30"
          style={{ backgroundColor: achievement.glowColor }}
        />
      )}

      {/* Top Header Row: Rarity Pill & Rewards */}
      <div className="flex items-center justify-between mb-3 z-10 gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${rarityMeta.bgClass}`}
          >
            {rarityMeta.label}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
              glowStageColors[achievement.glowStage || (isUnlocked ? 'UNLOCKED' : 'LOCKED')]
            }`}
          >
            {glowStageLabels[achievement.glowStage || (isUnlocked ? 'UNLOCKED' : 'LOCKED')]}
          </span>
        </div>

        {/* XP & HP Badges */}
        <div className="flex items-center gap-1">
          {achievement.rewardXP > 0 && (
            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-black font-mono shadow-2xs">
              <span>+{achievement.rewardXP}</span>
              <span className="text-[9px]">XP</span>
            </span>
          )}
          {achievement.rewardHP > 0 && (
            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[10px] font-black font-mono shadow-2xs">
              <span className="material-symbols-outlined text-[11px]">bolt</span>
              <span>+{achievement.rewardHP}</span>
            </span>
          )}
        </div>
      </div>

      {/* Center 3D Preview / Badge */}
      <div className="my-1 relative flex items-center justify-center h-28 w-full">
        {isUnlocked || achievement.currentProgress > 0 ? (
          <GlowController
            baseColor={achievement.glowColor}
            rarity={achievement.rarity}
            currentProgress={achievement.currentProgress}
            targetProgress={achievement.targetProgress}
            isUnlocked={isUnlocked}
            isHovered={isHovered}
            className="w-24 h-24 flex items-center justify-center"
          >
            <AchievementModel
              type={achievement.modelType}
              rarity={achievement.rarity}
              glowColor={achievement.glowColor}
              currentProgress={achievement.currentProgress}
              targetProgress={achievement.targetProgress}
              isUnlocked={isUnlocked}
              autoRotate={true}
              scale={0.95}
              className="w-24 h-24"
            />
          </GlowController>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined text-4xl text-slate-400">
              {achievement.icon || 'lock'}
            </span>
          </div>
        )}
      </div>

      {/* Achievement Info */}
      <div className="z-10 mt-1">
        <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-primary transition-colors flex items-center gap-1.5 line-clamp-1">
          {achievement.name || achievement.title}
        </h4>
        <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
          {achievement.description}
        </p>
      </div>

      {/* Progress Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 z-10">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
          <span>
            {isUnlocked
              ? `Completed (${achievement.unlockDate || 'Active'})`
              : 'Target Progress'}
          </span>
          <span className="font-mono text-slate-800 font-bold">
            {achievement.currentProgress} / {achievement.targetProgress} {achievement.unit}
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isUnlocked
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'bg-gradient-to-r from-primary via-indigo-500 to-amber-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default AchievementCard;
