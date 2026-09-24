/**
 * KAIROS FOCUS & DEEP WORK DURATION INVARIANT TEST SUITE
 * Validates real focus session calculation, persistence, validation, timeframe aggregation,
 * midnight crossing, duplicate protection, and regression invariants.
 */

const assert = require('assert');

// 1. Pure Focus Session Engine Functions
function calculateSessionDurationMinutes(startTime, endTime, explicitDuration) {
  if (typeof explicitDuration === 'number' && Number.isFinite(explicitDuration) && explicitDuration > 0) {
    return Math.round(explicitDuration);
  }

  if (!startTime || !endTime) {
    return 0;
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startTime.includes('T') && endTime.includes('T')) {
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return 0;
    return Math.round(diffMs / 60000);
  }

  const startParts = startTime.split(':').map((v) => parseInt(v, 10));
  const endParts = endTime.split(':').map((v) => parseInt(v, 10));

  if (
    startParts.length >= 2 &&
    endParts.length >= 2 &&
    !isNaN(startParts[0]) &&
    !isNaN(startParts[1]) &&
    !isNaN(endParts[0]) &&
    !isNaN(endParts[1])
  ) {
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];

    if (endMinutes < startMinutes) {
      return (1440 - startMinutes) + endMinutes;
    } else {
      return endMinutes - startMinutes;
    }
  }

  return 0;
}

function isValidCompletedSession(session) {
  if (!session || typeof session !== 'object') return false;
  if (typeof session.id !== 'string' || !session.id.trim()) return false;
  if (session.completed !== true) return false;
  if (typeof session.durationMinutes !== 'number' || !Number.isFinite(session.durationMinutes) || session.durationMinutes <= 0) {
    return false;
  }
  if (typeof session.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    return false;
  }
  return true;
}

