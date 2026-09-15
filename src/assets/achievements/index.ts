/**
 * Kairos 3D Achievement Assets Registry
 *
 * This directory holds 3D model definitions, GLTF/GLB binaries, and procedural fallback configurations
 * for achievement trophies (Shield, Flame, Crown, Trophy, Bolt, Crystal, Laurel, Star, Portal).
 */

export const ACHIEVEMENT_ASSET_PATHS = {
  shield: '/src/assets/achievements/shield.glb',
  flame: '/src/assets/achievements/flame.glb',
  crown: '/src/assets/achievements/crown.glb',
  trophy: '/src/assets/achievements/trophy.glb',
  bolt: '/src/assets/achievements/bolt.glb',
  crystal: '/src/assets/achievements/crystal.glb',
  laurel: '/src/assets/achievements/laurel.glb',
  star: '/src/assets/achievements/star.glb',
  portal: '/src/assets/achievements/portal.glb'
} as const;

export default ACHIEVEMENT_ASSET_PATHS;
