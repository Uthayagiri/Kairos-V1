export interface SquadMember {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  isCurrentUser?: boolean;
  xp?: number;
  tasksCount?: number;
  isOnline?: boolean;
  statusText?: string;
  tag?: string;
}

export type ChallengeQualificationType =
  | 'task_category'
  | 'task_ids'
  | 'focus_session'
  | 'all_eligible_tasks'
  | 'manual_checkin';

export interface SquadChallengeCriteria {
  type: ChallengeQualificationType;
  category?: string;
  taskIds?: string[];
  minDurationMinutes?: number;
}

export interface SquadContribution {
  id: string; // Deterministic ID: `contrib-${challengeId}-${memberId}-${taskId || date}`
  squadId: string;
  challengeId: string;
  memberId: string;
  taskId?: string;
  sessionDurationMinutes?: number;
  date: string; // YYYY-MM-DD local calendar date
  contributedAt: string; // ISO timestamp
  quantity: number; // e.g. 1 check-in / task completion
  hpEarned?: number;
}

export interface ChallengeRosterItem {
  name: string;
  avatar: string;
  isCurrentUser?: boolean;
  percentage: number;
  detail: string;
  ringColor: string;
  textColor: string;
  completed?: boolean;
  completedAt?: string | null;
}

export interface Challenge {
  id: string;
  squadId?: string;
  title: string;
  subtitle: string;
  category: string;
  criteria?: SquadChallengeCriteria;
  durationTag: string;
  hpReward: number;
  currentDays: number;
  totalDays: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  dateRangeText?: string;
  timeWindowText?: string;
  gradientClass: string;
  borderColor: string;
  accentColor: 'rose' | 'emerald' | 'amber' | 'purple' | 'indigo';
  icon: string;
  joinedUsers: { name: string; avatar: string }[];
  roster: ChallengeRosterItem[];
  completedDates?: string[];
  lastCompletedAt?: string | null;
}

export interface Squad {
  id: string;
  name: string;
  createdAt: string;
  ownerId: string;
  league?: string;
  members: SquadMember[];
  challengeIds: string[];
}

export interface SquadState {
  squad: Squad;
  challenges: Challenge[];
  contributions: SquadContribution[];
}

export interface ChallengeStatusInfo {
  status: 'active' | 'upcoming' | 'completed' | 'overdue' | 'ended';
  isWithinWindow: boolean;
  isUpcoming: boolean;
  isPastWindow: boolean;
  isCompleted: boolean;
  badgeText: string;
  statusBanner: string;
  formattedRange: string;
  exactCompletionTime?: string | null;
}
