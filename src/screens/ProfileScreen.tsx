import React, { useState, useMemo, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppTopBar } from '../components/AppTopBar';
import { CardBadgePreview } from '../features/achievements/components/CardBadgePreview';
import { Achievement, ModelType, AchievementRarity } from '../features/achievements/types/achievement.types';
import { useAchievementProgress } from '../features/achievements/hooks/useAchievementProgress';
import { calculateAchievementXpReward } from '../features/achievements/utils/achievementHelpers';
import { useProgression, TaskCompletionRecord } from '../features/progression';
import {
  ConnectionUser,
  resolveScannedUserProfile,
  MonthlyWebGraph,
  UniqueQRCodeSVG,
  TopAchievementsShowcase,
  Timeline24HourGraph
} from './ConnectionsScreen';
import { syncQueue, syncSerializer } from '../features/sync';

interface ProfileScreenProps {
  userProfile?: { email: string; name: string } | null;
  onNavigateTab?: (tab: string) => void;
  onOpenSettings?: () => void;
  onOpenWellbeing?: () => void;
  onOpenStats?: () => void;
  onOpenAchievements?: () => void;
}

export const getRarityPillStyle = (rarity: AchievementRarity): string => {
  switch (rarity) {
    case 'legendary':
      return 'bg-yellow-100 text-yellow-800';
    case 'epic':
      return 'bg-indigo-100 text-indigo-800';
    case 'rare':
      return 'bg-amber-100 text-amber-800';
    case 'uncommon':
      return 'bg-emerald-100 text-emerald-800';
    case 'mythic':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

export interface DailyRhythmData {
  day: string;
  tasksPct: number;
  tasksCount: number;
  hpPct: number;
  hpCount: number;
  isPeak?: boolean;
}

export const DAY_FULL_NAMES: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday'
};

const DAY_ABBRS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function calculateWeeklyRhythm(
  taskHistory: TaskCompletionRecord[] = [],
  referenceDate: Date = new Date()
): DailyRhythmData[] {
  const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  // Calculate distance to Monday (ISO week standard: Monday = 1)
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + distanceToMonday);

  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const daysData = DAY_ABBRS.map((dayAbbr, idx) => {
    const currentDay = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;

    // If day is strictly in the future relative to local referenceDate, return 0 activity
    if (dateStr > todayStr) {
      return {
        day: dayAbbr,
        tasksCount: 0,
        hpCount: 0,
        tasksPct: 0,
        hpPct: 0,
        isPeak: false
      };
    }

    const dayRecords = (taskHistory || []).filter(
      (r) => r.date === dateStr || (r.completedAt && r.completedAt.slice(0, 10) === dateStr)
    );
    const tasksCount = dayRecords.length;
    const hpCount = dayRecords.reduce((sum, r) => sum + (r.hpAwarded || 0), 0);

    return {
      day: dayAbbr,
      tasksCount,
      hpCount,
      tasksPct: 0,
      hpPct: 0,
      isPeak: false
    };
  });

  const maxTasksInWeek = Math.max(...daysData.map((d) => d.tasksCount), 0);
  const maxHpInWeek = Math.max(...daysData.map((d) => d.hpCount), 0);

  let peakIdx = -1;
  let highestScore = 0;

  daysData.forEach((d, idx) => {
    const score = d.tasksCount * 1000 + d.hpCount;
    if (score > highestScore && d.tasksCount > 0) {
      highestScore = score;
      peakIdx = idx;
    }
  });

  return daysData.map((d, idx) => {
    const isPeak = idx === peakIdx && d.tasksCount > 0;
    const tasksPct = maxTasksInWeek > 0 ? Math.round((d.tasksCount / maxTasksInWeek) * 100) : 0;
    const hpPct = maxHpInWeek > 0 ? Math.round((d.hpCount / maxHpInWeek) * 100) : 0;

    return {
      ...d,
      tasksPct,
      hpPct,
      isPeak
    };
  });
}

import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON
} from '../features/storage';

export const STORAGE_KEY_USER_PROFILE_EXT = 'KAIROS_USER_PROFILE_EXT_V1';

