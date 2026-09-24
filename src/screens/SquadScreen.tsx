import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppTopBar } from '../components/AppTopBar';
import { useProgression } from '../features/progression';
import { checkTaskTimeWindow, formatDisplayTime, formatDateToISO } from './TasksScreen';
import {
  useSquad,
  Squad,
  SquadMember,
  SquadContribution,
  Challenge as SquadChallenge,
  ChallengeStatusInfo as SquadChallengeStatusInfo,
  STORAGE_KEY_SQUAD_STATE,
  STORAGE_KEY_LEGACY_CHALLENGES,
  computeChallengeStatusForDate as computeSquadChallengeStatus,
  formatDateToLocalISO,
  addDaysToLocalISO,
  formatDateRange as formatSquadDateRange,
  PRESET_CHALLENGES as SQUAD_PRESET_CHALLENGES,
  INITIAL_SQUAD_MEMBERS,
  squadService
} from '../features/squad';

interface SquadScreenProps {
  userProfile?: { email: string; name: string } | null;
  onNavigateTab?: (tab: string) => void;
  onOpenConnections?: () => void;
}

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  isCurrentUser?: boolean;
  avatar: string;
  xp: number;
  tasksCount: number;
  statusText?: string;
  isOnline?: boolean;
  tag?: string;
}

export type Challenge = SquadChallenge;
export type ChallengeStatusInfo = SquadChallengeStatusInfo;

export const LEADERBOARD_DATA: LeaderboardUser[] = INITIAL_SQUAD_MEMBERS.map((m, idx) => ({
  id: m.id,
  rank: idx + 1,
  name: m.name,
  isCurrentUser: m.isCurrentUser,
  avatar: m.avatar,
  xp: m.xp || 2000,
  tasksCount: m.tasksCount || 20,
  statusText: m.statusText,
  isOnline: m.isOnline,
  tag: m.tag
}));

export const getTodayString = () => {
  return formatDateToLocalISO();
};

export const addDaysToString = (dateStr: string, days: number) => {
  return addDaysToLocalISO(dateStr, days);
};

export const formatDateRange = formatSquadDateRange;

export const formatTimeRange = (start?: string, end?: string, isAllDay?: boolean) => {
  if (isAllDay) return 'All Day (Flexible)';
  if (!start && !end) return 'Daily Window';
  const formatSingle = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hour12 = hr % 12 === 0 ? 12 : hr % 12;
    return `${hour12}:${m || '00'} ${ampm}`;
  };
  if (start && end) return `${formatSingle(start)} - ${formatSingle(end)}`;
  return formatSingle(start || end);
};

export const computeChallengeStatusForDate = computeSquadChallengeStatus;

export const STORAGE_KEY_SQUAD_CHALLENGES = STORAGE_KEY_LEGACY_CHALLENGES;

export const loadSquadChallenges = (initial: Challenge[]): Challenge[] => {
  return squadService.getChallenges() || initial;
};

export const saveSquadChallenges = (challenges: Challenge[]) => {
  const current = squadService.getState();
  squadService.saveSquadState({
    ...current,
    challenges
  });
};

const PRESET_CHALLENGES = SQUAD_PRESET_CHALLENGES;

