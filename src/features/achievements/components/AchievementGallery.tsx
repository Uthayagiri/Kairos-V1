import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAchievementProgress } from '../hooks/useAchievementProgress';
import { AchievementCard } from './AchievementCard';
import { AchievementFilters } from './AchievementFilters';
import { AchievementDetail } from './AchievementDetail';
import { UnlockAnimation } from './UnlockAnimation';
import { Achievement } from '../types/achievement.types';
import { calculateAchievementXpReward } from '../utils/achievementHelpers';
import { useProgression, getLevelTitle } from '../../progression';
import { AppTopBar } from '../../../components/AppTopBar';

export interface AchievementGalleryProps {
  userProfile?: { email: string; name: string } | null;
  onBack?: () => void;
}

const SERIES_META: Record<string, { icon: string; color: string; bg: string; description: string }> = {
  'Streak Achievements': {
    icon: 'local_fire_department',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/25',
    description: 'Circadian streak momentum'
  },
  'Kairos Loyalty / App Journey': {
    icon: 'calendar_month',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/25',
    description: 'Lifelong platform journey'
  },
  'Perfect Performance': {
    icon: 'star',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10 border-yellow-500/25',
    description: '100% daily task performance'
  },
  'Task Mastery': {
    icon: 'task_alt',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/25',
    description: 'High-volume quest and task execution'
  },
  'Zero-Overdue Achievements': {
    icon: 'schedule',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10 border-sky-500/25',
    description: 'Flawless time management and zero delays'
  },
  'Comeback Achievements': {
    icon: 'flight_takeoff',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/25',
    description: 'Resilience and streak recovery'
  },
  'Challenge Achievements': {
    icon: 'emoji_events',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/25',
    description: 'Competitive challenge mastery'
  },
  'AI Companion Achievements': {
    icon: 'smart_toy',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10 border-cyan-500/25',
    description: 'AI co-evolution and insights'
  },
  'Level Milestone Achievements': {
    icon: 'military_tech',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10 border-indigo-500/25',
    description: 'Energy level milestones'
  },
  'Ultra-Rare Lifetime Achievements': {
    icon: 'workspace_premium',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10 border-pink-500/25',
    description: 'Pinnacle lifetime milestones'
  }
};

