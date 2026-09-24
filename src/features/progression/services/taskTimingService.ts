import { useState, useEffect, useCallback } from 'react';
import { DefaultTask } from '../types/progression.types';
import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON,
  setActiveUserId
} from '../../storage';

export type SchedulePreset = 'balanced' | 'early_bird' | 'night_owl' | 'custom';

export interface RoutineWindows {
  morningStart: string;
  morningEnd: string;
  middayStart: string;
  middayEnd: string;
  eveningStart: string;
  eveningEnd: string;
  nightStart: string;
  nightEnd: string;
}

export interface TaskTimingSettings {
  preset: SchedulePreset;
  defaultTaskDurationMinutes: number;
  defaultTaskStartTime: string;
  routineWindows: RoutineWindows;
  taskOverrides: Record<string, { startTime: string; endTime: string }>;
}

export const STORAGE_KEY_TASK_TIMINGS = 'KAIROS_TASK_TIMING_SETTINGS_V1';
export const STORAGE_KEY_USER_CUSTOM_TASKS = 'KAIROS_USER_CUSTOM_TASKS_V1';
export const EVENT_TASK_TIMINGS_UPDATED = 'kairos_task_timing_updated';
export const EVENT_CUSTOM_TASKS_UPDATED = 'kairos_custom_tasks_updated';
export const EVENT_PROGRESSION_UPDATED = 'kairos_progression_updated';

/**
 * Switches the active user context for custom tasks and task timing settings.
 */
export function switchUserTasks(
  user?: string | { email?: string; id?: string; username?: string; name?: string } | null
): void {
  if (user !== undefined) {
    setActiveUserId(user);
  }
  const tasks = loadUserCustomTasks();
  const settings = loadTaskTimingSettings();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_CUSTOM_TASKS_UPDATED, { detail: tasks }));
    window.dispatchEvent(new CustomEvent(EVENT_TASK_TIMINGS_UPDATED, { detail: settings }));
  }
}

/**
 * Resets in-memory custom tasks without deleting persisted user data.
 */
export function resetUserTasks(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_CUSTOM_TASKS_UPDATED, { detail: [] }));
    window.dispatchEvent(new CustomEvent(EVENT_TASK_TIMINGS_UPDATED, { detail: { ...PRESET_CONFIGS.balanced } }));
  }
}

/**
 * Load user custom tasks from user-scoped storage.
 */
export function loadUserCustomTasks<T = any>(): T[] {
  try {
    const parsed = getUserScopedJSON<any[]>(STORAGE_DOMAINS.CUSTOM_TASKS, []);
    if (Array.isArray(parsed)) {
      return parsed.filter((t) => t && typeof t.id === 'string' && t.id.startsWith('custom-')) as T[];
    }
  } catch {}
  return [];
}

/**
 * Persist user custom tasks to user-scoped storage and dispatch synchronization event across all screens.
 */
export function saveUserCustomTasks<T = any>(tasks: T[]): void {
  try {
    const filtered = Array.isArray(tasks)
      ? tasks.filter((t: any) => t && typeof t.id === 'string' && t.id.startsWith('custom-'))
      : [];
    setUserScopedJSON(STORAGE_DOMAINS.CUSTOM_TASKS, filtered);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_CUSTOM_TASKS_UPDATED, { detail: filtered }));
      window.dispatchEvent(new CustomEvent(EVENT_TASK_TIMINGS_UPDATED));
    }
  } catch {}
}

