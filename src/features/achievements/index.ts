// Components
export * from './components/AchievementGallery';
export * from './components/AchievementCard';
export * from './components/AchievementDetail';
export * from './components/AchievementFilters';
export * from './components/AchievementScene';
export * from './components/AchievementModel';
export * from './components/GlowController';
export * from './components/AchievementParticles';
export * from './components/UnlockAnimation';
export * from './components/CardBadgePreview';
export * from './components/PhoenixWingsMedalAnimation';

// 3D Engine Subsystem
export * from './3d/AchievementViewer';
export * from './3d/rarityConfig';
export * from './3d/CurvedTextRing';
export * from './3d/AuraShell';
export * from './3d/useUnlockAnimation';
export {
  AchievementModel as GLBAchievementModel,
  type AchievementModelProps as GLBAchievementModelProps
} from './3d/AchievementModel';
export {
  AchievementParticles as GLBAchievementParticles
} from './3d/AchievementParticles';

// Data
export * from './data/achievements';
export * from './data/categories';
export * from './data/rarities';

// Hooks
export * from './hooks/useAchievementProgress';
export * from './hooks/useAchievementGlow';
export * from './hooks/useAchievementModels';

// Utils
export * from './utils/glowCalculator';
export * from './utils/achievementHelpers';

// Types
export * from './types/achievement.types';
