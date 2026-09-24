import { AchievementRarity, ModelType } from '../types/achievement.types';

export interface EngravingInfo {
  type: 'text' | 'icon' | 'flame_number';
  text?: string;
  subText?: string;
  title?: string;
  icon?: string;
  levelNum?: number;
}

export function getAchievementEngraving(
  name: string,
  modelType?: ModelType,
  category?: string,
  id?: string
): EngravingInfo {
  const n = (name || '').trim();

  // 1. Level Milestone Achievements (Clean numeral focus like coin medals!)
  if (n.startsWith('Awakened') || id === 'level-1') {
    return { type: 'text', text: 'Lv 5', title: 'AWAKENED', levelNum: 5 };
  }
  if (n.startsWith('Explorer') || id === 'level-2') {
    return { type: 'text', text: 'Lv 10', title: 'EXPLORER', levelNum: 10 };
  }
  if (n.startsWith('Pathfinder') || id === 'level-3') {
    return { type: 'text', text: 'Lv 25', title: 'PATHFINDER', levelNum: 25 };
  }
  if (n.startsWith('Ascendant') || id === 'level-4') {
    return { type: 'text', text: 'Lv 50', title: 'ASCENDANT', levelNum: 50 };
  }
  if (n.startsWith('Vanguard') || id === 'level-5') {
    return { type: 'text', text: 'Lv 75', title: 'VANGUARD', levelNum: 75 };
  }
  if (n.startsWith('Sovereign') || id === 'level-6') {
    return { type: 'text', text: 'Lv 90', title: 'SOVEREIGN', levelNum: 90 };
  }
  if (n.startsWith('The Hundredth') || id === 'level-7' || id === 'life-5') {
    return { type: 'text', text: 'Lv 100', title: 'THE HUNDREDTH', subText: '★', levelNum: 100 };
  }

  // 2. Kairos Loyalty / App Journey Milestones
  if (n === 'Halfway Around the Sun' || id === 'loyalty-5') return { type: 'text', text: '180', title: 'HALFWAY', subText: 'DAYS', icon: '☀️' };
  if (n === 'One Year With Kairos' || id === 'loyalty-6') return { type: 'text', text: '1 YEAR', title: 'ANNIVERSARY', icon: '🏆' };
  if (n === 'Veteran' || id === 'loyalty-7') return { type: 'text', text: '500', title: 'VETERAN', subText: 'DAYS', icon: '🛡️' };
  if (n === 'Two Years Strong' || id === 'loyalty-8') return { type: 'text', text: '2 YEARS', title: 'TWO YEARS', icon: '🌟' };
  if (n === 'Long-Term Player' || id === 'loyalty-9') return { type: 'text', text: '1,000', title: 'MILLENNIUM', subText: 'DAYS', icon: '🔥' };
  if (n === 'Three Years of Growth' || id === 'loyalty-10') return { type: 'text', text: '3 YEARS', title: 'TRIUMPH', icon: '🌳' };
  if (n === 'The Long Journey' || id === 'loyalty-11') return { type: 'text', text: '1,500', title: 'JOURNEY', subText: 'DAYS', icon: '🚀' };
  if (n.startsWith('Five-Year Legend') || id === 'loyalty-12' || id === 'life-2') {
    return { type: 'text', text: '5 YEARS', title: 'LEGEND', subText: 'LIFETIME', icon: '👑' };
  }

  // 3. Perfect Performance Milestones
  if (n === 'Flawless 30' || id === 'perf-4') return { type: 'text', text: '30', title: 'FLAWLESS', subText: 'DAYS', icon: '⚡' };
  if (n === 'Century of Excellence' || id === 'perf-5') return { type: 'text', text: '100', title: 'CENTURY', subText: 'DAYS', icon: '💯' };
  if (n === 'Perfectionist' || id === 'perf-6') return { type: 'text', text: '250', title: 'PERFECTION', subText: 'DAYS', icon: '✨' };
  if (n === 'Master of the Day' || id === 'perf-7') return { type: 'text', text: '500', title: 'MASTERY', subText: 'DAYS', icon: '🎯' };
  if (n.startsWith('Absolute Discipline') || id === 'perf-8' || id === 'life-4') {
    return { type: 'text', text: '1,000', title: 'DISCIPLINE', subText: 'PERFECT', icon: '⚡' };
  }

  // 4. Challenge Milestones
  if (n === 'Rival' || id === 'chal-4') return { type: 'text', text: '10', title: 'RIVAL', icon: '⚔️' };
  if (n === 'Elite Challenger' || id === 'chal-5') return { type: 'text', text: '50', title: 'ELITE', icon: '⚔️' };
  if (n === 'Champion' || id === 'chal-6') return { type: 'text', text: '100', title: 'CHAMPION', icon: '🏆' };
  if (n === 'Conqueror' || id === 'chal-7') return { type: 'text', text: '500', title: 'CONQUEROR', icon: '👑' };

  // 5. Streak with Numbers
  if (n === '365 No Days Wasted' || id === 'streak-8') return { type: 'text', text: '365', title: 'YEAR STREAK', subText: 'DAYS', icon: '🔥' };
  if (n.startsWith('The Eternal Flame') || id === 'streak-10' || id === 'life-1') {
    return { type: 'flame_number', text: '313', title: 'ETERNAL FLAME', subText: '1000 DAYS', icon: '🔥' };
  }

  // 6. Comeback Achievements (Clean comeback tier designs)
  if (n === 'Not Finished Yet' || id === 'comeback-1') return { type: 'text', text: '100%', title: 'NOT FINISHED YET' };
  if (n === 'Second Wind' || id === 'comeback-2') return { type: 'text', text: '7 DAYS', title: 'SECOND WIND' };
  if (n === 'Rise Again' || id === 'comeback-3') return { type: 'text', text: '30 DAYS', title: 'RISE AGAIN' };
  if (n === 'Unbreakable' || id === 'comeback-4') return { type: 'text', text: '5x', title: 'UNBREAKABLE' };
  if (n === 'ARISE' || id === 'comeback-5') return { type: 'text', text: 'ARISE', title: 'ARISE', subText: '★' };
  if (n.startsWith('The Comeback King') || id === 'comeback-6') return { type: 'text', text: 'KING', title: 'COMEBACK KING', subText: '★' };

  // 7. Infinity Symbols
  if (n.startsWith('Never Back Down') || n === 'Old Friends' || id === 'chal-9' || id === 'life-7' || id === 'ai-6') {
    return { type: 'text', text: '∞' };
  }

  // Default to standard 3D icon
  return { type: 'icon' };
}