export const SquadScreen: React.FC<SquadScreenProps> = ({
  userProfile,
  onNavigateTab,
  onOpenConnections
}) => {
  const progression = useProgression();
  const { squad, challenges, recordCheckIn, removeCheckIn, createChallenge, archiveChallenge } =
    useSquad();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Real-time 10-second clock ticker to update active time windows
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => formatDateToLocalISO(currentTime), [currentTime]);

  const currentUserName = userProfile?.name ? `${userProfile.name} (You)` : 'Voyager (You)';
  const currentUserXP = typeof progression.totalXP === 'number' ? progression.totalXP : 0;
  const currentUserTasksCount = Array.isArray(progression.rawState?.taskHistory) ? progression.rawState.taskHistory.length : 0;

  const leaderboardList: LeaderboardUser[] = useMemo(() => {
    return INITIAL_SQUAD_MEMBERS.map((m, idx) => {
      if (m.isCurrentUser) {
        return {
          id: m.id,
          rank: idx + 1,
          name: currentUserName,
          isCurrentUser: true,
          avatar: m.avatar,
          xp: currentUserXP,
          tasksCount: currentUserTasksCount,
          statusText: `${currentUserTasksCount} tasks achieved this week`,
          isOnline: m.isOnline,
          tag: m.tag
        };
      }
      return {
        id: m.id,
        rank: idx + 1,
        name: m.name,
        isCurrentUser: m.isCurrentUser,
        avatar: m.avatar,
        xp: m.xp || 2000,
        tasksCount: m.tasksCount || 20,
        statusText: m.statusText,
        isOnline: m.isOnline,
        tag: m.tag
      };
    });
  }, [currentUserName, currentUserXP, currentUserTasksCount]);

  // Modals & Toasts
  const [selectedChallengeIndex, setSelectedChallengeIndex] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [limitToastOpen, setLimitToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create Challenge Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newCategory, setNewCategory] = useState('Deep Work');
  const [newDuration, setNewDuration] = useState(7);
  const [newStartDate, setNewStartDate] = useState(getTodayString());
  const [newEndDate, setNewEndDate] = useState(addDaysToString(getTodayString(), 7));
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [newHpReward, setNewHpReward] = useState(150);
  const [newAccentColor, setNewAccentColor] = useState<'rose' | 'emerald' | 'amber' | 'purple' | 'indigo'>('rose');
  const [newIcon, setNewIcon] = useState('psychology');
  const [invitedMemberIds, setInvitedMemberIds] = useState<string[]>([
    'user-jordan',
    'user-maya',
    'user-liam'
  ]);

  // Touch handlers for swipe
  const touchStartXRef = useRef<number>(0);
  const toastMessageRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (toastMessageRef.current) clearTimeout(toastMessageRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // Ignore in web
    }
  };

  const showToast = (msg: string) => {
    if (toastMessageRef.current) clearTimeout(toastMessageRef.current);
    setToastMessage(msg);
    toastMessageRef.current = setTimeout(() => {
      setToastMessage(null);
      toastMessageRef.current = null;
    }, 3000);
  };

  const showLimitToast = () => {
    triggerHaptic(ImpactStyle.Heavy);
    setLimitToastOpen(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setLimitToastOpen(false);
    }, 4500);
  };

  const hideLimitToast = () => {
    setLimitToastOpen(false);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };

  // Swiping next logic
  const swipeNext = () => {
    if (challenges.length <= 1) return;
    triggerHaptic(ImpactStyle.Medium);
    setIsSwiping(true);
    setTimeout(() => {
      setCurrentTopIndex((prev) => (prev + 1) % challenges.length);
      setIsSwiping(false);
      setSwipeOffset(0);
    }, 250);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartXRef.current;
    if (Math.abs(diff) < 120) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - endX;
    if (Math.abs(diff) > 45) {
      swipeNext();
    } else {
      setSwipeOffset(0);
    }
  };

  // Celebrate Confetti Burst
  const triggerConfetti = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic(ImpactStyle.Heavy);
    showToast('🎉 Squad Celebration Sent! +25 Team Spirit');

    const rect = e.currentTarget.getBoundingClientRect();
    const colors = ['#4f46e5', '#8792fe', '#bf0f3c', '#ffb2b7', '#3525cd', '#10b981', '#f59e0b'];

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.position = 'fixed';
      particle.style.left = `${rect.left + rect.width / 2}px`;
      particle.style.top = `${rect.top}px`;
      particle.style.width = '7px';
      particle.style.height = '7px';
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      particle.style.backgroundColor = color;
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '9999';
      document.body.appendChild(particle);

      const angle = Math.random() * Math.PI - Math.PI / 2;
      const velocity = 3 + Math.random() * 5;
      const dx = Math.sin(angle) * velocity * 18;
      const dy = -Math.cos(angle) * velocity * 18;

      let frame = 0;
      const anim = setInterval(() => {
        frame++;
        particle.style.transform = `translate(${dx * (frame / 18)}px, ${
          dy * (frame / 18) + frame * frame * 0.15
        }px) rotate(${frame * 15}deg)`;
        particle.style.opacity = (1 - frame / 25).toString();
        if (frame >= 25) {
          clearInterval(anim);
          particle.remove();
        }
      }, 16);
    }
  };

  // Toggle Challenge Check-in (Strictly enforces scheduled date & time window rules)
  const handleToggleChallengeCheckIn = useCallback(
    (challengeId: string) => {
      const target = challenges.find((c) => c.id === challengeId);
      if (!target) return;

      const statusInfo = computeChallengeStatusForDate(target, todayStr, currentTime);
      const isCompleted = (target.completedDates || []).includes(todayStr);

      if (!isCompleted) {
        // Enforce active window rule: Cannot complete before startTime or after endTime
        if (!statusInfo.isWithinWindow) {
          triggerHaptic(ImpactStyle.Heavy);
          if (statusInfo.isUpcoming) {
            showToast(
              `⏳ This challenge unlocks at ${formatDisplayTime(
                target.startTime || '09:00'
              )}. Check-in is only active during the scheduled window.`
            );
          } else {
            showToast(
              `⚠️ Scheduled window closed (${statusInfo.formattedRange}). Check-ins can only be completed during the active time window.`
            );
          }
          return;
        }

        // Active now: Mark completed for today
        triggerHaptic(ImpactStyle.Heavy);
        const nowH = currentTime.getHours();
        const nowM = currentTime.getMinutes();
        const nowTimeStr = formatDisplayTime(
          `${String(nowH).padStart(2, '0')}:${String(nowM).padStart(2, '0')}`
        );

        const checkInRes = recordCheckIn(challengeId, todayStr, target.hpReward || 100);

        // Award daily progress HP/XP only on new check-in
        if (checkInRes.isNew && progression && progression.completeTask) {
          progression.completeTask({
            id: `chal-${challengeId}-${todayStr}`,
            title: target.title,
            hp: target.hpReward || 100
          });
        }

        showToast(`🎯 Check-in recorded at ${nowTimeStr}! +${target.hpReward} HP earned.`);
      } else {
        // Undo completion for today
        triggerHaptic(ImpactStyle.Medium);
        removeCheckIn(challengeId, todayStr);

        // Revert HP/XP on undo
        if (progression && progression.uncompleteTask) {
          progression.uncompleteTask(`chal-${challengeId}-${todayStr}`, target.hpReward || 100);
        }

        showToast(`↩️ Check-in undone for today.`);
      }
    },
    [challenges, todayStr, currentTime, progression, recordCheckIn, removeCheckIn]
  );

  // Create Challenge Handler
  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (challenges.length >= 5) {
      setCreateModalOpen(false);
      showLimitToast();
      return;
    }

    const finalTitle = newTitle.trim() || 'New Squad Challenge';
    const finalSubtitle = newSubtitle.trim() || `${newDuration}-Day Squad Focus Sprint`;
    const dateText = formatDateRange(newStartDate, newEndDate);
    const timeText = formatTimeRange(newStartTime, newEndTime, isAllDay);

    const gradientMap = {
      rose: 'from-[#fff2f3] via-[#ffffff] to-[#f4efff]',
      emerald: 'from-[#f0fdf4] via-[#ffffff] to-[#ecfeff]',
      amber: 'from-[#fffbeb] via-[#ffffff] to-[#fef3c7]',
      purple: 'from-[#faf5ff] via-[#ffffff] to-[#f3e8ff]',
      indigo: 'from-[#eef2ff] via-[#ffffff] to-[#e0f2fe]'
    };

    const borderMap = {
      rose: 'border-rose-200/80',
      emerald: 'border-emerald-200/80',
      amber: 'border-amber-200/80',
      purple: 'border-purple-200/80',
      indigo: 'border-indigo-200/80'
    };

    const invitedSquad = LEADERBOARD_DATA.filter((m) => invitedMemberIds.includes(m.id));

    const newChallenge: Challenge = {
      id: `chal-${Date.now()}`,
      squadId: squad?.id || 'squad-productivity-champs',
      title: finalTitle,
      subtitle: finalSubtitle,
      category: newCategory,
      durationTag: `${newDuration} Days`,
      hpReward: newHpReward,
      currentDays: 0,
      totalDays: newDuration,
      startDate: newStartDate,
      endDate: newEndDate,
      startTime: isAllDay ? undefined : newStartTime,
      endTime: isAllDay ? undefined : newEndTime,
      isAllDay: isAllDay,
      dateRangeText: dateText,
      timeWindowText: timeText,
      gradientClass: gradientMap[newAccentColor],
      borderColor: borderMap[newAccentColor],
      accentColor: newAccentColor,
      icon: newIcon,
      completedDates: [],
      lastCompletedAt: null,
      joinedUsers: [
        {
          name: userProfile?.name || 'Voyager',
          avatar:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw'
        },
        ...invitedSquad.map((m) => ({ name: m.name, avatar: m.avatar }))
      ],
      roster: [
        {
          name: `${userProfile?.name || 'Voyager'} (You)`,
          isCurrentUser: true,
          avatar:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw',
          percentage: 0,
          detail: `0 / ${newDuration} days done`,
          ringColor: 'text-primary',
          textColor: 'text-primary'
        },
        ...invitedSquad.map((m) => ({
          name: m.name,
          avatar: m.avatar,
          percentage: 0,
          detail: `0 / ${newDuration} days done`,
          ringColor: 'text-secondary',
          textColor: 'text-secondary'
        }))
      ]
    };

    triggerHaptic(ImpactStyle.Heavy);
    const result = createChallenge(newChallenge);
    if (!result.success) {
      showLimitToast();
      return;
    }
    setCurrentTopIndex(challenges.length); // Focus on the newly added challenge
    setCreateModalOpen(false);

    // Reset inputs
    setNewTitle('');
    setNewSubtitle('');

    showToast(`🎯 Challenge created! (${challenges.length + 1}/5 Active)`);
  };

  // Archive Challenge Handler
  const handleArchiveChallenge = (id: string) => {
    triggerHaptic(ImpactStyle.Medium);
    archiveChallenge(id);
    setSelectedChallengeIndex(null);
    setCurrentTopIndex(0);
    showToast('📦 Challenge archived. Active slot freed up!');
  };

  const applyPreset = (preset: (typeof PRESET_CHALLENGES)[0]) => {
    triggerHaptic(ImpactStyle.Light);
    setNewTitle(preset.title);
    setNewSubtitle(preset.subtitle);
    setNewCategory(preset.category);
    setNewDuration(preset.duration);
    setNewEndDate(addDaysToString(newStartDate, preset.duration));
    setNewHpReward(preset.hpReward);
    setNewAccentColor(preset.accentColor);
    setNewIcon(preset.icon);
    setNewStartTime(preset.startTime);
    setNewEndTime(preset.endTime);
    setIsAllDay(preset.isAllDay);
  };

  const toggleInvitedMember = (userId: string) => {
    triggerHaptic(ImpactStyle.Light);
    setInvitedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectedChallenge =
    selectedChallengeIndex !== null && selectedChallengeIndex < challenges.length
      ? challenges[selectedChallengeIndex]
      : null;

  const selectedStatus = useMemo(() => {
    if (!selectedChallenge) return null;
    return computeChallengeStatusForDate(selectedChallenge, todayStr, currentTime);
  }, [selectedChallenge, todayStr, currentTime]);

  return (
    <div className="w-full h-full flex flex-col bg-surface text-on-surface font-body-md overflow-hidden relative selection:bg-primary-fixed selection:text-on-primary-fixed antialiased animate-fade-in">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fade-in">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700/50 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header App Bar */}
      <AppTopBar
        subtitle="Squad Progression"
        rightAction={
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              if (onOpenConnections) {
                onOpenConnections();
              }
            }}
            aria-label="Connections and Requests"
            title="Connections & Pending Requests"
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-indigo-600 hover:bg-surface-container-high/60 active:scale-95 transition-all cursor-pointer border-none bg-surface-container-low/70"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-indigo-600">
              diversity_3
            </span>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-tertiary text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-surface shadow-xs animate-pulse">
              3
            </span>
          </button>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full px-4 pt-3 pb-28 bg-surface mobile-scroll overflow-y-auto">
        <div className="flex flex-col w-full space-y-space-md pt-2">
          {/* Top Ambient Celebration Hero */}
          <div className="relative w-full rounded-3xl overflow-hidden bg-surface-container shadow-md">
            <div className="relative h-44 w-full">
              <img
                alt="Joyful squad celebration with trophy and confetti"
                className="w-full h-full object-cover object-center"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6mZZrcY6bNldd55NLP5fhREt4tPfrWvJvv1t3n5pdEQPzVvra727bsH53vJ9bClN1vtaEr9Jjxg6P-PXTdPwuwZW7CFQC3tm-FjUP4kZFUEAtZhNcVyvK9gT06m83AWBuIkxdhvVHS6HvHilz1UTWg0jp7qOWGpjlJlfZKg9B9oXprajtv7XqDkVLeo3Pjj_GnOWP0UoCp2Q0QTQ4Ks-MLrKuzIAU2PBUkMPNGOysJnqoVCCheIZvqw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider">
                      {squad?.league || 'Squad League'}
                    </span>
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    {squad?.name || 'Productivity Champs'}
                  </h2>
                </div>
                <button
                  className="h-10 px-3.5 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-[0_4px_14px_rgba(53,37,205,0.3)] active:scale-95 transition-transform cursor-pointer"
                  id="confetti-btn"
                  type="button"
                  onClick={triggerConfetti}
                >
                  <span className="material-symbols-outlined text-body-lg">celebration</span>
                  <span>Celebrate</span>
                </button>
              </div>
            </div>
          </div>

          {/* LEADERBOARD VIEW */}
          <div className="flex flex-col w-full space-y-space-md" id="view-leaderboard">
            {/* Meta Pill Bar */}
            <div className="flex items-center justify-between px-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant shadow-sm">
                <span className="material-symbols-outlined text-body-md text-primary">timer</span>
                <span className="font-label-md text-label-md">Week 43 • Resets in 2d 14h</span>
              </div>
              <div
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  showToast('🏆 Squad League: Division 1 Trophy Standings');
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-50 via-yellow-100/90 to-amber-200/80 border border-amber-300/90 shadow-[0_2px_8px_rgba(245,158,11,0.25)] flex items-center justify-center active:scale-90 hover:scale-105 transition-all cursor-pointer group"
                title="Squad Trophy Standings"
                role="button"
                tabIndex={0}
              >
                <span
                  className="material-symbols-outlined text-[21px] text-amber-500 drop-shadow-[0_1px_3px_rgba(245,158,11,0.6)] group-hover:rotate-12 transition-transform"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  emoji_events
                </span>
              </div>
            </div>

            {/* Top 3 Podium Cards */}
            <div className="grid grid-cols-3 gap-space-xs items-end pt-3">
              {/* 2nd Place (Silver Crown) */}
              <div className="flex flex-col items-center p-space-xs pt-3 rounded-2xl bg-surface-container-lowest shadow-sm transform hover:-translate-y-1 transition-transform">
                <div className="flex items-center justify-center mb-1">
                  <span
                    className="material-symbols-outlined text-headline-sm animate-bounce drop-shadow-[0_2px_8px_rgba(148,163,184,0.5)]"
                    style={{ color: '#94a3b8' }}
                  >
                    crown
                  </span>
                </div>
                <div className="relative mb-2">
                  <img
                    className="w-12 h-12 rounded-full object-cover"
                    alt={leaderboardList[1]?.name || 'Maya'}
                    src={leaderboardList[1]?.avatar || LEADERBOARD_DATA[1].avatar}
                  />
                  <span className="absolute -top-2 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-outline-variant text-on-surface font-label-sm text-label-sm font-bold shadow">
                    2
                  </span>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-surface-container-lowest"
                    title="Online now"
                  />
                </div>
                <span className="font-label-md text-label-md text-on-surface font-bold truncate max-w-full">
                  {leaderboardList[1]?.name || 'Maya'}
                </span>
                <span className="font-metric-numeral text-metric-numeral text-secondary font-bold text-sm">
                  {(leaderboardList[1]?.xp || 2890).toLocaleString()}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{leaderboardList[1]?.tasksCount || 41} tasks</span>
              </div>

              {/* 1st Place (Gold Crown Champion) */}
              <div className="flex flex-col items-center p-space-xs pt-4 rounded-2xl bg-gradient-to-b from-primary-fixed/40 to-surface-container-lowest shadow-md -translate-y-2">
                <div className="flex items-center justify-center mb-1">
                  <span
                    className="material-symbols-outlined text-headline-sm animate-bounce drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                    style={{ color: 'rgb(245, 158, 11)' }}
                  >
                    crown
                  </span>
                </div>
                <div className="relative mb-2">
                  <img
                    className="w-14 h-14 rounded-full object-cover"
                    alt={leaderboardList[0]?.name || 'Jordan'}
                    src={leaderboardList[0]?.avatar || LEADERBOARD_DATA[0].avatar}
                  />
                  <span className="absolute -top-2 -right-1 w-6 h-6 flex items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-extrabold shadow">
                    1
                  </span>
                  <span
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary ring-2 ring-surface-container-lowest"
                    title="Active in Deep Work"
                  />
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold truncate max-w-full">
                  {leaderboardList[0]?.name || 'Jordan'}
                </span>
                <span className="font-metric-numeral text-metric-numeral text-primary font-extrabold text-base">
                  {(leaderboardList[0]?.xp || 3120).toLocaleString()}
                </span>
                <span className="font-label-sm text-label-sm text-primary font-semibold">{leaderboardList[0]?.tasksCount || 48} tasks</span>
              </div>

              {/* 3rd Place (Bronze Crown) */}
              <div className="flex flex-col items-center p-space-xs pt-3 rounded-2xl bg-surface-container-lowest shadow-sm transform hover:-translate-y-1 transition-transform">
                <div className="flex items-center justify-center mb-1">
                  <span
                    className="material-symbols-outlined text-headline-sm animate-bounce drop-shadow-[0_2px_8px_rgba(180,83,9,0.4)]"
                    style={{ color: '#b45309' }}
                  >
                    crown
                  </span>
                </div>
                <div className="relative mb-2">
                  <img
                    className="w-12 h-12 rounded-full object-cover"
                    alt={leaderboardList[2]?.name || 'Liam'}
                    src={leaderboardList[2]?.avatar || LEADERBOARD_DATA[2].avatar}
                  />
                  <span className="absolute -top-2 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold shadow">
                    3
                  </span>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-outline ring-2 ring-surface-container-lowest"
                    title="Offline - resting"
                  />
                </div>
                <span className="font-label-md text-label-md text-on-surface font-bold truncate max-w-full">
                  {leaderboardList[2]?.name || 'Liam'}
                </span>
                <span className="font-metric-numeral text-metric-numeral text-secondary font-bold text-sm">
                  {(leaderboardList[2]?.xp || 2610).toLocaleString()}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{leaderboardList[2]?.tasksCount || 36} tasks</span>
              </div>
            </div>

            {/* Rest of Squad Roster */}
            <div className="flex flex-col space-y-space-xs">
              {/* 4th Place Friend (Current User) */}
              <div className="flex items-center justify-between p-space-xs px-space-sm rounded-2xl bg-gradient-to-r from-primary/10 via-secondary-container/20 to-primary-fixed/30 ring-1 ring-primary/20 shadow-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md text-primary font-bold w-4 text-center">
                    4
                  </span>
                  <div className="relative">
                    <img
                      alt={`${currentUserName} Profile`}
                      className="w-9 h-9 rounded-full object-cover"
                      src={leaderboardList[3]?.avatar || LEADERBOARD_DATA[3].avatar}
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-secondary ring-1 ring-surface-container-lowest" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">
                        {currentUserName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
                        {leaderboardList[3]?.tag || 'Sprint Mode'}
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {currentUserTasksCount} tasks achieved this week
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-metric-numeral text-metric-numeral text-primary font-extrabold">
                    {currentUserXP.toLocaleString()}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    XP Earned
                  </span>
                </div>
              </div>

              {/* 5th Place Friend (Elena Rostova) */}
              <div className="flex items-center justify-between p-space-xs px-space-sm rounded-2xl bg-surface-container-lowest shadow-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant w-4 text-center">
                    5
                  </span>
                  <div className="relative">
                    <img
                      className="w-9 h-9 rounded-full object-cover"
                      alt={leaderboardList[4]?.name || 'Elena'}
                      src={leaderboardList[4]?.avatar || LEADERBOARD_DATA[4].avatar}
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-outline ring-1 ring-surface-container-lowest" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      {leaderboardList[4]?.name || 'Elena Rostova'}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {leaderboardList[4]?.statusText || 'Offline • Focused session 2h ago'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {(leaderboardList[4]?.xp || 2180).toLocaleString()}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {leaderboardList[4]?.tasksCount || 29} tasks
                  </span>
                </div>
              </div>

              {/* 6th Place Friend (David K.) */}
              <div className="flex items-center justify-between p-space-xs px-space-sm rounded-2xl bg-surface-container-lowest shadow-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant w-4 text-center">
                    6
                  </span>
                  <div className="relative">
                    <img
                      className="w-9 h-9 rounded-full object-cover"
                      alt={leaderboardList[5]?.name || 'David'}
                      src={leaderboardList[5]?.avatar || LEADERBOARD_DATA[5].avatar}
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-secondary ring-1 ring-surface-container-lowest" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      {leaderboardList[5]?.name || 'David K.'}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {leaderboardList[5]?.statusText || 'Online • Evening reading'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {(leaderboardList[5]?.xp || 1940).toLocaleString()}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {leaderboardList[5]?.tasksCount || 24} tasks
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE CHALLENGES SECTION & STACKABLE SWIPEABLE CARDS */}
          <div className="flex flex-col w-full space-y-space-sm pt-2" id="view-challenges">
            {/* Section Header & Badge */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Active Challenges
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-extrabold tracking-wide">
                  {challenges.length} / 5 Active
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md"
                id="card-counter"
              >
                <span className="font-bold text-primary" id="stack-index">
                  {challenges.length > 0 ? currentTopIndex + 1 : 0}
                </span>
                <span className="opacity-60">/ {challenges.length}</span>
              </div>
            </div>

            {/* Create New Challenge Button */}
            <div className="px-1">
              <button
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-primary-fixed via-surface-container to-secondary-fixed text-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 border border-primary/20 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                id="create-challenge-btn"
                type="button"
                onClick={() => {
                  if (challenges.length >= 5) {
                    showLimitToast();
                  } else {
                    triggerHaptic(ImpactStyle.Medium);
                    setCreateModalOpen(true);
                  }
                }}
              >
                <span className="material-symbols-outlined text-body-lg font-bold">add_circle</span>
                <span>+ Create New Challenge</span>
              </button>
            </div>

            {/* Swipeable Card Stack Container */}
            <div className="relative w-full pt-1 pb-2">
              <div
                ref={containerRef}
                className="card-stack-container w-full h-[245px] relative touch-pan-y"
                id="challenge-stack"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {challenges.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 rounded-3xl bg-surface-container-low/60 border border-dashed border-outline-variant text-center">
                    <span className="material-symbols-outlined text-4xl text-primary mb-2 opacity-70">
                      flag
                    </span>
                    <p className="font-headline-sm text-sm text-on-surface font-bold">
                      No Active Challenges
                    </p>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                      Tap "+ Create New Challenge" above to launch one with your squad (up to 5 max).
                    </p>
                  </div>
                ) : (
                  challenges.map((challenge, i) => {
                    const offset =
                      (i - currentTopIndex + challenges.length) % challenges.length;
                    const isTop = offset === 0;

                    let cardStyle: React.CSSProperties = {};

                    if (isTop) {
                      const translateX = isSwiping ? 120 : swipeOffset;
                      const rotate = isSwiping ? 16 : swipeOffset * 0.08;
                      const opacity = isSwiping ? 0 : 1;

                      cardStyle = {
                        transform: `translate3d(${translateX}px, 0px, 0px) rotate(${rotate}deg) scale(1)`,
                        opacity: opacity,
                        zIndex: 30,
                        pointerEvents: 'auto'
                      };
                    } else if (offset === 1) {
                      cardStyle = {
                        transform: 'translate3d(0px, 10px, -20px) scale(0.95)',
                        opacity: 0.88,
                        zIndex: 20,
                        pointerEvents: 'none'
                      };
                    } else if (offset === 2) {
                      cardStyle = {
                        transform: 'translate3d(0px, 20px, -40px) scale(0.90)',
                        opacity: 0.65,
                        zIndex: 10,
                        pointerEvents: 'none'
                      };
                    } else {
                      cardStyle = {
                        transform: 'translate3d(0px, 25px, -60px) scale(0.85)',
                        opacity: 0,
                        zIndex: 5,
                        pointerEvents: 'none'
                      };
                    }

                    const progressPct = Math.round(
                      (challenge.currentDays / challenge.totalDays) * 100
                    );

                    return (
                      <div
                        key={challenge.id}
                        className={`swipe-card absolute inset-0 cursor-pointer p-5 rounded-3xl bg-gradient-to-br ${challenge.gradientClass} border-2 ${challenge.borderColor} shadow-card flex flex-col justify-between transition-all duration-300`}
                        style={cardStyle}
                        onClick={() => {
                          if (isTop) {
                            triggerHaptic(ImpactStyle.Light);
                            setSelectedChallengeIndex(i);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${
                                challenge.accentColor === 'rose'
                                  ? 'from-rose-500 to-violet-600'
                                  : challenge.accentColor === 'emerald'
                                  ? 'from-emerald-500 to-teal-500'
                                  : challenge.accentColor === 'amber'
                                  ? 'from-amber-500 to-orange-500'
                                  : challenge.accentColor === 'purple'
                                  ? 'from-purple-500 to-indigo-600'
                                  : 'from-indigo-600 to-blue-500'
                              } flex items-center justify-center text-white shadow-md flex-shrink-0`}
                            >
                              <span className="material-symbols-outlined text-headline-sm">
                                {challenge.icon}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-headline-sm text-base text-on-surface font-extrabold truncate">
                                  {challenge.title}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${
                                    challenge.accentColor === 'rose'
                                      ? 'bg-rose-100 text-rose-700'
                                      : challenge.accentColor === 'emerald'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : challenge.accentColor === 'amber'
                                      ? 'bg-amber-100 text-amber-800'
                                      : challenge.accentColor === 'purple'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-indigo-100 text-indigo-800'
                                  }`}
                                >
                                  {challenge.durationTag}
                                </span>
                              </div>
                              <p className="font-body-sm text-xs text-on-surface-variant line-clamp-1">
                                {challenge.subtitle}
                              </p>
                              {/* Date & Time metadata pills */}
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-on-surface-variant/80 mt-1">
                                <span className="flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[13px] text-primary">calendar_today</span>
                                  <span>{challenge.dateRangeText || challenge.durationTag}</span>
                                </span>
                                <span className="opacity-40">•</span>
                                <span className="flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[13px] text-indigo-600">schedule</span>
                                  <span>{challenge.timeWindowText || 'Daily'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-md text-xs font-extrabold shadow-sm border flex-shrink-0 ${
                              challenge.accentColor === 'rose'
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : challenge.accentColor === 'emerald'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : challenge.accentColor === 'amber'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : challenge.accentColor === 'purple'
                                ? 'bg-purple-50 border-purple-200 text-purple-800'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-body-md ${
                                challenge.accentColor === 'rose'
                                  ? 'text-rose-600'
                                  : challenge.accentColor === 'emerald'
                                  ? 'text-emerald-600'
                                  : challenge.accentColor === 'amber'
                                  ? 'text-amber-600'
                                  : challenge.accentColor === 'purple'
                                  ? 'text-purple-600'
                                  : 'text-indigo-600'
                              }`}
                            >
                              military_tech
                            </span>
                            +{challenge.hpReward} HP
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-label-md font-label-md">
                            <span className="text-on-surface font-semibold text-xs">
                              Squad Progress
                            </span>
                            <span
                              className={`font-bold text-xs ${
                                challenge.accentColor === 'rose'
                                  ? 'text-rose-600'
                                  : challenge.accentColor === 'emerald'
                                  ? 'text-emerald-700'
                                  : challenge.accentColor === 'amber'
                                  ? 'text-amber-600'
                                  : challenge.accentColor === 'purple'
                                  ? 'text-purple-600'
                                  : 'text-indigo-600'
                              }`}
                            >
                              {challenge.currentDays} / {challenge.totalDays} Days ({progressPct}%)
                            </span>
                          </div>
                          <div
                            className={`w-full h-2 rounded-full overflow-hidden ${
                              challenge.accentColor === 'rose'
                                ? 'bg-rose-100/70'
                                : challenge.accentColor === 'emerald'
                                ? 'bg-emerald-100/70'
                                : challenge.accentColor === 'amber'
                                ? 'bg-amber-100/70'
                                : challenge.accentColor === 'purple'
                                ? 'bg-purple-100/70'
                                : 'bg-indigo-100/70'
                            }`}
                          >
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${
                                challenge.accentColor === 'rose'
                                  ? 'from-rose-500 to-violet-600'
                                  : challenge.accentColor === 'emerald'
                                  ? 'from-emerald-500 to-cyan-500'
                                  : challenge.accentColor === 'amber'
                                  ? 'from-amber-500 to-orange-500'
                                  : challenge.accentColor === 'purple'
                                  ? 'from-purple-500 to-indigo-600'
                                  : 'from-indigo-600 to-blue-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {(() => {
                          const cardStatus = computeChallengeStatusForDate(challenge, todayStr, currentTime);
                          return (
                            <div
                              className={`flex items-center justify-between pt-1 border-t ${
                                challenge.accentColor === 'rose'
                                  ? 'border-rose-100/80'
                                  : challenge.accentColor === 'emerald'
                                  ? 'border-emerald-100/80'
                                  : challenge.accentColor === 'amber'
                                  ? 'border-amber-100/80'
                                  : challenge.accentColor === 'purple'
                                  ? 'border-purple-100/80'
                                  : 'border-indigo-100/80'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {challenge.joinedUsers.map((u, uIdx) => (
                                    <img
                                      key={uIdx}
                                      alt={u.name}
                                      className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                                      src={u.avatar}
                                    />
                                  ))}
                                </div>
                                <span className="ml-2 font-label-sm text-label-sm text-on-surface-variant font-semibold">
                                  {challenge.joinedUsers.length} joined
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1 font-label-sm font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                    cardStatus.isCompleted
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : cardStatus.isWithinWindow
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                      : cardStatus.isUpcoming
                                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      cardStatus.isCompleted
                                        ? 'bg-emerald-500'
                                        : cardStatus.isWithinWindow
                                        ? 'bg-amber-500'
                                        : cardStatus.isUpcoming
                                        ? 'bg-slate-400'
                                        : 'bg-rose-500'
                                    }`}
                                  />
                                  {cardStatus.badgeText}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 font-label-sm font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                    challenge.accentColor === 'rose'
                                      ? 'text-rose-700 bg-rose-100/80'
                                      : challenge.accentColor === 'emerald'
                                      ? 'text-emerald-800 bg-emerald-100/80'
                                      : challenge.accentColor === 'amber'
                                      ? 'text-amber-800 bg-amber-100/80'
                                      : challenge.accentColor === 'purple'
                                      ? 'text-purple-800 bg-purple-100/80'
                                      : 'text-indigo-700 bg-indigo-100/80'
                                  }`}
                                >
                                  Roster <span className="material-symbols-outlined text-xs">open_in_new</span>
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Swipe Controls & Indicator Dots */}
            {challenges.length > 0 && (
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-1.5" id="dots-container">
                  {challenges.map((_, idx) => (
                    <span
                      key={idx}
                      className={`transition-all duration-300 cursor-pointer ${
                        idx === currentTopIndex
                          ? 'w-6 h-2 rounded-full bg-primary'
                          : 'w-2 h-2 rounded-full bg-outline-variant'
                      }`}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setCurrentTopIndex(idx);
                      }}
                    />
                  ))}
                </div>

                <div
                  className="inline-flex items-center gap-1 text-on-surface-variant font-label-sm text-xs opacity-75 cursor-pointer active:scale-95 transition-transform"
                  onClick={swipeNext}
                >
                  <span className="material-symbols-outlined text-sm text-primary">swipe</span>
                  <span>Swipe card to explore</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* TOAST: Active Limit Reached Notice */}
      <div
        className={`fixed top-20 inset-x-4 z-50 transform transition-all duration-300 ease-out ${
          limitToastOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-24 opacity-0 pointer-events-none'
        }`}
        id="toast-limit"
      >
        <div className="p-4 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-md border border-error/20 shadow-[0_12px_28px_rgba(186,26,26,0.12)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-base">info</span>
          </div>
          <div className="flex-1">
            <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
              Active Limit Reached
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
              Maximum 5 challenges at a time. Complete or archive an active challenge to create a new one.
            </p>
          </div>
          <button
            className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
            id="close-toast-btn"
            type="button"
            onClick={hideLimitToast}
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>

      {/* MODAL: Detailed Challenge Roster View */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-200 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest shadow-2xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 pb-4 bg-gradient-to-b from-surface-container-low to-surface-container-lowest border-b border-surface-container">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold tracking-wide">
                  {selectedChallenge.durationTag} Sprint
                </span>
                <button
                  className="w-8 h-8 rounded-full bg-surface-container-high/60 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  onClick={() => setSelectedChallengeIndex(null)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-base font-bold">close</span>
                </button>
              </div>
              <h3 className="font-headline-sm text-xl text-on-surface font-extrabold leading-tight">
                {selectedChallenge.title}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                {selectedChallenge.subtitle}
              </p>

              {/* Schedule and Rewards details */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-outline-variant/20">
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                  <span className="truncate">{selectedChallenge.dateRangeText || `${selectedChallenge.totalDays} Days`}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-sm text-indigo-600">schedule</span>
                  <span className="truncate">{selectedChallenge.timeWindowText || 'Daily'}</span>
                </div>
              </div>

              {/* Live Active Schedule Window Banner */}
              {selectedStatus && (
                <div
                  className={`mt-2.5 p-2.5 rounded-2xl flex items-start gap-2 border text-xs ${
                    selectedStatus.isCompleted
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                      : selectedStatus.isWithinWindow
                      ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                      : selectedStatus.isUpcoming
                      ? 'bg-slate-50/90 border-slate-200 text-slate-700'
                      : 'bg-rose-50/90 border-rose-200 text-rose-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">
                    {selectedStatus.isCompleted
                      ? 'verified'
                      : selectedStatus.isWithinWindow
                      ? 'bolt'
                      : selectedStatus.isUpcoming
                      ? 'hourglass_top'
                      : 'event_busy'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold flex items-center justify-between">
                      <span>{selectedStatus.badgeText}</span>
                      <span className="text-[10px] font-semibold opacity-75">
                        {selectedStatus.formattedRange}
                      </span>
                    </div>
                    <p className="text-[11px] font-normal leading-tight opacity-90 mt-0.5">
                      {selectedStatus.statusBanner}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/10">
                <div className="flex items-center gap-1 text-tertiary-container font-label-md text-xs font-bold">
                  <span className="material-symbols-outlined text-base text-tertiary">
                    military_tech
                  </span>
                  <span>+{selectedChallenge.hpReward} HP Reward</span>
                </div>
                <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-xs ml-auto">
                  <span className="material-symbols-outlined text-sm text-primary">timelapse</span>
                  <span>Day {selectedChallenge.currentDays} of {selectedChallenge.totalDays}</span>
                </div>
              </div>
            </div>

            {/* Modal Participants Roster */}
            <div className="p-5 overflow-y-auto space-y-3 mobile-scroll flex-1">
              <div className="flex items-center justify-between pb-1">
                <span className="font-label-lg text-label-lg font-bold text-on-surface">
                  Participant Roster
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Completion rate
                </span>
              </div>

              {selectedChallenge.roster.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-2xl transition-colors ${
                    p.isCurrentUser
                      ? 'bg-primary-fixed/20 border border-primary/20'
                      : 'bg-surface-container-low/60 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      alt={p.name}
                      className={`w-10 h-10 rounded-full object-cover ${
                        p.completed
                          ? 'ring-2 ring-amber-400'
                          : p.isCurrentUser
                          ? 'ring-2 ring-primary'
                          : 'ring-1 ring-outline-variant'
                      }`}
                      src={p.avatar}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          {p.isCurrentUser && userProfile?.name ? userProfile.name : p.name}
                        </span>
                        {p.completed && (
                          <span className="material-symbols-outlined text-xs text-amber-500">
                            check_circle
                          </span>
                        )}
                        {p.isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded-full bg-primary text-white font-label-sm text-[9px] font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-label-sm text-label-sm font-semibold ${
                          p.completed
                            ? 'text-emerald-600'
                            : p.isCurrentUser
                            ? 'text-primary'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {p.detail}
                      </span>
                      {p.isCurrentUser && selectedChallenge.lastCompletedAt && (
                        <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                          ✨ {selectedChallenge.lastCompletedAt}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-surface-container-high stroke-current"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="3.5"
                      />
                      <path
                        className={`${p.ringColor} stroke-current`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeDasharray={`${p.percentage}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <span className={`absolute text-[10px] font-extrabold ${p.textColor}`}>
                      {p.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-surface-container-lowest border-t border-surface-container flex flex-col gap-2">
              {/* Primary Action Button: Live Check-in */}
              {selectedStatus && (
                <button
                  type="button"
                  onClick={() => handleToggleChallengeCheckIn(selectedChallenge.id)}
                  className={`w-full py-2.5 px-4 rounded-2xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98] ${
                    selectedStatus.isCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                      : selectedStatus.isWithinWindow
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-primary/25'
                      : selectedStatus.isUpcoming
                      ? 'bg-surface-container-high text-on-surface-variant/70 cursor-not-allowed opacity-80'
                      : 'bg-rose-100 text-rose-800 cursor-not-allowed opacity-80'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm font-bold">
                    {selectedStatus.isCompleted
                      ? 'check_circle'
                      : selectedStatus.isWithinWindow
                      ? 'task_alt'
                      : selectedStatus.isUpcoming
                      ? 'lock_clock'
                      : 'block'}
                  </span>
                  <span>
                    {selectedStatus.isCompleted
                      ? `${selectedChallenge.lastCompletedAt || 'Completed Today'} (Tap to Undo)`
                      : selectedStatus.isWithinWindow
                      ? `Complete Today's Sprint (+${selectedChallenge.hpReward} HP)`
                      : selectedStatus.isUpcoming
                      ? `Check-in Unlocks at ${formatDisplayTime(
                          selectedChallenge.startTime || '09:00'
                        )}`
                      : `Window Closed for Today (${selectedStatus.formattedRange})`}
                  </span>
                </button>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  className="px-4 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-error hover:bg-error-container/30 font-label-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  onClick={() => handleArchiveChallenge(selectedChallenge.id)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">archive</span>
                  <span>Archive</span>
                </button>
                <button
                  className="flex-1 py-2.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-xs font-bold hover:bg-surface-container-highest shadow-sm active:scale-98 transition-all cursor-pointer"
                  onClick={() => setSelectedChallengeIndex(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Squad Challenge */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-200 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest shadow-2xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[94vh]">
            {/* Header */}
            <div className="p-5 pb-3 bg-gradient-to-b from-surface-container-low to-surface-container-lowest border-b border-surface-container">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                    <span className="material-symbols-outlined text-base">add_task</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg text-on-surface font-extrabold">
                      Create Challenge
                    </h3>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">
                      Active: {challenges.length}/5 • {5 - challenges.length} slots left
                    </p>
                  </div>
                </div>
                <button
                  className="w-8 h-8 rounded-full bg-surface-container-high/60 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  onClick={() => setCreateModalOpen(false)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-base font-bold">close</span>
                </button>
              </div>

              {/* Slot Indicator */}
              <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden mt-2">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${(challenges.length / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateChallenge} className="p-5 space-y-4 overflow-y-auto mobile-scroll flex-1">
              {/* Quick Presets Carousel */}
              <div>
                <label className="block font-label-md text-xs font-bold text-on-surface mb-1.5">
                  💡 Quick Inspiration Presets
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 mobile-scroll">
                  {PRESET_CHALLENGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-primary-fixed/30 hover:border-primary/40 border border-outline-variant/40 text-[11px] font-semibold text-on-surface whitespace-nowrap active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>{preset.title}</span>
                      <span className="text-primary font-bold">({preset.duration}d)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block font-label-md text-xs font-bold text-on-surface mb-1">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., 7-Day Focus Sprint"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Subtitle / Daily Goal */}
              <div>
                <label className="block font-label-md text-xs font-bold text-on-surface mb-1">
                  Daily Goal / Description
                </label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="e.g., Focus 2 hrs daily uninterrupted"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* START DATE & END DATE SCHEDULING */}
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                    <span>Date Schedule</span>
                  </label>
                  <span className="font-label-sm text-[11px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                    {newDuration} Days Total
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] font-semibold text-on-surface-variant mb-1">
                      Start Date
                    </span>
                    <input
                      type="date"
                      required
                      value={newStartDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewStartDate(val);
                        setNewEndDate(addDaysToString(val, newDuration));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-on-surface-variant mb-1">
                      End Date
                    </span>
                    <input
                      type="date"
                      required
                      value={newEndDate}
                      min={newStartDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewEndDate(val);
                        const start = new Date(newStartDate).getTime();
                        const end = new Date(val).getTime();
                        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
                        setNewDuration(diffDays);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              {/* DAILY START TIME & END TIME WINDOW */}
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">schedule</span>
                    <span>Daily Focus Window</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => {
                        triggerHaptic(ImpactStyle.Light);
                        setIsAllDay(e.target.checked);
                      }}
                      className="rounded text-primary focus:ring-0 cursor-pointer w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-bold text-on-surface-variant">All-Day Flexible</span>
                  </label>
                </div>

                {!isAllDay ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] font-semibold text-on-surface-variant mb-1">
                          Start Time
                        </span>
                        <input
                          type="time"
                          value={newStartTime}
                          onChange={(e) => setNewStartTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-on-surface-variant mb-1">
                          End Time
                        </span>
                        <input
                          type="time"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>

                    {/* Quick Time Window Presets */}
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 mobile-scroll pt-0.5">
                      {[
                        { label: 'Morning (07:00 - 09:00)', s: '07:00', e: '09:00' },
                        { label: 'Deep Work (09:00 - 12:00)', s: '09:00', e: '12:00' },
                        { label: 'Afternoon (14:00 - 17:00)', s: '14:00', e: '17:00' },
                        { label: 'Night (20:00 - 22:00)', s: '20:00', e: '22:00' }
                      ].map((tw, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            triggerHaptic(ImpactStyle.Light);
                            setNewStartTime(tw.s);
                            setNewEndTime(tw.e);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                            newStartTime === tw.s && newEndTime === tw.e
                              ? 'bg-primary text-white border-primary shadow-2xs'
                              : 'bg-surface text-on-surface-variant border-outline-variant/60 hover:border-primary/40'
                          }`}
                        >
                          {tw.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-primary font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">all_inclusive</span>
                    <span>Squad can complete daily tasks anytime (00:00 - 23:59).</span>
                  </div>
                )}
              </div>

              {/* Category Picker */}
              <div>
                <label className="block font-label-md text-xs font-bold text-on-surface mb-1">
                  Category & Focus Area
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value);
                    if (e.target.value === 'Deep Work') {
                      setNewIcon('psychology');
                      setNewAccentColor('rose');
                    } else if (e.target.value === 'Circadian Health') {
                      setNewIcon('wb_sunny');
                      setNewAccentColor('emerald');
                    } else if (e.target.value === 'Mindfulness') {
                      setNewIcon('self_improvement');
                      setNewAccentColor('indigo');
                    } else if (e.target.value === 'Fitness') {
                      setNewIcon('fitness_center');
                      setNewAccentColor('amber');
                    } else {
                      setNewIcon('task_alt');
                      setNewAccentColor('purple');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="Deep Work">Deep Work</option>
                  <option value="Circadian Health">Circadian Health</option>
                  <option value="Mindfulness">Mindfulness</option>
                  <option value="Fitness">Fitness & Movement</option>
                  <option value="Habit Mastery">Habit Mastery</option>
                </select>
              </div>

              {/* HP Reward & Theme Color */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-label-md text-xs font-bold text-on-surface mb-1">
                    HP Reward
                  </label>
                  <div className="flex gap-1">
                    {[50, 100, 150, 200].map((hp) => (
                      <button
                        key={hp}
                        type="button"
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setNewHpReward(hp);
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-label-sm text-[11px] font-bold border transition-all cursor-pointer ${
                          newHpReward === hp
                            ? 'bg-primary text-on-primary border-primary shadow-xs'
                            : 'bg-surface-container-low text-on-surface-variant border-outline-variant/60'
                        }`}
                      >
                        +{hp}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-xs font-bold text-on-surface mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {[
                      { color: 'rose', bg: 'bg-rose-500' },
                      { color: 'emerald', bg: 'bg-emerald-500' },
                      { color: 'indigo', bg: 'bg-indigo-600' },
                      { color: 'amber', bg: 'bg-amber-500' },
                      { color: 'purple', bg: 'bg-purple-500' }
                    ].map((t) => (
                      <button
                        key={t.color}
                        type="button"
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setNewAccentColor(t.color as any);
                        }}
                        className={`w-6 h-6 rounded-full ${t.bg} transition-all cursor-pointer ${
                          newAccentColor === t.color
                            ? 'ring-2 ring-primary ring-offset-2 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Invite Squad Members */}
              <div>
                <label className="block font-label-md text-xs font-bold text-on-surface mb-1.5">
                  Invite Squad Members ({invitedMemberIds.length + 1} participating)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LEADERBOARD_DATA.filter((m) => !m.isCurrentUser).map((member) => {
                    const isSelected = invitedMemberIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleInvitedMember(member.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40 text-on-surface'
                            : 'bg-surface-container-low border-outline-variant/50 text-on-surface-variant opacity-70'
                        }`}
                      >
                        <img
                          alt={member.name}
                          src={member.avatar}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="font-label-sm text-xs font-bold truncate flex-1">
                          {member.name}
                        </span>
                        <span
                          className={`material-symbols-outlined text-sm ${
                            isSelected ? 'text-primary' : 'text-outline-variant'
                          }`}
                        >
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit & Cancel Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-xs font-bold shadow-md hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  <span>Launch Challenge</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Dock */}
      <BottomNavBar
        activeTab="squad"
        onNavigateTab={onNavigateTab}
        userInitial={userProfile?.name?.[0] || 'A'}
      />
    </div>
  );
};

export default SquadScreen;
