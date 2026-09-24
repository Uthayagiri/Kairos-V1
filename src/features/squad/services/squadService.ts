import {
  Squad,
  SquadMember,
  SquadContribution,
  Challenge,
  SquadState,
  ChallengeStatusInfo
} from '../types/squad.types';
import {
  DEFAULT_SQUAD_ID,
  DEFAULT_SQUAD_NAME,
  CURRENT_USER_MEMBER_ID,
  INITIAL_SQUAD,
  INITIAL_SQUAD_MEMBERS,
  getInitialSquadChallenges,
  formatDateToLocalISO,
  formatDateRange
} from '../data/initialSquadData';
import { checkTaskTimeWindow, formatDisplayTime } from '../../../screens/TasksScreen';
import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON,
  setActiveUserId
} from '../../storage';
import { syncQueue, syncSerializer } from '../../sync';

export const STORAGE_KEY_SQUAD_STATE = 'KAIROS_SQUAD_STATE_V1';
export const STORAGE_KEY_LEGACY_CHALLENGES = 'KAIROS_SQUAD_CHALLENGES_V1';
export const EVENT_SQUAD_UPDATED = 'kairos_squad_updated';

/**
 * Generates a deterministic contribution ID for a given member, challenge, and date (manual check-in).
 */
export const generateContributionId = (
  challengeId: string,
  memberId: string,
  dateStr: string
): string => {
  return `contrib-${challengeId}-${memberId}-${dateStr}`;
};

/**
 * Generates a deterministic contribution ID for a normal task or focus session.
 */
export const generateTaskContributionId = (
  challengeId: string,
  memberId: string,
  taskId: string,
  dateStr?: string
): string => {
  return `contrib-${challengeId}-${memberId}-${taskId}${dateStr ? `-${dateStr}` : ''}`;
};

/**
 * Normalizes and evaluates category compatibility between a squad challenge and a task.
 */
export const isCategoryMatching = (
  challengeCategory?: string,
  taskCategory?: string,
  taskTitle?: string
): boolean => {
  if (!challengeCategory) return false;
  const cc = challengeCategory.trim().toLowerCase();
  const tc = (taskCategory || '').trim().toLowerCase();
  const title = (taskTitle || '').toLowerCase();

  if (cc === tc) return true;

  if (cc === 'deep work') {
    return (
      tc === 'deep work' ||
      tc === 'study' ||
      tc === 'intellect' ||
      tc === 'skill' ||
      /focus|deep work|pomodoro/i.test(title)
    );
  }
  if (cc === 'circadian health' || cc === 'health') {
    return (
      tc === 'health' ||
      tc === 'circadian health' ||
      tc === 'routine' ||
      /water|hydrate|sunlight|circadian|sleep/i.test(title)
    );
  }
  if (cc === 'mindfulness') {
    return (
      tc === 'mindfulness' ||
      tc === 'health' ||
      tc === 'routine' ||
      /walk|meditat|breathe|mindful|journal/i.test(title)
    );
  }
  if (cc === 'fitness' || cc === 'gym') {
    return (
      tc === 'gym' ||
      tc === 'fitness' ||
      tc === 'workout' ||
      /step|run|walk|gym|exercise/i.test(title)
    );
  }
  if (cc === 'study') {
    return (
      tc === 'study' ||
      tc === 'intellect' ||
      tc === 'deep work' ||
      /study|read|homework|assignment/i.test(title)
    );
  }

  return false;
};

export interface TaskContributionInput {
  id: string;
  title?: string;
  category?: string;
  startTime?: string;
  endTime?: string;
  date?: string; // YYYY-MM-DD
  durationMinutes?: number;
}

/**
 * Evaluates whether a normal task or focus session qualifies for a given squad challenge.
 */
