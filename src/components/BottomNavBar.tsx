import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface BottomNavBarProps {
  activeTab: 'home' | 'tasks' | 'companion' | 'squad' | 'profile' | string;
  onNavigateTab?: (tab: string) => void;
  userInitial?: string;
  userProfile?: { email: string; name: string } | null;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onNavigateTab,
  userInitial,
  userProfile
}) => {
  const displayInitial =
    userInitial ||
    (userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'K');
  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // Fallback
    }
  };

  const handleTabClick = (tab: string) => {
    triggerHaptic(tab === 'companion' ? ImpactStyle.Medium : ImpactStyle.Light);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-3.5 pointer-events-none pb-safe"
    >
      <div className="pointer-events-auto flex items-center justify-between w-full max-w-[420px] h-16 px-2 rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_12px_36px_-4px_rgba(79,70,229,0.18),0_4px_16px_-2px_rgba(0,0,0,0.06)]">
        {/* Tab 1: Home Sanctuary */}
        <button
          onClick={() => handleTabClick('home')}
          aria-label="Home Dashboard"
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center p-1 transition-all duration-200 active:scale-95 cursor-pointer group ${
            activeTab === 'home'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-400 hover:text-indigo-600 font-medium'
          }`}
          type="button"
        >
          <div
            className={`flex items-center justify-center p-1 rounded-xl transition-all duration-200 ${
              activeTab === 'home'
                ? 'bg-indigo-50 text-indigo-600 shadow-[0_2px_8px_rgba(99,102,241,0.12)] scale-105'
                : 'text-slate-400 group-hover:text-indigo-600 group-hover:bg-slate-50'
            }`}
          >
            <svg
              className={`w-[22px] h-[22px] transition-transform duration-200 ${
                activeTab === 'home' ? 'stroke-indigo-600 fill-indigo-200/40' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={activeTab === 'home' ? '2.4' : '2'}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <span
            className={`text-[11px] mt-0.5 tracking-tight ${
              activeTab === 'home' ? 'font-bold text-indigo-600' : 'font-semibold text-slate-500'
            }`}
          >
            Home
          </span>
        </button>

        {/* Tab 2: Tasks & Flow */}
        <button
          onClick={() => handleTabClick('tasks')}
          aria-label="Daily Tasks and Flow"
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center p-1 transition-all duration-200 active:scale-95 cursor-pointer group ${
            activeTab === 'tasks'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-400 hover:text-indigo-600 font-medium'
          }`}
          type="button"
        >
          <div
            className={`flex items-center justify-center p-1 rounded-xl transition-all duration-200 ${
              activeTab === 'tasks'
                ? 'bg-indigo-50 text-indigo-600 shadow-[0_2px_8px_rgba(99,102,241,0.12)] scale-105'
                : 'text-slate-400 group-hover:text-indigo-600 group-hover:bg-slate-50'
            }`}
          >
            <svg
              className={`w-[22px] h-[22px] transition-transform duration-200 ${
                activeTab === 'tasks' ? 'stroke-indigo-600 fill-indigo-200/40' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={activeTab === 'tasks' ? '2.4' : '2'}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <span
            className={`text-[11px] mt-0.5 tracking-tight ${
              activeTab === 'tasks' ? 'font-bold text-indigo-600' : 'font-semibold text-slate-500'
            }`}
          >
            Tasks
          </span>
        </button>

        {/* Center Hero Tab: Aura AI Companion */}
        <button
          onClick={() => handleTabClick('companion')}
          aria-label="Kairos AI Companion"
          title="Kairos AI Companion"
          className="relative -top-3.5 flex flex-col items-center justify-center group px-1 active:scale-95 transition-transform cursor-pointer"
          type="button"
        >
          <div
            className={`w-[50px] h-[50px] rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center text-white border-[2.5px] border-white transition-all duration-300 group-hover:scale-105 ${
              activeTab === 'companion'
                ? 'ring-4 ring-indigo-400/50 shadow-[0_0_30px_8px_rgba(99,102,241,0.45)] scale-110'
                : 'shadow-[0_0_24px_5px_rgba(99,102,241,0.32)] group-hover:shadow-[0_0_28px_8px_rgba(99,102,241,0.42)]'
            }`}
          >
            <svg
              className="w-6 h-6 animate-pulse"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span
            className={`text-[11px] font-extrabold mt-1 tracking-tight transition-colors ${
              activeTab === 'companion' ? 'text-indigo-700 font-black' : 'text-indigo-600/80'
            }`}
          >
            Aura AI
          </span>
        </button>

        {/* Tab 4: Squad & Quests */}
        <button
          onClick={() => handleTabClick('squad')}
          aria-label="Friends and Squad Challenges"
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center p-1 transition-all duration-200 active:scale-95 cursor-pointer group ${
            activeTab === 'squad'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-400 hover:text-indigo-600 font-medium'
          }`}
          type="button"
        >
          <div
            className={`flex items-center justify-center p-1 rounded-xl transition-all duration-200 ${
              activeTab === 'squad'
                ? 'bg-indigo-50 text-indigo-600 shadow-[0_2px_8px_rgba(99,102,241,0.12)] scale-105'
                : 'text-slate-400 group-hover:text-indigo-600 group-hover:bg-slate-50'
            }`}
          >
            <svg
              className={`w-[22px] h-[22px] transition-transform duration-200 ${
                activeTab === 'squad' ? 'stroke-indigo-600 fill-indigo-200/40' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={activeTab === 'squad' ? '2.4' : '2'}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <span
            className={`text-[11px] mt-0.5 tracking-tight ${
              activeTab === 'squad' ? 'font-bold text-indigo-600' : 'font-semibold text-slate-500'
            }`}
          >
            Squad
          </span>
        </button>

        {/* Tab 5: Profile & Evolution */}
        <button
          onClick={() => handleTabClick('profile')}
          aria-label="Profile Analytics and Evolution"
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center p-1 transition-all duration-200 active:scale-95 cursor-pointer group ${
            activeTab === 'profile'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-400 hover:text-indigo-600 font-medium'
          }`}
          type="button"
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 group-hover:scale-105 ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.25)] ring-2 ring-indigo-400/60 scale-105'
                : 'bg-gradient-to-tr from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            {displayInitial}
          </div>
          <span
            className={`text-[11px] mt-0.5 tracking-tight ${
              activeTab === 'profile' ? 'font-bold text-indigo-600' : 'font-semibold text-slate-500'
            }`}
          >
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavBar;
