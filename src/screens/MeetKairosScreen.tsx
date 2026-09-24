import React, { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Capability {
  id: string;
  title: string;
  desc: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  details: string;
  metrics: string;
}

const CAPABILITIES: Capability[] = [
  {
    id: 'study-mentor',
    title: 'Study Mentor',
    desc: 'Adaptive Socratic coaching for skill retention.',
    icon: 'psychology',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    details: 'Leverages spaced repetition and dialectic inquiry tailored to your neural circadian rhythms.',
    metrics: '+42% Retention Rate'
  },
  {
    id: 'smart-routines',
    title: 'Smart Routines',
    desc: 'Triggers calibrated to natural focus peaks.',
    icon: 'routine',
    iconBg: 'bg-secondary-container/30',
    iconColor: 'text-on-secondary-container',
    details: 'Dynamically shifts your daily agenda based on cognitive load, sleep quality, and biometrics.',
    metrics: 'Peak State Sync'
  },
  {
    id: 'rest-safeguard',
    title: 'Rest Safeguard',
    desc: 'Guilt-free recovery days and screen rest locks.',
    icon: 'shield_with_heart',
    iconBg: 'bg-tertiary-fixed/60',
    iconColor: 'text-on-tertiary-fixed-variant',
    details: 'Enforces deliberate downtime, preventing burnout by protecting neural recovery intervals.',
    metrics: 'Zero Burnout Guarantee'
  },
  {
    id: 'squad-quests',
    title: 'Squad Quests',
    desc: 'Challenge friends and celebrate milestones.',
    icon: 'emoji_events',
    iconBg: 'bg-surface-container-high',
    iconColor: 'text-primary',
    details: 'Cooperative accountability sprints with ambient synchronization and shared achievements.',
    metrics: '3.8x Habit Adherence'
  }
];

interface MeetKairosScreenProps {
  onGetStarted: () => void;
}

export const MeetKairosScreen: React.FC<MeetKairosScreenProps> = ({ onGetStarted }) => {
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null);

  const handleCardClick = (cap: Capability) => {
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {
      // Fallback
    }
    setSelectedCapability(cap);
  };

  const handleGetStartedClick = () => {
    try {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } catch {
      // Fallback
    }
    onGetStarted();
  };

  return (
    <div className="w-full h-full flex flex-col bg-surface overflow-hidden relative selection:bg-primary-fixed selection:text-on-primary-fixed antialiased">
      {/* Ambient background glows */}
      <div className="absolute -top-16 -left-12 w-64 h-64 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-16 w-72 h-72 rounded-full bg-tertiary-fixed-dim/30 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-20 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none -z-10" />

      {/* Main Scrollable App Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-safe pb-6 space-y-5">
        {/* Top Spacer / Status Bar offset */}
        <div className="pt-2" />

        {/* Hero Visual Stage (Standard App Size) */}
        <div className="relative w-full rounded-3xl overflow-hidden shadow-md bg-surface-container-lowest border border-outline-variant/30 group">
          <div className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden">
            <img
              alt="3D render of Kairos companion environment"
              className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWXkvABH5XXvkPluX_iyJn5IGobTaVfjxXE1AyOe-G_t6gQ6nJIrIVFnia1WTWpfDoFlafFZfVU2zUfeh9_z8gGtVHBKYmZ4qZIy48kwsSxqoh6_zrYuxbo_omRv30cEg_-5smr1YHRnY9kI637vJpTL5BrBMet7WwJHbxIJJw49-Ur5uJ2miTOP_xNTXl6P0rFR-1cG2jGthzx0ET8Tbt1dIcmAhNpig3lLcKe2mSYLWJcz74VoOA5w"
            />
            {/* Dynamic Status Chip */}
            <div className="absolute top-3.5 left-3.5 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/85 backdrop-blur-md shadow-xs border border-white/60">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-xs uppercase tracking-wider text-primary font-bold">
                Kairos Core 2.0
              </span>
            </div>

            {/* Vitality Pill */}
            <div className="absolute bottom-3.5 right-3.5 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/85 backdrop-blur-md shadow-sm text-on-surface border border-white/60">
              <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              <span className="text-xs font-semibold text-on-surface">
                Mindful &amp; Ready
              </span>
            </div>
          </div>
        </div>

        {/* Narrative Mobile Header */}
        <div className="flex flex-col space-y-2 text-center items-center px-1">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs uppercase tracking-wider font-bold shadow-xs">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
            <span>Living Rhythm</span>
          </div>
          <h1 className="text-2xl xs:text-3xl font-extrabold text-on-surface tracking-tight leading-snug">
            Meet Kairos, Your Companion in{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Time &amp; Growth
            </span>
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm">
            A sentient rhythm of personal intelligence, intentional routines, and mindful vitality crafted around your human flow.
          </p>
        </div>

        {/* Superpowers Section Header */}
        <div className="space-y-3 pt-1 pb-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-base font-bold text-on-surface tracking-tight">
              Core Superpowers
            </span>
            <span className="text-xs font-semibold text-primary bg-primary-fixed/50 px-2.5 py-0.5 rounded-full">
              4 Modules Active
            </span>
          </div>

          {/* 2x2 App Cards Grid */}
          <div className="grid grid-cols-2 gap-3" id="superpowers-grid">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.id}
                onClick={() => handleCardClick(cap)}
                className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs hover:shadow-md hover:border-primary/40 active:scale-[0.97] transition-all flex flex-col justify-between space-y-2.5 cursor-pointer group"
                role="button"
                tabIndex={0}
                aria-label={`Explore ${cap.title}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl ${cap.iconBg} flex items-center justify-center ${cap.iconColor} group-hover:scale-105 transition-transform`}>
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {cap.icon}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-base group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                    arrow_forward
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-on-surface block group-hover:text-primary transition-colors">
                    {cap.title}
                  </span>
                  <p className="text-xs leading-snug text-on-surface-variant line-clamp-2">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capability Deep-Dive Modal / Bottom Sheet */}
      {selectedCapability && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 pb-safe animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-11 h-11 rounded-2xl ${selectedCapability.iconBg} flex items-center justify-center ${selectedCapability.iconColor}`}>
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {selectedCapability.icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    {selectedCapability.title}
                  </h3>
                  <span className="text-xs font-semibold text-primary">
                    {selectedCapability.metrics}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCapability(null)}
                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors"
                aria-label="Close details"
                type="button"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              {selectedCapability.details}
            </p>

            <button
              onClick={() => setSelectedCapability(null)}
              className="w-full h-12 rounded-full bg-primary text-on-primary text-sm font-bold hover:bg-primary-container transition-colors shadow-md active:scale-98"
              type="button"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Fixed Native Action Dock (Always Clickable, Never Blocked) */}
      <div className="w-full px-5 py-3.5 pb-safe bg-surface/95 backdrop-blur-lg border-t border-outline-variant/25 shadow-lg flex-shrink-0 z-30 flex flex-col items-center">
        <button
          onClick={handleGetStartedClick}
          className="w-full h-14 rounded-full bg-gradient-to-r from-primary via-primary-container to-secondary text-on-primary text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 group cursor-pointer"
          id="get-started-btn"
          type="button"
        >
          <span>Get Started with Kairos</span>
          <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
};
