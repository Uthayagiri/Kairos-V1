import React, { useState } from 'react';
import { useAchievementProgress } from '../hooks/useAchievementProgress';
import { AchievementCard } from './AchievementCard';
import { AchievementFilters } from './AchievementFilters';
import { AchievementDetail } from './AchievementDetail';
import { UnlockAnimation } from './UnlockAnimation';
import { Achievement } from '../types/achievement.types';

export interface AchievementGalleryProps {
  onBack?: () => void;
}

export const AchievementGallery: React.FC<AchievementGalleryProps> = ({ onBack }) => {
  const {
    achievements,
    filteredAchievements,
    stats,
    filters,
    selectedAchievement,
    setSelectedAchievement,
    unlockedForCelebration,
    closeCelebration,
    setSearchQuery,
    setCategory,
    setRarity,
    setStatus,
    setSortBy,
    resetFilters,
    unlockAchievement
  } = useAchievementProgress();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleShare = (ach: Achievement) => {
    const title = ach.name || ach.title;
    if (navigator.share) {
      navigator
        .share({
          title: `Kairos Achievement: ${title}`,
          text: `I just unlocked the "${title}" milestone in Kairos (+${ach.rewardXP} XP / +${ach.rewardHP} HP)!`,
          url: window.location.href
        })
        .catch(() => {
          showToast(`Shared "${title}" details!`);
        });
    } else {
      navigator.clipboard?.writeText(
        `Kairos Achievement: ${title} (+${ach.rewardXP} XP / +${ach.rewardHP} HP) - ${ach.description}`
      );
      showToast(`Copied "${title}" to clipboard!`);
    }
  };

  const handleUnlockAndNotify = (id: string) => {
    unlockAchievement(id);
    const target = achievements.find((a) => a.id === id);
    if (target) {
      showToast(`Milestone "${target.name || target.title}" Unlocked! +${target.rewardXP} XP`);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-slate-900 pb-28 pt-safe">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-fadeIn border border-white/15">
          <span className="material-symbols-outlined text-sm text-amber-400">
            verified
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation App Bar */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Back to Profile"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>KAIROS — ACHIEVEMENTS</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-black uppercase tracking-wider">
                    3D Engine
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold tracking-wide">
                BETTER TODAY. GREATER TOMORROW.
              </p>
            </div>
          </div>

          {/* Aggregate Stats Badges */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-800 font-bold text-xs shadow-2xs">
              <span className="material-symbols-outlined text-sm text-indigo-600">stars</span>
              <span>
                <strong className="font-mono">{stats.earnedXp}</strong> XP
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 font-bold text-xs shadow-2xs">
              <span className="material-symbols-outlined text-sm text-amber-600">bolt</span>
              <span>
                <strong className="font-mono text-amber-700">{stats.earnedHp}</strong> / {stats.totalHpAvailable} HP
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Hero Progress Banner */}
        <div className="relative rounded-3xl p-6 sm:p-8 mb-8 overflow-hidden bg-gradient-to-br from-primary via-indigo-600 to-purple-700 text-white shadow-[0_16px_36px_-6px_rgba(79,70,229,0.25)]">
          {/* Ambient Cosmic Lights */}
          <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-pink-500/25 blur-3xl pointer-events-none" />
          <div className="absolute left-1/4 -top-10 w-64 h-64 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-200">
                <span className="material-symbols-outlined text-base">military_tech</span>
                <span>Neural Mastery Progression</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Level 14 • Luminary Vanguard
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                You have unlocked <strong className="text-white font-bold">{stats.unlocked}</strong> of{' '}
                <strong className="text-white font-bold">{stats.total}</strong> lifetime milestones.
                Unbroken daily execution elevates your badges into radiant Mythic artifacts.
              </p>
            </div>

            {/* Stat Ring Display */}
            <div className="flex items-center gap-4 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-inner">
              <div className="text-center px-2">
                <div className="text-2xl font-black font-mono text-white">{stats.completionPercentage}%</div>
                <div className="text-[10px] uppercase font-bold text-indigo-100">Unlocked</div>
              </div>
              <div className="h-8 w-px bg-white/25" />
              <div className="text-center px-2">
                <div className="text-2xl font-black font-mono text-amber-300">+{stats.earnedXp}</div>
                <div className="text-[10px] uppercase font-bold text-indigo-100">Total XP</div>
              </div>
              <div className="h-8 w-px bg-white/25" />
              <div className="text-center px-2">
                <div className="text-2xl font-black font-mono text-teal-300">+{stats.earnedHp}</div>
                <div className="text-[10px] uppercase font-bold text-indigo-100">HP Boost</div>
              </div>
            </div>
          </div>

          {/* Progress Bar inside Hero */}
          <div className="relative z-10 mt-6">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-100 mb-1.5">
              <span>Overall Milestone Completion</span>
              <span className="font-mono">
                {stats.unlocked} / {stats.total} Unlocked
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-pink-300 to-teal-200 shadow-[0_0_12px_rgba(253,224,71,0.7)] transition-all duration-1000 ease-out"
                style={{ width: `${stats.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <AchievementFilters
          filters={filters}
          onSearchChange={setSearchQuery}
          onCategoryChange={setCategory}
          onRarityChange={setRarity}
          onStatusChange={setStatus}
          onSortChange={setSortBy}
          onReset={resetFilters}
          totalCount={achievements.length}
          filteredCount={filteredAchievements.length}
        />

        {/* Achievement Cards Grid */}
        {filteredAchievements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAchievements.map((ach) => (
              <AchievementCard
                key={ach.id}
                achievement={ach}
                onSelect={setSelectedAchievement}
                onUnlock={handleUnlockAndNotify}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 p-8 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">
              search_off
            </span>
            <h3 className="text-lg font-bold text-slate-800">
              No milestones found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Try adjusting your search query, selecting different categories, or resetting rarity filters.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-2xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all cursor-pointer border-none"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Interactive Detail Modal */}
      {selectedAchievement && (
        <AchievementDetail
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
          onUnlock={(id) => {
            handleUnlockAndNotify(id);
            const target = achievements.find((a) => a.id === id);
            if (target) {
              setSelectedAchievement({
                ...target,
                unlocked: true,
                isUnlocked: true,
                glowStage: 'UNLOCKED',
                currentProgress: target.targetProgress
              });
            }
          }}
          onShare={handleShare}
        />
      )}

      {/* Unlock Celebration Fireworks Modal */}
      {unlockedForCelebration && (
        <UnlockAnimation
          achievement={unlockedForCelebration}
          onClose={closeCelebration}
          onInspect={(ach) => {
            setSelectedAchievement(ach);
          }}
        />
      )}
    </div>
  );
};

export default AchievementGallery;
