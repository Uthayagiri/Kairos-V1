import React, { useState, useMemo } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface SettingsScreenProps {
  userProfile?: { email: string; name: string } | null;
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
  onLogOut?: () => void;
}

export function SettingsScreen({
  userProfile,
  onBack,
  onNavigateTab,
  onLogOut
}: SettingsScreenProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Toggles state
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(true);
  const [autoExtractEnabled, setAutoExtractEnabled] = useState(true);
  const [circadianSyncEnabled, setCircadianSyncEnabled] = useState(true);
  const [ritualRemindersEnabled, setRitualRemindersEnabled] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(true);
  const [incognitoEnabled, setIncognitoEnabled] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Preference Values
  const [persona, setPersona] = useState('Aura (Empathetic)');
  const [voiceCadence, setVoiceCadence] = useState('Sol');
  const [proactivityLevel, setProactivityLevel] = useState<'Gentle' | 'Balanced' | 'Intense'>('Gentle');
  const [restWindow, setRestWindow] = useState('11PM - 7AM');
  const [socialVisibility, setSocialVisibility] = useState<'Friends Only' | 'Public' | 'Ghost Mode'>('Friends Only');
  const [appearanceMode, setAppearanceMode] = useState<'Auto Light' | 'Pure Dark' | 'Solar Circadian'>('Auto Light');
  const [cacheSize, setCacheSize] = useState('142 MB');
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    | null
    | 'persona'
    | 'voice'
    | 'proactivity'
    | 'vault'
    | 'buffer'
    | 'rest'
    | 'health'
    | 'calendar'
    | 'visibility'
    | 'export'
    | 'appearance'
    | 'engine'
    | 'logout'
    | 'delete'
  >(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    if (!hapticsEnabled) return;
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // web preview fallback
    }
  };

  const handleBack = () => {
    triggerHaptic(ImpactStyle.Light);
    if (onBack) {
      onBack();
    } else if (onNavigateTab) {
      onNavigateTab('profile');
    } else {
      window.history.back();
    }
  };

  const handleTabClick = (tab: string) => {
    triggerHaptic(ImpactStyle.Light);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  const handleClearCache = () => {
    triggerHaptic(ImpactStyle.Medium);
    setIsClearingCache(true);
    setTimeout(() => {
      setIsClearingCache(false);
      setCacheSize('0 KB');
      showToast('Offline cache & embeddings cleared successfully (142 MB freed)');
    }, 800);
  };

  const handleExportData = (format: 'JSON' | 'Markdown') => {
    triggerHaptic(ImpactStyle.Medium);
    setActiveModal(null);
    showToast(`Vault exported in ${format} format. Download initiated.`);
  };

  const handleClearBuffer = () => {
    triggerHaptic(ImpactStyle.Medium);
    setActiveModal(null);
    showToast('Recent context buffer reset and cache tokens flushed.');
  };

  // Filter helper
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  const section1Visible = useMemo(() => {
    return (
      matchesSearch('Companion & AI Intelligence') ||
      matchesSearch('Companion Persona Aura Empathetic') ||
      matchesSearch('Voice & Tone Cadence Sol Warm Studio') ||
      matchesSearch('Proactivity Level Balanced Nudges Mindful study') ||
      matchesSearch('Deep Think 2.5 Pro Enhanced multi-step cognitive synthesis')
    );
  }, [searchQuery]);

  const section2Visible = useMemo(() => {
    return (
      matchesSearch('Memory & Cognitive Vault Encrypted Enclave') ||
      matchesSearch('Anchored Memories core concepts habitual preferences') ||
      matchesSearch('Auto-Extract Insights continuously extract learning cues') ||
      matchesSearch('Working Context Buffer reset recent prompt history trim cache tokens')
    );
  }, [searchQuery]);

  const section3Visible = useMemo(() => {
    return (
      matchesSearch('Circadian Cadence & Notifications') ||
      matchesSearch('Circadian Rhythm Sync gentle morning wakeup midday focus peak') ||
      matchesSearch('Gentle Rest Window mute non-vital alerts 11:00 PM 7:00 AM') ||
      matchesSearch('Ritual & Task Reminders scheduled nudges habit blocks')
    );
  }, [searchQuery]);

  const section4Visible = useMemo(() => {
    return (
      matchesSearch('Connectivity & Integrations') ||
      matchesSearch('Apple Health & Biometrics recovery HRV sleep stage sync') ||
      matchesSearch('Calendar Sync Google Calendar accounts linked') ||
      matchesSearch('Squad & Social Visibility cadence leaderboard weekly podium')
    );
  }, [searchQuery]);

  const section5Visible = useMemo(() => {
    return (
      matchesSearch('Privacy & Security') ||
      matchesSearch('Local App Lock FaceID TouchID resume') ||
      matchesSearch('Ephemeral Incognito Mode private sessions memory index') ||
      matchesSearch('Data Portability & Archives export complete memory vault')
    );
  }, [searchQuery]);

  const section6Visible = useMemo(() => {
    return (
      matchesSearch('Preferences & System') ||
      matchesSearch('Appearance Light Mode dynamically shifts circadian hour') ||
      matchesSearch('Haptic & Sound Feedback kinetic clicks task check-off') ||
      matchesSearch('Storage & Local Cache offline embeddings') ||
      matchesSearch('Kairos Engine build up to date version')
    );
  }, [searchQuery]);

  const hasAnyMatch =
    section1Visible ||
    section2Visible ||
    section3Visible ||
    section4Visible ||
    section5Visible ||
    section6Visible;

  return (
    <div className="w-full h-full bg-surface text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed antialiased relative overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fadeIn">
          <div className="bg-on-surface text-surface-container-lowest px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold max-w-[90%] border border-surface-container-high/20 backdrop-blur-md">
            <span className="material-symbols-outlined text-primary-fixed text-base">check_circle</span>
            <span className="truncate">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-28 px-gutter-mobile flex flex-col justify-center gap-space-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <button
                aria-label="Back"
                className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors active:scale-95 cursor-pointer border-none bg-transparent"
                onClick={handleBack}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <h1 className="font-headline-sm text-headline-sm text-on-surface">Settings</h1>
            </div>
            <div className="flex items-center gap-space-xs">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-primary font-semibold hover:underline"
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="w-full">
            <div className="h-10 px-space-sm rounded-full bg-surface-container-low/90 flex items-center gap-space-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] border border-surface-container-high/40 focus-within:border-primary/40 focus-within:bg-surface-container-lowest transition-all">
              <span className="material-symbols-outlined text-[18px] text-outline shrink-0">search</span>
              <input
                className="w-full bg-transparent border-none outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline"
                placeholder="Search settings and preferences..."
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface text-xs shrink-0"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full pt-32 pb- dock-safe-inset pb-32 px-gutter-mobile bg-surface overflow-y-auto mobile-scroll">
        <div className="flex flex-col w-full pb-10 max-w-[440px] mx-auto">
          {!hasAnyMatch ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline mb-3">
                <span className="material-symbols-outlined text-2xl">search_off</span>
              </div>
              <h3 className="font-headline-sm text-base text-on-surface font-semibold">No matching settings</h3>
              <p className="text-body-sm text-outline mt-1 max-w-[260px]">
                No preferences found for &quot;{searchQuery}&quot;. Try checking for keywords like &quot;Vault&quot;, &quot;Audio&quot;, or &quot;Sync&quot;.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 rounded-full bg-primary-fixed text-primary font-label-md text-xs font-semibold hover:bg-primary-fixed-dim active:scale-95 transition-all"
                type="button"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-space-lg w-full">
              {/* Section 1: Companion & AI Intelligence */}
              {section1Visible && (
                <div className="flex flex-col gap-space-2xs animate-fadeIn">
                  <div className="px-space-xs flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
                      Companion &amp; AI Intelligence
                    </span>
                    <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                      Active Agent
                    </span>
                  </div>
                  <div className="w-full rounded-2xl bg-surface-container-lowest shadow-[0_6px_24px_-4px_rgba(79,70,229,0.06)] border border-surface-container-high/40 overflow-hidden divide-y divide-surface-container-high/30">
                    {/* Persona Item */}
                    {matchesSearch('Companion Persona Aura Empathetic guide prompt posture') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('persona');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors active:bg-surface-container cursor-pointer border-none bg-transparent"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                              Companion Persona
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> {persona}
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Empathetic guide • Adaptive prompt posture
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-[20px] flex-shrink-0">
                          chevron_right
                        </span>
                      </button>
                    )}

                    {/* Voice & Tone */}
                    {matchesSearch('Voice & Tone Cadence Warm Studio Sol Auto-playback') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('voice');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">graphic_eq</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Voice &amp; Tone Cadence
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Warm Studio • {voiceCadence} • Auto-playback enabled
                          </span>
                        </div>
                        <span className="font-label-md text-label-md text-primary font-semibold flex-shrink-0 flex items-center gap-0.5">
                          {voiceCadence} <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </span>
                      </button>
                    )}

                    {/* Proactivity Level */}
                    {matchesSearch('Proactivity Level Balanced Nudges Mindful study cadence Gentle') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('proactivity');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary-container flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">vital_signs</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Proactivity Level
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Balanced Nudges • Mindful study cadence
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                          {proactivityLevel}
                        </span>
                      </button>
                    )}

                    {/* Deep Think Reasoning Toggle */}
                    {matchesSearch('Deep Think 2.5 Pro Enhanced multi-step cognitive synthesis PRO') && (
                      <div className="w-full p-space-md flex items-center gap-space-md justify-between bg-surface-container-lowest">
                        <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">psychology</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                              Deep Think 2.5 Pro
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-tertiary-fixed-dim text-on-tertiary-fixed font-label-sm text-[10px] font-bold">
                              PRO
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Enhanced multi-step cognitive synthesis
                          </span>
                        </div>
                        <button
                          aria-label="Toggle Deep Think Reasoning"
                          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors shadow-inner flex-shrink-0 border-none ${
                            deepThinkEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'
                          }`}
                          onClick={() => {
                            triggerHaptic(ImpactStyle.Light);
                            setDeepThinkEnabled(!deepThinkEnabled);
                            showToast(
                              !deepThinkEnabled
                                ? 'Deep Think 2.5 Pro enabled for complex reasoning'
                                : 'Deep Think disabled (Fast synthesis active)'
                            );
                          }}
                          type="button"
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform duration-200 ease-in-out ${
                              deepThinkEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: Memory & Cognitive Vault */}
              {section2Visible && (
                <div className="flex flex-col gap-space-2xs animate-fadeIn">
                  <div className="px-space-xs flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
                      Memory &amp; Cognitive Vault
                    </span>
                    <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock</span> Encrypted Enclave
                    </span>
                  </div>
                  <div className="w-full rounded-2xl bg-surface-container-lowest shadow-[0_6px_24px_-4px_rgba(79,70,229,0.06)] border border-surface-container-high/40 overflow-hidden divide-y divide-surface-container-high/30">
                    {/* Long-Term Memory Vault */}
                    {matchesSearch('Anchored Memories 34 core concepts habitual preferences indexed') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('vault');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors cursor-pointer border-none bg-transparent active:bg-surface-container"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">dataset</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Anchored Memories
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            34 core concepts &amp; habitual preferences indexed
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1 flex-shrink-0">
                          Inspect Vault <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </span>
                      </button>
                    )}

                    {/* Auto-Extract Insights Toggle */}
                    {matchesSearch('Auto-Extract Insights continuously extract learning cues') && (
                      <div className="w-full p-space-md flex items-center gap-space-md justify-between bg-surface-container-lowest">
                        <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">insights</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Auto-Extract Insights
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Continuously extract learning cues from cadence
                          </span>
                        </div>
                        <button
                          aria-label="Toggle Auto-Extract Insights"
                          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors shadow-inner flex-shrink-0 border-none ${
                            autoExtractEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'
                          }`}
                          onClick={() => {
                            triggerHaptic(ImpactStyle.Light);
                            setAutoExtractEnabled(!autoExtractEnabled);
                            showToast(
                              !autoExtractEnabled
                                ? 'Insight auto-extraction active'
                                : 'Insight extraction paused'
                            );
                          }}
                          type="button"
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform duration-200 ease-in-out ${
                              autoExtractEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Selective Amnesia / Reset */}
                    {matchesSearch('Working Context Buffer reset recent prompt history trim cache tokens') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('buffer');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-error flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">cleaning_services</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Working Context Buffer
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Reset recent prompt history or trim cache tokens
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-[20px] flex-shrink-0">
                          chevron_right
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Section 3: Circadian Cadence & Notifications */}
              {section3Visible && (
                <div className="flex flex-col gap-space-2xs animate-fadeIn">
                  <div className="px-space-xs flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
                      Circadian Cadence &amp; Notifications
                    </span>
                  </div>
                  <div className="w-full rounded-2xl bg-surface-container-lowest shadow-[0_6px_24px_-4px_rgba(79,70,229,0.06)] border border-surface-container-high/40 overflow-hidden divide-y divide-surface-container-high/30">
                    {/* Circadian Sync Toggle */}
                    {matchesSearch('Circadian Rhythm Sync gentle morning wakeup midday focus peak alerts') && (
                      <div className="w-full p-space-md flex items-center gap-space-md justify-between bg-surface-container-lowest">
                        <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">routine</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Circadian Rhythm Sync
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Gentle morning wakeup &amp; midday focus peak alerts
                          </span>
                        </div>
                        <button
                          aria-label="Toggle Circadian Rhythm Sync"
                          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors shadow-inner flex-shrink-0 border-none ${
                            circadianSyncEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'
                          }`}
                          onClick={() => {
                            triggerHaptic(ImpactStyle.Light);
                            setCircadianSyncEnabled(!circadianSyncEnabled);
                            showToast(
                              !circadianSyncEnabled
                                ? 'Circadian synchronization active'
                                : 'Circadian alerts disabled'
                            );
                          }}
                          type="button"
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform duration-200 ease-in-out ${
                              circadianSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Restorative Sleep Cadence */}
                    {matchesSearch('Gentle Rest Window mute non-vital alerts 11:00 PM 7:00 AM') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('rest');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">bedtime</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Gentle Rest Window
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Mute non-vital alerts ({restWindow === '11PM - 7AM' ? '11:00 PM – 7:00 AM' : restWindow})
                          </span>
                        </div>
                        <span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-1">
                          {restWindow}{' '}
                          <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                        </span>
                      </button>
                    )}

                    {/* Daily Routine Reminders Toggle */}
                    {matchesSearch('Ritual & Task Reminders scheduled nudges active habit blocks') && (
                      <div className="w-full p-space-md flex items-center gap-space-md justify-between bg-surface-container-lowest">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary-container flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">notifications_active</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Ritual &amp; Task Reminders
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Scheduled nudges for active habit blocks
                          </span>
                        </div>
                        <button
                          aria-label="Toggle Ritual and Task Reminders"
                          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors shadow-inner flex-shrink-0 border-none ${
                            ritualRemindersEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'
                          }`}
                          onClick={() => {
                            triggerHaptic(ImpactStyle.Light);
                            setRitualRemindersEnabled(!ritualRemindersEnabled);
                            showToast(
                              !ritualRemindersEnabled
                                ? 'Ritual reminders enabled'
                                : 'Ritual reminders silenced'
                            );
                          }}
                          type="button"
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform duration-200 ease-in-out ${
                              ritualRemindersEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 4: Connectivity & Integrations */}
              {section4Visible && (
                <div className="flex flex-col gap-space-2xs animate-fadeIn">
                  <div className="px-space-xs flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
                      Connectivity &amp; Integrations
                    </span>
                  </div>
                  <div className="w-full rounded-2xl bg-surface-container-lowest shadow-[0_6px_24px_-4px_rgba(79,70,229,0.06)] border border-surface-container-high/40 overflow-hidden divide-y divide-surface-container-high/30">
                    {/* Health Kit */}
                    {matchesSearch('Apple Health & Biometrics recovery HRV sleep stage sync Connected') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('health');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors cursor-pointer border-none bg-transparent active:bg-surface-container"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">favorite</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                              Apple Health &amp; Biometrics
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Biometric recovery, HRV &amp; sleep stage sync
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm font-semibold flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Connected
                        </div>
                      </button>
                    )}

                    {/* Google Calendar */}
                    {matchesSearch('Calendar Sync Google Calendar 2 accounts linked') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('calendar');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Calendar Sync
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Google Calendar • 2 accounts linked
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-[20px] flex-shrink-0">
                          chevron_right
                        </span>
                      </button>
                    )}

                    {/* Social Squad Visibility */}
                    {matchesSearch('Squad & Social Visibility cadence leaderboard weekly podium Friends Only') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('visibility');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">group</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Squad &amp; Social Visibility
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Cadence leaderboard and weekly podium status
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold flex-shrink-0">
                          {socialVisibility}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Section 5: Privacy & Biometrics */}
              {section5Visible && (
                <div className="flex flex-col gap-space-2xs animate-fadeIn">
                  <div className="px-space-xs flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
                      Privacy &amp; Security
                    </span>
                  </div>
                  <div className="w-full rounded-2xl bg-surface-container-lowest shadow-[0_6px_24px_-4px_rgba(79,70,229,0.06)] border border-surface-container-high/40 overflow-hidden divide-y divide-surface-container-high/30">
                    {/* Biometric Lock */}
                    {matchesSearch('Local App Lock FaceID TouchID required on resume') && (
                      <div className="w-full p-space-md flex items-center gap-space-md justify-between bg-surface-container-lowest">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">fingerprint</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Local App Lock
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            FaceID / TouchID required on resume
                          </span>
                        </div>
                        <button
                          aria-label="Toggle Local App Lock"
                          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors shadow-inner flex-shrink-0 border-none ${
                            appLockEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'
                          }`}
                          onClick={() => {
                            triggerHaptic(ImpactStyle.Light);
                            setAppLockEnabled(!appLockEnabled);
                            showToast(
                              !appLockEnabled
                                ? 'Biometric biometric lock engaged'
                                : 'App lock requirement removed'
                            );
                          }}
                          type="button"
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform duration-200 ease-in-out ${
                              appLockEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Incognito Mode Toggle */}
                    {matchesSearch('Ephemeral Incognito Mode temporary private sessions bypass memory index') && (
                      <div className="w-full p-space-md flex items-center gap-space-md justify-between bg-surface-container-lowest">
                        <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary-container flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">visibility_off</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Ephemeral Incognito Mode
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Temporary private sessions bypass memory index
                          </span>
                        </div>
                        <button
                          aria-label="Toggle Incognito Mode"
                          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors shadow-inner flex-shrink-0 border-none ${
                            incognitoEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'
                          }`}
                          onClick={() => {
                            triggerHaptic(ImpactStyle.Light);
                            setIncognitoEnabled(!incognitoEnabled);
                            showToast(
                              !incognitoEnabled
                                ? 'Incognito Mode active (Sessions unindexed)'
                                : 'Standard indexing resumed'
                            );
                          }}
                          type="button"
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform duration-200 ease-in-out ${
                              incognitoEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Data Export */}
                    {matchesSearch('Data Portability & Archives export complete memory vault JSON Markdown') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('export');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">download_for_offline</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Data Portability &amp; Archives
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Export complete memory vault in JSON/Markdown
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-[20px] flex-shrink-0">
                          chevron_right
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Section 6: App Preferences & System Details */}
              {section6Visible && (
                <div className="flex flex-col gap-space-2xs animate-fadeIn">
                  <div className="px-space-xs flex items-center justify-between">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
                      Preferences &amp; System
                    </span>
                  </div>
                  <div className="w-full rounded-2xl bg-surface-container-lowest shadow-[0_6px_24px_-4px_rgba(79,70,229,0.06)] border border-surface-container-high/40 overflow-hidden divide-y divide-surface-container-high/30">
                    {/* Appearance */}
                    {matchesSearch('Appearance Light Mode dynamically shifts circadian hour Auto Light') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('appearance');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors cursor-pointer border-none bg-transparent active:bg-surface-container"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">palette</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Appearance
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Light Mode • Dynamically shifts with circadian hour
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold flex-shrink-0">
                          {appearanceMode}
                        </span>
                      </button>
                    )}

                    {/* Haptics Toggle */}
                    {matchesSearch('Haptic & Sound Feedback subtle kinetic clicks task check-off') && (
                      <div className="w-full p-space-md flex items-center gap-space-md justify-between bg-surface-container-lowest">
                        <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">vibration</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Haptic &amp; Sound Feedback
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            Subtle kinetic clicks on task check-off
                          </span>
                        </div>
                        <button
                          aria-label="Toggle Haptic Feedback"
                          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors shadow-inner flex-shrink-0 border-none ${
                            hapticsEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'
                          }`}
                          onClick={() => {
                            if (!hapticsEnabled) {
                              try {
                                Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
                              } catch {
                                // ignore
                              }
                            }
                            setHapticsEnabled(!hapticsEnabled);
                            showToast(
                              !hapticsEnabled
                                ? 'Haptic feedback enabled'
                                : 'Haptic feedback silenced'
                            );
                          }}
                          type="button"
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform duration-200 ease-in-out ${
                              hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Storage & Cache */}
                    {matchesSearch('Storage & Local Cache offline embeddings clear cache') && (
                      <button
                        onClick={handleClearCache}
                        disabled={isClearingCache}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline flex-shrink-0 shadow-sm">
                          {isClearingCache ? (
                            <span className="material-symbols-outlined text-[22px] animate-spin text-primary">
                              sync
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-[22px]">pie_chart</span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Storage &amp; Local Cache
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            {cacheSize} consumed by offline embeddings
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-tertiary font-bold hover:underline flex-shrink-0">
                          {isClearingCache ? 'Purging...' : 'Clear Cache'}
                        </span>
                      </button>
                    )}

                    {/* App Version */}
                    {matchesSearch('Kairos Engine build stable up to date') && (
                      <button
                        onClick={() => {
                          triggerHaptic(ImpactStyle.Light);
                          setActiveModal('engine');
                        }}
                        className="w-full p-space-md flex items-center gap-space-md text-left hover:bg-surface-container-low/60 transition-colors bg-surface-container-lowest active:bg-surface-container cursor-pointer border-none"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline flex-shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[22px]">info</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                            Kairos Engine
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">
                            v2.4.0 (Stable build 8294) • Up to date
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-[20px] flex-shrink-0">
                          chevron_right
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Actions: Log Out & Account Deletion */}
              <div className="flex flex-col items-center gap-space-sm pt-space-xs">
                <button
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Medium);
                    setActiveModal('logout');
                  }}
                  className="w-full h-12 rounded-full bg-surface-container-lowest text-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(79,70,229,0.06)] hover:bg-surface-container-low active:scale-[0.99] transition-all cursor-pointer border border-surface-container-high/40"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Log Out of Kairos
                </button>
                <button
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Heavy);
                    setActiveModal('delete');
                  }}
                  className="py-2 text-error font-body-sm text-body-sm hover:underline flex items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer border-none bg-transparent"
                  type="button"
                >
                  Delete Account &amp; Permanently Purge Vault
                </button>
                <span className="font-body-sm text-[11px] text-outline text-center mt-1">
                  Kairos AI • Mindful Human Augmentation • End-to-End Encrypted
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Navigation Dock */}
      <nav
        className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none pb-safe"
        data-active-classes="text-primary-container font-bold"
      >
        <div className="pointer-events-auto flex items-center justify-between w-full max-w-[380px] h-16 px-2.5 rounded-full bg-surface-container-lowest/85 backdrop-blur-2xl shadow-[0_20px_48px_-8px_rgba(15,23,42,0.12),0_0_1px_1px_rgba(99,102,241,0.15)] border border-surface-container-high/60">
          {/* Home */}
          <button
            onClick={() => handleTabClick('home')}
            aria-label="Home Dashboard"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer border-none bg-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">home</span>
          </button>

          {/* Daily Tasks */}
          <button
            onClick={() => handleTabClick('tasks')}
            aria-label="Daily Cadence Tasks"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer border-none bg-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">check_circle</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
          </button>

          {/* AI Companion */}
          <button
            onClick={() => handleTabClick('companion')}
            aria-label="Kairos AI Companion Chat"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer border-none bg-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">auto_awesome</span>
          </button>

          {/* Squad Progression */}
          <button
            onClick={() => handleTabClick('squad')}
            aria-label="Squad League & Challenges"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer border-none bg-transparent"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">groups</span>
          </button>

          {/* Profile Active */}
          <button
            onClick={() => handleTabClick('profile')}
            aria-label="Evolution Profile"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)] transition-all duration-300 active:scale-95 cursor-pointer border-none"
            type="button"
          >
            <span className="material-symbols-outlined text-headline-sm">person</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* SUB-MODALS & INTERACTIVE FLOWS */}
      {/* ========================================================================= */}

      {/* 1. Companion Persona Picker */}
      {activeModal === 'persona' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">smart_toy</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Companion Persona</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">Cognitive Prompt Posture</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-2.5">
              {[
                {
                  id: 'Aura (Empathetic)',
                  title: 'Aura (Empathetic)',
                  desc: 'Warm, intuitive mentor that balances compassion with motivational study cadences.',
                  badge: 'Recommended'
                },
                {
                  id: 'Sol (Analytical)',
                  title: 'Sol (Analytical)',
                  desc: 'Rigorous Socratic reasoning, precise concept breakdown, and empirical telemetry.',
                  badge: 'High Precision'
                },
                {
                  id: 'Orion (Strategist)',
                  title: 'Orion (Strategist)',
                  desc: 'Action-oriented executive advisor prioritizing deadlines, velocity, and high-stakes rituals.',
                  badge: 'Velocity'
                },
                {
                  id: 'Lyra (Creative)',
                  title: 'Lyra (Creative)',
                  desc: 'Expansive multidisciplinary synthesis linking diverse mental models and analogies.',
                  badge: 'Lateral'
                }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setPersona(item.id);
                    setActiveModal(null);
                    showToast(`Companion persona set to ${item.id}`);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                    persona === item.id
                      ? 'bg-primary-fixed/25 border-primary ring-1 ring-primary shadow-xs'
                      : 'bg-surface-container-low border-surface-container-high/50 hover:bg-surface-container'
                  }`}
                  type="button"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-label-lg text-sm font-bold text-on-surface">{item.title}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-[10px] font-semibold">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                  {persona === item.id && (
                    <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Voice & Tone Cadence Picker */}
      {activeModal === 'voice' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-lg">graphic_eq</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Voice &amp; Tone Cadence</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">Synthesized Neural Acoustics</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-2.5">
              {[
                { name: 'Sol', style: 'Warm Studio • Calming, measured rhythm with deep photonic warmth' },
                { name: 'Aura', style: 'Crisp Natural • Resonant, empathetic cadence for reflective sessions' },
                { name: 'Echo', style: 'Subtle Minimal • Low profile audio notes for deep flow periods' },
                { name: 'Nova', style: 'High Energy • Crisp and assertive for morning velocity blocks' }
              ].map((v) => (
                <div
                  key={v.name}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    voiceCadence === v.name
                      ? 'bg-secondary-fixed/30 border-secondary ring-1 ring-secondary'
                      : 'bg-surface-container-low border-surface-container-high/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-label-lg text-sm font-bold text-on-surface">{v.name}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{v.style}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        showToast(`Playing audio sample for voice ${v.name}...`);
                      }}
                      className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-high cursor-pointer border-none"
                      type="button"
                      aria-label={`Preview ${v.name}`}
                    >
                      <span className="material-symbols-outlined text-base">volume_up</span>
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Medium);
                        setVoiceCadence(v.name);
                        setActiveModal(null);
                        showToast(`Voice set to ${v.name}`);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer border-none ${
                        voiceCadence === v.name
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-high text-on-surface'
                      }`}
                      type="button"
                    >
                      {voiceCadence === v.name ? 'Active' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Proactivity Level Picker */}
      {activeModal === 'proactivity' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-lg">vital_signs</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Proactivity Level</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">Cadence Interrupt Frequency</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-2.5">
              {[
                {
                  id: 'Gentle' as const,
                  title: 'Gentle (Default)',
                  desc: 'Nudges only during major circadian transitions and when deep work sessions conclude.'
                },
                {
                  id: 'Balanced' as const,
                  title: 'Balanced',
                  desc: 'Periodic checks every 45-60m during active focus windows with habit checkpoint reminders.'
                },
                {
                  id: 'Intense' as const,
                  title: 'Intense / Sprint Mode',
                  desc: 'High-frequency accountability nudges, active recall prompts, and squad leaderboard alerts.'
                }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setProactivityLevel(p.id);
                    setActiveModal(null);
                    showToast(`Proactivity level set to ${p.id}`);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    proactivityLevel === p.id
                      ? 'bg-primary-fixed/25 border-primary ring-1 ring-primary'
                      : 'bg-surface-container-low border-surface-container-high/50 hover:bg-surface-container'
                  }`}
                  type="button"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-label-lg text-sm font-bold text-on-surface">{p.title}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{p.desc}</p>
                  </div>
                  {proactivityLevel === p.id && (
                    <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Memory Vault Inspector */}
      {activeModal === 'vault' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">dataset</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Memory Vault</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">34 Indexed Concepts • AES-256</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-3 mobile-scroll">
              <div className="p-3 rounded-2xl bg-primary-fixed/20 border border-primary-fixed/50 flex items-center gap-2.5 text-xs text-on-surface">
                <span className="material-symbols-outlined text-primary text-lg">security</span>
                <span>Memories are stored locally in your biometric enclave and never shared with third parties.</span>
              </div>

              <div className="space-y-2">
                {[
                  { tag: 'Circadian', title: 'Peak Focus Schedule', value: 'Highest cognitive output observed between 8:30 AM – 11:30 AM' },
                  { tag: 'Habit', title: 'Hydration Anchor', value: 'Drinks water before morning meditation rituals' },
                  { tag: 'Academic', title: 'Distributed Systems', value: 'Currently studying Raft consensus & Vector clocks' },
                  { tag: 'Squad', title: 'Podium Goal', value: 'Targeting Top 3 rank in Vanguard weekly leaderboard' }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/40">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-[10px] font-bold uppercase">
                        {item.tag}
                      </span>
                      <span className="text-[11px] text-outline">Verified</span>
                    </div>
                    <h5 className="font-label-md text-xs font-bold text-on-surface mt-1">{item.title}</h5>
                    <p className="text-xs text-on-surface-variant mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Working Context Buffer Flush */}
      {activeModal === 'buffer' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-[340px] rounded-3xl bg-surface-container-lowest p-5 text-center flex flex-col items-center shadow-2xl border border-surface-container-high/40 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-error-container flex items-center justify-center text-error mb-3 shadow-sm">
              <span className="material-symbols-outlined text-2xl">cleaning_services</span>
            </div>
            <h3 className="text-base font-bold text-on-surface">Flush Context Buffer?</h3>
            <p className="text-xs text-on-surface-variant mt-2 px-1 leading-relaxed">
              This will trim recent conversational scratchpads and refresh Kairos active prompt memory without deleting your anchored long-term memories.
            </p>
            <div className="mt-4 flex items-center gap-2 w-full">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-full bg-surface-container text-on-surface font-semibold text-xs cursor-pointer border-none"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleClearBuffer}
                className="flex-1 py-2.5 rounded-full bg-error text-on-error font-semibold text-xs cursor-pointer border-none shadow-md shadow-error/20"
                type="button"
              >
                Flush Buffer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Gentle Rest Window Scheduler */}
      {activeModal === 'rest' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">bedtime</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Gentle Rest Window</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">Circadian Wind-Down Schedule</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-2.5">
              {[
                { label: '11:00 PM – 7:00 AM (Default)', value: '11PM - 7AM' },
                { label: '10:30 PM – 6:30 AM (Early Bird)', value: '10:30PM - 6:30AM' },
                { label: '12:00 AM – 8:00 AM (Night Owl)', value: '12AM - 8AM' },
                { label: 'Custom Solar Tracking', value: 'Solar Sync' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setRestWindow(opt.value);
                    setActiveModal(null);
                    showToast(`Rest window set to ${opt.value}`);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    restWindow === opt.value
                      ? 'bg-primary-fixed/25 border-primary ring-1 ring-primary'
                      : 'bg-surface-container-low border-surface-container-high/50 hover:bg-surface-container'
                  }`}
                  type="button"
                >
                  <span className="font-label-lg text-sm font-semibold text-on-surface">{opt.label}</span>
                  {restWindow === opt.value && (
                    <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Apple Health Diagnostics */}
      {activeModal === 'health' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-lg">favorite</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Apple Health Sync</h3>
                  <span className="font-label-sm text-xs text-emerald-600 font-semibold">Active &amp; Calibrated</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-surface-container-low flex flex-col">
                  <span className="text-xs text-outline font-semibold">HRV Recovery</span>
                  <span className="text-lg font-bold text-primary mt-1">68 ms</span>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-0.5">High readiness</span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-container-low flex flex-col">
                  <span className="text-xs text-outline font-semibold">Sleep Duration</span>
                  <span className="text-lg font-bold text-secondary mt-1">7h 42m</span>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-0.5">88% efficiency</span>
                </div>
              </div>
              <p className="text-xs text-outline">
                Biometric data automatically tunes your peak study blocks and companion encouragement tone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 8. Google Calendar Sync */}
      {activeModal === 'calendar' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Calendar Accounts</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">2 Accounts Connected</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-2.5">
              {[
                { email: userProfile?.email || 'alex.rivera@kairos.ai', type: 'Primary Academic' },
                { email: 'alex.personal@gmail.com', type: 'Personal & Rituals' }
              ].map((acc) => (
                <div key={acc.email} className="p-3 rounded-2xl bg-surface-container-low flex items-center justify-between">
                  <div>
                    <h5 className="font-label-md text-xs font-bold text-on-surface">{acc.email}</h5>
                    <span className="text-[11px] text-outline">{acc.type}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    Synced
                  </span>
                </div>
              ))}
              <button
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  showToast('Add calendar account flow initiated');
                }}
                className="w-full py-2.5 rounded-full bg-primary-fixed text-primary font-bold text-xs cursor-pointer border-none mt-2"
                type="button"
              >
                + Link Another Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Squad Visibility Modal */}
      {activeModal === 'visibility' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">group</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Squad Visibility</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">Leaderboard &amp; Study Room</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-2.5">
              {[
                { id: 'Friends Only' as const, desc: 'Only approved friends in your squad see study hours & streak' },
                { id: 'Public' as const, desc: 'Visible on global university & regional cadence leaderboards' },
                { id: 'Ghost Mode' as const, desc: 'Completely anonymous; participate in challenges privately' }
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSocialVisibility(v.id);
                    setActiveModal(null);
                    showToast(`Squad visibility set to ${v.id}`);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    socialVisibility === v.id
                      ? 'bg-primary-fixed/25 border-primary ring-1 ring-primary'
                      : 'bg-surface-container-low border-surface-container-high/50 hover:bg-surface-container'
                  }`}
                  type="button"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-label-lg text-sm font-bold text-on-surface">{v.id}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{v.desc}</p>
                  </div>
                  {socialVisibility === v.id && (
                    <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10. Data Export Modal */}
      {activeModal === 'export' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-[340px] rounded-3xl bg-surface-container-lowest p-5 text-center flex flex-col items-center shadow-2xl border border-surface-container-high/40 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary mb-3 shadow-sm">
              <span className="material-symbols-outlined text-2xl">download_for_offline</span>
            </div>
            <h3 className="text-base font-bold text-on-surface">Export Vault Archive</h3>
            <p className="text-xs text-on-surface-variant mt-2 px-1 leading-relaxed">
              Generate a portable backup of your complete neural memory vault, ritual stats, and quiz history.
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full">
              <button
                onClick={() => handleExportData('JSON')}
                className="w-full py-2.5 rounded-full bg-primary text-on-primary font-semibold text-xs cursor-pointer border-none shadow-md shadow-primary/20"
                type="button"
              >
                Export Complete JSON Archive
              </button>
              <button
                onClick={() => handleExportData('Markdown')}
                className="w-full py-2.5 rounded-full bg-surface-container text-on-surface font-semibold text-xs cursor-pointer border-none"
                type="button"
              >
                Export Markdown Notes &amp; Habits
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-1 text-xs text-outline hover:text-on-surface cursor-pointer border-none bg-transparent"
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Appearance Switcher Modal */}
      {activeModal === 'appearance' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-lg">palette</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">App Theme</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">Visual Tone &amp; Luminance</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-2.5">
              {[
                { id: 'Auto Light' as const, label: 'Auto Light', desc: 'Sleek frosted light palette optimized for daytime clarity' },
                { id: 'Pure Dark' as const, label: 'Pure Dark', desc: 'OLED deep black for reduced eye strain and late night focus' },
                { id: 'Solar Circadian' as const, label: 'Solar Circadian', desc: 'Automatically transitions with local sunrise and sunset' }
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setAppearanceMode(theme.id);
                    setActiveModal(null);
                    showToast(`Appearance theme changed to ${theme.label}`);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    appearanceMode === theme.id
                      ? 'bg-secondary-fixed/30 border-secondary ring-1 ring-secondary'
                      : 'bg-surface-container-low border-surface-container-high/50 hover:bg-surface-container'
                  }`}
                  type="button"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-label-lg text-sm font-bold text-on-surface">{theme.label}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{theme.desc}</p>
                  </div>
                  {appearanceMode === theme.id && (
                    <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 12. Kairos Engine Diagnostics */}
      {activeModal === 'engine' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-[440px] max-h-[85vh] rounded-t-3xl bg-surface-container-lowest p-5 pb-8 shadow-2xl flex flex-col overflow-hidden border-t border-surface-container-high animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-lg">info</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Kairos Engine Diagnostics</h3>
                  <span className="font-label-sm text-xs text-on-surface-variant">Version 2.4.0 (Build 8294)</span>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer border-none"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-2.5 text-xs text-on-surface">
              <div className="p-3 rounded-2xl bg-surface-container-low flex justify-between items-center">
                <span className="text-outline">Neural Core</span>
                <span className="font-bold">Gemini 2.5 Flash + Pro Routing</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface-container-low flex justify-between items-center">
                <span className="text-outline">Local Vector Index</span>
                <span className="font-bold">HNSW Flat L2 (On-device)</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface-container-low flex justify-between items-center">
                <span className="text-outline">Security Protocol</span>
                <span className="font-bold">AES-GCM 256 + Biometric Keychain</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface-container-low flex justify-between items-center">
                <span className="text-outline">Build Status</span>
                <span className="text-emerald-600 font-bold">Stable • Up to date</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 13. Log Out Confirmation Modal */}
      {activeModal === 'logout' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-[340px] rounded-3xl bg-surface-container-lowest p-5 text-center flex flex-col items-center shadow-2xl border border-surface-container-high/40 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary mb-3 shadow-sm">
              <span className="material-symbols-outlined text-2xl">logout</span>
            </div>
            <h3 className="text-base font-bold text-on-surface">Log Out of Kairos?</h3>
            <p className="text-xs text-on-surface-variant mt-2 px-1 leading-relaxed">
              Your synced routines and profile progress are safe on your device. You can log back in at any time.
            </p>
            <div className="mt-4 flex items-center gap-2 w-full">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-full bg-surface-container text-on-surface font-semibold text-xs cursor-pointer border-none"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  triggerHaptic(ImpactStyle.Medium);
                  setActiveModal(null);
                  if (onLogOut) {
                    onLogOut();
                  } else if (onNavigateTab) {
                    onNavigateTab('auth');
                  }
                }}
                className="flex-1 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-xs cursor-pointer border-none shadow-md shadow-primary/20"
                type="button"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. Delete Account Modal */}
      {activeModal === 'delete' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-[340px] rounded-3xl bg-surface-container-lowest p-5 text-center flex flex-col items-center shadow-2xl border border-surface-container-high/40 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-error-container flex items-center justify-center text-error mb-3 shadow-sm">
              <span className="material-symbols-outlined text-2xl">delete_forever</span>
            </div>
            <h3 className="text-base font-bold text-error">Permanently Purge Vault?</h3>
            <p className="text-xs text-on-surface-variant mt-2 px-1 leading-relaxed">
              This action cannot be undone. All indexed cognitive memories, habit cadences, and squad league trophies will be deleted immediately.
            </p>
            <div className="mt-4 flex items-center gap-2 w-full">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-full bg-surface-container text-on-surface font-semibold text-xs cursor-pointer border-none"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  triggerHaptic(ImpactStyle.Heavy);
                  setActiveModal(null);
                  if (onLogOut) {
                    onLogOut();
                  } else if (onNavigateTab) {
                    onNavigateTab('meet-kairos');
                  }
                }}
                className="flex-1 py-2.5 rounded-full bg-error text-on-error font-semibold text-xs cursor-pointer border-none shadow-md shadow-error/20"
                type="button"
              >
                Purge All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsScreen;
