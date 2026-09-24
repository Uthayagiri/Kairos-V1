import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppTopBar } from '../components/AppTopBar';
import { recordFocusSession } from '../features/progression';
import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON
} from '../features/storage';

interface DigitalWellbeingScreenProps {
  userProfile?: { email: string; name: string } | null;
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
}

type Timeframe = 'today' | 'week' | 'month' | 'year';

interface AppLimitItem {
  id: string;
  name: string;
  limitMinutes: number;
  usedMinutes: number;
  icon: string;
  iconBg: string;
  isLocked?: boolean;
}

interface BreakInterval {
  id: string;
  time: string;
  durationMinutes: number;
  type: string;
  note: string;
  icon: string;
}

interface HourlyUsage {
  hour: number; // 0 - 23
  label: string; // e.g. "10 AM"
  usedMinutes: number; // 0 - 60
  deepFocusMinutes: number;
  mindfulMinutes: number;
  socialMinutes: number;
  topApps: { name: string; minutes: number }[];
  isPeak?: boolean;
  phase: string;
}

// 24-Hour Timeline Data (00:00 to 23:00)
const HOURLY_24H_DATA: HourlyUsage[] = [
  { hour: 0, label: '12 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
  { hour: 1, label: '1 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
  { hour: 2, label: '2 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
  { hour: 3, label: '3 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
  { hour: 4, label: '4 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
  { hour: 5, label: '5 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
  { hour: 6, label: '6 AM', usedMinutes: 8, deepFocusMinutes: 0, mindfulMinutes: 6, socialMinutes: 2, topApps: [{ name: 'Kairos', minutes: 6 }, { name: 'Messages', minutes: 2 }], phase: 'Morning Wakeup' },
  { hour: 7, label: '7 AM', usedMinutes: 18, deepFocusMinutes: 8, mindfulMinutes: 7, socialMinutes: 3, topApps: [{ name: 'Kindle', minutes: 7 }, { name: 'Notion', minutes: 8 }, { name: 'Messages', minutes: 3 }], phase: 'Morning Habit Routine' },
  { hour: 8, label: '8 AM', usedMinutes: 34, deepFocusMinutes: 22, mindfulMinutes: 8, socialMinutes: 4, topApps: [{ name: 'Notion', minutes: 18 }, { name: 'Kairos', minutes: 8 }], phase: 'Cognitive Ramp-up' },
  { hour: 9, label: '9 AM', usedMinutes: 48, deepFocusMinutes: 38, mindfulMinutes: 6, socialMinutes: 4, topApps: [{ name: 'Notion', minutes: 26 }, { name: 'VS Code', minutes: 16 }], isPeak: true, phase: '⚡ Peak Deep Work' },
  { hour: 10, label: '10 AM', usedMinutes: 56, deepFocusMinutes: 46, mindfulMinutes: 4, socialMinutes: 6, topApps: [{ name: 'Notion', minutes: 32 }, { name: 'Slack', minutes: 14 }, { name: 'Kairos', minutes: 10 }], isPeak: true, phase: '⚡ Primary Focus Peak' },
  { hour: 11, label: '11 AM', usedMinutes: 42, deepFocusMinutes: 30, mindfulMinutes: 6, socialMinutes: 6, topApps: [{ name: 'Notion', minutes: 22 }, { name: 'Slack', minutes: 12 }], phase: 'Late Morning Flow' },
  { hour: 12, label: '12 PM', usedMinutes: 24, deepFocusMinutes: 4, mindfulMinutes: 12, socialMinutes: 8, topApps: [{ name: 'YouTube', minutes: 12 }, { name: 'Messages', minutes: 8 }], phase: '☕ Lunch & Rest Interval' },
  { hour: 13, label: '1 PM', usedMinutes: 32, deepFocusMinutes: 18, mindfulMinutes: 8, socialMinutes: 6, topApps: [{ name: 'Notion', minutes: 14 }, { name: 'Kindle', minutes: 10 }], phase: 'Midday Re-alignment' },
  { hour: 14, label: '2 PM', usedMinutes: 52, deepFocusMinutes: 40, mindfulMinutes: 4, socialMinutes: 8, topApps: [{ name: 'Notion', minutes: 28 }, { name: 'VS Code', minutes: 18 }], isPeak: true, phase: '⚡ Afternoon Focus Peak' },
  { hour: 15, label: '3 PM', usedMinutes: 46, deepFocusMinutes: 34, mindfulMinutes: 6, socialMinutes: 6, topApps: [{ name: 'Notion', minutes: 24 }, { name: 'Slack', minutes: 14 }], isPeak: true, phase: '⚡ Afternoon Deep Flow' },
  { hour: 16, label: '4 PM', usedMinutes: 36, deepFocusMinutes: 24, mindfulMinutes: 6, socialMinutes: 6, topApps: [{ name: 'Notion', minutes: 18 }, { name: 'Messages', minutes: 10 }], phase: 'Focus Wrap-up' },
  { hour: 17, label: '5 PM', usedMinutes: 26, deepFocusMinutes: 10, mindfulMinutes: 10, socialMinutes: 6, topApps: [{ name: 'Kairos', minutes: 10 }, { name: 'Instagram', minutes: 8 }], phase: 'Day Transition & Rest' },
  { hour: 18, label: '6 PM', usedMinutes: 18, deepFocusMinutes: 2, mindfulMinutes: 8, socialMinutes: 8, topApps: [{ name: 'Messages', minutes: 10 }, { name: 'Instagram', minutes: 6 }], phase: 'Social Connection' },
  { hour: 19, label: '7 PM', usedMinutes: 28, deepFocusMinutes: 4, mindfulMinutes: 14, socialMinutes: 10, topApps: [{ name: 'YouTube', minutes: 16 }, { name: 'Messages', minutes: 8 }], phase: 'Evening Wind-down' },
  { hour: 20, label: '8 PM', usedMinutes: 38, deepFocusMinutes: 6, mindfulMinutes: 24, socialMinutes: 8, topApps: [{ name: 'Kindle', minutes: 22 }, { name: 'Kairos', minutes: 10 }], isPeak: true, phase: '📖 Mindful Reading Peak' },
  { hour: 21, label: '9 PM', usedMinutes: 22, deepFocusMinutes: 0, mindfulMinutes: 16, socialMinutes: 6, topApps: [{ name: 'Kindle', minutes: 14 }, { name: 'Kairos', minutes: 6 }], phase: 'Night Wind-down' },
  { hour: 22, label: '10 PM', usedMinutes: 12, deepFocusMinutes: 0, mindfulMinutes: 10, socialMinutes: 2, topApps: [{ name: 'Kairos', minutes: 8 }], phase: '🌙 Nightly Downtime Starting' },
  { hour: 23, label: '11 PM', usedMinutes: 4, deepFocusMinutes: 0, mindfulMinutes: 4, socialMinutes: 0, topApps: [{ name: 'Kairos', minutes: 4 }], phase: '🌙 Curfew Active' }
];

const INITIAL_LIMITS: AppLimitItem[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    limitMinutes: 20,
    usedMinutes: 14,
    icon: 'photo_camera',
    iconBg: 'bg-rose-500/10 text-rose-600'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    limitMinutes: 30,
    usedMinutes: 28,
    icon: 'play_circle',
    iconBg: 'bg-red-500/10 text-red-600'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    limitMinutes: 15,
    usedMinutes: 15,
    icon: 'smartphone',
    iconBg: 'bg-purple-500/10 text-purple-600'
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    limitMinutes: 25,
    usedMinutes: 10,
    icon: 'tag',
    iconBg: 'bg-sky-500/10 text-sky-600'
  }
];

const INITIAL_BREAK_INTERVALS: BreakInterval[] = [
  {
    id: 'b1',
    time: '10:30 AM',
    durationMinutes: 5,
    type: 'Micro-break',
    note: '20-20-20 Eye strain rest & hydration',
    icon: 'visibility'
  },
  {
    id: 'b2',
    time: '12:45 PM',
    durationMinutes: 15,
    type: 'Walking Recovery',
    note: 'Physical reset & sunlight exposure',
    icon: 'directions_walk'
  },
  {
    id: 'b3',
    time: '3:15 PM',
    durationMinutes: 10,
    type: 'Box Breathing',
    note: 'Circadian afternoon rejuvenation',
    icon: 'self_improvement'
  },
  {
    id: 'b4',
    time: '5:30 PM',
    durationMinutes: 5,
    type: 'Screen Detachment',
    note: 'Pre-evening cognitive cooldown',
    icon: 'spa'
  }
];

interface AppUsageItem {
  id: string;
  name: string;
  timeMinutes: number;
  icon: string;
  iconBg: string;
}

const INITIAL_APPS_USAGE: AppUsageItem[] = [
  { id: 'notion', name: 'Notion', timeMinutes: 75, icon: 'edit_note', iconBg: 'bg-primary-fixed/30 text-primary' },
  { id: 'kindle', name: 'Kindle', timeMinutes: 55, icon: 'menu_book', iconBg: 'bg-secondary-fixed/30 text-secondary' },
  { id: 'companion', name: 'Kairos', timeMinutes: 47, icon: 'auto_awesome', iconBg: 'bg-primary-container text-on-primary' },
  { id: 'messages', name: 'Messages', timeMinutes: 45, icon: 'forum', iconBg: 'bg-surface-container-high text-on-surface-variant' },
  { id: 'youtube', name: 'YouTube', timeMinutes: 28, icon: 'play_circle', iconBg: 'bg-red-500/10 text-red-600' },
  { id: 'tiktok', name: 'TikTok', timeMinutes: 15, icon: 'smartphone', iconBg: 'bg-purple-500/10 text-purple-600' },
  { id: 'instagram', name: 'Instagram', timeMinutes: 14, icon: 'photo_camera', iconBg: 'bg-rose-500/10 text-rose-600' },
  { id: 'twitter', name: 'X (Twitter)', timeMinutes: 10, icon: 'tag', iconBg: 'bg-sky-500/10 text-sky-600' }
];

export function DigitalWellbeingScreen({
  userProfile,
  onBack,
  onNavigateTab
}: DigitalWellbeingScreenProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('today');
  const [selectedHour, setSelectedHour] = useState<number>(10); // Default to peak hour 10 AM
  const [searchQuery, setSearchQuery] = useState('');
  const [focusShieldActive, setFocusShieldActive] = useState(false);
  const [focusTimeRemaining, setFocusTimeRemaining] = useState(45);
  const [focusStartTime, setFocusStartTime] = useState<Date | null>(null);

  // Dynamic Apps Screen Time Usage State
  const [appsUsage, setAppsUsage] = useState<AppUsageItem[]>(() => {
    try {
      const parsed = getUserScopedJSON<AppUsageItem[]>(STORAGE_DOMAINS.APPS_USAGE, INITIAL_APPS_USAGE);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
    return INITIAL_APPS_USAGE;
  });

  // Dynamic 24h Timeline State
  const [hourlyTimeline, setHourlyTimeline] = useState<HourlyUsage[]>(() => {
    try {
      const parsed = getUserScopedJSON<HourlyUsage[]>(STORAGE_DOMAINS.HOURLY_TIMELINE, HOURLY_24H_DATA);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
    return HOURLY_24H_DATA;
  });

  // Limits State with User-Scoped Persistence
  const [appLimits, setAppLimits] = useState<AppLimitItem[]>(() => {
    try {
      const parsed = getUserScopedJSON<AppLimitItem[]>(STORAGE_DOMAINS.APP_FOCUS_LIMITS, INITIAL_LIMITS);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          name: item.name
            .replace(/ Feed$/i, '')
            .replace(/ & Shorts$/i, '')
            .replace(/ & Short Reels$/i, '')
            .replace(/ Workspace$/i, '')
            .replace(/ Reader$/i, '')
            .replace(/ AI Companion$/i, '')
            .replace(/ Companion$/i, '')
            .replace(/ & Squad$/i, '')
            .replace(/ & Docs$/i, '')
        }));
      }
    } catch {
      // fallback
    }
    return INITIAL_LIMITS;
  });

  // Break Intervals State with User-Scoped Persistence
  const [breakIntervals, setBreakIntervals] = useState<BreakInterval[]>(() => {
    try {
      const parsed = getUserScopedJSON<BreakInterval[]>(STORAGE_DOMAINS.BREAK_INTERVALS, INITIAL_BREAK_INTERVALS);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_BREAK_INTERVALS;
  });

  // Modals State
  const [isAddLimitModalOpen, setIsAddLimitModalOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppLimit, setNewAppLimit] = useState('20');

  // Warning Popup Menu State (When limit reached or tested)
  const [warningModalApp, setWarningModalApp] = useState<AppLimitItem | null>(null);

  // Rest Interval Guided Breathing Modal State
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(300); // 5 mins
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize digital wellbeing state whenever active userProfile changes
  useEffect(() => {
    try {
      const parsedLimits = getUserScopedJSON<AppLimitItem[]>(STORAGE_DOMAINS.APP_FOCUS_LIMITS, INITIAL_LIMITS);
      if (Array.isArray(parsedLimits)) {
        setAppLimits(parsedLimits.map((item) => ({
          ...item,
          name: item.name
            .replace(/ Feed$/i, '')
            .replace(/ & Shorts$/i, '')
            .replace(/ & Short Reels$/i, '')
            .replace(/ Workspace$/i, '')
            .replace(/ Reader$/i, '')
            .replace(/ AI Companion$/i, '')
            .replace(/ Companion$/i, '')
            .replace(/ & Squad$/i, '')
            .replace(/ & Docs$/i, '')
        })));
      } else {
        setAppLimits(INITIAL_LIMITS);
      }

      const parsedUsage = getUserScopedJSON<AppUsageItem[]>(STORAGE_DOMAINS.APPS_USAGE, INITIAL_APPS_USAGE);
      setAppsUsage(Array.isArray(parsedUsage) ? parsedUsage : INITIAL_APPS_USAGE);

      const parsedTimeline = getUserScopedJSON<HourlyUsage[]>(STORAGE_DOMAINS.HOURLY_TIMELINE, HOURLY_24H_DATA);
      setHourlyTimeline(Array.isArray(parsedTimeline) ? parsedTimeline : HOURLY_24H_DATA);

      const parsedBreaks = getUserScopedJSON<BreakInterval[]>(STORAGE_DOMAINS.BREAK_INTERVALS, INITIAL_BREAK_INTERVALS);
      setBreakIntervals(Array.isArray(parsedBreaks) ? parsedBreaks : INITIAL_BREAK_INTERVALS);
    } catch {}
  }, [userProfile]);

  // Save limits to user-scoped storage
  useEffect(() => {
    try {
      setUserScopedJSON(STORAGE_DOMAINS.APP_FOCUS_LIMITS, appLimits);
    } catch {}
  }, [appLimits]);

  // Save apps usage to user-scoped storage
  useEffect(() => {
    try {
      setUserScopedJSON(STORAGE_DOMAINS.APPS_USAGE, appsUsage);
    } catch {}
  }, [appsUsage]);

  // Save hourly timeline to user-scoped storage
  useEffect(() => {
    try {
      setUserScopedJSON(STORAGE_DOMAINS.HOURLY_TIMELINE, hourlyTimeline);
    } catch {}
  }, [hourlyTimeline]);

  // Save break intervals to user-scoped storage
  useEffect(() => {
    try {
      setUserScopedJSON(STORAGE_DOMAINS.BREAK_INTERVALS, breakIntervals);
    } catch {
      // ignore
    }
  }, [breakIntervals]);

  // Timer interval for Guided Rest Modal
  useEffect(() => {
    let interval: any = null;
    if (isRestModalOpen && isRestTimerRunning && restTimerSeconds > 0) {
      interval = setInterval(() => {
        setRestTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRestTimerRunning(false);
            triggerHaptic(ImpactStyle.Heavy);
            handleCompleteRestInterval();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRestModalOpen, isRestTimerRunning, restTimerSeconds]);

  // Timer interval for Focus Shield countdown
  useEffect(() => {
    let interval: any = null;
    if (focusShieldActive && focusTimeRemaining > 0) {
      interval = setInterval(() => {
        setFocusTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setFocusShieldActive(false);
            const now = new Date();
            const start = focusStartTime || new Date(now.getTime() - 45 * 60000);
            recordFocusSession({
              startTime: start.toISOString(),
              endTime: now.toISOString(),
              durationMinutes: 45,
              completed: true,
              title: 'Deep Work Focus Shield',
              category: 'Deep Work'
            });
            showToast('🎉 Focus Shield session completed! (45m deep work logged)');
            return 45;
          }
          return prev - 1;
        });
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [focusShieldActive, focusTimeRemaining, focusStartTime]);

  // Breathing cadence cycle during Guided Rest
  useEffect(() => {
    if (!isRestModalOpen || !isRestTimerRunning) return;
    const cycle = (300 - restTimerSeconds) % 16;
    if (cycle < 4) setBreathPhase('Inhale');
    else if (cycle < 8) setBreathPhase('Hold');
    else if (cycle < 12) setBreathPhase('Exhale');
    else setBreathPhase('Rest');
  }, [restTimerSeconds, isRestModalOpen, isRestTimerRunning]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
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

  const handleTimeframeChange = (tf: Timeframe) => {
    triggerHaptic(ImpactStyle.Light);
    setActiveTimeframe(tf);
  };

  const handleToggleFocusShield = () => {
    triggerHaptic(ImpactStyle.Medium);
    if (focusShieldActive) {
      const now = new Date();
      const elapsedMinutes = 45 - focusTimeRemaining;
      if (elapsedMinutes >= 1 && focusStartTime) {
        recordFocusSession({
          startTime: focusStartTime.toISOString(),
          endTime: now.toISOString(),
          durationMinutes: elapsedMinutes,
          completed: true,
          title: 'Deep Work Focus Shield',
          category: 'Deep Work'
        });
        showToast(`Focus Shield ended. ${elapsedMinutes}m focus time recorded.`);
      } else {
        showToast('Focus Shield deactivated');
      }
      setFocusShieldActive(false);
      setFocusStartTime(null);
      setFocusTimeRemaining(45);
    } else {
      setFocusShieldActive(true);
      setFocusStartTime(new Date());
      setFocusTimeRemaining(45);
      showToast('Focus Shield activated: All non-vital notifications blocked for 45m');
    }
  };

  // Add App Limit
  const handleAddLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    triggerHaptic(ImpactStyle.Medium);

    const limitNum = parseInt(newAppLimit, 10) || 20;
    const existingUsage = appsUsage.find((a) => a.name.toLowerCase() === newAppName.trim().toLowerCase())?.timeMinutes || 0;

    const newLimitItem: AppLimitItem = {
      id: newAppName.toLowerCase().replace(/\s+/g, '-'),
      name: newAppName.trim(),
      limitMinutes: limitNum,
      usedMinutes: existingUsage,
      icon: 'hourglass_top',
      iconBg: 'bg-primary-container text-on-primary'
    };

    setAppLimits((prev) => [...prev.filter((i) => i.id !== newLimitItem.id), newLimitItem]);
    setIsAddLimitModalOpen(false);
    showToast(`Focus limit added for ${newAppName} (${limitNum}m daily quota)`);
    setNewAppName('');
  };

  // Delete Limit
  const handleDeleteLimit = (id: string, name: string) => {
    triggerHaptic(ImpactStyle.Light);
    setAppLimits((prev) => prev.filter((item) => item.id !== id));
    showToast(`Limit removed for ${name}`);
  };

  // Increment App Usage / Trigger Warning if limit reached
  const handleIncrementUsage = (id: string, delta: number = 5) => {
    triggerHaptic(ImpactStyle.Light);

    let targetAppName = '';
    setAppLimits((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          targetAppName = app.name;
          const updated = Math.max(0, app.usedMinutes + delta);
          if (updated >= app.limitMinutes) {
            // Trigger limit reached popup warning
            setTimeout(() => {
              triggerHaptic(ImpactStyle.Heavy);
              setWarningModalApp({ ...app, usedMinutes: updated });
            }, 200);
          }
          return { ...app, usedMinutes: updated };
        }
        return app;
      })
    );

    // Also update in appsUsage list so App Usage Breakdown progression bar adapts
    setAppsUsage((prev) => {
      const exists = prev.some((a) => a.id === id || (targetAppName && a.name.toLowerCase() === targetAppName.toLowerCase()));
      if (exists) {
        return prev.map((a) =>
          a.id === id || (targetAppName && a.name.toLowerCase() === targetAppName.toLowerCase())
            ? { ...a, timeMinutes: a.timeMinutes + delta }
            : a
        );
      } else if (targetAppName) {
        return [...prev, { id, name: targetAppName, timeMinutes: delta, icon: 'smartphone', iconBg: 'bg-primary-container text-on-primary' }];
      }
      return prev;
    });

    // Also update current hour data in hourly timeline
    setHourlyTimeline((prev) =>
      prev.map((h) => (h.hour === selectedHour ? { ...h, usedMinutes: Math.min(60, h.usedMinutes + delta) } : h))
    );
  };

  // Trigger Warning Popup directly (for testing / manual alert)
  const handleTriggerWarningTest = (app: AppLimitItem) => {
    triggerHaptic(ImpactStyle.Heavy);
    setWarningModalApp(app);
  };

  // Handle Adjust Limit: Increases (+5m) or Decreases (-5m) the daily quota limit
  const handleAdjustLimit = (appId: string, deltaMinutes: number) => {
    triggerHaptic(ImpactStyle.Medium);
    let newLimitValue = 0;
    let targetName = '';

    setAppLimits((prev) =>
      prev.map((item) => {
        if (item.id === appId) {
          targetName = item.name;
          const updatedLimit = Math.max(5, item.limitMinutes + deltaMinutes);
          newLimitValue = updatedLimit;
          const isExceeded = item.usedMinutes >= updatedLimit;
          return {
            ...item,
            limitMinutes: updatedLimit,
            isLocked: isExceeded ? item.isLocked : false
          };
        }
        return item;
      })
    );

    if (newLimitValue > 0) {
      showToast(`${deltaMinutes > 0 ? `+${deltaMinutes}m` : `${deltaMinutes}m`} limit set (${newLimitValue}m daily for ${targetName})`);
    }
  };

  // Handle Extend / Add Extra Time from Warning Popup
  const handleExtendLimit = (appId: string, extensionMinutes: number = 5) => {
    handleAdjustLimit(appId, extensionMinutes);
    setWarningModalApp(null);
  };

  // Handle Lock App from Warning Popup
  const handleLockApp = (appId: string) => {
    triggerHaptic(ImpactStyle.Medium);
    setAppLimits((prev) =>
      prev.map((item) => (item.id === appId ? { ...item, isLocked: true } : item))
    );
    setWarningModalApp(null);
    showToast('App locked for today. Excellent choice for cognitive endurance!');
  };

  // Launch Guided Rest Interval
  const handleStartRestInterval = () => {
    triggerHaptic(ImpactStyle.Medium);
    setWarningModalApp(null);
    setRestTimerSeconds(300); // 5 min
    setIsRestTimerRunning(true);
    setIsRestModalOpen(true);
  };

  // Complete Guided Rest Interval
  const handleCompleteRestInterval = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newInterval: BreakInterval = {
      id: `break-${Date.now()}`,
      time: timeStr,
      durationMinutes: 5,
      type: 'Mindful Rest Interval',
      note: '5m conscious breathing & screen detachment',
      icon: 'self_improvement'
    };
    setBreakIntervals((prev) => [newInterval, ...prev]);
    setIsRestModalOpen(false);
    setIsRestTimerRunning(false);
    showToast('🎉 Rest interval completed! +25 HP Cognitive Clarity gained');
  };

  // Search filter
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  // Helper to format minutes into "1h 15m", "31h 30m", or "1,642h 30m"
  const formatHoursMinutes = (m: number) => {
    const abs = Math.abs(m);
    const hrs = Math.floor(abs / 60);
    const mins = abs % 60;
    const formattedHrs = hrs >= 1000 ? hrs.toLocaleString() : `${hrs}`;
    if (hrs > 0 && mins > 0) return `${formattedHrs}h ${mins}m`;
    if (hrs > 0) return `${formattedHrs}h`;
    return `${mins}m`;
  };

  // Filtered Apps List for App Usage Breakdown
  const filteredAppsList = useMemo(() => {
    return appsUsage.filter((item) => matchesSearch(item.name));
  }, [appsUsage, searchQuery]);

  // 24-Hour Timeline Data based on active timeframe
  const activeTimelineData = useMemo<HourlyUsage[]>(() => {
    return hourlyTimeline;
  }, [hourlyTimeline]);

  // Selected hour details from active dynamic hourly timeline
  const currentHourData = activeTimelineData[selectedHour] || activeTimelineData[10] || HOURLY_24H_DATA[10];

  // Calculate total screen time across today's 24h
  const totalMinutesToday = useMemo(() => {
    return hourlyTimeline.reduce((acc, h) => acc + h.usedMinutes, 0);
  }, [hourlyTimeline]);

  // Dynamic calculations for Today, Week, Month, and Year vs Baseline Avg
  const timeframeStats = useMemo(() => {
    // Standard daily baseline average is 4h 30m (270 minutes)
    const dailyBaseline = 270;
    const currentDayMinutes = totalMinutesToday;

    switch (activeTimeframe) {
      case 'week': {
        const days = 7;
        const baseline = dailyBaseline * days; // 1,890m = 31h 30m
        const total = currentDayMinutes;
        const diff = total - baseline;
        const pct = Math.round((diff / baseline) * 100);
        return {
          label: 'this week',
          totalMinutes: total,
          formattedTotal: formatHoursMinutes(total),
          baselineMinutes: baseline,
          formattedBaseline: formatHoursMinutes(baseline),
          diffMinutes: diff,
          pctDiff: pct,
          isUnder: diff <= 0,
          narrative:
            diff <= 0
              ? `Weekly screen time is ${formatHoursMinutes(Math.abs(diff))} below your ${formatHoursMinutes(baseline)} weekly baseline. Great circadian balance!`
              : `Weekly screen time is ${formatHoursMinutes(diff)} over your ${formatHoursMinutes(baseline)} weekly baseline.`
        };
      }
      case 'month': {
        const days = 30;
        const baseline = dailyBaseline * days; // 8,100m = 135h 00m
        const total = currentDayMinutes;
        const diff = total - baseline;
        const pct = Math.round((diff / baseline) * 100);
        return {
          label: 'this month',
          totalMinutes: total,
          formattedTotal: formatHoursMinutes(total),
          baselineMinutes: baseline,
          formattedBaseline: formatHoursMinutes(baseline),
          diffMinutes: diff,
          pctDiff: pct,
          isUnder: diff <= 0,
          narrative:
            diff <= 0
              ? `Monthly usage is ${formatHoursMinutes(Math.abs(diff))} under your ${formatHoursMinutes(baseline)} baseline across 30 days.`
              : `Monthly screen time is ${formatHoursMinutes(diff)} above your ${formatHoursMinutes(baseline)} baseline.`
        };
      }
      case 'year': {
        const days = 365;
        const baseline = dailyBaseline * days; // 98,550m = 1,642h 30m
        const total = currentDayMinutes;
        const diff = total - baseline;
        const pct = Math.round((diff / baseline) * 100);
        return {
          label: 'this year',
          totalMinutes: total,
          formattedTotal: formatHoursMinutes(total),
          baselineMinutes: baseline,
          formattedBaseline: formatHoursMinutes(baseline),
          diffMinutes: diff,
          pctDiff: pct,
          isUnder: diff <= 0,
          narrative:
            diff <= 0
              ? `Annual screen time is resting ${formatHoursMinutes(Math.abs(diff))} under your ${formatHoursMinutes(baseline)} yearly baseline.`
              : `Annual screen time is ${formatHoursMinutes(diff)} above your ${formatHoursMinutes(baseline)} yearly baseline.`
        };
      }
      case 'today':
      default: {
        const baseline = dailyBaseline; // 270m = 4h 30m
        const total = currentDayMinutes;
        const diff = total - baseline;
        const pct = Math.round((diff / baseline) * 100);
        return {
          label: 'today',
          totalMinutes: total,
          formattedTotal: formatHoursMinutes(total),
          baselineMinutes: baseline,
          formattedBaseline: formatHoursMinutes(baseline),
          diffMinutes: diff,
          pctDiff: pct,
          isUnder: diff <= 0,
          narrative:
            diff <= 0
              ? `You are resting ${formatHoursMinutes(Math.abs(diff))} under your daily baseline. Peak cognitive engagement was concentrated in deep flow blocks.`
              : `You are ${formatHoursMinutes(diff)} over your daily baseline. Consider activating Focus Shield.`
        };
      }
    }
  }, [activeTimeframe, totalMinutesToday]);

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

      {/* Top Header App Bar */}
      <AppTopBar
        subtitle="Digital Wellbeing"
        onBack={handleBack}
        leftAction={
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-xs shrink-0">
            <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
          </div>
        }
      />

      {/* Search Filter Header Sub-bar */}
      <div className="py-2.5 px-4 w-full bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/40 shadow-xs shrink-0">
        <div className="h-10 px-3 rounded-full bg-surface-container-low/90 flex items-center gap-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] border border-surface-container-high/40 focus-within:border-primary/40 focus-within:bg-surface-container-lowest transition-all">
          <span className="material-symbols-outlined text-[18px] text-outline shrink-0">search</span>
          <input
            className="w-full bg-transparent border-none outline-none font-body-sm text-xs text-on-surface placeholder:text-outline"
            placeholder="Search apps and screen habits..."
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface text-xs shrink-0 cursor-pointer border-none"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full pt-3 pb-8 px-4 bg-surface overflow-y-auto mobile-scroll">
        <div className="flex flex-col w-full gap-4 max-w-[440px] mx-auto relative">
          {/* Ambient Light Backdrops */}
          <div className="relative w-full pointer-events-none">
            <div className="absolute -top-12 -left-10 w-48 h-48 rounded-full bg-primary-fixed blur-3xl opacity-40"></div>
            <div className="absolute top-28 -right-8 w-56 h-56 rounded-full bg-secondary-fixed blur-3xl opacity-30"></div>
            <div className="absolute top-96 left-1/4 w-60 h-60 rounded-full bg-tertiary-fixed blur-3xl opacity-20"></div>
          </div>

          {/* Screen Sub-header & Temporal Scope Selector */}
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-primary uppercase tracking-wider font-bold">
                  Digital Wellbeing
                </span>
                <h2 className="text-xl text-on-surface leading-tight font-extrabold">
                  Screen Time &amp; Harmony
                </h2>
              </div>
            </div>

            {/* Date Range Interactive Segmented Pill Bar: Today, Week, Month, Year */}
            <div className="p-1 rounded-full bg-surface-container flex items-center shadow-inner border border-surface-container-high/50">
              {(['today', 'week', 'month', 'year'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  className={`flex-1 py-1.5 rounded-full text-center font-label-lg text-xs transition-all cursor-pointer border-none capitalize ${
                    activeTimeframe === tf
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                      : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                  }`}
                  onClick={() => handleTimeframeChange(tf)}
                  type="button"
                >
                  {tf === 'today' ? 'Today' : tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Hero Card: Screen Time Overview */}
          <div className="relative w-full rounded-3xl bg-surface-container-lowest/90 backdrop-blur-xl p-space-lg shadow-xl shadow-primary-container/5 overflow-hidden border border-surface-container-high/40">
            {/* Top Row: Clean Tag + Trend Indicator vs Baseline */}
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed/30 text-primary">
                <span className="material-symbols-outlined text-[15px]">analytics</span>
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
                  Circadian Usage Rhythm
                </span>
              </div>
              <div className={`flex items-center gap-1 ${timeframeStats.isUnder ? 'text-primary' : 'text-rose-600 font-bold'}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {timeframeStats.isUnder ? 'trending_down' : 'trending_up'}
                </span>
                <span className="font-label-md text-label-md font-bold">
                  {timeframeStats.pctDiff > 0 ? `+${timeframeStats.pctDiff}% vs avg` : `${timeframeStats.pctDiff}% vs avg`}
                </span>
              </div>
            </div>

            {/* Big Metric Presentation */}
            <div className="flex items-baseline justify-between mb-space-xs">
              <div className="flex items-baseline gap-space-2xs">
                <span className="font-display-lg-mobile text-display-lg-mobile text-on-surface font-black tracking-tight">
                  {timeframeStats.formattedTotal}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                  {timeframeStats.label}
                </span>
              </div>
              <div className="text-right">
                <span className="font-label-sm text-label-sm text-outline block">Baseline Avg</span>
                <span className="font-headline-sm text-headline-sm text-on-surface-variant line-through opacity-70">
                  {timeframeStats.formattedBaseline}
                </span>
              </div>
            </div>

            {/* Narrative Micro-Intervention */}
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md leading-relaxed">
              {timeframeStats.narrative}
            </p>

            {/* Multi-Segment Circadian Distribution Bar */}
            <div className="flex flex-col gap-space-2xs mb-space-md">
              <div className="h-3 w-full rounded-full bg-surface-container-high flex overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full rounded-full bg-primary-container transition-all duration-700"
                  style={{ width: '55%' }}
                  title="Study & Deep Work (55%)"
                ></div>
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-700 mx-0.5"
                  style={{ width: '25%' }}
                  title="Reading & Mindfulness (25%)"
                ></div>
                <div
                  className="h-full rounded-full bg-tertiary-container transition-all duration-700"
                  style={{ width: '20%' }}
                  title="Social & Communication (20%)"
                ></div>
              </div>

              {/* Segment Badges Legend */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Deep Focus <span className="text-outline font-normal">2h 02m</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Mindful <span className="text-outline font-normal">55m</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Social <span className="text-outline font-normal">45m</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 24-HOUR USED HOUR VS 24-HR TIMELINE GRAPH (00:00 - 23:00) */}
            {/* ======================================================== */}
            <div className="p-space-sm rounded-2xl bg-surface-container-low/80 flex flex-col gap-space-xs border border-surface-container-high/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-primary">schedule</span>
                  <span className="font-label-md text-label-md font-bold text-on-surface">
                    {activeTimeframe === 'today'
                      ? "Today's Usage Timeline"
                      : activeTimeframe === 'week'
                      ? 'Hourly Average Usage (Week)'
                      : activeTimeframe === 'month'
                      ? 'Hourly Average Usage (Month)'
                      : 'Hourly Average Usage (Year)'}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  <span className="material-symbols-outlined text-[13px]">speed</span>
                  <span>Limit: 60m/hr</span>
                </div>
              </div>

              <span className="text-[11px] text-on-surface-variant">
                {activeTimeframe === 'today'
                  ? 'Tap any hour bar to inspect screen time for that window:'
                  : `Tap any hour bar to inspect average hourly screen time across ${activeTimeframe}:`}
              </span>

              {/* 24-Hour Interactive Bar Chart Visualizer with Curved Horizontal Lines & Scale */}
              <div className="w-full pt-2 pb-1 relative">
                {/* Curved Horizontal Background Lines */}
                <div className="absolute inset-x-0 top-1 bottom-6 pointer-events-none flex flex-col justify-between overflow-hidden">
                  <svg
                    className="w-full h-full opacity-30 text-primary"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 60"
                  >
                    <path
                      d="M 0,6 C 25,1 75,11 100,6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.75"
                      strokeDasharray="2,2"
                    />
                    <path
                      d="M 0,23 C 25,18 75,28 100,23"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.75"
                      strokeDasharray="2,2"
                    />
                    <path
                      d="M 0,40 C 25,35 75,45 100,40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.75"
                      strokeDasharray="2,2"
                    />
                    <path
                      d="M 0,57 C 25,54 75,59 100,57"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.75"
                    />
                  </svg>
                </div>

                {/* Y-Scale Guideline Markers */}
                <div className="absolute left-0 top-0 bottom-6 pointer-events-none flex flex-col justify-between text-[8px] font-bold text-outline/60 z-0 select-none">
                  <span>60m</span>
                  <span>40m</span>
                  <span>20m</span>
                  <span>0m</span>
                </div>

                <div className="relative z-10 flex items-end justify-between gap-[2px] sm:gap-1 h-28 pl-4 pr-1">
                  {activeTimelineData.map((item) => {
                    const isSelected = selectedHour === item.hour;
                    const heightPercent = Math.max(6, (item.usedMinutes / 60) * 100);

                    return (
                      <button
                        key={item.hour}
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setSelectedHour(item.hour);
                        }}
                        type="button"
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer border-none bg-transparent p-0 relative"
                        title={`${item.label}: ${item.usedMinutes}m ${activeTimeframe === 'today' ? 'used' : 'avg/hr'} (Limit: 60m)`}
                      >
                        {/* Bar (No dots above bar) */}
                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            isSelected
                              ? 'bg-primary ring-2 ring-primary ring-offset-1 ring-offset-surface scale-x-110 shadow-md'
                              : item.usedMinutes > 0
                              ? 'bg-primary-fixed/70 group-hover:bg-primary-fixed'
                              : 'bg-surface-container-high/40'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />

                        {/* Subtle hour tick label for key markers */}
                        {(item.hour === 0 || item.hour === 6 || item.hour === 12 || item.hour === 18 || item.hour === 23) && (
                          <span className="text-[9px] text-outline font-semibold mt-1">
                            {item.hour === 0 ? '12A' : item.hour === 6 ? '6A' : item.hour === 12 ? '12P' : item.hour === 18 ? '6P' : '11P'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Horizon Legend Axis */}
              <div className="flex items-center justify-between text-[10px] text-outline font-bold px-1 pt-1.5 border-t border-surface-container-high/40">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSelectedHour(0);
                  }}
                  className={`cursor-pointer border-none bg-transparent p-0 hover:text-primary transition-colors ${selectedHour === 0 ? 'text-primary font-extrabold' : ''}`}
                >
                  00:00 (12 AM)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSelectedHour(6);
                  }}
                  className={`cursor-pointer border-none bg-transparent p-0 hover:text-primary transition-colors ${selectedHour === 6 ? 'text-primary font-black' : ''}`}
                >
                  6 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSelectedHour(12);
                  }}
                  className={`cursor-pointer border-none bg-transparent p-0 hover:text-primary transition-colors ${selectedHour === 12 ? 'text-primary font-black' : ''}`}
                >
                  12 PM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSelectedHour(18);
                  }}
                  className={`cursor-pointer border-none bg-transparent p-0 hover:text-primary transition-colors ${selectedHour === 18 ? 'text-primary font-black' : ''}`}
                >
                  6 PM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSelectedHour(23);
                  }}
                  className={`cursor-pointer border-none bg-transparent p-0 hover:text-primary transition-colors ${selectedHour === 23 ? 'text-primary font-extrabold' : ''}`}
                >
                  23:00 (11 PM)
                </button>
              </div>

              {/* Selected Hour Details Inspector Card - Displaying ONLY usage time and limit */}
              <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
                  <span className="font-label-md text-xs font-bold text-on-surface">
                    {currentHourData.label} ({currentHourData.hour}:00 – {currentHourData.hour + 1}:00)
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary-fixed/40 text-primary font-label-sm text-[11px] font-black">
                  {currentHourData.usedMinutes > 0
                    ? `${currentHourData.usedMinutes} mins ${activeTimeframe === 'today' ? 'used' : 'avg/hr'} (Limit: 60m)`
                    : `0 mins ${activeTimeframe === 'today' ? 'used' : 'avg/hr'} (Limit: 60m)`}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* APP USAGE BREAKDOWN (SCREEN TIME OF EACH APP) */}
          {/* ======================================================== */}
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between px-space-2xs">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">App Usage Breakdown</h3>
            </div>

            {/* App List: Displaying only App Name, Time Used, and Progression Bar */}
            {filteredAppsList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-surface-container-low text-center text-xs text-outline">
                No apps found matching your query
              </div>
            ) : (
              filteredAppsList.map((app) => {
                const maxUsage = Math.max(...appsUsage.map((a) => a.timeMinutes), 1);
                const progressPercent = Math.min(100, Math.round((app.timeMinutes / maxUsage) * 100));

                return (
                  <div
                    key={app.id}
                    className="p-space-sm rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md flex flex-col gap-2 shadow-xs hover:shadow-md transition-shadow border border-surface-container-high/40"
                  >
                    {/* Top Row: App Name & Time Used */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl ${app.iconBg} flex items-center justify-center shadow-xs flex-shrink-0`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{app.icon}</span>
                        </div>
                        <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                          {app.name}
                        </span>
                      </div>

                      <span className="font-metric-numeral text-sm text-on-surface font-extrabold flex-shrink-0">
                        {formatHoursMinutes(app.timeMinutes)}
                      </span>
                    </div>

                    {/* Progression Bar */}
                    <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(4, progressPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ======================================================== */}
          {/* ACTIVE FOCUS LIMITS & USAGE WARNING POPUP CONTROLS */}
          {/* ======================================================== */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between px-space-2xs">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Active Focus Limits</h3>
                <span className="text-[11px] text-on-surface-variant">Throttles distracting loops & warns on limit</span>
              </div>
              <button
                aria-label="Add app limit"
                className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center gap-1 hover:bg-primary/90 active:scale-95 transition-all cursor-pointer border-none shadow-sm"
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  setIsAddLimitModalOpen(true);
                }}
                type="button"
                id="btnAddFocusLimit"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Limit</span>
              </button>
            </div>

            {/* Limits Stack Card */}
            <div className="p-space-md rounded-3xl bg-surface-container-lowest/90 backdrop-blur-xl shadow-md flex flex-col gap-3 border border-surface-container-high/40">
              {appLimits.length === 0 ? (
                <div className="text-center py-4 text-xs text-outline">
                  No active focus limits set. Tap &quot;+ Add Limit&quot; to establish mindful boundaries.
                </div>
              ) : (
                appLimits.map((app) => {
                  const percentUsed = Math.min(100, Math.round((app.usedMinutes / app.limitMinutes) * 100));
                  const isExceeded = app.usedMinutes >= app.limitMinutes;
                  const remaining = Math.max(0, app.limitMinutes - app.usedMinutes);

                  return (
                    <div
                      key={app.id}
                      className={`flex flex-col gap-2 p-3 rounded-2xl transition-all border ${
                        isExceeded
                          ? 'bg-rose-500/10 border-rose-500/40'
                          : percentUsed >= 80
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-surface-container-low/70 border-surface-container-high/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${app.iconBg} flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-[18px]">{app.icon}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-label-md text-xs font-bold text-on-surface">{app.name}</span>
                            {app.isLocked && (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                                LOCKED
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-label-sm text-xs font-bold ${isExceeded ? 'text-rose-600' : 'text-on-surface'}`}>
                            {app.usedMinutes}m / {app.limitMinutes}m
                          </span>
                          <span className="text-[10px] text-outline block">{percentUsed}% used</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeded
                              ? 'bg-rose-600'
                              : percentUsed >= 80
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>

                      {/* Bottom row: status & two limit modifier buttons (-5m and +5m) */}
                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-[10px] font-semibold ${isExceeded ? 'text-rose-600' : 'text-on-surface-variant'}`}>
                          {isExceeded
                            ? '⚠️ Daily limit reached!'
                            : `${remaining}m remaining`}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* -5m Option */}
                          <button
                            onClick={() => handleAdjustLimit(app.id, -5)}
                            type="button"
                            title="Decrease limit by 5m"
                            disabled={app.limitMinutes <= 5}
                            className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold text-on-surface cursor-pointer border-none flex items-center justify-center active:scale-95 transition-all shadow-xs"
                          >
                            -5m
                          </button>

                          {/* +5m Option */}
                          <button
                            onClick={() => handleAdjustLimit(app.id, 5)}
                            type="button"
                            title="Increase limit by 5m"
                            className="px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-[11px] font-bold text-primary cursor-pointer border-none flex items-center justify-center active:scale-95 transition-all shadow-xs"
                          >
                            +5m
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteLimit(app.id, app.name)}
                            type="button"
                            title="Delete Limit"
                            className="w-6 h-6 rounded-full flex items-center justify-center text-outline hover:text-rose-600 cursor-pointer border-none bg-transparent hover:bg-rose-500/10 transition-colors ml-0.5"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ======================================================== */}
            {/* BREAK INTERVALS TAKEN BETWEEN SCREEN SESSIONS */}
            {/* ======================================================== */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between px-space-2xs">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Break Intervals &amp; Rest Recovery
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    Intervals taken between screen sessions
                  </span>
                </div>
                <button
                  onClick={handleStartRestInterval}
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-secondary text-on-secondary text-xs font-bold flex items-center gap-1 hover:bg-secondary/90 active:scale-95 transition-all cursor-pointer border-none shadow-sm"
                  id="btnTakeBreakNow"
                >
                  <span className="material-symbols-outlined text-[16px]">self_improvement</span>
                  <span>Take 5m Break</span>
                </button>
              </div>

              {/* Intervals Stats Summary Card */}
              <div className="p-space-md rounded-3xl bg-gradient-to-r from-primary-fixed/80 via-secondary-fixed/80 to-tertiary-fixed/80 text-on-surface shadow-md flex items-center justify-between border border-surface-container-high/40">
                <div className="flex items-center gap-space-sm">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest/90 flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                    <span className="material-symbols-outlined text-[24px]">spa</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-bold text-on-surface">
                      Rest Recovery Score
                    </span>
                    <span className="font-body-sm text-xs text-on-surface-variant">
                      {breakIntervals.length} conscious intervals taken today • 8m avg
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-metric-numeral text-xl font-black text-primary leading-none">
                    {breakIntervals.length}/6
                  </span>
                  <span className="font-label-sm text-[10px] font-bold text-primary">Goal Met</span>
                </div>
              </div>

              {/* Logged Break Intervals Timeline */}
              <div className="p-space-md rounded-3xl bg-surface-container-lowest/90 backdrop-blur-xl shadow-md flex flex-col gap-2.5 border border-surface-container-high/40">
                <span className="text-xs font-bold text-on-surface">Recent Rest Intervals Log</span>
                <div className="space-y-2">
                  {breakIntervals.map((interval) => (
                    <div
                      key={interval.id}
                      className="p-2.5 rounded-xl bg-surface-container-low/70 flex items-center justify-between border border-surface-container-high/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary-fixed/40 text-secondary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px]">{interval.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-label-md text-xs font-bold text-on-surface">{interval.type}</span>
                            <span className="text-[10px] text-primary font-semibold">({interval.durationMinutes}m)</span>
                          </div>
                          <span className="text-[10px] text-on-surface-variant">{interval.note}</span>
                        </div>
                      </div>
                      <span className="font-label-sm text-[11px] text-outline font-semibold">{interval.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Catalyst Action: Start Deep Work Focus Shield */}
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

      {/* ======================================================== */}
      {/* ⚠️ USAGE LIMIT REACHED WARNING POPUP MODAL */}
      {/* ======================================================== */}
      {warningModalApp && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setWarningModalApp(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/70 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-[360px] rounded-3xl bg-surface-container-lowest p-6 shadow-2xl border border-rose-500/30 animate-scaleUp text-center flex flex-col items-center relative overflow-hidden">
            {/* Glow Header */}
            <div className="absolute -top-10 inset-x-0 h-24 bg-rose-500/10 blur-xl pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center mb-3 shadow-inner ring-4 ring-rose-500/10">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 text-[11px] font-bold uppercase tracking-wider mb-1">
              Active Focus Friction
            </span>

            <h3 className="font-headline-sm text-lg font-extrabold text-on-surface">
              Usage Limit Reached
            </h3>

            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed px-1">
              You have used <strong className="text-rose-600">{warningModalApp.usedMinutes} minutes</strong> of your <strong className="text-on-surface">{warningModalApp.limitMinutes}m daily quota</strong> for <span className="font-bold text-on-surface">{warningModalApp.name}</span>.
            </p>

            <div className="my-4 p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/40 text-left w-full flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">self_improvement</span>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Step away from algorithmic feeds to preserve your deep focus stamina and circadian rhythm.
              </p>
            </div>

            {/* Action Buttons Menu */}
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleStartRestInterval}
                className="w-full py-3 rounded-full bg-primary text-on-primary font-label-md text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-98 transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-base">spa</span>
                <span>Take a 5-Min Rest Interval</span>
              </button>

              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => handleExtendLimit(warningModalApp.id, 5)}
                  className="flex-1 py-2.5 rounded-full bg-primary-fixed/50 text-primary font-bold text-xs hover:bg-primary-fixed active:scale-95 transition-all cursor-pointer border-none flex items-center justify-center gap-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">more_time</span>
                  <span>+5m Grace</span>
                </button>

                <button
                  onClick={() => handleExtendLimit(warningModalApp.id, 15)}
                  className="flex-1 py-2.5 rounded-full bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer border-none flex items-center justify-center gap-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">more_time</span>
                  <span>+15m Grace</span>
                </button>

                <button
                  onClick={() => handleLockApp(warningModalApp.id)}
                  className="flex-1 py-2.5 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer border-none flex items-center justify-center gap-1 shadow-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Lock</span>
                </button>
              </div>

              <button
                onClick={() => setWarningModalApp(null)}
                className="w-full py-2 text-xs text-outline hover:text-on-surface cursor-pointer border-none bg-transparent font-medium"
                type="button"
              >
                Dismiss &amp; Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* GUIDED 5-MIN REST INTERVAL BREATHING MODAL */}
      {/* ======================================================== */}
      {isRestModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsRestModalOpen(false);
              setIsRestTimerRunning(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/75 backdrop-blur-lg animate-fadeIn"
        >
          <div className="w-full max-w-[360px] rounded-3xl bg-surface-container-lowest p-6 shadow-2xl border border-primary/30 animate-scaleUp text-center flex flex-col items-center relative overflow-hidden">
            <div className="flex items-center justify-between w-full pb-3 border-b border-surface-container-high/40 mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">self_improvement</span>
                <span className="font-headline-sm text-sm font-bold text-on-surface">Guided Rest Interval</span>
              </div>
              <button
                onClick={() => {
                  setIsRestModalOpen(false);
                  setIsRestTimerRunning(false);
                }}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Breathing Animation Circle */}
            <div className="relative w-40 h-40 flex items-center justify-center my-4">
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-secondary/30 to-tertiary/20 transition-all duration-1000 ${
                  breathPhase === 'Inhale'
                    ? 'scale-110 opacity-90'
                    : breathPhase === 'Hold'
                    ? 'scale-110 opacity-100 ring-4 ring-primary/40'
                    : 'scale-90 opacity-40'
                }`}
              />
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-2xl font-black text-on-surface tracking-tight">
                  {Math.floor(restTimerSeconds / 60)}:{(restTimerSeconds % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-primary uppercase tracking-wider mt-1">
                  {breathPhase}...
                </span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mb-4 px-2">
              Focus on slow, rhythmic breathing. Inhale calm, exhale cognitive residue.
            </p>

            {/* Timer Controls */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => setIsRestTimerRunning(!isRestTimerRunning)}
                className={`flex-1 py-2.5 rounded-full font-bold text-xs cursor-pointer border-none shadow-sm flex items-center justify-center gap-1 ${
                  isRestTimerRunning
                    ? 'bg-surface-container text-on-surface'
                    : 'bg-primary text-on-primary'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-base">
                  {isRestTimerRunning ? 'pause' : 'play_arrow'}
                </span>
                <span>{isRestTimerRunning ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                onClick={handleCompleteRestInterval}
                className="flex-1 py-2.5 rounded-full bg-secondary text-on-secondary font-bold text-xs cursor-pointer border-none shadow-sm flex items-center justify-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-base">check</span>
                <span>Finish Interval</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD FOCUS LIMIT MODAL */}
      {/* ======================================================== */}
      {isAddLimitModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddLimitModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-[340px] rounded-3xl bg-surface-container-lowest p-5 shadow-2xl border border-surface-container-high/40 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-fixed/40 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">hourglass_top</span>
                </div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">Add Focus Limit</h3>
              </div>
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
                  placeholder="e.g. TikTok, Instagram, Reddit, Netflix"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Daily Limit (minutes)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="600"
                    step="5"
                    value={newAppLimit}
                    onChange={(e) => setNewAppLimit(e.target.value)}
                    className="w-24 px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface outline-none focus:border-primary font-bold"
                    required
                  />
                  <span className="text-xs text-on-surface-variant font-medium">minutes</span>
                </div>
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['15', '20', '30', '45', '60', '90'].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setNewAppLimit(mins)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer border-none transition-all ${
                        newAppLimit === mins
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
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