function sanitizeAndDeduplicateSessions(sessions) {
  if (!Array.isArray(sessions)) return [];

  const seenIds = new Set();
  const sanitized = [];

  for (const item of sessions) {
    if (isValidCompletedSession(item)) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        sanitized.push({
          id: item.id.trim(),
          startTime: item.startTime,
          endTime: item.endTime,
          durationMinutes: Math.round(item.durationMinutes),
          completed: true,
          date: item.date,
          title: item.title,
          category: item.category
        });
      }
    }
  }

  return sanitized;
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getFocusMinutesForDate(sessions, dateStr) {
  if (!Array.isArray(sessions) || !dateStr) return 0;
  const clean = sanitizeAndDeduplicateSessions(sessions);
  return clean
    .filter((s) => s.date === dateStr)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

function getFocusTimeframeMetrics(sessions, horizon, referenceDate = new Date()) {
  const clean = sanitizeAndDeduplicateSessions(sessions);
  const todayStr = toISODate(referenceDate);

  let totalMinutes = 0;
  let targetMinutes = 120;

  switch (horizon) {
    case 'week': {
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
      const dayOfWeek = d.getDay();
      const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + distanceToMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

      const mondayStr = toISODate(monday);
      const sundayStr = toISODate(sunday);

      totalMinutes = clean
        .filter((s) => s.date >= mondayStr && s.date <= sundayStr && s.date <= todayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      targetMinutes = 14 * 60;
      break;
    }
    case 'month': {
      const thirtyDaysAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 29);
      const startStr = toISODate(thirtyDaysAgo);

      totalMinutes = clean
        .filter((s) => s.date >= startStr && s.date <= todayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      targetMinutes = 60 * 60;
      break;
    }
    case 'quarter': {
      const ninetyDaysAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 89);
      const startStr = toISODate(ninetyDaysAgo);

      totalMinutes = clean
        .filter((s) => s.date >= startStr && s.date <= todayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      targetMinutes = 180 * 60;
      break;
    }
    case 'year': {
      const yearAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 364);
      const startStr = toISODate(yearAgo);

      totalMinutes = clean
        .filter((s) => s.date >= startStr && s.date <= todayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      targetMinutes = 730 * 60;
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

// ----------------------------------------------------
// TEST RUNNER
// ----------------------------------------------------
console.log('====================================================');
console.log('KAIROS FOCUS & DEEP WORK DURATION TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;

// Test 1 — Single focus session: 25 minutes completed
{
  const duration = calculateSessionDurationMinutes('09:00', '09:25');
  assert.strictEqual(duration, 25, 'Single session 09:00 -> 09:25 should be 25 minutes');
  
  const sessions = [{
    id: 's1',
    startTime: '09:00',
    endTime: '09:25',
    durationMinutes: duration,
    completed: true,
    date: '2026-09-22'
  }];
  const total = getFocusMinutesForDate(sessions, '2026-09-22');
  assert.strictEqual(total, 25, 'Expected 25 minutes');
  console.log('[PASS] Test 1: Single focus session (25m completed -> 25m)');
  passedTests++;
}

// Test 2 — Multiple sessions: 25 + 40 + 15 = 80 minutes
{
  const sessions = [
    { id: 's1', startTime: '09:00', endTime: '09:25', durationMinutes: 25, completed: true, date: '2026-09-22' },
    { id: 's2', startTime: '11:00', endTime: '11:40', durationMinutes: 40, completed: true, date: '2026-09-22' },
    { id: 's3', startTime: '15:00', endTime: '15:15', durationMinutes: 15, completed: true, date: '2026-09-22' }
  ];
  const total = getFocusMinutesForDate(sessions, '2026-09-22');
  assert.strictEqual(total, 80, 'Expected 80 minutes');
  console.log('[PASS] Test 2: Multiple sessions (25 + 40 + 15 -> 80m)');
  passedTests++;
}

// Test 3 — Incomplete session: 40 minute session cancelled/incomplete
{
  const sessions = [
    { id: 's1', startTime: '09:00', endTime: '09:40', durationMinutes: 40, completed: false, date: '2026-09-22' }
  ];
  const total = getFocusMinutesForDate(sessions, '2026-09-22');
  assert.strictEqual(total, 0, 'Incomplete sessions must contribute 0 minutes');
  console.log('[PASS] Test 3: Incomplete session (40m cancelled/incomplete -> 0 counted minutes)');
  passedTests++;
}

// Test 4 — Duplicate session: same session ID processed twice
{
  const sessions = [
    { id: 's_dup', startTime: '09:00', endTime: '09:30', durationMinutes: 30, completed: true, date: '2026-09-22' },
    { id: 's_dup', startTime: '09:00', endTime: '09:30', durationMinutes: 30, completed: true, date: '2026-09-22' }
  ];
  const total = getFocusMinutesForDate(sessions, '2026-09-22');
  assert.strictEqual(total, 30, 'Duplicate session ID must only be counted once');
  console.log('[PASS] Test 4: Duplicate session (same session ID counted only once -> 30m)');
  passedTests++;
}

// Test 5 — Invalid duration: negative, zero, NaN, Infinity, invalid format
{
  assert.strictEqual(calculateSessionDurationMinutes('10:00', '10:00'), 0, '0 min session -> 0');
  assert.strictEqual(calculateSessionDurationMinutes('invalid', 'time'), 0, 'invalid -> 0');
  
  const sessions = [
    { id: 's_neg', startTime: '10:00', endTime: '09:00', durationMinutes: -30, completed: true, date: '2026-09-22' },
    { id: 's_zero', startTime: '10:00', endTime: '10:00', durationMinutes: 0, completed: true, date: '2026-09-22' },
    { id: 's_nan', startTime: '10:00', endTime: '10:30', durationMinutes: NaN, completed: true, date: '2026-09-22' },
    { id: 's_inf', startTime: '10:00', endTime: '10:30', durationMinutes: Infinity, completed: true, date: '2026-09-22' }
  ];
  const total = getFocusMinutesForDate(sessions, '2026-09-22');
  assert.strictEqual(total, 0, 'Invalid durations must be completely ignored');
  console.log('[PASS] Test 5: Invalid duration (negative/zero/NaN/Infinity -> ignored)');
  passedTests++;
}

// Test 6 — Future session: future-dated session excluded from current timeframe
{
  const refDate = new Date('2026-09-22T12:00:00Z');
  const sessions = [
    { id: 's_today', startTime: '09:00', endTime: '10:00', durationMinutes: 60, completed: true, date: '2026-09-22' },
    { id: 's_future', startTime: '09:00', endTime: '10:00', durationMinutes: 60, completed: true, date: '2026-09-25' }
  ];
  // If reference date is 2026-09-22 (Tuesday), future date 2026-09-25 must be excluded from current progress
  const metrics = getFocusTimeframeMetrics(sessions, 'week', refDate);
  assert.strictEqual(metrics.totalMinutes, 60, 'Future session must not be included');
  console.log('[PASS] Test 6: Future session (future-dated session excluded from current timeframe)');
  passedTests++;
}

// Test 7 — Week filtering: sessions inside Monday-Sunday counted, outside excluded
{
  // 2026-09-22 is Tuesday. Current week: Monday 2026-09-21 to Sunday 2026-09-27.
  const refDate = new Date('2026-09-22T12:00:00Z');
  const sessions = [
    { id: 's_prev_wk', startTime: '10:00', endTime: '11:00', durationMinutes: 60, completed: true, date: '2026-09-20' }, // Sun of prev week
    { id: 's_mon', startTime: '10:00', endTime: '11:00', durationMinutes: 60, completed: true, date: '2026-09-21' },     // Mon of curr week
    { id: 's_tue', startTime: '10:00', endTime: '11:30', durationMinutes: 90, completed: true, date: '2026-09-22' }      // Tue of curr week
  ];
  const metrics = getFocusTimeframeMetrics(sessions, 'week', refDate);
  assert.strictEqual(metrics.totalMinutes, 150, 'Current week sum should be 60 + 90 = 150 minutes (2.5h)');
  assert.strictEqual(metrics.deepWorkHours, '2.5', 'Expected 2.5 Hrs');
  console.log('[PASS] Test 7: Week filtering (Mon-Sun window aggregation exact)');
  passedTests++;
}

// Test 8 — Month filtering: verify only sessions in 30-day window are counted
{
  const refDate = new Date('2026-09-22T12:00:00Z');
  const sessions = [
    { id: 's_old', startTime: '10:00', endTime: '11:00', durationMinutes: 60, completed: true, date: '2026-08-20' }, // > 30 days ago
    { id: 's_in_month', startTime: '10:00', endTime: '12:00', durationMinutes: 120, completed: true, date: '2026-09-01' },
    { id: 's_today', startTime: '14:00', endTime: '15:00', durationMinutes: 60, completed: true, date: '2026-09-22' }
  ];
  const metrics = getFocusTimeframeMetrics(sessions, 'month', refDate);
  assert.strictEqual(metrics.totalMinutes, 180, 'Month sum should be 120 + 60 = 180 minutes (3.0h)');
  assert.strictEqual(metrics.deepWorkHours, '3.0', 'Expected 3.0 Hrs');
  console.log('[PASS] Test 8: Month filtering (30-day window aggregation exact)');
  passedTests++;
}

// Test 9 — Quarter filtering: verify 90-day window aggregation
{
  const refDate = new Date('2026-09-22T12:00:00Z');
  const sessions = [
    { id: 's_old', startTime: '10:00', endTime: '11:00', durationMinutes: 60, completed: true, date: '2026-05-01' }, // > 90 days ago
    { id: 's_q1', startTime: '10:00', endTime: '12:00', durationMinutes: 120, completed: true, date: '2026-07-01' },
    { id: 's_q2', startTime: '14:00', endTime: '16:00', durationMinutes: 120, completed: true, date: '2026-09-15' }
  ];
  const metrics = getFocusTimeframeMetrics(sessions, 'quarter', refDate);
  assert.strictEqual(metrics.totalMinutes, 240, 'Quarter sum should be 120 + 120 = 240 minutes (4.0h)');
  assert.strictEqual(metrics.deepWorkHours, '4.0', 'Expected 4.0 Hrs');
  console.log('[PASS] Test 9: Quarter filtering (90-day window aggregation exact)');
  passedTests++;
}

// Test 10 — Year filtering: verify 365-day window aggregation
{
  const refDate = new Date('2026-09-22T12:00:00Z');
  const sessions = [
    { id: 's_2yr_ago', startTime: '10:00', endTime: '11:00', durationMinutes: 60, completed: true, date: '2024-09-01' },
    { id: 's_yr1', startTime: '10:00', endTime: '12:00', durationMinutes: 120, completed: true, date: '2026-01-15' },
    { id: 's_yr2', startTime: '14:00', endTime: '17:00', durationMinutes: 180, completed: true, date: '2026-06-15' }
  ];
  const metrics = getFocusTimeframeMetrics(sessions, 'year', refDate);
  assert.strictEqual(metrics.totalMinutes, 300, 'Year sum should be 120 + 180 = 300 minutes (5.0h)');
  assert.strictEqual(metrics.deepWorkHours, '5.0', 'Expected 5.0 Hrs');
  console.log('[PASS] Test 10: Year filtering (365-day window aggregation exact)');
  passedTests++;
}

// Test 11 — Midnight crossing: 23:50 -> 00:20 produces 30 minutes without negative duration
{
  const duration = calculateSessionDurationMinutes('23:50', '00:20');
  assert.strictEqual(duration, 30, '23:50 -> 00:20 must equal exactly 30 minutes');
  
  // ISO timestamps across midnight
  const isoDuration = calculateSessionDurationMinutes('2026-09-22T23:50:00.000Z', '2026-09-23T00:20:00.000Z');
  assert.strictEqual(isoDuration, 30, 'ISO midnight crossing must equal exactly 30 minutes');
  console.log('[PASS] Test 11: Midnight crossing (23:50 -> 00:20 = 30m without negative duration)');
  passedTests++;
}

// Test 12 — Zero focus sessions: Expected 0.0 Hrs (NOT fabricated 14h / 580h)
{
  const refDate = new Date('2026-09-22T12:00:00Z');
  const emptySessions = [];
  
  const weekMetrics = getFocusTimeframeMetrics(emptySessions, 'week', refDate);
  const monthMetrics = getFocusTimeframeMetrics(emptySessions, 'month', refDate);
  const quarterMetrics = getFocusTimeframeMetrics(emptySessions, 'quarter', refDate);
  const yearMetrics = getFocusTimeframeMetrics(emptySessions, 'year', refDate);

  assert.strictEqual(weekMetrics.deepWorkHours, '0.0', 'Week with 0 sessions must be 0.0');
  assert.strictEqual(monthMetrics.deepWorkHours, '0.0', 'Month with 0 sessions must be 0.0 (not 580.0)');
  assert.strictEqual(quarterMetrics.deepWorkHours, '0.0', 'Quarter with 0 sessions must be 0.0 (not 1740.0)');
  assert.strictEqual(yearMetrics.deepWorkHours, '0.0', 'Year with 0 sessions must be 0.0 (not 6950.0)');

  assert.strictEqual(weekMetrics.deepWorkBarPct, 0, '0 sessions must yield 0% bar progress');
  assert.strictEqual(monthMetrics.deepWorkBarPct, 0, '0 sessions must yield 0% bar progress');

  console.log('[PASS] Test 12: Zero focus sessions (accurately returns 0.0 Hrs, no fabricated baseline)');
  passedTests++;
}

// Test 13 — Non-extrapolation invariant (No multiplication factors: *4.2, *12.5, *52)
{
  const refDate = new Date('2026-09-22T12:00:00Z');
  // 1 session on Tuesday (100 min)
  const sessions = [
    { id: 's1', startTime: '10:00', endTime: '11:40', durationMinutes: 100, completed: true, date: '2026-09-22' }
  ];
  const weekM = getFocusTimeframeMetrics(sessions, 'week', refDate);
  const monthM = getFocusTimeframeMetrics(sessions, 'month', refDate);
  const quarterM = getFocusTimeframeMetrics(sessions, 'quarter', refDate);
  const yearM = getFocusTimeframeMetrics(sessions, 'year', refDate);

  assert.strictEqual(weekM.totalMinutes, 100, 'Week minutes = 100');
  assert.strictEqual(monthM.totalMinutes, 100, 'Month minutes must NOT be 100 * 4.2');
  assert.strictEqual(quarterM.totalMinutes, 100, 'Quarter minutes must NOT be 100 * 12.5');
  assert.strictEqual(yearM.totalMinutes, 100, 'Year minutes must NOT be 100 * 52');

  console.log('[PASS] Test 13: Non-extrapolation invariant (actual sums used across all horizons)');
  passedTests++;
}

// Test 14 — End-to-End Integration: User starts Focus Shield -> completes -> FocusSession created
{
  // Simulated storage
  const mockLocalStorage = {};
  const STORAGE_KEY = 'KAIROS_FOCUS_SESSIONS_V1';

  function mockSave(sessions) {
    mockLocalStorage[STORAGE_KEY] = JSON.stringify(sanitizeAndDeduplicateSessions(sessions));
  }

  function mockLoad() {
    const raw = mockLocalStorage[STORAGE_KEY];
    return raw ? JSON.parse(raw) : [];
  }

  function mockRecordFocusSession(input) {
    const durationMinutes = calculateSessionDurationMinutes(input.startTime, input.endTime, input.durationMinutes);
    if (durationMinutes <= 0 || input.completed === false) return null;
    const session = {
      id: input.id || `focus_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes,
      completed: true,
      date: input.date || '2026-09-22',
      title: input.title || 'Deep Work Focus Shield',
      category: input.category || 'Deep Work'
    };
    const existing = mockLoad();
    const updated = [...existing.filter(s => s.id !== session.id), session];
    mockSave(updated);
    return session;
  }

  // 1. User starts 45m Focus Shield session at 09:00, timer completes at 09:45
  const session = mockRecordFocusSession({
    id: 'focus_shield_001',
    startTime: '2026-09-22T09:00:00.000Z',
    endTime: '2026-09-22T09:45:00.000Z',
    durationMinutes: 45,
    completed: true,
    date: '2026-09-22',
    title: 'Deep Work Focus Shield',
    category: 'Deep Work'
  });

  // Verify record properties
  assert.ok(session, 'Session record must be created');
  assert.strictEqual(session.completed, true, 'completed must be true');
  assert.strictEqual(session.startTime, '2026-09-22T09:00:00.000Z', 'valid startTime');
  assert.strictEqual(session.endTime, '2026-09-22T09:45:00.000Z', 'valid endTime');
  assert.strictEqual(session.durationMinutes, 45, 'correct durationMinutes 45');
  assert.strictEqual(session.date, '2026-09-22', 'correct local date');
  assert.strictEqual(session.id, 'focus_shield_001', 'unique id');

  // Verify persisted in storage
  const persisted = mockLoad();
  assert.strictEqual(persisted.length, 1, 'Storage must contain 1 session');
  assert.strictEqual(persisted[0].id, 'focus_shield_001');

  // Verify Statistics reflects recorded duration
  const refDate = new Date('2026-09-22T12:00:00Z');
  const statsMetrics = getFocusTimeframeMetrics(persisted, 'week', refDate);
  assert.strictEqual(statsMetrics.totalMinutes, 45, 'Statistics must reflect 45 minutes');
  assert.strictEqual(statsMetrics.deepWorkHours, '0.8', '45m = 0.75h -> rounded to 0.8h');

  console.log('[PASS] Test 14: End-to-end Focus Shield session flow verified');
  passedTests++;
}

// Test 15 — Storage Persistence & App Refresh: Focus duration survives reload
{
  const mockLocalStorage = {};
  const STORAGE_KEY = 'KAIROS_FOCUS_SESSIONS_V1';

  // Session 1: 45 min, Session 2: 30 min
  const initialSessions = [
    { id: 'sess_1', startTime: '09:00', endTime: '09:45', durationMinutes: 45, completed: true, date: '2026-09-22' },
    { id: 'sess_2', startTime: '14:00', endTime: '14:30', durationMinutes: 30, completed: true, date: '2026-09-22' }
  ];
  mockLocalStorage[STORAGE_KEY] = JSON.stringify(initialSessions);

  // App "reloads" -> fresh parse from storage
  const reloaded = JSON.parse(mockLocalStorage[STORAGE_KEY]);
  const clean = sanitizeAndDeduplicateSessions(reloaded);

  const totalMinutesToday = getFocusMinutesForDate(clean, '2026-09-22');
  assert.strictEqual(totalMinutesToday, 75, 'Duration survives reload (45 + 30 = 75m)');

  const refDate = new Date('2026-09-22T12:00:00Z');
  const metrics = getFocusTimeframeMetrics(clean, 'week', refDate);
  assert.strictEqual(metrics.totalMinutes, 75);
  assert.strictEqual(metrics.deepWorkHours, '1.3', '75m = 1.25h -> rounded to 1.3h');

  console.log('[PASS] Test 15: Duration survives app refresh and reload');
  passedTests++;
}

// Test 16 — Duplicate Recording Protection: Re-triggering same session ID does not inflate
{
  const mockLocalStorage = {};
  const STORAGE_KEY = 'KAIROS_FOCUS_SESSIONS_V1';

  const s1 = { id: 'focus_unique_1', startTime: '10:00', endTime: '10:50', durationMinutes: 50, completed: true, date: '2026-09-22' };

  // First save
  mockLocalStorage[STORAGE_KEY] = JSON.stringify([s1]);

  // Duplicate trigger / save
  const rawList = [s1, s1, { ...s1 }];
  const deduplicated = sanitizeAndDeduplicateSessions(rawList);
  mockLocalStorage[STORAGE_KEY] = JSON.stringify(deduplicated);

  const reloaded = JSON.parse(mockLocalStorage[STORAGE_KEY]);
  assert.strictEqual(reloaded.length, 1, 'Only 1 record exists in storage');
  assert.strictEqual(reloaded[0].durationMinutes, 50, 'Duration remains exactly 50m');

  const refDate = new Date('2026-09-22T12:00:00Z');
  const metrics = getFocusTimeframeMetrics(reloaded, 'week', refDate);
  assert.strictEqual(metrics.totalMinutes, 50, 'Must remain 50 minutes, not 150m');

  console.log('[PASS] Test 16: Duplicate recording protection verified');
  passedTests++;
}

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests}/16 TESTS PASSED`);
console.log('====================================================\n');
