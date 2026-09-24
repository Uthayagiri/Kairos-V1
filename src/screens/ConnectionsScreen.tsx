import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppTopBar } from '../components/AppTopBar';

export interface ConnectionsScreenProps {
  userProfile?: { email: string; name: string } | null;
  initialScannedUser?: string | null;
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export interface FriendAchievement {
  id: string;
  title: string;
  category: 'streak' | 'focus' | 'rhythm' | 'squad' | 'relic';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  icon: string;
  iconBg: string;
  description: string;
  unlockedDate: string;
  xpReward: number;
}

export interface RadarMetric {
  label: string;
  key: string;
  value: number; // 0 to 100
  description: string;
}

export interface ProfileVisibilitySettings {
  whoCanSee: 'everyone' | 'squad_connections' | 'connections_only' | 'private';
  showLevel: boolean;
  showMonthlyTasks: boolean;
  showMonthlyHp: boolean;
  showWebGraph: boolean;
  showTopAchievements: boolean;
  showLiveStatus: boolean;
}

export interface ConnectionUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: string;
  league: string;
  status: 'focusing' | 'online' | 'resting' | 'offline';
  statusDetail: string;
  tandemStreak: number;
  sharedFocusHours: number;
  synergyMatch: number; // percentage e.g. 96
  mutualSquads: string[];
  lastActive: string;
  isPrimaryBuddy?: boolean;

  // Rich Profile Attributes
  level: number;
  levelTitle: string;
  currentXp: number;
  nextLevelXp: number;
  monthlyTasksCompleted: number;
  monthlyTasksGrowth: string; // e.g. "+18%"
  monthlyHpEarned: number;
  radarMetrics: RadarMetric[];
  topAchievements: FriendAchievement[];
  visibilitySettings: ProfileVisibilitySettings;
}

export interface PendingRequest {
  id: string;
  name: string;
  username: string;
  avatar: string;
  headline: string;
  note?: string;
  mutualCount: number;
  synergyMatch: number;
  timestamp: string;
  type: 'incoming' | 'outgoing';
}

export interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  headline: string;
  synergyMatch: number;
  commonRoutine: string;
  mutualFriends: number;
  hasSentRequest?: boolean;
}