export const doesTaskQualifyForChallenge = (
  task: TaskContributionInput,
  challenge: Challenge,
  viewDateStr: string = formatDateToLocalISO(new Date()),
  now: Date = new Date()
): boolean => {
  // 1. Challenge status & window validation
  const statusInfo = computeChallengeStatusForDate(challenge, viewDateStr, now);

  // If challenge has ended or is before its start date, it cannot receive contributions
  if (
    statusInfo.status === 'ended' ||
    (statusInfo.status === 'upcoming' && viewDateStr < (challenge.startDate || viewDateStr))
  ) {
    return false;
  }

  // If the challenge specifies a time window and is not all-day, verify it's within the window or active
  if (!challenge.isAllDay && challenge.startTime && challenge.endTime) {
    if (!statusInfo.isWithinWindow && statusInfo.status !== 'completed') {
      return false;
    }
  }

  // 2. Check Criteria
  const criteria = challenge.criteria;
  if (!criteria) {
    // Default: category match against challenge category
    return isCategoryMatching(challenge.category, task.category, task.title);
  }

  switch (criteria.type) {
    case 'task_category': {
      const targetCategory = criteria.category || challenge.category;
      return isCategoryMatching(targetCategory, task.category, task.title);
    }
    case 'task_ids': {
      return Array.isArray(criteria.taskIds) && criteria.taskIds.includes(task.id);
    }
    case 'focus_session': {
      const isFocus =
        isCategoryMatching('Deep Work', task.category, task.title) ||
        /focus|deep work|pomodoro/i.test(task.title || '');
      if (!isFocus) return false;
      if (
        criteria.minDurationMinutes &&
        (task.durationMinutes || 0) < criteria.minDurationMinutes
      ) {
        return false;
      }
      return true;
    }
    case 'all_eligible_tasks': {
      return true;
    }
    case 'manual_checkin': {
      return false;
    }
    default:
      return false;
  }
};

/**
 * Evaluates live status for any challenge on a target calendar date.
 * Strictly applies task timing rules:
 * - Active on each day within [startDate, endDate] during [startTime, endTime].
 * - Upcoming before startTime today.
 * - Closed/overdue after endTime today.
 * - Completed with exact timestamp if marked complete.
 */
export const computeChallengeStatusForDate = (
  challenge: Challenge,
  viewDateStr: string = formatDateToLocalISO(new Date()),
  now: Date = new Date()
): ChallengeStatusInfo => {
  const isCompletedToday = (challenge.completedDates || []).includes(viewDateStr);
  const startDate = challenge.startDate || viewDateStr;
  const endDate = challenge.endDate || startDate;

  const isBeforeStart = viewDateStr < startDate;
  const isAfterEnd = viewDateStr > endDate;

  const formattedStart = formatDisplayTime(challenge.startTime || '09:00');
  const formattedEnd = formatDisplayTime(challenge.endTime || '11:00');
  const formattedRange = challenge.isAllDay
    ? 'All Day (Flexible)'
    : `${formattedStart} – ${formattedEnd}`;

  if (isBeforeStart) {
    return {
      status: 'upcoming',
      isWithinWindow: false,
      isUpcoming: true,
      isPastWindow: false,
      isCompleted: false,
      badgeText: `Starts ${formatDateRange(startDate, endDate)}`,
      statusBanner: `Upcoming Challenge: Scheduled to start on ${startDate}.`,
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
      statusBanner: `Challenge Concluded on ${endDate}.`,
      formattedRange
    };
  }

  // If already completed today
  if (isCompletedToday) {
    const timeLabel = challenge.lastCompletedAt || 'Today';
    return {
      status: 'completed',
      isWithinWindow: false,
      isUpcoming: false,
      isPastWindow: false,
      isCompleted: true,
      badgeText: 'Completed Today',
      statusBanner: `Mission Accomplished: ${timeLabel}`,
      formattedRange,
      exactCompletionTime: timeLabel
    };
  }

  // If All Day (Flexible)
  if (challenge.isAllDay || (!challenge.startTime && !challenge.endTime)) {
    return {
      status: 'active',
      isWithinWindow: true,
      isUpcoming: false,
      isPastWindow: false,
      isCompleted: false,
      badgeText: 'Active All Day',
      statusBanner: 'Active Now: All-day flexible squad sprint.',
      formattedRange
    };
  }

  // Evaluate scheduled time window for today
  const timeWindow = checkTaskTimeWindow(challenge.startTime, challenge.endTime, now);

  if (timeWindow.isWithinWindow) {
    return {
      status: 'active',
      isWithinWindow: true,
      isUpcoming: false,
      isPastWindow: false,
      isCompleted: false,
      badgeText: 'Active Now',
      statusBanner: `Active Now: You can complete today's sprint now (${timeWindow.formattedRange}).`,
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
      statusBanner: `Scheduled for ${timeWindow.formattedRange}. Unlocks during scheduled time.`,
      formattedRange: timeWindow.formattedRange
    };
  }

  // Past window for today without completion
  return {
    status: 'overdue',
    isWithinWindow: false,
    isUpcoming: false,
    isPastWindow: true,
    isCompleted: false,
    badgeText: 'Window Closed',
    statusBanner: `Today's window closed (${timeWindow.formattedRange}). Check-ins can only be completed during the active time window.`,
    formattedRange: timeWindow.formattedRange
  };
};

