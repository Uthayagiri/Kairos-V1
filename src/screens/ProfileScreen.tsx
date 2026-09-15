import React, { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ProfileScreenProps {
  userProfile?: { email: string; name: string } | null;
  onNavigateTab?: (tab: string) => void;
  onOpenSettings?: () => void;
  onOpenWellbeing?: () => void;
  onOpenStats?: () => void;
  onOpenAchievements?: () => void;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  hpReward: number;
  icon: string;
  category: 'consistency' | 'deep-work' | 'circadian' | 'neural' | 'squad' | 'mastery';
  isUnlocked: boolean;
  unlockedDate?: string;
  progress?: { current: number; total: number };
  badgeBg: string;
  badgeText: string;
  badgePillBg: string;
  badgePillText: string;
}

const ACHIEVEMENTS_DATA: Achievement[] = [
  {
    id: 'ach-1',
    title: '7-Day Unbroken Flow',
    description: '7 consecutive days meeting all circadian ritual cadences',
    hpReward: 120,
    icon: 'trophy',
    category: 'consistency',
    isUnlocked: true,
    unlockedDate: 'Yesterday',
    badgeBg: 'bg-tertiary-fixed',
    badgeText: 'text-tertiary',
    badgePillBg: 'bg-tertiary-container/20',
    badgePillText: 'text-tertiary'
  },
  {
    id: 'ach-2',
    title: 'Deep Work Master',
    description: 'Completed 100 high-cognitive study hours',
    hpReward: 250,
    icon: 'bolt',
    category: 'deep-work',
    isUnlocked: true,
    unlockedDate: '3 days ago',
    badgeBg: 'bg-primary-fixed',
    badgeText: 'text-primary',
    badgePillBg: 'bg-primary-fixed/40',
    badgePillText: 'text-primary'
  },
  {
    id: 'ach-3',
    title: 'Dawn Sovereign',
    description: '21 early wake-up & circadian photonic rituals',
    hpReward: 180,
    icon: 'wb_twilight',
    category: 'circadian',
    isUnlocked: true,
    unlockedDate: 'Sep 10',
    badgeBg: 'bg-secondary-fixed',
    badgeText: 'text-secondary',
    badgePillBg: 'bg-secondary-fixed/50',
    badgePillText: 'text-secondary'
  },
  {
    id: 'ach-4',
    title: 'Neural Synthesis',
    description: '50 active recall quizzes aced with Aura Companion',
    hpReward: 200,
    icon: 'psychology',
    category: 'neural',
    isUnlocked: true,
    unlockedDate: 'Sep 06',
    badgeBg: 'bg-primary-fixed',
    badgeText: 'text-primary',
    badgePillBg: 'bg-primary-fixed/40',
    badgePillText: 'text-primary'
  },
  {
    id: 'ach-5',
    title: 'Squad Vanguard',
    description: 'Led squad to #1 victory in weekly challenge',
    hpReward: 300,
    icon: 'shield',
    category: 'squad',
    isUnlocked: true,
    unlockedDate: 'Sep 01',
    badgeBg: 'bg-secondary-fixed',
    badgeText: 'text-secondary',
    badgePillBg: 'bg-secondary-fixed/50',
    badgePillText: 'text-secondary'
  },
  // Additional achievements for View All modal
  {
    id: 'ach-6',
    title: 'Centurion Streak',
    description: 'Maintain an active daily study streak for 30 consecutive days',
    hpReward: 500,
    icon: 'local_fire_department',
    category: 'consistency',
    isUnlocked: false,
    progress: { current: 18, total: 30 },
    badgeBg: 'bg-surface-container-high',
    badgeText: 'text-on-surface-variant',
    badgePillBg: 'bg-surface-container',
    badgePillText: 'text-on-surface-variant'
  },
  {
    id: 'ach-7',
    title: 'Polymath Prodigy',
    description: 'Log verified progress across 5 distinct academic disciplines',
    hpReward: 350,
    icon: 'school',
    category: 'mastery',
    isUnlocked: false,
    progress: { current: 3, total: 5 },
    badgeBg: 'bg-surface-container-high',
    badgeText: 'text-on-surface-variant',
    badgePillBg: 'bg-surface-container',
    badgePillText: 'text-on-surface-variant'
  },
  {
    id: 'ach-8',
    title: 'Flow Ascendant',
    description: 'Complete a 4-hour uninterrupted deep focus block with zero context switches',
    hpReward: 400,
    icon: 'self_improvement',
    category: 'deep-work',
    isUnlocked: false,
    progress: { current: 2, total: 4 },
    badgeBg: 'bg-surface-container-high',
    badgeText: 'text-on-surface-variant',
    badgePillBg: 'bg-surface-container',
    badgePillText: 'text-on-surface-variant'
  },
  {
    id: 'ach-9',
    title: 'Solar Synchrony',
    description: 'Sync sleep and wake cadences with natural circadian rhythm for 14 straight days',
    hpReward: 300,
    icon: 'bedtime',
    category: 'circadian',
    isUnlocked: false,
    progress: { current: 9, total: 14 },
    badgeBg: 'bg-surface-container-high',
    badgeText: 'text-on-surface-variant',
    badgePillBg: 'bg-surface-container',
    badgePillText: 'text-on-surface-variant'
  },
  {
    id: 'ach-10',
    title: 'Squad Sovereign',
    description: 'Mentor 5 squad members and assist them in clearing milestone study rituals',
    hpReward: 450,
    icon: 'groups',
    category: 'squad',
    isUnlocked: false,
    progress: { current: 4, total: 5 },
    badgeBg: 'bg-surface-container-high',
    badgeText: 'text-on-surface-variant',
    badgePillBg: 'bg-surface-container',
    badgePillText: 'text-on-surface-variant'
  }
];

interface DailyCadenceData {
  day: string;
  tasksPct: number;
  tasksCount: number;
  hpPct: number;
  hpCount: number;
  isPeak?: boolean;
}

const WEEKLY_CADENCE: DailyCadenceData[] = [
  { day: 'Mon', tasksPct: 45, tasksCount: 7, hpPct: 35, hpCount: 280 },
  { day: 'Tue', tasksPct: 60, tasksCount: 9, hpPct: 55, hpCount: 410 },
  { day: 'Wed', tasksPct: 70, tasksCount: 11, hpPct: 65, hpCount: 490 },
  { day: 'Thu', tasksPct: 95, tasksCount: 14, hpPct: 90, hpCount: 620, isPeak: true },
  { day: 'Fri', tasksPct: 65, tasksCount: 10, hpPct: 60, hpCount: 450 },
  { day: 'Sat', tasksPct: 40, tasksCount: 6, hpPct: 30, hpCount: 220 },
  { day: 'Sun', tasksPct: 50, tasksCount: 8, hpPct: 45, hpCount: 340 }
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userProfile,
  onNavigateTab,
  onOpenSettings,
  onOpenWellbeing,
  onOpenStats,
  onOpenAchievements
}) => {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  const [selectedDay, setSelectedDay] = useState<DailyCadenceData>(WEEKLY_CADENCE[3]); // Default to Thu (Peak)
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

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
    setIsQrModalOpen(true);
  };

  const handleCloseQr = () => {
    triggerHaptic(ImpactStyle.Light);
    setIsQrModalOpen(false);
  };

  const handleCopyLink = () => {
    triggerHaptic(ImpactStyle.Medium);
    navigator.clipboard?.writeText('https://kairos.app/u/alex.kairos');
    setCopyFeedback(true);
    setTimeout(() => {
      setCopyFeedback(false);
    }, 2000);
  };

  const handleShareCode = async () => {
    triggerHaptic(ImpactStyle.Medium);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Connect with Alex Rivera on Kairos',
          text: 'Scan or follow my Kairos neural profile @alex.kairos to sync study cadences and squad challenges!',
          url: 'https://kairos.app/u/alex.kairos'
        });
      } catch {
        // user dismissed share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDaySelect = (dayData: DailyCadenceData) => {
    triggerHaptic(ImpactStyle.Light);
    setSelectedDay(dayData);
  };

  const displayName = userProfile?.name || 'Alex Rivera';

  return (
    <div className="w-full h-full bg-surface text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed antialiased relative overflow-hidden">
      {/* Fixed Frosted Glass Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-serif font-bold text-sm shadow-md shrink-0 relative overflow-hidden"
              style={{
                background:
                  'radial-gradient(circle at 35% 35%, rgb(112, 166, 255) 0%, rgb(168, 85, 247) 50%, rgb(236, 72, 153) 100%)',
                boxShadow: 'rgba(168, 85, 247, 0.45) 0px 0px 12px'
              }}
            >
              <span className="relative z-10 select-none">K</span>
              <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface font-bold">
                  Kairos
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Profile</span>
            </div>
          </div>

          <button
            aria-label="Settings"
            onClick={handleOpenSettings}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low hover:bg-surface-container-high text-on-surface transition-colors active:scale-95 cursor-pointer border-none"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">settings</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 flex flex-col relative w-full px-3.5 pt-20 pb-36 bg-surface overflow-y-auto mobile-scroll">
        <div className="flex flex-col w-full gap-3.5 max-w-[420px] mx-auto">
          {/* Top Identity & Progression Showcase */}
          <section className="relative overflow-hidden rounded-3xl bg-surface-container-lowest shadow-[0_12px_36px_-6px_rgba(79,70,229,0.12)] p-4 border border-surface-container-high/40">
            <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-12 bottom-0 w-36 h-36 rounded-full bg-primary-fixed/30 blur-2xl pointer-events-none" />

            {/* User Info Row */}
            <div className="relative flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    alt="Alex Rivera portrait"
                    className="w-14 h-14 rounded-full object-cover shadow-[0_4px_16px_rgba(53,37,205,0.2)] ring-2 ring-primary/20"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw"
                  />
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight leading-snug truncate">
                      {displayName}
                    </h1>
                    <span
                      className="material-symbols-outlined text-primary text-base shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm font-semibold text-primary">
                    @alex.kairos
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-bold tracking-wide uppercase">
                      Lvl 14 • Luminary
                    </span>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary font-label-sm text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-xs">group</span>
                      <span>42 Friends</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tactile QR Code Action Button */}
              <button
                id="qr-button"
                onClick={handleOpenQr}
                aria-label="Kairos QR Code"
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl bg-surface-container text-primary hover:bg-surface-container-high transition-all active:scale-95 shadow-sm shrink-0 border-none cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-headline-sm">qr_code_2</span>
                <span className="font-label-sm text-[11px] font-bold tracking-wide uppercase">
                  QR
                </span>
              </button>
            </div>

            {/* Compact Level Progression */}
            <div className="mt-3 p-2.5 rounded-2xl bg-surface-container-low/70 flex flex-col gap-1.5 border border-surface-container-high/40">
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
                  8,420 <span className="text-on-surface-variant font-normal">/ 10,000 XP</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary-container transition-all duration-700 shadow-sm"
                  style={{ width: '84.2%' }}
                />
              </div>
              <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-[11px]">
                <span>Vanguard Synthesizer</span>
                <span className="text-primary font-semibold">1,580 XP to Lvl 15</span>
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
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-1 -mx-1 px-1 mobile-scroll no-scrollbar">
              {ACHIEVEMENTS_DATA.slice(0, 5).map((ach) => (
                <div
                  key={ach.id}
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSelectedAchievement(ach);
                  }}
                  className="flex-shrink-0 w-44 p-3 rounded-2xl bg-surface-container-low/70 hover:bg-surface-container-low transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-[0_1px_8px_rgba(0,0,0,0.03)] active:scale-95 border border-surface-container-high/40"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-9 h-9 rounded-xl ${ach.badgeBg} flex items-center justify-center ${ach.badgeText} shadow-sm`}
                    >
                      <span
                        className="material-symbols-outlined text-headline-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {ach.icon}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full ${ach.badgePillBg} ${ach.badgePillText} font-label-sm text-label-sm font-bold`}
                    >
                      +{ach.hpReward} HP
                    </span>
                  </div>
                  <div>
                    <h3 className="font-label-lg text-label-lg font-bold text-on-surface leading-snug">
                      {ach.title}
                    </h3>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 line-clamp-2 leading-tight">
                      {ach.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 pt-1 text-primary font-label-sm text-xs font-semibold">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    <span>Completed</span>
                  </div>
                </div>
              ))}
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
                      Core statistics &amp; cadence
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
                    420
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
                    3,850
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
                    18d
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Best Streak</span>
                </div>
              </div>

              {/* Weekly Cadence Header & Dual Bar Chart */}
              <div className="flex items-center justify-between mb-2 pt-1 border-t border-surface-container-high/30">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-sm font-bold text-on-surface block">
                    Weekly Cadence
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
                {WEEKLY_CADENCE.map((item) => {
                  const isSelected = selectedDay.day === item.day;
                  return (
                    <div
                      key={item.day}
                      onClick={() => handleDaySelect(item)}
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
                      {selectedDay.day === 'Thu' ? 'Thursday' : `${selectedDay.day}day`}
                    </span>{' '}
                    delivered {selectedDay.tasksCount} completed tasks &amp; {selectedDay.hpCount} HP.
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-secondary font-bold">
                  {selectedDay.day === 'Thu' ? '+24% avg' : 'Logged'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Floating Bottom Navigation Dock */}
      <nav
        className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none pb-safe"
        data-active-classes="bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]"
      >
        <div className="pointer-events-auto flex items-center justify-between w-full max-w-[390px] h-16 px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_16px_40px_-6px_rgba(19,27,46,0.12),0_2px_12px_rgba(53,37,205,0.06)] border border-surface-container-high/60">
          {/* Home */}
          <button
            onClick={() => handleTabClick('home')}
            aria-label="Home Dashboard"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer border-none bg-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">home</span>
          </button>

          {/* Daily Tasks */}
          <button
            onClick={() => handleTabClick('tasks')}
            aria-label="Daily Cadence Tasks"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer border-none bg-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">check_circle</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
          </button>

          {/* AI Companion */}
          <button
            onClick={() => handleTabClick('companion')}
            aria-label="Kairos AI Companion Chat"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer border-none bg-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">auto_awesome</span>
          </button>

          {/* Squad Progression */}
          <button
            onClick={() => handleTabClick('squad')}
            aria-label="Squad League & Challenges"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer border-none bg-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">groups</span>
          </button>

          {/* Profile Active */}
          <button
            aria-current="page"
            aria-label="Evolution Profile"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)] transition-all duration-300 active:scale-95 cursor-pointer border-none"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">person</span>
          </button>
        </div>
      </nav>

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
                    @alex.kairos
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
                alt="Alex Rivera avatar"
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
                  <span className="font-label-sm text-xs text-on-surface-variant">5 of 18 Milestones Earned</span>
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
              {ACHIEVEMENTS_DATA.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                    ach.isUnlocked
                      ? 'bg-surface-container-low/70 border-surface-container-high/60 shadow-xs'
                      : 'bg-surface-container-lowest/50 border-surface-container-high/30 opacity-70'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${ach.badgeBg} flex items-center justify-center ${ach.badgeText} shrink-0 shadow-xs`}
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: ach.isUnlocked ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {ach.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-label-lg text-sm font-bold text-on-surface truncate">
                        {ach.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-primary-fixed/30 text-primary font-label-sm text-[10px] font-bold shrink-0">
                        +{ach.hpReward} HP
                      </span>
                    </div>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                      {ach.description}
                    </p>
                    {ach.isUnlocked ? (
                      <div className="flex items-center gap-1 mt-1 text-emerald-600 font-label-sm text-[11px] font-semibold">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        <span>Unlocked • {ach.unlockedDate}</span>
                      </div>
                    ) : (
                      ach.progress && (
                        <div className="mt-2 flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] font-semibold text-on-surface-variant">
                            <span>Progress</span>
                            <span>
                              {ach.progress.current} / {ach.progress.total}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(ach.progress.current / ach.progress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
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
            className="w-full max-w-[320px] rounded-3xl bg-surface-container-lowest p-5 text-center flex flex-col items-center shadow-2xl border border-surface-container-high/40 animate-scaleUp"
          >
            <div
              className={`w-14 h-14 rounded-2xl ${selectedAchievement.badgeBg} flex items-center justify-center ${selectedAchievement.badgeText} shadow-md mb-3`}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {selectedAchievement.icon}
              </span>
            </div>
            <h3 className="text-lg font-bold text-on-surface">{selectedAchievement.title}</h3>
            <span
              className={`mt-1 px-2.5 py-0.5 rounded-full ${selectedAchievement.badgePillBg} ${selectedAchievement.badgePillText} text-xs font-bold`}
            >
              +{selectedAchievement.hpReward} HP Reward
            </span>
            <p className="text-xs text-on-surface-variant mt-2 px-1">
              {selectedAchievement.description}
            </p>
            <button
              onClick={() => setSelectedAchievement(null)}
              className="mt-4 w-full py-2.5 rounded-full bg-primary text-on-primary font-bold text-xs active:scale-95 shadow-md shadow-primary/20"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
