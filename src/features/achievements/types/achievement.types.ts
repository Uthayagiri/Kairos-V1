export type AchievementCategory =
  | 'all'
  | 'streak'
  | 'loyalty'
  | 'perfect-performance'
  | 'task-mastery'
  | 'zero-overdue'
  | 'comeback'
  | 'challenge'
  | 'ai-companion'
  | 'level-milestones'
  | 'lifetime';

export type AchievementRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export type GlowStage =
  | 'LOCKED'
  | 'DISCOVERED'
  | 'IN_PROGRESS'
  | 'NEAR_COMPLETION'
  | 'UNLOCKED';

export type ModelType =
  | 'flame'
  | 'shield'
  | 'leaf'
  | 'tree'
  | 'star'
  | 'swords'
  | 'clock'
  | 'phoenix'
  | 'trophy'
  | 'robot'
  | 'chat'
  | 'crown'
  | 'infinity'
  | 'crystal'
  | 'bolt'
  | 'portal';

export interface Achievement {
  id: string;
  name: string;
  title?: string;
  seriesTitle?: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  modelType: ModelType;
  modelUrl?: string;
  currentProgress: number;
  targetProgress: number;
  unit: string;
  unlocked: boolean;
  isUnlocked?: boolean; // backwards-compatibility alias
  unlockDate?: string;
  rewardXP: number;
  rewardHP: number;
  glowStage: GlowStage;
  icon: string;
  glowColor: string;
  particleColor: string;
  tier: number;
  secret?: boolean;
  flavorText?: string;
  badgeBg?: string;
  badgeText?: string;
  badgePillBg?: string;
  badgePillText?: string;
}

export interface CategoryMeta {
  id: AchievementCategory;
  label: string;
  icon: string;
  description: string;
  accentColor: string;
  gradient: string;
}

export interface RarityMeta {
  id: AchievementRarity;
  label: string;
  color: string;
  secondaryColor: string;
  borderClass: string;
  bgClass: string;
  glowColor: string;
  particleColor: string;
  particleCount: number;
  multiplier: number;
}

export interface FilterState {
  searchQuery: string;
  category: AchievementCategory;
  rarity: AchievementRarity | 'all';
  status: 'all' | 'unlocked' | 'in-progress' | 'locked';
  sortBy: 'progress' | 'rarity' | 'xp' | 'hp' | 'recent';
}
