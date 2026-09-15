import React, { useState, useMemo } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface DigitalWellbeingScreenProps {
  userProfile?: { email: string; name: string } | null;
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
}

type Timeframe = 'today' | 'week' | 'month';

interface TimeframeData {
  totalTime: string;
  totalSub: string;
  baseline: string;
  diffPercent: string;
  narrative: string;
  deepFocusTime: string;
  deepFocusPct: number;
  mindfulTime: string;
  mindfulPct: number;
  socialTime: string;
  socialPct: number;
  notionTime: string;
  notionPct: string;
  companionTime: string;
  companionPct: string;
  kindleTime: string;
  kindlePct: string;
  messagesTime: string;
  messagesPct: string;
  interventions: string;
}

const TIMEFRAME_METRICS: Record<Timeframe, TimeframeData> = {
  today: {
    totalTime: '3h 42m',
    totalSub: 'today',
    baseline: '4h 31m',
    diffPercent: '-18% vs avg',
    narrative: 'You are resting 49 minutes under your habitual baseline. Cognitive clarity is peaking in deep-flow windows.',
    deepFocusTime: '2h 02m',
    deepFocusPct: 55,
    mindfulTime: '55m',
    mindfulPct: 25,
    socialTime: '45m',
    socialPct: 20,
    notionTime: '1h 15m',
    notionPct: '34% of total',
    companionTime: '47m',
    companionPct: '21% of total',
    kindleTime: '55m',
    kindlePct: '25% of total',
    messagesTime: '45m',
    messagesPct: '20% of total',
    interventions: '4/4'
  },
  week: {
    totalTime: '24h 18m',
    totalSub: 'this week',
    baseline: '27h 30m',
    diffPercent: '-12% vs last week',
    narrative: 'Strong weekly cadence. Peak cognitive engagement was logged on Thursday with 95% focus ritual compliance.',
    deepFocusTime: '14h 20m',
    deepFocusPct: 59,
    mindfulTime: '5h 45m',
    mindfulPct: 24,
    socialTime: '4h 13m',
    socialPct: 17,
    notionTime: '8h 40m',
    notionPct: '36% of total',
    companionTime: '5h 12m',
    companionPct: '21% of total',
    kindleTime: '5h 45m',
    kindlePct: '24% of total',
    messagesTime: '4h 13m',
    messagesPct: '17% of total',
    interventions: '26/28'
  },
  month: {
    totalTime: '98h 40m',
    totalSub: 'this month',
    baseline: '116h 00m',
    diffPercent: '-15% vs monthly avg',
    narrative: 'Consistent month-long flow. You have reclaimed 17.3 hours from algorithmic distraction into high-clarity study.',
    deepFocusTime: '62h 10m',
    deepFocusPct: 63,
    mindfulTime: '21h 30m',
    mindfulPct: 22,
    socialTime: '15h 00m',
    socialPct: 15,
    notionTime: '36h 20m',
    notionPct: '37% of total',
    companionTime: '22h 15m',
    companionPct: '23% of total',
    kindleTime: '21h 30m',
    kindlePct: '22% of total',
    messagesTime: '15h 00m',
    messagesPct: '15% of total',
    interventions: '112/120'
  }
};