class SquadService {
  private state: SquadState | null = null;
  private listeners: Array<(state: SquadState) => void> = [];

  constructor() {
    this.state = this.loadSquadState();
  }

  /**
   * Switches the active user context, reloading their isolated squad state.
   */
  public switchUser(user?: string | { email?: string; id?: string; username?: string; name?: string } | null): void {
    if (user !== undefined) {
      setActiveUserId(user);
    }
    this.state = this.loadSquadState();
    this.notifyListeners(this.state);
  }

  /**
   * Resets in-memory squad state to default initial state without deleting persisted user data.
   */
  public resetSession(): void {
    const defaultState: SquadState = {
      squad: INITIAL_SQUAD,
      challenges: getInitialSquadChallenges(),
      contributions: []
    };
    this.state = defaultState;
    this.notifyListeners(defaultState);
  }

  /**
   * Loads or migrates the SquadState from user-scoped storage.
   */
  public loadSquadState(): SquadState {
    try {
      // 1. Check for user-scoped SQUAD_STATE
      const parsed = getUserScopedJSON<Partial<SquadState> | null>(STORAGE_DOMAINS.SQUAD_STATE, null);
      if (parsed && parsed.squad && Array.isArray(parsed.challenges)) {
        const state: SquadState = {
          squad: parsed.squad,
          challenges: parsed.challenges,
          contributions: Array.isArray(parsed.contributions) ? parsed.contributions : []
        };
        this.state = state;
        return state;
      }

      // 2. Fallback: Migrate from legacy SQUAD_LEGACY_CHALLENGES if available
      const legacyChallenges = getUserScopedJSON<Challenge[] | null>(STORAGE_DOMAINS.SQUAD_LEGACY_CHALLENGES, null);
      if (legacyChallenges && Array.isArray(legacyChallenges) && legacyChallenges.length > 0) {
        const contributions: SquadContribution[] = [];

        const migratedChallenges: Challenge[] = legacyChallenges.map((c: Challenge) => {
          const squadId = c.squadId || DEFAULT_SQUAD_ID;
          // Generate contribution records for past completed dates
          (c.completedDates || []).forEach((dateStr) => {
            contributions.push({
              id: generateContributionId(c.id, CURRENT_USER_MEMBER_ID, dateStr),
              squadId,
              challengeId: c.id,
              memberId: CURRENT_USER_MEMBER_ID,
              taskId: `chal-${c.id}-${dateStr}`,
              date: dateStr,
              contributedAt: new Date().toISOString(),
              quantity: 1,
              hpEarned: c.hpReward || 100
            });
          });

          return {
            ...c,
            squadId
          };
        });

        const migratedState: SquadState = {
          squad: {
            ...INITIAL_SQUAD,
            challengeIds: migratedChallenges.map((c) => c.id)
          },
          challenges: migratedChallenges,
          contributions
        };

        this.saveSquadState(migratedState);
        return migratedState;
      }
    } catch {
      // Fallback on error
    }

    // 3. Default fresh state
    const defaultState: SquadState = {
      squad: INITIAL_SQUAD,
      challenges: getInitialSquadChallenges(),
      contributions: []
    };
    this.saveSquadState(defaultState);
    return defaultState;
  }