export interface UserProfileExtension {
  customName?: string;
  kairosId?: string;
  userQuote?: string;
  showcaseIds?: string[];
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userProfile,
  onNavigateTab,
  onOpenSettings,
  onOpenWellbeing,
  onOpenStats,
  onOpenAchievements
}) => {
  const progression = useProgression();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalTab, setQrModalTab] = useState<'my_code' | 'scan_code'>('scan_code');
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [scanInputText, setScanInputText] = useState('');
  const [scannedUserDetail, setScannedUserDetail] = useState<ConnectionUser | null>(null);
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  const weeklyRhythm = useMemo(
    () => calculateWeeklyRhythm(progression.rawState.taskHistory),
    [progression.rawState.taskHistory]
  );

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const todayDow = new Date().getDay(); // 0 is Sun
    return todayDow === 0 ? 6 : todayDow - 1;
  });

  const selectedDay = weeklyRhythm[selectedDayIndex] || weeklyRhythm[0] || {
    day: 'Mon',
    tasksPct: 0,
    tasksCount: 0,
    hpPct: 0,
    hpCount: 0
  };
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // Profile Details & Customization State with User-Scoped Storage Persistence
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [profileExt, setProfileExt] = useState<UserProfileExtension>(() => {
    try {
      const parsed = getUserScopedJSON<UserProfileExtension | null>(STORAGE_DOMAINS.PROFILE_EXTENSION, null);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {}
    return {};
  });

  const [customName, setCustomName] = useState(profileExt.customName || userProfile?.name || 'Voyager');
  const [kairosId, setKairosId] = useState(profileExt.kairosId || (userProfile?.email ? `@${userProfile.email.split('@')[0]}` : '@voyager.kairos'));
  const [userQuote, setUserQuote] = useState(profileExt.userQuote || 'Focus on the opportune moment; flow where purpose meets time.');

  const { achievements, stats } = useAchievementProgress(userProfile);

  const unlockedAchievements = useMemo(() => {
    return achievements.filter((a) => a.unlocked || a.isUnlocked);
  }, [achievements]);

  // Top 5 Showcased Achievement IDs (Customizable by the user for others to see)
  const [showcaseIds, setShowcaseIds] = useState<string[]>(() => {
    if (Array.isArray(profileExt.showcaseIds) && profileExt.showcaseIds.length > 0) {
      return profileExt.showcaseIds;
    }
    const initialUnlocked = achievements.filter((a) => a.unlocked || a.isUnlocked);
    return initialUnlocked.slice(0, 5).map((a) => a.id);
  });

  // Synchronize profile extension state whenever the active userProfile changes
  useEffect(() => {
    try {
      const parsed = getUserScopedJSON<UserProfileExtension | null>(STORAGE_DOMAINS.PROFILE_EXTENSION, null);
      const ext = parsed && typeof parsed === 'object' ? parsed : {};
      setProfileExt(ext);
      setCustomName(ext.customName || userProfile?.name || 'Voyager');
      setKairosId(ext.kairosId || (userProfile?.email ? `@${userProfile.email.split('@')[0]}` : '@voyager.kairos'));
      setUserQuote(ext.userQuote || 'Focus on the opportune moment; flow where purpose meets time.');
      if (Array.isArray(ext.showcaseIds) && ext.showcaseIds.length > 0) {
        setShowcaseIds(ext.showcaseIds);
      } else {
        const initialUnlocked = achievements.filter((a) => a.unlocked || a.isUnlocked);
        setShowcaseIds(initialUnlocked.slice(0, 5).map((a) => a.id));
      }
    } catch {}
  }, [userProfile]);

  const [isCustomizeShowcaseOpen, setIsCustomizeShowcaseOpen] = useState(false);
  const [tempShowcaseIds, setTempShowcaseIds] = useState<string[]>([]);

  const saveProfileExtension = (updates: Partial<UserProfileExtension>) => {
    const updated: UserProfileExtension = {
      customName,
      kairosId,
      userQuote,
      showcaseIds,
      ...updates
    };
    setProfileExt(updated);
    try {
      setUserScopedJSON(STORAGE_DOMAINS.PROFILE_EXTENSION, updated);
      syncQueue.enqueue(
        'PROFILE_UPDATED',
        syncSerializer.profileUpdated({
          name: updated.customName || undefined,
          handle: updated.kairosId || undefined,
          quote: updated.userQuote || undefined
        })
      );
    } catch {}
  };

  const showcasedAchievements = useMemo(() => {
    const map = new Map(achievements.map((a) => [a.id, a]));
    const list = showcaseIds
      .map((id) => map.get(id))
      .filter((a): a is Achievement => Boolean(a && (a.unlocked || a.isUnlocked)));
    if (list.length > 0) return list;
    return unlockedAchievements.slice(0, 5);
  }, [showcaseIds, achievements, unlockedAchievements]);

  const getRarityGradient2D = (rarity: AchievementRarity) => {
    switch (rarity) {
      case 'legendary':
        return {
          border: 'from-amber-300 via-yellow-400 to-amber-600',
          bg: 'from-amber-500 to-yellow-600',
          glow: 'rgba(234, 179, 8, 0.35)'
        };
      case 'epic':
        return {
          border: 'from-indigo-400 via-purple-500 to-violet-600',
          bg: 'from-indigo-600 to-purple-700',
          glow: 'rgba(99, 102, 241, 0.35)'
        };
      case 'rare':
        return {
          border: 'from-orange-400 via-amber-500 to-rose-500',
          bg: 'from-orange-500 to-rose-600',
          glow: 'rgba(249, 115, 22, 0.35)'
        };
      case 'mythic':
        return {
          border: 'from-pink-400 via-rose-500 to-cyan-400',
          bg: 'from-rose-600 to-indigo-800',
          glow: 'rgba(244, 63, 94, 0.35)'
        };
      default:
        return {
          border: 'from-slate-300 to-slate-400',
          bg: 'from-slate-500 to-slate-600',
          glow: 'rgba(148, 163, 184, 0.25)'
        };
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // ignore
    }
  };

  const handleTabClick = (tabId: string) => {
    triggerHaptic(ImpactStyle.Light);
    if (onNavigateTab) {
      onNavigateTab(tabId);
    }
  };

  const handleOpenSettings = () => {
    triggerHaptic(ImpactStyle.Light);
    if (onOpenSettings) {
      onOpenSettings();
    } else if (onNavigateTab) {
      onNavigateTab('settings');
    }
  };

  const handleOpenWellbeing = () => {
    triggerHaptic(ImpactStyle.Light);
    if (onOpenWellbeing) {
      onOpenWellbeing();
    } else if (onNavigateTab) {
      onNavigateTab('wellbeing');
    }
  };

  const handleOpenStats = () => {
    triggerHaptic(ImpactStyle.Light);
    if (onOpenStats) {
      onOpenStats();
    } else if (onNavigateTab) {
      onNavigateTab('statistics');
    }
  };

  const handleOpenQr = () => {
    triggerHaptic(ImpactStyle.Medium);
    setQrModalTab('scan_code');
    setIsQrModalOpen(true);
  };

  const handleCloseQr = () => {
    triggerHaptic(ImpactStyle.Light);
    setIsQrModalOpen(false);
  };

  const handleScanUser = (queryOrHandle: string) => {
    if (!queryOrHandle.trim()) return;
    triggerHaptic(ImpactStyle.Medium);
    const target = resolveScannedUserProfile(queryOrHandle);
    setIsQrModalOpen(false);
    setScanInputText('');
    setScannedUserDetail(target);
    showToast(`📷 QR Code Decoded: Viewing @${target.username}'s Profile`);
  };

  const handleConnectScannedUser = (user: ConnectionUser) => {
    triggerHaptic(ImpactStyle.Medium);
    if (!connectedUserIds.includes(user.id)) {
      setConnectedUserIds((prev) => [...prev, user.id]);
      showToast(`🎉 Connected with ${user.name}! +50 XP Unlocked`);
    } else {
      showToast(`Already connected with ${user.name}`);
    }
  };

  const handleCopyLink = () => {
    triggerHaptic(ImpactStyle.Medium);
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'http://localhost:3000';
    const cleanHandle = (kairosId || 'alex.kairos').replace(/^@/, '');
    const profileUrl = `${origin}/?profile=${encodeURIComponent(cleanHandle)}`;
    navigator.clipboard?.writeText(profileUrl);
    setCopyFeedback(true);
    showToast(`📋 Copied profile link: ${profileUrl}`);
    setTimeout(() => {
      setCopyFeedback(false);
    }, 2000);
  };

  const handleShareCode = async () => {
    triggerHaptic(ImpactStyle.Medium);
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'http://localhost:3000';
    const cleanHandle = (kairosId || 'alex.kairos').replace(/^@/, '');
    const profileUrl = `${origin}/?profile=${encodeURIComponent(cleanHandle)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Connect with ${customName} on Kairos`,
          text: `Scan or follow my Kairos neural profile ${kairosId} to sync study routines and squad challenges!`,
          url: profileUrl
        });
      } catch {
        // user dismissed share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDaySelect = (dayData: DailyRhythmData, index: number) => {
    triggerHaptic(ImpactStyle.Light);
    setSelectedDayIndex(index);
  };

  const displayName = userProfile?.name || 'Voyager';

  return (
    <div className="w-full h-full bg-surface text-on-surface font-body-md flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed antialiased relative overflow-hidden animate-fade-in">
      {/* Top Header App Bar (Left: Splash Orb + Title/Subtitle; Right: Settings icon only) */}
      <AppTopBar
        subtitle="Evolution Profile"
        rightActionIcon="settings"
        rightActionLabel="Settings"
        onRightActionClick={handleOpenSettings}
      />

      {/* Main Scrollable Content */}
      <main className="flex-1 flex flex-col relative w-full px-4 pt-3 pb-28 bg-surface overflow-y-auto mobile-scroll">
        <div className="flex flex-col w-full gap-3.5 max-w-[420px] mx-auto">
          {/* Top Identity & Progression Showcase (Instagram Profile Style) */}
          <section className="relative overflow-hidden rounded-3xl bg-surface-container-lowest shadow-[0_12px_36px_-6px_rgba(79,70,229,0.10)] p-4 border border-surface-container-high/40 space-y-3.5">
            <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-12 bottom-0 w-36 h-36 rounded-full bg-primary-fixed/30 blur-2xl pointer-events-none" />

            {/* Top Identity Row: Avatar on Left + (Name ABOVE Stats) on Right */}
            <div className="relative flex items-center justify-between gap-4">
              {/* Profile Avatar */}
              <div className="relative shrink-0">
                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] shadow-md">
                  <div className="p-[2px] rounded-full bg-surface-container-lowest">
                    <img
                      alt="Profile avatar"
                      className="w-16 h-16 rounded-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw"
                    />
                  </div>
                </div>
                {/* Plus / Active status badge on avatar */}
                <div
                  onClick={() => showToast('✨ Story active: 3 Focus sessions logged today')}
                  className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center ring-2 ring-surface-container-lowest shadow-sm cursor-pointer active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[12px] font-bold">add</span>
                </div>
              </div>

              {/* Right Column: Name displayed ABOVE Connections, Tasks and HP */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                {/* User Name & Kairos ID */}
                <div className="flex flex-col pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-base font-bold text-on-surface tracking-tight truncate">
                      {customName}
                    </h1>
                    <span
                      className="material-symbols-outlined text-blue-500 text-[17px] shrink-0 drop-shadow-2xs"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      title="Verified Scholar"
                    >
                      verified
                    </span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-medium tracking-tight">
                    {kairosId.startsWith('@') ? kairosId : `@${kairosId}`}
                  </span>
                </div>

                {/* 3 Stats Columns: Connections | Tasks | HP */}
                <div className="flex items-center justify-around text-center">
                  <div
                    onClick={() => onNavigateTab && onNavigateTab('connections')}
                    className="flex flex-col cursor-pointer active:scale-95 transition-transform"
                  >
                    <span className="text-base font-extrabold text-on-surface tracking-tight leading-tight">
                      48
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      Connections
                    </span>
                  </div>

                  <div
                    onClick={() => onNavigateTab && onNavigateTab('tasks')}
                    className="flex flex-col cursor-pointer active:scale-95 transition-transform"
                  >
                    <span className="text-base font-extrabold text-on-surface tracking-tight leading-tight">
                      {progression.rawState.taskHistory.length}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      Tasks
                    </span>
                  </div>

                  <div
                    onClick={() => onNavigateTab && onNavigateTab('statistics')}
                    className="flex flex-col cursor-pointer active:scale-95 transition-transform"
                  >
                    <span className="text-base font-extrabold text-primary tracking-tight leading-tight">
                      {progression.lifetimeHP.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      HP
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Level Title & Achievements Info Strip (Above Quote) */}
            <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                <span
                  className="material-symbols-outlined text-primary text-[15px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                <span>Level {progression.level}</span>
                <span className="text-on-surface-variant font-normal">•</span>
                <span className="text-primary font-semibold">{progression.levelTitle}</span>
              </div>

              <div
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  if (onOpenAchievements) {
                    onOpenAchievements();
                  } else {
                    setIsAchievementsModalOpen(true);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed/40 text-primary font-bold text-[11px] cursor-pointer hover:bg-primary-fixed transition-colors active:scale-95 shadow-2xs"
                title="View All Achievements"
              >
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  military_tech
                </span>
                <span>{stats.unlocked} / {stats.total} Owned</span>
              </div>
            </div>

            {/* Below Profile Photo: Quote Section */}
            <div className="relative p-3 rounded-2xl bg-surface-container-low/80 border border-surface-container-high/60 shadow-2xs">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5 opacity-80">
                  format_quote
                </span>
                <p className="text-xs italic text-on-surface font-medium leading-relaxed">
                  "{userQuote}"
                </p>
              </div>
            </div>

            {/* Instagram Action Buttons Row (Edit Profile | Share Profile | QR Code) */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  setTempShowcaseIds([...showcaseIds]);
                  setIsEditModalOpen(true);
                }}
                className="flex-1 py-1.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-outline-variant/30 text-center active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={handleShareCode}
                className="flex-1 py-1.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-outline-variant/30 text-center active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
              >
                Share Profile
              </button>
              <button
                type="button"
                id="qr-button"
                onClick={handleOpenQr}
                title="View QR Code"
                className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary border border-outline-variant/30 flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
              </button>
            </div>

            {/* Top 5 Achievements Showcase in 2D (Replaces Story Highlights) */}
            <div className="pt-2.5 border-t border-surface-container-high/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-primary text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      military_tech
                    </span>
                    Showcase Badges
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-medium">
                    (Top {showcasedAchievements.length} visible to others)
                  </span>
                </div>
              </div>

              {/* 2D Badges Horizontal Tray */}
              <div className="flex items-center gap-3 overflow-x-auto pb-1.5 pt-0.5 mobile-scroll no-scrollbar">
                {showcasedAchievements.map((ach) => {
                  const gradient = getRarityGradient2D(ach.rarity);
                  return (
                    <div
                      key={ach.id}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setSelectedAchievement(ach);
                      }}
                      className="flex flex-col items-center gap-1 cursor-pointer shrink-0 active:scale-95 transition-transform group"
                    >
                      {/* 2D Badge Container with Metallic Rarity Border */}
                      <div
                        className={`p-[2.5px] rounded-2xl bg-gradient-to-tr ${gradient.border} shadow-sm group-hover:shadow-md transition-shadow`}
                        style={{ filter: `drop-shadow(0 2px 6px ${gradient.glow})` }}
                      >
                        <div
                          className={`w-12 h-12 rounded-[13px] bg-gradient-to-b ${gradient.bg} flex items-center justify-center p-1.5 relative overflow-hidden`}
                        >
                          {/* 2D Inner Ambient Sheen */}
                          <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/15 pointer-events-none" />
                          <span
                            className="material-symbols-outlined text-[24px] text-white drop-shadow-md z-10"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {ach.icon}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface truncate max-w-[64px] text-center leading-tight">
                        {ach.title}
                      </span>
                      <span
                        className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full ${ach.badgePillBg}`}
                      >
                        {ach.rarity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compact Level Progression Bar */}
            <div className="mt-1 p-2.5 rounded-2xl bg-surface-container-low/70 flex flex-col gap-1.5 border border-surface-container-high/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-label-sm text-xs text-on-surface font-semibold flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-primary text-sm shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    bolt
                  </span>
                  Level Progression
                </span>
                <span className="font-label-sm text-xs text-primary font-bold">
                  {progression.xpIntoCurrentLevel.toLocaleString()} <span className="text-on-surface-variant font-normal">/ {progression.nextLevelTargetXP > progression.currentLevelFloorXP ? (progression.nextLevelTargetXP - progression.currentLevelFloorXP).toLocaleString() : 'MAX'} XP</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary-container transition-all duration-700 shadow-sm"
                  style={{ width: `${progression.progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-[11px]">
                <span>{progression.levelTitle}</span>
                <span className="text-primary font-semibold">
                  {progression.nextLevelTargetXP > progression.currentLevelFloorXP
                    ? `${progression.xpNeededForNextLevel.toLocaleString()} XP to Lvl ${progression.nextLevel}`
                    : 'Pinnacle Level Reached'}
                </span>
              </div>
            </div>
          </section>

          {/* Top Achievements Showcase Carousel */}
          <section className="rounded-3xl bg-surface-container-lowest p-4 shadow-[0_8px_24px_-4px_rgba(79,70,229,0.06)] flex flex-col gap-3 border border-surface-container-high/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <span
                    className="material-symbols-outlined text-body-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    military_tech
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-sm font-bold text-on-surface leading-tight">
                    Top Achievements
                  </h2>
                  <span className="font-body-sm text-[11px] text-on-surface-variant block mt-0.5">
                    Elite milestones &amp; earned honorifics
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-[11px] font-bold">
                  <span>5 Unlocked</span>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    if (onOpenAchievements) {
                      onOpenAchievements();
                    } else {
                      setIsAchievementsModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-0.5 py-0.5 px-1.5 rounded-full text-primary hover:bg-primary-fixed/30 active:scale-95 transition-all text-xs font-bold cursor-pointer border-none bg-transparent"
                  type="button"
                >
                  <span>All</span>
                  <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Horizontal Scroll Cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 -mx-1 px-1 mobile-scroll no-scrollbar">
              {unlockedAchievements.slice(0, 5).map((ach) => {
                const xpReward = calculateAchievementXpReward(ach.rarity, progression.level);
                const pillStyle = getRarityPillStyle(ach.rarity);
                const title = ach.title || ach.name;
                return (
                  <div
                    key={ach.id}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setSelectedAchievement(ach);
                    }}
                    className="flex-shrink-0 w-48 p-3 rounded-2xl bg-surface-container-low/80 hover:bg-surface-container-low transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.04)] active:scale-95 border border-surface-container-high/50 group relative overflow-hidden"
                  >
                    {/* Ambient Metallic Glow */}
                    <div
                      className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none group-hover:opacity-35 transition-opacity"
                      style={{ backgroundColor: ach.glowColor }}
                    />

                    {/* Top Row: Rarity Pill & Reward */}
                    <div className="flex items-center justify-between z-10">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${pillStyle}`}
                      >
                        {ach.rarity}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary-fixed/50 text-primary font-mono text-[10px] font-bold">
                        +{xpReward} XP
                      </span>
                    </div>

                    {/* Frontview Medal Display */}
                    <div className="my-1 relative flex items-center justify-center h-24 w-full z-10 transition-transform duration-300 group-hover:scale-105">
                      <CardBadgePreview
                        id={ach.id}
                        name={title}
                        rarity={ach.rarity}
                        modelType={ach.modelType}
                        category={ach.category}
                        glowColor={ach.glowColor}
                        currentProgress={100}
                        targetProgress={100}
                        unlocked={true}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Title and Description */}
                    <div className="z-10">
                      <h3 className="font-label-lg text-xs font-extrabold text-on-surface leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {title}
                      </h3>
                      <p className="font-body-sm text-[10px] text-on-surface-variant mt-0.5 line-clamp-2 leading-tight">
                        {ach.description}
                      </p>
                    </div>

                    {/* Verified Unlocked Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/40 text-emerald-600 font-label-sm text-[10px] font-bold z-10">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">verified</span>
                        <span>Unlocked</span>
                      </div>
                      <span className="text-on-surface-variant font-medium text-[9px]">
                        {ach.unlockDate || 'Achieved'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Digital Wellbeing & Screen Time Card */}
          <section
            id="section-screen-time"
            className="rounded-3xl bg-surface-container-lowest p-4 shadow-[0_8px_24px_-4px_rgba(79,70,229,0.06)] flex flex-col gap-3 border border-surface-container-high/40"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined text-body-lg">hourglass_top</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-sm font-bold text-on-surface leading-tight">
                    Screen Time &amp; Harmony
                  </h2>
                  <span className="font-body-sm text-[11px] text-on-surface-variant block mt-0.5">
                    Intentional digital balance
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </div>
                <button
                  onClick={handleOpenWellbeing}
                  className="inline-flex items-center gap-0.5 py-0.5 px-2 rounded-full text-primary hover:bg-primary-fixed/30 active:scale-95 transition-all text-xs font-bold cursor-pointer border-none bg-transparent"
                  type="button"
                >
                  <span>View All</span>
                  <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Main Screen Time Stat */}
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-2">
                <span className="font-display-lg-mobile text-display-lg-mobile font-extrabold text-on-surface">
                  3h 42m
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">today</span>
              </div>
              <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[11px] font-bold">
                <span className="material-symbols-outlined text-sm">trending_down</span>
                -18% vs last week
              </span>
            </div>

            {/* Proportional Stack Bar */}
            <div className="w-full h-3 rounded-full bg-surface-container-highest overflow-hidden flex gap-0.5">
              <div className="h-full bg-primary rounded-l-full" style={{ width: '55%' }} title="Study Apps 55%" />
              <div className="h-full bg-secondary-container" style={{ width: '25%' }} title="Reading 25%" />
              <div className="h-full bg-outline-variant rounded-r-full" style={{ width: '20%' }} title="Social 20%" />
            </div>

            {/* Breakdown Pills */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl bg-surface-container-low p-2 flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="font-label-sm text-[11px] font-semibold text-on-surface">Study</span>
                </div>
                <span className="font-headline-sm text-base font-bold text-primary mt-0.5">55%</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">2h 02m</span>
              </div>
              <div className="rounded-xl bg-surface-container-low p-2 flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary-container" />
                  <span className="font-label-sm text-[11px] font-semibold text-on-surface">Reading</span>
                </div>
                <span className="font-headline-sm text-base font-bold text-secondary mt-0.5">25%</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">55m</span>
              </div>
              <div className="rounded-xl bg-surface-container-low p-2 flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-outline-variant" />
                  <span className="font-label-sm text-[11px] font-semibold text-on-surface">Social</span>
                </div>
                <span className="font-headline-sm text-base font-bold text-on-surface-variant mt-0.5">20%</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">45m</span>
              </div>
            </div>
          </section>

          {/* Activity & Performance Analytics */}
          <section className="tab-panel flex flex-col gap-3" id="panel-analytics">
            <div className="rounded-3xl bg-surface-container-lowest p-4 shadow-[0_8px_24px_-4px_rgba(79,70,229,0.06)] border border-surface-container-high/40">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                    <span
                      className="material-symbols-outlined text-body-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      query_stats
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-headline-sm text-[16px] font-bold text-on-surface leading-tight truncate">
                      Activity &amp; Performance
                    </h2>
                    <span className="font-body-sm text-[11px] text-on-surface-variant truncate block">
                      Core statistics &amp; rhythm
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleOpenStats}
                  className="inline-flex items-center gap-0.5 py-1 px-2.5 rounded-full text-primary bg-surface-container-low hover:bg-surface-container-high active:scale-95 transition-all text-xs font-bold cursor-pointer border-none shrink-0"
                  type="button"
                >
                  <span>View All</span>
                  <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
                </button>
              </div>

              {/* Triplet Quick Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-2 rounded-2xl bg-surface-container-low/70">
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-surface-container-lowest/90 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
                  <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-1">
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      task_alt
                    </span>
                  </div>
                  <span className="font-metric-numeral text-headline-sm text-on-surface font-extrabold leading-tight">
                    {progression.rawState.taskHistory.length}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Tasks Done</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-surface-container-lowest/90 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
                  <div className="w-6 h-6 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary mb-1">
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      favorite
                    </span>
                  </div>
                  <span className="font-metric-numeral text-headline-sm text-on-surface font-extrabold leading-tight">
                    {progression.lifetimeHP.toLocaleString()}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Lifetime HP</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-surface-container-lowest/90 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
                  <div className="w-6 h-6 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary mb-1">
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      local_fire_department
                    </span>
                  </div>
                  <span className="font-metric-numeral text-headline-sm text-on-surface font-extrabold leading-tight">
                    {progression.currentStreak}d
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Current Streak</span>
                </div>
              </div>

              {/* Weekly Flow Header & Dual Bar Chart */}
              <div className="flex items-center justify-between mb-2 pt-1 border-t border-surface-container-high/30">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-sm font-bold text-on-surface block">
                    Weekly Flow
                  </span>
                  <span className="font-body-sm text-xs text-on-surface-variant">
                    Dual Metric: Tasks &amp; Energy Yield
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tasks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">HP</span>
                  </div>
                </div>
              </div>

              {/* Interactive Dual Bar Chart */}
              <div className="pt-4 pb-2 px-1 flex justify-between items-end h-44 gap-1.5" id="weekly-chart">
                {weeklyRhythm.map((item, idx) => {
                  const isSelected = selectedDay.day === item.day;
                  return (
                    <div
                      key={item.day}
                      onClick={() => handleDaySelect(item, idx)}
                      className={`flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group transition-all duration-200 ${
                        isSelected ? 'scale-105' : 'hover:opacity-90'
                      }`}
                    >
                      {item.isPeak && (
                        <span className="mb-0.5 px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-extrabold shadow-sm scale-90">
                          Peak
                        </span>
                      )}
                      <div
                        className={`w-full flex items-end justify-center gap-1 h-32 rounded-xl p-0.5 transition-colors ${
                          item.isPeak
                            ? 'bg-primary-fixed/40'
                            : isSelected
                            ? 'bg-surface-container-high'
                            : 'bg-transparent'
                        }`}
                      >
                        <div
                          className={`w-2.5 rounded-full transition-all ${
                            item.isPeak
                              ? 'bg-primary shadow-[0_2px_8px_rgba(53,37,205,0.4)]'
                              : isSelected
                              ? 'bg-primary'
                              : 'bg-primary/70 group-hover:bg-primary'
                          }`}
                          style={{ height: `${item.tasksPct}%` }}
                        />
                        <div
                          className={`w-2.5 rounded-full transition-all ${
                            item.isPeak
                              ? 'bg-tertiary-container shadow-[0_2px_8px_rgba(191,15,60,0.3)]'
                              : isSelected
                              ? 'bg-tertiary-container'
                              : 'bg-tertiary-container/60 group-hover:bg-tertiary-container'
                          }`}
                          style={{ height: `${item.hpPct}%` }}
                        />
                      </div>
                      <span
                        className={`font-label-sm text-label-sm ${
                          item.isPeak || isSelected
                            ? 'font-bold text-primary'
                            : 'text-on-surface-variant group-hover:text-on-surface'
                        }`}
                      >
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Micro Insight Note & Dynamic Selection Feedback */}
              <div className="mt-3 pt-3 border-none flex items-center justify-between bg-surface-container-low rounded-2xl p-3 border border-surface-container-high/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-body-lg">insights</span>
                  <span className="font-body-sm text-body-sm text-on-surface">
                    <span className="font-semibold text-primary">
                      {DAY_FULL_NAMES[selectedDay.day] || selectedDay.day}
                    </span>{' '}
                    delivered {selectedDay.tasksCount} completed tasks &amp; {selectedDay.hpCount} HP.
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-secondary font-bold">
                  {selectedDay.isPeak ? 'Peak Day' : selectedDay.tasksCount > 0 ? 'Logged' : '0 recorded'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>



      {/* ========================================================================= */}
      {/* KAIROS QR MODAL (#kairos-qr-modal) */}
      {/* ========================================================================= */}
      {isQrModalOpen && (
        <div
          id="kairos-qr-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseQr();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md transition-all duration-300 animate-fadeIn"
        >
          <div
            id="kairos-qr-card"
            className="relative w-full max-w-[340px] rounded-3xl bg-surface-container-lowest p-5 shadow-[0_16px_40px_-6px_rgba(19,27,46,0.2),0_2px_12px_rgba(53,37,205,0.12)] flex flex-col items-center text-center overflow-hidden transition-all duration-300 transform scale-100 border border-surface-container-high/40"
          >
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-secondary-container/30 blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-serif font-bold text-xs shadow-sm"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 35%, rgb(112, 166, 255) 0%, rgb(168, 85, 247) 50%, rgb(236, 72, 153) 100%)'
                  }}
                >
                  <span className="select-none">K</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-headline-sm text-sm font-bold text-on-surface tracking-tight leading-none">
                    My Kairos Code
                  </span>
                  <span className="font-label-sm text-xs text-primary font-semibold">
                    {kairosId || (userProfile?.email ? `@${userProfile.email.split('@')[0]}` : '@voyager.kairos')}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseQr}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* High fidelity SVG QR */}
            <div className="relative p-3 rounded-2xl bg-surface-container-low/70 ring-2 ring-primary/20 shadow-[0_8px_24px_-4px_rgba(79,70,229,0.15)] mb-3">
              <svg className="w-44 h-44" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="qr-grad-new" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3525cd" />
                    <stop offset="50%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#8792fe" />
                  </linearGradient>
                </defs>
                <rect x="10" y="10" width="38" height="38" rx="8" stroke="url(#qr-grad-new)" strokeWidth="4" fill="none" />
                <rect x="18" y="18" width="22" height="22" rx="5" fill="#3525cd" />
                <rect x="112" y="10" width="38" height="38" rx="8" stroke="url(#qr-grad-new)" strokeWidth="4" fill="none" />
                <rect x="120" y="18" width="22" height="22" rx="5" fill="#3525cd" />
                <rect x="10" y="112" width="38" height="38" rx="8" stroke="url(#qr-grad-new)" strokeWidth="4" fill="none" />
                <rect x="18" y="120" width="22" height="22" rx="5" fill="#3525cd" />
                <rect x="56" y="12" width="6" height="6" rx="2" fill="#4f46e5" />
                <rect x="68" y="12" width="12" height="6" rx="2" fill="#3525cd" />
                <rect x="86" y="12" width="6" height="6" rx="2" fill="#8792fe" />
                <rect x="98" y="12" width="6" height="6" rx="2" fill="#3525cd" />
                <rect x="56" y="24" width="14" height="6" rx="2" fill="#8792fe" />
                <rect x="76" y="24" width="8" height="6" rx="2" fill="#3525cd" />
                <rect x="90" y="24" width="14" height="6" rx="2" fill="#4f46e5" />
                <rect x="56" y="36" width="6" height="6" rx="2" fill="#3525cd" />
                <rect x="68" y="36" width="14" height="6" rx="2" fill="#8792fe" />
                <rect x="88" y="36" width="16" height="6" rx="2" fill="#3525cd" />
                <rect x="12" y="56" width="14" height="6" rx="2" fill="#3525cd" />
                <rect x="32" y="56" width="6" height="6" rx="2" fill="#8792fe" />
                <rect x="114" y="56" width="8" height="6" rx="2" fill="#4f46e5" />
                <rect x="128" y="56" width="14" height="6" rx="2" fill="#3525cd" />
                <rect x="12" y="68" width="8" height="6" rx="2" fill="#8792fe" />
                <rect x="26" y="68" width="12" height="6" rx="2" fill="#3525cd" />
                <rect x="120" y="68" width="22" height="6" rx="2" fill="#4f46e5" />
                <rect x="12" y="80" width="18" height="6" rx="2" fill="#3525cd" />
                <rect x="36" y="80" width="8" height="6" rx="2" fill="#8792fe" />
                <rect x="114" y="80" width="14" height="6" rx="2" fill="#3525cd" />
                <rect x="134" y="80" width="8" height="6" rx="2" fill="#8792fe" />
                <rect x="12" y="94" width="8" height="6" rx="2" fill="#4f46e5" />
                <rect x="26" y="94" width="18" height="6" rx="2" fill="#3525cd" />
                <rect x="114" y="94" width="18" height="6" rx="2" fill="#3525cd" />
                <rect x="138" y="94" width="6" height="6" rx="2" fill="#8792fe" />
                <rect x="56" y="116" width="14" height="6" rx="2" fill="#3525cd" />
                <rect x="76" y="116" width="8" height="6" rx="2" fill="#8792fe" />
                <rect x="90" y="116" width="14" height="6" rx="2" fill="#4f46e5" />
                <rect x="114" y="116" width="8" height="6" rx="2" fill="#8792fe" />
                <rect x="128" y="116" width="14" height="6" rx="2" fill="#3525cd" />
                <rect x="56" y="128" width="8" height="6" rx="2" fill="#8792fe" />
                <rect x="70" y="128" width="20" height="6" rx="2" fill="#3525cd" />
                <rect x="96" y="128" width="8" height="6" rx="2" fill="#4f46e5" />
                <rect x="120" y="128" width="22" height="6" rx="2" fill="#3525cd" />
                <rect x="56" y="140" width="18" height="6" rx="2" fill="#3525cd" />
                <rect x="80" y="140" width="14" height="6" rx="2" fill="#8792fe" />
                <rect x="100" y="140" width="18" height="6" rx="2" fill="#4f46e5" />
                <rect x="124" y="140" width="18" height="6" rx="2" fill="#8792fe" />
                <circle cx="80" cy="80" r="16" fill="#ffffff" filter="drop-shadow(0px 2px 6px rgba(53,37,205,0.35))" />
                <circle cx="80" cy="80" r="13" fill="url(#qr-grad-new)" />
                <text x="80" y="85" fill="#ffffff" fontSize="12" fontFamily="Plus Jakarta Sans" fontWeight="800" textAnchor="middle">
                  K
                </text>
              </svg>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <img
                alt={`${displayName} avatar`}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw"
              />
              <span className="font-label-md text-label-md font-bold text-on-surface">{displayName}</span>
            </div>
            <span className="font-label-sm text-xs text-on-surface-variant mb-4 px-2 leading-tight">
              Scan with any Kairos app or camera to connect instantly
            </span>

            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md font-semibold transition-all cursor-pointer border-none active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-base">
                  {copyFeedback ? 'check' : 'link'}
                </span>
                <span>{copyFeedback ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={handleShareCode}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md font-semibold transition-all cursor-pointer border-none shadow-[0_4px_16px_rgba(53,37,205,0.25)] active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-base">share</span>
                <span>Share Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALL ACHIEVEMENTS MODAL */}
      {/* ========================================================================= */}
      {isAchievementsModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAchievementsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    military_tech
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">All Achievements</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">{stats.unlocked} of {stats.total} Milestones Earned</span>
                </div>
              </div>
              <button
                onClick={() => setIsAchievementsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-3 mobile-scroll">
              {achievements.map((ach) => {
                const isUnlocked = Boolean(ach.unlocked || ach.isUnlocked);
                const xpReward = calculateAchievementXpReward(ach.rarity, progression.level);
                const title = ach.title || ach.name;
                return (
                  <div
                    key={ach.id}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setSelectedAchievement(ach);
                    }}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                      isUnlocked
                        ? 'bg-surface-container-low/70 border-surface-container-high/60 shadow-xs'
                        : 'bg-surface-container-lowest/50 border-surface-container-high/30 opacity-70'
                    }`}
                  >
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                      <CardBadgePreview
                        id={ach.id}
                        name={title}
                        rarity={ach.rarity}
                        modelType={ach.modelType}
                        category={ach.category}
                        glowColor={ach.glowColor}
                        currentProgress={isUnlocked ? 100 : ach.currentProgress}
                        targetProgress={isUnlocked ? 100 : (ach.targetProgress || 100)}
                        unlocked={isUnlocked}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-label-lg text-sm font-bold text-on-surface truncate">
                          {title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed/30 text-primary font-label-sm text-[10px] font-bold shrink-0">
                          +{xpReward} XP
                        </span>
                      </div>
                      <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                        {ach.description}
                      </p>
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 mt-1 text-emerald-600 font-label-sm text-[11px] font-semibold">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          <span>Unlocked • {ach.unlockDate || 'Achieved'}</span>
                        </div>
                      ) : (
                        ach.targetProgress > 0 && (
                          <div className="mt-2 flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-semibold text-on-surface-variant">
                              <span>Progress</span>
                              <span>
                                {ach.currentProgress} / {ach.targetProgress}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, Math.round((ach.currentProgress / ach.targetProgress) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* USER PERSONAL UNIQUE QR CODE MODAL (SHOWS ONLY USER'S QR CODE) */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xs rounded-3xl bg-surface-container-lowest p-5 shadow-2xl border border-surface-container-high flex flex-col items-center text-center space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                <span>Kairos Nexus QR</span>
              </span>
              <button
                onClick={handleCloseQr}
                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface bg-surface-container-high/50 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Unique QR Code Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 shadow-inner flex flex-col items-center w-full">
              <UniqueQRCodeSVG
                seed={kairosId || userProfile?.name || 'alex.rivera'}
                size={160}
                centerBadgeText="K"
              />

              <div className="mt-3">
                <h4 className="text-sm font-bold text-on-surface">{customName}</h4>
                <p className="text-xs text-indigo-600 font-semibold">{kairosId}</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Have friends scan your unique Kairos QR code to instantly view your evolution profile and sync routines.
            </p>

            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copyFeedback ? 'check' : 'content_copy'}
                </span>
                <span>{copyFeedback ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={handleShareCode}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                <span>Share Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCANNED USER PROFILE MODAL (EXACT SAME EVOLUTION PROFILE AS FRIENDS SCREEN) */}
      {scannedUserDetail && (
        <div
          onClick={() => setScannedUserDetail(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-container-lowest shadow-2xl border border-surface-container-high flex flex-col max-h-[88vh] overflow-hidden animate-slide-up"
          >
            {/* Modal Header */}
            <div className="p-4 pb-3 border-b border-surface-container-high/80 bg-surface-container-low/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-on-surface leading-tight">
                    Evolution Profile
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-medium">
                    Verified Kairos Member • Scanned via QR
                  </p>
                </div>
              </div>

              <button
                onClick={() => setScannedUserDetail(null)}
                className="w-8 h-8 rounded-full bg-surface-container-high/60 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto mobile-scroll p-4 space-y-4">
              {/* Top Identity Header Card */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-surface-container-low to-purple-50/50 border border-indigo-100 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={scannedUserDetail.avatar}
                      alt={scannedUserDetail.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500/30 shadow-md"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                        scannedUserDetail.status === 'focusing'
                          ? 'bg-emerald-500 animate-pulse'
                          : scannedUserDetail.status === 'online'
                          ? 'bg-indigo-500'
                          : scannedUserDetail.status === 'resting'
                          ? 'bg-amber-400'
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-base font-extrabold text-on-surface truncate leading-tight">
                      {scannedUserDetail.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium">
                      @{scannedUserDetail.username}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-on-primary font-bold shadow-2xs">
                        {scannedUserDetail.league}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium truncate">
                        {scannedUserDetail.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end">
                  <div className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold flex items-center gap-1 shadow-2xs">
                    <span>Lvl {scannedUserDetail.level}</span>
                  </div>
                </div>
              </div>

              {/* Check if user account is private */}
              {scannedUserDetail.visibilitySettings?.whoCanSee === 'private' ? (
                <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-high/80 flex flex-col items-center justify-center text-center space-y-3 my-2">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant shadow-xs">
                    <span className="material-symbols-outlined text-[26px] text-slate-500">lock</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">This Account is Private</h4>
                    <p className="text-xs text-on-surface-variant max-w-[260px] leading-relaxed mt-1">
                      Detailed monthly focus metrics, balance web graph, and achievements are hidden by privacy settings.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1. Level & XP Progression */}
                  <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-xs flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-primary text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                          {scannedUserDetail.level}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-on-surface">
                            Level {scannedUserDetail.level} • {scannedUserDetail.levelTitle}
                          </h4>
                          <p className="text-[10px] text-on-surface-variant">Tier progression rank</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-primary">
                        {scannedUserDetail.currentXp.toLocaleString()} /{' '}
                        {scannedUserDetail.nextLevelXp.toLocaleString()} XP
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 shadow-sm transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (scannedUserDetail.currentXp / scannedUserDetail.nextLevelXp) * 100
                          )}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* 2. Monthly Tasks & HP Stat Cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-xs flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-on-surface-variant">
                          Monthly Tasks
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          task_alt
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold text-on-surface font-sans">
                          {scannedUserDetail.monthlyTasksCompleted}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                          {scannedUserDetail.monthlyTasksGrowth}
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        {(scannedUserDetail.monthlyTasksCompleted / 30).toFixed(1)} tasks/day avg
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-xs flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-on-surface-variant">
                          Monthly HP
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-amber-500">
                          bolt
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-amber-600 font-sans">
                          {scannedUserDetail.monthlyHpEarned.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-amber-800">HP</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        Squad spirit earned this month
                      </p>
                    </div>
                  </div>

                  {/* 3. 24-HOUR USED HOURS VS 24H TIMELINE GRAPH */}
                  <Timeline24HourGraph userName={scannedUserDetail.name} />

                  {/* 4. Top 5 Achievements Unlocked (Interactive Trophy Showcase Rack) */}
                  {scannedUserDetail.topAchievements && scannedUserDetail.topAchievements.length > 0 && (
                    <TopAchievementsShowcase achievements={scannedUserDetail.topAchievements} />
                  )}

                  {/* 5. Mutual Synergy Stats (Clean 3-Column Metric Tiles) */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Synergy Match Tile */}
                    <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex flex-col items-center text-center shadow-2xs">
                      <div className="flex items-center gap-1 text-emerald-600 mb-0.5">
                        <span className="material-symbols-outlined text-[15px]">sync_saved_locally</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Synergy</span>
                      </div>
                      <span className="text-base font-black text-on-surface font-sans">
                        {scannedUserDetail.synergyMatch}%
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">Match</span>
                    </div>

                    {/* Co-Focus Hours Tile */}
                    <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex flex-col items-center text-center shadow-2xs">
                      <div className="flex items-center gap-1 text-indigo-600 mb-0.5">
                        <span className="material-symbols-outlined text-[15px]">timer</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Co-Focus</span>
                      </div>
                      <span className="text-base font-black text-indigo-600 font-sans">
                        {scannedUserDetail.sharedFocusHours || 0}h
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">Completed</span>
                    </div>

                    {/* Mutual Squads Tile */}
                    <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex flex-col items-center text-center shadow-2xs">
                      <div className="flex items-center gap-1 text-amber-600 mb-0.5">
                        <span className="material-symbols-outlined text-[15px]">groups</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Squads</span>
                      </div>
                      <span className="text-base font-black text-on-surface font-sans">
                        {scannedUserDetail.mutualSquads?.length || 0}
                      </span>
                      <span
                        className="text-[10px] text-on-surface-variant font-medium truncate max-w-[85px]"
                        title={scannedUserDetail.mutualSquads?.join(', ')}
                      >
                        {scannedUserDetail.mutualSquads?.[0] || 'Mutual'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 pt-3 border-t border-surface-container-high/80 bg-surface-container-low/60 flex items-center gap-2 shrink-0">
              {!connectedUserIds.includes(scannedUserDetail.id) ? (
                <>
                  <button
                    onClick={() => {
                      handleConnectScannedUser(scannedUserDetail);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>Connect (+50 XP)</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Medium);
                      showToast(`🚀 Tandem Focus invite sent to ${scannedUserDetail.name}!`);
                      setScannedUserDetail(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">timer</span>
                    <span>Tandem</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Heavy);
                      showToast(`🔥 Cheer delivered to ${scannedUserDetail.name}! +15 Spirit`);
                      setScannedUserDetail(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">favorite</span>
                    <span>Cheer</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Medium);
                      showToast(`🚀 Tandem Focus invite sent to ${scannedUserDetail.name}!`);
                      setScannedUserDetail(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">timer</span>
                    <span>Tandem Focus</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Heavy);
                      showToast(`🔥 Cheer delivered to ${scannedUserDetail.name}! +15 Spirit`);
                      setScannedUserDetail(null);
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">favorite</span>
                    <span>Cheer</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Achievement Highlight Modal */}
      {selectedAchievement && (
        <div
          onClick={() => setSelectedAchievement(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] rounded-3xl bg-surface-container-lowest p-5 text-center flex flex-col items-center shadow-2xl border border-surface-container-high/40 animate-scaleUp relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div
              className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-25 pointer-events-none"
              style={{ backgroundColor: selectedAchievement.glowColor }}
            />

            {/* Large Frontview Medal */}
            <div className="w-32 h-32 my-1 relative flex items-center justify-center z-10">
              <CardBadgePreview
                id={selectedAchievement.id}
                name={selectedAchievement.title || selectedAchievement.name}
                rarity={selectedAchievement.rarity}
                modelType={selectedAchievement.modelType}
                category={selectedAchievement.category}
                glowColor={selectedAchievement.glowColor}
                currentProgress={100}
                targetProgress={100}
                unlocked={Boolean(selectedAchievement.unlocked || selectedAchievement.isUnlocked)}
                className="w-full h-full"
              />
            </div>

            <span
              className={`mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getRarityPillStyle(selectedAchievement.rarity)}`}
            >
              {selectedAchievement.rarity} Medal
            </span>

            <h3 className="text-base font-extrabold text-on-surface mt-1.5">{selectedAchievement.title || selectedAchievement.name}</h3>

            <div className="flex items-center gap-1.5 mt-1 text-primary font-bold text-xs">
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span>+{calculateAchievementXpReward(selectedAchievement.rarity, progression.level)} XP Reward</span>
            </div>

            <p className="text-xs text-on-surface-variant mt-2 px-1 leading-relaxed">
              {selectedAchievement.description}
            </p>

            {Boolean(selectedAchievement.unlocked || selectedAchievement.isUnlocked) && (
              <div className="flex items-center gap-1 mt-2 text-emerald-600 font-label-sm text-[11px] font-semibold">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>Achieved {selectedAchievement.unlockDate || 'Recently'}</span>
              </div>
            )}

            <button
              onClick={() => setSelectedAchievement(null)}
              className="mt-4 w-full py-2.5 rounded-full bg-primary text-on-primary font-bold text-xs active:scale-95 shadow-md shadow-primary/20 cursor-pointer border-none"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fade-in">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700/50 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* MODAL: Edit Profile (Includes Showcase Badges Customization) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-200 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest shadow-2xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gradient-to-b from-surface-container-low to-surface-container-lowest border-b border-surface-container flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-base text-on-surface font-bold">Edit Profile</h3>
                <p className="text-[11px] text-on-surface-variant">Update identity, quote &amp; showcase badges</p>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-surface-container-high/60 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                onClick={() => setIsEditModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-base font-bold">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerHaptic(ImpactStyle.Medium);
                setShowcaseIds(tempShowcaseIds);
                saveProfileExtension({
                  customName,
                  kairosId,
                  userQuote,
                  showcaseIds: tempShowcaseIds
                });
                setIsEditModalOpen(false);
                showToast('✅ Profile & Showcase updated successfully!');
              }}
              className="p-4 space-y-4 overflow-y-auto mobile-scroll flex-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Kairos ID</label>
                  <input
                    type="text"
                    required
                    value={kairosId}
                    onChange={(e) => setKairosId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Favorite Quote</label>
                <textarea
                  rows={2}
                  value={userQuote}
                  onChange={(e) => setUserQuote(e.target.value)}
                  placeholder="Enter a quote you like to keep..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              {/* Showcase Badges Selection (Modify What Others Can See) */}
              <div className="space-y-2 pt-1 border-t border-surface-container-high/50">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-on-surface">Showcase Badges</label>
                    <p className="text-[10px] text-on-surface-variant">Select up to 5 badges visible to others</p>
                  </div>
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary-fixed/40">
                    {tempShowcaseIds.length} / 5
                  </span>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto mobile-scroll pr-0.5">
                  {achievements.map((ach) => {
                    const isUnlocked = Boolean(ach.unlocked || ach.isUnlocked);
                    const isSelected = tempShowcaseIds.includes(ach.id);
                    const gradient = getRarityGradient2D(ach.rarity);
                    const title = ach.title || ach.name;
                    return (
                      <div
                        key={ach.id}
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          if (!isUnlocked) {
                            showToast('🔒 Locked: Complete milestone to unlock.');
                            return;
                          }
                          if (isSelected) {
                            setTempShowcaseIds((prev) => prev.filter((id) => id !== ach.id));
                          } else {
                            if (tempShowcaseIds.length >= 5) {
                              showToast('⚠️ Maximum 5 showcase badges reached. Deselect one first.');
                              return;
                            }
                            setTempShowcaseIds((prev) => [...prev, ach.id]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-primary-fixed/20 border-primary shadow-xs'
                            : isUnlocked
                            ? 'bg-surface-container-low border-surface-container-high hover:border-outline-variant'
                            : 'bg-surface-container-low/40 border-surface-container-high/40 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg bg-gradient-to-b ${gradient.bg} flex items-center justify-center text-white shadow-xs shrink-0`}
                          >
                            <span
                              className="material-symbols-outlined text-[17px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {ach.icon}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-on-surface leading-tight">
                                {title}
                              </h4>
                              <span
                                className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full ${getRarityPillStyle(ach.rarity)}`}
                              >
                                {ach.rarity}
                              </span>
                            </div>
                            <span className="text-[10px] text-on-surface-variant line-clamp-1">
                              {ach.description}
                            </span>
                          </div>
                        </div>

                        {/* Toggle Checkbox / Lock */}
                        <div className="shrink-0 pl-1.5">
                          {!isUnlocked ? (
                            <span className="material-symbols-outlined text-xs text-on-surface-variant">
                              lock
                            </span>
                          ) : isSelected ? (
                            <div className="w-4.5 h-4.5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                              <span className="material-symbols-outlined text-[11px] font-bold">check</span>
                            </div>
                          ) : (
                            <div className="w-4.5 h-4.5 rounded-full border-2 border-outline-variant" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 border-t border-surface-container-high/40">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-1/3 py-2 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-full bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary-container active:scale-95 transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Dock */}
      <BottomNavBar
        activeTab="profile"
        onNavigateTab={onNavigateTab}
        userInitial={userProfile?.name?.[0] || 'A'}
      />
    </div>
  );
};

export default ProfileScreen;
