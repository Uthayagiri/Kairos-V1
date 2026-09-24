import React, { useState, useEffect, useMemo } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppTopBar } from '../components/AppTopBar';
import {
  useProgression,
  computeTaskStatusForDate,
  useTaskTimingSettings,
  loadUserCustomTasks,
  saveUserCustomTasks,
  EVENT_CUSTOM_TASKS_UPDATED,
  EVENT_TASK_TIMINGS_UPDATED,
  recordFocusSession,
  calculateSessionDurationMinutes
} from '../features/progression';
import { squadService } from '../features/squad';
import { checkTaskTimeWindow, formatDisplayTime, TaskItem, INITIAL_TASKS, formatDateToISO, isTaskScheduledForDate } from './TasksScreen';
import { syncQueue, syncSerializer } from '../features/sync';

export interface PinnedReminder {
  id?: string;
  title: string;
  desc: string;
  time: string;
  dismissed?: boolean;
  createdAt?: string;
}

export interface DailyReflection {
  id: string;
  text: string;
  date: string;
  createdAt: string;
}

import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON,
  removeUserScopedItem
} from '../features/storage';

export const STORAGE_KEY_PINNED_REMINDER = 'KAIROS_PINNED_REMINDER_V1';
export const STORAGE_KEY_DAILY_REFLECTIONS = 'KAIROS_DAILY_REFLECTIONS_V1';