// Authentic ISO/IEC 18004 Standard SVG QR Code Generator for Kairos Users
// Supports direct scanning with Google Lens, iOS Camera, Samsung Camera & In-App Scanners
export const UniqueQRCodeSVG: React.FC<{
  seed: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  centerBadgeText?: string;
  className?: string;
}> = ({
  seed,
  size = 160,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  centerBadgeText,
  className = ''
}) => {
  // Determine standard web deep-link URL so Google Lens and external camera scanners can decode & open profile directly
  const payload = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'http://localhost:3000';
    const cleanSeed = (seed || 'alex.kairos').trim();
    if (cleanSeed.startsWith('http://') || cleanSeed.startsWith('https://')) {
      return cleanSeed;
    }
    const cleanHandle = cleanSeed.replace(/^@/, '');
    return `${origin}/?profile=${encodeURIComponent(cleanHandle)}`;
  }, [seed]);

  const qrData = useMemo(() => {
    try {
      // Use Error Correction Level 'H' (High - 30% recovery) so center logo badge overlay doesn't prevent scanning
      const qr = QRCode.create(payload, {
        errorCorrectionLevel: 'H'
      });
      return {
        modulesSize: qr.modules.size,
        getModule: (r: number, c: number) => qr.modules.get(r, c) === 1
      };
    } catch (err) {
      console.error('Failed to generate standard QR code for payload:', payload, err);
      return null;
    }
  }, [payload]);

  if (!qrData) {
    return (
      <div
        className={`inline-flex items-center justify-center p-2.5 rounded-2xl bg-white shadow-md border border-slate-200 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-slate-400">Loading QR...</span>
      </div>
    );
  }

  const gridSize = qrData.modulesSize;
  const margin = 2; // Standard QR quiet zone (2 modules)
  const totalGrid = gridSize + margin * 2;
  const cellSize = size / totalGrid;
  const badgeSize = Math.max(20, Math.round(size * 0.20));

  // Center coordinates for optional badge cutout
  const centerModuleMin = Math.floor(gridSize / 2) - 2;
  const centerModuleMax = Math.floor(gridSize / 2) + 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center p-2.5 rounded-2xl bg-white shadow-md border border-slate-200 select-none ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="crispEdges"
        className="overflow-hidden"
      >
        {/* Background Quiet Zone */}
        <rect width={size} height={size} fill={bgColor} rx="8" />

        {/* QR Modules */}
        {Array.from({ length: gridSize }).map((_, r) =>
          Array.from({ length: gridSize }).map((_, c) => {
            if (
              centerBadgeText &&
              r >= centerModuleMin &&
              r <= centerModuleMax &&
              c >= centerModuleMin &&
              c <= centerModuleMax
            ) {
              return null;
            }

            if (!qrData.getModule(r, c)) return null;

            const x = (c + margin) * cellSize;
            const y = (r + margin) * cellSize;
            const s = cellSize;

            return (
              <rect
                key={`${r}-${c}`}
                x={x}
                y={y}
                width={s}
                height={s}
                fill={fgColor}
              />
            );
          })
        )}
      </svg>

      {/* Center Kairos Identity Badge */}
      {centerBadgeText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            style={{ width: badgeSize, height: badgeSize }}
            className="rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 border-2 border-white shadow-md flex items-center justify-center text-white font-black font-serif text-[11px]"
          >
            {centerBadgeText}
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Monthly SVG Web / Radar Graph (Spider Chart)
export const MonthlyWebGraph: React.FC<{
  metrics: RadarMetric[];
  size?: number;
}> = ({ metrics, size = 230 }) => {
  const center = size / 2;
  const radius = size * 0.33; // leaves breathing room for labels
  const total = metrics.length;

  const getCoordinates = (index: number, val: number, r: number = radius) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    const factor = Math.max(10, Math.min(100, val)) / 100;
    const x = center + r * factor * Math.cos(angle);
    const y = center + r * factor * Math.sin(angle);
    return { x, y, angle };
  };

  const levels = [0.25, 0.5, 0.75, 1.0];

  const polygonPoints = metrics
    .map((m, i) => {
      const { x, y } = getCoordinates(i, m.value);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center justify-center relative w-full py-2">
      <svg width={size} height={size} className="overflow-visible select-none">
        {/* Concentric Web Grid Rings */}
        {levels.map((lvl, lvlIdx) => {
          const ringPoints = metrics
            .map((_, i) => {
              const { x, y } = getCoordinates(i, lvl * 100, radius);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={`ring-${lvlIdx}`}
              points={ringPoints}
              fill={lvlIdx % 2 === 0 ? 'rgba(99, 102, 241, 0.04)' : 'transparent'}
              stroke="rgba(148, 163, 184, 0.28)"
              strokeWidth={lvl === 1.0 ? '1.5' : '1'}
              strokeDasharray={lvl < 1.0 ? '3,3' : undefined}
            />
          );
        })}

        {/* Spoke Axis Lines */}
        {metrics.map((_, i) => {
          const { x, y } = getCoordinates(i, 100, radius);
          return (
            <line
              key={`spoke-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(148, 163, 184, 0.35)"
              strokeWidth="1"
            />
          );
        })}

        {/* Shaded Area with Gradient */}
        <defs>
          <radialGradient id="radarWebGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#6366f1" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.15" />
          </radialGradient>
        </defs>
        <polygon
          points={polygonPoints}
          fill="url(#radarWebGradient)"
          stroke="#4f46e5"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="drop-shadow-[0_2px_10px_rgba(79,70,229,0.35)]"
        />

        {/* Vertex Points & Labels */}
        {metrics.map((m, i) => {
          const { x, y } = getCoordinates(i, m.value);
          const labelCoord = getCoordinates(i, 130, radius);
          const isRight = labelCoord.x > center + 8;
          const isLeft = labelCoord.x < center - 8;
          const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle';

          return (
            <g key={`vertex-${i}`}>
              {/* Vertex Dot */}
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill="#ffffff"
                stroke="#4338ca"
                strokeWidth="2"
                className="drop-shadow-xs"
              />
              {/* Label Text */}
              <text
                x={labelCoord.x}
                y={labelCoord.y - 3}
                textAnchor={textAnchor}
                className="text-[10px] font-bold fill-slate-700 font-sans tracking-tight"
              >
                {m.label}
              </text>
              {/* Value Text */}
              <text
                x={labelCoord.x}
                y={labelCoord.y + 8}
                textAnchor={textAnchor}
                className="text-[9px] font-extrabold fill-indigo-600 font-sans"
              >
                {m.value}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export interface HourlyUsage {
  hour: number; // 0 - 23
  label: string; // e.g. "10 AM"
  usedMinutes: number; // 0 - 60
  deepFocusMinutes: number;
  mindfulMinutes: number;
  socialMinutes: number;
  topApps: { name: string; minutes: number }[];
  isPeak?: boolean;
  phase: string;
}

export const generateUser24hTimeline = (seedName: string = 'Alex Rivera'): HourlyUsage[] => {
  return [
    { hour: 0, label: '12 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
    { hour: 1, label: '1 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
    { hour: 2, label: '2 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
    { hour: 3, label: '3 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
    { hour: 4, label: '4 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
    { hour: 5, label: '5 AM', usedMinutes: 0, deepFocusMinutes: 0, mindfulMinutes: 0, socialMinutes: 0, topApps: [], phase: 'Rest & Sleep' },
    { hour: 6, label: '6 AM', usedMinutes: 8, deepFocusMinutes: 0, mindfulMinutes: 6, socialMinutes: 2, topApps: [{ name: 'Kairos Companion', minutes: 6 }, { name: 'Messages', minutes: 2 }], phase: 'Morning Wakeup' },
    { hour: 7, label: '7 AM', usedMinutes: 18, deepFocusMinutes: 8, mindfulMinutes: 7, socialMinutes: 3, topApps: [{ name: 'Kindle Reader', minutes: 7 }, { name: 'Notion', minutes: 8 }, { name: 'Messages', minutes: 3 }], phase: 'Morning Habit Routine' },
    { hour: 8, label: '8 AM', usedMinutes: 34, deepFocusMinutes: 22, mindfulMinutes: 8, socialMinutes: 4, topApps: [{ name: 'Notion Workspace', minutes: 18 }, { name: 'Kairos Companion', minutes: 8 }], phase: 'Cognitive Ramp-up' },
    { hour: 9, label: '9 AM', usedMinutes: 48, deepFocusMinutes: 38, mindfulMinutes: 6, socialMinutes: 4, topApps: [{ name: 'Notion Workspace', minutes: 26 }, { name: 'VS Code & Docs', minutes: 16 }], isPeak: true, phase: '⚡ Peak Deep Work' },
    { hour: 10, label: '10 AM', usedMinutes: 56, deepFocusMinutes: 46, mindfulMinutes: 4, socialMinutes: 6, topApps: [{ name: 'Notion Workspace', minutes: 32 }, { name: 'Slack & Squad', minutes: 14 }, { name: 'Kairos', minutes: 10 }], isPeak: true, phase: '⚡ Primary Focus Peak' },
    { hour: 11, label: '11 AM', usedMinutes: 42, deepFocusMinutes: 30, mindfulMinutes: 6, socialMinutes: 6, topApps: [{ name: 'Notion Workspace', minutes: 22 }, { name: 'Slack & Squad', minutes: 12 }], phase: 'Late Morning Flow' },
    { hour: 12, label: '12 PM', usedMinutes: 24, deepFocusMinutes: 4, mindfulMinutes: 12, socialMinutes: 8, topApps: [{ name: 'YouTube & Shorts', minutes: 12 }, { name: 'Messages', minutes: 8 }], phase: '☕ Lunch & Rest Interval' },
    { hour: 13, label: '1 PM', usedMinutes: 32, deepFocusMinutes: 18, mindfulMinutes: 8, socialMinutes: 6, topApps: [{ name: 'Notion Workspace', minutes: 14 }, { name: 'Kindle Reader', minutes: 10 }], phase: 'Midday Re-alignment' },
    { hour: 14, label: '2 PM', usedMinutes: 52, deepFocusMinutes: 40, mindfulMinutes: 4, socialMinutes: 8, topApps: [{ name: 'Notion Workspace', minutes: 28 }, { name: 'VS Code & Docs', minutes: 18 }], isPeak: true, phase: '⚡ Afternoon Focus Peak' },
    { hour: 15, label: '3 PM', usedMinutes: 46, deepFocusMinutes: 34, mindfulMinutes: 6, socialMinutes: 6, topApps: [{ name: 'Notion Workspace', minutes: 24 }, { name: 'Slack & Squad', minutes: 14 }], isPeak: true, phase: '⚡ Afternoon Deep Flow' },
    { hour: 16, label: '4 PM', usedMinutes: 36, deepFocusMinutes: 24, mindfulMinutes: 6, socialMinutes: 6, topApps: [{ name: 'Notion Workspace', minutes: 18 }, { name: 'Messages', minutes: 10 }], phase: 'Focus Wrap-up' },
    { hour: 17, label: '5 PM', usedMinutes: 26, deepFocusMinutes: 10, mindfulMinutes: 10, socialMinutes: 6, topApps: [{ name: 'Kairos Companion', minutes: 10 }, { name: 'Instagram Feed', minutes: 8 }], phase: 'Day Transition & Rest' },
    { hour: 18, label: '6 PM', usedMinutes: 18, deepFocusMinutes: 2, mindfulMinutes: 8, socialMinutes: 8, topApps: [{ name: 'Messages & Squad', minutes: 10 }, { name: 'Instagram Feed', minutes: 6 }], phase: 'Social Connection' },
    { hour: 19, label: '7 PM', usedMinutes: 28, deepFocusMinutes: 4, mindfulMinutes: 14, socialMinutes: 10, topApps: [{ name: 'YouTube & Shorts', minutes: 16 }, { name: 'Messages', minutes: 8 }], phase: 'Evening Wind-down' },
    { hour: 20, label: '8 PM', usedMinutes: 38, deepFocusMinutes: 6, mindfulMinutes: 24, socialMinutes: 8, topApps: [{ name: 'Kindle Reader', minutes: 22 }, { name: 'Kairos Companion', minutes: 10 }], isPeak: true, phase: '📖 Mindful Reading Peak' },
    { hour: 21, label: '9 PM', usedMinutes: 22, deepFocusMinutes: 0, mindfulMinutes: 16, socialMinutes: 6, topApps: [{ name: 'Kindle Reader', minutes: 14 }, { name: 'Kairos Companion', minutes: 6 }], phase: 'Night Wind-down' },
    { hour: 22, label: '10 PM', usedMinutes: 12, deepFocusMinutes: 0, mindfulMinutes: 10, socialMinutes: 2, topApps: [{ name: 'Kairos Companion', minutes: 8 }], phase: '🌙 Nightly Downtime' },
    { hour: 23, label: '11 PM', usedMinutes: 4, deepFocusMinutes: 0, mindfulMinutes: 4, socialMinutes: 0, topApps: [{ name: 'Kairos Companion', minutes: 4 }], phase: '🌙 Rest Active' }
  ];
};

// 24-Hour Used Hours vs 24h Timeline Chart Component
export const Timeline24HourGraph: React.FC<{
  userName?: string;
  className?: string;
}> = ({ userName = 'Alex Rivera', className = '' }) => {
  const data = useMemo(() => generateUser24hTimeline(userName), [userName]);
  const [selectedHour, setSelectedHour] = useState<number>(10); // Default to peak hour 10 AM

  const currentHourData = data[selectedHour] || data[10];
  const peakHourItem = useMemo(() => {
    return [...data].sort((a, b) => b.usedMinutes - a.usedMinutes)[0] || data[10];
  }, [data]);

  const nextHour = (selectedHour + 1) % 24;
  const timeWindowStr = `${selectedHour === 0 ? '12:00' : selectedHour > 12 ? `${selectedHour - 12}:00` : `${selectedHour}:00`} – ${nextHour === 0 ? '12:00' : nextHour > 12 ? `${nextHour - 12}:00` : `${nextHour}:00`}`;

  return (
    <div className={`p-4 rounded-3xl bg-surface-container-low/90 border border-surface-container-high/60 shadow-xs flex flex-col gap-2.5 ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-indigo-600">schedule</span>
          <span className="font-bold text-xs text-slate-800 dark:text-on-surface">Used Hours vs 24h Timeline</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[11px] font-bold">
          <span>⚡ Peak: {peakHourItem.label} ({peakHourItem.usedMinutes}m)</span>
        </div>
      </div>

      <span className="text-[11px] text-slate-500 dark:text-on-surface-variant leading-tight">
        Tap any hour bar to inspect exact app usage breakdown for that time window:
      </span>

      {/* 24-Hour Interactive Bar Chart Visualizer */}
      <div className="w-full pt-1">
        <div className="flex items-end justify-between gap-[2px] sm:gap-1 h-32 px-1">
          {data.map((item) => {
            const isSelected = selectedHour === item.hour;
            const heightPercent = item.usedMinutes === 0 ? 4 : Math.max(8, (item.usedMinutes / 60) * 100);
            const isPeak = item.isPeak;

            return (
              <button
                key={item.hour}
                onClick={() => {
                  try {
                    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                  } catch {}
                  setSelectedHour(item.hour);
                }}
                type="button"
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer border-none bg-transparent p-0 relative"
                title={`${item.label}: ${item.usedMinutes}m used (${item.phase})`}
              >
                {/* Peak indicator dot */}
                {isPeak && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mb-1 animate-pulse shrink-0" />
                )}

                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    isSelected
                      ? 'bg-indigo-700 ring-2 ring-indigo-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-x-110 shadow-md'
                      : isPeak
                      ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 opacity-90 group-hover:opacity-100'
                      : item.usedMinutes > 0
                      ? 'bg-indigo-100 dark:bg-indigo-950/60 group-hover:bg-indigo-200'
                      : 'bg-slate-100 dark:bg-slate-800/40'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* Hour Tick Label for Key Markers */}
                {(item.hour === 0 || item.hour === 6 || item.hour === 12 || item.hour === 18 || item.hour === 23) && (
                  <span className="text-[9px] text-slate-500 dark:text-outline font-semibold mt-1">
                    {item.hour === 0 ? '12A' : item.hour === 6 ? '6A' : item.hour === 12 ? '12P' : item.hour === 18 ? '6P' : '11P'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Major Time Phase Labels */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-outline font-bold pt-2 px-0.5 border-t border-slate-100 dark:border-surface-container-high/40">
          <button
            type="button"
            onClick={() => setSelectedHour(0)}
            className={`cursor-pointer border-none bg-transparent p-0 hover:text-indigo-600 transition-colors ${selectedHour === 0 ? 'text-indigo-600 font-extrabold' : ''}`}
          >
            00:00 (12 AM)
          </button>
          <button
            type="button"
            onClick={() => setSelectedHour(10)}
            className={`cursor-pointer border-none bg-transparent p-0 hover:text-indigo-600 transition-colors ${selectedHour === 10 ? 'text-indigo-600 font-black' : 'text-indigo-600 font-extrabold'}`}
          >
            10 AM Peak Focus
          </button>
          <button
            type="button"
            onClick={() => setSelectedHour(14)}
            className={`cursor-pointer border-none bg-transparent p-0 hover:text-indigo-600 transition-colors ${selectedHour === 14 ? 'text-indigo-600 font-black' : 'text-indigo-600 font-extrabold'}`}
          >
            2 PM Focus
          </button>
          <button
            type="button"
            onClick={() => setSelectedHour(23)}
            className={`cursor-pointer border-none bg-transparent p-0 hover:text-indigo-600 transition-colors ${selectedHour === 23 ? 'text-indigo-600 font-extrabold' : ''}`}
          >
            23:00 (11 PM)
          </button>
        </div>
      </div>

      {/* Selected Hour Details Inspection Card */}
      {currentHourData && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-surface-container-lowest border border-slate-100 dark:border-surface-container-high/70 shadow-xs flex flex-col gap-2 animate-fade-in text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span className="font-bold text-xs text-slate-900 dark:text-on-surface">
                {currentHourData.label} Window ({timeWindowStr})
              </span>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-0.5 rounded-full border border-indigo-100/70">
              {currentHourData.usedMinutes} mins active
            </span>
          </div>

          {/* Phase Tag */}
          <div className="flex items-center gap-3 text-[11px] flex-wrap">
            <span className="text-slate-500 dark:text-on-surface-variant font-normal">
              Phase: <strong className="text-slate-800 dark:text-on-surface font-bold">⚡ {currentHourData.phase.replace(/^⚡\s*/, '')}</strong>
            </span>
            {currentHourData.isPeak && (
              <span className="text-amber-600 font-bold flex items-center gap-0.5">
                ⚡ Peak Usage Window
              </span>
            )}
          </div>

          {/* Top Apps Breakdown Pills */}
          {currentHourData.topApps && currentHourData.topApps.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {currentHourData.topApps.map((app) => (
                <span
                  key={app.name}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100/70 text-indigo-950 dark:text-indigo-200 text-[11px] font-medium"
                >
                  <strong className="font-bold text-indigo-700 dark:text-indigo-300">{app.name}:</strong> {app.minutes}m
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-on-surface-variant italic">
              No active app usage during this rest cycle.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Sleek, Interactive 5-Trophy Showcase Rack & Focus Inspector
export const TopAchievementsShowcase: React.FC<{
  achievements: FriendAchievement[];
}> = ({ achievements }) => {
  const top5 = (achievements || []).slice(0, 5);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeAch = top5[selectedIdx] || top5[0];

  if (!top5.length) return null;

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'mythic':
        return {
          pill: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          text: 'text-rose-600'
        };
      case 'legendary':
        return {
          pill: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          text: 'text-amber-600'
        };
      case 'epic':
        return {
          pill: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          text: 'text-purple-600'
        };
      case 'rare':
      default:
        return {
          pill: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          dot: 'bg-cyan-500',
          text: 'text-cyan-600'
        };
    }
  };

  const activeStyle = getRarityBadgeStyle(activeAch?.rarity || 'rare');

  return (
    <div className="flex flex-col space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-500 text-[16px]">military_tech</span>
          <span>Top 5 Achievements</span>
        </h4>
        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high/60 px-2 py-0.5 rounded-full">
          {top5.length} Featured
        </span>
      </div>

      {/* 5-Trophy Showcase Rack / Pedestals */}
      <div className="p-2 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex items-center justify-between gap-1.5 shadow-2xs">
        {top5.map((ach, idx) => {
          const isSelected = idx === selectedIdx;
          const style = getRarityBadgeStyle(ach.rarity);
          return (
            <button
              key={ach.id || `ach-${idx}`}
              onClick={() => {
                try {
                  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                } catch {}
                setSelectedIdx(idx);
              }}
              type="button"
              className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-surface-container-lowest shadow-xs ring-2 ring-primary/40 scale-105'
                  : 'hover:bg-surface-container-high/40 opacity-75 hover:opacity-100'
              }`}
            >
              {/* Badge Icon Pedestal */}
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ach.iconBg} text-white flex items-center justify-center shadow-xs transition-transform ${
                  isSelected ? 'scale-105 shadow-md ring-2 ring-white' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">{ach.icon}</span>
              </div>

              {/* Rarity & Rank Indicator */}
              <div className="flex items-center gap-1 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span className="text-[9px] font-black text-on-surface-variant">#{idx + 1}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Achievement Focus Card (Clear, untruncated, clean story & reward) */}
      {activeAch && (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-surface-container-lowest to-surface-container-low border border-surface-container-high/80 shadow-2xs flex flex-col space-y-1.5 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${activeAch.iconBg} text-white flex items-center justify-center shrink-0 shadow-xs`}
              >
                <span className="material-symbols-outlined text-[16px]">{activeAch.icon}</span>
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h5 className="text-xs font-bold text-on-surface truncate">{activeAch.title}</h5>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider border ${activeStyle.pill}`}
                  >
                    {activeAch.rarity}
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  Unlocked {activeAch.unlockedDate}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg shrink-0 border border-indigo-100">
              +{activeAch.xpReward} XP
            </span>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed text-left pl-0.5">
            {activeAch.description}
          </p>
        </div>
      )}
    </div>
  );
};

const INITIAL_CONNECTIONS: ConnectionUser[] = [
  {
    id: 'conn-jordan',
    name: 'Jordan Hayes',
    username: 'jordan.flow',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgLOuJNzuXdfMA_l_HciKsSVC0oQXPWyUR2PEhp5sfyDYy_MN7VjOgjlO9rNFa8gwP-VU3yiUh-pLQJ2TEIrstc_8RnsFKYlSzMKP8OYTtxSqPI0pj24k4sYxnqYhRsK-K8ROdr0b--_dorazU9amHEYofZqgsXW7UyL6BRwSrW38ceF_G2TDNgVZer2UfPXy5hnH_QBSdPpomakBqpjHOZRUgx9uGXMKwQ5WKwNcuJAGGYLO-TzRAA',
    role: 'Deep Work Lead',
    league: 'Crown Vanguard',
    status: 'focusing',
    statusDetail: 'In Flow: Neural System Design (42m left)',
    tandemStreak: 18,
    sharedFocusHours: 64,
    synergyMatch: 98,
    mutualSquads: ['Productivity Champs', 'Quantum Coders'],
    lastActive: 'Just now',
    isPrimaryBuddy: true,

    level: 18,
    levelTitle: 'Crown Sovereign',
    currentXp: 14820,
    nextLevelXp: 16000,
    monthlyTasksCompleted: 148,
    monthlyTasksGrowth: '+22%',
    monthlyHpEarned: 4920,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 94, description: '42h deep work blocks' },
      { label: 'Circadian Sync', key: 'circadian', value: 88, description: '88% sunrise alignment' },
      { label: 'Task Velocity', key: 'velocity', value: 96, description: '5.2 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 92, description: '18d tandem streak' },
      { label: 'Streak Discipline', key: 'streak', value: 95, description: '30d unbroken rhythm' },
      { label: 'Mindful Rest', key: 'rest', value: 84, description: 'Circadian recovery score' }
    ],
    topAchievements: [
      {
        id: 'ach-1',
        title: 'Crown Vanguard',
        category: 'squad',
        rarity: 'legendary',
        icon: 'crown',
        iconBg: 'from-amber-400 to-orange-500',
        description: 'Achieved #1 Rank in weekly Squad Vanguard League.',
        unlockedDate: '3 days ago',
        xpReward: 350
      },
      {
        id: 'ach-2',
        title: '30-Day Circadian Flame',
        category: 'streak',
        rarity: 'mythic',
        icon: 'local_fire_department',
        iconBg: 'from-rose-500 to-orange-500',
        description: 'Maintained unbroken circadian alignment for 30 consecutive days.',
        unlockedDate: '1 week ago',
        xpReward: 500
      },
      {
        id: 'ach-3',
        title: 'Deep Flow Sovereign IV',
        category: 'focus',
        rarity: 'epic',
        icon: 'bolt',
        iconBg: 'from-indigo-500 to-purple-600',
        description: 'Logged over 100 verified 90-minute Deep Work blocks.',
        unlockedDate: '2 weeks ago',
        xpReward: 250
      },
      {
        id: 'ach-4',
        title: 'Tandem Synchronizer',
        category: 'squad',
        rarity: 'rare',
        icon: 'timer',
        iconBg: 'from-cyan-500 to-blue-600',
        description: 'Completed 50 co-focus hours with squad buddies.',
        unlockedDate: '3 weeks ago',
        xpReward: 150
      },
      {
        id: 'ach-5',
        title: 'Dawn Sentinel',
        category: 'rhythm',
        rarity: 'epic',
        icon: 'wb_sunny',
        iconBg: 'from-amber-400 to-amber-600',
        description: 'Started morning flow within 30 minutes of circadian peak for 20 days.',
        unlockedDate: 'Last month',
        xpReward: 200
      }
    ],
    visibilitySettings: {
      whoCanSee: 'everyone',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  },
  {
    id: 'conn-maya',
    name: 'Maya Lin',
    username: 'maya.flow',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAs_vwMusojb-eY35Vyr6oQnfSJv38GfQM_rtZfY-2h6RByM_EznAJcfce51innk4TiJ4swgJhxKpeW7xeJuQ7GMip_0io1YeejgTWGhXuM95mx8YPuy_1muGBCXmcXhW8atFdL8evIYhxzfskuqNedddJd22HY9D9UdT9yXATpt1q2rIBIP866wfYw7yACHP4GNLSbvb45VqFGl3UkmawBmhGyuJ8r0DzN26xONS9QPXllzWVkJTyTZA',
    role: 'UX Researcher & Architect',
    league: 'Luminary IV',
    status: 'online',
    statusDetail: 'Planning afternoon sprint block',
    tandemStreak: 12,
    sharedFocusHours: 48,
    synergyMatch: 95,
    mutualSquads: ['Productivity Champs'],
    lastActive: '3m ago',

    level: 16,
    levelTitle: 'Luminary IV',
    currentXp: 12400,
    nextLevelXp: 14000,
    monthlyTasksCompleted: 132,
    monthlyTasksGrowth: '+15%',
    monthlyHpEarned: 4210,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 89, description: '36h deep focus blocks' },
      { label: 'Circadian Sync', key: 'circadian', value: 96, description: 'Master of morning rhythm' },
      { label: 'Task Velocity', key: 'velocity', value: 91, description: '4.8 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 94, description: 'Active squad contributor' },
      { label: 'Streak Discipline', key: 'streak', value: 88, description: '21d active streak' },
      { label: 'Mindful Rest', key: 'rest', value: 92, description: 'Optimal wind-down habits' }
    ],
    topAchievements: [
      {
        id: 'ach-m1',
        title: 'Circadian Luminary',
        category: 'rhythm',
        rarity: 'legendary',
        icon: 'auto_awesome',
        iconBg: 'from-purple-500 to-indigo-600',
        description: 'Achieved 95%+ circadian rhythm consistency for a full month.',
        unlockedDate: '5 days ago',
        xpReward: 350
      },
      {
        id: 'ach-m2',
        title: 'Mindful Architect',
        category: 'relic',
        rarity: 'epic',
        icon: 'psychology',
        iconBg: 'from-emerald-400 to-teal-600',
        description: 'Logged 40 consecutive reflection notes at circadian dusk.',
        unlockedDate: '2 weeks ago',
        xpReward: 250
      },
      {
        id: 'ach-m3',
        title: 'Focus Sprint Sovereign',
        category: 'focus',
        rarity: 'epic',
        icon: 'timer',
        iconBg: 'from-blue-500 to-indigo-600',
        description: 'Completed 60 Pomodoro 50/10 focus blocks.',
        unlockedDate: '3 weeks ago',
        xpReward: 200
      },
      {
        id: 'ach-m4',
        title: 'Squad Pillar',
        category: 'squad',
        rarity: 'rare',
        icon: 'shield',
        iconBg: 'from-amber-400 to-orange-500',
        description: 'Contributed 1,000+ HP to squad quests in a single week.',
        unlockedDate: '1 month ago',
        xpReward: 150
      },
      {
        id: 'ach-m5',
        title: 'Rhythm Pioneer',
        category: 'streak',
        rarity: 'rare',
        icon: 'trending_up',
        iconBg: 'from-cyan-400 to-blue-500',
        description: 'Maintained a 14-day streak with 0 skipped circadian tasks.',
        unlockedDate: '1 month ago',
        xpReward: 120
      }
    ],
    visibilitySettings: {
      whoCanSee: 'squad_connections',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  },
  {
    id: 'conn-liam',
    name: 'Liam Vance',
    username: 'liam.focus',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCQTalMmdsR6Bj-zot2fAbA780RQzgpP4Lk8G3L2_XTyB7qYAUhnymErXjOL123wuzGc1-svM0L-mOdy4Ar_nZ4h52f8_4drCZToBiISdQDW6NLwdhKaHx1VWP49AAJJGoucRBYBUyZlYZ4MdRz5NfKhyji-BJ3HBlvKsxHMU0hv_TC7U5V9VW4src7a_OWr5voSel6q5vz-Uu8Le14lMrbFcAITszTXXrkZoyP2tZXP7djKHt5GWCHhg',
    role: 'Cognitive Science Fellow',
    league: 'Aura Master',
    status: 'resting',
    statusDetail: 'Circadian Rest Window • Recharging',
    tandemStreak: 8,
    sharedFocusHours: 32,
    synergyMatch: 91,
    mutualSquads: ['Productivity Champs'],
    lastActive: '25m ago',

    level: 14,
    levelTitle: 'Aura Master',
    currentXp: 9800,
    nextLevelXp: 12000,
    monthlyTasksCompleted: 108,
    monthlyTasksGrowth: '+9%',
    monthlyHpEarned: 3650,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 85, description: '28h deep focus blocks' },
      { label: 'Circadian Sync', key: 'circadian', value: 89, description: 'High sleep regularity' },
      { label: 'Task Velocity', key: 'velocity', value: 82, description: '3.9 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 88, description: 'Consistent squad tandem' },
      { label: 'Streak Discipline', key: 'streak', value: 84, description: '16d continuous rhythm' },
      { label: 'Mindful Rest', key: 'rest', value: 95, description: 'Exemplary rest alignment' }
    ],
    topAchievements: [
      {
        id: 'ach-l1',
        title: 'Rest Master IX',
        category: 'relic',
        rarity: 'epic',
        icon: 'bedtime',
        iconBg: 'from-indigo-400 to-purple-600',
        description: 'Maintained 8h+ optimal circadian rest window for 21 consecutive days.',
        unlockedDate: '1 week ago',
        xpReward: 250
      },
      {
        id: 'ach-l2',
        title: 'Neuro-Flow Initiate',
        category: 'focus',
        rarity: 'rare',
        icon: 'psychology_alt',
        iconBg: 'from-blue-400 to-indigo-600',
        description: 'Completed 40 uninterrupted focus sessions.',
        unlockedDate: '2 weeks ago',
        xpReward: 150
      }
    ],
    // Marked as Private Account to demonstrate private profile handling
    visibilitySettings: {
      whoCanSee: 'private',
      showLevel: true,
      showMonthlyTasks: false,
      showMonthlyHp: false,
      showWebGraph: false,
      showTopAchievements: false,
      showLiveStatus: false
    }
  },
  {
    id: 'conn-elena',
    name: 'Elena Rostova',
    username: 'elena.rostova',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    role: 'Systems Strategist',
    league: 'Vanguard Titan',
    status: 'focusing',
    statusDetail: 'Deep Study: Vector Optimization (18m left)',
    tandemStreak: 14,
    sharedFocusHours: 52,
    synergyMatch: 94,
    mutualSquads: ['Productivity Champs', 'Bio-Rhythm Guild'],
    lastActive: 'Active now',

    level: 19,
    levelTitle: 'Vanguard Titan',
    currentXp: 17200,
    nextLevelXp: 19000,
    monthlyTasksCompleted: 164,
    monthlyTasksGrowth: '+28%',
    monthlyHpEarned: 5340,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 97, description: '48h intense focus sprint' },
      { label: 'Circadian Sync', key: 'circadian', value: 91, description: 'Strict routine adherence' },
      { label: 'Task Velocity', key: 'velocity', value: 98, description: '6.1 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 90, description: 'Squad strategic lead' },
      { label: 'Streak Discipline', key: 'streak', value: 96, description: '45d unbroken streak' },
      { label: 'Mindful Rest', key: 'rest', value: 86, description: 'High recovery consistency' }
    ],
    topAchievements: [
      {
        id: 'ach-e1',
        title: 'Titan Sovereign',
        category: 'squad',
        rarity: 'mythic',
        icon: 'military_tech',
        iconBg: 'from-rose-600 to-purple-600',
        description: 'Earned 5,000+ monthly HP across multiple Squad Quests.',
        unlockedDate: 'Yesterday',
        xpReward: 500
      },
      {
        id: 'ach-e2',
        title: 'Vector Master',
        category: 'focus',
        rarity: 'legendary',
        icon: 'insights',
        iconBg: 'from-amber-400 to-orange-500',
        description: 'Executed 120 deep work sprint blocks at 95%+ consistency.',
        unlockedDate: '1 week ago',
        xpReward: 350
      },
      {
        id: 'ach-e3',
        title: 'Rhythm Architect',
        category: 'rhythm',
        rarity: 'epic',
        icon: 'timeline',
        iconBg: 'from-indigo-500 to-purple-600',
        description: 'Designed and fulfilled custom circadian work schedule for 60 days.',
        unlockedDate: '2 weeks ago',
        xpReward: 250
      },
      {
        id: 'ach-e4',
        title: 'Guild Champion',
        category: 'squad',
        rarity: 'epic',
        icon: 'shield',
        iconBg: 'from-blue-500 to-indigo-600',
        description: 'Led squad to victory in 3 consecutive Weekly Podiums.',
        unlockedDate: '1 month ago',
        xpReward: 250
      },
      {
        id: 'ach-e5',
        title: 'Flow Unbroken',
        category: 'streak',
        rarity: 'epic',
        icon: 'electric_bolt',
        iconBg: 'from-yellow-400 to-amber-600',
        description: 'Maintained focus velocity with zero task rollovers for 30 days.',
        unlockedDate: '1 month ago',
        xpReward: 200
      }
    ],
    visibilitySettings: {
      whoCanSee: 'everyone',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  },
  {
    id: 'conn-marcus',
    name: 'Marcus Sterling',
    username: 'marcus.build',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    role: 'Full Stack Creator',
    league: 'Luminary III',
    status: 'offline',
    statusDetail: 'Offline • Next session at 08:30 AM',
    tandemStreak: 5,
    sharedFocusHours: 21,
    synergyMatch: 88,
    mutualSquads: ['Quantum Coders'],
    lastActive: '2h ago',

    level: 13,
    levelTitle: 'Luminary III',
    currentXp: 8600,
    nextLevelXp: 10500,
    monthlyTasksCompleted: 86,
    monthlyTasksGrowth: '+8%',
    monthlyHpEarned: 2890,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 82, description: '24h focus time' },
      { label: 'Circadian Sync', key: 'circadian', value: 84, description: 'Night owl flow balance' },
      { label: 'Task Velocity', key: 'velocity', value: 89, description: '3.5 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 86, description: 'Code review tandem sync' },
      { label: 'Streak Discipline', key: 'streak', value: 80, description: '10d active streak' },
      { label: 'Mindful Rest', key: 'rest', value: 88, description: 'Solid rest routine' }
    ],
    topAchievements: [
      {
        id: 'ach-rc1',
        title: 'Full Stack Sprint Master',
        category: 'focus',
        rarity: 'epic',
        icon: 'terminal',
        iconBg: 'from-indigo-500 to-purple-600',
        description: 'Completed 50 coding focus blocks.',
        unlockedDate: '1 week ago',
        xpReward: 200
      }
    ],
    // Marked as Private Account
    visibilitySettings: {
      whoCanSee: 'private',
      showLevel: true,
      showMonthlyTasks: false,
      showMonthlyHp: false,
      showWebGraph: false,
      showTopAchievements: false,
      showLiveStatus: false
    }
  },
  {
    id: 'conn-sophia',
    name: 'Sophia Chen',
    username: 'sophia.zen',
    avatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    role: 'Circadian Neuro-Coach',
    league: 'Luminary V',
    status: 'online',
    statusDetail: 'Reviewing daily circadian rhythm',
    tandemStreak: 9,
    sharedFocusHours: 36,
    synergyMatch: 97,
    mutualSquads: ['Bio-Rhythm Guild'],
    lastActive: '10m ago',

    level: 17,
    levelTitle: 'Luminary V',
    currentXp: 13900,
    nextLevelXp: 15500,
    monthlyTasksCompleted: 140,
    monthlyTasksGrowth: '+19%',
    monthlyHpEarned: 4680,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 92, description: '38h mindful focus' },
      { label: 'Circadian Sync', key: 'circadian', value: 98, description: 'Gold standard alignment' },
      { label: 'Task Velocity', key: 'velocity', value: 93, description: '5.0 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 95, description: 'Holistic accountability' },
      { label: 'Streak Discipline', key: 'streak', value: 94, description: '28d uninterrupted streak' },
      { label: 'Mindful Rest', key: 'rest', value: 97, description: 'Zen recovery state' }
    ],
    topAchievements: [
      {
        id: 'ach-s1',
        title: 'Zenith Master',
        category: 'rhythm',
        rarity: 'legendary',
        icon: 'spa',
        iconBg: 'from-emerald-500 to-teal-600',
        description: 'Guided 5 squad members through unbroken circadian morning routines.',
        unlockedDate: '4 days ago',
        xpReward: 350
      },
      {
        id: 'ach-s2',
        title: 'Mindful Mentor',
        category: 'squad',
        rarity: 'epic',
        icon: 'favorite',
        iconBg: 'from-rose-500 to-pink-600',
        description: 'Sent 100 motivational cheer sparks to squad partners.',
        unlockedDate: '2 weeks ago',
        xpReward: 250
      }
    ],
    visibilitySettings: {
      whoCanSee: 'everyone',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  }
];

const INITIAL_INCOMING_REQUESTS: PendingRequest[] = [
  {
    id: 'req-in-1',
    name: 'Dr. Clara Thorne',
    username: 'clara.thorne',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    headline: 'Neurobiology Researcher @ Stanford',
    note: 'Hey Alex! Loved your Vanguard sprint rhythm. Would love to sync for morning 90m deep work sessions.',
    mutualCount: 4,
    synergyMatch: 96,
    timestamp: '15m ago',
    type: 'incoming'
  },
  {
    id: 'req-in-2',
    name: 'Devon Ray',
    username: 'devon.architect',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    headline: 'Creative Director & Author',
    note: 'Let’s team up for the 14-Day Circadian Challenge in Productivity Champs!',
    mutualCount: 2,
    synergyMatch: 92,
    timestamp: '2h ago',
    type: 'incoming'
  },
  {
    id: 'req-in-3',
    name: 'Aria Takahashi',
    username: 'aria.flow',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    headline: 'Algorithm Engineer & Marathoner',
    note: 'Saw your focus profile in Vanguard League. Looking for consistent morning tandem partners.',
    mutualCount: 3,
    synergyMatch: 94,
    timestamp: '1d ago',
    type: 'incoming'
  }
];

const INITIAL_OUTGOING_REQUESTS: PendingRequest[] = [
  {
    id: 'req-out-1',
    name: 'Julian Frost',
    username: 'julian.flow',
    avatar:
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    headline: 'Cognitive Ergonomics Specialist',
    mutualCount: 3,
    synergyMatch: 91,
    timestamp: 'Sent yesterday',
    type: 'outgoing'
  },
  {
    id: 'req-out-2',
    name: 'Amara Okafor',
    username: 'amara.studio',
    avatar:
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80',
    headline: 'Design Systems Architect',
    mutualCount: 1,
    synergyMatch: 89,
    timestamp: 'Sent 3d ago',
    type: 'outgoing'
  }
];

const INITIAL_SUGGESTIONS: SuggestedUser[] = [
  {
    id: 'sug-1',
    name: 'Kenji Sato',
    username: 'kenji.sato',
    avatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    headline: 'Senior Full Stack Engineer',
    synergyMatch: 97,
    commonRoutine: 'Peak Focus: 08:00 AM - 11:30 AM',
    mutualFriends: 5,
    hasSentRequest: false
  },
  {
    id: 'sug-2',
    name: 'Dr. Samira Khan',
    username: 'samira.neuro',
    avatar:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    headline: 'Circadian Rhythm Scientist',
    synergyMatch: 95,
    commonRoutine: 'Early Bird Routine (Zone 1 Peak)',
    mutualFriends: 4,
    hasSentRequest: false
  },
  {
    id: 'sug-3',
    name: 'Felix Vance',
    username: 'felix.flow',
    avatar:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    headline: 'Deep Work Practitioner & Writer',
    synergyMatch: 93,
    commonRoutine: 'Pomodoro 50/10 Protocol Master',
    mutualFriends: 3,
    hasSentRequest: false
  },
  {
    id: 'sug-4',
    name: 'Chloe Monet',
    username: 'chloe.monet',
    avatar:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
    headline: 'Product Designer & Mindful Hacker',
    synergyMatch: 91,
    commonRoutine: 'Evening Flow & Reflection Sync',
    mutualFriends: 2,
    hasSentRequest: false
  }
];

export const ALL_SAMPLE_USERS: ConnectionUser[] = [
  ...INITIAL_CONNECTIONS,
  {
    id: 'conn-clara',
    name: 'Dr. Clara Thorne',
    username: 'clara.thorne',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    role: 'Neurobiology Researcher',
    league: 'Crown Vanguard',
    status: 'focusing',
    statusDetail: 'Focusing on Neuroplasticity & Memory Consolidation',
    tandemStreak: 7,
    sharedFocusHours: 28,
    synergyMatch: 96,
    mutualSquads: ['Productivity Champs', 'Bio-Rhythm Guild'],
    lastActive: 'Active now',
    level: 18,
    levelTitle: 'Crown Vanguard',
    currentXp: 15400,
    nextLevelXp: 17000,
    monthlyTasksCompleted: 152,
    monthlyTasksGrowth: '+25%',
    monthlyHpEarned: 5120,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 96, description: '44h deep work' },
      { label: 'Circadian Sync', key: 'circadian', value: 94, description: 'Early circadian lock' },
      { label: 'Task Velocity', key: 'velocity', value: 95, description: '5.4 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 92, description: 'High collaborative output' },
      { label: 'Streak Discipline', key: 'streak', value: 97, description: '40d unbroken streak' },
      { label: 'Mindful Rest', key: 'rest', value: 90, description: 'Optimal circadian wind-down' }
    ],
    topAchievements: [
      {
        id: 'ach-c1',
        title: 'Neural Synthesizer',
        category: 'focus',
        rarity: 'mythic',
        icon: 'psychology',
        iconBg: 'from-purple-600 to-indigo-600',
        description: 'Logged 150 hours of verified deep cognitive focus.',
        unlockedDate: '2 days ago',
        xpReward: 500
      },
      {
        id: 'ach-c2',
        title: 'Dawn Pioneer',
        category: 'rhythm',
        rarity: 'legendary',
        icon: 'wb_sunny',
        iconBg: 'from-amber-400 to-orange-500',
        description: 'Completed 30 consecutive sunrise circadian focus blocks.',
        unlockedDate: '1 week ago',
        xpReward: 350
      }
    ],
    visibilitySettings: {
      whoCanSee: 'everyone',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  },
  {
    id: 'conn-kenji',
    name: 'Kenji Sato',
    username: 'kenji.sato',
    avatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    role: 'Senior Full Stack Engineer',
    league: 'Luminary V',
    status: 'online',
    statusDetail: 'Peak Focus: Code Optimization & Refactor',
    tandemStreak: 11,
    sharedFocusHours: 42,
    synergyMatch: 97,
    mutualSquads: ['Quantum Coders'],
    lastActive: '5m ago',
    level: 17,
    levelTitle: 'Luminary V',
    currentXp: 13600,
    nextLevelXp: 15000,
    monthlyTasksCompleted: 138,
    monthlyTasksGrowth: '+18%',
    monthlyHpEarned: 4450,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 95, description: '40h deep code blocks' },
      { label: 'Circadian Sync', key: 'circadian', value: 90, description: 'Morning rhythm alignment' },
      { label: 'Task Velocity', key: 'velocity', value: 97, description: '5.8 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 93, description: 'Code pairing tandem lead' },
      { label: 'Streak Discipline', key: 'streak', value: 91, description: '25d active streak' },
      { label: 'Mindful Rest', key: 'rest', value: 87, description: 'Balanced recovery' }
    ],
    topAchievements: [
      {
        id: 'ach-k1',
        title: 'Code Alchemist',
        category: 'focus',
        rarity: 'legendary',
        icon: 'terminal',
        iconBg: 'from-blue-500 to-indigo-600',
        description: 'Merged 100 deep work sprints with 0 interruptions.',
        unlockedDate: '4 days ago',
        xpReward: 350
      },
      {
        id: 'ach-k2',
        title: 'Tandem Engine',
        category: 'squad',
        rarity: 'epic',
        icon: 'bolt',
        iconBg: 'from-amber-400 to-amber-600',
        description: 'Completed 20 tandem focus blocks with squad teammates.',
        unlockedDate: '2 weeks ago',
        xpReward: 250
      }
    ],
    visibilitySettings: {
      whoCanSee: 'everyone',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  },
  {
    id: 'conn-samira',
    name: 'Dr. Samira Khan',
    username: 'samira.neuro',
    avatar:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    role: 'Circadian Rhythm Scientist',
    league: 'Luminary IV',
    status: 'online',
    statusDetail: 'Zone 1 Peak Protocol Active',
    tandemStreak: 8,
    sharedFocusHours: 30,
    synergyMatch: 95,
    mutualSquads: ['Bio-Rhythm Guild'],
    lastActive: '12m ago',
    level: 16,
    levelTitle: 'Luminary IV',
    currentXp: 12200,
    nextLevelXp: 14000,
    monthlyTasksCompleted: 126,
    monthlyTasksGrowth: '+16%',
    monthlyHpEarned: 4100,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 91, description: '35h focus sprint' },
      { label: 'Circadian Sync', key: 'circadian', value: 99, description: 'Perfect sunrise sync' },
      { label: 'Task Velocity', key: 'velocity', value: 90, description: '4.6 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 94, description: 'Scientific mentorship' },
      { label: 'Streak Discipline', key: 'streak', value: 93, description: '26d unbroken rhythm' },
      { label: 'Mindful Rest', key: 'rest', value: 98, description: 'Optimal circadian recovery' }
    ],
    topAchievements: [
      {
        id: 'ach-sk1',
        title: 'Solar Harmonizer',
        category: 'rhythm',
        rarity: 'mythic',
        icon: 'wb_twilight',
        iconBg: 'from-amber-500 to-rose-600',
        description: 'Achieved 98%+ circadian sync index for 4 consecutive weeks.',
        unlockedDate: 'Yesterday',
        xpReward: 500
      }
    ],
    visibilitySettings: {
      whoCanSee: 'everyone',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  },
  {
    id: 'conn-felix',
    name: 'Felix Vance',
    username: 'felix.flow',
    avatar:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    role: 'Deep Work Practitioner & Writer',
    league: 'Luminary III',
    status: 'resting',
    statusDetail: 'Circadian Wind-down & Journaling',
    tandemStreak: 6,
    sharedFocusHours: 24,
    synergyMatch: 93,
    mutualSquads: ['Productivity Champs'],
    lastActive: '30m ago',
    level: 15,
    levelTitle: 'Luminary III',
    currentXp: 11000,
    nextLevelXp: 13000,
    monthlyTasksCompleted: 118,
    monthlyTasksGrowth: '+14%',
    monthlyHpEarned: 3820,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 93, description: '36h writing blocks' },
      { label: 'Circadian Sync', key: 'circadian', value: 89, description: 'Consistent evening rhythm' },
      { label: 'Task Velocity', key: 'velocity', value: 88, description: '4.2 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 90, description: 'Tandem writing sessions' },
      { label: 'Streak Discipline', key: 'streak', value: 87, description: '20d active streak' },
      { label: 'Mindful Rest', key: 'rest', value: 94, description: 'Thoughtful rest habits' }
    ],
    topAchievements: [
      {
        id: 'ach-fv1',
        title: 'Deep Author',
        category: 'focus',
        rarity: 'epic',
        icon: 'history_edu',
        iconBg: 'from-purple-500 to-indigo-600',
        description: 'Authored 50,000 words inside uninterrupted Kairos flow blocks.',
        unlockedDate: '5 days ago',
        xpReward: 300
      }
    ],
    visibilitySettings: {
      whoCanSee: 'everyone',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  }
];

export const resolveScannedUserProfile = (
  query: string,
  existingConnections: ConnectionUser[] = INITIAL_CONNECTIONS
): ConnectionUser => {
  let clean = (query || '').trim();

  // If query is a full URL (e.g. scanned via Google Lens or mobile browser link)
  if (clean.includes('http://') || clean.includes('https://') || clean.includes('?')) {
    try {
      const urlObj = clean.startsWith('http')
        ? new URL(clean)
        : new URL(`http://localhost:3000/${clean.replace(/^\//, '')}`);
      const paramUser =
        urlObj.searchParams.get('profile') ||
        urlObj.searchParams.get('user') ||
        urlObj.searchParams.get('scan');
      if (paramUser) {
        clean = paramUser;
      } else {
        const segments = urlObj.pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          clean = segments[segments.length - 1];
        }
      }
    } catch {
      const match = clean.match(/(?:profile|user|scan)=([^&]+)/i);
      if (match) {
        clean = decodeURIComponent(match[1]);
      }
    }
  }

  clean = clean.trim().replace(/^@/, '').toLowerCase();

  // 1. Check existing connections
  const inConn = existingConnections.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.username.toLowerCase() === clean ||
      c.name.toLowerCase().includes(clean)
  );
  if (inConn) return inConn;

  // 2. Check all sample known users
  const inAll = ALL_SAMPLE_USERS.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.username.toLowerCase() === clean ||
      c.name.toLowerCase().includes(clean)
  );
  if (inAll) return inAll;

  // 3. Fallback dynamically generated authentic profile for any custom QR payload
  const rawHandle = query.startsWith('http') || query.includes('?') ? clean : query;
  const displayName = rawHandle.startsWith('@')
    ? rawHandle.slice(1).replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : rawHandle.replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const username = rawHandle.startsWith('@')
    ? rawHandle.slice(1).toLowerCase()
    : rawHandle.toLowerCase().replace(/\s+/g, '.');

  return {
    id: `conn-qr-${Date.now()}`,
    name: displayName || 'Nexus Traveler',
    username: username || 'nexus.traveler',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    role: 'Circadian Flow Explorer',
    league: 'Luminary III',
    status: 'online',
    statusDetail: 'Connected via Kairos Nexus QR Code',
    tandemStreak: 1,
    sharedFocusHours: 0,
    synergyMatch: 95,
    mutualSquads: ['Productivity Champs'],
    lastActive: 'Just now',
    level: 15,
    levelTitle: 'Luminary III',
    currentXp: 11400,
    nextLevelXp: 13000,
    monthlyTasksCompleted: 114,
    monthlyTasksGrowth: '+18%',
    monthlyHpEarned: 3890,
    radarMetrics: [
      { label: 'Deep Focus', key: 'focus', value: 92, description: '34h focus blocks' },
      { label: 'Circadian Sync', key: 'circadian', value: 94, description: 'Active circadian sync' },
      { label: 'Task Velocity', key: 'velocity', value: 90, description: '4.5 tasks/day avg' },
      { label: 'Team Synergy', key: 'synergy', value: 93, description: 'Squad collaboration' },
      { label: 'Streak Discipline', key: 'streak', value: 89, description: '18d active streak' },
      { label: 'Mindful Rest', key: 'rest', value: 95, description: 'Optimal rest score' }
    ],
    topAchievements: [
      {
        id: 'ach-qr-1',
        title: 'Nexus Pioneer',
        category: 'relic',
        rarity: 'legendary',
        icon: 'qr_code_scanner',
        iconBg: 'from-indigo-600 to-fuchsia-600',
        description: 'Scanned & synchronized via Kairos QR Nexus code.',
        unlockedDate: 'Today',
        xpReward: 250
      },
      {
        id: 'ach-qr-2',
        title: 'Flow Spark',
        category: 'focus',
        rarity: 'rare',
        icon: 'bolt',
        iconBg: 'from-amber-400 to-orange-500',
        description: 'Ready for co-focus tandem sprint sessions.',
        unlockedDate: 'Today',
        xpReward: 100
      }
    ],
    visibilitySettings: {
      whoCanSee: 'everyone',
      showLevel: true,
      showMonthlyTasks: true,
      showMonthlyHp: true,
      showWebGraph: true,
      showTopAchievements: true,
      showLiveStatus: true
    }
  };
};

export const ConnectionsScreen: React.FC<ConnectionsScreenProps> = ({
  userProfile,
  initialScannedUser,
  onBack,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'discover'>('connections');
  const [searchQuery, setSearchQuery] = useState('');

  // Lists
  const [connections, setConnections] = useState<ConnectionUser[]>(INITIAL_CONNECTIONS);
  const [incomingRequests, setIncomingRequests] = useState<PendingRequest[]>(INITIAL_INCOMING_REQUESTS);
  const [outgoingRequests, setOutgoingRequests] = useState<PendingRequest[]>(INITIAL_OUTGOING_REQUESTS);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>(INITIAL_SUGGESTIONS);

  // Modals & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cheerModalUser, setCheerModalUser] = useState<ConnectionUser | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<ConnectionUser | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalTab, setQrModalTab] = useState<'my_code' | 'scan_code'>('my_code');
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [scanInputText, setScanInputText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [customCheerText, setCustomCheerText] = useState('');

  // Automatically open Evolution Profile modal if initialScannedUser is passed
  useEffect(() => {
    if (initialScannedUser) {
      const target = resolveScannedUserProfile(initialScannedUser, connections);
      setSelectedUserDetail(target);
      showToast(`📷 Scanned Profile: @${target.username}`);
    }
  }, [initialScannedUser]);

  // Also check URL parameters directly on mount in case direct URL navigation
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const profileParam = params.get('profile') || params.get('user') || params.get('scan');
        if (profileParam) {
          const target = resolveScannedUserProfile(profileParam, connections);
          setSelectedUserDetail(target);
          showToast(`📷 Scanned Profile: @${target.username}`);
        }
      }
    } catch {}
  }, []);

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // Fallback
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Handlers for Request actions
  const handleAcceptRequest = (req: PendingRequest) => {
    triggerHaptic(ImpactStyle.Medium);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));

    // Add to connections
    const newConnection: ConnectionUser = {
      id: `conn-${req.id}`,
      name: req.name,
      username: req.username,
      avatar: req.avatar,
      role: req.headline,
      league: 'Luminary I',
      status: 'online',
      statusDetail: 'Connected just now • Say hi!',
      tandemStreak: 1,
      sharedFocusHours: 0,
      synergyMatch: req.synergyMatch,
      mutualSquads: ['Productivity Champs'],
      lastActive: 'Just now',
      level: 12,
      levelTitle: 'Luminary II',
      currentXp: 7200,
      nextLevelXp: 9000,
      monthlyTasksCompleted: 74,
      monthlyTasksGrowth: '+12%',
      monthlyHpEarned: 2450,
      radarMetrics: [
        { label: 'Deep Focus', key: 'focus', value: 86, description: 'Deep focus time' },
        { label: 'Circadian Sync', key: 'circadian', value: 92, description: 'Rhythm consistency' },
        { label: 'Task Velocity', key: 'velocity', value: 84, description: 'Tasks completed' },
        { label: 'Team Synergy', key: 'synergy', value: 88, description: 'Collaboration score' },
        { label: 'Streak Discipline', key: 'streak', value: 80, description: 'Daily active streak' },
        { label: 'Mindful Rest', key: 'rest', value: 90, description: 'Recovery score' }
      ],
      topAchievements: [
        {
          id: 'ach-new-1',
          title: 'Rhythm Explorer',
          category: 'rhythm',
          rarity: 'rare',
          icon: 'explore',
          iconBg: 'from-blue-400 to-indigo-600',
          description: 'Joined the Kairos circadian network.',
          unlockedDate: 'Today',
          xpReward: 100
        },
        {
          id: 'ach-new-2',
          title: 'Focus Spark',
          category: 'focus',
          rarity: 'common',
          icon: 'bolt',
          iconBg: 'from-amber-400 to-orange-500',
          description: 'Completed first tandem sync block.',
          unlockedDate: 'Today',
          xpReward: 50
        }
      ],
      visibilitySettings: {
        whoCanSee: 'squad_connections',
        showLevel: true,
        showMonthlyTasks: true,
        showMonthlyHp: true,
        showWebGraph: true,
        showTopAchievements: true,
        showLiveStatus: true
      }
    };
    setConnections((prev) => [newConnection, ...prev]);
    showToast(`🎉 Connected with ${req.name}! +50 Synergy XP unlocked`);
  };

  const handleDeclineRequest = (reqId: string, name: string) => {
    triggerHaptic(ImpactStyle.Light);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== reqId));
    showToast(`Request from ${name} declined`);
  };

  const handleCancelOutgoing = (reqId: string, name: string) => {
    triggerHaptic(ImpactStyle.Light);
    setOutgoingRequests((prev) => prev.filter((r) => r.id !== reqId));
    showToast(`Invitation to ${name} canceled`);
  };

  const handleSendRequest = (sug: SuggestedUser) => {
    triggerHaptic(ImpactStyle.Medium);
    setSuggestedUsers((prev) =>
      prev.map((item) => (item.id === sug.id ? { ...item, hasSentRequest: true } : item))
    );

    const newOutgoing: PendingRequest = {
      id: `out-${sug.id}`,
      name: sug.name,
      username: sug.username,
      avatar: sug.avatar,
      headline: sug.headline,
      mutualCount: sug.mutualFriends,
      synergyMatch: sug.synergyMatch,
      timestamp: 'Sent just now',
      type: 'outgoing'
    };
    setOutgoingRequests((prev) => [newOutgoing, ...prev]);
    showToast(`✨ Connection request sent to ${sug.name}!`);
  };

  const handleSendCheer = (cheer: string) => {
    if (!cheerModalUser) return;
    triggerHaptic(ImpactStyle.Heavy);
    showToast(`🔥 "${cheer}" delivered to ${cheerModalUser.name}! +15 Team Spirit`);
    setCheerModalUser(null);
    setCustomCheerText('');
  };

  const handleTandemInvite = (user: ConnectionUser) => {
    triggerHaptic(ImpactStyle.Medium);
    showToast(`🚀 Tandem Focus session invite sent to ${user.name}!`);
  };

  const handleCopyInviteLink = () => {
    triggerHaptic(ImpactStyle.Light);
    const link = `https://kairos.app/connect/${(userProfile?.name || 'alex.rivera').toLowerCase().replace(/\s+/g, '-')}-904`;
    navigator.clipboard?.writeText?.(link);
    setCopiedLink(true);
    showToast('📋 Kairos Synergy Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleScanUser = (queryOrHandle: string) => {
    if (!queryOrHandle.trim()) return;
    triggerHaptic(ImpactStyle.Medium);
    const target = resolveScannedUserProfile(queryOrHandle, connections);
    setShowQrModal(false);
    setScanInputText('');
    setSelectedUserDetail(target);
    showToast(`📷 QR Code Decoded: Viewing @${target.username}'s Profile`);
  };

  const handleConnectDirectly = (user: ConnectionUser) => {
    triggerHaptic(ImpactStyle.Medium);
    const isAlready = connections.some(
      (c) => c.id === user.id || c.username.toLowerCase() === user.username.toLowerCase()
    );
    if (!isAlready) {
      setConnections((prev) => [user, ...prev]);
      showToast(`🎉 Connected with ${user.name}! +50 XP Unlocked`);
    } else {
      showToast(`Already connected with ${user.name}`);
    }
  };

  const handleRemoveConnection = (userId: string, name: string) => {
    triggerHaptic(ImpactStyle.Medium);
    setConnections((prev) => prev.filter((c) => c.id !== userId));
    setSelectedUserDetail(null);
    showToast(`Removed ${name} from your connections.`);
  };

  // Filter connections by search query (by name or username)
  const filteredConnections = connections.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q)
    );
  });

  const totalPendingCount = incomingRequests.length + outgoingRequests.length;

  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col bg-surface text-on-surface font-body-md overflow-hidden relative selection:bg-primary-fixed selection:text-on-primary-fixed antialiased animate-fade-in">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl border border-indigo-500/30 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header App Bar */}
      <AppTopBar
        subtitle="Network & Connections"
        showBackArrow={true}
        onBack={onBack}
        rightAction={
          <button
            onClick={() => {
              triggerHaptic();
              setShowQrModal(true);
            }}
            aria-label="Scan User QR"
            className="w-9 h-9 rounded-full flex items-center justify-center text-primary bg-primary-fixed/30 hover:bg-primary-fixed/50 active:scale-95 transition-all cursor-pointer border-none"
            type="button"
            title="Scan Friend QR Code"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          </button>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain w-full px-4 pt-3 pb-24 bg-surface mobile-scroll flex flex-col space-y-3">
        {/* Primary Screen Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-surface-container-high/60 backdrop-blur-md border border-surface-container/80 shrink-0">
          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('connections');
            }}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'connections'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span>Connections</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'connections'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {connections.length}
            </span>
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('requests');
            }}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === 'requests'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">mark_email_unread</span>
            <span>Pending</span>
            {totalPendingCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  incomingRequests.length > 0
                    ? 'bg-tertiary text-white'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {totalPendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('discover');
            }}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">explore</span>
            <span>Discover</span>
          </button>
        </div>

        {/* TAB 1: CONNECTIONS (Displays ONLY Name & Avatar) */}
        {activeTab === 'connections' && (
          <div className="flex flex-col space-y-3">
            {/* Search Bar */}
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections by name..."
                className="w-full h-10 pl-9 pr-8 rounded-2xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:border-primary text-xs font-medium text-on-surface placeholder:text-on-surface-variant/60 transition-colors shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Connection Cards List - Clean & Minimalist: Only Avatar + Name */}
            {filteredConnections.length === 0 ? (
              <div className="py-12 px-4 rounded-3xl bg-surface-container-low border border-dashed border-surface-container-high flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
                  person_search
                </span>
                <p className="text-sm font-bold text-on-surface">No connections found</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-[240px]">
                  {searchQuery
                    ? `No friends matched "${searchQuery}". Try a different keyword.`
                    : 'Discover new focus partners and build your circadian network.'}
                </p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="mt-3 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  type="button"
                >
                  Discover Buddies
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                {filteredConnections.map((user) => {
                  const isFocusing = user.status === 'focusing';
                  const isOnline = user.status === 'online';
                  const isResting = user.status === 'resting';

                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        triggerHaptic();
                        setSelectedUserDetail(user);
                      }}
                      className="p-3 px-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/80 hover:border-indigo-300 hover:shadow-sm shadow-2xs transition-all flex items-center justify-between cursor-pointer group"
                    >
                      {/* Avatar & Name ONLY */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-surface-container-high group-hover:ring-indigo-300 shadow-2xs transition-all"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                              isFocusing
                                ? 'bg-emerald-500 animate-pulse'
                                : isOnline
                                ? 'bg-indigo-500'
                                : isResting
                                ? 'bg-amber-400'
                                : 'bg-slate-400'
                            }`}
                            title={user.status}
                          />
                        </div>

                        <span className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {user.name}
                        </span>
                      </div>

                      {/* Tap indicator chevron */}
                      <span className="material-symbols-outlined text-outline text-[20px] shrink-0 group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENDING REQUESTS (Displays ONLY Name & Avatar + Action Buttons) */}
        {activeTab === 'requests' && (
          <div className="flex flex-col space-y-4">
            {/* Incoming Requests Section */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Received Requests ({incomingRequests.length})
                  </h3>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium">
                  {incomingRequests.length === 0 ? 'All caught up' : 'Awaiting action'}
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface-container-low border border-dashed border-surface-container-high text-center">
                  <p className="text-xs font-semibold text-on-surface">No new incoming requests</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Share your invite link with squad mates to grow your network!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 px-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/80 shadow-2xs flex items-center justify-between gap-3"
                    >
                      {/* Avatar & Name ONLY */}
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={req.avatar}
                          alt={req.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100 shrink-0"
                        />
                        <span className="text-sm font-bold text-on-surface truncate">
                          {req.name}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="py-1.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[15px]">check</span>
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id, req.name)}
                          className="py-1.5 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                          type="button"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests Section */}
            <div className="flex flex-col space-y-2 pt-2 border-t border-surface-container-high">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Sent Invitations ({outgoingRequests.length})
                </h3>
                <span className="text-[11px] text-on-surface-variant font-medium">Pending</span>
              </div>

              {outgoingRequests.length === 0 ? (
                <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high text-center">
                  <p className="text-xs text-on-surface-variant">No pending outgoing invitations</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 px-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high flex items-center justify-between gap-3 shadow-2xs"
                    >
                      {/* Avatar & Name ONLY */}
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={req.avatar}
                          alt={req.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <span className="text-sm font-bold text-on-surface truncate">
                          {req.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          Awaiting
                        </span>
                        <button
                          onClick={() => handleCancelOutgoing(req.id, req.name)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          type="button"
                          title="Cancel Invitation"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DISCOVER (Displays ONLY Name & Avatar + Connect Button) */}
        {activeTab === 'discover' && (
          <div className="flex flex-col space-y-4">
            {/* Quick Share Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary-fixed/50 via-surface-container-low to-surface-container-lowest border border-primary/20 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">link</span>
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-on-surface">Your Synergy Invite Link</h4>
                  <p className="text-[11px] text-on-surface-variant">
                    kairos.app/connect/alex-rivera-904
                  </p>
                </div>
              </div>

              <button
                onClick={handleCopyInviteLink}
                className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                type="button"
              >
                {copiedLink ? 'Copied ✓' : 'Copy Link'}
              </button>
            </div>

            {/* Suggested Buddies - Clean: Only Avatar + Name + Connect Button */}
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Suggested Buddies
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Discover new focus and study partners
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  Recommended
                </span>
              </div>

              <div className="flex flex-col space-y-2">
                {suggestedUsers.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3 px-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/80 hover:border-indigo-300 shadow-2xs flex items-center justify-between gap-3 transition-all"
                  >
                    {/* Avatar & Name ONLY */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={sug.avatar}
                        alt={sug.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-surface-container shrink-0"
                      />
                      <span className="text-sm font-bold text-on-surface truncate">
                        {sug.name}
                      </span>
                    </div>

                    <button
                      onClick={() => !sug.hasSentRequest && handleSendRequest(sug)}
                      disabled={sug.hasSentRequest}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        sug.hasSentRequest
                          ? 'bg-surface-container text-on-surface-variant cursor-default'
                          : 'bg-primary text-on-primary shadow-xs hover:bg-primary/90'
                      }`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {sug.hasSentRequest ? 'check' : 'person_add'}
                      </span>
                      <span>{sug.hasSentRequest ? 'Requested' : 'Connect'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DETAILED FRIEND PROFILE MODAL (Tapped User Details - Shows Full Stats or Basic Level for Private Accounts) */}
      {selectedUserDetail && (() => {
        const isPrivate = selectedUserDetail.visibilitySettings.whoCanSee === 'private';

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md max-h-[90dvh] rounded-3xl bg-surface-container-lowest shadow-2xl border border-surface-container-high flex flex-col overflow-hidden animate-fade-in text-left">
              {/* Header / Nav Bar */}
              <div className="p-4 pb-3 flex items-center justify-between border-b border-surface-container-high/60 shrink-0 bg-surface-container-low/40">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isPrivate ? 'bg-amber-500' : 'bg-primary'}`} />
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    {isPrivate ? 'Private Profile' : 'Evolution Profile'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/70 transition-all cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Scrollable Profile Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 mobile-scroll">
                {/* User Hero Avatar & Identity Card */}
                <div className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-surface-container-low border border-indigo-100 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={selectedUserDetail.avatar}
                        alt={selectedUserDetail.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 shadow-md"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                          selectedUserDetail.status === 'focusing'
                            ? 'bg-emerald-500 animate-pulse'
                            : selectedUserDetail.status === 'online'
                            ? 'bg-indigo-500'
                            : selectedUserDetail.status === 'resting'
                            ? 'bg-amber-400'
                            : 'bg-slate-400'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="text-base font-extrabold text-on-surface truncate leading-tight">
                        {selectedUserDetail.name}
                      </h3>
                      <p className="text-xs text-on-surface-variant font-medium">
                        @{selectedUserDetail.username}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-on-primary font-bold shadow-2xs">
                          {selectedUserDetail.league}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium truncate">
                          {selectedUserDetail.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end">
                    <div className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold flex items-center gap-1 shadow-2xs">
                      <span>Lvl {selectedUserDetail.level}</span>
                    </div>
                  </div>
                </div>

                {/* PRIVATE ACCOUNT VIEW: Show ONLY basic details (Level) & Private Banner */}
                {isPrivate ? (
                  <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-high/80 flex flex-col items-center justify-center text-center space-y-3 my-2">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant shadow-xs">
                      <span className="material-symbols-outlined text-[26px] text-slate-500">lock</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">This Account is Private</h4>
                      <p className="text-xs text-on-surface-variant max-w-[260px] leading-relaxed mt-1">
                        Detailed monthly focus metrics, balance web graph, and achievements are hidden by the user's privacy settings.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs">
                      <span className="material-symbols-outlined text-[15px]">military_tech</span>
                      <span>Level {selectedUserDetail.level} • {selectedUserDetail.levelTitle}</span>
                    </div>
                  </div>
                ) : (
                  /* PUBLIC / DETAILED ACCOUNT VIEW: Full Evolution Profile */
                  <>
                    {/* 1. LEVEL & XP PROGRESSION */}
                    {selectedUserDetail.visibilitySettings.showLevel ? (
                      <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-xs flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-primary text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                              {selectedUserDetail.level}
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-on-surface">
                                Level {selectedUserDetail.level} • {selectedUserDetail.levelTitle}
                              </h4>
                              <p className="text-[10px] text-on-surface-variant">
                                Tier progression rank
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-primary">
                            {selectedUserDetail.currentXp.toLocaleString()} /{' '}
                            {selectedUserDetail.nextLevelXp.toLocaleString()} XP
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden p-0.5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 shadow-sm transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (selectedUserDetail.currentXp / selectedUserDetail.nextLevelXp) * 100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* 2. MONTHLY TASKS & HP CARDS */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Total Monthly Tasks */}
                      {selectedUserDetail.visibilitySettings.showMonthlyTasks ? (
                        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-xs flex flex-col space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-on-surface-variant">
                              Monthly Tasks
                            </span>
                            <span className="material-symbols-outlined text-[18px] text-primary">
                              task_alt
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-extrabold text-on-surface font-sans">
                              {selectedUserDetail.monthlyTasksCompleted}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                              {selectedUserDetail.monthlyTasksGrowth}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant">
                            {(selectedUserDetail.monthlyTasksCompleted / 30).toFixed(1)} tasks/day avg
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-surface-container-low border border-dashed border-surface-container-high flex flex-col items-center justify-center text-center text-[11px] text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px] mb-1">lock</span>
                          <span>Monthly tasks hidden</span>
                        </div>
                      )}

                      {/* Total Monthly HP */}
                      {selectedUserDetail.visibilitySettings.showMonthlyHp ? (
                        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-xs flex flex-col space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-on-surface-variant">
                              Monthly HP
                            </span>
                            <span className="material-symbols-outlined text-[18px] text-amber-500">
                              bolt
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-extrabold text-amber-600 font-sans">
                              {selectedUserDetail.monthlyHpEarned.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-amber-800">HP</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant">
                            Squad spirit earned this month
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-surface-container-low border border-dashed border-surface-container-high flex flex-col items-center justify-center text-center text-[11px] text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px] mb-1">lock</span>
                          <span>Monthly HP hidden</span>
                        </div>
                      )}
                    </div>

                    {/* 3. 24-HOUR USED HOURS VS 24H TIMELINE GRAPH */}
                    {selectedUserDetail.visibilitySettings.showWebGraph ? (
                      <Timeline24HourGraph userName={selectedUserDetail.name} />
                    ) : null}

                    {/* 4. TOP 5 ACHIEVEMENTS UNLOCKED (INTERACTIVE SHOWCASE RACK) */}
                    {selectedUserDetail.visibilitySettings.showTopAchievements &&
                    selectedUserDetail.topAchievements.length > 0 ? (
                      <TopAchievementsShowcase achievements={selectedUserDetail.topAchievements} />
                    ) : null}

                    {/* 5. MUTUAL SYNERGY STATS (CLEAN 3-COLUMN METRIC TILES) */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Synergy Match Tile */}
                      <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex flex-col items-center text-center shadow-2xs">
                        <div className="flex items-center gap-1 text-emerald-600 mb-0.5">
                          <span className="material-symbols-outlined text-[15px]">sync_saved_locally</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Synergy</span>
                        </div>
                        <span className="text-base font-black text-on-surface font-sans">
                          {selectedUserDetail.synergyMatch}%
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium">Match</span>
                      </div>

                      {/* Co-Focus Hours Tile */}
                      <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex flex-col items-center text-center shadow-2xs">
                        <div className="flex items-center gap-1 text-indigo-600 mb-0.5">
                          <span className="material-symbols-outlined text-[15px]">timer</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Co-Focus</span>
                        </div>
                        <span className="text-base font-black text-indigo-600 font-sans">
                          {selectedUserDetail.sharedFocusHours}h
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium">Completed</span>
                      </div>

                      {/* Mutual Squads Tile */}
                      <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex flex-col items-center text-center shadow-2xs">
                        <div className="flex items-center gap-1 text-amber-600 mb-0.5">
                          <span className="material-symbols-outlined text-[15px]">groups</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Squads</span>
                        </div>
                        <span className="text-base font-black text-on-surface font-sans">
                          {selectedUserDetail.mutualSquads.length}
                        </span>
                        <span
                          className="text-[10px] text-on-surface-variant font-medium truncate max-w-[85px]"
                          title={selectedUserDetail.mutualSquads.join(', ')}
                        >
                          {selectedUserDetail.mutualSquads[0] || 'Mutual'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Modal Actions */}
              <div className="p-4 pt-3 border-t border-surface-container-high/80 bg-surface-container-low/60 flex items-center gap-2 shrink-0">
                {(() => {
                  const isAlreadyConnected = connections.some(
                    (c) =>
                      c.id === selectedUserDetail.id ||
                      c.username.toLowerCase() === selectedUserDetail.username.toLowerCase()
                  );

                  if (!isAlreadyConnected) {
                    return (
                      <>
                        <button
                          onClick={() => {
                            handleConnectDirectly(selectedUserDetail);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">person_add</span>
                          <span>Connect (+50 XP)</span>
                        </button>

                        <button
                          onClick={() => {
                            handleTandemInvite(selectedUserDetail);
                            setSelectedUserDetail(null);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">timer</span>
                          <span>Tandem</span>
                        </button>

                        <button
                          onClick={() => {
                            setCheerModalUser(selectedUserDetail);
                            setSelectedUserDetail(null);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">favorite</span>
                          <span>Cheer</span>
                        </button>
                      </>
                    );
                  }

                  return (
                    <>
                      <button
                        onClick={() => {
                          handleTandemInvite(selectedUserDetail);
                          setSelectedUserDetail(null);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">timer</span>
                        <span>Tandem Focus</span>
                      </button>

                      <button
                        onClick={() => {
                          setCheerModalUser(selectedUserDetail);
                          setSelectedUserDetail(null);
                        }}
                        className="py-2.5 px-3.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">favorite</span>
                        <span>Cheer</span>
                      </button>

                      <button
                        onClick={() =>
                          handleRemoveConnection(selectedUserDetail.id, selectedUserDetail.name)
                        }
                        className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-rose-600 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                        type="button"
                        title="Remove friend"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_remove</span>
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* QUICK CHEER POPUP MODAL */}
      {cheerModalUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest p-4 shadow-2xl border border-surface-container-high flex flex-col space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={cheerModalUser.avatar}
                  alt={cheerModalUser.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-xs font-bold text-on-surface">
                    Cheer for {cheerModalUser.name}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-medium">
                    Send a motivational pulse to their device
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheerModalUser(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quick Cheer Presets */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Keep crushing it! 🔥', xp: '+15 HP' },
                { label: 'Deep Work Flow! ⚡', xp: '+15 HP' },
                { label: 'Hydration check! 💧', xp: '+10 HP' },
                { label: 'Crown Vanguard! 👑', xp: '+25 HP' }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleSendCheer(item.label)}
                  className="p-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container active:scale-95 transition-all text-xs font-bold text-on-surface flex flex-col items-start border border-surface-container-high/60 cursor-pointer text-left"
                  type="button"
                >
                  <span>{item.label}</span>
                  <span className="text-[9px] text-indigo-600 font-extrabold mt-1">
                    {item.xp} Spirit
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Cheer Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={customCheerText}
                onChange={(e) => setCustomCheerText(e.target.value)}
                placeholder="Write custom cheer..."
                className="flex-1 h-9 px-3 rounded-xl bg-surface-container-low border border-surface-container-high focus:outline-none focus:border-primary text-xs font-medium text-on-surface"
              />
              <button
                onClick={() => customCheerText && handleSendCheer(customCheerText)}
                disabled={!customCheerText}
                className="h-9 px-3 rounded-xl bg-primary disabled:opacity-50 text-on-primary text-xs font-bold cursor-pointer transition-all shrink-0"
                type="button"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KAIROS QR SCANNER MODAL (FOCUSED LIVE CAMERA SCANNER) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest p-5 shadow-2xl border border-surface-container-high flex flex-col space-y-3.5 animate-fade-in max-h-[92vh] overflow-y-auto mobile-scroll">
            {/* Header with Title & Close */}
            <div className="flex items-center justify-between w-full shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-primary-fixed/30 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                </span>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-on-surface leading-tight">Scan Kairos QR Code</h3>
                  <p className="text-[10px] text-on-surface-variant">Point camera at any user QR to open their profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface bg-surface-container-high/50 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Simulated Camera Viewfinder */}
            <div
              className={`relative w-full h-52 rounded-2xl overflow-hidden border border-slate-700/60 flex flex-col items-center justify-center transition-colors ${
                isFlashlightOn ? 'bg-slate-800' : 'bg-slate-950'
              }`}
            >
              {/* Camera Noise/Grid Background Texture */}
              <div className="absolute inset-0 bg-[radial-gradient(#4338ca_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

              {/* Corner Reticle Brackets */}
              <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg pointer-events-none" />
              <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-indigo-400 rounded-br-lg pointer-events-none" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-bounce pointer-events-none" />

              {/* Viewfinder Center Target Box */}
              <div className="w-32 h-32 rounded-xl border border-indigo-400/40 bg-indigo-500/5 flex flex-col items-center justify-center p-3 text-center pointer-events-none">
                <span className="material-symbols-outlined text-cyan-300 text-[28px] animate-pulse">
                  center_focus_strong
                </span>
                <span className="text-[10px] font-bold text-cyan-200 mt-1">
                  Align QR inside frame
                </span>
              </div>

              {/* Flashlight button */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                <button
                  onClick={() => setIsFlashlightOn((prev) => !prev)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors cursor-pointer ${
                    isFlashlightOn
                      ? 'bg-amber-400 text-slate-900 shadow-md'
                      : 'bg-black/40 text-white/80 hover:text-white'
                  }`}
                  type="button"
                  title={isFlashlightOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isFlashlightOn ? 'flashlight_on' : 'flashlight_off'}
                  </span>
                </button>
              </div>

              <div className="absolute bottom-2 inset-x-0 flex items-center justify-center">
                <span className="text-[10px] text-slate-400 bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full font-medium">
                  Live Neural Scanner Active
                </span>
              </div>
            </div>

            {/* Gallery Upload Simulation */}
            <button
              onClick={() => {
                handleScanUser('@clara.thorne');
              }}
              className="w-full py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container-high/80 active:scale-95 transition-all text-xs font-semibold text-on-surface flex items-center justify-center gap-2 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-indigo-600 text-[17px]">
                photo_library
              </span>
              <span>Scan QR from Photo Gallery</span>
            </button>

            {/* Quick-Scan Sample Friends Grid (with Unique QR Previews) */}
            <div className="space-y-2 pt-1 border-t border-surface-container-high/60 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-on-surface flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-500 text-[14px]">
                    bolt
                  </span>
                  <span>Quick-Scan User QR Codes:</span>
                </span>
                <span className="text-[9px] text-on-surface-variant">Tap to simulate scan</span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto mobile-scroll pr-0.5">
                {[
                  {
                    name: 'Dr. Clara Thorne',
                    handle: '@clara.thorne',
                    role: 'Neuro Researcher',
                    avatar:
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
                  },
                  {
                    name: 'Kenji Sato',
                    handle: '@kenji.sato',
                    role: 'Full Stack Eng',
                    avatar:
                      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80'
                  },
                  {
                    name: 'Dr. Samira Khan',
                    handle: '@samira.neuro',
                    role: 'Circadian Scientist',
                    avatar:
                      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80'
                  },
                  {
                    name: 'Felix Vance',
                    handle: '@felix.flow',
                    role: 'Deep Author',
                    avatar:
                      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80'
                  },
                  {
                    name: 'Jordan Hayes',
                    handle: '@jordan.flow',
                    role: 'Deep Work Lead',
                    avatar:
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgLOuJNzuXdfMA_l_HciKsSVC0oQXPWyUR2PEhp5sfyDYy_MN7VjOgjlO9rNFa8gwP-VU3yiUh-pLQJ2TEIrstc_8RnsFKYlSzMKP8OYTtxSqPI0pj24k4sYxnqYhRsK-K8ROdr0b--_dorazU9amHEYofZqgsXW7UyL6BRwSrW38ceF_G2TDNgVZer2UfPXy5hnH_QBSdPpomakBqpjHOZRUgx9uGXMKwQ5WKwNcuJAGGYLO-TzRAA'
                  },
                  {
                    name: 'Elena Rostova',
                    handle: '@elena.vector',
                    role: 'Productivity Architect',
                    avatar:
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                  },
                  {
                    name: 'Marcus Sterling',
                    handle: '@marcus.build',
                    role: 'Full Stack Creator',
                    avatar:
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
                  },
                  {
                    name: 'Sophia Chen',
                    handle: '@sophia.zen',
                    role: 'Circadian Coach',
                    avatar:
                      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80'
                  }
                ].map((user) => (
                  <button
                    key={user.handle}
                    onClick={() => handleScanUser(user.handle)}
                    className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container-high/60 active:scale-95 transition-all flex items-center justify-between gap-1.5 cursor-pointer text-left group"
                    type="button"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-on-surface truncate">
                          {user.name}
                        </span>
                        <span className="text-[9px] text-indigo-600 font-medium truncate">
                          {user.handle}
                        </span>
                      </div>
                    </div>

                    {/* Miniature Unique QR Thumbnail */}
                    <div className="shrink-0 p-0.5 rounded-md bg-white border border-slate-200 group-hover:border-indigo-400 transition-colors shadow-2xs">
                      <UniqueQRCodeSVG
                        seed={user.handle}
                        size={28}
                        className="!p-0 !border-0 !shadow-none !rounded-none"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionsScreen;