export const PRESET_CONFIGS: Record<Exclude<SchedulePreset, 'custom'>, TaskTimingSettings> = {
  balanced: {
    preset: 'balanced',
    defaultTaskDurationMinutes: 60,
    defaultTaskStartTime: '14:30',
    routineWindows: {
      morningStart: '06:30',
      morningEnd: '09:30',
      middayStart: '12:00',
      middayEnd: '14:30',
      eveningStart: '18:30',
      eveningEnd: '21:30',
      nightStart: '21:30',
      nightEnd: '23:59'
    },
    taskOverrides: {}
  },
  early_bird: {
    preset: 'early_bird',
    defaultTaskDurationMinutes: 45,
    defaultTaskStartTime: '08:00',
    routineWindows: {
      morningStart: '05:00',
      morningEnd: '08:30',
      middayStart: '11:00',
      middayEnd: '13:30',
      eveningStart: '17:30',
      eveningEnd: '20:30',
      nightStart: '20:30',
      nightEnd: '22:30'
    },
    taskOverrides: {
      task_01: { startTime: '05:00', endTime: '07:30' },
      task_02: { startTime: '06:30', endTime: '09:00' },
      task_03: { startTime: '11:30', endTime: '13:30' },
      task_04: { startTime: '18:00', endTime: '20:30' },
      task_06: { startTime: '05:30', endTime: '08:00' },
      task_07: { startTime: '08:00', endTime: '11:30' }
    }
  },
  night_owl: {
    preset: 'night_owl',
    defaultTaskDurationMinutes: 60,
    defaultTaskStartTime: '15:00',
    routineWindows: {
      morningStart: '08:30',
      morningEnd: '11:30',
      middayStart: '13:30',
      middayEnd: '16:00',
      eveningStart: '20:00',
      eveningEnd: '23:00',
      nightStart: '23:00',
      nightEnd: '02:00'
    },
    taskOverrides: {
      task_01: { startTime: '08:30', endTime: '11:00' },
      task_02: { startTime: '09:30', endTime: '12:00' },
      task_03: { startTime: '13:30', endTime: '16:00' },
      task_04: { startTime: '20:00', endTime: '23:00' },
      task_06: { startTime: '09:00', endTime: '11:30' },
      task_07: { startTime: '14:00', endTime: '17:30' }
    }
  }
};

/**
 * Calculates end time string (HH:MM) given a start time string (HH:MM) and duration in minutes.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime || !startTime.includes(':')) return '15:30';
  const [hStr, mStr] = startTime.split(':');
  let h = parseInt(hStr, 10) || 0;
  let m = parseInt(mStr, 10) || 0;

  const totalMinutes = h * 60 + m + durationMinutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;

  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Formats a 24-hour time string into a 12-hour AM/PM label.
 */
