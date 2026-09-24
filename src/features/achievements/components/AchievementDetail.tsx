import React, { useEffect, useState } from 'react';
import { Achievement } from '../types/achievement.types';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';
import { ACHIEVEMENT_CATEGORIES } from '../data/categories';
import { getProgressPercentage, calculateAchievementXpReward } from '../utils/achievementHelpers';
import { progressionManager } from '../../progression/services/progressionManager';
import { AchievementScene } from './AchievementScene';
import { AchievementViewer } from '../3d/AchievementViewer';
import { PhoenixWingsMedalAnimation } from './PhoenixWingsMedalAnimation';

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
  const [displayMode, setDisplayMode] = useState<'phoenix' | '3d'>('phoenix');
  const [replayCount, setReplayCount] = useState(0);

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
  const progressRatio = achievement.targetProgress > 0 ? achievement.currentProgress / achievement.targetProgress : 0;
  const progressPct = getProgressPercentage(achievement);
  const achievementName = achievement.name || achievement.title || 'Achievement';
  const currentLevel = progressionManager.getState().level;
  const xpReward = calculateAchievementXpReward(achievement.rarity, currentLevel);

  const glowStageLabels = {
    LOCKED: 'Locked',
    DISCOVERED: 'Discovered',
    IN_PROGRESS: 'In Progress',
    NEAR_COMPLETION: 'Near Done',
    UNLOCKED: 'Unlocked'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md animate-fadeIn">
      {/* Light Frosted Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 transition-opacity"
      />

      {/* Modal Dialog Card (Mobile Scaled) */}
      <div className="relative w-full max-w-[360px] max-h-[85vh] overflow-y-auto rounded-3xl bg-surface-container-lowest border border-surface-container-high/40 shadow-2xl z-10 p-4 flex flex-col no-scrollbar animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors z-20 cursor-pointer border-none"
          aria-label="Close"
          type="button"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>

        {/* Top Badges */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap pr-8">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${rarityMeta.bgClass}`}
          >
            {rarityMeta.label}
          </span>
          {categoryMeta && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface border border-surface-container-high/40">
              <span className="material-symbols-outlined text-xs">{categoryMeta.icon}</span>
              <span>{categoryMeta.label}</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-surface-container text-on-surface-variant border border-surface-container-high/30">
            {glowStageLabels[achievement.glowStage || (isUnlocked ? 'UNLOCKED' : 'LOCKED')]}
          </span>
        </div>

        {/* Collectible Medal Showcase Scene */}
        <div className="mb-3 w-full shrink-0 h-48 relative rounded-2xl overflow-hidden border border-surface-container-high/40 shadow-sm bg-[#06060c] flex flex-col items-center justify-center">
          {displayMode === 'phoenix' ? (
            <div className="w-full h-full flex items-center justify-center relative">
              <PhoenixWingsMedalAnimation
                key={replayCount}
                unlocked={isUnlocked}
                rarity={achievement.rarity}
                glowColor={achievement.glowColor}
                triggerKey={replayCount}
                size={185}
                title={achievementName}
                level={achievement.tier * 2 + (isUnlocked ? 2 : 0) || 5}
                tier={achievement.tier}
                xpReward={xpReward}
                hpReward={0}
              />
              <button
                onClick={() => setReplayCount((c) => c + 1)}
                type="button"
                className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[9px] font-bold text-white cursor-pointer border border-white/20 flex items-center gap-1 transition-all"
                title="Replay wing unfold animation"
              >
                <span className="material-symbols-outlined text-[11px]">replay</span>
                <span>Unfold</span>
              </button>
            </div>
          ) : (
            <AchievementViewer
              key={achievement.id}
              id={achievement.id}
              name={achievementName}
              url={achievement.modelUrl || '/models/valor-medal.glb'}
              rarity={achievement.rarity}
              modelType={achievement.modelType}
              category={achievement.category}
              progress={progressRatio}
              unlocked={isUnlocked}
              forceTrigger={replayCount}
              height="100%"
              className="w-full h-full"
              fallback={
                <AchievementScene
                  modelType={achievement.modelType}
                  rarity={achievement.rarity}
                  glowColor={achievement.glowColor}
                  currentProgress={achievement.currentProgress}
                  targetProgress={achievement.targetProgress}
                  isUnlocked={isUnlocked}
                  particleColor={achievement.particleColor}
                  height="h-48"
                  interactive={true}
                />
              }
            />
          )}

          {/* Display Mode Switcher Pill */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md p-0.5 rounded-full border border-white/15 z-10">
            <button
              onClick={() => setDisplayMode('phoenix')}
              type="button"
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer border-none transition-all ${
                displayMode === 'phoenix'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-white/70 hover:text-white bg-transparent'
              }`}
            >
              Phoenix Wings
            </button>
            <button
              onClick={() => setDisplayMode('3d')}
              type="button"
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer border-none transition-all ${
                displayMode === '3d'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-white/70 hover:text-white bg-transparent'
              }`}
            >
              3D Orbit
            </button>
          </div>
        </div>

        {/* Title and Rewards Row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-on-surface tracking-tight leading-tight truncate">
              {achievement.name || achievement.title}
            </h3>
            <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
              Tier {achievement.tier} • {achievement.modelType.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-xl bg-primary-fixed text-primary font-black text-[11px] font-mono shadow-2xs">
              <span>+{xpReward} XP</span>
            </div>
          </div>
        </div>

        {/* Flavor Lore Quote */}
        {achievement.flavorText && (
          <div className="my-1.5 p-2 rounded-xl bg-primary-fixed/20 border-l-2 border-primary text-[11px] italic text-on-surface-variant leading-relaxed font-serif">
            {achievement.flavorText}
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
          {achievement.description}
        </p>

        {/* Progress Matrix */}
        <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-high/40 mb-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-on-surface mb-1.5">
            <span>Milestone Completion</span>
            <span className="font-mono text-primary font-bold">
              {achievement.currentProgress} / {achievement.targetProgress} {achievement.unit} ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isUnlocked
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm'
                  : 'bg-gradient-to-r from-primary via-indigo-500 to-secondary'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-on-surface-variant">
            <span>Status</span>
            <span className={`font-bold ${isUnlocked ? 'text-emerald-700' : 'text-primary'}`}>
              {isUnlocked
                ? `Unlocked (${achievement.unlockDate || 'Active'})`
                : `${achievement.targetProgress - achievement.currentProgress} ${achievement.unit} remaining`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {!isUnlocked && onUnlock ? (
            <button
              onClick={() => onUnlock(achievement.id)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
              type="button"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span>Test Unlock</span>
            </button>
          ) : (
            <button
              onClick={() => setReplayCount((c) => c + 1)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
              type="button"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span>Replay Wings</span>
            </button>
          )}

          <button
            onClick={() => onShare && onShare(achievement)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-surface-container border border-surface-container-high/50 text-on-surface font-bold text-xs hover:bg-surface-container-high active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">share</span>
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementDetail;
