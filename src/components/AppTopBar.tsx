import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface AppTopBarProps {
  subtitle: string;
  rightAction?: React.ReactNode;
  onRightActionClick?: () => void;
  rightActionIcon?: string; // Material symbol icon name e.g. "notifications", "add", "settings", "close"
  rightActionLabel?: string; // Accessible label
  leftAction?: React.ReactNode;
  onBack?: () => void;
  showBackArrow?: boolean;
}

export const SplashOrb: React.FC<{ sizeClass?: string; textSize?: string }> = ({
  sizeClass = 'w-8 h-8 sm:w-9 sm:h-9',
  textSize = 'text-xs sm:text-sm'
}) => (
  <div
    className={`relative z-10 ${sizeClass} rounded-full backdrop-blur-xl flex items-center justify-center overflow-hidden border border-white/80 shrink-0 shadow-sm`}
    style={{
      boxShadow:
        'rgba(99, 102, 241, 0.35) 0px 0px 10px 2px, rgba(236, 72, 153, 0.25) 0px 0px 16px 4px, rgba(255, 255, 255, 0.6) 0px 0px 8px inset'
    }}
  >
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] opacity-95" />
    <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#38bdf8] filter blur-[2px] opacity-70 animate-pulse" />
    <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#f43f5e] filter blur-[2px] opacity-70 animate-pulse" />
    <div className="absolute top-0.5 left-1 w-2.5 h-2.5 rounded-full bg-white filter blur-[1px] opacity-75 pointer-events-none" />
    <span className={`relative z-10 font-serif font-bold text-white select-none ${textSize} drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]`}>
      K
    </span>
  </div>
);

export const AppTopBar: React.FC<AppTopBarProps> = ({
  subtitle,
  rightAction,
  onRightActionClick,
  rightActionIcon,
  rightActionLabel,
  leftAction,
  onBack,
  showBackArrow
}) => {
  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => { });
    } catch {
      // fallback
    }
  };

  const handleRightAction = () => {
    triggerHaptic();
    if (onRightActionClick) onRightActionClick();
  };

  const handleBack = () => {
    triggerHaptic();
    if (onBack) onBack();
  };

  return (
    <header className="sticky top-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl shadow-xs pt-safe border-b border-surface-container/60 shrink-0">
      <div className="h-14 px-3.5 flex items-center justify-between">
        {/* Left Side: [Back Arrow Head (Chevron)] + Splash Orb + App Title ("Kairos") + Screen Subtitle */}
        <div className="flex items-center gap-2 min-w-0">
          {(showBackArrow || onBack) && (
            <button
              onClick={handleBack}
              aria-label="Back"
              type="button"
              className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center text-on-surface hover:text-indigo-600 hover:bg-surface-container-high/60 active:scale-90 transition-all cursor-pointer border-none bg-surface-container-low/70 shrink-0"
            >
              <svg
                className="w-5 h-5 text-on-surface"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {leftAction || <SplashOrb />}

          <div className="flex flex-col min-w-0 text-left">
            <span className="font-headline-sm text-sm sm:text-base tracking-tight text-on-surface font-extrabold leading-tight truncate">
              Kairos
            </span>
            <span className="text-[11px] text-on-surface-variant font-medium leading-tight truncate">
              {subtitle}
            </span>
          </div>
        </div>

        {/* Right Side: ONLY action icon(s) without text name */}
        <div className="flex items-center gap-1.5 shrink-0">
          {rightAction ? (
            rightAction
          ) : rightActionIcon ? (
            <button
              onClick={handleRightAction}
              aria-label={rightActionLabel || rightActionIcon}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 active:scale-95 transition-all cursor-pointer border-none bg-surface-container-low/70"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">
                {rightActionIcon}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