export const AchievementGallery: React.FC<AchievementGalleryProps> = ({ userProfile, onBack }) => {
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
  } = useAchievementProgress(userProfile);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const progression = useProgression();
  const currentLevel = progression.level;
  const currentLevelTitle = progression.levelTitle || getLevelTitle(currentLevel);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2800);
  };

  const handleShare = (ach: Achievement) => {
    const title = ach.name || ach.title;
    const xpReward = calculateAchievementXpReward(ach.rarity, currentLevel);
    if (navigator.share) {
      navigator
        .share({
          title: `Kairos Achievement: ${title}`,
          text: `I just unlocked the "${title}" milestone in Kairos (+${xpReward} XP)!`,
          url: window.location.href
        })
        .catch(() => {
          showToast(`Shared "${title}" details!`);
        });
    } else {
      navigator.clipboard?.writeText(
        `Kairos Achievement: ${title} (+${xpReward} XP) - ${ach.description}`
      );
      showToast(`Copied "${title}" to clipboard!`);
    }
  };

  const handleUnlockAndNotify = (id: string) => {
    unlockAchievement(id);
    const target = achievements.find((a) => a.id === id);
    if (target) {
      const xpReward = calculateAchievementXpReward(target.rarity, currentLevel);
      showToast(`Milestone "${target.name || target.title}" Unlocked! +${xpReward} XP`);
    }
  };

  // Group filtered achievements orderly by Title / Series
  const groupedAchievements = useMemo(() => {
    const map = new Map<string, Achievement[]>();
    filteredAchievements.forEach((ach) => {
      const titleKey = ach.seriesTitle || 'General Milestones';
      if (!map.has(titleKey)) {
        map.set(titleKey, []);
      }
      map.get(titleKey)!.push(ach);
    });
    return Array.from(map.entries());
  }, [filteredAchievements]);

  return (
    <div className="w-full h-full bg-surface font-body-md text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed antialiased relative overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fadeIn">
          <div className="bg-on-surface text-surface-container-lowest px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold max-w-[90%] border border-surface-container-high/20 backdrop-blur-md">
            <span className="material-symbols-outlined text-primary-fixed text-base">verified</span>
            <span className="truncate">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header App Bar (Left: Back Arrow Head in front of Orb + Splash Orb + Title/Subtitle) */}
      <AppTopBar
        subtitle="Achievements & Mastery"
        onBack={onBack}
        rightAction={
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-primary font-bold text-[11px]">
              <span className="material-symbols-outlined text-[13px]">stars</span>
              <span>{stats.earnedXp} XP</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high/60 text-on-surface-variant font-bold text-[11px]">
              <span className="material-symbols-outlined text-[13px]">military_tech</span>
              <span>{stats.unlocked}/{stats.total}</span>
            </div>
          </div>
        }
      />

      {/* Main Mobile Scroll Canvas */}
      <main className="flex-1 flex flex-col relative w-full pt-3 pb-8 px-4 bg-surface overflow-y-auto mobile-scroll">
        <div className="flex flex-col w-full gap-3.5 max-w-[420px] mx-auto relative">
          {/* Ambient Glows */}
          <div className="relative w-full pointer-events-none">
            <div className="absolute -top-10 -left-8 w-44 h-44 rounded-full bg-primary-fixed blur-3xl opacity-40" />
            <div className="absolute top-20 -right-8 w-48 h-48 rounded-full bg-secondary-fixed blur-3xl opacity-30" />
          </div>

          {/* Hero Progress Card (Mobile Scaled) */}
          <div className="relative rounded-3xl p-4 overflow-hidden bg-gradient-to-br from-primary via-indigo-600 to-purple-700 text-white shadow-md border border-surface-container-high/30">
            {/* Ambient Cosmic Light */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-pink-500/25 blur-2xl pointer-events-none" />
            <div className="absolute left-1/4 -top-8 w-32 h-32 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-200">
                  <span className="material-symbols-outlined text-sm">military_tech</span>
                  <span>Neural Mastery</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold font-mono">
                  {stats.unlocked} / {stats.total} Unlocked
                </span>
              </div>

              <div>
                <h2 className="text-lg font-black text-white leading-tight">
                  Level {currentLevel} • {currentLevelTitle}
                </h2>
                <p className="text-[11px] text-indigo-100/90 leading-snug mt-0.5">
                  Complete each Title series from Common to Mythic medals.
                </p>
              </div>

              {/* 3 Compact Stat Badges */}
              <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-center">
                <div>
                  <div className="text-base font-black font-mono text-white leading-tight">{stats.completionPercentage}%</div>
                  <div className="text-[9px] uppercase font-bold text-indigo-100">Progress</div>
                </div>
                <div className="border-x border-white/15">
                  <div className="text-base font-black font-mono text-amber-300 leading-tight">+{stats.earnedXp}</div>
                  <div className="text-[9px] uppercase font-bold text-indigo-100">Total XP</div>
                </div>
                <div>
                  <div className="text-base font-black font-mono text-teal-300 leading-tight">{stats.unlocked}/{stats.total}</div>
                  <div className="text-[9px] uppercase font-bold text-indigo-100">Medals</div>
                </div>
              </div>

              {/* Compact Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-black/25 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-pink-300 to-teal-200 shadow-sm transition-all duration-700"
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

          {/* Achievement Cards Grouped by Title with 2 Medals Per Row */}
          {groupedAchievements.length > 0 ? (
            <div className="flex flex-col gap-5 w-full">
              {groupedAchievements.map(([titleName, items]) => {
                const meta = SERIES_META[titleName] || {
                  icon: 'military_tech',
                  color: 'text-primary',
                  bg: 'bg-primary/10 border-primary/20',
                  description: 'Milestone progression'
                };
                const unlockedInSeries = items.filter((a) => a.unlocked || a.isUnlocked).length;
                const seriesCompletion = Math.round((unlockedInSeries / items.length) * 100);

                return (
                  <section key={titleName} className="flex flex-col gap-2.5 w-full">
                    {/* Title / Series Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 ${meta.bg}`}>
                          <span className={`material-symbols-outlined text-base ${meta.color}`}>
                            {meta.icon}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-black text-on-surface uppercase tracking-wider truncate">
                            {titleName}
                          </h3>
                          <p className="text-[9.5px] text-on-surface-variant line-clamp-1">
                            {meta.description} • Common to Mythic
                          </p>
                        </div>
                      </div>

                      {/* Series Progress Pill */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-on-surface">
                          {unlockedInSeries}/{items.length}
                        </span>
                        <div className="w-10 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${seriesCompletion}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2 Achievements in a Single Row (2-Column Grid) */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
                      {items.map((ach) => (
                        <AchievementCard
                          key={ach.id}
                          achievement={ach}
                          onSelect={setSelectedAchievement}
                          onUnlock={handleUnlockAndNotify}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center rounded-2xl bg-surface-container-low border border-surface-container-high/40 p-6">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">
                search_off
              </span>
              <h3 className="text-sm font-bold text-on-surface">
                No milestones found
              </h3>
              <p className="text-xs text-on-surface-variant max-w-xs mx-auto mt-0.5 mb-3">
                Try adjusting your search query or resetting filters.
              </p>
              <button
                onClick={resetFilters}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-sm active:scale-95 cursor-pointer border-none"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Interactive Detail Modal (Mobile Scaled) */}
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

      {/* Unlock Celebration Fireworks Modal (Mobile Scaled) */}
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