export function formatTimeLabel(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${m} ${ampm}`;
}

export const formatDisplayTime = formatTimeLabel;

/**
 * Format a Date object to local YYYY-MM-DD string.
 */
export const formatDateToISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses YYYY-MM-DD string to local Date object at midnight.
 */
export const parseISODate = (isoStr: string): Date => {
  if (!isoStr) return new Date();
  const parts = isoStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

/**
 * Formats a date & time combination for UI display.
 */
export const formatTaskDateDisplay = (dateStr?: string, timeStr?: string): string => {
  if (!dateStr) return formatDisplayTime(timeStr || '') || '12:00 PM';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return formatDisplayTime(timeStr || '') || '12:00 PM';
  const d = new Date(year, month - 1, day);
  const dayPrefix = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = formatDisplayTime(timeStr || '') || '12:00 PM';
  return `${dayPrefix} • ${timePart}`;
};

export interface TaskScheduleInfo {
  id: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  schedule?: string;
  status?: string;
  completedAt?: string | null;
}

/**
 * Checks if a task is active/scheduled on a specific calendar date.
 */
export const isTaskScheduledForDate = (task: Partial<TaskScheduleInfo>, dateStr: string): boolean => {
  if (!task) return false;
  const schedule = (task.schedule || '').toLowerCase();
  const startDate = task.startDate;
  const endDate = task.endDate || startDate;

  // Single event / No repeat / Specific date range:
  if (!schedule || schedule.includes('single') || schedule.includes('no repeat') || schedule.includes('none')) {
    if (startDate && endDate) {
      return dateStr >= startDate && dateStr <= endDate;
    }
    return (startDate || dateStr) === dateStr;
  }

  // Daily Repeat / Routine / Every Day:
  if (schedule.includes('daily') || schedule.includes('every day') || schedule.includes('routine')) {
    if (startDate && dateStr < startDate) return false;
    if (endDate && endDate !== startDate && dateStr > endDate) return false;
    return true;
  }

  // Weekly Repeat / Every Week:
  if (schedule.includes('weekly') || schedule.includes('every week')) {
    if (startDate && dateStr < startDate) return false;
    if (endDate && endDate !== startDate && dateStr > endDate) return false;
    const taskD = parseISODate(startDate || dateStr);
    const targetD = parseISODate(dateStr);
    return taskD.getDay() === targetD.getDay();
  }

  // Monthly Repeat / Every Month:
  if (schedule.includes('monthly') || schedule.includes('every month')) {
    if (startDate && dateStr < startDate) return false;
    if (endDate && endDate !== startDate && dateStr > endDate) return false;
    const taskD = parseISODate(startDate || dateStr);
    const targetD = parseISODate(dateStr);
    return taskD.getDate() === targetD.getDate();
  }

  return (startDate || dateStr) === dateStr;
};

/**
 * Checks if the current time is within a task's scheduled time window.
 */
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

/**
 * Computes the exact status for any task on a specific viewing date.
 * Strictly maintains:
 * 1. Only marked complete tasks are completed.
 * 2. If the time/deadline has passed without completion, status is 'overdue'.
 * 3. If time is remaining (multi-day or future window), status stays 'pending'.
 */
export const computeTaskStatusForDate = (
  task: Partial<TaskScheduleInfo>,
  viewDateStr: string,
  todayDateStr: string,
  isCompleted: boolean,
  now: Date = new Date()
): 'completed' | 'pending' | 'overdue' => {
  // Rule 1: Only marked complete task should be completed
  if (isCompleted) {
    return 'completed';
  }

  const schedule = (task.schedule || '').toLowerCase();
  const isRepeating =
    schedule.includes('daily') ||
    schedule.includes('every day') ||
    schedule.includes('routine') ||
    schedule.includes('weekly') ||
    schedule.includes('every week') ||
    schedule.includes('monthly') ||
    schedule.includes('every month');

  const startTime = task.startTime || '08:00';
  const endTime = task.endTime || '20:00';

  if (isRepeating) {
    // For repeating routines:
    if (viewDateStr < todayDateStr) {
      // Past day: routine on that day was NOT completed, and that day has passed -> overdue
      return 'overdue';
    } else if (viewDateStr > todayDateStr) {
      // Future day: routine is in the future -> pending
      return 'pending';
    } else {
      // Today: check if today's window is past
      const windowStatus = checkTaskTimeWindow(startTime, endTime, now);
      return windowStatus.isPastWindow ? 'overdue' : 'pending';
    }
  }

  // Rule 2 & 3: For non-repeating / custom / single event / multi-day tasks:
  const taskStartDate = task.startDate || viewDateStr;
  const taskEndDate = task.endDate || taskStartDate;

  // Build the deadline Date object for the task (endDate at endTime)
  const [endH, endM] = (endTime || '23:59').split(':').map((v) => parseInt(v, 10) || 0);
  const deadlineDate = parseISODate(taskEndDate);
  deadlineDate.setHours(endH, endM, 59, 999);

  // If the deadline has passed relative to the current moment, it is overdue
  if (now.getTime() > deadlineDate.getTime()) {
    return 'overdue';
  }

  // If time is still there, keep it pending even if the start day is in the past
  return 'pending';
};


/**
 * Load task timing settings from user-scoped storage or initialize with defaults.
 */
export function loadTaskTimingSettings(): TaskTimingSettings {
  try {
    const parsed = getUserScopedJSON<Partial<TaskTimingSettings> | null>(STORAGE_DOMAINS.TASK_TIMING, null);
    if (!parsed) return { ...PRESET_CONFIGS.balanced };
    return {
      preset: parsed.preset || 'balanced',
      defaultTaskDurationMinutes: parsed.defaultTaskDurationMinutes || 60,
      defaultTaskStartTime: parsed.defaultTaskStartTime || '14:30',
      routineWindows: {
        ...PRESET_CONFIGS.balanced.routineWindows,
        ...(parsed.routineWindows || {})
      },
      taskOverrides: parsed.taskOverrides || {}
    };
  } catch (err) {
    console.warn('Failed to load task timing settings', err);
    return { ...PRESET_CONFIGS.balanced };
  }
}

/**
 * Persist task timing settings to user-scoped storage and dispatch update events.
 */
export function saveTaskTimingSettings(settings: TaskTimingSettings): void {
  try {
    setUserScopedJSON(STORAGE_DOMAINS.TASK_TIMING, settings);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_TASK_TIMINGS_UPDATED, { detail: settings }));
      window.dispatchEvent(new CustomEvent(EVENT_PROGRESSION_UPDATED));
    }
  } catch (err) {
    console.error('Failed to save task timing settings', err);
  }
}

/**
 * Resets task timing settings back to factory standard (Balanced).
 */
export function resetTaskTimingSettings(): TaskTimingSettings {
  const initial = { ...PRESET_CONFIGS.balanced };
  saveTaskTimingSettings(initial);
  return initial;
}

/**
 * Applies active timing overrides to a list of DefaultTask items.
 */
export function applyTaskTimingOverrides(tasks: DefaultTask[]): DefaultTask[] {
  const settings = loadTaskTimingSettings();
  return tasks.map((task) => {
    const override = settings.taskOverrides[task.id];
    if (override) {
      return {
        ...task,
        startTime: override.startTime || task.startTime,
        endTime: override.endTime || task.endTime
      };
    }
    return task;
  });
}

/**
 * Returns default start and end times for new custom tasks.
 */
export function getDefaultTaskCreationTiming(): { startTime: string; endTime: string; durationMinutes: number } {
  const settings = loadTaskTimingSettings();
  const startTime = settings.defaultTaskStartTime || '14:30';
  const durationMinutes = settings.defaultTaskDurationMinutes || 60;
  const endTime = calculateEndTime(startTime, durationMinutes);
  return { startTime, endTime, durationMinutes };
}

/**
 * React Hook to subscribe to real-time task timing settings and mutate them.
 */
export function useTaskTimingSettings() {
  const [settings, setSettings] = useState<TaskTimingSettings>(() => loadTaskTimingSettings());

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(loadTaskTimingSettings());
    };

    window.addEventListener(EVENT_TASK_TIMINGS_UPDATED, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_TASK_TIMINGS_UPDATED, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateSettings = useCallback((newSettings: TaskTimingSettings) => {
    setSettings(newSettings);
    saveTaskTimingSettings(newSettings);
  }, []);

  const applyPreset = useCallback((preset: SchedulePreset) => {
    if (preset === 'custom') {
      const updated: TaskTimingSettings = {
        ...settings,
        preset: 'custom'
      };
      setSettings(updated);
      saveTaskTimingSettings(updated);
      return updated;
    }

    const presetData = PRESET_CONFIGS[preset];
    const updated: TaskTimingSettings = {
      preset,
      defaultTaskDurationMinutes: presetData.defaultTaskDurationMinutes,
      defaultTaskStartTime: presetData.defaultTaskStartTime,
      routineWindows: { ...presetData.routineWindows },
      taskOverrides: { ...presetData.taskOverrides }
    };
    setSettings(updated);
    saveTaskTimingSettings(updated);
    return updated;
  }, [settings]);

  const updateDuration = useCallback((durationMinutes: number) => {
    const updated: TaskTimingSettings = {
      ...settings,
      defaultTaskDurationMinutes: durationMinutes
    };
    setSettings(updated);
    saveTaskTimingSettings(updated);
  }, [settings]);

  const updateDefaultStartTime = useCallback((startTime: string) => {
    const updated: TaskTimingSettings = {
      ...settings,
      defaultTaskStartTime: startTime
    };
    setSettings(updated);
    saveTaskTimingSettings(updated);
  }, [settings]);

  const updateRoutineWindows = useCallback((routineWindows: RoutineWindows) => {
    const updated: TaskTimingSettings = {
      ...settings,
      preset: 'custom',
      routineWindows
    };
    setSettings(updated);
    saveTaskTimingSettings(updated);
  }, [settings]);

  const updateTaskOverride = useCallback((taskId: string, startTime: string, endTime: string) => {
    const updated: TaskTimingSettings = {
      ...settings,
      preset: 'custom',
      taskOverrides: {
        ...settings.taskOverrides,
        [taskId]: { startTime, endTime }
      }
    };
    setSettings(updated);
    saveTaskTimingSettings(updated);
  }, [settings]);

  const removeTaskOverride = useCallback((taskId: string) => {
    const nextOverrides = { ...settings.taskOverrides };
    delete nextOverrides[taskId];
    const updated: TaskTimingSettings = {
      ...settings,
      taskOverrides: nextOverrides
    };
    setSettings(updated);
    saveTaskTimingSettings(updated);
  }, [settings]);

  const resetDefaults = useCallback(() => {
    const restored = resetTaskTimingSettings();
    setSettings(restored);
  }, []);

  return {
    settings,
    updateSettings,
    applyPreset,
    updateDuration,
    updateDefaultStartTime,
    updateRoutineWindows,
    updateTaskOverride,
    removeTaskOverride,
    resetDefaults
  };
}
