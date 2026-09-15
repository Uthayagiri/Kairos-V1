import React, { useState, useMemo } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface StatisticsScreenProps {
  userProfile?: { email: string; name: string } | null;
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
}

type TimeHorizon = 'week' | 'month' | 'quarter' | 'year';

interface HorizonMetrics {
  tasksCount: string;
  tasksPct: string;
  tasksBarPct: number;
  hpCount: string;
  hpRank: string;
  hpBarPct: number;
  streakDays: string;
  streakActive: string;
  streakDots: number;
  deepWorkHours: string;
  deepWorkDelta: string;
  deepWorkBarPct: number;
  peakLabel: string;
  chartBars: { day: string; tasksHeight: number; hpY: number; isPeak?: boolean; tasks: number; hp: number }[];
  growthPct: string;
  companionSynthesis: string;
}

const HORIZON_DATA: Record<TimeHorizon, HorizonMetrics> = {
  week: {
    tasksCount: '420',
    tasksPct: '94.2% on-time',
    tasksBarPct: 94.2,
    hpCount: '3,850',
    hpRank: 'Top 5%',
    hpBarPct: 95,
    streakDays: '18',
    streakActive: '12d active',
    streakDots: 4,
    deepWorkHours: '148.5',
    deepWorkDelta: '+14.2h wk',
    deepWorkBarPct: 78,
    peakLabel: 'Thu Peak: 14 tasks • 620 HP',
    chartBars: [
      { day: 'Mon', tasksHeight: 50, hpY: 88, tasks: 8, hp: 280 },
      { day: 'Tue', tasksHeight: 72, hpY: 58, tasks: 11, hp: 410 },
      { day: 'Wed', tasksHeight: 58, hpY: 74, tasks: 9, hp: 490 },
      { day: 'Thu', tasksHeight: 88, hpY: 36, isPeak: true, tasks: 14, hp: 620 },
      { day: 'Fri', tasksHeight: 64, hpY: 64, tasks: 10, hp: 450 },
      { day: 'Sat', tasksHeight: 38, hpY: 102, tasks: 6, hp: 220 },
      { day: 'Sun', tasksHeight: 44, hpY: 92, tasks: 7, hp: 340 }
    ],
    growthPct: '+24%',
    companionSynthesis:
      '“Phenomenal elevation! Your baseline cognitive stability increased by 24% compared to last month. To lock in this rhythm, consider shifting Thursday’s high-load sprint 45 minutes earlier to fully harmonize with your circadian peak.”'
  },
  month: {
    tasksCount: '1,840',
    tasksPct: '96.1% on-time',
    tasksBarPct: 96.1,
    hpCount: '16,420',
    hpRank: 'Top 3%',
    hpBarPct: 97,
    streakDays: '31',
    streakActive: '28d active',
    streakDots: 5,
    deepWorkHours: '580.0',
    deepWorkDelta: '+54.0h mo',
    deepWorkBarPct: 86,
    peakLabel: 'Wk 3 Peak: 58 tasks • 2,480 HP',
    chartBars: [
      { day: 'Wk 1', tasksHeight: 60, hpY: 78, tasks: 42, hp: 3800 },
      { day: 'Wk 2', tasksHeight: 75, hpY: 52, tasks: 51, hp: 4200 },
      { day: 'Wk 3', tasksHeight: 90, hpY: 34, isPeak: true, tasks: 58, hp: 4900 },
      { day: 'Wk 4', tasksHeight: 68, hpY: 60, tasks: 48, hp: 3520 }
    ],
    growthPct: '+31%',
    companionSynthesis:
      '“Exceptional consistency across all 4 weekly sprints! Your focus accuracy during the 10:00 AM – 1:30 PM window reached an all-time high of 98.4%.”'
  },
  quarter: {
    tasksCount: '5,420',
    tasksPct: '95.4% on-time',
    tasksBarPct: 95.4,
    hpCount: '48,900',
    hpRank: 'Top 2%',
    hpBarPct: 98,
    streakDays: '64',
    streakActive: '52d active',
    streakDots: 5,
    deepWorkHours: '1,740.0',
    deepWorkDelta: '+160h qtr',
    deepWorkBarPct: 92,
    peakLabel: 'Month 2 Peak: 1,920 tasks • 18.2k HP',
    chartBars: [
      { day: 'M1', tasksHeight: 65, hpY: 70, tasks: 1720, hp: 15400 },
      { day: 'M2', tasksHeight: 92, hpY: 30, isPeak: true, tasks: 1920, hp: 18200 },
      { day: 'M3', tasksHeight: 78, hpY: 55, tasks: 1780, hp: 15300 }
    ],
    growthPct: '+42%',
    companionSynthesis:
      '“Quarterly velocity demonstrates master-tier execution. You cleared 8 milestone achievements and assisted 14 squad members through high-complexity study blocks.”'
  },
  year: {
    tasksCount: '21,800',
    tasksPct: '97.0% on-time',
    tasksBarPct: 97,
    hpCount: '194,500',
    hpRank: 'Top 1%',
    hpBarPct: 99,
    streakDays: '128',
    streakActive: '98d active',
    streakDots: 5,
    deepWorkHours: '6,950.0',
    deepWorkDelta: '+620h yr',
    deepWorkBarPct: 95,
    peakLabel: 'Q3 Peak: 6.2k tasks • 56k HP',
    chartBars: [
      { day: 'Q1', tasksHeight: 62, hpY: 75, tasks: 5100, hp: 44000 },
      { day: 'Q2', tasksHeight: 74, hpY: 58, tasks: 5400, hp: 47500 },
      { day: 'Q3', tasksHeight: 94, hpY: 28, isPeak: true, tasks: 6200, hp: 56000 },
      { day: 'Q4', tasksHeight: 70, hpY: 64, tasks: 5100, hp: 47000 }
    ],
    growthPct: '+58%',
    companionSynthesis:
      '“Annual Luminary Tier unlocked! You rank in the top 1% of global Kairos practitioners with 194,500 HP accumulated and zero broken weekly chains.”'
  }
};

