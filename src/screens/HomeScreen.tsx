import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface HomeScreenProps {
  userProfile?: { email: string; name: string } | null;
  onNavigateTab?: (tab: string) => void;
}

interface CircadianProfile {
  name: string;
  hoursRange: string;
  sessionTitle: string;
  icon: string;
  iconBoxClass: string;
  borderGlowClass: string;
  greeting: string;
  subtitle: string;
  orb1: string;
  orb2: string;
  pulseColor: string;
  isDark: boolean;
  bodyBg: string;
}

const CIRCADIAN_PROFILES: Record<string, CircadianProfile> = {
  morning: {
    name: 'morning',
    hoursRange: '5:00 AM – 11:59 AM',
    sessionTitle: 'Morning Flow • Auto-Synced',
    icon: 'wb_sunny',
    iconBoxClass: 'bg-amber-100 text-amber-700',
    borderGlowClass: 'border-amber-200/80',
    greeting: 'Good morning',
    subtitle: 'Your circadian cadence is locked in for high-clarity morning flow.',
    orb1: 'bg-amber-300/60',
    orb2: 'bg-orange-200/50',
    pulseColor: 'bg-amber-500',
    isDark: false,
    bodyBg: '#faf8ff'
  },
  afternoon: {
    name: 'afternoon',
    hoursRange: '12:00 PM – 4:59 PM',
    sessionTitle: 'Afternoon Focus • Auto-Synced',
    icon: 'light_mode',
    iconBoxClass: 'bg-blue-100 text-blue-700',
    borderGlowClass: 'border-blue-200/80',
    greeting: 'Good afternoon',
    subtitle: 'Sunlight peak: stay energized and hydrated through collaborative work.',
    orb1: 'bg-cyan-300/60',
    orb2: 'bg-indigo-300/50',
    pulseColor: 'bg-blue-500',
    isDark: false,
    bodyBg: '#f4f9ff'
  },
  evening: {
    name: 'evening',
    hoursRange: '5:00 PM – 8:59 PM',
    sessionTitle: 'Evening Unwind • Auto-Synced',
    icon: 'wb_twilight',
    iconBoxClass: 'bg-rose-100 text-rose-700',
    borderGlowClass: 'border-rose-200/80',
    greeting: 'Good evening',
    subtitle: 'Twilight decompression: wrap epics and ease into restorative pacing.',
    orb1: 'bg-rose-300/60',
    orb2: 'bg-purple-300/50',
    pulseColor: 'bg-rose-500',
    isDark: false,
    bodyBg: '#fcf6fb'
  },
  night: {
    name: 'night',
    hoursRange: '9:00 PM – 4:59 AM',
    sessionTitle: 'Night Recovery • Auto-Synced',
    icon: 'bedtime',
    iconBoxClass: 'bg-indigo-950 text-indigo-300',
    borderGlowClass: 'border-indigo-800/60',
    greeting: 'Good night',
    subtitle: 'Celestial cadence active. Screen dimmed for melatonin restoration.',
    orb1: 'bg-indigo-900/80',
    orb2: 'bg-violet-900/60',
    pulseColor: 'bg-indigo-400',
    isDark: true,
    bodyBg: '#0f1424'
  }
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ userProfile, onNavigateTab }) => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [sessionKey, setSessionKey] = useState<string>('afternoon');

  // Momentum & Task State
  const [momentum, setMomentum] = useState(68);
  const [hp, setHp] = useState(140);
  const [tasksDone, setTasksDone] = useState(5);
  const [tasksRemaining, setTasksRemaining] = useState(3);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(2658); // 44:18

  // Reminders State
  const [reminderInput, setReminderInput] = useState('');
  const [pinnedReminder, setPinnedReminder] = useState({
    title: 'Pick up study materials before 6 PM',
    desc: 'Campus bookstore closes early for inventory check.',
    time: 'Before 6:00 PM',
    dismissed: false
  });

  // Daily Rituals State
  const [rituals, setRituals] = useState([
    {
      id: 1,
      title: 'Morning Wake-up & Sunlight',
      desc: 'Completed at 7:15 AM',
      icon: 'done',
      status: 'Done'
    },
    {
      id: 2,
      title: 'Hydration Target 1.5L',
      desc: '1.1L / 1.5L logged today',
      icon: 'water_drop',
      status: 'In Progress'
    },
    {
      id: 3,
      title: 'Afternoon Reset Walk',
      desc: 'Target 20 mins post-lunch',
      icon: 'directions_walk',
      status: 'Pending'
    }
  ]);

  // Reflection State
  const [reflectionText, setReflectionText] = useState('');
  const [logStatusMsg, setLogStatusMsg] = useState<string | null>(null);

  const userName = userProfile?.name || 'Alex';

  // Real-time clock & Circadian calculator
  useEffect(() => {
    const updateCircadian = () => {
      const now = new Date();
      setCurrentTime(now);
      const hour = now.getHours();
      if (hour >= 5 && hour < 12) setSessionKey('morning');
      else if (hour >= 12 && hour < 17) setSessionKey('afternoon');
      else if (hour >= 17 && hour < 21) setSessionKey('evening');
      else setSessionKey('night');
    };

    updateCircadian();
    const interval = setInterval(updateCircadian, 30000);
    return () => clearInterval(interval);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (taskCompleted || timerSeconds <= 0) return;
    const t = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [taskCompleted, timerSeconds]);

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // Fallback
    }
  };

  const profile = CIRCADIAN_PROFILES[sessionKey] || CIRCADIAN_PROFILES.afternoon;

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteTask = () => {
    triggerHaptic(ImpactStyle.Medium);
    if (!taskCompleted) {
      setTaskCompleted(true);
      setMomentum((prev) => Math.min(prev + 12, 100));
      setHp((prev) => prev + 45);
      setTasksDone((prev) => prev + 1);
      setTasksRemaining((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleAddReminder = () => {
    if (!reminderInput.trim()) return;
    triggerHaptic(ImpactStyle.Medium);
    setPinnedReminder({
      title: reminderInput,
      desc: 'Pinned from Quick Notes.',
      time: 'Today',
      dismissed: false
    });
    setReminderInput('');
  };

  const handleSimulateVoice = () => {
    triggerHaptic(ImpactStyle.Light);
    setReminderInput('Review CS thesis outline by 8:00 PM');
  };

  const handleDismissReminder = () => {
    triggerHaptic(ImpactStyle.Light);
    setPinnedReminder((prev) => ({ ...prev, dismissed: true }));
  };

  const toggleRitual = (id: number) => {
    triggerHaptic(ImpactStyle.Light);
    setRituals((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextStatus = r.status === 'Done' ? 'Pending' : r.status === 'Pending' ? 'In Progress' : 'Done';
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  const handleSaveReflection = () => {
    if (!reflectionText.trim()) return;
    triggerHaptic(ImpactStyle.Medium);
    setLogStatusMsg('Reflections synced to Kairos Cadence!');
    setTimeout(() => {
      setLogStatusMsg(null);
      setReflectionText('');
    }, 2500);
  };

  const handleTabClick = (tabId: string) => {
    triggerHaptic(ImpactStyle.Light);
    setActiveTab(tabId);
    if (onNavigateTab) onNavigateTab(tabId);
  };

  const dateString = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const timeString = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="w-full h-full flex flex-col bg-surface overflow-hidden relative selection:bg-primary-fixed selection:text-on-primary-fixed antialiased animate-fade-in">
      {/* Top Header App Bar */}
      <header className="fixed top-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl shadow-xs pt-safe border-b border-surface-container/60 transition-colors duration-400">
        <div className="h-14 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#38bdf8] via-[#818cf8] to-[#ec4899] flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20"
            >
              <span className="text-white font-bold text-sm tracking-tighter leading-none select-none font-serif">
                K
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-base tracking-tight text-on-surface font-bold leading-tight">
                Kairos
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium">Home</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => triggerHaptic(ImpactStyle.Light)}
              className="relative w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface bg-surface-container-low border border-outline-variant/40 active:scale-95 transition-all cursor-pointer"
              aria-label="Notifications"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tertiary ring-2 ring-surface" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Canvas Area */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-5 pt-16 pb-28 space-y-4 relative">
        {/* Ambient Glow Orbs */}
        <div className="relative w-full overflow-hidden pointer-events-none -mb-4">
          <div
            className={`absolute -top-10 -left-10 w-52 h-52 rounded-full blur-3xl transition-all duration-700 ${profile.orb1}`}
          />
          <div
            className={`absolute top-10 -right-10 w-56 h-56 rounded-full blur-3xl transition-all duration-700 ${profile.orb2}`}
          />
        </div>

        {/* Top Hero Header: Personal Greeting & Live Time Badge */}
        <div className="relative flex flex-col gap-1.5 z-10 pt-1">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant shadow-2xs">
              <span className="material-symbols-outlined text-xs text-primary">calendar_today</span>
              <span className="text-xs uppercase tracking-wide text-on-surface font-bold">
                {dateString}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest shadow-2xs border border-outline-variant/30">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-xs text-secondary font-extrabold">{timeString} LIVE</span>
            </div>
          </div>

          <div className="pt-1">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              {profile.greeting}, {userName} 🌤️
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
              {profile.subtitle}
            </p>
          </div>
        </div>

        {/* Today's Momentum & HP Card (Glassmorphic) */}
        <div className="relative rounded-3xl p-4 bg-surface-container-lowest/95 backdrop-blur-xl shadow-xs overflow-hidden border border-surface-container-highest/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-lg">bolt</span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block font-bold leading-none">
                  Today's Momentum
                </span>
                <span className="text-lg text-on-surface font-extrabold">
                  {momentum}% <span className="text-xs text-on-surface-variant font-normal">paced</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary border border-primary/20">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
                <span className="text-xs font-bold">+{hp} HP today</span>
              </div>
              <span className="text-[11px] text-on-surface-variant mt-1 font-semibold">
                Energy Peak: High
              </span>
            </div>
          </div>

          {/* Momentum Progress Track */}
          <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-secondary via-primary-container to-primary transition-all duration-700 shadow-xs"
              style={{ width: `${momentum}%` }}
            />
          </div>

          {/* Today's Metric Stat Chips */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-highest/40">
              <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-sm text-on-surface font-extrabold block leading-tight">
                  {tasksDone} Done
                </span>
                <span className="text-[11px] text-on-surface-variant">Completed today</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-highest/40">
              <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-base">pending_actions</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm text-on-surface font-extrabold block leading-tight">
                  {tasksRemaining} Remaining
                </span>
                <span className="text-[11px] text-on-surface-variant">Queued ahead</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Task Window */}
        <div className="relative rounded-3xl p-4 bg-surface-container-lowest/95 backdrop-blur-xl shadow-xs flex flex-col gap-2.5 border border-surface-container-highest/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">play_circle</span>
              <h2 className="text-base text-on-surface font-bold">Active Task Window</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> Live Now
            </span>
          </div>

          {/* Featured Sole Active Focus Task */}
          <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-primary-fixed/30 via-surface-container-low to-surface-container-high/60 border border-primary/20 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-primary font-bold px-2.5 py-0.5 rounded-full bg-primary-container/10">
                    11:00 AM – 12:30 PM
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-[11px] font-bold">
                    {taskCompleted ? 'Completed' : 'In Progress • High Priority'}
                  </span>
                </div>
                <h3 className="text-base text-on-surface font-bold pt-0.5">
                  Deep Study: Distributed Systems
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Raft Consensus Algorithm review &amp; node cluster diagrams.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-xs font-bold shadow-xs">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                +45 HP
              </div>
            </div>

            {/* Active Timer Countdown Bar */}
            <div className="p-2.5 rounded-xl bg-surface-container-lowest/90 border border-surface-container-high flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">timer</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block leading-none">
                    Time Remaining
                  </span>
                  <span className="text-base font-extrabold text-on-surface tracking-tight leading-tight">
                    {taskCompleted ? '00:00:00 (Done)' : formatTimer(timerSeconds)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCompleteTask}
                disabled={taskCompleted}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  taskCompleted
                    ? 'bg-surface-container-high text-primary font-bold'
                    : 'bg-primary text-on-primary hover:bg-primary-container active:scale-95'
                }`}
                type="button"
              >
                {taskCompleted ? 'Completed ✓' : 'Complete'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs text-on-surface-variant">
                  Library Silent Floor B • Desk 14
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Remember This For Me */}
        <div className="relative rounded-3xl p-4 bg-surface-container-lowest/95 backdrop-blur-xl shadow-xs border border-surface-container-highest/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-base">push_pin</span>
              </div>
              <h2 className="text-base text-on-surface font-bold">Remember This For Me</h2>
            </div>
          </div>

          {/* Input and Voice Control */}
          <div className="relative flex items-center">
            <input
              className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-2xs"
              placeholder="Kairos, remember to pick up groceries..."
              type="text"
              value={reminderInput}
              onChange={(e) => setReminderInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddReminder()}
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                onClick={handleSimulateVoice}
                className="w-8 h-8 rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                title="Voice memo"
                type="button"
              >
                <span className="material-symbols-outlined text-base">mic</span>
              </button>
              <button
                onClick={handleAddReminder}
                className="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-all active:scale-95 shadow-xs cursor-pointer"
                type="button"
              >
                Save
              </button>
            </div>
          </div>

          {/* Pinned Reminder Active Preview Card */}
          {!pinnedReminder.dismissed && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-tertiary-fixed/70 border border-tertiary-fixed-dim text-on-tertiary-fixed transition-all animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-sm">notification_important</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-on-tertiary-fixed-variant font-bold">
                    Pinned Reminder
                  </span>
                  <span className="text-xs font-bold text-tertiary">{pinnedReminder.time}</span>
                </div>
                <p className="text-xs font-bold text-on-tertiary-fixed leading-snug mt-0.5">
                  {pinnedReminder.title}
                </p>
                <p className="text-[11px] text-on-tertiary-fixed-variant leading-tight">
                  {pinnedReminder.desc}
                </p>
              </div>
              <button
                onClick={handleDismissReminder}
                className="text-on-tertiary-fixed-variant hover:text-tertiary p-1 shrink-0 cursor-pointer"
                aria-label="Dismiss reminder"
                type="button"
              >
                <span className="material-symbols-outlined text-base">check</span>
              </button>
            </div>
          )}
        </div>

        {/* Daily Rituals Progress */}
        <div className="relative rounded-3xl p-4 bg-surface-container-lowest/95 backdrop-blur-xl shadow-xs flex flex-col gap-2.5 border border-surface-container-highest/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">routine</span>
              <h2 className="text-base text-on-surface font-bold">Daily Rituals</h2>
            </div>
            <span className="text-xs text-on-surface-variant font-semibold">
              {rituals.filter((r) => r.status === 'Done').length} of {rituals.length} Completed
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {rituals.map((r) => (
              <div
                key={r.id}
                onClick={() => toggleRitual(r.id)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 active:scale-[0.98] transition-all cursor-pointer"
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      r.status === 'Done'
                        ? 'bg-primary text-on-primary'
                        : r.status === 'In Progress'
                        ? 'bg-secondary-fixed text-secondary animate-pulse'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{r.icon}</span>
                  </div>
                  <div>
                    <span
                      className={`text-xs block font-bold leading-tight ${
                        r.status === 'Done' ? 'line-through opacity-70 text-on-surface' : 'text-on-surface'
                      }`}
                    >
                      {r.title}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">{r.desc}</span>
                  </div>
                </div>

                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                    r.status === 'Done'
                      ? 'bg-surface-container-high text-primary'
                      : r.status === 'In Progress'
                      ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mindful Anchor Banner */}
        <div className="relative w-full h-20 rounded-3xl overflow-hidden shadow-xs border border-outline-variant/30">
          <div
            className="bg-cover bg-center w-full h-full"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBLyaFe327ebEx-V9fX5T1RkE9UXmwSTJoSBs8KG-740YSeX-k0MtzpBhcgA9EfTE7CeAkfEkZ9BVcVgurqftJgjv3YFgRJw9hoFgCfFF7R0jTpcPuy8mCYJDiakGLoSgUxQZxmMOcoQR4UUfd5GJEPioH4-LE3Qnlq_qf9WsYfF_xF6Ve02Mbo9EM0hkA6dcXI4QKOEqq0XaQIHbHJfVprh_J7jZ0XxCh0XTmefNEZD-V0sPDvP2G-oQ')"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/90 via-inverse-surface/60 to-transparent flex items-center px-4">
            <div className="flex flex-col text-inverse-on-surface max-w-[280px]">
              <span className="text-[10px] uppercase tracking-wider text-inverse-primary font-bold leading-none">
                Mindful Anchor
              </span>
              <span className="text-xs font-bold leading-snug mt-1 text-white">
                "Flow isn't rushed; it arrives when you give today your full presence."
              </span>
            </div>
          </div>
        </div>

        {/* Daily Quick Log Reflection Card */}
        <div className="relative rounded-3xl p-4 bg-surface-container-lowest/95 backdrop-blur-xl shadow-xs border border-surface-container-highest/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-secondary-fixed text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-base">edit_note</span>
              </div>
              <h2 className="text-base text-on-surface font-bold">Daily Quick Log</h2>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">
            How has your energy and focus unfolded so far today?
          </p>

          <div className="relative flex flex-col gap-2">
            <textarea
              className="w-full p-3 rounded-2xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="Today I focused on distributed systems and balanced flow..."
              rows={2}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary animate-fade-in">
                {logStatusMsg}
              </span>
              <button
                onClick={handleSaveReflection}
                className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary-container active:scale-95 transition-all ml-auto cursor-pointer"
                type="button"
              >
                Log Day Note
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Native Bottom Navigation Dock */}
      <nav
        className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none pb-safe"
        data-active-classes="bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]"
      >
        <div className="pointer-events-auto flex items-center justify-between w-full max-w-[390px] h-16 px-3 rounded-full bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_16px_40px_-6px_rgba(19,27,46,0.12),0_2px_12px_rgba(53,37,205,0.06)] border border-surface-container-high/60">
          {/* Home */}
          <button
            onClick={() => handleTabClick('home')}
            aria-label="Home Dashboard"
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
              activeTab === 'home'
                ? 'bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">home</span>
          </button>

          {/* Tasks & Routines */}
          <button
            onClick={() => handleTabClick('tasks')}
            aria-label="Daily Tasks and Rituals"
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
          </button>

          {/* AI Companion */}
          <button
            onClick={() => handleTabClick('companion')}
            aria-label="Kairos AI Companion"
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
              activeTab === 'companion'
                ? 'bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </button>

          {/* Squad Quests */}
          <button
            onClick={() => handleTabClick('squad')}
            aria-label="Friends and Squad Challenges"
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
              activeTab === 'squad'
                ? 'bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">groups</span>
          </button>

          {/* Profile & Evolution */}
          <button
            onClick={() => handleTabClick('profile')}
            aria-label="Profile Analytics and Evolution"
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">person</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
