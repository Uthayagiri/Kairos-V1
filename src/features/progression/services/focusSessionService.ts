import { useState, useEffect, useCallback } from 'react';
import { squadService } from '../../squad';
import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON,
  setActiveUserId
} from '../../storage';
import { syncQueue, syncSerializer } from '../../sync';

export interface FocusSession {
  id: string;
  startTime: string; // ISO 8601 string or HH:mm time string
  endTime: string;   // ISO 8601 string or HH:mm time string
  durationMinutes: number;
  completed: boolean;
  date: string; // Local YYYY-MM-DD
  title?: string;
  category?: string;
}

export const STORAGE_KEY_FOCUS_SESSIONS = 'KAIROS_FOCUS_SESSIONS_V1';
export const EVENT_FOCUS_SESSIONS_UPDATED = 'kairos_focus_sessions_updated';

/**
 * Switches the active user context for focus sessions and notifies listeners.
 */
export function switchUserFocusSessions(
  user?: string | { email?: string; id?: string; username?: string; name?: string } | null
): FocusSession[] {
  if (user !== undefined) {
    setActiveUserId(user);
  }
  const sessions = loadFocusSessions();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENT_FOCUS_SESSIONS_UPDATED, {
        detail: sessions
      })
    );
  }
  return sessions;
}

/**
 * Resets in-memory focus sessions without deleting persisted user data.
 */
export function resetFocusSessions(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENT_FOCUS_SESSIONS_UPDATED, {
        detail: []
      })
    );
  }
}

/**
 * Calculates duration in minutes between startTime and endTime.
 * Robustly handles:
 * 1. ISO 8601 date-time strings
 * 2. HH:mm 24-hour time strings
 * 3. Cross-midnight sessions (e.g. 23:50 -> 00:20 produces 30 minutes, never negative)
 * 4. Explicit duration overrides
 */
export function calculateSessionDurationMinutes(
  startTimeStr?: string,
  endTimeStr?: string,
  explicitDurationMinutes?: number
): number {
  if (typeof explicitDurationMinutes === 'number' && !isNaN(explicitDurationMinutes) && explicitDurationMinutes > 0) {
    return Math.round(explicitDurationMinutes);
  }

  if (!startTimeStr || !endTimeStr) return 0;

  try {
    // 1. Try parsing as full Date ISO strings
    const startD = new Date(startTimeStr);
    const endD = new Date(endTimeStr);

    if (!isNaN(startD.getTime()) && !isNaN(endD.getTime()) && startTimeStr.includes('T')) {
      const diffMs = endD.getTime() - startD.getTime();
      return Math.max(0, Math.round(diffMs / (1000 * 60)));
    }

    // 2. Try parsing as HH:mm 24-hour format
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    if (!isNaN(startH) && !isNaN(startM) && !isNaN(endH) && !isNaN(endM)) {
      let startTotal = startH * 60 + startM;
      let endTotal = endH * 60 + endM;

      // Handle midnight boundary crossing (e.g. 23:50 to 00:20)
      if (endTotal < startTotal) {
        endTotal += 24 * 60;
      }

      return Math.max(0, endTotal - startTotal);
    }
  } catch {}

  return 0;
}

/**
 * Sanitizes and deduplicates a session list:
 * - Filters out invalid / NaN durations or non-completed sessions
 * - Deduplicates by session ID (latest record wins)
 */
export function sanitizeAndDeduplicateSessions(sessions: FocusSession[]): FocusSession[] {
  if (!Array.isArray(sessions)) return [];

  const map = new Map<string, FocusSession>();
  for (const s of sessions) {
    if (!s || typeof s !== 'object') continue;
    if (!s.id || typeof s.id !== 'string') continue;
    if (s.completed === false) continue; // Skip incomplete or cancelled sessions
    if (typeof s.durationMinutes !== 'number' || isNaN(s.durationMinutes) || s.durationMinutes <= 0) continue;
    if (!s.date || typeof s.date !== 'string') continue;

    map.set(s.id, s);
  }

  return Array.from(map.values());
}