export function DigitalWellbeingScreen({
  userProfile,
  onBack,
  onNavigateTab
}: DigitalWellbeingScreenProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('today');
  const [downtimeActive, setDowntimeActive] = useState(true);
  const [focusShieldActive, setFocusShieldActive] = useState(false);
  const [focusTimeRemaining, setFocusTimeRemaining] = useState(45);
  const [searchQuery, setSearchQuery] = useState('');

  // Limits State
  const [instagramUsed, setInstagramUsed] = useState(14);
  const [youtubeUsed, setYoutubeUsed] = useState(18);
  const [isAddLimitModalOpen, setIsAddLimitModalOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppLimit, setNewAppLimit] = useState('20');

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

  const handleTimeframeChange = (tf: Timeframe) => {
    triggerHaptic(ImpactStyle.Light);
    setActiveTimeframe(tf);
  };

  const handleToggleDowntime = () => {
    triggerHaptic(ImpactStyle.Light);
    setDowntimeActive(!downtimeActive);
    showToast(!downtimeActive ? 'Downtime protocol engaged (10:30 PM - 7:00 AM)' : 'Downtime protocol paused');
  };

  const handleToggleFocusShield = () => {
    triggerHaptic(ImpactStyle.Medium);
    if (focusShieldActive) {
      setFocusShieldActive(false);
      showToast('Focus Shield deactivated');
    } else {
      setFocusShieldActive(true);
      showToast('Focus Shield activated: All non-vital notifications blocked for 45m');
    }
  };

  const handleAddLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    triggerHaptic(ImpactStyle.Medium);
    setIsAddLimitModalOpen(false);
    showToast(`Focus limit added for ${newAppName} (${newAppLimit}m daily quota)`);
    setNewAppName('');
  };

  const currentData = TIMEFRAME_METRICS[activeTimeframe];

  // Search filter
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  const appsList = useMemo(() => {
    const list = [
      {
        id: 'notion',
        name: 'Notion Workspace',
        hp: '+45 HP',
        category: 'Productive Focus • Systems Design',
        time: currentData.notionTime,
        pct: currentData.notionPct,
        icon: 'edit_note',
        iconBg: 'bg-surface-container-high text-primary'
      },
      {
        id: 'companion',
        name: 'Kairos AI Companion',
        hp: '+30 HP',
        category: 'Neuro-cadence • Guided Reflection',
        time: currentData.companionTime,
        pct: currentData.companionPct,
        icon: 'auto_awesome',
        iconBg: 'bg-primary-container text-on-primary'
      },
      {
        id: 'kindle',
        name: 'Kindle Reader',
        hp: '+25 HP',
        category: 'Mindful Reading • Epictetus',
        time: currentData.kindleTime,
        pct: currentData.kindlePct,
        icon: 'menu_book',
        iconBg: 'bg-surface-container-high text-secondary'
      },
      {
        id: 'messages',
        name: 'Messages & Squad',
        hp: null,
        category: 'Social Connection • Intentional',
        time: currentData.messagesTime,
        pct: currentData.messagesPct,
        icon: 'forum',
        iconBg: 'bg-surface-container-high text-on-surface-variant'
      }
    ];

    return list.filter((item) => matchesSearch(item.name) || matchesSearch(item.category));
  }, [currentData, searchQuery]);

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
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-serif font-bold text-xs shadow-md shrink-0 relative overflow-hidden"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 35%, rgb(112, 166, 255) 0%, rgb(168, 85, 247) 50%, rgb(236, 72, 153) 100%)',
                    boxShadow: 'rgba(168, 85, 247, 0.45) 0px 0px 10px'
                  }}
                >
                  <span className="relative z-10 select-none">K</span>
                </div>
                <span className="font-headline-sm text-sm font-bold text-on-surface tracking-tight">
                  Bio-Digital Cadence
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-primary font-semibold hover:underline"
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="w-full">
            <div className="h-10 px-space-sm rounded-full bg-surface-container-low/90 flex items-center gap-space-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] border border-surface-container-high/40 focus-within:border-primary/40 focus-within:bg-surface-container-lowest transition-all">
              <span className="material-symbols-outlined text-[18px] text-outline shrink-0">search</span>
              <input
                className="w-full bg-transparent border-none outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline"
                placeholder="Search apps, protocols, and habits..."
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
          {/* Ambient Light Backdrops (Soft glow meshes) */}
          <div className="relative w-full pointer-events-none">
            <div className="absolute -top-12 -left-10 w-48 h-48 rounded-full bg-primary-fixed blur-3xl opacity-40"></div>
            <div className="absolute top-28 -right-8 w-56 h-56 rounded-full bg-secondary-fixed blur-3xl opacity-30"></div>
            <div className="absolute top-96 left-1/4 w-60 h-60 rounded-full bg-tertiary-fixed blur-3xl opacity-20"></div>
          </div>

          {/* Screen Header & Temporal Scope Selector */}
          <div className="flex flex-col gap-space-sm relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <button
                  aria-label="Back to Profile"
                  className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface shadow-sm active:scale-95 transition-transform cursor-pointer border-none"
                  onClick={handleBack}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">
                    Bio-Digital Cadence
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface leading-tight font-bold">
                    Screen Time &amp; Harmony
                  </h2>
                </div>
              </div>
              {/* Vitality Pulse Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest shadow-sm border border-surface-container-high/40">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                <span className="font-label-sm text-label-sm font-bold text-primary tracking-wide">SYNCED</span>
              </div>
            </div>

            {/* Date Range Interactive Segmented Pill Bar */}
            <div className="p-1 rounded-full bg-surface-container flex items-center shadow-inner border border-surface-container-high/50">
              <button
                className={`flex-1 py-1.5 rounded-full text-center font-label-lg text-label-lg transition-all cursor-pointer border-none ${
                  activeTimeframe === 'today'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                }`}
                onClick={() => handleTimeframeChange('today')}
                type="button"
              >
                Today
              </button>
              <button
                className={`flex-1 py-1.5 rounded-full text-center font-label-lg text-label-lg transition-all cursor-pointer border-none ${
                  activeTimeframe === 'week'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                }`}
                onClick={() => handleTimeframeChange('week')}
                type="button"
              >
                This Week
              </button>
              <button
                className={`flex-1 py-1.5 rounded-full text-center font-label-lg text-label-lg transition-all cursor-pointer border-none ${
                  activeTimeframe === 'month'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                }`}
                onClick={() => handleTimeframeChange('month')}
                type="button"
              >
                This Month
              </button>
            </div>
          </div>

          {/* Visual Hero Card: Harmony State & Visual Narrative */}
          <div className="relative w-full rounded-3xl bg-surface-container-lowest/90 backdrop-blur-xl p-space-lg shadow-xl shadow-primary-container/5 overflow-hidden border border-surface-container-high/40">
            {/* Top Row: Micro aura chip + Companion insight */}
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                <span
                  className="material-symbols-outlined text-[15px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  spark
                </span>
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
                  Optimal Harmony Zone
                </span>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[16px]">trending_down</span>
                <span className="font-label-md text-label-md font-bold">{currentData.diffPercent}</span>
              </div>
            </div>

            {/* Big Metric Presentation */}
            <div className="flex items-baseline justify-between mb-space-xs">
              <div className="flex items-baseline gap-space-2xs">
                <span className="font-display-lg-mobile text-display-lg-mobile text-on-surface font-black tracking-tight">
                  {currentData.totalTime}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                  {currentData.totalSub}
                </span>
              </div>
              <div className="text-right">
                <span className="font-label-sm text-label-sm text-outline block">Baseline Avg</span>
                <span className="font-headline-sm text-headline-sm text-on-surface-variant line-through opacity-70">
                  {currentData.baseline}
                </span>
              </div>
            </div>

            {/* Narrative Micro-Intervention Toast */}
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md leading-relaxed">
              {currentData.narrative}
            </p>

            {/* Multi-Segment Circadian Distribution Bar */}
            <div className="flex flex-col gap-space-2xs mb-space-md">
              <div className="h-3 w-full rounded-full bg-surface-container-high flex overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full rounded-full bg-primary-container transition-all duration-700"
                  style={{ width: `${currentData.deepFocusPct}%` }}
                  title={`Study & Deep Work (${currentData.deepFocusPct}%)`}
                ></div>
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-700 mx-0.5"
                  style={{ width: `${currentData.mindfulPct}%` }}
                  title={`Reading & Mindfulness (${currentData.mindfulPct}%)`}
                ></div>
                <div
                  className="h-full rounded-full bg-tertiary-container transition-all duration-700"
                  style={{ width: `${currentData.socialPct}%` }}
                  title={`Social & Communication (${currentData.socialPct}%)`}
                ></div>
              </div>

              {/* Segment Badges Legend */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Deep Focus <span className="text-outline font-normal">{currentData.deepFocusTime}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Mindful <span className="text-outline font-normal">{currentData.mindfulTime}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Social <span className="text-outline font-normal">{currentData.socialTime}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Circadian Time-of-Day Heatmap / Timeline Section */}
            <div className="p-space-sm rounded-2xl bg-surface-container-low/70 flex flex-col gap-space-xs border border-surface-container-high/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <span className="font-label-md text-label-md font-bold text-on-surface">
                    Circadian Rhythm &amp; Focus Peaks
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  7:00 AM — 11:00 PM
                </span>
              </div>

              {/* Hourly Screen Usage Bar Chart Inline SVG */}
              <div className="w-full h-24 pt-1">
                <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 320 84">
                  {/* Guide lines */}
                  <line opacity="0.6" stroke="#dae2fd" strokeDasharray="2 3" strokeWidth="1" x1="0" x2="320" y1="20" y2="20"></line>
                  <line opacity="0.6" stroke="#dae2fd" strokeDasharray="2 3" strokeWidth="1" x1="0" x2="320" y1="52" y2="52"></line>

                  {/* 7 AM */}
                  <rect fill="#bdc2ff" height="18" rx="3" width="10" x="10" y="58"></rect>
                  {/* 8 AM */}
                  <rect fill="#bdc2ff" height="32" rx="3" width="10" x="28" y="44"></rect>
                  {/* 9 AM (Flow Peak) */}
                  <rect fill="#4f46e5" height="60" rx="3" width="10" x="46" y="16"></rect>
                  {/* 10 AM (Flow Peak) */}
                  <rect fill="#4f46e5" height="66" rx="3" width="10" x="64" y="10"></rect>
                  {/* 11 AM */}
                  <rect fill="#4f46e5" height="52" rx="3" width="10" x="82" y="24"></rect>
                  {/* 12 PM (Lunch break) */}
                  <rect fill="#bdc2ff" height="26" rx="3" width="10" x="100" y="50"></rect>
                  {/* 1 PM */}
                  <rect fill="#bdc2ff" height="34" rx="3" width="10" x="118" y="42"></rect>
                  {/* 2 PM (Afternoon Focus) */}
                  <rect fill="#4f46e5" height="58" rx="3" width="10" x="136" y="18"></rect>
                  {/* 3 PM (Afternoon Focus) */}
                  <rect fill="#4f46e5" height="62" rx="3" width="10" x="154" y="14"></rect>
                  {/* 4 PM */}
                  <rect fill="#4f46e5" height="44" rx="3" width="10" x="172" y="32"></rect>
                  {/* 5 PM */}
                  <rect fill="#bdc2ff" height="28" rx="3" width="10" x="190" y="48"></rect>
                  {/* 6 PM (Wind down) */}
                  <rect fill="#d2d9f4" height="20" rx="3" width="10" x="208" y="56"></rect>
                  {/* 7 PM (Dinner/Social) */}
                  <rect fill="#8792fe" height="30" rx="3" width="10" x="226" y="46"></rect>
                  {/* 8 PM (Mindful Reading) */}
                  <rect fill="#8792fe" height="38" rx="3" width="10" x="244" y="38"></rect>
                  {/* 9 PM (Wind-down transition) */}
                  <rect fill="#d2d9f4" height="22" rx="3" width="10" x="262" y="54"></rect>
                  {/* 10 PM (Downtime starting) */}
                  <rect fill="#e2dfff" height="12" rx="3" width="10" x="280" y="64"></rect>
                  {/* 11 PM (Curfew active) */}
                  <rect fill="#e2dfff" height="6" rx="3" width="10" x="298" y="70"></rect>

                  {/* Target Threshold Line */}
                  <line opacity="0.4" stroke="#bf0f3c" strokeDasharray="3 3" strokeWidth="1.5" x1="0" x2="320" y1="36" y2="36"></line>
                </svg>
              </div>

              {/* Time Axis Labels & Zone Indicators */}
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
                <span>7 AM</span>
                <span className="text-primary font-bold">10 AM Peak</span>
                <span>2 PM</span>
                <span className="text-secondary font-bold">8 PM Wind-down</span>
                <span>11 PM</span>
              </div>
            </div>
          </div>

          {/* Detailed App Usage Breakdown List */}
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between px-space-2xs">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Cadence Breakdown</h3>
              <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider">
                Productivity Vitality
              </span>
            </div>

            {appsList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-surface-container-low text-center text-xs text-outline">
                No apps matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              appsList.map((app) => (
                <div
                  key={app.id}
                  className="p-space-sm rounded-2xl bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-between shadow-sm hover:shadow-md transition-shadow border border-surface-container-high/40"
                >
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl ${app.iconBg} flex items-center justify-center shadow-sm flex-shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{app.icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                          {app.name}
                        </span>
                        {app.hp && (
                          <span className="px-1.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                            {app.hp}
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {app.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-space-xs">
                    <span className="font-metric-numeral text-metric-numeral text-on-surface block leading-none font-extrabold">
                      {app.time}
                    </span>
                    <span className="font-label-sm text-label-sm text-primary font-semibold">{app.pct}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Focus & Downtime Controls Section */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between px-space-2xs">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Protective Protocols</h3>
              <span className="font-label-sm text-label-sm text-secondary font-bold">AUTONOMOUS</span>
            </div>

            {/* Downtime Protocol Master Card */}
            <div className="p-space-md rounded-3xl bg-surface-container-lowest/90 backdrop-blur-xl shadow-md flex flex-col gap-space-sm border border-surface-container-high/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">bedtime</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">
                      Downtime Protocol
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Scheduled nightly silence
                    </span>
                  </div>
                </div>

                {/* Interactive Tactile Switch */}
                <button
                  aria-label="Toggle Downtime Protocol"
                  className={`w-12 h-7 rounded-full p-0.5 flex items-center transition-colors cursor-pointer border-none ${
                    downtimeActive ? 'bg-primary-container justify-end' : 'bg-surface-container-highest justify-start'
                  }`}
                  onClick={handleToggleDowntime}
                  type="button"
                >
                  <span className="w-6 h-6 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center transform transition-transform">
                    {downtimeActive && (
                      <span className="material-symbols-outlined text-[14px] text-primary font-bold">check</span>
                    )}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-space-2xs px-space-xs py-2 rounded-xl bg-surface-container-low text-on-surface">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">nights_stay</span>
                  <span className="font-label-md text-label-md font-semibold">10:30 PM — 7:00 AM</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-bold">
                  In 2h 48m
                </span>
              </div>
            </div>

            {/* App Focus Limits (Micro Stack) */}
            <div className="p-space-md rounded-3xl bg-surface-container-lowest/90 backdrop-blur-xl shadow-md flex flex-col gap-space-sm border border-surface-container-high/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">
                        Active Focus Limits
                      </span>
                      <span className="w-5 h-5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-black flex items-center justify-center">
                        2
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Throttling distracting loops
                    </span>
                  </div>
                </div>
                <button
                  aria-label="Add app limit"
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer border-none"
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setIsAddLimitModalOpen(true);
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>

              {/* Limit Item 1: Instagram */}
              <div className="flex flex-col gap-1.5 p-space-xs rounded-xl bg-surface-container-low/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container"></span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">Instagram Feed</span>
                  </div>
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                    {instagramUsed}m / 20m used
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full bg-tertiary-container transition-all"
                    style={{ width: `${(instagramUsed / 20) * 100}%` }}
                  ></div>
                </div>
                <span className="font-body-sm text-body-sm text-outline text-right">
                  {20 - instagramUsed}m remaining before pause friction
                </span>
              </div>

              {/* Limit Item 2: YouTube */}
              <div className="flex flex-col gap-1.5 p-space-xs rounded-xl bg-surface-container-low/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      YouTube &amp; Shorts
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                    {youtubeUsed}m / 30m used
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary-container transition-all"
                    style={{ width: `${(youtubeUsed / 30) * 100}%` }}
                  ></div>
                </div>
                <span className="font-body-sm text-body-sm text-outline text-right">
                  {30 - youtubeUsed}m mindful quota left
                </span>
              </div>
            </div>

            {/* Mindful Interventions Counter & Delight Moment */}
            <div className="p-space-md rounded-3xl bg-gradient-to-r from-primary-fixed to-secondary-fixed text-on-primary-fixed shadow-md flex items-center justify-between border border-surface-container-high/40">
              <div className="flex items-center gap-space-sm">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest/80 flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-[24px]">psychology_alt</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg font-bold text-on-surface">
                    Mindful Interventions
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    4 gentle pause nudges accepted today
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-metric-numeral text-metric-numeral font-black text-primary leading-none">
                  {currentData.interventions}
                </span>
                <span className="font-label-sm text-label-sm font-bold text-primary">100% Grace</span>
              </div>
            </div>
          </div>

          {/* Catalyst Action: Start Deep Work Protocol Session */}
          <div className="pt-space-xs">
            <button
              className={`w-full h-12 rounded-full font-label-lg text-label-lg font-bold shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border-none ${
                focusShieldActive
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-primary-container text-on-primary shadow-primary-container/30'
              }`}
              onClick={handleToggleFocusShield}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">filter_center_focus</span>
              <span>
                {focusShieldActive
                  ? `Focus Shield Active (${focusTimeRemaining}m left) • Tap to Exit`
                  : 'Activate Focus Shield (45m)'}
              </span>
            </button>
          </div>
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

      {/* Add Focus Limit Modal */}
      {isAddLimitModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddLimitModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-[340px] rounded-3xl bg-surface-container-lowest p-5 shadow-2xl border border-surface-container-high/40 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40 mb-3">
              <h3 className="font-headline-sm text-base font-bold text-on-surface">Add Focus Limit</h3>
              <button
                onClick={() => setIsAddLimitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleAddLimit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Application Name</label>
                <input
                  type="text"
                  placeholder="e.g. TikTok, Twitter, Reddit"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Daily Limit (minutes)</label>
                <select
                  value={newAppLimit}
                  onChange={(e) => setNewAppLimit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface outline-none focus:border-primary"
                >
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLimitModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full bg-surface-container text-on-surface font-semibold text-xs cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-xs cursor-pointer border-none shadow-md shadow-primary/20"
                >
                  Set Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DigitalWellbeingScreen;
