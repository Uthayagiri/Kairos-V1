import { AchievementRarity } from '../types/achievement.types';

export type Rarity = AchievementRarity;

export interface SlotMaterialConfig {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;   // glass/crystal look (epic)
  thickness?: number;
  ior?: number;
  iridescence?: number;    // oil-slick / holographic look (mythic)
  iridescenceIOR?: number;
  emissive?: string;
}

export interface RarityConfig {
  label: string;
  auraColor: string;
  auraColorSecondary?: string; // mythic gets a two-tone shifting aura
  glowRange: [number, number]; // [progress=0 emissive intensity, progress=1 emissive intensity]
  bloomIntensity: number;      // postprocessing bloom strength at full progress
  particleCount: number;       // ambient sparkle density, 0 = none
  particleColors: [string, string, string]; // 3 distinct colors for the 3 emission levels
  ringPulseSpeed: number;      // aura shell pulse animation speed
  textColor: string;           // engraved/embroidered text base color
  textAccentColor: string;     // text highlight color
  materials: {
    Rarity_Primary: SlotMaterialConfig;
    Rarity_Accent: SlotMaterialConfig;
    Rarity_Ribbon: SlotMaterialConfig;
  };
}

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: {
    label: 'Common',
    auraColor: '#f59e0b',
    glowRange: [0.12, 0.45],
    bloomIntensity: 0.25,
    particleCount: 18,
    particleColors: ['#fbbf24', '#f59e0b', '#d97706'], // Amber spark, radiant gold, warm copper
    ringPulseSpeed: 0.5,
    textColor: '#ffffff',
    textAccentColor: '#fde047',
    materials: {
      Rarity_Primary: { color: '#9a582c', metalness: 0.85, roughness: 0.35, clearcoat: 0.4 },
      Rarity_Accent:  { color: '#fbbf24', metalness: 0.9, roughness: 0.15, clearcoat: 0.6, emissive: '#b45309' },
      Rarity_Ribbon:  { color: '#5c2c12', metalness: 0.2, roughness: 0.65 },
    },
  },
  uncommon: {
    label: 'Uncommon',
    auraColor: '#10b981',
    glowRange: [0.15, 0.6],
    bloomIntensity: 0.4,
    particleCount: 26,
    particleColors: ['#a7f3d0', '#34d399', '#059669'], // Mint core, emerald stream, forest mist
    ringPulseSpeed: 0.7,
    textColor: '#ffffff',
    textAccentColor: '#6ee7b7',
    materials: {
      Rarity_Primary: { color: '#9ca3af', metalness: 0.95, roughness: 0.25, clearcoat: 0.5, clearcoatRoughness: 0.2 },
      Rarity_Accent:  { color: '#34d399', metalness: 0.75, roughness: 0.15, clearcoat: 0.6, emissive: '#059669' },
      Rarity_Ribbon:  { color: '#14532d', metalness: 0.15, roughness: 0.6 },
    },
  },
  rare: {
    label: 'Rare',
    auraColor: '#38bdf8',
    glowRange: [0.18, 0.75],
    bloomIntensity: 0.6,
    particleCount: 38,
    particleColors: ['#bae6fd', '#38bdf8', '#2563eb'], // Cyan ice, royal sapphire, electric azure
    ringPulseSpeed: 1.0,
    textColor: '#ffffff',
    textAccentColor: '#7dd3fc',
    materials: {
      Rarity_Primary: { color: '#2563eb', metalness: 0.95, roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.1 },
      Rarity_Accent:  { color: '#7dd3fc', metalness: 0.8, roughness: 0.12, clearcoat: 0.8, emissive: '#0284c7' },
      Rarity_Ribbon:  { color: '#1e3a8a', metalness: 0.2, roughness: 0.5 },
    },
  },
  epic: {
    label: 'Epic',
    auraColor: '#c084fc',
    glowRange: [0.22, 0.95],
    bloomIntensity: 0.85,
    particleCount: 52,
    particleColors: ['#f0abfc', '#c084fc', '#9333ea'], // Neon pink, violet ring, cosmic purple
    ringPulseSpeed: 1.3,
    textColor: '#ffffff',
    textAccentColor: '#f0abfc',
    materials: {
      Rarity_Primary: { color: '#7e22ce', metalness: 0.95, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.1 },
      Rarity_Accent:  { color: '#f0abfc', metalness: 0.75, roughness: 0.08, transmission: 0.4, thickness: 0.4, emissive: '#9333ea' },
      Rarity_Ribbon:  { color: '#581c87', metalness: 0.2, roughness: 0.45 },
    },
  },
  legendary: {
    label: 'Legendary',
    auraColor: '#facc15',
    glowRange: [0.3, 1.15],
    bloomIntensity: 1.15,
    particleCount: 68,
    particleColors: ['#ffffff', '#fef08a', '#eab308'], // Pure white spark, solar gold, molten core
    ringPulseSpeed: 1.7,
    textColor: '#ffffff',
    textAccentColor: '#fef08a',
    materials: {
      Rarity_Primary: { color: '#eab308', metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04 },
      Rarity_Accent:  { color: '#ffffff', metalness: 0.9, roughness: 0.05, clearcoat: 1, emissive: '#ca8a04' },
      Rarity_Ribbon:  { color: '#854d0e', metalness: 0.2, roughness: 0.35 },
    },
  },
  mythic: {
    label: 'Mythic',
    auraColor: '#ff49db',
    auraColorSecondary: '#00f2fe',
    glowRange: [0.4, 1.45],
    bloomIntensity: 1.5,
    particleCount: 90,
    particleColors: ['#ffffff', '#38bdf8', '#ff49db'], // Prismatic laser cyan, celestial pink, star white
    ringPulseSpeed: 2.4,
    textColor: '#ffffff',
    textAccentColor: '#38bdf8',
    materials: {
      Rarity_Primary: { color: '#f1f5f9', metalness: 1, roughness: 0.05, iridescence: 1, iridescenceIOR: 2.2 },
      Rarity_Accent:  { color: '#ffffff', metalness: 0.85, roughness: 0.02, iridescence: 1, iridescenceIOR: 2.5, emissive: '#ff49db' },
      Rarity_Ribbon:  { color: '#3b0764', metalness: 0.3, roughness: 0.25, iridescence: 0.8, iridescenceIOR: 1.8 },
    },
  },
};

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