  /**
   * Persists SquadState to user-scoped storage and notifies listeners.
   */
  public saveSquadState(state: SquadState): void {
    this.state = state;

    try {
      setUserScopedJSON(STORAGE_DOMAINS.SQUAD_STATE, state);
      // Keep legacy domain updated for backwards compatibility
      setUserScopedJSON(STORAGE_DOMAINS.SQUAD_LEGACY_CHALLENGES, state.challenges);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_SQUAD_UPDATED, {
            detail: state
          })
        );
      }
    } catch {}

    this.notifyListeners(state);
  }

  public getState(): SquadState {
    if (!this.state) {
      this.state = this.loadSquadState();
    }
    return this.state;
  }

  public getSquad(): Squad {
    return this.getState().squad;
  }

  public getChallenges(): Challenge[] {
    return this.getState().challenges;
  }

  public getContributions(challengeId?: string): SquadContribution[] {
    const all = this.getState().contributions;
    if (challengeId) {
      return all.filter((c) => c.challengeId === challengeId);
    }
    return all;
  }

  /**
   * Computes progress for a challenge using its contribution records.
   */
  public getChallengeProgress(
    challenge: Challenge,
    contributions: SquadContribution[] = this.getContributions(challenge.id)
  ): {
    currentDays: number;
    totalDays: number;
    percentage: number;
  } {
    const challengeContribs = contributions.filter((c) => c.challengeId === challenge.id);
    const uniqueDates = Array.from(new Set(challengeContribs.map((c) => c.date)));
    const currentDays = Math.min(challenge.totalDays, uniqueDates.length);
    const percentage =
      challenge.totalDays > 0 ? Math.min(100, Math.round((currentDays / challenge.totalDays) * 100)) : 0;

    return {
      currentDays,
      totalDays: challenge.totalDays,
      percentage
    };
  }

  /**
   * Records a user check-in contribution for a challenge on a given date.
   * Deterministic duplicate protection ensures idempotent execution.
   */
  public recordChallengeCheckIn(
    challengeId: string,
    dateStr: string = formatDateToLocalISO(),
    hpReward: number = 100,
    memberId: string = CURRENT_USER_MEMBER_ID
  ): { success: boolean; state: SquadState; isNew: boolean } {
    const currentState = this.getState();
    const targetChallenge = currentState.challenges.find((c) => c.id === challengeId);
    if (!targetChallenge) {
      return { success: false, state: currentState, isNew: false };
    }

    const contributionId = generateContributionId(challengeId, memberId, dateStr);
    const alreadyExists = currentState.contributions.some((c) => c.id === contributionId);

    const now = new Date();
    const nowTimeStr = formatDisplayTime(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    );
    const fullCompletedAt = `Completed Today at ${nowTimeStr}`;

    const newCompletedDates = Array.from(
      new Set([...(targetChallenge.completedDates || []), dateStr])
    );
    const newCurrentDays = Math.min(targetChallenge.totalDays, newCompletedDates.length);

    const updatedRoster = targetChallenge.roster.map((r) => {
      if (r.isCurrentUser) {
        const newPct = Math.round((newCurrentDays / targetChallenge.totalDays) * 100);
        return {
          ...r,
          completed: true,
          completedAt: fullCompletedAt,
          percentage: newPct,
          detail: `${newCurrentDays} / ${targetChallenge.totalDays} days done`
        };
      }
      return r;
    });

    const updatedChallenges = currentState.challenges.map((c) => {
      if (c.id !== challengeId) return c;
      return {
        ...c,
        completedDates: newCompletedDates,
        currentDays: newCurrentDays,
        lastCompletedAt: fullCompletedAt,
        roster: updatedRoster
      };
    });

    let updatedContributions = currentState.contributions;
    if (!alreadyExists) {
      const newContribution: SquadContribution = {
        id: contributionId,
        squadId: targetChallenge.squadId || DEFAULT_SQUAD_ID,
        challengeId,
        memberId,
        taskId: `chal-${challengeId}-${dateStr}`,
        date: dateStr,
        contributedAt: now.toISOString(),
        quantity: 1,
        hpEarned: hpReward
      };
      updatedContributions = [...currentState.contributions, newContribution];
      try {
        syncQueue.enqueue(
          'SQUAD_CHALLENGE_CONTRIBUTION',
          syncSerializer.squadChallengeContribution({
            challengeId,
            contributionUnits: 1,
            category: targetChallenge.category
          })
        );
      } catch {}
    }

    const nextState: SquadState = {
      ...currentState,
      challenges: updatedChallenges,
      contributions: updatedContributions
    };

    this.saveSquadState(nextState);
    return { success: true, state: nextState, isNew: !alreadyExists };
  }

  /**
   * Removes a check-in contribution for a challenge on a given date (undo).
   */
  public removeChallengeCheckIn(
    challengeId: string,
    dateStr: string = formatDateToLocalISO(),
    memberId: string = CURRENT_USER_MEMBER_ID
  ): { success: boolean; state: SquadState } {
    const currentState = this.getState();
    const targetChallenge = currentState.challenges.find((c) => c.id === challengeId);
    if (!targetChallenge) {
      return { success: false, state: currentState };
    }

    const contributionId = generateContributionId(challengeId, memberId, dateStr);

    const newCompletedDates = (targetChallenge.completedDates || []).filter((d) => d !== dateStr);
    const newCurrentDays = Math.max(0, newCompletedDates.length);

    const updatedRoster = targetChallenge.roster.map((r) => {
      if (r.isCurrentUser) {
        const newPct = Math.round((newCurrentDays / targetChallenge.totalDays) * 100);
        return {
          ...r,
          completed: false,
          completedAt: null,
          percentage: newPct,
          detail: `${newCurrentDays} / ${targetChallenge.totalDays} days done`
        };
      }
      return r;
    });

    const updatedChallenges = currentState.challenges.map((c) => {
      if (c.id !== challengeId) return c;
      return {
        ...c,
        completedDates: newCompletedDates,
        currentDays: newCurrentDays,
        lastCompletedAt: null,
        roster: updatedRoster
      };
    });

    const updatedContributions = currentState.contributions.filter((c) => c.id !== contributionId);

    const nextState: SquadState = {
      ...currentState,
      challenges: updatedChallenges,
      contributions: updatedContributions
    };

    this.saveSquadState(nextState);
    return { success: true, state: nextState };
  }

  /**
   * Evaluates and records contributions for an eligible completed normal task or focus session.
   * NEVER awards XP/HP directly (preserves progression separation).
   * Supports deterministic deduplication and multi-challenge eligibility.
   */
  public recordTaskContribution(
    task: TaskContributionInput,
    memberId: string = CURRENT_USER_MEMBER_ID,
    dateStr?: string
  ): { affectedChallengeIds: string[]; state: SquadState } {
    const currentState = this.getState();
    const effectiveDateStr = dateStr || task.date || formatDateToLocalISO();
    const now = new Date();
    const nowTimeStr = formatDisplayTime(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    );
    const fullCompletedAt = `Completed Today at ${nowTimeStr}`;

    const affectedChallengeIds: string[] = [];
    let updatedContributions = [...currentState.contributions];
    let updatedChallenges = [...currentState.challenges];

    for (let i = 0; i < updatedChallenges.length; i++) {
      const challenge = updatedChallenges[i];
      if (doesTaskQualifyForChallenge(task, challenge, effectiveDateStr, now)) {
        const contributionId = generateTaskContributionId(
          challenge.id,
          memberId,
          task.id,
          effectiveDateStr
        );
        const alreadyExists = updatedContributions.some((c) => c.id === contributionId);

        if (!alreadyExists) {
          const newContrib: SquadContribution = {
            id: contributionId,
            squadId: challenge.squadId || DEFAULT_SQUAD_ID,
            challengeId: challenge.id,
            memberId,
            taskId: task.id,
            sessionDurationMinutes: task.durationMinutes,
            date: effectiveDateStr,
            contributedAt: now.toISOString(),
            quantity: 1,
            hpEarned: challenge.hpReward || 100
          };
          updatedContributions.push(newContrib);
        }

        // Recompute challenge progress & roster for this challenge
        const challengeContribs = updatedContributions.filter((c) => c.challengeId === challenge.id);
        const uniqueDates = Array.from(new Set(challengeContribs.map((c) => c.date)));
        const newCurrentDays = Math.min(challenge.totalDays, uniqueDates.length);
        const newCompletedDates = Array.from(
          new Set([...(challenge.completedDates || []), effectiveDateStr])
        );

        const updatedRoster = challenge.roster.map((r) => {
          if (r.isCurrentUser && memberId === CURRENT_USER_MEMBER_ID) {
            const newPct = Math.round((newCurrentDays / challenge.totalDays) * 100);
            return {
              ...r,
              completed: true,
              completedAt: fullCompletedAt,
              percentage: newPct,
              detail: `${newCurrentDays} / ${challenge.totalDays} days done`
            };
          }
          return r;
        });

        updatedChallenges[i] = {
          ...challenge,
          completedDates: newCompletedDates,
          currentDays: newCurrentDays,
          lastCompletedAt: fullCompletedAt,
          roster: updatedRoster
        };

        affectedChallengeIds.push(challenge.id);
      }
    }

    if (affectedChallengeIds.length > 0) {
      const nextState: SquadState = {
        ...currentState,
        challenges: updatedChallenges,
        contributions: updatedContributions
      };
      this.saveSquadState(nextState);
      return { affectedChallengeIds, state: nextState };
    }

    return { affectedChallengeIds: [], state: currentState };
  }

  /**
   * Removes contributions generated by a specific task when undone or uncompleted.
   * Recalculates affected challenge progress cleanly without leaving stale state.
   */
  public removeTaskContribution(
    taskId: string,
    memberId: string = CURRENT_USER_MEMBER_ID,
    dateStr?: string
  ): { affectedChallengeIds: string[]; state: SquadState } {
    const currentState = this.getState();
    const effectiveDateStr = dateStr || formatDateToLocalISO();

    // Identify contributions matching taskId & memberId (and dateStr if provided)
    const matchingContribs = currentState.contributions.filter((c) => {
      if (c.memberId !== memberId || c.taskId !== taskId) return false;
      if (dateStr && c.date !== dateStr) return false;
      return true;
    });

    if (matchingContribs.length === 0) {
      return { affectedChallengeIds: [], state: currentState };
    }

    const affectedChallengeIds = Array.from(new Set(matchingContribs.map((c) => c.challengeId)));
    const matchingIds = new Set(matchingContribs.map((c) => c.id));
    const nextContributions = currentState.contributions.filter((c) => !matchingIds.has(c.id));

    const nextChallenges = currentState.challenges.map((challenge) => {
      if (!affectedChallengeIds.includes(challenge.id)) return challenge;

      const remainingContribs = nextContributions.filter((c) => c.challengeId === challenge.id);
      const remainingDates = Array.from(new Set(remainingContribs.map((c) => c.date)));
      const newCurrentDays = Math.min(challenge.totalDays, remainingDates.length);
      const isCompletedToday = remainingDates.includes(effectiveDateStr);

      const updatedRoster = challenge.roster.map((r) => {
        if (r.isCurrentUser && memberId === CURRENT_USER_MEMBER_ID) {
          const newPct = Math.round((newCurrentDays / challenge.totalDays) * 100);
          return {
            ...r,
            completed: isCompletedToday,
            completedAt: isCompletedToday ? r.completedAt : null,
            percentage: newPct,
            detail: `${newCurrentDays} / ${challenge.totalDays} days done`
          };
        }
        return r;
      });

      return {
        ...challenge,
        completedDates: remainingDates,
        currentDays: newCurrentDays,
        lastCompletedAt: isCompletedToday ? challenge.lastCompletedAt : null,
        roster: updatedRoster
      };
    });

    const nextState: SquadState = {
      ...currentState,
      challenges: nextChallenges,
      contributions: nextContributions
    };

    this.saveSquadState(nextState);
    return { affectedChallengeIds, state: nextState };
  }

  /**
   * Adds a new Challenge to the squad (enforces max 5 active challenges limit).
   */
  public createChallenge(
    newChallenge: Challenge
  ): { success: boolean; state: SquadState; error?: string } {
    const currentState = this.getState();
    if (currentState.challenges.length >= 5) {
      return {
        success: false,
        state: currentState,
        error: 'Active challenge limit reached (max 5)'
      };
    }

    const finalChallenge: Challenge = {
      ...newChallenge,
      squadId: currentState.squad.id
    };

    const nextChallenges = [...currentState.challenges, finalChallenge];
    const nextSquad: Squad = {
      ...currentState.squad,
      challengeIds: nextChallenges.map((c) => c.id)
    };

    const nextState: SquadState = {
      ...currentState,
      squad: nextSquad,
      challenges: nextChallenges
    };

    this.saveSquadState(nextState);
    return { success: true, state: nextState };
  }

  /**
   * Archives/removes an active Challenge from the squad.
   */
  public archiveChallenge(challengeId: string): { success: boolean; state: SquadState } {
    const currentState = this.getState();
    const nextChallenges = currentState.challenges.filter((c) => c.id !== challengeId);
    const nextContributions = currentState.contributions.filter((c) => c.challengeId !== challengeId);

    const nextSquad: Squad = {
      ...currentState.squad,
      challengeIds: nextChallenges.map((c) => c.id)
    };

    const nextState: SquadState = {
      ...currentState,
      squad: nextSquad,
      challenges: nextChallenges,
      contributions: nextContributions
    };

    this.saveSquadState(nextState);
    return { success: true, state: nextState };
  }

  /**
   * Subscribes a callback to squad state changes.
   */
  public subscribe(listener: (state: SquadState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(state: SquadState): void {
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch {}
    });
  }
}

export const squadService = new SquadService();