export function getRarityLevelColors(rarity: AchievementRarity) {
  switch (rarity) {
    case 'mythic':
      return {
        textGradient: ['#ffffff', '#38bdf8', '#ff69b4'],
        primaryGlow: '#ff49db',
        secondaryGlow: '#00f2fe',
        borderColor: '#f472b6',
        plateColor: '#110926',
        emissiveIntensity: 1.2,
      };
    case 'legendary':
      return {
        textGradient: ['#ffffff', '#fef08a', '#facc15'],
        primaryGlow: '#eab308',
        secondaryGlow: '#ca8a04',
        borderColor: '#fde047',
        plateColor: '#291802',
        emissiveIntensity: 1.0,
      };
    case 'epic':
      return {
        textGradient: ['#ffffff', '#f0abfc', '#c084fc'],
        primaryGlow: '#c084fc',
        secondaryGlow: '#9333ea',
        borderColor: '#e879f9',
        plateColor: '#1e1035',
        emissiveIntensity: 0.9,
      };
    case 'rare':
      return {
        textGradient: ['#ffffff', '#7dd3fc', '#38bdf8'],
        primaryGlow: '#38bdf8',
        secondaryGlow: '#0284c7',
        borderColor: '#60a5fa',
        plateColor: '#0f172a',
        emissiveIntensity: 0.85,
      };
    case 'uncommon':
      return {
        textGradient: ['#ffffff', '#a7f3d0', '#34d399'],
        primaryGlow: '#34d399',
        secondaryGlow: '#059669',
        borderColor: '#6ee7b7',
        plateColor: '#06281e',
        emissiveIntensity: 0.75,
      };
    case 'common':
    default:
      return {
        textGradient: ['#ffffff', '#fde047', '#fbbf24'],
        primaryGlow: '#f59e0b',
        secondaryGlow: '#b45309',
        borderColor: '#fcd34d',
        plateColor: '#2c1810',
        emissiveIntensity: 0.7,
      };
  }
}
