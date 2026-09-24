import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppTopBar } from '../components/AppTopBar';
import { useProgression } from '../features/progression';
import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON
} from '../features/storage';

export const STORAGE_KEY_NOTIFICATIONS = 'KAIROS_NOTIFICATIONS_V1';

export interface NotificationScreenProps {
  userProfile?: { email: string; name: string } | null;
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export interface NotificationItem {
  id: string;
  category: 'rhythm' | 'squad' | 'tasks';
  period: 'today' | 'yesterday' | 'earlier';
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  timestamp: string;
  isUnread: boolean;
  icon: string;
  iconGradient: string;
  borderAccent: string;
  actionType?: 'focus' | 'squad' | 'hydration' | 'claimed' | 'reflection' | 'wellbeing';
  actionLabel?: string;
  actionDone?: boolean;
  actionDoneText?: string;
  snoozeAvailable?: boolean;
  hpBadge?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  // TODAY
  {
    id: 'notif-1',
    category: 'rhythm',
    period: 'today',
    tag: 'AI Rhythm Observation',
    tagColor: 'text-indigo-600',
    title: 'Peak Cognitive Flow Window',
    description: 'Your focus energy is currently peaking at 92%. Optimal time for Calculus III: Vector Fields.',
    timestamp: '10m ago',
    isUnread: true,
    icon: 'bolt',
    iconGradient: 'from-indigo-600 to-violet-500',
    borderAccent: 'border-l-indigo-600',
    actionType: 'focus',
    actionLabel: 'Start Focus Block (45m)',
    snoozeAvailable: true
  },
  {
    id: 'notif-2',
    category: 'squad',
    period: 'today',
    tag: 'Squad League • Rank Alert',
    tagColor: 'text-amber-600',
    title: 'Jordan gained +60 HP in Deep Work Sprint!',
    description: 'Jordan just finished a 90m session. You are currently 40 HP behind 1st Crown position.',
    timestamp: '35m ago',
    isUnread: true,
    icon: 'emoji_events',
    iconGradient: 'from-amber-400 to-orange-500',
    borderAccent: 'border-l-amber-500',
    actionType: 'squad',
    actionLabel: 'View Squad Leaderboard'
  },
  {
    id: 'notif-3',
    category: 'tasks',
    period: 'today',
    tag: 'Circadian Hydration',
    tagColor: 'text-cyan-600',
    title: 'Hydration Target (500ml Electrolytes)',
    description: 'Mid-morning cellular hydration window closes in 25 minutes to maintain steady focus.',
    timestamp: '1h ago',
    isUnread: true,
    icon: 'water_drop',
    iconGradient: 'from-cyan-400 to-blue-500',
    borderAccent: 'border-l-cyan-500',
    actionType: 'hydration',
    actionLabel: 'Log 500ml Done (+15 HP)',
    actionDone: false,
    actionDoneText: '✓ Logged! +15 HP'
  },

  // YESTERDAY
  {
    id: 'notif-4',
    category: 'rhythm',
    period: 'yesterday',
    tag: 'Codex Relic Unlocked',
    tagColor: 'text-purple-600',
    title: 'Tier IV Relic: "The Eternal Flame"',
    description: 'Achieved 30-Day unbroken circadian alignment! +250 HP added to your Luminary progression.',
    timestamp: 'Yesterday',
    isUnread: false,
    icon: 'military_tech',
    iconGradient: 'from-purple-500 to-indigo-600',
    borderAccent: 'border-l-purple-500',
    actionType: 'claimed',
    hpBadge: '+250 HP Claimed'
  },
  {
    id: 'notif-5',
    category: 'rhythm',
    period: 'yesterday',
    tag: 'Aura • Memory Vault',
    tagColor: 'text-pink-600',
    title: 'Circadian Rhythm Reflection',
    description: '"You sustained 4.2 hours of unbroken focus during afternoon hours. Evening wind-down was activated at 10:30 PM."',
    timestamp: 'Yesterday',
    isUnread: false,
    icon: 'auto_awesome',
    iconGradient: 'from-rose-400 to-pink-500',
    borderAccent: 'border-l-pink-500',
    actionType: 'reflection'
  },

  // EARLIER THIS WEEK
  {
    id: 'notif-6',
    category: 'tasks',
    period: 'earlier',
    tag: 'Weekly Digital Wellbeing',
    tagColor: 'text-emerald-600',
    title: 'Screen Time Down 24%',
    description: 'Your digital harmony score improved to 88/100 through consistent afternoon reset walks.',
    timestamp: 'Mon',
    isUnread: false,
    icon: 'insights',
    iconGradient: 'from-emerald-400 to-teal-600',
    borderAccent: 'border-l-emerald-500',
    actionType: 'wellbeing',
    actionLabel: 'View Wellbeing Report'
  }
];

function loadSavedNotifications(): NotificationItem[] {
  try {
    const parsed = getUserScopedJSON<NotificationItem[]>(STORAGE_DOMAINS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const isValid = parsed.every(
        (item) => item && typeof item.id === 'string' && typeof item.title === 'string'
      );
      if (isValid) {
        return parsed as NotificationItem[];
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved notifications:', err);
  }
  return INITIAL_NOTIFICATIONS;
}

export interface NotificationPreferences {
  circadianAlerts: boolean;
  squadAlerts: boolean;
  nightSafeguard: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  circadianAlerts: true,
  squadAlerts: true,
  nightSafeguard: true
};

export const NotificationScreen: React.FC<NotificationScreenProps> = ({
  userProfile,
  onBack,
  onNavigateTab
}) => {
  const progression = useProgression();
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    getUserScopedJSON<NotificationItem[]>(
      STORAGE_DOMAINS.NOTIFICATIONS,
      INITIAL_NOTIFICATIONS,
      userProfile
    )
  );
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    getUserScopedJSON<NotificationPreferences>(
      STORAGE_DOMAINS.NOTIFICATION_PREFERENCES,
      DEFAULT_NOTIFICATION_PREFERENCES,
      userProfile
    )
  );
  const [activeCategory, setActiveCategory] = useState<'all' | 'rhythm' | 'squad' | 'tasks'>('all');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Sync state on user profile change
  useEffect(() => {
    const loadedNotifs = getUserScopedJSON<NotificationItem[]>(
      STORAGE_DOMAINS.NOTIFICATIONS,
      INITIAL_NOTIFICATIONS,
      userProfile
    );
    setNotifications(Array.isArray(loadedNotifs) && loadedNotifs.length > 0 ? loadedNotifs : INITIAL_NOTIFICATIONS);

    const loadedPrefs = getUserScopedJSON<NotificationPreferences>(
      STORAGE_DOMAINS.NOTIFICATION_PREFERENCES,
      DEFAULT_NOTIFICATION_PREFERENCES,
      userProfile
    );
    setPreferences(loadedPrefs || DEFAULT_NOTIFICATION_PREFERENCES);
  }, [userProfile]);

  const updatePreference = (key: keyof NotificationPreferences, val: boolean) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: val };
      setUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, updated, userProfile);
      return updated;
    });
  };

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync hydration state if task already completed today
  useEffect(() => {
    if (progression.isTaskCompletedToday('sys-hydration-am')) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.actionType === 'hydration' && !n.actionDone
            ? { ...n, actionDone: true }
            : n
        )
      );
    }
  }, [progression]);

  // Persist notifications on state updates
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      setUserScopedJSON(STORAGE_DOMAINS.NOTIFICATIONS, notifications, userProfile);
    } catch (err) {
      console.warn('Failed to persist notifications:', err);
    }
  }, [notifications, userProfile]);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // Fallback
    }
  };

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2400);
  };

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllAsRead = () => {
    triggerHaptic(ImpactStyle.Medium);
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    showToast('All notifications marked as read');
  };

  const handleToggleRead = (id: string) => {
    triggerHaptic(ImpactStyle.Light);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: !n.isUnread } : n))
    );
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(ImpactStyle.Light);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast('Notification dismissed');
  };

  const handleAction = (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(ImpactStyle.Medium);

    if (item.actionType === 'hydration') {
      if (!item.actionDone) {
        progression.completeTask({
          id: 'sys-hydration-am',
          hp: 15,
          title: 'Circadian Hydration'
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, actionDone: true, isUnread: false } : n))
        );
        showToast('Hydration logged! +15 HP awarded');
      }
    } else if (item.actionType === 'focus') {
      showToast('Launching 45m Focus Block...');
      setTimeout(() => {
        if (onNavigateTab) onNavigateTab('tasks');
      }, 500);
    } else if (item.actionType === 'squad') {
      if (onNavigateTab) onNavigateTab('squad');
    } else if (item.actionType === 'wellbeing') {
      if (onNavigateTab) onNavigateTab('wellbeing');
    }
  };

  const handleSnooze = (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(ImpactStyle.Light);
    showToast('Alert snoozed for 15 minutes');
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
    );
  };

  const handleSavePreferences = () => {
    triggerHaptic(ImpactStyle.Medium);
    setSettingsModalOpen(false);
    showToast('Notification routine preferences updated!');
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const todayItems = filteredNotifications.filter((n) => n.period === 'today');
  const yesterdayItems = filteredNotifications.filter((n) => n.period === 'yesterday');
  const earlierItems = filteredNotifications.filter((n) => n.period === 'earlier');

  const formattedHours = String(currentTime.getHours()).padStart(2, '0');
  const formattedMinutes = String(currentTime.getMinutes()).padStart(2, '0');

  return (
    <div className="w-full h-full flex flex-col bg-[#faf8ff] text-slate-800 relative selection:bg-indigo-100 antialiased overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 inset-x-5 z-50 flex justify-center pointer-events-none animate-fade-in">
          <div className="bg-slate-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 border border-slate-700/60">
            <span className="material-symbols-outlined text-sm text-indigo-400">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header App Bar (Left: Back Arrow Head in front of Orb + Splash Orb + Title/Subtitle) */}
      <AppTopBar
        subtitle="Daily Alerts"
        onBack={() => {
          if (onBack) onBack();
          else if (onNavigateTab) onNavigateTab('home');
        }}
      />

      {/* Action Controls & Filter Pills Container */}
      <div className="px-4 pt-2.5 pb-2 flex items-center justify-between z-20 shrink-0 border-b border-indigo-50/50 bg-[#faf8ff]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold tracking-tight text-slate-900">Notifications</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-extrabold rounded-full uppercase tracking-wider transition-colors ${
              unreadCount > 0
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {unreadCount} New
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mark all as read button */}
          <button
            onClick={handleMarkAllAsRead}
            title="Mark all read"
            className="w-8 h-8 rounded-lg bg-white shadow-xs border border-indigo-50 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 transition cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
          </button>
          {/* Routine Preferences toggle button */}
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              setSettingsModalOpen(true);
            }}
            title="Routine Notification Preferences"
            className="w-8 h-8 rounded-lg bg-white shadow-xs border border-indigo-50 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 transition cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        </div>
      </div>

      {/* Filter Categories Pills */}
      <div className="px-4 py-2 shrink-0 bg-[#faf8ff]">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar py-0.5">
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              setActiveCategory('all');
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'bg-white text-slate-600 border border-slate-100 shadow-2xs hover:bg-slate-50'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              setActiveCategory('rhythm');
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'rhythm'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'bg-white text-slate-600 border border-slate-100 shadow-2xs hover:bg-slate-50'
            }`}
          >
            ⚡ AI Rhythm
          </button>
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              setActiveCategory('squad');
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'squad'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'bg-white text-slate-600 border border-slate-100 shadow-2xs hover:bg-slate-50'
            }`}
          >
            🏆 Squad &amp; Quests
          </button>
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              setActiveCategory('tasks');
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === 'tasks'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'bg-white text-slate-600 border border-slate-100 shadow-2xs hover:bg-slate-50'
            }`}
          >
            🌿 Tasks &amp; Focus
          </button>
        </div>
      </div>

      {/* Main Notification Feed Scroll Container */}
      <main className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-8 pt-2 space-y-4 mobile-scroll">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-3xl">notifications_off</span>
            </div>
            <h3 className="text-base font-bold text-slate-700">No notifications in this category</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              You are completely caught up with your circadian rhythm and squad updates!
            </p>
          </div>
        ) : (
          <>
            {/* Section: TODAY */}
            {todayItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Today
                  </span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Live Rhythm Sync
                  </span>
                </div>

                <div className="space-y-3">
                  {todayItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleRead(item.id)}
                      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
                        item.isUnread
                          ? `bg-white shadow-xs border-l-4 ${item.borderAccent} border-t border-r border-b border-indigo-50/80 hover:shadow-md`
                          : 'bg-white/70 shadow-2xs border border-indigo-50/50 hover:bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Gradient Icon Badge */}
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${item.iconGradient} shrink-0 flex items-center justify-center text-white shadow-sm`}
                        >
                          <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold uppercase tracking-wider ${item.tagColor}`}>
                              {item.tag}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.isUnread && (
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                              )}
                              <span className="text-xs text-slate-400 font-medium">
                                {item.timestamp}
                              </span>
                              <button
                                onClick={(e) => handleDismiss(item.id, e)}
                                title="Dismiss"
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 p-0.5 transition"
                              >
                                <span className="material-symbols-outlined text-[15px]">close</span>
                              </button>
                            </div>
                          </div>

                          <h3 className="text-[15px] font-bold text-slate-900 mt-1 leading-snug">
                            {item.title}
                          </h3>

                          <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Action Bar */}
                          {(item.actionLabel || item.snoozeAvailable) && (
                            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                              {item.actionLabel && !item.actionDone && (
                                <button
                                  onClick={(e) => handleAction(item, e)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                                    item.actionType === 'hydration'
                                      ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800'
                                      : item.actionType === 'squad'
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                                  }`}
                                >
                                  {item.actionType === 'hydration' && (
                                    <span className="material-symbols-outlined text-[14px]">done</span>
                                  )}
                                  {item.actionLabel}
                                  {item.actionType === 'focus' && (
                                    <span className="material-symbols-outlined text-[14px]">
                                      arrow_forward
                                    </span>
                                  )}
                                </button>
                              )}

                              {item.actionDone && (
                                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                  {item.actionDoneText || 'Completed'}
                                </div>
                              )}

                              {item.snoozeAvailable && item.isUnread && (
                                <button
                                  onClick={(e) => handleSnooze(item, e)}
                                  className="px-2.5 py-1 text-slate-400 hover:text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Snooze 15m
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section: YESTERDAY */}
            {yesterdayItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Yesterday
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Rhythm Synced</span>
                </div>

                <div className="space-y-2.5">
                  {yesterdayItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleRead(item.id)}
                      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
                        item.isUnread
                          ? `bg-white shadow-sm border-l-4 ${item.borderAccent} border-t border-r border-b border-indigo-50/80 hover:shadow-md`
                          : 'bg-white/70 shadow-2xs border border-indigo-50/50 hover:bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.iconGradient} shrink-0 flex items-center justify-center text-white shadow-sm`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${item.tagColor}`}>
                              {item.tag}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.isUnread && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              )}
                              <span className="text-[11px] text-slate-400 font-medium">
                                {item.timestamp}
                              </span>
                              <button
                                onClick={(e) => handleDismiss(item.id, e)}
                                title="Dismiss"
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 p-0.5 transition"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">
                            {item.title}
                          </h3>

                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {item.description}
                          </p>

                          {item.hpBadge && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                                <span className="material-symbols-outlined text-[13px]">military_tech</span>
                                {item.hpBadge}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section: EARLIER THIS WEEK */}
            {earlierItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Earlier this week
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Archived</span>
                </div>

                <div className="space-y-2.5">
                  {earlierItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.actionType === 'wellbeing') {
                          if (onNavigateTab) onNavigateTab('wellbeing');
                        } else {
                          handleToggleRead(item.id);
                        }
                      }}
                      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
                        item.isUnread
                          ? `bg-white shadow-sm border-l-4 ${item.borderAccent} border-t border-r border-b border-indigo-50/80 hover:shadow-md`
                          : 'bg-white/60 shadow-2xs border border-indigo-50/40 hover:bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.iconGradient} shrink-0 flex items-center justify-center text-white shadow-sm`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${item.tagColor}`}>
                              {item.tag}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.isUnread && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              )}
                              <span className="text-[11px] text-slate-400 font-medium">
                                {item.timestamp}
                              </span>
                              <button
                                onClick={(e) => handleDismiss(item.id, e)}
                                title="Dismiss"
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 p-0.5 transition"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">
                            {item.title}
                          </h3>

                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {item.description}
                          </p>

                          {item.actionLabel && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                onClick={(e) => handleAction(item, e)}
                                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
                              >
                                {item.actionLabel}
                                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Notification Preferences Modal (Slide-up Sheet) */}
      {settingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar border border-indigo-50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Notification Alert Preferences
                </h3>
                <p className="text-xs text-slate-400">Manage intelligent alerts & quiet hours</p>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-3.5 pt-1">
              {/* Toggle 1: Circadian AI Rhythm */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-bold text-slate-800">Circadian Rhythm Alerts</p>
                  <p className="text-[11px] text-slate-400">
                    Peak focus window & recovery prompts
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.circadianAlerts}
                    onChange={(e) => updatePreference('circadianAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Toggle 2: Squad Quests & Challenges */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-bold text-slate-800">Squad Quest & Leaderboard</p>
                  <p className="text-[11px] text-slate-400">
                    Friend activity, league overtakes & badges
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.squadAlerts}
                    onChange={(e) => updatePreference('squadAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Toggle 3: Rest Safeguard (Do Not Disturb) */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-bold text-slate-800">Night Rest Safeguard</p>
                  <p className="text-[11px] text-slate-400">
                    Silence non-critical notifications 10:00 PM – 7:00 AM
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.nightSafeguard}
                    onChange={(e) => updatePreference('nightSafeguard', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={handleSavePreferences}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition active:scale-98 cursor-pointer"
                type="button"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NotificationScreen;
