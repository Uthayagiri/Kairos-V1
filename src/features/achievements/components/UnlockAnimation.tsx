import React, { useEffect, useState } from 'react';
import { Achievement } from '../types/achievement.types';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';
import { calculateAchievementXpReward } from '../utils/achievementHelpers';
import { progressionManager } from '../../progression/services/progressionManager';
import { AchievementScene } from './AchievementScene';
import { PhoenixWingsMedalAnimation } from './PhoenixWingsMedalAnimation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface UnlockAnimationProps {
  achievement: Achievement | null;
  onClose: () => void;
  onInspect?: (achievement: Achievement) => void;
}

export const UnlockAnimation: React.FC<UnlockAnimationProps> = ({
  achievement,
  onClose,
  onInspect
}) => {
  const [viewMode, setViewMode] = useState<'phoenix' | '3d'>('phoenix');
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    if (achievement) {
      try {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      } catch {
        // Web fallback
      }
    }
  }, [achievement]);

  if (!achievement) return null;

  const rarityMeta = ACHIEVEMENT_RARITIES[achievement.rarity] || ACHIEVEMENT_RARITIES.common;
  const currentLevel = progressionManager.getState().level;
  const xpReward = calculateAchievementXpReward(achievement.rarity, currentLevel);

  const handleReplay = () => {
    try {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } catch {}
    setReplayKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-xl animate-fadeIn">
      {/* Ambient Pulsing Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className="w-72 h-72 rounded-full blur-3xl opacity-25 animate-pulse"
          style={{ backgroundColor: achievement.glowColor || '#ff7800' }}
        />
        <div className="absolute w-[380px] h-[380px] rounded-full border border-primary/15 animate-spin [animation-duration:20s]" />
      </div>

      {/* Main Dialog Card (Mobile Sized) */}
      <div className="relative w-full max-w-[340px] rounded-3xl bg-surface-container-lowest border border-surface-container-high/40 p-5 text-center flex flex-col items-center shadow-2xl z-10 animate-scaleUp">
        {/* Top Header Pill */}
        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary text-[11px] font-black uppercase tracking-wider mb-2 animate-bounce shadow-2xs">
          <span className="material-symbols-outlined text-xs">auto_awesome</span>
          <span>Milestone Unlocked</span>
        </div>

        {/* Rarity & Title */}
        <span
          className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-1.5 ${rarityMeta.bgClass}`}
        >
          {rarityMeta.label} Tier
        </span>

        <h2 className="text-lg font-black text-on-surface tracking-tight mb-1">
          {achievement.name || achievement.title}
        </h2>

        <p className="text-[11px] text-on-surface-variant max-w-xs leading-snug mb-3">
          {achievement.description}
        </p>

        {/* Medal Showcase Container (Phoenix Wings Unfold Animation by default) */}
        <div className="w-full mb-3 relative rounded-2xl bg-radial from-surface-container-high/40 to-surface-container-lowest/90 border border-surface-container-high/30 p-2 overflow-hidden flex flex-col items-center justify-center min-h-[190px]">
          {viewMode === 'phoenix' ? (
            <div className="relative w-full h-44 flex items-center justify-center">
              <PhoenixWingsMedalAnimation
                key={replayKey}
                unlocked={true}
                rarity={achievement.rarity}
                glowColor={achievement.glowColor}
                triggerKey={replayKey}
                size={185}
                title={achievement.name || achievement.title}
                level={achievement.tier * 2 + 2}
                tier={achievement.tier}
                xpReward={xpReward}
                hpReward={0}
              />
              {/* Replay Unfold Button */}
              <button
                onClick={handleReplay}
                type="button"
                className="absolute top-1 right-1 px-2 py-0.5 rounded-full bg-surface-container-high/60 hover:bg-surface-container-high text-[9px] font-bold text-on-surface cursor-pointer border-none flex items-center gap-1 transition-all shadow-xs"
                title="Replay wing unfold animation"
              >
                <span className="material-symbols-outlined text-[11px]">replay</span>
                <span>Unfold</span>
              </button>
            </div>
          ) : (
            <div className="w-full h-44">
              <AchievementScene
                modelType={achievement.modelType}
                rarity={achievement.rarity}
                glowColor={achievement.glowColor}
                currentProgress={achievement.targetProgress}
                targetProgress={achievement.targetProgress}
                isUnlocked={true}
                particleColor={achievement.particleColor}
                height="h-44"
                interactive={true}
              />
            </div>
          )}

          {/* View Mode Toggle Pill */}
          <div className="flex items-center gap-1 mt-1 bg-surface-container-low p-0.5 rounded-full border border-surface-container-high/30">
            <button
              onClick={() => setViewMode('phoenix')}
              type="button"
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold cursor-pointer border-none transition-all ${
                viewMode === 'phoenix'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface bg-transparent'
              }`}
            >
              Phoenix Wings
            </button>
            <button
              onClick={() => setViewMode('3d')}
              type="button"
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold cursor-pointer border-none transition-all ${
                viewMode === '3d'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface bg-transparent'
              }`}
            >
              3D Orbit
            </button>
          </div>
        </div>

        {/* Rewards Box (XP Only, NO HP) */}
        <div className="w-full py-2.5 px-3 rounded-2xl bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between mb-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black shadow-xs">
              <span className="material-symbols-outlined text-base">stars</span>
            </div>
            <div className="text-left">
              <div className="text-[9px] uppercase font-bold text-on-surface-variant">Rewards</div>
              <div className="text-xs font-black text-on-surface font-mono flex items-center gap-1.5">
                <span className="text-primary">+{xpReward} XP</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="material-symbols-outlined text-xs">verified</span>
            <span>Applied</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs tracking-wide shadow-md shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer border-none"
            type="button"
          >
            Claim Reward &amp; Continue
          </button>
          {onInspect && (
            <button
              onClick={() => {
                onClose();
                onInspect(achievement);
              }}
              className="w-full py-2 px-3 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-colors cursor-pointer border-none"
              type="button"
            >
              Inspect Collectible Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnlockAnimation;
