import React, { useEffect } from 'react';
import { Achievement } from '../types/achievement.types';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';
import { ACHIEVEMENT_CATEGORIES } from '../data/categories';
import { getProgressPercentage } from '../utils/achievementHelpers';
import { AchievementScene } from './AchievementScene';

export interface AchievementDetailProps {
  achievement: Achievement | null;
  onClose: () => void;
  onUnlock?: (id: string) => void;
  onShare?: (achievement: Achievement) => void;
}

export const AchievementDetail: React.FC<AchievementDetailProps> = ({
  achievement,
  onClose,
  onUnlock,
  onShare
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!achievement) return null;

  const rarityMeta = ACHIEVEMENT_RARITIES[achievement.rarity] || ACHIEVEMENT_RARITIES.common;
  const categoryMeta = ACHIEVEMENT_CATEGORIES.find((c) => c.id === achievement.category);
  const isUnlocked = achievement.unlocked || achievement.isUnlocked || false;
  const progressPct = getProgressPercentage(achievement);

  const glowStageLabels = {
    LOCKED: 'Locked',
    DISCOVERED: 'Discovered',
    IN_PROGRESS: 'In Progress',
    NEAR_COMPLETION: 'Near Completion',
    UNLOCKED: 'Unlocked'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Light Frosted Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-slate-200 shadow-2xl z-10 p-6 sm:p-8 flex flex-col no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors z-20 cursor-pointer"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Top Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${rarityMeta.bgClass}`}
          >
            {rarityMeta.label}
          </span>
          {categoryMeta && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <span className="material-symbols-outlined text-sm">{categoryMeta.icon}</span>
              <span>{categoryMeta.label}</span>
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Glow: {glowStageLabels[achievement.glowStage || (isUnlocked ? 'UNLOCKED' : 'LOCKED')]}
          </span>
        </div>

        {/* 3D WebGL Studio Showcase Scene */}
        <div className="mb-5 w-full">
          <AchievementScene
            modelType={achievement.modelType}
            rarity={achievement.rarity}
            glowColor={achievement.glowColor}
            currentProgress={achievement.currentProgress}
            targetProgress={achievement.targetProgress}
            isUnlocked={isUnlocked}
            particleColor={achievement.particleColor}
            height="h-72"
            interactive={true}
          />
        </div>

        {/* Title and Rewards Row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {achievement.name || achievement.title}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Tier {achievement.tier} Milestone • Model: {achievement.modelType.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {achievement.rewardXP > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-black text-xs font-mono shadow-2xs">
                <span>+{achievement.rewardXP} XP</span>
              </div>
            )}
            {achievement.rewardHP > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 font-black text-xs font-mono shadow-2xs">
                <span className="material-symbols-outlined text-sm">bolt</span>
                <span>+{achievement.rewardHP} HP</span>
              </div>
            )}
          </div>
        </div>

        {/* Flavor Lore Quote */}
        {achievement.flavorText && (
          <div className="my-2.5 p-3.5 rounded-2xl bg-primary-fixed/20 border-l-4 border-primary text-xs italic text-slate-700 leading-relaxed font-serif">
            {achievement.flavorText}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          {achievement.description}
        </p>

        {/* Progress Matrix */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
            <span>Milestone Completion</span>
            <span className="font-mono text-slate-900 font-bold">
              {achievement.currentProgress} / {achievement.targetProgress} {achievement.unit} ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isUnlocked
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-primary via-indigo-500 to-amber-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Status</span>
            <span className={`font-bold ${isUnlocked ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isUnlocked
                ? `Unlocked (${achievement.unlockDate || 'Active'})`
                : `${achievement.targetProgress - achievement.currentProgress} ${achievement.unit} remaining`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {!isUnlocked && onUnlock && (
            <button
              onClick={() => onUnlock(achievement.id)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white font-black text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              <span>Test Unlock Milestone</span>
            </button>
          )}

          <button
            onClick={() => onShare && onShare(achievement)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            <span>Share Trophy</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementDetail;
