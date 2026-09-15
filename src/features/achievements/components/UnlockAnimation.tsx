import React, { useEffect } from 'react';
import { Achievement } from '../types/achievement.types';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';
import { AchievementScene } from './AchievementScene';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xl animate-fadeIn">
      {/* Ambient Pulsing Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className="w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ backgroundColor: achievement.glowColor }}
        />
        <div className="absolute w-[500px] h-[500px] rounded-full border border-primary/10 animate-spin [animation-duration:20s]" />
      </div>

      {/* Main Dialog Card */}
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 text-center flex flex-col items-center shadow-2xl z-10">
        {/* Top Header Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-black uppercase tracking-widest mb-3 animate-bounce shadow-xs">
          <span className="material-symbols-outlined text-sm text-amber-600">auto_awesome</span>
          <span>Milestone Unlocked</span>
        </div>

        {/* Rarity & Title */}
        <span
          className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 ${rarityMeta.bgClass}`}
        >
          {rarityMeta.label} Tier
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
          {achievement.name || achievement.title}
        </h2>

        <p className="text-xs text-slate-600 max-w-xs leading-relaxed mb-4">
          {achievement.description}
        </p>

        {/* 3D Model Showcase */}
        <div className="w-full mb-5">
          <AchievementScene
            modelType={achievement.modelType}
            rarity={achievement.rarity}
            glowColor={achievement.glowColor}
            currentProgress={achievement.targetProgress}
            targetProgress={achievement.targetProgress}
            isUnlocked={true}
            particleColor={achievement.particleColor}
            height="h-56"
            interactive={true}
          />
        </div>

        {/* Rewards Box */}
        <div className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-50 via-purple-50/50 to-amber-50 border border-amber-200/90 flex items-center justify-between mb-6 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black shadow-md">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-amber-800">Rewards Granted</div>
              <div className="text-base font-black text-slate-900 font-mono flex items-center gap-2">
                {achievement.rewardXP > 0 && <span className="text-indigo-600">+{achievement.rewardXP} XP</span>}
                {achievement.rewardHP > 0 && <span className="text-amber-600">+{achievement.rewardHP} HP</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
            <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
            <span>Applied</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary via-indigo-600 to-primary text-white font-black text-sm tracking-wide shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-none"
          >
            Claim Reward & Continue
          </button>
          {onInspect && (
            <button
              onClick={() => {
                onClose();
                onInspect(achievement);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer border-none"
            >
              Inspect 3D Collectible
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnlockAnimation;
