import { AchievementRarity, RarityMeta } from '../types/achievement.types';

export const ACHIEVEMENT_RARITIES: Record<AchievementRarity, RarityMeta> = {
  common: {
    id: 'common',
    label: 'Common',
    color: '#b45309',
    secondaryColor: '#78350f',
    borderClass: 'border-amber-300',
    bgClass: 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm',
    glowColor: '#f59e0b',
    particleColor: '#d97706',
    particleCount: 16,
    multiplier: 1.0
  },
  uncommon: {
    id: 'uncommon',
    label: 'Uncommon',
    color: '#059669',
    secondaryColor: '#065f46',
    borderClass: 'border-emerald-300',
    bgClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm',
    glowColor: '#10b981',
    particleColor: '#059669',
    particleCount: 24,
    multiplier: 1.35
  },
  rare: {
    id: 'rare',
    label: 'Rare',
    color: '#2563eb',
    secondaryColor: '#1e40af',
    borderClass: 'border-blue-300',
    bgClass: 'bg-blue-50 text-blue-800 border border-blue-200 shadow-sm',
    glowColor: '#3b82f6',
    particleColor: '#2563eb',
    particleCount: 36,
    multiplier: 1.75
  },
  epic: {
    id: 'epic',
    label: 'Epic',
    color: '#9333ea',
    secondaryColor: '#6b21a8',
    borderClass: 'border-purple-300',
    bgClass: 'bg-purple-50 text-purple-800 border border-purple-200 shadow-sm',
    glowColor: '#a855f7',
    particleColor: '#9333ea',
    particleCount: 50,
    multiplier: 2.3
  },
  legendary: {
    id: 'legendary',
    label: 'Legendary',
    color: '#d97706',
    secondaryColor: '#b45309',
    borderClass: 'border-amber-400',
    bgClass: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 border border-amber-300 font-extrabold shadow-sm',
    glowColor: '#f59e0b',
    particleColor: '#eab308',
    particleCount: 68,
    multiplier: 3.5
  },
  mythic: {
    id: 'mythic',
    label: 'Mythic',
    color: '#db2777',
    secondaryColor: '#7c3aed',
    borderClass: 'border-pink-400',
    bgClass: 'bg-gradient-to-r from-pink-100 via-purple-100 to-cyan-100 text-purple-900 border border-pink-300 font-extrabold shadow-md',
    glowColor: '#ec4899',
    particleColor: '#06b6d4',
    particleCount: 96,
    multiplier: 5.0
  }
};
