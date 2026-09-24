/**
 * TASK STATUS INVARIANT & LIFETIME UNIT TEST SUITE
 * Validates:
 * 1. Only explicitly marked complete tasks are completed.
 * 2. Uncompleted tasks whose time has passed are overdue.
 * 3. Tasks with time remaining (e.g. multi-day or future deadline) stay pending across day rollovers.
 * 4. Date strip completion percentages reflect actual completions.
 */

const assert = require('assert');

// Pure mirror of helper functions for NodeJS execution
function parseISODate(isoStr) {
  if (!isoStr) return new Date();
  const parts = isoStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateToISO(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${m} ${ampm}`;
}

function isTaskScheduledForDate(task, dateStr) {
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

  // Weekly Repeat:
  if (schedule.includes('weekly') || schedule.includes('every week')) {
    if (startDate && dateStr < startDate) return false;
    if (endDate && endDate !== startDate && dateStr > endDate) return false;
    const taskD = parseISODate(startDate || dateStr);
    const targetD = parseISODate(dateStr);
    return taskD.getDay() === targetD.getDay();
  }

  // Monthly Repeat:
  if (schedule.includes('monthly') || schedule.includes('every month')) {
    if (startDate && dateStr < startDate) return false;
    if (endDate && endDate !== startDate && dateStr > endDate) return false;
    const taskD = parseISODate(startDate || dateStr);
    const targetD = parseISODate(dateStr);
    return taskD.getDate() === targetD.getDate();
  }

  return (startDate || dateStr) === dateStr;
}

function checkTaskTimeWindow(startTime, endTime, now = new Date()) {
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
}

function computeTaskStatusForDate(task, viewDateStr, todayDateStr, isCompleted, now = new Date()) {
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
    if (viewDateStr < todayDateStr) {
      return 'overdue';
    } else if (viewDateStr > todayDateStr) {
      return 'pending';
    } else {
      const windowStatus = checkTaskTimeWindow(startTime, endTime, now);
      return windowStatus.isPastWindow ? 'overdue' : 'pending';
    }
  }

  // Non-repeating / custom task
  const taskStartDate = task.startDate || viewDateStr;
  const taskEndDate = task.endDate || taskStartDate;

  const [endH, endM] = (endTime || '23:59').split(':').map((v) => parseInt(v, 10) || 0);
  const deadlineDate = parseISODate(taskEndDate);
  deadlineDate.setHours(endH, endM, 59, 999);

  if (now.getTime() > deadlineDate.getTime()) {
    return 'overdue';
  }

  return 'pending';
}

console.log('====================================================');
console.log('KAIROS TASK STATUS INVARIANT & LIFETIME TEST SUITE');
console.log('====================================================\n');

// Test 1: Explicitly completed task is 'completed'
{
  const task = { id: 'task_01', schedule: 'Weekly Repeat', startTime: '08:00', endTime: '10:00' };
  const status = computeTaskStatusForDate(task, '2026-09-20', '2026-09-21', true);
  assert.strictEqual(status, 'completed', 'Completed task on past date must return completed');
  console.log('[PASS] Test 1: Explicitly completed task returns status "completed"');
}

// Test 2: Uncompleted routine on past date is 'overdue' (NOT automatically completed)
{
  const task = { id: 'task_01', schedule: 'Weekly Repeat', startTime: '08:00', endTime: '10:00' };
  const status = computeTaskStatusForDate(task, '2026-09-20', '2026-09-21', false);
  assert.strictEqual(status, 'overdue', 'Uncompleted routine on past date must return overdue');
  console.log('[PASS] Test 2: Uncompleted routine on past date returns status "overdue"');
}

// Test 3: Uncompleted task today past its end time is 'overdue'
{
  const task = { id: 'custom-1', schedule: 'Single Event', startDate: '2026-09-21', endDate: '2026-09-21', startTime: '08:00', endTime: '10:00' };
  const mockNow = new Date(2026, 8, 21, 14, 0); // 2:00 PM
  const status = computeTaskStatusForDate(task, '2026-09-21', '2026-09-21', false, mockNow);
  assert.strictEqual(status, 'overdue', 'Uncompleted task past deadline must return overdue');
  console.log('[PASS] Test 3: Uncompleted task today past end time returns status "overdue"');
}

// Test 4: Task within active window today is 'pending'
{
  const task = { id: 'custom-2', schedule: 'Single Event', startDate: '2026-09-21', endDate: '2026-09-21', startTime: '14:00', endTime: '16:00' };
  const mockNow = new Date(2026, 8, 21, 14, 30); // 2:30 PM
  const status = computeTaskStatusForDate(task, '2026-09-21', '2026-09-21', false, mockNow);
  assert.strictEqual(status, 'pending', 'Task within active window must return pending');
  console.log('[PASS] Test 4: Task within active window today returns status "pending"');
}

// Test 5: Multi-day task with remaining time stays 'pending' even if start day is in the past
{
  // Task started on 2026-09-20, ends on 2026-09-25 at 18:00
  const task = {
    id: 'custom-multiday',
    schedule: 'Single Event / No Repeat',
    startDate: '2026-09-20',
    endDate: '2026-09-25',
    startTime: '09:00',
    endTime: '18:00'
  };

  const mockNow = new Date(2026, 8, 21, 10, 0); // Today is Sept 21 (start day Sept 20 completed)
  
  // Checking on Sept 20 (start date):
  const statusOnStartDay = computeTaskStatusForDate(task, '2026-09-20', '2026-09-21', false, mockNow);
  assert.strictEqual(statusOnStartDay, 'pending', 'Multi-day task with time remaining must stay pending on start day');

  // Checking on Sept 21 (current day):
  const statusOnToday = computeTaskStatusForDate(task, '2026-09-21', '2026-09-21', false, mockNow);
  assert.strictEqual(statusOnToday, 'pending', 'Multi-day task with time remaining must stay pending today');

  // Checking on Sept 26 (after deadline):
  const mockNowAfter = new Date(2026, 8, 26, 10, 0);
  const statusAfterDeadline = computeTaskStatusForDate(task, '2026-09-25', '2026-09-26', false, mockNowAfter);
  assert.strictEqual(statusAfterDeadline, 'overdue', 'Multi-day task after deadline without completion must become overdue');

  console.log('[PASS] Test 5: Multi-day task stays pending across day rollovers until deadline');
}

// Test 6: Multi-day task scheduling across date ranges
{
  const task = {
    id: 'custom-range',
    startDate: '2026-09-20',
    endDate: '2026-09-23',
    schedule: 'Single Event / No Repeat'
  };

  assert.strictEqual(isTaskScheduledForDate(task, '2026-09-19'), false, 'Should not match before start date');
  assert.strictEqual(isTaskScheduledForDate(task, '2026-09-20'), true, 'Should match on start date');
  assert.strictEqual(isTaskScheduledForDate(task, '2026-09-21'), true, 'Should match on intermediate date');
  assert.strictEqual(isTaskScheduledForDate(task, '2026-09-22'), true, 'Should match on intermediate date');
  assert.strictEqual(isTaskScheduledForDate(task, '2026-09-23'), true, 'Should match on end date');
  assert.strictEqual(isTaskScheduledForDate(task, '2026-09-24'), false, 'Should not match after end date');

  console.log('[PASS] Test 6: Multi-day task is active across its entire date range');
}

// Test 7: Future date routines remain 'pending'
{
  const task = { id: 'task_02', schedule: 'Daily Routine', startTime: '08:00', endTime: '10:00' };
  const status = computeTaskStatusForDate(task, '2026-09-25', '2026-09-21', false);
  assert.strictEqual(status, 'pending', 'Future routine must return pending');
  console.log('[PASS] Test 7: Future date routines remain pending');
}

// Test 8: Past day progress calculation with 0 completions gives 0%
{
  const tasks = [
    { id: 't1', status: 'overdue' },
    { id: 't2', status: 'overdue' }
  ];
  const completed = tasks.filter(t => t.status === 'completed').length;
  const percent = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  assert.strictEqual(percent, 0, 'Past day with no completions must be 0% done');
  console.log('[PASS] Test 8: Past day with no completed tasks yields 0% completion');
}

// Test 9: Extra time additions (+15m, +30m, +60m) correctly extend endTime
{
  function calculateExtraTime(currentEnd, extraMinutes) {
    const [endH, endM] = currentEnd.split(':').map((v) => parseInt(v, 10) || 0);
    const newTotalMins = endH * 60 + endM + extraMinutes;
    const newH = (Math.floor(newTotalMins / 60) % 24).toString().padStart(2, '0');
    const newM = (newTotalMins % 60).toString().padStart(2, '0');
    return `${newH}:${newM}`;
  }

  assert.strictEqual(calculateExtraTime('14:00', 15), '14:15', '+15m from 14:00 should be 14:15');
  assert.strictEqual(calculateExtraTime('14:00', 30), '14:30', '+30m from 14:00 should be 14:30');
  assert.strictEqual(calculateExtraTime('14:00', 60), '15:00', '+60m from 14:00 should be 15:00');
  assert.strictEqual(calculateExtraTime('23:45', 30), '00:15', '+30m across midnight from 23:45 should be 00:15');
  console.log('[PASS] Test 9: Extra time (+15m, +30m, +60m) properly computes extended endTime');
}

// Test 10: Reschedule options (Next Day +1d, Day After Tomorrow +2d, Next Week +7d)
{
  function addDaysToISODate(isoStr, days) {
    const d = parseISODate(isoStr);
    d.setDate(d.getDate() + days);
    return formatDateToISO(d);
  }

  const baseDate = '2026-09-21';
  assert.strictEqual(addDaysToISODate(baseDate, 1), '2026-09-22', 'Move to Next Day (+1d) should be 2026-09-22');
  assert.strictEqual(addDaysToISODate(baseDate, 2), '2026-09-23', 'Day After Tomorrow (+2d) should be 2026-09-23');
  assert.strictEqual(addDaysToISODate(baseDate, 7), '2026-09-28', 'Move to Next Week (+7d) should be 2026-09-28');
  console.log('[PASS] Test 10: Reschedule 3 options (+1d, +2d, +7d) correctly calculate target dates');
}

// Test 11: Reschedule and 3-dot delete are restricted strictly to custom tasks
{
  const customTask = { id: 'custom-12345', title: 'Custom Mission' };
  const routineTask = { id: 'task_01', title: 'System Morning Routine' };

  const isCustom = (t) => typeof t.id === 'string' && t.id.startsWith('custom-');
  assert.strictEqual(isCustom(customTask), true, 'Custom task must qualify for reschedule and 3-dot delete');
  assert.strictEqual(isCustom(routineTask), false, 'Routine task must NOT qualify for reschedule or 3-dot delete');
  console.log('[PASS] Test 11: Reschedule and delete options strictly restricted to custom tasks');
}

// Test 12: Detailed View options: Only ACTIVE tasks have extra time and reschedule options; Overdue & inactive tasks have none
{
  function getDetailedViewActions(task, isSelectedToday, isWithinWindow) {
    const isTaskActive = isSelectedToday && task.status === 'pending' && isWithinWindow;
    const isCustom = typeof task.id === 'string' && task.id.startsWith('custom-');

    const actions = [];
    if (isTaskActive) {
      actions.push('extra_time_15', 'extra_time_30', 'extra_time_60');
      if (isCustom) {
        actions.push('reschedule_next_day', 'reschedule_day_after_tomorrow', 'reschedule_next_week');
      }
    }
    return actions;
  }

  // 1. Overdue task (inactive) -> 0 actions
  const overdueActions = getDetailedViewActions({ id: 'custom-1', status: 'overdue' }, true, false);
  assert.strictEqual(overdueActions.length, 0, 'Overdue tasks must have 0 actions');

  // 2. Completed task (inactive) -> 0 actions
  const completedActions = getDetailedViewActions({ id: 'custom-1', status: 'completed' }, true, true);
  assert.strictEqual(completedActions.length, 0, 'Completed tasks must have 0 actions');

  // 3. Upcoming / Locked task today (inactive) -> 0 actions
  const upcomingActions = getDetailedViewActions({ id: 'custom-1', status: 'pending' }, true, false);
  assert.strictEqual(upcomingActions.length, 0, 'Upcoming/locked tasks must have 0 actions');

  // 4. Future date task (inactive) -> 0 actions
  const futureDateActions = getDetailedViewActions({ id: 'custom-1', status: 'pending' }, false, false);
  assert.strictEqual(futureDateActions.length, 0, 'Future date tasks must have 0 actions');

  // 5. Active custom task -> extra time + 3 reschedule options
  const activeCustomActions = getDetailedViewActions({ id: 'custom-1', status: 'pending' }, true, true);
  assert.ok(activeCustomActions.includes('extra_time_15'), 'Active task has extra time 15m');
  assert.ok(activeCustomActions.includes('extra_time_30'), 'Active task has extra time 30m');
  assert.ok(activeCustomActions.includes('extra_time_60'), 'Active task has extra time 60m');
  assert.ok(activeCustomActions.includes('reschedule_next_day'), 'Active custom task has Next Day');
  assert.ok(activeCustomActions.includes('reschedule_day_after_tomorrow'), 'Active custom task has Day After Tomorrow');
  assert.ok(activeCustomActions.includes('reschedule_next_week'), 'Active custom task has Next Week');

  // 6. Active routine task -> extra time ONLY (no reschedule)
  const activeRoutineActions = getDetailedViewActions({ id: 'task_01', status: 'pending' }, true, true);
  assert.ok(activeRoutineActions.includes('extra_time_15'), 'Active routine task has extra time');
  assert.strictEqual(activeRoutineActions.some(a => a.startsWith('reschedule')), false, 'Routine task has no reschedule');

  console.log('[PASS] Test 12: Options restricted only to detailed view of ACTIVE tasks (pending, today, within window)');
}

// Test 13: Completed tasks format exact completion timestamp properly
{
  function formatExactCompletionTime(task) {
    if (task.completedAt) {
      if (task.completedAt.includes('at ')) {
        return `Completed at ${task.completedAt.split('at ')[1]}`;
      }
      return `Completed: ${task.completedAt}`;
    }
    return 'Completed';
  }

  const completedToday = { id: 'custom-1', completedAt: 'Today at 02:45 PM' };
  assert.strictEqual(formatExactCompletionTime(completedToday), 'Completed at 02:45 PM');

  const completedExact = { id: 'task_01', completedAt: '2026-09-21 at 10:15 AM' };
  assert.strictEqual(formatExactCompletionTime(completedExact), 'Completed at 10:15 AM');

  console.log('[PASS] Test 13: Completed tasks display exact completion time correctly');
}

// Test 14: Adding extra time extends task window, remaining seconds, and prevents premature overdue status
{
  function addExtraTime(task, extraMinutes, now) {
    const currentEnd = task.endTime || '18:00';
    const [endH, endM] = currentEnd.split(':').map((v) => parseInt(v, 10) || 0);

    const currentTotalMins = now.getHours() * 60 + now.getMinutes();
    const taskEndTotalMins = endH * 60 + endM;
    const baseMins = currentTotalMins > taskEndTotalMins ? currentTotalMins : taskEndTotalMins;

    const newTotalMins = baseMins + extraMinutes;
    const newH = (Math.floor(newTotalMins / 60) % 24).toString().padStart(2, '0');
    const newM = (newTotalMins % 60).toString().padStart(2, '0');
    return `${newH}:${newM}`;
  }

  const nowAtTen = new Date(2026, 8, 21, 10, 0, 0); // 10:00 AM
  const task = { id: 'task_01', startTime: '09:00', endTime: '10:00', schedule: 'Weekly Repeat' };

  // Before adding extra time at 10:01 AM -> isPastWindow is true (overdue)
  const nowPast = new Date(2026, 8, 21, 10, 1, 0);
  const statusBefore = checkTaskTimeWindow(task.startTime, task.endTime, nowPast);
  assert.strictEqual(statusBefore.isPastWindow, true, 'Task should be past window without extension');

  // Add +30 mins
  const newEnd = addExtraTime(task, 30, nowAtTen);
  assert.strictEqual(newEnd, '10:30', 'New end time should be extended by 30 mins to 10:30');

  // After adding extra time at 10:01 AM -> isWithinWindow is true (remains active!)
  const updatedTask = { ...task, endTime: newEnd };
  const statusAfter = checkTaskTimeWindow(updatedTask.startTime, updatedTask.endTime, nowPast);
  assert.strictEqual(statusAfter.isWithinWindow, true, 'Extended task must remain active in new window');
  assert.strictEqual(statusAfter.isPastWindow, false, 'Extended task must not be overdue in new window');

  console.log('[PASS] Test 14: Extra time (+15m/+30m/+60m) successfully extends active window and timing rules');
}

// Test 15: Rescheduling custom task moves it to target date and removes it from today's list
{
  function rescheduleTask(task, daysOffset, currentViewingDate) {
    const baseDate = currentViewingDate;
    const newStartDate = addDaysToISODate(baseDate, daysOffset);

    let newEndDate = newStartDate;
    if (task.endDate && task.endDate !== task.startDate) {
      const startD = parseISODate(task.startDate || currentViewingDate);
      const endD = parseISODate(task.endDate);
      const spanDays = Math.max(0, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
      newEndDate = addDaysToISODate(newStartDate, spanDays);
    }

    return {
      ...task,
      startDate: newStartDate,
      endDate: newEndDate,
      schedule: 'Single Event / No Repeat',
      status: 'pending',
      completedAt: null
    };
  }

  const todayStr = '2026-09-21';
  const customTaskToday = {
    id: 'custom-999',
    title: 'CS Project Review',
    startDate: todayStr,
    endDate: todayStr,
    schedule: 'Single Event / No Repeat',
    status: 'pending'
  };

  // Initially scheduled for today
  assert.strictEqual(isTaskScheduledForDate(customTaskToday, todayStr), true, 'Task is scheduled for today initially');

  // Reschedule to Next Day (+1 day -> 2026-09-22)
  const movedToTomorrow = rescheduleTask(customTaskToday, 1, todayStr);
  assert.strictEqual(movedToTomorrow.startDate, '2026-09-22', 'Start date must be tomorrow');
  assert.strictEqual(movedToTomorrow.endDate, '2026-09-22', 'End date must be tomorrow');
  assert.strictEqual(isTaskScheduledForDate(movedToTomorrow, todayStr), false, 'Must NOT be scheduled for today anymore');
  assert.strictEqual(isTaskScheduledForDate(movedToTomorrow, '2026-09-22'), true, 'Must be scheduled for tomorrow');

  // Reschedule to Next Week (+7 days -> 2026-09-28)
  const movedToNextWeek = rescheduleTask(customTaskToday, 7, todayStr);
  assert.strictEqual(movedToNextWeek.startDate, '2026-09-28', 'Start date must be next week');
  assert.strictEqual(isTaskScheduledForDate(movedToNextWeek, todayStr), false, 'Must NOT be scheduled for today');
  assert.strictEqual(isTaskScheduledForDate(movedToNextWeek, '2026-09-28'), true, 'Must be scheduled for next week');

  console.log('[PASS] Test 15: Rescheduling moves task to the target date and cleanses it from previous date');
}

// Test 16: Challenges adhere strictly to the same active window rules as tasks
{
  function computeChallengeStatusForDateTest(challenge, viewDateStr, now) {
    const isCompletedToday = (challenge.completedDates || []).includes(viewDateStr);
    const startDate = challenge.startDate || viewDateStr;
    const endDate = challenge.endDate || startDate;

    const isBeforeStart = viewDateStr < startDate;
    const isAfterEnd = viewDateStr > endDate;

    const formattedStart = formatDisplayTime(challenge.startTime || '09:00');
    const formattedEnd = formatDisplayTime(challenge.endTime || '11:00');
    const formattedRange = challenge.isAllDay ? 'All Day (Flexible)' : `${formattedStart} – ${formattedEnd}`;

    if (isBeforeStart) {
      return {
        status: 'upcoming',
        isWithinWindow: false,
        isUpcoming: true,
        isPastWindow: false,
        isCompleted: false,
        badgeText: `Starts ${startDate}`,
        formattedRange
      };
    }

    if (isAfterEnd) {
      return {
        status: 'ended',
        isWithinWindow: false,
        isUpcoming: false,
        isPastWindow: true,
        isCompleted: isCompletedToday,
        badgeText: 'Challenge Ended',
        formattedRange
      };
    }

    if (isCompletedToday) {
      return {
        status: 'completed',
        isWithinWindow: false,
        isUpcoming: false,
        isPastWindow: false,
        isCompleted: true,
        badgeText: 'Completed Today',
        exactCompletionTime: challenge.lastCompletedAt || 'Today',
        formattedRange
      };
    }

    if (challenge.isAllDay || (!challenge.startTime && !challenge.endTime)) {
      return {
        status: 'active',
        isWithinWindow: true,
        isUpcoming: false,
        isPastWindow: false,
        isCompleted: false,
        badgeText: 'Active All Day',
        formattedRange
      };
    }

    const timeWindow = checkTaskTimeWindow(challenge.startTime, challenge.endTime, now);

    if (timeWindow.isWithinWindow) {
      return {
        status: 'active',
        isWithinWindow: true,
        isUpcoming: false,
        isPastWindow: false,
        isCompleted: false,
        badgeText: 'Active Now',
        formattedRange: timeWindow.formattedRange
      };
    }

    if (timeWindow.isUpcoming) {
      return {
        status: 'upcoming',
        isWithinWindow: false,
        isUpcoming: true,
        isPastWindow: false,
        isCompleted: false,
        badgeText: `Unlocks at ${formattedStart}`,
        formattedRange: timeWindow.formattedRange
      };
    }

    return {
      status: 'overdue',
      isWithinWindow: false,
      isUpcoming: false,
      isPastWindow: true,
      isCompleted: false,
      badgeText: 'Window Closed',
      formattedRange: timeWindow.formattedRange
    };
  }

  const sampleChallenge = {
    id: 'chal-test',
    title: '7-Day Focus Sprint',
    startDate: '2026-09-20',
    endDate: '2026-09-27',
    startTime: '09:00',
    endTime: '11:00',
    completedDates: []
  };

  // Case A: Before challenge start date (2026-09-19)
  const beforeStart = computeChallengeStatusForDateTest(sampleChallenge, '2026-09-19', new Date(2026, 8, 19, 10, 0));
  assert.strictEqual(beforeStart.status, 'upcoming', 'Challenge before start date should be upcoming');
  assert.strictEqual(beforeStart.isWithinWindow, false, 'Challenge before start date must not be in active window');

  // Case B: On active date (2026-09-21) before startTime (08:30 AM)
  const morningUpcoming = computeChallengeStatusForDateTest(sampleChallenge, '2026-09-21', new Date(2026, 8, 21, 8, 30));
  assert.strictEqual(morningUpcoming.status, 'upcoming', 'Challenge before startTime today should be upcoming/locked');
  assert.strictEqual(morningUpcoming.isWithinWindow, false, 'Check-in must be locked before startTime');
  assert.strictEqual(morningUpcoming.badgeText, 'Unlocks at 9:00 AM', 'Badge should indicate start time');

  // Case C: On active date (2026-09-21) within active time window (10:15 AM)
  const liveActive = computeChallengeStatusForDateTest(sampleChallenge, '2026-09-21', new Date(2026, 8, 21, 10, 15));
  assert.strictEqual(liveActive.status, 'active', 'Challenge during scheduled window should be active');
  assert.strictEqual(liveActive.isWithinWindow, true, 'Check-in must be unlocked during scheduled window');
  assert.strictEqual(liveActive.badgeText, 'Active Now', 'Badge should display Active Now');

  // Case D: On active date (2026-09-21) after endTime (11:30 AM) without completion
  const pastWindow = computeChallengeStatusForDateTest(sampleChallenge, '2026-09-21', new Date(2026, 8, 21, 11, 30));
  assert.strictEqual(pastWindow.status, 'overdue', 'Challenge after endTime without completion should be overdue/closed');
  assert.strictEqual(pastWindow.isWithinWindow, false, 'Check-in must be closed after endTime');
  assert.strictEqual(pastWindow.badgeText, 'Window Closed', 'Badge should indicate window closed');

  // Case E: Marked completed for today (at 10:15 AM)
  const completedChallenge = {
    ...sampleChallenge,
    completedDates: ['2026-09-21'],
    lastCompletedAt: 'Completed Today at 10:15 AM'
  };
  const completedStatus = computeChallengeStatusForDateTest(completedChallenge, '2026-09-21', new Date(2026, 8, 21, 14, 0));
  assert.strictEqual(completedStatus.status, 'completed', 'Challenge marked completed today should be completed');
  assert.strictEqual(completedStatus.isCompleted, true, 'isCompleted must be true');
  assert.strictEqual(completedStatus.exactCompletionTime, 'Completed Today at 10:15 AM', 'Exact completion timestamp must be preserved');

  // Case F: All-day flexible challenge during active calendar span
  const allDayChallenge = { ...sampleChallenge, isAllDay: true };
  const allDayStatus = computeChallengeStatusForDateTest(allDayChallenge, '2026-09-21', new Date(2026, 8, 21, 23, 15));
  assert.strictEqual(allDayStatus.status, 'active', 'All-day flexible challenge should remain active throughout the day');
  assert.strictEqual(allDayStatus.isWithinWindow, true, 'All-day flexible challenge check-in is unlocked all day');

  console.log('[PASS] Test 16: Squad challenges strictly enforce daily active time windows, calendar spans, and exact completion timestamp');
}

console.log('\n====================================================');
console.log('ALL TASK & CHALLENGE STATUS INVARIANT TESTS PASSED (16/16)');
console.log('====================================================');


