import React, { useMemo } from 'react';
import { AchievementRarity, ModelType } from '../types/achievement.types';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';
import { getAchievementEngraving, getRarityLevelColors } from '../utils/engravingUtils';

interface CardBadgePreviewProps {
  id?: string;
  name: string;
  rarity: AchievementRarity;
  modelType: ModelType;
  category?: string;
  glowColor: string;
  currentProgress?: number;
  targetProgress?: number;
  unlocked: boolean;
  className?: string;
}

function getEmblemSymbol(modelType: ModelType, category?: string): string {
  switch (modelType) {
    case 'flame':
      return 'local_fire_department';
    case 'shield':
      return 'military_tech';
    case 'crown':
      return 'crown';
    case 'trophy':
      return 'workspace_premium';
    case 'swords':
      return 'swords';
    case 'bolt':
      return 'bolt';
    case 'crystal':
      return 'diamond';
    case 'infinity':
      return 'all_inclusive';
    case 'clock':
      return 'timer';
    case 'robot':
    case 'chat':
      return 'smart_toy';
    case 'leaf':
    case 'tree':
      return 'psychology';
    default:
      if (category === 'streak') return 'local_fire_department';
      if (category === 'challenge' || category === 'squad' || category === 'comeback') return 'military_tech';
      if (category === 'task-mastery') return 'emoji_events';
      if (category === 'level-milestones') return 'military_tech';
      if (category === 'ai-companion') return 'smart_toy';
      if (category === 'zero-overdue') return 'timer';
      if (category === 'perfect-performance') return 'auto_awesome';
      return 'military_tech';
  }
}

/**
 * CardBadgePreview renders a luxury minted round collectible medal:
 * - Minted Round Coin Badge with beveled rim and specular lighting
 * - Level-matched vibrant colors and crisp horizontal center engravings
 */
