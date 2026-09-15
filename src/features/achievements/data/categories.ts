import { CategoryMeta } from '../types/achievement.types';

export const ACHIEVEMENT_CATEGORIES: CategoryMeta[] = [
  {
    id: 'all',
    label: 'All Milestones',
    icon: 'apps',
    description: 'Complete catalogue of all Kairos neural, streak, and lifetime milestones',
    accentColor: '#8b5cf6',
    gradient: 'from-purple-600 to-indigo-700'
  },
  {
    id: 'streak',
    label: 'Streak Achievements',
    icon: 'local_fire_department',
    description: 'Daily consistency and unbroken habit chains',
    accentColor: '#f97316',
    gradient: 'from-amber-500 to-orange-600'
  },
  {
    id: 'loyalty',
    label: 'Kairos Loyalty / App Journey',
    icon: 'calendar_month',
    description: 'Long-term active days and lifelong dedication to Kairos',
    accentColor: '#10b981',
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'perfect-performance',
    label: 'Perfect Performance',
    icon: 'star',
    description: 'Flawless 100% daily ritual execution and perfect days',
    accentColor: '#eab308',
    gradient: 'from-yellow-400 to-amber-600'
  },
  {
    id: 'task-mastery',
    label: 'Task Mastery',
    icon: 'task_alt',
    description: 'High volume task completion and quest finishing',
    accentColor: '#3b82f6',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'zero-overdue',
    label: 'Zero-Overdue Achievements',
    icon: 'schedule',
    description: 'Flawless time management with zero delayed or overdue tasks',
    accentColor: '#8b5cf6',
    gradient: 'from-purple-500 to-violet-700'
  },
  {
    id: 'comeback',
    label: 'Comeback Achievements',
    icon: 'flight_takeoff',
    description: 'Resilience, streak recovery, and triumphant returns',
    accentColor: '#ec4899',
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    id: 'challenge',
    label: 'Challenge Achievements',
    icon: 'emoji_events',
    description: 'League tournaments, rapid sprints, and challenge victories',
    accentColor: '#f59e0b',
    gradient: 'from-amber-500 to-yellow-600'
  },
  {
    id: 'ai-companion',
    label: 'AI Companion Achievements',
    icon: 'smart_toy',
    description: 'Deep neural dialogue and collaborative planning with Kairos AI',
    accentColor: '#06b6d4',
    gradient: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'level-milestones',
    label: 'Level Milestone Achievements',
    icon: 'military_tech',
    description: 'Progression from Level 5 Awakened to Level 100 Sovereign',
    accentColor: '#6366f1',
    gradient: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'lifetime',
    label: 'Ultra-Rare Lifetime Achievements',
    icon: 'workspace_premium',
    description: 'The pinnacle crowning achievements of human potential',
    accentColor: '#f43f5e',
    gradient: 'from-rose-500 via-purple-600 to-amber-400'
  }
];
