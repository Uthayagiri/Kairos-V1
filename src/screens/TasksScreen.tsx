import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BottomNavBar } from '../components/BottomNavBar';
import { AppTopBar } from '../components/AppTopBar';
import {
  useProgression,
  DefaultTask,
  getDefaultTaskCreationTiming,
  calculateEndTime,
  loadTaskTimingSettings,
  useTaskTimingSettings,
  loadUserCustomTasks,
  saveUserCustomTasks,
  EVENT_CUSTOM_TASKS_UPDATED,
  computeTaskStatusForDate,
  recordFocusSession,
  calculateSessionDurationMinutes
} from '../features/progression';
import { squadService } from '../features/squad';
import { syncQueue, syncSerializer } from '../features/sync';

interface TasksScreenProps {
  userProfile?: { id?: string; email: string; name: string; avatarUrl?: string | null; onboardingCompleted?: boolean } | null;
  onNavigateTab: (tab: string) => void;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  category: 'Gym' | 'Study' | 'Health' | 'Routine' | 'Deep Work' | string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'High' | 'Medium' | 'Low';
  hp: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  schedule: string;
  createdAt: string;
  completedAt: string | null;
}

export const formatDateToISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseISODate = (isoStr: string): Date => {
  if (!isoStr) return new Date();
  const parts = isoStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

export const getSundayOfDate = (d: Date): Date => {
  const res = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = res.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  res.setDate(res.getDate() - day);
  return res;
};

export const getDayOffsetISO = (offset: number, baseDate: Date = new Date()): string => {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offset);
  return formatDateToISO(d);
};

export const addDaysToISODate = (isoStr: string, days: number): string => {
  const d = parseISODate(isoStr);
  d.setDate(d.getDate() + days);
  return formatDateToISO(d);
};

export interface DateStripItem {
  dayName: string;
  dayNum: string;
  dateStr: string;
  fullTitle: string;
  isToday?: boolean;
  hasDot?: boolean;
}

export const generateWeekDateStrip = (referenceDate: Date = new Date()): DateStripItem[] => {
  const sunday = getSundayOfDate(referenceDate);
  const todayStr = formatDateToISO(new Date());
  const days: DateStripItem[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
    const dayNum = String(d.getDate());
    const dateStr = formatDateToISO(d);
    const fullDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const isToday = dateStr === todayStr;
    days.push({
      dayName,
      dayNum,
      dateStr,
      fullTitle: isToday ? `${fullDate} (Today)` : fullDate,
      isToday,
      hasDot: dateStr <= todayStr
    });
  }
  return days;
};

export const generateDynamicDateStrip = generateWeekDateStrip;

export const INITIAL_TASKS: TaskItem[] = [];
export const DATE_STRIP: DateStripItem[] = generateWeekDateStrip();

const TOTAL_RADIAL_TICKS = 44;
const RADIAL_PROGRESS_TICKS = Array.from({ length: TOTAL_RADIAL_TICKS }, (_, i) => {
  const angleDeg = -90 + (i * 360) / TOTAL_RADIAL_TICKS;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    i,
    x1: Number((50 + 36 * Math.cos(angleRad)).toFixed(2)),
    y1: Number((50 + 36 * Math.sin(angleRad)).toFixed(2)),
    x2: Number((50 + 46 * Math.cos(angleRad)).toFixed(2)),
    y2: Number((50 + 46 * Math.sin(angleRad)).toFixed(2))
  };
});