export function StatisticsScreen({
  userProfile,
  onBack,
  onNavigateTab
}: StatisticsScreenProps) {
  const [activeRange, setActiveRange] = useState<TimeHorizon>('week');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number>(3); // Default Thu peak
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      // web preview fallback
    }
  };

  const handleBack = () => {
    triggerHaptic(ImpactStyle.Light);
    if (onBack) {
      onBack();
    } else if (onNavigateTab) {
      onNavigateTab('profile');
    } else {
      window.history.back();
    }
  };

  const handleTabClick = (tab: string) => {
    triggerHaptic(ImpactStyle.Light);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  const handleRangeChange = (range: TimeHorizon) => {
    triggerHaptic(ImpactStyle.Light);
    setActiveRange(range);
    setSelectedBarIndex(range === 'week' ? 3 : 1);
  };

  const handleApplyCalibration = () => {
    triggerHaptic(ImpactStyle.Medium);
    setIsCalibrated(true);
    showToast('Routine calibrated! Sprints aligned to 10:00 AM focus peak.');
    setTimeout(() => {
      setIsCalibrated(false);
    }, 3000);
  };

  const metrics = HORIZON_DATA[activeRange];
  const selectedBar = metrics.chartBars[selectedBarIndex] || metrics.chartBars[0];

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  return (
    <div className="w-full h-full bg-surface font-body-md text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed antialiased relative overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fadeIn">
          <div className="bg-on-surface text-surface-container-lowest px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold max-w-[90%] border border-surface-container-high/20 backdrop-blur-md">
            <span className="material-symbols-outlined text-primary-fixed text-base">check_circle</span>
            <span className="truncate">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Fixed Frosted Header */}
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-28 px-gutter-mobile flex flex-col justify-center gap-space-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <button
                aria-label="Back"
                className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors active:scale-95 cursor-pointer border-none bg-transparent"
                onClick={handleBack}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <img
                alt="Kairos logo emblem"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1Wq7BUe3dfMoL-HEajlZIA55p34-ZHfe2GwkjUMsC0KP9A8XMQnPNt9h21K5OXPBSpeir1Sl1S4TgixoKgrjYjV0quVfCc9CnGmtaaeAjBnNdq3lN_Z33dOoDOZoRudrdQ5OB-89TAObBOkBO-FDsnWPyjb4r7yxOjGFsMTIdaqxGeGs7vpGLPzAQC-PNjco3vZQAZYgtsSYrKrl4W4jJsUygooWHVV8bGl4MYMlqprlNAKUZbmReqjgTXB"
              />
              <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">Settings</h1>
            </div>
            <div className="flex items-center gap-space-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-surface-container-high/40">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                  Synced
                </span>
              </div>
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover shadow-[0_2px_8px_rgba(79,70,229,0.2)] ring-1 ring-primary/20"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw"
              />
            </div>
          </div>
          <div className="w-full">
            <div className="h-10 px-space-sm rounded-full bg-surface-container-low/90 flex items-center gap-space-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] border border-surface-container-high/40 focus-within:border-primary/40 focus-within:bg-surface-container-lowest transition-all">
              <span className="material-symbols-outlined text-[18px] text-outline shrink-0">search</span>
              <input
                className="w-full bg-transparent border-none outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline"
                placeholder="Search settings and preferences..."
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface text-xs shrink-0"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full pt-32 pb-36 px-gutter-mobile bg-surface overflow-y-auto mobile-scroll">
        <div className="flex flex-col w-full gap-space-lg max-w-[440px] mx-auto relative">
          {/* Ambient Glow Aura behind Header */}
          <div className="relative w-full">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-to-r from-primary-fixed to-secondary-fixed-dim blur-3xl opacity-40 pointer-events-none -z-10 rounded-full"></div>

            {/* Time-Horizon Segmented Control Filter */}
            <div className="w-full flex items-center justify-between p-1 rounded-full bg-surface-container-low shadow-sm border border-surface-container-high/40">
              {(['week', 'month', 'quarter', 'year'] as TimeHorizon[]).map((r) => (
                <button
                  key={r}
                  className={`time-tab flex-1 px-4 py-1.5 rounded-full font-label-md text-label-md transition-all duration-200 capitalize cursor-pointer border-none ${
                    activeRange === r
                      ? 'text-on-primary bg-primary shadow-sm font-bold'
                      : 'text-on-surface-variant hover:text-on-surface bg-transparent font-medium'
                  }`}
                  onClick={() => handleRangeChange(r)}
                  type="button"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Key Performance Indicators: 2x2 Bento Micro-Grid */}
          {matchesSearch('Tasks Completed Energy Streak Deep Work Velocity') && (
            <section className="grid grid-cols-2 gap-space-xs w-full">
              {/* Card 1: Total Tasks */}
              <div className="relative p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between overflow-hidden border border-surface-container-high/40">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary px-2 py-0.5 rounded-full bg-secondary-fixed/50 font-bold">
                    {metrics.tasksPct}
                  </span>
                </div>
                <div className="mt-space-sm">
                  <div className="font-metric-numeral text-metric-numeral text-on-surface tracking-tight font-extrabold">
                    {metrics.tasksCount}
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-0.5 font-semibold">
                    Tasks Completed
                  </div>
                </div>
                <div className="w-full bg-surface-container h-1 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.tasksBarPct}%` }}
                  ></div>
                </div>
              </div>

              {/* Card 2: Cadence Energy */}
              <div className="relative p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between overflow-hidden border border-surface-container-high/40">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                  </span>
                  <span className="font-label-sm text-label-sm text-tertiary px-2 py-0.5 rounded-full bg-tertiary-fixed/60 font-bold">
                    {metrics.hpRank}
                  </span>
                </div>
                <div className="mt-space-sm">
                  <div className="font-metric-numeral text-metric-numeral text-on-surface tracking-tight flex items-baseline gap-1 font-extrabold">
                    {metrics.hpCount}{' '}
                    <span className="font-label-md text-label-md text-tertiary font-bold">HP</span>
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-0.5 font-semibold">
                    Lifetime Energy
                  </div>
                </div>
                <div className="w-full bg-surface-container h-1 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-tertiary to-secondary-container h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.hpBarPct}%` }}
                  ></div>
                </div>
              </div>

              {/* Card 3: Longest Streak */}
              <div className="relative p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between overflow-hidden border border-surface-container-high/40">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 rounded-lg bg-secondary-fixed text-secondary flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      local_fire_department
                    </span>
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container font-semibold">
                    {metrics.streakActive}
                  </span>
                </div>
                <div className="mt-space-sm">
                  <div className="font-metric-numeral text-metric-numeral text-on-surface tracking-tight font-extrabold">
                    {metrics.streakDays}{' '}
                    <span className="font-label-md text-label-md text-on-surface-variant font-normal">Days</span>
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-0.5 font-semibold">
                    Longest Cadence
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i < metrics.streakDots ? 'bg-secondary' : 'bg-outline-variant'
                      }`}
                    ></span>
                  ))}
                </div>
              </div>

              {/* Card 4: Deep Work Flow */}
              <div className="relative p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between overflow-hidden border border-surface-container-high/40">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">timelapse</span>
                  </span>
                  <span className="font-label-sm text-label-sm text-primary px-2 py-0.5 rounded-full bg-primary-fixed/60 font-semibold">
                    {metrics.deepWorkDelta}
                  </span>
                </div>
                <div className="mt-space-sm">
                  <div className="font-metric-numeral text-metric-numeral text-on-surface tracking-tight font-extrabold">
                    {metrics.deepWorkHours}{' '}
                    <span className="font-label-md text-label-md text-on-surface-variant font-normal">Hrs</span>
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-0.5 font-semibold">
                    Deep Work Flow
                  </div>
                </div>
                <div className="w-full bg-surface-container h-1 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-primary-container h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.deepWorkBarPct}%` }}
                  ></div>
                </div>
              </div>
            </section>
          )}

          {/* Interactive Dual Metric Chart: Weekly Cadence Velocity */}
          <section className="rounded-2xl p-space-md bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Weekly Cadence Velocity
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Daily Completed Tasks vs. Energy Harvest
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="font-label-sm text-label-sm font-semibold">Active Flow</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-space-md pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary-container"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  Tasks Completed
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-tertiary"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Cadence HP</span>
              </div>
            </div>

            {/* Interactive SVG Chart Canvas */}
            <div className="relative w-full pt-2">
              {/* Highlight Marker for Selected / Peak Bar */}
              <div
                className="absolute top-0 flex flex-col items-center pointer-events-none z-10 transition-all duration-300"
                style={{
                  left: `${
                    activeRange === 'week'
                      ? 20 + selectedBarIndex * 45 + 9
                      : 40 + selectedBarIndex * 70 + 9
                  }px`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="px-2 py-1 rounded-md bg-inverse-surface text-inverse-on-surface shadow-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-ping"></span>
                  <span className="font-label-sm text-label-sm font-bold text-inverse-on-surface whitespace-nowrap">
                    {selectedBar.day}: {selectedBar.tasks} tasks • {selectedBar.hp} HP
                  </span>
                </div>
                <div className="w-0.5 h-4 bg-inverse-surface/40"></div>
              </div>

              <svg className="w-full h-44 overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 160">
                <defs>
                  <linearGradient id="hpGlow" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#bf0f3c" stopOpacity="0.25"></stop>
                    <stop offset="100%" stopColor="#bf0f3c" stopOpacity="0.0"></stop>
                  </linearGradient>
                  <linearGradient id="barGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5"></stop>
                    <stop offset="100%" stopColor="#8792fe"></stop>
                  </linearGradient>
                  <linearGradient id="peakBarGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#3525cd"></stop>
                    <stop offset="100%" stopColor="#4f46e5"></stop>
                  </linearGradient>
                </defs>

                {/* Subtle Horizontal Axis Gridlines */}
                <line stroke="#eaedff" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="320" y1="30" y2="30"></line>
                <line stroke="#eaedff" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="320" y1="75" y2="75"></line>
                <line stroke="#eaedff" strokeWidth="1" x1="0" x2="320" y1="120" y2="120"></line>

                {/* Bars */}
                {metrics.chartBars.map((bar, idx) => {
                  const isSelected = selectedBarIndex === idx;
                  const xPos =
                    activeRange === 'week' ? 20 + idx * 45 : 40 + idx * 70;
                  return (
                    <rect
                      key={bar.day}
                      className="cursor-pointer transition-all hover:opacity-90"
                      fill={bar.isPeak || isSelected ? 'url(#peakBarGrad)' : 'url(#barGrad)'}
                      filter={bar.isPeak ? 'drop-shadow(0 4px 6px rgba(79, 70, 229, 0.3))' : undefined}
                      height={bar.tasksHeight}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setSelectedBarIndex(idx);
                      }}
                      rx="4"
                      width="18"
                      x={xPos}
                      y={120 - bar.tasksHeight}
                    ></rect>
                  );
                })}

                {/* Area Gradient Fill for Cadence HP Yield */}
                <path
                  d="M 29,88 Q 74,58 119,74 T 164,36 T 209,64 T 254,102 T 299,92 L 299,120 L 29,120 Z"
                  fill="url(#hpGlow)"
                ></path>

                {/* Smooth Trendline for Cadence HP Yield */}
                <path
                  d="M 29,88 Q 74,58 119,74 T 164,36 T 209,64 T 254,102 T 299,92"
                  fill="none"
                  stroke="#95002b"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                ></path>

                {/* Peak Node on Trendline */}
                <circle cx="164" cy="36" fill="#ffffff" r="4.5" stroke="#95002b" strokeWidth="3"></circle>
              </svg>

              {/* Day Labels */}
              <div className="flex justify-between px-1 text-on-surface-variant font-label-sm text-label-sm mt-1">
                {metrics.chartBars.map((bar, idx) => (
                  <button
                    key={bar.day}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setSelectedBarIndex(idx);
                    }}
                    className={`w-7 text-center cursor-pointer border-none bg-transparent ${
                      selectedBarIndex === idx ? 'font-bold text-primary' : 'text-on-surface-variant'
                    }`}
                    type="button"
                  >
                    {bar.day}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Energy Peak vs Time of Day Insight Pill Card */}
          {matchesSearch('Cognitive Velocity Window Energy Peak diurnal focus') && (
            <section className="rounded-2xl p-space-md bg-surface-container shadow-sm flex flex-col gap-space-xs border border-surface-container-high/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Cognitive Velocity Window
                  </span>
                </div>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-bold">
                  OPTIMAL
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Your kinetic focus peaks between{' '}
                <span className="text-on-surface font-semibold">10:00 AM &amp; 1:30 PM</span>. You conquer 63% of
                high-complexity objectives within this golden diurnal segment.
              </p>

              {/* Diurnal Mini Heatline Indicator */}
              <div className="mt-space-xs w-full bg-surface-container-lowest p-2 rounded-xl flex items-center gap-2 border border-surface-container-high/30">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">6 AM</span>
                <div className="flex-1 h-3 rounded-full bg-surface-container-high flex overflow-hidden p-0.5">
                  <div className="w-1/6 bg-transparent"></div>
                  <div className="w-1/3 bg-gradient-to-r from-secondary-container via-primary to-tertiary-container rounded-full shadow-sm"></div>
                  <div className="w-1/2 bg-transparent"></div>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">10 PM</span>
              </div>
            </section>
          )}

          {/* Circadian Rhythm & Habit Completion Breakdown */}
          {matchesSearch('Circadian Ritual Adherence Morning Wake Deep Study Hydration Evening') && (
            <section className="rounded-2xl p-space-md bg-surface-container-lowest shadow-sm flex flex-col gap-space-md border border-surface-container-high/40">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Circadian Ritual Adherence
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Biometric sync across target daily cycles
                  </p>
                </div>
                <span className="p-2 rounded-full bg-surface-container-low text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">self_improvement</span>
                </span>
              </div>

              {/* Habit 1 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-tertiary-fixed text-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[15px]">wb_sunny</span>
                    </span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Morning Wake &amp; Photonic
                    </span>
                  </div>
                  <span className="font-label-lg text-label-lg font-bold text-on-surface">96%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-tertiary to-tertiary-container"
                    style={{ width: '96%' }}
                  ></div>
                </div>
              </div>

              {/* Habit 2 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-primary-fixed text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[15px]">psychology</span>
                    </span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Deep Study Sprint
                    </span>
                  </div>
                  <span className="font-label-lg text-label-lg font-bold text-on-surface">88%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary-container"
                    style={{ width: '88%' }}
                  ></div>
                </div>
              </div>

              {/* Habit 3 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-secondary-fixed text-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[15px]">water_drop</span>
                    </span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Hydration &amp; Electrolytes
                    </span>
                  </div>
                  <span className="font-label-lg text-label-lg font-bold text-on-surface">92%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-secondary to-primary-container"
                    style={{ width: '92%' }}
                  ></div>
                </div>
              </div>

              {/* Habit 4 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                      <span className="material-symbols-outlined text-[15px]">bedtime</span>
                    </span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Evening Wind-down
                    </span>
                  </div>
                  <span className="font-label-lg text-label-lg font-bold text-on-surface">81%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-on-surface-variant" style={{ width: '81%' }}></div>
                </div>
              </div>
            </section>
          )}

          {/* Monthly Cadence Comparison & AI Companion Synthesis */}
          <section className="relative rounded-2xl p-space-md bg-gradient-to-br from-primary-fixed/80 via-surface-container-low to-surface-container-lowest shadow-sm flex flex-col gap-space-sm overflow-hidden border border-surface-container-high/40">
            {/* Visual Corner Accent */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-secondary-fixed opacity-40 blur-xl pointer-events-none"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_4px_12px_rgba(79,70,229,0.35)]">
                  <span className="material-symbols-outlined text-[20px]">neurology</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                      Aura Companion
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Cadence Velocity Delta
                  </span>
                </div>
              </div>

              {/* Growth Badge */}
              <span className="px-2.5 py-1 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold shadow-sm flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                {metrics.growthPct}
              </span>
            </div>

            {/* Conversational Recommendation */}
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              {metrics.companionSynthesis}
            </p>

            {/* Interactive Quick Action Button */}
            <button
              id="tuneCadenceBtn"
              className={`mt-1 w-full py-2.5 px-4 rounded-full font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all duration-200 cursor-pointer border-none ${
                isCalibrated ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'
              }`}
              onClick={handleApplyCalibration}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isCalibrated ? 'done' : 'tune'}
              </span>
              <span>{isCalibrated ? 'Schedule Synchronized!' : 'Apply Suggested Routine Calibration'}</span>
            </button>
          </section>
        </div>
      </main>

      {/* Floating Bottom Navigation Dock */}
      <nav
        className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none pb-safe"
        data-active-classes="text-primary-container font-bold"
      >
        <div className="pointer-events-auto flex items-center justify-between w-full max-w-[380px] h-16 px-2.5 rounded-full bg-surface-container-lowest/85 backdrop-blur-2xl shadow-[0_20px_48px_-8px_rgba(15,23,42,0.12),0_0_1px_1px_rgba(99,102,241,0.15)] border border-surface-container-high/60">
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
            onClick={() => handleTabClick('profile')}
            aria-label="Evolution Profile"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)] transition-all duration-300 active:scale-95 cursor-pointer border-none"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">person</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default StatisticsScreen;