/**
 * Loads and sanitizes all recorded FocusSessions from user-scoped storage.
 */
export function loadFocusSessions(): FocusSession[] {
  try {
    const raw = getUserScopedJSON<FocusSession[]>(STORAGE_DOMAINS.FOCUS_SESSIONS, []);
    if (!Array.isArray(raw)) return [];
    return sanitizeAndDeduplicateSessions(raw);
  } catch {
    return [];
  }
}

/**
 * Persists FocusSessions to user-scoped storage and emits an update event.
 */
export function saveFocusSessions(sessions: FocusSession[]): void {
  try {
    const sanitized = sanitizeAndDeduplicateSessions(sessions);
    setUserScopedJSON(STORAGE_DOMAINS.FOCUS_SESSIONS, sanitized);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(EVENT_FOCUS_SESSIONS_UPDATED, {
          detail: sanitized
        })
      );
    }
  } catch {}
}

/**
 * Records a new completed focus session.
 * Prevents duplicate session IDs and computes/validates duration.
 */
export function recordFocusSession(
  input: {
    id?: string;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
    completed?: boolean;
    date?: string;
    title?: string;
    category?: string;
  }
): FocusSession | null {
  const isCompleted = input.completed !== false;
  if (!isCompleted) return null;

  const durationMinutes = calculateSessionDurationMinutes(
    input.startTime,
    input.endTime,
    input.durationMinutes
  );

  if (durationMinutes <= 0) return null;

  const now = new Date();
  const date = input.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const id = input.id || `focus_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const session: FocusSession = {
    id,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes,
    completed: true,
    date,
    title: input.title || 'Focus Session',
    category: input.category || 'Deep Work'
  };

  const existing = loadFocusSessions();
  const filtered = existing.filter((s) => s.id !== id);
  filtered.push(session);
  saveFocusSessions(filtered);

  // Record eligible Squad challenge contribution independently (0 additional XP/HP)
  try {
    if (squadService && typeof squadService.recordTaskContribution === 'function') {
      squadService.recordTaskContribution({
        id: session.id,
        title: session.title || 'Focus Session',
        category: session.category || 'Deep Work',
        startTime: session.startTime,
        endTime: session.endTime,
        durationMinutes: session.durationMinutes,
        date: session.date
      });
    }
  } catch {}

  // Enqueue offline sync mutation
  try {
    const startedAt = session.startTime.includes('T') ? session.startTime : new Date(`${session.date}T${session.startTime}:00`).toISOString();
    const completedAt = session.endTime.includes('T') ? session.endTime : new Date(`${session.date}T${session.endTime}:00`).toISOString();
    syncQueue.enqueue(
      'FOCUS_SESSION_RECORDED',
      syncSerializer.focusSessionRecorded({
        sessionId: session.id,
        title: session.title || 'Focus Session',
        durationSeconds: session.durationMinutes * 60,
        targetDurationMinutes: session.durationMinutes,
        startedAt,
        completedAt,
        category: session.category
      })
    );
  } catch (err) {
    // Non-blocking offline queue
  }

  return session;
}

/**
 * Returns the sum of actual completed focus minutes for a specific calendar date (YYYY-MM-DD).
 */
export function getFocusMinutesForDate(sessions: FocusSession[], dateStr: string): number {
  if (!Array.isArray(sessions) || !dateStr) return 0;
  const clean = sanitizeAndDeduplicateSessions(sessions);
  return clean
    .filter((s) => s.date === dateStr)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

/**
 * Aggregates focus minutes across a specific date range [startDateStr, endDateStr].
 */
export function getFocusMinutesInRange(
  sessions: FocusSession[],
  startDateStr: string,
  endDateStr: string
): number {
  if (!Array.isArray(sessions) || !startDateStr || !endDateStr) return 0;
  const clean = sanitizeAndDeduplicateSessions(sessions);
  return clean
    .filter((s) => s.date >= startDateStr && s.date <= endDateStr)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates focus statistics for a selected timeframe: 'week' | 'month' | 'quarter' | 'year'.
 * Aggregates actual focus sessions falling strictly within that timeframe window without extrapolation.
 */
export function getFocusTimeframeMetrics(
  sessions: FocusSession[],
  horizon: 'week' | 'month' | 'quarter' | 'year',
  referenceDate: Date = new Date()
): {
  totalMinutes: number;
  totalHours: number;
  deepWorkHours: string;
  deepWorkDelta: string;
  deepWorkBarPct: number;
} {
  const clean = sanitizeAndDeduplicateSessions(sessions);
  const todayStr = toISODate(referenceDate);

  let totalMinutes = 0;
  let targetMinutes = 120; // Default baseline for progress indicator scaling

  switch (horizon) {
    case 'week': {
      // Current Monday–Sunday week (or reference date week)
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
      const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
      // Calculate Monday of the current week (ISO week standard: Monday = 1)
      const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + distanceToMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

      const mondayStr = toISODate(monday);
      const sundayStr = toISODate(sunday);

      totalMinutes = clean
        .filter((s) => s.date >= mondayStr && s.date <= sundayStr && s.date <= todayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      targetMinutes = 14 * 60; // 14 hours / week baseline
      break;
    }
    case 'month': {
      // 30-day window ending today
      const thirtyDaysAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 29);
      const startStr = toISODate(thirtyDaysAgo);

      totalMinutes = clean
        .filter((s) => s.date >= startStr && s.date <= todayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      targetMinutes = 60 * 60; // 60 hours / month baseline
      break;
    }
    case 'quarter': {
      // 90-day window ending today
      const ninetyDaysAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 89);
      const startStr = toISODate(ninetyDaysAgo);

      totalMinutes = clean
        .filter((s) => s.date >= startStr && s.date <= todayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      targetMinutes = 180 * 60; // 180 hours / quarter baseline
      break;
    }
    case 'year': {
      // 365-day window ending today
      const yearAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 364);
      const startStr = toISODate(yearAgo);

      totalMinutes = clean
        .filter((s) => s.date >= startStr && s.date <= todayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      targetMinutes = 730 * 60; // 730 hours / year baseline
      break;
    }
  }

  const totalHours = totalMinutes / 60;
  const deepWorkHours = totalHours >= 1000
    ? totalHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : totalHours.toFixed(1);

  const suffix = horizon === 'week' ? 'wk' : horizon === 'month' ? 'mo' : horizon === 'quarter' ? 'qtr' : 'yr';
  const deepWorkDelta = `+${deepWorkHours}h ${suffix}`;
  const deepWorkBarPct = targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0;

  return {
    totalMinutes,
    totalHours,
    deepWorkHours,
    deepWorkDelta,
    deepWorkBarPct
  };
}

/**
 * React hook to access and synchronize focus sessions across components in real time.
 */
export function useFocusSessions() {
  const [sessions, setSessions] = useState<FocusSession[]>(() => loadFocusSessions());

  useEffect(() => {
    const handleUpdate = () => {
      setSessions(loadFocusSessions());
    };

    window.addEventListener(EVENT_FOCUS_SESSIONS_UPDATED, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_FOCUS_SESSIONS_UPDATED, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addSession = useCallback((session: Parameters<typeof recordFocusSession>[0]) => {
    const saved = recordFocusSession(session);
    if (saved) {
      setSessions(loadFocusSessions());
    }
    return saved;
  }, []);

  return {
    sessions,
    recordSession: addSession,
    getFocusMinutesForDate: useCallback((dateStr: string) => getFocusMinutesForDate(sessions, dateStr), [sessions]),
    getFocusMinutesInRange: useCallback(
      (startStr: string, endStr: string) => getFocusMinutesInRange(sessions, startStr, endStr),
      [sessions]
    ),
    getFocusTimeframeMetrics: useCallback(
      (horizon: 'week' | 'month' | 'quarter' | 'year', refDate?: Date) =>
        getFocusTimeframeMetrics(sessions, horizon, refDate),
      [sessions]
    )
  };
}