export const formatDisplayTime = (timeStr: string) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${m} ${ampm}`;
};

export const formatTaskDateDisplay = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return formatDisplayTime(timeStr || '') || '12:00 PM';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return formatDisplayTime(timeStr || '') || '12:00 PM';
  const d = new Date(year, month - 1, day);
  const dayPrefix = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = formatDisplayTime(timeStr || '') || '12:00 PM';
  return `${dayPrefix} • ${timePart}`;
};

// Check if a task is scheduled for a given date based on its repeat schedule
export const isTaskScheduledForDate = (task: Partial<TaskItem>, dateStr: string): boolean => {
  if (!task) return false;
  const schedule = (task.schedule || '').toLowerCase();
  const startDate = task.startDate;
  const endDate = task.endDate || startDate;

  // Single Event or Date Range (non-repeating):
  if (!schedule || schedule.includes('single') || schedule.includes('no repeat') || schedule.includes('none')) {
    if (startDate && endDate) {
      return dateStr >= startDate && dateStr <= endDate;
    }
    return (startDate || dateStr) === dateStr;
  }

  // Daily Repeat / Daily Routine / Every Day: repeats every single day
  if (schedule.includes('daily') || schedule.includes('every day') || schedule.includes('routine')) {
    if (startDate && dateStr < startDate) return false;
    if (endDate && endDate !== startDate && dateStr > endDate) return false;
    return true;
  }

  // Weekly Repeat / Every Week: repeats every week on the same day of the week (Sunday to Saturday)
  if (schedule.includes('weekly') || schedule.includes('every week')) {
    if (startDate && dateStr < startDate) return false;
    if (endDate && endDate !== startDate && dateStr > endDate) return false;
    const taskD = parseISODate(startDate || dateStr);
    const targetD = parseISODate(dateStr);
    return taskD.getDay() === targetD.getDay();
  }

  // Monthly Repeat / Every Month: repeats every month on the same day of the month (1st to 31st)
  if (schedule.includes('monthly') || schedule.includes('every month')) {
    if (startDate && dateStr < startDate) return false;
    if (endDate && endDate !== startDate && dateStr > endDate) return false;
    const taskD = parseISODate(startDate || dateStr);
    const targetD = parseISODate(dateStr);
    return taskD.getDate() === targetD.getDate();
  }

  return (startDate || dateStr) === dateStr;
};

// Check if current time is within a task's scheduled window
export const checkTaskTimeWindow = (startTime?: string, endTime?: string, now: Date = new Date()) => {
  if (!startTime) {
    return { isWithinWindow: true, isUpcoming: false, isPastWindow: false, formattedRange: 'All Day' };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startTime.split(':').map((v) => parseInt(v, 10) || 0);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = (endTime || '23:59').split(':').map((v) => parseInt(v, 10) || 0);
  const endMinutes = endH * 60 + endM;

  const formattedStart = formatDisplayTime(startTime);
  const formattedEnd = formatDisplayTime(endTime || '23:59');
  const formattedRange = `${formattedStart} – ${formattedEnd}`;

  // Handle cross-midnight windows (e.g. 23:00 -> 02:00)
  if (endMinutes < startMinutes) {
    const isWithin = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    return {
      isWithinWindow: isWithin,
      isUpcoming: !isWithin && currentMinutes < startMinutes && currentMinutes > endMinutes,
      isPastWindow: !isWithin && currentMinutes > endMinutes && currentMinutes < startMinutes,
      formattedRange
    };
  }

  const isWithinWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  const isUpcoming = currentMinutes < startMinutes;
  const isPastWindow = currentMinutes > endMinutes;

  return {
    isWithinWindow,
    isUpcoming,
    isPastWindow,
    formattedRange
  };
};

export const TasksScreen: React.FC<TasksScreenProps> = ({ userProfile, onNavigateTab }) => {
  const progression = useProgression();
  const { settings: timingSettings, updateTaskOverride } = useTaskTimingSettings();

  // Auto-syncing real today date
  const [todayDateStr, setTodayDateStr] = useState<string>(() => formatDateToISO(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      const liveToday = formatDateToISO(new Date());
      if (liveToday !== todayDateStr) {
        setTodayDateStr(liveToday);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [todayDateStr]);

  // Selected date defaults to Today
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => formatDateToISO(new Date()));
  const [currentTab, setCurrentTab] = useState<'pending' | 'completed' | 'overdue'>('pending');

  // Selected Date object
  const selectedDate = useMemo(() => parseISODate(selectedDateStr), [selectedDateStr]);

  // Sunday-to-Saturday 7-day strip anchored to the currently selected week
  const dateStrip = useMemo(() => generateWeekDateStrip(selectedDate), [selectedDate, todayDateStr]);

  const [customTasks, setCustomTasks] = useState<TaskItem[]>(() => loadUserCustomTasks<TaskItem>());

  // Real-time synchronization across all tabs and screens
  useEffect(() => {
    const handleCustomUpdate = () => {
      setCustomTasks(loadUserCustomTasks<TaskItem>());
    };
    window.addEventListener(EVENT_CUSTOM_TASKS_UPDATED, handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);
    return () => {
      window.removeEventListener(EVENT_CUSTOM_TASKS_UPDATED, handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, []);

  // Selected Date Info
  const selectedDateItem = useMemo(() => {
    const found = dateStrip.find((d) => d.dateStr === selectedDateStr);
    if (found) return found;
    const fullDate = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const isToday = selectedDateStr === todayDateStr;
    return {
      dayName: selectedDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: String(selectedDate.getDate()),
      dateStr: selectedDateStr,
      fullTitle: isToday ? `${fullDate} (Today)` : fullDate,
      isToday,
      hasDot: selectedDateStr <= todayDateStr
    };
  }, [dateStrip, selectedDateStr, selectedDate, todayDateStr]);

  const isSelectedToday = selectedDateStr === todayDateStr;
  const isPastDate = selectedDateStr < todayDateStr;
  const isFutureDate = selectedDateStr > todayDateStr;

  // Generate unlocked default tasks for ANY given date (repeating weekly across every week)
  const getDefaultTasksForDate = useCallback(
    (dateStr: string): TaskItem[] => {
      const isSelectedDayToday = dateStr === todayDateStr;
      return progression.unlockedDefaultTasks.map((dt) => {
        const isCompleted = isSelectedDayToday
          ? progression.isTaskCompletedToday(dt.id)
          : progression.isTaskCompletedOnDate(dt.id, dateStr);
        const override = timingSettings.taskOverrides[dt.id];
        const startTime = override?.startTime || dt.startTime || '08:00';
        const endTime = override?.endTime || dt.endTime || '20:00';
        const status = computeTaskStatusForDate(
          {
            id: dt.id,
            startDate: dateStr,
            startTime,
            endDate: dateStr,
            endTime,
            schedule: 'Weekly Repeat'
          },
          dateStr,
          todayDateStr,
          isCompleted
        );

        const completionRec = !isSelectedDayToday && isCompleted ? progression.getTaskCompletionRecord(dt.id, dateStr) : undefined;
        const completedAt = isCompleted
          ? isSelectedDayToday
            ? 'Today'
            : completionRec?.completedAt
            ? `${dateStr} at ${formatDisplayTime(startTime)}`
            : `${dateStr} at ${startTime}`
          : null;

        return {
          id: dt.id,
          title: dt.title,
          description: dt.description,
          category: dt.category,
          status,
          priority: dt.priority,
          hp: dt.hp,
          startDate: dateStr,
          startTime,
          endDate: dateStr,
          endTime,
          schedule: 'Weekly Repeat',
          createdAt: 'System Routine',
          completedAt
        };
      });
    },
    [progression.unlockedDefaultTasks, progression.completedTaskIdsToday, progression.isTaskCompletedToday, progression.isTaskCompletedOnDate, progression.getTaskCompletionRecord, todayDateStr, timingSettings]
  );

  // Default tasks for the currently selected date
  const defaultTaskItems = useMemo<TaskItem[]>(() => {
    return getDefaultTasksForDate(selectedDateStr);
  }, [getDefaultTasksForDate, selectedDateStr]);

  // Tasks for the selected day (Weekly repeating default tasks + user custom tasks for selected date)
  const tasksForSelectedDay = useMemo<TaskItem[]>(() => {
    const dayDefaults = getDefaultTasksForDate(selectedDateStr);
    const dayCustom = customTasks
      .filter((t) => t && typeof t.id === 'string' && t.id.startsWith('custom-') && isTaskScheduledForDate(t, selectedDateStr))
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
        const isCompleted = Boolean(
          isSelectedToday
            ? (isRepeating ? progression.isTaskCompletedToday(t.id) : (progression.isTaskCompletedToday(t.id) || t.status === 'completed'))
            : (isRepeating ? progression.isTaskCompletedOnDate(t.id, selectedDateStr) : (progression.isTaskCompletedOnDate(t.id, selectedDateStr) || (t.status === 'completed' && t.completedAt?.includes(selectedDateStr))))
        );
        const status = computeTaskStatusForDate(
          t,
          selectedDateStr,
          todayDateStr,
          isCompleted
        );
        const completedAt = isCompleted
          ? t.completedAt || (isSelectedToday ? 'Today' : `${selectedDateStr} at ${formatDisplayTime(t.startTime)}`)
          : null;
        return {
          ...t,
          status,
          completedAt
        };
      });
    return [...dayDefaults, ...dayCustom];
  }, [getDefaultTasksForDate, isSelectedToday, selectedDateStr, todayDateStr, customTasks, progression.completedTaskIdsToday, progression.isTaskCompletedToday, progression.isTaskCompletedOnDate]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailMenuOpen, setIsDetailMenuOpen] = useState(false);
  const [rescheduleDropdownTaskId, setRescheduleDropdownTaskId] = useState<string | null>(null);
  const [detailRescheduleOpen, setDetailRescheduleOpen] = useState(false);

  // Add Task Form fields
  const [inputTitle, setInputTitle] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [inputCategory, setInputCategory] = useState<string>('Gym');
  const [inputStartDate, setInputStartDate] = useState(todayDateStr);
  const [inputStartTime, setInputStartTime] = useState('14:30');
  const [inputEndDate, setInputEndDate] = useState(todayDateStr);
  const [inputEndTime, setInputEndTime] = useState('15:30');
  const [inputSchedule, setInputSchedule] = useState('Single Event / No Repeat');
  const [inputPriority, setInputPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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
      // fallback
    }
  };

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
      toastTimerRef.current = null;
    }, 2400);
  };

  // Helper to format exact completion time
  const formatExactCompletionTime = useCallback((task: TaskItem): string => {
    // 1. Check if progression manager has a recorded completion timestamp in taskHistory
    const rec = progression.getTaskCompletionRecord(task.id, selectedDateStr) || progression.getTaskCompletionRecord(task.id);
    if (rec && rec.completedAt) {
      const d = new Date(rec.completedAt);
      if (!isNaN(d.getTime())) {
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isToday = rec.date === todayDateStr || selectedDateStr === todayDateStr;
        return isToday ? `Today at ${timeStr}` : `${rec.date} at ${timeStr}`;
      }
    }

    // 2. Check task.completedAt string if already set with exact time
    if (task.completedAt) {
      if (task.completedAt.includes('at ')) {
        const timePart = task.completedAt.split('at ')[1];
        const isToday = selectedDateStr === todayDateStr || task.completedAt.startsWith('Today');
        return isToday ? `Today at ${timePart}` : task.completedAt;
      }
      if (task.completedAt !== 'Today') {
        return task.completedAt;
      }
    }

    // 3. Fallback for tasks completed today without a timestamp
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Today at ${timeFormatted}`;
  }, [progression, selectedDateStr, todayDateStr]);

  // Helper Functions
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Gym':
      case 'Fitness':
        return 'fitness_center';
      case 'Study':
      case 'Intellect':
      case 'Skill':
        return 'menu_book';
      case 'Health':
      case 'Wellness':
        return 'vital_signs';
      case 'Routine':
      case 'Discipline':
        return 'update';
      case 'Deep Work':
      case 'Productivity':
        return 'terminal';
      case 'Reflection':
      case 'self_improvement':
        return 'self_improvement';
      case 'Social':
        return 'groups';
      case 'Organization':
        return 'folder';
      default:
        return 'task_alt';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Gym':
      case 'Fitness':
        return 'bg-secondary-fixed text-on-secondary-fixed';
      case 'Study':
      case 'Intellect':
      case 'Skill':
        return 'bg-primary-fixed text-on-primary-fixed';
      case 'Health':
      case 'Wellness':
        return 'bg-tertiary-fixed text-on-tertiary-fixed';
      case 'Routine':
      case 'Discipline':
        return 'bg-surface-container-high text-primary';
      case 'Deep Work':
      case 'Productivity':
        return 'bg-primary-fixed text-on-primary-fixed';
      case 'Reflection':
        return 'bg-secondary-fixed text-on-secondary-fixed';
      case 'Social':
        return 'bg-tertiary-fixed text-on-tertiary-fixed';
      case 'Organization':
        return 'bg-surface-container-high text-primary';
      default:
        return 'bg-surface-container text-on-surface';
    }
  };

  // Metrics calculations for the selected day
  const pendingCount = tasksForSelectedDay.filter((t) => t.status === 'pending').length;
  const completedCount = tasksForSelectedDay.filter((t) => t.status === 'completed').length;
  const overdueCount = tasksForSelectedDay.filter((t) => t.status === 'overdue').length;
  const totalTasks = tasksForSelectedDay.length;

  // HP gained on selected day
  const gainedHp = useMemo(() => {
    if (isSelectedToday) {
      return progression.todayHP;
    }
    return tasksForSelectedDay
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.hp || 0), 0);
  }, [isSelectedToday, progression.todayHP, tasksForSelectedDay]);

  // Progress bar calculation based on completed tasks and total available tasks on the day
  const taskProgressPercent = totalTasks > 0 ? Math.min(100, Math.round((completedCount / totalTasks) * 100)) : 0;
  const activeRadialTicks = Math.round((taskProgressPercent / 100) * TOTAL_RADIAL_TICKS);

  // Helper to compute tasks and completion percentage for any date in the strip
  const getDateProgress = useMemo(() => {
    return (dateStr: string) => {
      const isToday = dateStr === todayDateStr;
      const dayDefaults = getDefaultTasksForDate(dateStr);
      const dayCustom = customTasks
        .filter((t) => t && typeof t.id === 'string' && t.id.startsWith('custom-') && isTaskScheduledForDate(t, dateStr))
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
          const isCompleted = Boolean(
            isToday
              ? (isRepeating ? progression.isTaskCompletedToday(t.id) : (progression.isTaskCompletedToday(t.id) || t.status === 'completed'))
              : (isRepeating ? progression.isTaskCompletedOnDate(t.id, dateStr) : (progression.isTaskCompletedOnDate(t.id, dateStr) || (t.status === 'completed' && t.completedAt?.includes(dateStr))))
          );
          const status = computeTaskStatusForDate(
            t,
            dateStr,
            todayDateStr,
            isCompleted
          );
          return { ...t, status };
        });
      const allForDay = [...dayDefaults, ...dayCustom];
      const total = allForDay.length;
      const completed = allForDay.filter((t) => t.status === 'completed').length;
      const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
      return { total, completed, percent };
    };
  }, [getDefaultTasksForDate, todayDateStr, customTasks, progression.completedTaskIdsToday, progression.isTaskCompletedToday, progression.isTaskCompletedOnDate]);

  // Date strip navigation handlers
  const handlePrevDay = () => {
    triggerHaptic(ImpactStyle.Light);
    const cur = parseISODate(selectedDateStr);
    const prev = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 1);
    setSelectedDateStr(formatDateToISO(prev));
  };

  const handleNextDay = () => {
    triggerHaptic(ImpactStyle.Light);
    const cur = parseISODate(selectedDateStr);
    const next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    setSelectedDateStr(formatDateToISO(next));
  };

  const handleSelectToday = () => {
    triggerHaptic(ImpactStyle.Light);
    setSelectedDateStr(todayDateStr);
  };

  // Toggle status of a task - strictly enforced scheduled time window
  const toggleTaskCompletion = (taskId: string) => {
    const target = tasksForSelectedDay.find((t) => t.id === taskId);
    if (!target) return;

    // 1. If viewing a FUTURE date: Block completion with clear locked feedback
    if (isFutureDate) {
      triggerHaptic(ImpactStyle.Medium);
      const timeWindow = checkTaskTimeWindow(target.startTime, target.endTime);
      showToast(
        `🔒 Scheduled for ${selectedDateItem.dayName} (${selectedDateStr}) from ${timeWindow.formattedRange}. Tasks can only be completed on their scheduled day during their active window.`
      );
      return;
    }

    // 2. If viewing a PAST date: Historical record is locked
    if (isPastDate) {
      triggerHaptic(ImpactStyle.Medium);
      const timeWindow = checkTaskTimeWindow(target.startTime, target.endTime);
      showToast(
        `⏰ Scheduled window closed (${timeWindow.formattedRange}). Past tasks cannot be modified.`
      );
      return;
    }

    // 3. If viewing TODAY:
    const isCompleted = progression.isTaskCompletedToday(taskId);
    if (isCompleted) {
      triggerHaptic(ImpactStyle.Heavy);
      progression.uncompleteTask(taskId, target.hp);
      squadService.removeTaskContribution(taskId, undefined, selectedDateStr);

      if (customTasks.some((t) => t.id === taskId)) {
        const updated = customTasks.map((t) =>
          t.id === taskId ? { ...t, status: 'pending' as const, completedAt: null } : t
        );
        setCustomTasks(updated);
        saveUserCustomTasks(updated);
      }
      showToast('Task moved back to pending.');
    } else {
      // Enforce scheduled time window constraint for ALL recurring & custom tasks (daily, weekly, monthly, single event)
      const timeWindow = checkTaskTimeWindow(target.startTime, target.endTime);
      if (!timeWindow.isWithinWindow) {
        triggerHaptic(ImpactStyle.Medium);
        if (timeWindow.isUpcoming) {
          showToast(
            `🔒 Scheduled for ${timeWindow.formattedRange}. You can only complete this task during its scheduled window.`
          );
        } else {
          showToast(
            `⏰ Scheduled window closed (${timeWindow.formattedRange}). Tasks can only be completed during their scheduled time.`
          );
        }
        return;
      }

      // CURRENT TIME IS WITHIN SCHEDULED WINDOW -> Complete task and award HP/XP
      triggerHaptic(ImpactStyle.Heavy);
      const res = progression.completeTask({
        id: taskId,
        hp: target.hp,
        title: target.title
      });

      // Record eligible Squad challenge contribution independently (0 additional XP/HP)
      if (res.success) {
        squadService.recordTaskContribution({
          id: taskId,
          title: target.title,
          category: target.category,
          startTime: target.startTime,
          endTime: target.endTime,
          date: selectedDateStr
        });
      }

      const now = new Date();
      const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const completedAtString = `Today at ${timeFormatted}`;

      // Record FocusSession if this is a deep work or focus task
      if (
        res.success &&
        (['Deep Work', 'Study', 'Intellect', 'Skill', 'Productivity'].includes(target.category) ||
          /focus|deep work|pomodoro/i.test(target.title))
      ) {
        const dur = calculateSessionDurationMinutes(target.startTime, target.endTime);
        if (dur > 0) {
          recordFocusSession({
            id: `task_focus_${target.id}_${formatDateToISO(new Date())}`,
            startTime: target.startTime || '09:00',
            endTime: target.endTime || '10:00',
            durationMinutes: dur,
            completed: true,
            date: formatDateToISO(new Date()),
            title: target.title,
            category: target.category
          });
        }
      }

      if (customTasks.some((t) => t.id === taskId)) {
        const updated = customTasks.map((t) =>
          t.id === taskId
            ? { ...t, status: 'completed' as const, completedAt: completedAtString }
            : t
        );
        setCustomTasks(updated);
        saveUserCustomTasks(updated);
      }

      if (res.didLevelUp) {
        showToast(
          `🎉 Level Up! You reached Level ${res.newLevel}: ${progression.levelTitle}! +${res.hpAwarded} HP (+${res.xpAwarded} XP)`
        );
      } else {
        showToast(`+${res.hpAwarded} HP (+${res.xpAwarded} XP) Claimed! Task Completed at ${timeFormatted}.`);
      }
    }

    // If detail modal is open for this task, sync it
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => {
        if (!prev) return null;
        const nextStatus = prev.status === 'completed' ? 'pending' : 'completed';
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          ...prev,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? `Today at ${timeFormatted}` : null
        };
      });
    }
  };

  // Open Detail Modal
  const openDetailModal = (task: TaskItem) => {
    triggerHaptic(ImpactStyle.Light);
    let resolvedTask = { ...task };
    if (task.status === 'completed') {
      const exactTime = formatExactCompletionTime(task);
      resolvedTask.completedAt = exactTime;
    }
    setSelectedTask(resolvedTask);
    setIsDetailModalOpen(true);
    setIsDetailMenuOpen(false);
    setDetailRescheduleOpen(false);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
    setIsDetailMenuOpen(false);
    setDetailRescheduleOpen(false);
  };

  // Open & Close Add Task Modal
  const openAddTaskModal = () => {
    triggerHaptic(ImpactStyle.Light);
    const { startTime, endTime } = getDefaultTaskCreationTiming();
    setInputStartDate(selectedDateStr);
    setInputEndDate(selectedDateStr);
    setInputStartTime(startTime);
    setInputEndTime(endTime);
    setIsAddModalOpen(true);
  };

  const closeAddTaskModal = () => {
    setIsAddModalOpen(false);
    setInputTitle('');
    setInputDescription('');
  };

  // Submit Add Task Form (Persistent Custom Task)
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    triggerHaptic(ImpactStyle.Medium);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetDate = inputStartDate || selectedDateStr;
    const newTask: TaskItem = {
      id: 'custom-' + Date.now(),
      title: inputTitle.trim(),
      description: inputDescription.trim() || 'Custom user mission.',
      category: inputCategory,
      status: 'pending',
      priority: inputPriority,
      hp: 20,
      startDate: targetDate,
      startTime: inputStartTime || '14:30',
      endDate: inputEndDate || targetDate,
      endTime: inputEndTime || '15:30',
      schedule: inputSchedule,
      createdAt: `${selectedDateItem.dayName} at ${nowTime}`,
      completedAt: null
    };

    const updated = [newTask, ...customTasks];
    setCustomTasks(updated);
    saveUserCustomTasks(updated);

    try {
      syncQueue.enqueue(
        'TASK_CREATED',
        syncSerializer.taskCreated({
          taskId: newTask.id,
          title: newTask.title,
          category: newTask.category,
          targetHp: newTask.hp,
          startTime: newTask.startTime,
          endTime: newTask.endTime,
          durationMinutes: calculateSessionDurationMinutes(newTask.startTime, newTask.endTime),
          isCustom: true
        })
      );
    } catch {}

    closeAddTaskModal();
    setCurrentTab('pending');
    showToast(`Mission "${newTask.title}" added to pending queue!`);
  };

  // Add Extra Time (+15m, +30m, +60m) for Pending Tasks
  const handleAddExtraTime = (taskId: string, extraMinutes: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic(ImpactStyle.Light);

    const task = tasksForSelectedDay.find((t) => t.id === taskId);
    if (!task) return;

    const currentEnd = task.endTime || '18:00';
    const [endH, endM] = currentEnd.split(':').map((v) => parseInt(v, 10) || 0);

    const now = new Date();
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();
    const taskEndTotalMins = endH * 60 + endM;
    const baseMins = isSelectedToday && currentTotalMins > taskEndTotalMins ? currentTotalMins : taskEndTotalMins;

    const newTotalMins = baseMins + extraMinutes;
    const newH = (Math.floor(newTotalMins / 60) % 24).toString().padStart(2, '0');
    const newM = (newTotalMins % 60).toString().padStart(2, '0');
    const newEnd = `${newH}:${newM}`;

    const isCustom = taskId.startsWith('custom-') || customTasks.some((t) => t.id === taskId);
    if (isCustom) {
      const updated = customTasks.map((t) => (t.id === taskId ? { ...t, endTime: newEnd, status: 'pending' as const } : t));
      setCustomTasks(updated);
      saveUserCustomTasks(updated);

      try {
        syncQueue.enqueue(
          'TASK_UPDATED',
          syncSerializer.taskUpdated({
            taskId,
            endTime: newEnd
          })
        );
      } catch {}
    } else {
      updateTaskOverride(taskId, task.startTime || '08:00', newEnd);
    }

    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, endTime: newEnd, status: 'pending' } : null));
    }
    showToast(`Added +${extraMinutes}m extra time (ends at ${formatDisplayTime(newEnd)}).`);
  };

  // Reschedule custom task only (Next Day, Day After Tomorrow, Next Week)
  const handleRescheduleCustomTask = (taskId: string, daysOffset: number, label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic(ImpactStyle.Medium);

    // Reschedule ONLY applies to user-created custom tasks
    if (!taskId.startsWith('custom-') && !customTasks.some((t) => t.id === taskId)) {
      showToast('Rescheduling is only available for custom user tasks.');
      return;
    }

    const target = customTasks.find((t) => t.id === taskId);
    if (!target) return;

    const baseDate = selectedDateStr;
    const newStartDate = addDaysToISODate(baseDate, daysOffset);

    // If target has a multi-day span, preserve duration
    let newEndDate = newStartDate;
    if (target.endDate && target.endDate !== target.startDate) {
      const startD = parseISODate(target.startDate || selectedDateStr);
      const endD = parseISODate(target.endDate);
      const spanDays = Math.max(0, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
      newEndDate = addDaysToISODate(newStartDate, spanDays);
    }

    const updated = customTasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            startDate: newStartDate,
            endDate: newEndDate,
            schedule: 'Single Event / No Repeat',
            status: 'pending' as const,
            completedAt: null
          }
        : t
    );

    setCustomTasks(updated);
    saveUserCustomTasks(updated);

    try {
      syncQueue.enqueue(
        'TASK_UPDATED',
        syncSerializer.taskUpdated({
          taskId,
          startTime: target.startTime,
          endTime: target.endTime
        })
      );
    } catch {}

    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              startDate: newStartDate,
              endDate: newEndDate,
              schedule: 'Single Event / No Repeat',
              status: 'pending',
              completedAt: null
            }
          : null
      );
    }

    setRescheduleDropdownTaskId(null);
    setDetailRescheduleOpen(false);
    showToast(`Task rescheduled to ${label} (${newStartDate}).`);
  };

  // Delete Custom Task
  const handleQuickDelete = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic(ImpactStyle.Medium);
    const updated = customTasks.filter((t) => t.id !== taskId);
    setCustomTasks(updated);
    saveUserCustomTasks(updated);

    try {
      syncQueue.enqueue(
        'TASK_DELETED',
        syncSerializer.taskDeleted({
          taskId
        })
      );
    } catch {}

    if (selectedTask && selectedTask.id === taskId) {
      closeDetailModal();
    }
    showToast('Task removed.');
  };

  const filteredTasks = tasksForSelectedDay.filter((t) => t.status === currentTab);

  return (
    <div className="w-full h-full flex flex-col bg-surface overflow-hidden relative selection:bg-primary-fixed selection:text-on-primary-fixed antialiased animate-fade-in text-on-surface">
      {/* Top Header App Bar */}
      <AppTopBar
        subtitle="Tasks & Flow"
        rightAction={
          <button
            onClick={openAddTaskModal}
            aria-label="Add task"
            className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 text-on-primary flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border-none"
            id="openTaskBuilderBtn"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">add</span>
          </button>
        }
      />

      {/* Main Scrollable Content */}
      <main className="flex-1 mobile-scroll w-full px-4 pt-3.5 pb-28 bg-surface space-y-4 sm:space-y-4.5">
        {/* Ambient Light Backing Effect */}
        <div className="relative w-full">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-28 bg-primary-fixed-dim/30 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-10 right-2 w-48 h-28 bg-tertiary-fixed/35 rounded-full blur-3xl pointer-events-none -z-10" />
        </div>

        {/* Section Header & Quick Date Switcher */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
              {selectedDateItem.fullTitle}
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-on-surface">
              Tasks &amp; Missions
            </h1>
          </div>

          {/* Quick Date Switcher Actions */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-full shadow-xs border border-surface-container-high/60">
            <button
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors active:scale-95 cursor-pointer"
              id="prevDayBtn"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={handleSelectToday}
              className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer ${
                isSelectedToday
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-primary hover:bg-surface-container'
              }`}
              id="todayBtn"
              type="button"
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              aria-label="Next day"
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors active:scale-95 cursor-pointer"
              id="nextDayBtn"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Horizontal Dynamic Date Strip Calendar */}
        <div className="w-full py-0.5">
          <div className="flex items-center justify-between gap-1.5 w-full">
            {dateStrip.map((day) => {
              const isSelected = selectedDateStr === day.dateStr;
              const { percent } = getDateProgress(day.dateStr);
              return (
                <button
                  key={day.dateStr}
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSelectedDateStr(day.dateStr);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-2 px-0.5 min-h-[68px] rounded-2xl transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-[0_6px_18px_-3px_rgba(79,70,229,0.4)] scale-[1.03] z-10 font-bold'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-surface-container-high/60 font-medium'
                  }`}
                  id={`dateStripDay_${day.dayNum}`}
                  type="button"
                >
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isSelected ? 'text-on-primary-container' : 'text-on-surface-variant'
                    }`}
                  >
                    {day.dayName}
                  </span>
                  <span
                    className={`text-[15px] sm:text-[16px] font-bold leading-tight my-0.5 ${
                      isSelected ? 'text-on-primary' : 'text-on-surface'
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  <span
                    className={`text-[10.5px] font-extrabold flex items-center justify-center gap-0.5 tracking-tight ${
                      isSelected
                        ? 'text-tertiary-fixed'
                        : percent === 100
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : percent > 0
                        ? 'text-primary'
                        : 'text-on-surface-variant/60'
                    }`}
                  >
                    {percent}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Progress Summary Card */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs p-4 sm:p-4.5 transition-all border border-outline-variant/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shadow-xs">
                <span className="material-symbols-outlined text-[19px]">donut_large</span>
              </div>
              <div>
                <span className="text-sm sm:text-base text-on-surface font-extrabold leading-tight block">
                  {selectedDateItem.fullTitle.replace(' (Today)', '')} Progress
                </span>
                <span className="text-xs text-on-surface-variant font-medium">
                  {completedCount} of {totalTasks} tasks completed {isSelectedToday ? 'today' : `on ${selectedDateItem.dayName}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary border border-primary/20">
              <span className={`w-1.5 h-1.5 rounded-full ${taskProgressPercent === 100 ? 'bg-emerald-500' : 'bg-primary animate-pulse'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {taskProgressPercent === 100 ? 'Complete' : 'Active'}
              </span>
            </div>
          </div>

          {/* Progress Gauge & Metrics Grid */}
          <div className="flex items-center gap-3.5 pt-0.5">
            {/* Circular Radial Progress Gauge */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full drop-shadow-xs" viewBox="0 0 100 100" id="progressCircle">
                {/* Inner soft disc */}
                <circle cx="50" cy="50" r="32" className="fill-surface-container-low/80 dark:fill-surface-container/60" />
                {/* Inner concentric ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-primary/20 dark:text-primary/30"
                />

                {/* Radial Ticks */}
                {RADIAL_PROGRESS_TICKS.map((tick) => {
                  const isActive = tick.i < activeRadialTicks;
                  return (
                    <line
                      key={tick.i}
                      x1={tick.x1}
                      y1={tick.y1}
                      x2={tick.x2}
                      y2={tick.y2}
                      stroke="currentColor"
                      strokeWidth={isActive ? '2.5' : '1.8'}
                      strokeLinecap="round"
                      className={
                        isActive
                           ? 'text-primary transition-colors duration-300'
                          : 'text-surface-container-highest dark:text-white/20 transition-colors duration-300'
                      }
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none select-none">
                <span className="text-base sm:text-lg font-black text-on-surface tracking-tight" id="progressPercentage">
                  {taskProgressPercent}%
                </span>
                <span className="text-[9px] sm:text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">
                  Done
                </span>
              </div>
            </div>

            {/* 2x2 Metric Breakdown */}
            <div className="grid grid-cols-2 gap-2 flex-1">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/90 border border-surface-container-high/40">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">check_circle</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs text-on-surface font-bold" id="statCompleted">
                    {completedCount} Done
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium truncate">Completed</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/90 border border-surface-container-high/40">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">pending_actions</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs text-on-surface font-bold" id="statPending">
                    {pendingCount} Pending
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium truncate">Remaining</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/90 border border-surface-container-high/40">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">stars</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs text-primary font-bold" id="statHp">
                    +{gainedHp} HP
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium truncate">Claimed</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/90 border border-surface-container-high/40">
                <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0">warning</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-xs text-tertiary font-bold" id="statOverdue">
                    {overdueCount} Overdue
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium truncate">Alert</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Morning Routine Overview Banner */}
        <div className="rounded-2xl p-3.5 bg-gradient-to-r from-primary-fixed/60 via-secondary-fixed/40 to-surface-container-lowest border border-primary/20 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[19px]">wb_sunny</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm text-on-surface font-bold leading-tight">
                {selectedDateItem.dayName} Schedule Active
              </span>
              <span className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                {isSelectedToday
                  ? 'Circadian alignment: 4 of 4 morning micro-habits logged'
                  : `Viewing tasks and schedule calibration for ${selectedDateItem.fullTitle}`}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest text-primary text-xs font-bold shadow-xs shrink-0">
            {isSelectedToday ? 'Active' : 'Scheduled'}
          </span>
        </div>

        {/* Modern Segmented Tabs Container (Medium & Clean) */}
        <div className="w-full pt-0.5">
          <div className="flex items-stretch gap-1.5 p-1 rounded-xl bg-surface-container-high/70 backdrop-blur-md border border-outline-variant/30 shadow-inner">
            {/* Pending Tab */}
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setCurrentTab('pending');
              }}
              className={`browser-tab flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg font-bold transition-all active:scale-[0.98] text-xs min-h-[42px] cursor-pointer ${
                currentTab === 'pending'
                  ? 'bg-surface-container-lowest text-primary shadow-xs border border-white/70'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
              }`}
              id="tabBtnPending"
              type="button"
            >
              <span className="material-symbols-outlined text-[17px]">hourglass_top</span>
              <span>Pending</span>
              <span
                className={`tab-badge px-2 py-0.5 rounded-full text-[11px] font-bold leading-tight ${
                  currentTab === 'pending'
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                id="badgePending"
              >
                {pendingCount}
              </span>
            </button>

            {/* Completed Tab */}
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setCurrentTab('completed');
              }}
              className={`browser-tab flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg font-bold transition-all active:scale-[0.98] text-xs min-h-[42px] cursor-pointer ${
                currentTab === 'completed'
                  ? 'bg-surface-container-lowest text-primary shadow-xs border border-white/70'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
              }`}
              id="tabBtnCompleted"
              type="button"
            >
              <span className="material-symbols-outlined text-[17px]">task_alt</span>
              <span>Completed</span>
              <span
                className={`tab-badge px-2 py-0.5 rounded-full text-[11px] font-bold leading-tight ${
                  currentTab === 'completed'
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                id="badgeCompleted"
              >
                {completedCount}
              </span>
            </button>

            {/* Overdue Tab */}
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setCurrentTab('overdue');
              }}
              className={`browser-tab flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg font-bold transition-all active:scale-[0.98] text-xs min-h-[42px] cursor-pointer ${
                currentTab === 'overdue'
                  ? 'bg-surface-container-lowest text-tertiary shadow-xs border border-white/70'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
              }`}
              id="tabBtnOverdue"
              type="button"
            >
              <span className="material-symbols-outlined text-[17px] text-tertiary">error</span>
              <span>Overdue</span>
              <span
                className={`tab-badge px-2 py-0.5 rounded-full text-[11px] font-bold leading-tight ${
                  currentTab === 'overdue'
                    ? 'bg-error-container text-error'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                id="badgeOverdue"
              >
                {overdueCount}
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Container for Active Tab Content */}
        <div className="w-full flex flex-col space-y-3 pt-0.5" id="taskContentArea">
          {/* Subheader */}
          {currentTab === 'completed' && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-on-surface font-bold uppercase tracking-wider">
                COMPLETED ON {selectedDateItem.dayName.toUpperCase()} ({filteredTasks.length})
              </span>
              <span className="text-xs font-bold text-primary">
                +{gainedHp} HP Total Claimed
              </span>
            </div>
          )}

          {currentTab === 'pending' && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-on-surface font-bold uppercase tracking-wider">
                Pending Execution ({filteredTasks.length})
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                Tap task to view details
              </span>
            </div>
          )}

          {currentTab === 'overdue' && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-tertiary font-bold uppercase tracking-wider">
                Attention Required ({filteredTasks.length})
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                Critical health &amp; mission sync
              </span>
            </div>
          )}

          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/50 space-y-2">
              <span className="material-symbols-outlined text-[36px] text-primary mb-1">
                done_all
              </span>
              <span className="text-sm font-bold text-on-surface">
                No {currentTab} tasks for {selectedDateItem.fullTitle.replace(' (Today)', '')}
              </span>
              <span className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                {currentTab === 'completed'
                  ? 'Complete pending tasks from this day to see them here.'
                  : currentTab === 'overdue'
                  ? 'All clear! No overdue tasks flagged for this day.'
                  : `Tap '+ New Task' at the top right to schedule tasks for ${selectedDateItem.fullTitle}.`}
              </span>
            </div>
          )}

          {/* Task Items Render */}
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.status === 'overdue';
            const timeDisplay = formatDisplayTime(task.startTime);
            const rawTimeWindow = checkTaskTimeWindow(task.startTime, task.endTime);
            const timeWindow = isSelectedToday
              ? rawTimeWindow
              : {
                  isWithinWindow: false,
                  isUpcoming: isFutureDate,
                  isPastWindow: isPastDate,
                  formattedRange: rawTimeWindow.formattedRange
                };

            if (isCompleted) {
              const exactCompletionText = formatExactCompletionTime(task);
              return (
                <div
                  key={task.id}
                  onClick={() => openDetailModal(task)}
                  className="task-card relative overflow-hidden rounded-2xl bg-surface-container-low/90 hover:bg-surface-container p-4 transition-all cursor-pointer border border-outline-variant/30 active:scale-[0.99] space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompletion(task.id);
                        }}
                        className="toggle-check-btn w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0 transition-transform active:scale-90 cursor-pointer"
                        title="Mark Incomplete"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg ${getCategoryColor(
                              task.category
                            )} text-[11px] font-bold`}
                          >
                            {task.category}
                          </span>
                          <span className="text-on-surface-variant text-xs font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                            {exactCompletionText}
                          </span>
                        </div>
                        <span className="text-sm sm:text-[15px] text-on-surface font-bold leading-snug truncate">
                          {task.title}
                        </span>
                        <span className="text-xs text-on-surface-variant truncate mt-0.5 leading-relaxed">
                          {task.description}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-secondary text-xs font-bold shrink-0">
                      +{task.hp} HP
                    </span>
                  </div>
                </div>
              );
            }

            if (isOverdue) {
              return (
                <div
                  key={task.id}
                  onClick={() => openDetailModal(task)}
                  className="task-card relative overflow-hidden rounded-2xl bg-error-container/25 border border-error/30 p-4 transition-all shadow-xs cursor-pointer active:scale-[0.99] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompletion(task.id);
                        }}
                        className="toggle-check-btn mt-0.5 w-8 h-8 rounded-xl bg-surface-container-lowest hover:bg-error/20 flex items-center justify-center text-error transition-all active:scale-90 shadow-xs shrink-0 border border-error/30 cursor-pointer"
                        title={
                          timeWindow.isWithinWindow
                            ? 'Complete Task'
                            : `Scheduled for ${timeWindow.formattedRange}`
                        }
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {timeWindow.isWithinWindow ? 'check' : 'lock_clock'}
                        </span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-error text-on-error text-[11px] font-bold">
                            Overdue
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-lg ${getCategoryColor(
                              task.category
                            )} text-[11px] font-bold`}
                          >
                            {task.category}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-surface-container-lowest text-primary text-[11px] font-bold">
                            +{task.hp} HP
                          </span>
                        </div>
                        <span className="text-sm sm:text-[15px] text-on-surface font-extrabold leading-snug">
                          {task.title}
                        </span>
                        <span className="text-xs text-on-surface-variant line-clamp-2 mt-0.5 leading-relaxed">
                          {task.description}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant text-xs mt-0.5 pt-2.5 border-t border-error/20">
                    <div className="flex items-center gap-1.5 text-error font-bold">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>
                        {task.startTime && task.endTime
                          ? `${formatDisplayTime(task.startTime)} – ${formatDisplayTime(task.endTime)}`
                          : timeDisplay || '5:00 PM'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-error/90 bg-error/10 px-2 py-0.5 rounded-md border border-error/20">
                      Window Expired
                    </span>
                  </div>
                </div>
              );
            }

            // Pending Item
            return (
              <div
                key={task.id}
                onClick={() => openDetailModal(task)}
                className="task-card group relative overflow-visible rounded-2xl bg-surface-container-lowest p-4 shadow-xs transition-all border border-outline-variant/30 hover:border-primary/40 cursor-pointer active:scale-[0.99] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompletion(task.id);
                      }}
                      className={`toggle-check-btn mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0 cursor-pointer shadow-xs ${
                        timeWindow.isWithinWindow
                          ? 'bg-primary text-on-primary hover:bg-primary/90'
                          : timeWindow.isUpcoming
                          ? 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant/70 border border-outline-variant/40'
                          : 'bg-error-container/30 hover:bg-error-container/50 text-error border border-error/30'
                      }`}
                      title={
                        timeWindow.isWithinWindow
                          ? 'Complete Task'
                          : isFutureDate
                          ? `Scheduled for ${selectedDateItem.dayName} (${timeWindow.formattedRange})`
                          : timeWindow.isUpcoming
                          ? `Scheduled for ${timeWindow.formattedRange}`
                          : `Window closed (${timeWindow.formattedRange})`
                      }
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {timeWindow.isWithinWindow ? 'check' : timeWindow.isUpcoming ? 'lock_clock' : 'history'}
                      </span>
                    </button>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg ${getCategoryColor(
                            task.category
                          )} text-[11px] font-bold`}
                        >
                          {task.category}
                        </span>
                        {task.priority === 'High' && (
                          <span className="px-2 py-0.5 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">priority_high</span>{' '}
                            High
                          </span>
                        )}
                        {/* Time Window Status Badge */}
                        {timeWindow.isWithinWindow ? (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Now
                          </span>
                        ) : timeWindow.isUpcoming ? (
                          <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant text-[11px] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-primary">schedule</span>
                            {isFutureDate ? `Scheduled: ${formatDisplayTime(task.startTime)}` : `Starts ${formatDisplayTime(task.startTime)}`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-error-container/30 text-error text-[11px] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">history</span>
                            Window Ended
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                          +{task.hp} HP
                        </span>
                      </div>
                      <span className="text-sm sm:text-[15px] text-on-surface font-extrabold leading-snug">
                        {task.title}
                      </span>
                      <span className="text-xs text-on-surface-variant line-clamp-2 mt-0.5 leading-relaxed">
                        {task.description}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant text-xs mt-0.5 pt-2.5 border-t border-outline-variant/30">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                    <span>
                      {task.startTime && task.endTime
                        ? `${formatDisplayTime(task.startTime)} – ${formatDisplayTime(task.endTime)}`
                        : timeDisplay || '11:30 AM'} • {task.schedule || 'Daily'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-on-surface-variant/70 text-[11px] font-medium">
                    <span>View details</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* CENTERED ADD TASK MODAL (Medium Proportions) */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-sm animate-fade-in"
          id="addTaskModal"
          onClick={closeAddTaskModal}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-2xl border border-outline-variant/30 flex flex-col space-y-3.5 max-h-[90vh] overflow-y-auto transform animate-scale-up"
            id="addTaskModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">add_task</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg text-on-surface font-extrabold leading-tight">
                    Create Task &amp; Mission
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Calibrated for neural flow &amp; progression
                  </p>
                </div>
              </div>
              <button
                onClick={closeAddTaskModal}
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-90 cursor-pointer border-none"
                id="closeAddTaskModalBtn"
                type="button"
              >
                <span className="material-symbols-outlined text-[19px]">close</span>
              </button>
            </div>

            {/* Add Task Form */}
            <form className="space-y-3.5" id="addTaskForm" onSubmit={handleAddTaskSubmit}>
              {/* Title */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Mission Title *
                </label>
                <input
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-xs font-medium border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none placeholder:text-outline transition-all"
                  id="inputTitle"
                  placeholder="e.g., Deep Work: Neural Systems Architecture"
                  required
                  type="text"
                  autoFocus={isAddModalOpen}
                />
              </div>

              {/* Description Notes */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Context, Sub-goals &amp; Notes
                </label>
                <textarea
                  value={inputDescription}
                  onChange={(e) => setInputDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-xs leading-relaxed border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none placeholder:text-outline resize-none transition-all"
                  id="inputDescription"
                  placeholder="Outline focus milestones, tools, squad links, or metrics..."
                  rows={2}
                />
              </div>

              {/* Domain / Category Select & Quick Pills */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Domain / Category
                  </label>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getCategoryColor(
                      inputCategory
                    )}`}
                    id="activeCategoryBadge"
                  >
                    {inputCategory}
                  </span>
                </div>
                <select
                  value={inputCategory}
                  onChange={(e) => setInputCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-xs font-semibold border border-outline-variant/30 focus:border-primary focus:outline-none cursor-pointer"
                  id="inputCategory"
                >
                  <option value="Gym">Gym &amp; Physical Conditioning</option>
                  <option value="Study">Study &amp; Academic Milestones</option>
                  <option value="Health">Health &amp; Circadian Biohacking</option>
                  <option value="Routine">Routine &amp; Diurnal Habits</option>
                  <option value="Deep Work">Deep Work &amp; Engineering</option>
                </select>

                {/* Interactive Category Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5" id="categoryChipsContainer">
                  {['Gym', 'Study', 'Health', 'Routine', 'Deep Work'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setInputCategory(cat);
                      }}
                      className={`modal-cat-chip px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                        inputCategory === cat
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                      type="button"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Time Window: 2x2 Grid */}
              <div className="flex flex-col space-y-2 bg-surface-container-low/90 p-3 rounded-xl border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>{' '}
                    Schedule Window
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium">Neural Slot</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col space-y-0.5">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold">Start Date</label>
                    <input
                      value={inputStartDate}
                      onChange={(e) => setInputStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-medium border border-outline-variant/40 focus:outline-none"
                      id="inputStartDate"
                      type="date"
                    />
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold">Start Time</label>
                    <input
                      value={inputStartTime}
                      onChange={(e) => setInputStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-medium border border-outline-variant/40 focus:outline-none"
                      id="inputStartTime"
                      type="time"
                    />
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold">End Date</label>
                    <input
                      value={inputEndDate}
                      onChange={(e) => setInputEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-medium border border-outline-variant/40 focus:outline-none"
                      id="inputEndDate"
                      type="date"
                    />
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold">End Time</label>
                    <input
                      value={inputEndTime}
                      onChange={(e) => setInputEndTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-medium border border-outline-variant/40 focus:outline-none"
                      id="inputEndTime"
                      type="time"
                    />
                  </div>
                </div>

                {/* Quick Duration Preset Chips */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto mobile-scroll">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase shrink-0">Duration:</span>
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        if (inputStartTime) {
                          setInputEndTime(calculateEndTime(inputStartTime, mins));
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-surface-container-high hover:bg-primary-fixed hover:text-primary text-[10px] font-semibold text-on-surface cursor-pointer border-none transition-colors shrink-0"
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeat Schedule Selection */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Repeat Schedule
                </label>
                <select
                  value={inputSchedule}
                  onChange={(e) => setInputSchedule(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-xs font-semibold border border-outline-variant/30 focus:border-primary focus:outline-none cursor-pointer"
                  id="inputSchedule"
                >
                  <option value="Single Event / No Repeat">Single Event (No Repeat)</option>
                  <option value="Daily Routine">Daily Routine (Every Day)</option>
                  <option value="Weekly Repeat">Weekly Repeat (Every Week)</option>
                  <option value="Monthly Repeat">Monthly Repeat</option>
                  <option value="Custom Time Window">Custom Time Window</option>
                </select>
              </div>

              {/* Reward & Priority */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Priority</label>
                  <select
                    value={inputPriority}
                    onChange={(e) => setInputPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-xs font-semibold border border-outline-variant/30 focus:outline-none cursor-pointer"
                    id="inputPriority"
                  >
                    <option value="High">High (Urgent)</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Energy Yield
                  </label>
                  <div className="h-10 flex items-center justify-between px-3 rounded-xl bg-surface-container-low text-primary text-xs font-bold border border-outline-variant/30">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">bolt</span> +35 HP
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">Calibrated</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2.5 pt-2.5 border-t border-outline-variant/20">
                <button
                  onClick={closeAddTaskModal}
                  className="w-1/3 h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold transition-all active:scale-95 cursor-pointer border-none"
                  id="cancelAddTaskBtn"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="w-2/3 h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border-none"
                  type="submit"
                >
                  <span className="material-symbols-outlined text-[17px]">add_task</span>
                  <span>Create Mission (+35 HP)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CENTERED TASK DETAIL POPUP MODAL (Medium Proportions) */}
      {isDetailModalOpen && selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-sm animate-fade-in"
          id="detailModal"
          onClick={closeDetailModal}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-2xl border border-outline-variant/30 flex flex-col space-y-3.5 max-h-[90vh] overflow-y-auto transform animate-scale-up"
            id="detailModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shadow-xs shrink-0"
                  id="detailCategoryIcon"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {getCategoryIcon(selectedTask.category)}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-lg ${getCategoryColor(
                        selectedTask.category
                      )} text-[11px] font-bold`}
                      id="detailCategoryTag"
                    >
                      {selectedTask.category}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-lg bg-surface-container-high text-primary text-[11px] font-bold"
                      id="detailHpBadge"
                    >
                      +{selectedTask.hp} HP
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold"
                      id="detailPriorityBadge"
                    >
                      {selectedTask.priority}
                    </span>
                  </div>
                  <h3
                    className="text-base sm:text-lg text-on-surface font-extrabold leading-tight truncate"
                    id="detailTitle"
                  >
                    {selectedTask.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {/* 3-Dot Setting Menu (Custom Tasks Only) */}
                {selectedTask.id.startsWith('custom-') && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDetailMenuOpen(!isDetailMenuOpen);
                      }}
                      className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-90 cursor-pointer border-none"
                      id="detailMenuBtn"
                      type="button"
                      title="Task Options"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                    {isDetailMenuOpen && (
                      <div
                        className="absolute right-0 top-10 z-50 w-44 rounded-2xl bg-surface-container-high p-1.5 shadow-xl border border-outline-variant/30 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            setIsDetailMenuOpen(false);
                            handleQuickDelete(selectedTask.id, e);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-error hover:bg-error-container/30 transition-all cursor-pointer border-none text-left"
                          id="detailDeleteTaskBtn"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Delete Task</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={closeDetailModal}
                  className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-90 cursor-pointer border-none"
                  id="closeDetailModalBtn"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Detail Body Content */}
            <div className="space-y-3 text-xs">
              {/* Schedule and Routine Card */}
              <div className="p-3.5 rounded-xl bg-surface-container-low/90 border border-outline-variant/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface font-bold uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">event</span>{' '}
                    Schedule Window
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      selectedTask.status === 'completed'
                        ? 'bg-primary-fixed text-primary'
                        : selectedTask.status === 'overdue'
                        ? 'bg-error-container text-error'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                    id="detailStatusBadge"
                  >
                    {selectedTask.status === 'completed'
                      ? 'Completed'
                      : selectedTask.status === 'overdue'
                      ? 'Overdue'
                      : 'Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
                  <div>
                    <span className="text-[11px] text-on-surface-variant block font-medium">Start Time</span>
                    <span className="text-xs text-on-surface font-bold mt-0.5 block" id="detailStartTime">
                      {formatTaskDateDisplay(selectedTask.startDate, selectedTask.startTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-on-surface-variant block font-medium">End Time</span>
                    <span className="text-xs text-on-surface font-bold mt-0.5 block" id="detailEndTime">
                      {formatTaskDateDisplay(selectedTask.endDate || selectedTask.startDate, selectedTask.endTime)}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-medium">Repeat Schedule:</span>
                  <span className="text-xs text-primary font-bold" id="detailSchedule">
                    {selectedTask.schedule || 'Daily Routine'}
                  </span>
                </div>
              </div>

              {/* Notes / Full Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                  Description &amp; Protocol Notes
                </span>
                <div
                  className="p-3 rounded-xl bg-surface-container-low text-on-surface text-xs leading-relaxed border border-outline-variant/30 whitespace-pre-wrap"
                  id="detailDescription"
                >
                  {selectedTask.description || 'Warmup, deadlifts 4x6 @ RPE 8, and active recovery.'}
                </div>
              </div>

              {/* Timestamps metadata */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/30">
                <div>
                  <span className="block text-outline font-medium">Created:</span>
                  <span className="font-bold text-on-surface mt-0.5 block" id="detailCreatedAt">
                    {selectedTask.createdAt || 'May 24, 2024 at 07:00 AM'}
                  </span>
                </div>
                <div>
                  <span className="block text-outline font-medium">Completed:</span>
                  <span className={`font-bold mt-0.5 block ${selectedTask.status === 'completed' ? 'text-primary' : 'text-on-surface'}`} id="detailCompletedAt">
                    {selectedTask.status === 'completed'
                      ? formatExactCompletionTime(selectedTask)
                      : 'Not yet completed'}
                  </span>
                </div>
              </div>

              {/* Completed Task Highlight Banner with Exact Completion Time */}
              {selectedTask.status === 'completed' && (
                <div className="p-3 rounded-xl text-xs flex items-center justify-between border bg-primary-fixed/20 text-primary border-primary/20 animate-fade-in" id="detailCompletedBanner">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    <div>
                      <span className="font-bold text-on-surface block">Mission Accomplished</span>
                      <span className="text-[11px] text-primary font-semibold">
                        {formatExactCompletionTime(selectedTask)}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-xs font-bold shrink-0">
                    +{selectedTask.hp || 20} HP
                  </span>
                </div>
              )}

              {/* Scheduled Time Window & Active Status */}
              {(() => {
                const rawTw = checkTaskTimeWindow(selectedTask.startTime, selectedTask.endTime);
                const isTaskActive = isSelectedToday && selectedTask.status === 'pending' && rawTw.isWithinWindow;

                return (
                  <>
                    {/* Extra Time controls - ONLY displayed for active tasks */}
                    {isTaskActive && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
                        <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">more_time</span>
                          Add Extra Time:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[15, 30, 60].map((mins) => (
                            <button
                              key={mins}
                              onClick={(e) => handleAddExtraTime(selectedTask.id, mins, e)}
                              className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface text-xs font-bold transition-all active:scale-95 cursor-pointer border border-outline-variant/30"
                              type="button"
                            >
                              +{mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scheduled Time Window Status Banner for non-completed tasks */}
                    {selectedTask.status !== 'completed' && (
                      isFutureDate ? (
                        <div className="p-2.5 rounded-xl text-xs flex items-center gap-2 border bg-surface-container-high text-on-surface-variant border-outline-variant/30">
                          <span className="material-symbols-outlined text-[17px] text-primary shrink-0">
                            schedule
                          </span>
                          <span className="font-medium">
                            Scheduled for {selectedDateItem.dayName} ({selectedDateStr}) • {rawTw.formattedRange}. Unlocks during scheduled time on that day.
                          </span>
                        </div>
                      ) : isPastDate ? (
                        <div className="p-2.5 rounded-xl text-xs flex items-center gap-2 border bg-error-container/20 text-error border-error/30">
                          <span className="material-symbols-outlined text-[17px] shrink-0">
                            history
                          </span>
                          <span className="font-medium">
                            Past Date ({selectedDateStr}) • Scheduled window closed ({rawTw.formattedRange}).
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                            rawTw.isWithinWindow
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : rawTw.isUpcoming
                              ? 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
                              : 'bg-error-container/30 text-error border-error/30'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[17px] shrink-0">
                            {rawTw.isWithinWindow ? 'schedule' : rawTw.isUpcoming ? 'lock_clock' : 'history'}
                          </span>
                          <span className="font-medium">
                            {rawTw.isWithinWindow
                              ? `Active Now: You can complete this task now (${rawTw.formattedRange}).`
                              : rawTw.isUpcoming
                              ? `Scheduled for ${rawTw.formattedRange}. Unlocks during scheduled time.`
                              : `Scheduled window ended (${rawTw.formattedRange}).`}
                          </span>
                        </div>
                      )
                    )}
                  </>
                );
              })()}
            </div>

            {/* Detail Modal Actions */}
            <div className="flex items-center gap-2.5 pt-2.5 border-t border-outline-variant/20 relative">
              <button
                onClick={() => toggleTaskCompletion(selectedTask.id)}
                className={`flex-1 h-11 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border-none ${
                  selectedTask.status === 'completed'
                    ? 'bg-surface-container-high hover:bg-surface-container text-on-surface'
                    : isSelectedToday && checkTaskTimeWindow(selectedTask.startTime, selectedTask.endTime).isWithinWindow
                    ? 'bg-primary hover:bg-primary-container text-on-primary'
                    : 'bg-surface-container-high hover:bg-surface-container text-on-surface-variant'
                }`}
                id="toggleTaskStatusBtn"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">
                  {selectedTask.status === 'completed'
                    ? 'check_circle'
                    : isSelectedToday && checkTaskTimeWindow(selectedTask.startTime, selectedTask.endTime).isWithinWindow
                    ? 'check_circle'
                    : isFutureDate
                    ? 'lock_clock'
                    : isPastDate
                    ? 'history'
                    : 'lock_clock'}
                </span>
                <span>
                  {selectedTask.status === 'completed'
                    ? 'Mark Incomplete'
                    : isSelectedToday && checkTaskTimeWindow(selectedTask.startTime, selectedTask.endTime).isWithinWindow
                    ? 'Mark Complete'
                    : isFutureDate
                    ? `Scheduled (${selectedDateItem.dayName})`
                    : isPastDate
                    ? 'Closed (Past Date)'
                    : checkTaskTimeWindow(selectedTask.startTime, selectedTask.endTime).isUpcoming
                    ? 'Mark Complete (Locked)'
                    : 'Mark Complete (Closed)'}
                </span>
              </button>

              {/* Reschedule Button with 3 Options - ONLY for ACTIVE custom tasks */}
              {isSelectedToday &&
                selectedTask.status === 'pending' &&
                checkTaskTimeWindow(selectedTask.startTime, selectedTask.endTime).isWithinWindow &&
                selectedTask.id.startsWith('custom-') && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailRescheduleOpen(!detailRescheduleOpen);
                    }}
                    className="px-3.5 h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer border-none"
                    id="rescheduleDetailBtn"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px] text-primary">edit_calendar</span>
                    <span>Move</span>
                    <span className="material-symbols-outlined text-[14px]">
                      {detailRescheduleOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {detailRescheduleOpen && (
                    <div
                      className="absolute right-0 bottom-full mb-2 z-50 w-52 rounded-2xl bg-surface-container-high p-1.5 shadow-xl border border-outline-variant/40 space-y-1 animate-fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold text-outline uppercase tracking-wider">
                        Reschedule Mission
                      </div>
                      <button
                        onClick={(e) => handleRescheduleCustomTask(selectedTask.id, 1, 'Next Day', e)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-all cursor-pointer border-none text-left"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px] text-primary">calendar_today</span>
                        <span>Move to Next Day</span>
                      </button>
                      <button
                        onClick={(e) => handleRescheduleCustomTask(selectedTask.id, 2, 'Day After Tomorrow', e)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-all cursor-pointer border-none text-left"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px] text-secondary">fast_forward</span>
                        <span>Day After Tomorrow</span>
                      </button>
                      <button
                        onClick={(e) => handleRescheduleCustomTask(selectedTask.id, 7, 'Next Week', e)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-all cursor-pointer border-none text-left"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px] text-tertiary">date_range</span>
                        <span>Move to Next Week</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={closeDetailModal}
                className="px-3.5 h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold transition-all active:scale-95 cursor-pointer border-none"
                id="closeDetailBottomBtn"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Floating Bottom Navigation Bar */}
      <BottomNavBar
        activeTab="tasks"
        onNavigateTab={onNavigateTab}
        userInitial={userProfile?.name?.[0] || 'A'}
      />
    </div>
  );
};