export const CardBadgePreview: React.FC<CardBadgePreviewProps> = ({
  id,
  name,
  rarity,
  modelType,
  category,
  glowColor,
  currentProgress = 0,
  targetProgress = 100,
  unlocked,
  className = '',
}) => {
  const isShield = useMemo(() => {
    // 1. Explicit model types
    if (modelType === 'shield' || modelType === 'phoenix') return true;
    // 2. Shield / Defense based categories
    if (category === 'comeback' || category === 'zero-overdue' || category === 'level-milestones') return true;
    // 3. Specific achievement IDs / names that use defense shield
    if (id && (
      id.startsWith('loyalty-5') ||
      id.startsWith('loyalty-6') ||
      id.startsWith('loyalty-7') ||
      id.startsWith('loyalty-8') ||
      id.startsWith('loyalty-9') ||
      id.startsWith('loyalty-10') ||
      id.startsWith('loyalty-11') ||
      id.startsWith('comeback-') ||
      id.startsWith('zero-') ||
      id.includes('shield')
    )) {
      return true;
    }
    return false;
  }, [modelType, category, id]);
  const rarityMeta = ACHIEVEMENT_RARITIES[rarity] || ACHIEVEMENT_RARITIES.common;
  const progressRatio = targetProgress > 0 ? Math.min(Math.max(currentProgress / targetProgress, 0), 1) : 0;
  const emblemIcon = getEmblemSymbol(modelType, category);
  const engraving = useMemo(() => getAchievementEngraving(name, modelType, category, id), [name, modelType, category, id]);

  const cleanDisplayName = useMemo(() => {
    return name.trim().toUpperCase();
  }, [name]);

  const pathId = useMemo(() => {
    return `arc-${(id || name).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${rarity}`;
  }, [id, name, rarity]);

  const fontSize = useMemo(() => {
    const len = cleanDisplayName.length;
    if (len <= 10) return '8.5px';
    if (len <= 16) return '7.5px';
    if (len <= 22) return '6.8px';
    return '5.8px';
  }, [cleanDisplayName]);

  // Rarity Theme Colors & Metallic Gradients
  const theme = useMemo(() => {
    switch (rarity) {
      case 'mythic':
        return {
          rimGrad: 'from-pink-300 via-sky-200 to-purple-400',
          innerGrad: unlocked ? 'from-slate-900 via-purple-950 to-pink-950' : 'from-slate-800 to-slate-900',
          emblemGrad: 'from-white via-pink-200 to-sky-300',
          glow: 'rgba(255, 73, 219, 0.6)',
          textGrad: '#ffffff',
          bevel: 'border-pink-300/80',
          centerBg: 'bg-gradient-to-br from-pink-950/80 to-purple-950/90 border-pink-400/50',
          centerTextGrad: 'from-white via-sky-200 to-pink-300',
          wingColor: 'text-pink-300/70',
        };
      case 'legendary':
        return {
          rimGrad: 'from-amber-200 via-yellow-300 to-amber-500',
          innerGrad: unlocked ? 'from-amber-950/90 via-yellow-950 to-amber-900' : 'from-slate-800 to-slate-900',
          emblemGrad: 'from-white via-yellow-200 to-amber-400',
          glow: 'rgba(250, 204, 21, 0.6)',
          textGrad: '#fef08a',
          bevel: 'border-yellow-300/90',
          centerBg: 'bg-gradient-to-br from-amber-950/90 to-yellow-950/90 border-yellow-400/60',
          centerTextGrad: 'from-white via-yellow-200 to-amber-300',
          wingColor: 'text-amber-300/70',
        };
      case 'epic':
        return {
          rimGrad: 'from-purple-200 via-fuchsia-300 to-indigo-500',
          innerGrad: unlocked ? 'from-purple-950/90 via-indigo-950 to-fuchsia-950' : 'from-slate-800 to-slate-900',
          emblemGrad: 'from-white via-fuchsia-200 to-purple-400',
          glow: 'rgba(192, 132, 252, 0.55)',
          textGrad: '#f0abfc',
          bevel: 'border-purple-300/80',
          centerBg: 'bg-gradient-to-br from-purple-950/90 to-fuchsia-950/90 border-fuchsia-400/50',
          centerTextGrad: 'from-white via-fuchsia-200 to-purple-300',
          wingColor: 'text-fuchsia-300/70',
        };
      case 'rare':
        return {
          rimGrad: 'from-sky-200 via-blue-300 to-indigo-500',
          innerGrad: unlocked ? 'from-blue-950/90 via-sky-950 to-indigo-950' : 'from-slate-800 to-slate-900',
          emblemGrad: 'from-white via-sky-200 to-blue-400',
          glow: 'rgba(56, 189, 248, 0.55)',
          textGrad: '#7dd3fc',
          bevel: 'border-sky-300/80',
          centerBg: 'bg-gradient-to-br from-sky-950/90 to-blue-950/90 border-sky-400/50',
          centerTextGrad: 'from-white via-sky-200 to-blue-300',
          wingColor: 'text-sky-300/70',
        };
      case 'uncommon':
        return {
          rimGrad: 'from-emerald-200 via-teal-300 to-emerald-500',
          innerGrad: unlocked ? 'from-emerald-950/90 via-teal-950 to-emerald-900' : 'from-slate-800 to-slate-900',
          emblemGrad: 'from-white via-emerald-200 to-teal-400',
          glow: 'rgba(52, 211, 153, 0.55)',
          textGrad: '#a7f3d0',
          bevel: 'border-emerald-300/80',
          centerBg: 'bg-gradient-to-br from-emerald-950/90 to-teal-950/90 border-emerald-400/50',
          centerTextGrad: 'from-white via-emerald-200 to-teal-300',
          wingColor: 'text-emerald-300/70',
        };
      case 'common':
      default:
        return {
          rimGrad: 'from-amber-400 via-amber-600 to-amber-800',
          innerGrad: unlocked ? 'from-stone-900 via-amber-950 to-stone-900' : 'from-slate-800 to-slate-900',
          emblemGrad: 'from-white via-amber-200 to-amber-400',
          glow: 'rgba(245, 158, 11, 0.5)',
          textGrad: '#fef08a',
          bevel: 'border-amber-400/80',
          centerBg: 'bg-gradient-to-br from-amber-950/90 to-stone-900 border-amber-400/60',
          centerTextGrad: 'from-white via-amber-200 to-amber-400',
          wingColor: 'text-amber-400/70',
        };
    }
  }, [rarity, unlocked]);

  // Center Content Renderer (Shared for both Shield and Coin formats)
  const renderCenterContent = () => {
    if (engraving.type === 'text') {
      const textLen = (engraving.text || '').length;
      let textClass = 'text-xs';
      if (textLen <= 3) textClass = 'text-[13px]';
      else if (textLen <= 5) textClass = 'text-[11.5px]';
      else if (textLen <= 6) textClass = 'text-[10px]';
      else textClass = 'text-[8.5px]';

      return (
        <div className="flex flex-col items-center justify-center leading-none text-center">
          <span
            className={`font-black tracking-tight leading-none ${textClass} ${
              unlocked
                ? `bg-gradient-to-b ${theme.centerTextGrad} bg-clip-text text-transparent drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]`
                : 'text-slate-400'
            }`}
          >
            {engraving.text}
          </span>
          {engraving.subText && (
            <span
              className={`text-[7px] font-black uppercase tracking-tighter mt-0.5 ${
                unlocked ? 'text-amber-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-slate-500'
              }`}
            >
              {engraving.subText}
            </span>
          )}
        </div>
      );
    }
    if (engraving.type === 'flame_number') {
      return (
        <div className="relative flex items-center justify-center">
          <span
            className={`material-symbols-outlined text-xl sm:text-[22px] ${
              unlocked
                ? `bg-gradient-to-b ${theme.emblemGrad} bg-clip-text text-transparent drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]`
                : 'text-slate-500'
            }`}
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
          >
            local_fire_department
          </span>
          <span className="absolute text-[7px] font-black text-white bottom-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {engraving.text}
          </span>
        </div>
      );
    }
    return (
      <span
        className={`material-symbols-outlined text-xl sm:text-[22px] transition-transform duration-300 group-hover/badge:scale-110 ${
          unlocked
            ? `bg-gradient-to-b ${theme.emblemGrad} bg-clip-text text-transparent drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]`
            : 'text-slate-500'
        }`}
        style={{
          fontVariationSettings: "'FILL' 1, 'wght' 700",
        }}
      >
        {emblemIcon}
      </span>
    );
  };

  return (
    <div className={`relative flex items-center justify-center select-none group/badge ${className}`}>
      {/* Dynamic Ambient Aura Glow */}
      {(unlocked || progressRatio > 0) && (
        <div
          className="absolute inset-0 rounded-full blur-xl transition-all duration-500 opacity-45 group-hover/badge:opacity-80 scale-110 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${glowColor || theme.glow} 0%, transparent 70%)`,
          }}
        />
      )}

      {isShield ? (
        // ---------------------------------------------------------------------
        // PHOENIX GUARDIAN SHIELD MEDAL (Comeback & Level Milestone categories)
        // Clean heraldic shield with neon plumage wings and centered level plaque
        // ---------------------------------------------------------------------
        <div className="relative w-18 h-20 sm:w-20 sm:h-22 flex items-center justify-center group-hover/badge:scale-105 group-hover/badge:-translate-y-0.5 transition-transform duration-300">
          <svg viewBox="0 0 110 120" className="w-full h-full drop-shadow-2xl overflow-visible pointer-events-none">
            <defs>
              {/* Neon Plumage Gradients */}
              <linearGradient id={`cyanWingGrad-${id || name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="100%" stopColor="#0077b6" />
              </linearGradient>
              <linearGradient id={`azureWingGrad-${id || name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2979ff" />
                <stop offset="100%" stopColor="#3a86ff" />
              </linearGradient>
              <linearGradient id={`purpleWingGrad-${id || name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c4dff" />
                <stop offset="100%" stopColor="#8338ec" />
              </linearGradient>
              <linearGradient id={`magentaWingGrad-${id || name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff007f" />
                <stop offset="100%" stopColor="#ff006e" />
              </linearGradient>
              <linearGradient id={`goldWingGrad-${id || name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff59d" />
                <stop offset="100%" stopColor="#ffbe0b" />
              </linearGradient>

              {/* Gold to Magenta Beveled Shield Rim Gradient */}
              <linearGradient id={`phoenixShieldRimGrad-${id || name}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#ff007f" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>

              {/* Inner Dark Obsidian Navy Plate Gradient */}
              <linearGradient id={`phoenixShieldInnerGrad-${id || name}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={unlocked ? '#1e1035' : '#1e293b'} />
                <stop offset="100%" stopColor={unlocked ? '#080312' : '#0f172a'} />
              </linearGradient>

              {/* Top Curved Text Arc Path - Smooth wide arc along shield crest */}
              <path id={`phoenixTextArc-${id || name}`} d="M 18 38 Q 55 14 92 38" fill="none" />
            </defs>

            {/* SYMMETRICAL NEON WINGS (Flanking Shield Behind Chassis) */}
            <g opacity={unlocked ? 1.0 : 0.45}>
              {/* Left Wing Pinions */}
              <path d="M 32 86 C 22 88, 14 80, 10 72 C 18 72, 26 78, 32 82 Z" fill={`url(#cyanWingGrad-${id || name})`} />
              <path d="M 28 72 C 16 68, 8 58, 6 48 C 16 50, 24 58, 28 64 Z" fill={`url(#azureWingGrad-${id || name})`} />
              <path d="M 26 56 C 14 48, 8 36, 8 26 C 18 30, 24 40, 26 48 Z" fill={`url(#purpleWingGrad-${id || name})`} />
              <path d="M 26 42 C 16 30, 12 18, 14 10 C 22 16, 26 26, 26 34 Z" fill={`url(#magentaWingGrad-${id || name})`} />
              <path d="M 28 28 C 20 16, 18 6, 24 2 C 28 10, 30 18, 28 24 Z" fill={`url(#goldWingGrad-${id || name})`} />

              {/* Right Wing Pinions (Mirrored) */}
              <g transform="translate(110, 0) scale(-1, 1)">
                <path d="M 32 86 C 22 88, 14 80, 10 72 C 18 72, 26 78, 32 82 Z" fill={`url(#cyanWingGrad-${id || name})`} />
                <path d="M 28 72 C 16 68, 8 58, 6 48 C 16 50, 24 58, 28 64 Z" fill={`url(#azureWingGrad-${id || name})`} />
                <path d="M 26 56 C 14 48, 8 36, 8 26 C 18 30, 24 40, 26 48 Z" fill={`url(#purpleWingGrad-${id || name})`} />
                <path d="M 26 42 C 16 30, 12 18, 14 10 C 22 16, 26 26, 26 34 Z" fill={`url(#magentaWingGrad-${id || name})`} />
                <path d="M 28 28 C 20 16, 18 6, 24 2 C 28 10, 30 18, 28 24 Z" fill={`url(#goldWingGrad-${id || name})`} />
              </g>
            </g>

            {/* GOLDEN-TO-MAGENTA BEVELED HERALDIC SHIELD CHASSIS */}
            <path
              d="M 55 8 L 88 22 C 92 56, 82 90, 55 108 C 28 90, 18 56, 22 22 Z"
              fill={unlocked ? `url(#phoenixShieldRimGrad-${id || name})` : '#334155'}
              stroke={unlocked ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.15)'}
              strokeWidth="1.2"
              style={{
                filter: unlocked ? `drop-shadow(0 4px 14px ${theme.glow})` : 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
              }}
            />

            {/* OUTER BEVELED INSET GROOVE */}
            <path
              d="M 55 12 L 84 25 C 88 56, 78 87, 55 103 C 32 87, 22 56, 26 25 Z"
              fill="none"
              stroke="rgba(0, 0, 0, 0.45)"
              strokeWidth="1"
            />

            {/* INNER OBSIDIAN NAVY SHIELD PLATE */}
            <path
              d="M 55 15 L 81 27 C 84 56, 75 84, 55 99 C 35 84, 26 56, 29 27 Z"
              fill={`url(#phoenixShieldInnerGrad-${id || name})`}
              stroke={unlocked ? '#fde047' : '#475569'}
              strokeWidth="1"
              strokeOpacity={unlocked ? 0.6 : 0.3}
            />

            {/* TOP ENGRAVED CURVED TEXT ARC */}
            <text
              fill={unlocked ? theme.textGrad : '#94a3b8'}
              fontSize={cleanDisplayName.length > 14 ? '6px' : cleanDisplayName.length > 10 ? '6.8px' : '7.5px'}
              fontWeight="900"
              letterSpacing="0.4px"
              style={{
                filter: unlocked
                  ? 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.95)) drop-shadow(0 0 3px rgba(255,255,255,0.4))'
                  : 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
              }}
            >
              <textPath href={`#phoenixTextArc-${id || name}`} startOffset="50%" textAnchor="middle">
                {cleanDisplayName}
              </textPath>
            </text>
          </svg>

          {/* Central Circular Plaque - Perfectly Centered in Shield Body */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 pt-1">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center border shadow-inner ${
                unlocked ? `${theme.centerBg} shadow-md` : 'border-white/5 bg-black/40'
              }`}
            >
              {renderCenterContent()}
            </div>
          </div>

          {/* Bottom Rarity Tag at Shield Apex */}
          <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-[6.5px] font-black uppercase tracking-widest text-slate-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
              {rarityMeta.label}
            </span>
          </div>

          {/* Diagonal Metallic Specular Glint */}
          <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/15 to-transparent rotate-45 pointer-events-none transition-transform duration-700 group-hover/badge:translate-x-full" />
        </div>
      ) : (
        // ---------------------------------------------------------------------
        // STANDARD MINTED COIN BADGE (Other categories)
        // ---------------------------------------------------------------------
        <div
          className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 bg-gradient-to-br ${theme.rimGrad} shadow-lg transition-transform duration-300 group-hover/badge:scale-105 group-hover/badge:-translate-y-0.5 flex items-center justify-center`}
          style={{
            boxShadow: unlocked
              ? `0 4px 16px -1px ${theme.glow}, inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.6)`
              : '0 3px 8px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 3px rgba(0,0,0,0.4)',
          }}
        >
          {/* Beveled Outer Coin Rim with Grooves */}
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${theme.innerGrad} p-0.5 flex flex-col items-center justify-between relative overflow-hidden border ${theme.bevel} shadow-inner`}>
            {/* Top Engraved Curved Text Arc rendered with SVG textPath */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <defs>
                  <path id={pathId} d="M 15 48 A 35 35 0 0 1 85 48" fill="none" />
                </defs>
                <text
                  fill={unlocked ? theme.textGrad : '#94a3b8'}
                  fontSize={fontSize}
                  fontWeight="900"
                  letterSpacing="0.5px"
                  style={{
                    filter: unlocked
                      ? 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.95)) drop-shadow(0 0 3px rgba(255,255,255,0.4))'
                      : 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
                  }}
                >
                  <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                    {cleanDisplayName}
                  </textPath>
                </text>
              </svg>
            </div>

            {/* Central 3D Sculpted Emblem OR Engraved Number Plaque */}
            <div className="relative flex items-center justify-center my-auto z-5 mt-2.5">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex flex-col items-center justify-center border shadow-inner ${
                  unlocked ? `${theme.centerBg} shadow-sm` : 'border-white/5 bg-black/30'
                }`}
              >
                {renderCenterContent()}
              </div>
            </div>

            {/* Bottom Rarity Pill on Coin */}
            <div className="w-full pb-0.5 flex items-center justify-center z-10">
              <span className="text-[7px] font-black uppercase tracking-widest text-slate-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {rarityMeta.label}
              </span>
            </div>

            {/* Diagonal Metallic Specular Glint */}
            <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/20 to-transparent rotate-45 pointer-events-none transition-transform duration-700 group-hover/badge:translate-x-full" />
          </div>
        </div>
      )}
    </div>
  );
};