interface HomeScreenProps {
  userProfile?: { email: string; name: string } | null;
  onNavigateTab?: (tab: string) => void;
  onOpenNotifications?: () => void;
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
    subtitle: 'Your daily rhythm is locked in for high-clarity morning flow.',
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
    subtitle: 'Night recovery rhythm active. Screen dimmed for melatonin restoration.',
    orb1: 'bg-indigo-900/80',
    orb2: 'bg-violet-900/60',
    pulseColor: 'bg-indigo-400',
    isDark: true,
    bodyBg: '#0f1424'
  }
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userProfile,
  onNavigateTab,
  onOpenNotifications
}) => {
  const progression = useProgression();
  const { settings: timingSettings } = useTaskTimingSettings();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [sessionKey, setSessionKey] = useState<string>('afternoon');

  const todayStr = useMemo(() => formatDateToISO(currentTime), [currentTime]);

  // Load custom tasks from localStorage (strictly user-created custom missions)
  const [customTasks, setCustomTasks] = useState<TaskItem[]>(() => loadUserCustomTasks<TaskItem>());

  // Real-time synchronization across all tabs and screens
  useEffect(() => {
    const handleSync = () => {
      setCustomTasks(loadUserCustomTasks<TaskItem>());
    };
    window.addEventListener(EVENT_CUSTOM_TASKS_UPDATED, handleSync);
    window.addEventListener(EVENT_TASK_TIMINGS_UPDATED, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(EVENT_CUSTOM_TASKS_UPDATED, handleSync);
      window.removeEventListener(EVENT_TASK_TIMINGS_UPDATED, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Convert unlocked default tasks into TaskItem objects strictly for TODAY
  const defaultTaskItems = useMemo<TaskItem[]>(() => {
    return progression.unlockedDefaultTasks.map((dt) => {
      const isCompleted = progression.isTaskCompletedToday(dt.id);
      const override = timingSettings.taskOverrides[dt.id];
      const startTime = override?.startTime || dt.startTime || '08:00';
      const endTime = override?.endTime || dt.endTime || '20:00';
      const status = computeTaskStatusForDate(
        {
          id: dt.id,
          startDate: todayStr,
          startTime,
          endDate: todayStr,
          endTime,
          schedule: dt.schedule || 'Weekly Repeat'
        },
        todayStr,
        todayStr,
        isCompleted
      );

      return {
        id: dt.id,
        title: dt.title,
        description: dt.description,
        category: dt.category,
        status,
        priority: dt.priority,
        hp: dt.hp,
        startDate: todayStr,
        startTime,
        endDate: todayStr,
        endTime,
        schedule: dt.schedule,
        createdAt: 'System Routine',
        completedAt: isCompleted ? 'Today' : null
      };
    });
  }, [progression.unlockedDefaultTasks, progression.completedTaskIdsToday, todayStr, timingSettings]);

  // STRICTLY filter custom tasks scheduled for TODAY (including Daily, Weekly, and Monthly recurrences)
  const todaysCustomTasks = useMemo<TaskItem[]>(() => {
    return customTasks
      .filter((t) => t && typeof t.id === 'string' && t.id.startsWith('custom-') && isTaskScheduledForDate(t, todayStr))
      .map((t) => {
        const isRepeating = Boolean(
          t.schedule && (
            t.schedule.toLowerCase().includes('repeat') ||
            t.schedule.toLowerCase().includes('daily') ||
            t.schedule.toLowerCase().includes('routine') ||
            t.schedule.toLowerCase().includes('weekly') ||
            t.schedule.toLowerCase().includes('monthly')
          )
        );
        const isCompleted = isRepeating
          ? progression.isTaskCompletedToday(t.id)
          : (progression.isTaskCompletedToday(t.id) || t.status === 'completed');
        const status = computeTaskStatusForDate(
          t,
          todayStr,
          todayStr,
          isCompleted
        );
        return {
          ...t,
          status,
          completedAt: isCompleted ? t.completedAt || 'Today' : null
        };
      });
  }, [customTasks, todayStr, progression.completedTaskIdsToday]);

  // Combined tasks STRICTLY FOR TODAY
  const todaysTasks: TaskItem[] = useMemo(() => {
    return [...defaultTaskItems, ...todaysCustomTasks];
  }, [defaultTaskItems, todaysCustomTasks]);

  // Momentum & Task State derived strictly from TODAY's completions & capacity
  const hp = progression.todayHP;
  const momentum = Math.min(100, Math.round((progression.todayHP / progression.dailyHpThreshold) * 100));

  const tasksDone = useMemo(() => {
    return todaysTasks.filter((t) => progression.isTaskCompletedToday(t.id) || t.status === 'completed').length;
  }, [todaysTasks, progression.completedTaskIdsToday]);

  const tasksRemaining = useMemo(() => {
    return todaysTasks.filter((t) => !progression.isTaskCompletedToday(t.id) && t.status === 'pending').length;
  }, [todaysTasks, progression.completedTaskIdsToday]);

  // Active tasks: Find all uncompleted tasks for TODAY that are currently within their scheduled time window
  const activeTasks = useMemo(() => {
    return todaysTasks.filter((t) => {
      if (progression.isTaskCompletedToday(t.id) || t.status === 'completed') return false;
      const tw = checkTaskTimeWindow(t.startTime, t.endTime);
      return tw.isWithinWindow;
    });
  }, [todaysTasks, progression.completedTaskIdsToday, currentTime]);

  // Next upcoming task today if no task is active right now
  const nextUpcomingTask = useMemo(() => {
    if (activeTasks.length > 0) return null;
    const upcoming = todaysTasks
      .filter(
        (t) =>
          !progression.isTaskCompletedToday(t.id) &&
          t.status !== 'completed' &&
          checkTaskTimeWindow(t.startTime, t.endTime).isUpcoming
      )
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return upcoming[0] || null;
  }, [todaysTasks, activeTasks.length, progression.completedTaskIdsToday, currentTime]);

  // 1-second ticker for active task countdowns
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setClockTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateTaskRemainingSeconds = (startTimeStr?: string, endTimeStr?: string) => {
    if (!endTimeStr) return 0;
    const now = new Date();
    const [endH, endM] = endTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
    const end = new Date(now);
    end.setHours(endH, endM, 0, 0);

    const [startH, startM] = (startTimeStr || '00:00').split(':').map((v) => parseInt(v, 10) || 0);
    const isCrossMidnight = endH < startH || (endH === startH && endM < startM);

    if (isCrossMidnight && now.getHours() >= startH) {
      end.setDate(end.getDate() + 1);
    }
    return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  };

  // Reminders State (persisted to user-scoped storage)
  const [reminderInput, setReminderInput] = useState('');
  const [pinnedReminder, setPinnedReminder] = useState<PinnedReminder | null>(() => {
    try {
      const parsed = getUserScopedJSON<PinnedReminder | null>(STORAGE_DOMAINS.PINNED_REMINDER, null, userProfile);
      if (parsed && typeof parsed.title === 'string' && !parsed.dismissed) {
        return parsed;
      }
    } catch {}
    return null;
  });

  // Reflections State (persisted to user-scoped storage)
  const [reflections, setReflections] = useState<DailyReflection[]>(() => {
    try {
      const parsed = getUserScopedJSON<DailyReflection[]>(STORAGE_DOMAINS.DAILY_REFLECTIONS, [], userProfile);
      if (Array.isArray(parsed)) {
        return parsed.filter((r) => r && typeof r.text === 'string');
      }
    } catch {}
    return [];
  });
  const [reflectionText, setReflectionText] = useState('');
  const [logStatusMsg, setLogStatusMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize reminders and reflections when active user changes
  useEffect(() => {
    try {
      const parsedReminder = getUserScopedJSON<PinnedReminder | null>(
        STORAGE_DOMAINS.PINNED_REMINDER,
        null,
        userProfile
      );
      setPinnedReminder(
        parsedReminder && typeof parsedReminder.title === 'string' && !parsedReminder.dismissed
          ? parsedReminder
          : null
      );

      const parsedReflections = getUserScopedJSON<DailyReflection[]>(
        STORAGE_DOMAINS.DAILY_REFLECTIONS,
        [],
        userProfile
      );
      setReflections(
        Array.isArray(parsedReflections)
          ? parsedReflections.filter((r) => r && typeof r.text === 'string')
          : []
      );
    } catch {}
  }, [userProfile]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
      toastTimerRef.current = null;
    }, 2400);
  };

  const userName = userProfile?.name || 'Voyager';

  // Real-time clock, Circadian calculator & Midnight Rollover Watcher
  useEffect(() => {
    const updateCircadianAndCheckMidnight = () => {
      const now = new Date();
      setCurrentTime(now);
      progression.checkDailyRollover();
      const hour = now.getHours();
      if (hour >= 5 && hour < 12) setSessionKey('morning');
      else if (hour >= 12 && hour < 17) setSessionKey('afternoon');
      else if (hour >= 17 && hour < 21) setSessionKey('evening');
      else setSessionKey('night');
    };

    updateCircadianAndCheckMidnight();
    const interval = setInterval(updateCircadianAndCheckMidnight, 5000);
    return () => clearInterval(interval);
  }, [progression]);

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

  const handleCompleteActiveTask = (task: TaskItem) => {
    // Strictly enforce scheduled time window check
    const timeWindow = checkTaskTimeWindow(task.startTime, task.endTime);
    if (!timeWindow.isWithinWindow) {
      triggerHaptic(ImpactStyle.Medium);
      if (timeWindow.isUpcoming) {
        showToast(`🔒 Scheduled for ${timeWindow.formattedRange}. You can only complete this task during its scheduled window.`);
      } else {
        showToast(`⏰ Scheduled window closed (${timeWindow.formattedRange}). Tasks can only be completed during their scheduled time.`);
      }
      return;
    }

    triggerHaptic(ImpactStyle.Heavy);
    const res = progression.completeTask({
      id: task.id,
      hp: task.hp,
      title: task.title
    });

    if (res.didLevelUp) {
      showToast(`🎉 Level Up! You reached Level ${res.newLevel}: ${progression.levelTitle}! +${res.hpAwarded} HP (+${res.xpAwarded} XP)`);
    } else {
      showToast(`+${res.hpAwarded} HP (+${res.xpAwarded} XP) Claimed! Mission Completed.`);
    }

    // Record eligible Squad challenge contribution independently (0 additional XP/HP)
    if (res.success) {
      try {
        squadService.recordTaskContribution({
          id: task.id,
          title: task.title,
          category: task.category,
          startTime: task.startTime,
          endTime: task.endTime,
          date: formatDateToISO(new Date())
        });
      } catch {}
    }

    // Record FocusSession if this is a deep work or focus task
    if (
      res.success &&
      (['Deep Work', 'Study', 'Intellect', 'Skill', 'Productivity'].includes(task.category) ||
        /focus|deep work|pomodoro/i.test(task.title))
    ) {
      const dur = calculateSessionDurationMinutes(task.startTime, task.endTime);
      if (dur > 0) {
        recordFocusSession({
          id: `task_focus_${task.id}_${formatDateToISO(new Date())}`,
          startTime: task.startTime || '09:00',
          endTime: task.endTime || '10:00',
          durationMinutes: dur,
          completed: true,
          date: formatDateToISO(new Date()),
          title: task.title,
          category: task.category
        });
      }
    }

    // Also persist completion to custom tasks if custom
    if (customTasks.some((t) => t.id === task.id)) {
      const updated = customTasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: 'completed' as const,
              completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          : t
      );
      setCustomTasks(updated);
      saveUserCustomTasks(updated);
    }
  };

  const handleAddReminder = () => {
    if (!reminderInput.trim()) return;
    triggerHaptic(ImpactStyle.Medium);
    const newReminder: PinnedReminder = {
      id: `reminder-${Date.now()}`,
      title: reminderInput.trim(),
      desc: 'Pinned from Quick Notes.',
      time: 'Today',
      dismissed: false,
      createdAt: new Date().toISOString()
    };
    setPinnedReminder(newReminder);
    try {
      setUserScopedJSON(STORAGE_DOMAINS.PINNED_REMINDER, newReminder, userProfile);
    } catch {}
    setReminderInput('');
    showToast('Reminder pinned!');
  };

  const handleSimulateVoice = () => {
    triggerHaptic(ImpactStyle.Light);
    setReminderInput('Review CS thesis outline by 8:00 PM');
  };

  const handleDismissReminder = () => {
    triggerHaptic(ImpactStyle.Light);
    setPinnedReminder(null);
    try {
      removeUserScopedItem(STORAGE_DOMAINS.PINNED_REMINDER, userProfile);
    } catch {}
    showToast('Reminder dismissed');
  };

  const handleSaveReflection = () => {
    if (!reflectionText.trim()) return;
    triggerHaptic(ImpactStyle.Medium);
    const newRecord: DailyReflection = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      text: reflectionText.trim(),
      date: todayStr,
      createdAt: new Date().toISOString()
    };
    const updated = [newRecord, ...reflections];
    setReflections(updated);
    try {
      setUserScopedJSON(STORAGE_DOMAINS.DAILY_REFLECTIONS, updated, userProfile);
      syncQueue.enqueue(
        'DAILY_REFLECTION_UPSERTED',
        syncSerializer.dailyReflectionUpserted({
          date: todayStr,
          journalText: newRecord.text
        })
      );
    } catch {}
    setLogStatusMsg('Reflections synced to your Daily Flow!');
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
      {/* Top Header App Bar (Left: Splash Orb + Title/Subtitle; Right: Notifications icon only) */}
      <AppTopBar
        subtitle="Home Sanctuary"
        rightAction={
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              if (onOpenNotifications) {
                onOpenNotifications();
              } else if (onNavigateTab) {
                onNavigateTab('notifications');
              }
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 bg-surface-container-low/70 active:scale-95 transition-all cursor-pointer border-none"
            aria-label="Notifications"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tertiary ring-2 ring-surface animate-pulse" />
          </button>
        }
      />

      {/* Main Scrollable Canvas Area */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-28 space-y-4 relative mobile-scroll">
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
                <span className="text-xs font-bold">{progression.todayHP} / {progression.dailyHpThreshold} HP</span>
              </div>
              <span className="text-[11px] text-on-surface-variant mt-1 font-semibold">
                Daily Capacity: {progression.dailyHpThreshold} HP
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
        <div className="relative rounded-3xl p-4 bg-surface-container-lowest/95 backdrop-blur-xl shadow-xs flex flex-col gap-3 border border-surface-container-highest/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-xl ${activeTasks.length > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                {activeTasks.length > 0 ? 'play_circle' : 'schedule'}
              </span>
              <h2 className="text-base text-on-surface font-bold">Active Task Window</h2>
            </div>
            {activeTasks.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> {activeTasks.length === 1 ? 'Live Now' : `${activeTasks.length} Active Now`}
              </span>
            ) : nextUpcomingTask ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold border border-surface-container-highest/60">
                <span className="material-symbols-outlined text-xs">schedule</span> Next at {formatDisplayTime(nextUpcomingTask.startTime)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary text-xs font-semibold border border-primary/20">
                <span className="material-symbols-outlined text-xs">check_circle</span> All Synced
              </span>
            )}
          </div>

          {activeTasks.length > 0 ? (
            /* Display one below the other */
            <div className="flex flex-col gap-3">
              {activeTasks.map((task) => {
                const secs = calculateTaskRemainingSeconds(task.startTime, task.endTime);
                return (
                  <div
                    key={task.id}
                    className="relative p-3.5 rounded-2xl bg-gradient-to-br from-primary-fixed/30 via-surface-container-low to-surface-container-high/60 border border-primary/20 shadow-xs flex flex-col gap-2.5 animate-fade-in"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-primary font-bold px-2.5 py-0.5 rounded-full bg-primary-container/10">
                            {formatDisplayTime(task.startTime)} – {formatDisplayTime(task.endTime)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-[11px] font-bold">
                            In Progress • {task.priority} Priority
                          </span>
                        </div>
                        <h3 className="text-base text-on-surface font-bold pt-0.5">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-xs font-bold shadow-xs">
                        <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                        +{task.hp} HP
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
                            {formatTimer(secs)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCompleteActiveTask(task)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer bg-primary text-on-primary hover:bg-primary-container active:scale-95"
                        type="button"
                      >
                        Complete
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-xs text-on-surface-variant">
                          {task.category} • {task.schedule || 'Daily Routine'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* No Active Task State */
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-surface-container-low via-surface-container-low/80 to-surface-container-high/40 border border-surface-container-highest/60 shadow-xs flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high/80 border border-surface-container-highest flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-2xl">
                  {nextUpcomingTask ? 'schedule' : 'event_available'}
                </span>
              </div>
              <h3 className="text-sm text-on-surface font-bold">
                No Active Task Scheduled
              </h3>

              <button
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  if (onNavigateTab) {
                    onNavigateTab('tasks');
                  } else {
                    handleTabClick('tasks');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all border border-surface-container-highest/60 cursor-pointer shadow-2xs active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">checklist</span> View All Tasks
              </button>
            </div>
          )}
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
          {pinnedReminder && !pinnedReminder.dismissed && (
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

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-18 inset-x-4 z-50 flex justify-center pointer-events-none animate-fade-in">
          <div className="bg-inverse-surface text-inverse-on-surface px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold max-w-sm">
            <span className="material-symbols-outlined text-[17px] text-primary-fixed">
              auto_awesome
            </span>
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Floating Native Bottom Navigation Dock */}
      <BottomNavBar
        activeTab={activeTab}
        onNavigateTab={handleTabClick}
        userInitial={userProfile?.name?.[0] || 'A'}
      />
    </div>
  );
};
