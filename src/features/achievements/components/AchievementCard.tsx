import React, { useState } from 'react';
import { Achievement } from '../types/achievement.types';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';
import { getProgressPercentage, calculateAchievementXpReward } from '../utils/achievementHelpers';
import { progressionManager } from '../../progression/services/progressionManager';
import { CardBadgePreview } from './CardBadgePreview';

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
  const currentLevel = progressionManager.getState().level;
  const xpReward = calculateAchievementXpReward(achievement.rarity, currentLevel);

  const glowStageLabels = {
    LOCKED: 'Locked',
    DISCOVERED: 'Discovered',
    IN_PROGRESS: 'In Progress',
    NEAR_COMPLETION: 'Near Done',
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
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden p-2.5 flex flex-col justify-between ${
        isUnlocked
          ? 'bg-surface-container-lowest border-surface-container-high/60 shadow-xs hover:shadow-md hover:border-primary/40 active:scale-[0.98]'
          : achievement.currentProgress > 0
          ? 'bg-surface-container-lowest/90 border-surface-container-high/50 shadow-2xs hover:border-primary/30 active:scale-[0.98]'
          : 'bg-surface-container-low/50 border-dashed border-surface-container-high/40 opacity-80 hover:opacity-100'
      } ${className}`}
    >
      {/* Background Soft Ambient Light */}
      {(isUnlocked || achievement.currentProgress > 0) && (
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none transition-opacity duration-300 group-hover:opacity-25"
          style={{ backgroundColor: achievement.glowColor }}
        />
      )}

      {/* Top Header Row: Rarity Pill & Rewards */}
      <div className="flex items-center justify-between mb-1.5 z-10 gap-1 min-w-0">
        <span
          className={`px-1.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider shrink-0 ${rarityMeta.bgClass}`}
        >
          {rarityMeta.label}
        </span>

        {/* XP Badge (XP only, NO HP) */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary-fixed/40 text-primary text-[8px] font-bold font-mono">
            <span>+{xpReward}</span>
            <span className="text-[6.5px]">XP</span>
          </span>
        </div>
      </div>

      {/* Center 3D Collectible Medal Preview */}
      <div className="my-0.5 relative flex items-center justify-center h-20 w-full">
        <CardBadgePreview
          id={achievement.id}
          name={achievement.name || achievement.title || 'Achievement'}
          rarity={achievement.rarity}
          modelType={achievement.modelType}
          category={achievement.category}
          glowColor={achievement.glowColor}
          currentProgress={achievement.currentProgress}
          targetProgress={achievement.targetProgress}
          unlocked={isUnlocked}
          className="w-full h-full"
        />
      </div>

      {/* Achievement Info */}
      <div className="z-10 mt-1">
        <h4 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors flex items-center gap-1 line-clamp-1">
          {achievement.name || achievement.title}
        </h4>
        <p className="text-[10px] text-on-surface-variant line-clamp-2 mt-0.5 leading-snug">
          {achievement.description}
        </p>
      </div>

      {/* Progress Footer */}
      <div className="mt-2 pt-1.5 border-t border-surface-container-high/30 z-10">
        <div className="flex items-center justify-between text-[8.5px] font-semibold text-on-surface-variant mb-1">
          <span className="truncate max-w-[70px]">
            {isUnlocked ? 'Unlocked' : 'Progress'}
          </span>
          <span className="font-mono text-on-surface font-bold text-[9px]">
            {achievement.currentProgress}/{achievement.targetProgress} {achievement.unit}
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-1 rounded-full bg-surface-container-high overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isUnlocked
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm'
                : 'bg-gradient-to-r from-primary via-indigo-500 to-secondary'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default AchievementCard;
