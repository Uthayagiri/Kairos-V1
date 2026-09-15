import React, { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface OnboardingScreenProps {
  onBack: () => void;
  onFinish: () => void;
}

const OCCUPATIONS = [
  {
    id: 'school',
    title: 'School Student',
    desc: 'Foundational education & curriculum study',
    icon: 'school'
  },
  {
    id: 'college',
    title: 'College Student',
    desc: 'Higher education, coding & build sprints',
    icon: 'terminal'
  },
  {
    id: 'professional',
    title: 'Working Professional',
    desc: 'Corporate, management & client execution',
    icon: 'business_center'
  },
  {
    id: 'creative',
    title: 'Creative / Designer',
    desc: 'Visual arts, UI/UX, writing & multimedia',
    icon: 'palette'
  },
  {
    id: 'founder',
    title: 'Entrepreneur / Founder',
    desc: 'Building ventures & driving growth',
    icon: 'rocket_launch'
  }
];

const GOALS = [
  {
    id: 'deep-work',
    title: 'Deep Focus & Flow State',
    badge: 'Popular',
    desc: 'Boost distraction-free deep work hours and enter flow effortlessly',
    icon: 'bolt'
  },
  {
    id: 'daily-habits',
    title: 'Daily Rhythm & Habits',
    desc: 'Build consistent morning and evening routines without friction',
    icon: 'routine'
  },
  {
    id: 'mindfulness',
    title: 'Stress Reduction & Mindfulness',
    desc: 'Balance cognitive load, reduce anxiety, and recharge energy',
    icon: 'self_improvement'
  },
  {
    id: 'milestones',
    title: 'Goal & Milestone Tracking',
    desc: 'Turn quarterly ambitions into tangible day-to-day momentum',
    icon: 'flag'
  },
  {
    id: 'ai-partner',
    title: 'AI Accountability Partner',
    desc: 'Proactive nudges, compassionate check-ins, and debriefing',
    icon: 'smart_toy'
  }
];

const MONTHLY_FOCUS_OPTIONS = [
  'Career Growth',
  'Academics',
  'Health & Energy',
  'Creative Project',
  'Mindful Balance & Rest'
];

const WORKFLOW_OPTIONS = [
  {
    id: 'autonomous',
    title: 'Autonomous deep-work blocks',
    desc: 'Uninterrupted independent work & build sprints'
  },
  {
    id: 'collaborative',
    title: 'Meeting-heavy & collaborative',
    desc: 'Frequent calls, synced reviews, client messaging'
  },
  {
    id: 'academic',
    title: 'Academic lectures & study sessions',
    desc: 'Class schedule with self-directed library study'
  },
  {
    id: 'shift',
    title: 'Shift work & flexible hours',
    desc: 'Variable weekly schedule requiring adaptive timing'
  }
];

const ENERGY_PEAKS = [
  { id: 'early', title: 'Early Bird', time: '6 AM – 10 AM', icon: 'wb_twilight' },
  { id: 'midday', title: 'Midday Peak', time: '10 AM – 2 PM', icon: 'wb_sunny' },
  { id: 'afternoon', title: 'Afternoon Wave', time: '2 PM – 6 PM', icon: 'partly_cloudy_day' },
  { id: 'night', title: 'Night Owl', time: '8 PM – 1 AM', icon: 'bedtime' }
];

const CHALLENGES = [
  'Context switching',
  'Procrastination',
  'Burnout & Fatigue',
  'Task prioritization',
  'Work-life balance'
];

const ARCHETYPES = [
  {
    id: 'warm',
    title: 'Warm & Encouraging',
    desc: 'Supportive, empathetic, celebrates daily wins',
    icon: 'favorite'
  },
  {
    id: 'analytical',
    title: 'Analytical & Precise',
    desc: 'Direct, metrics-driven, clear and concise',
    icon: 'tune'
  },
  {
    id: 'philosophical',
    title: 'Philosophical & Reflective',
    desc: 'Thought-provoking, mindful, stoic framing',
    icon: 'spa'
  }
];

const VOICES = [
  { id: 'aura', name: 'Aura', desc: 'Warm & Encouraging • Feminine Tone' },
  { id: 'echo', name: 'Echo', desc: 'Direct & Crisp • Neutral Cadence' },
  { id: 'sol', name: 'Sol', desc: 'Calm & Reflective • Deep Rhythm' },
  { id: 'zephyr', name: 'Zephyr', desc: 'Dynamic & Energetic • Uplifting Pace' }
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onBack, onFinish }) => {
  const [step, setStep] = useState<number>(1);

  // Step 1 State
  const [preferredName, setPreferredName] = useState('Alex');
  const [dob, setDob] = useState('2001-08-14');
  const [occupation, setOccupation] = useState('college');

  // Step 2 State
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['deep-work', 'daily-habits', 'ai-partner']);
  const [monthlyFocus, setMonthlyFocus] = useState('Career Growth');

  // Step 3 State
  const [workflow, setWorkflow] = useState('autonomous');
  const [energyPeak, setEnergyPeak] = useState('early');
  const [challenges, setChallenges] = useState<string[]>(['Context switching', 'Procrastination']);

  // Step 4 State
  const [companionName, setCompanionName] = useState('Kairos');
  const [archetype, setArchetype] = useState('warm');
  const [selectedVoice, setSelectedVoice] = useState('aura');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [pace, setPace] = useState(1.0);

  // Completion State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // Fallback
    }
  };

  const handleNext = () => {
    triggerHaptic(ImpactStyle.Medium);
    if (step < 4) {
      setStep(step + 1);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setShowSuccessModal(true);
      }, 900);
    }
  };

  const handlePrev = () => {
    triggerHaptic(ImpactStyle.Light);
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const toggleGoal = (id: string) => {
    triggerHaptic(ImpactStyle.Light);
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleChallenge = (item: string) => {
    triggerHaptic(ImpactStyle.Light);
    setChallenges((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const toggleVoicePlay = (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    triggerHaptic(ImpactStyle.Light);
    setPlayingVoice((prev) => (prev === voiceId ? null : voiceId));
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'About You';
      case 2:
        return 'Intentions';
      case 3:
        return 'Cadence';
      case 4:
        return 'AI Companion';
      default:
        return '';
    }
  };

  const getPaceLabel = () => {
    if (pace === 1.0) return '1.0x Normal';
    if (pace < 1.0) return `${pace.toFixed(1)}x Grounded`;
    return `${pace.toFixed(1)}x Energetic`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-surface overflow-hidden relative selection:bg-primary-fixed selection:text-on-primary-fixed antialiased animate-fade-in">
      {/* Subtle Ambient Radial Glowing Aura */}
      <div className="fixed -top-20 -right-16 w-80 h-80 bg-gradient-to-br from-secondary-fixed/40 via-surface-container-highest/30 to-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="fixed top-1/3 -left-24 w-72 h-72 bg-gradient-to-tr from-secondary-container/15 via-surface-container-high/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* FIXED TOP PROGRESS HEADER */}
      <header className="pt-safe px-5 pb-3 bg-surface/90 backdrop-blur-md z-30 flex flex-col gap-2.5 border-b border-surface-container/60 flex-shrink-0">
        <div className="flex items-center justify-between pt-1">
          {/* Back Button */}
          <button
            onClick={handlePrev}
            aria-label="Go back to previous step"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container-lowest text-on-surface border border-outline-variant/80 hover:bg-surface-container transition-all active:scale-95 shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          {/* Dynamic Step Pill */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-container-high text-primary border border-surface-container-highest/60 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Step {step} of 4
            </span>
            <span className="text-xs opacity-40">•</span>
            <span className="text-xs font-semibold text-on-surface-variant">
              {getStepTitle()}
            </span>
          </div>

          {/* XP Badge */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-2xs">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
            <span>+{step * 25} XP</span>
          </div>
        </div>

        {/* 4-Segment Animated Progress Bar */}
        <div className="grid grid-cols-4 gap-1.5 w-full pt-0.5">
          {[1, 2, 3, 4].map((segIndex) => (
            <div
              key={segIndex}
              className="h-1.5 rounded-full overflow-hidden bg-surface-container-high"
            >
              <div
                className={`h-full bg-primary rounded-full transition-all duration-400 ${
                  segIndex <= step ? 'w-full' : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>
      </header>

      {/* SCROLLABLE MAIN CONTENT PANELS */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-8 space-y-5">
        {/* ================= STEP 1: PERSONAL DETAILS ================= */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <section className="space-y-1">
              <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
                Welcome, let's get acquainted
              </h1>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Tell us a bit about yourself so Kairos can calibrate your daily cadence.
              </p>
            </section>

            {/* Form Card */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-4">
              {/* Preferred Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant flex items-center justify-between" htmlFor="input-preferred-name">
                  <span>Preferred Name</span>
                  <span className="text-[10px] text-primary font-bold">Required</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-primary text-[20px] pointer-events-none">
                    person
                  </span>
                  <input
                    className="w-full h-12 bg-surface-container-low text-on-surface text-base font-medium rounded-2xl pl-11 pr-10 border border-transparent focus:border-primary/40 focus:bg-surface-container-lowest transition-all focus:outline-none"
                    id="input-preferred-name"
                    placeholder="What should we call you?"
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                  />
                  {preferredName.trim() && (
                    <span className="material-symbols-outlined absolute right-3 text-primary text-[20px]">
                      check_circle
                    </span>
                  )}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant" htmlFor="input-dob">
                  Date of Birth
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                    calendar_month
                  </span>
                  <input
                    className="w-full h-12 bg-surface-container-low text-on-surface text-base font-medium rounded-2xl pl-11 pr-3 border border-transparent focus:border-primary/40 focus:bg-surface-container-lowest transition-all focus:outline-none"
                    id="input-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Primary Occupation Selector */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Primary Occupation
                </span>
                <span className="text-xs text-outline font-medium">Select one</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {OCCUPATIONS.map((occ) => {
                  const isSelected = occupation === occ.id;
                  return (
                    <div
                      key={occ.id}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setOccupation(occ.id);
                      }}
                      className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary shadow-xs'
                          : 'bg-surface-container-low border-outline-variant hover:bg-surface-container text-on-surface'
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-high text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{occ.icon}</span>
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">{occ.title}</span>
                          <span className="text-xs text-on-surface-variant leading-tight">
                            {occ.desc}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          isSelected ? 'text-primary' : 'text-outline'
                        }`}
                      >
                        {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ================= STEP 2: INTENTIONS & GOALS ================= */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <section className="space-y-1">
              <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
                What brings you to Kairos?
              </h1>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Select what you want to improve so we tailor your rhythm and cognitive insights.
              </p>
            </section>

            {/* Goal Cards Multi-select */}
            <section className="flex flex-col gap-2.5">
              {GOALS.map((goal) => {
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <div
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`cursor-pointer p-3.5 rounded-2xl bg-surface-container-lowest border-2 transition-all flex items-start justify-between active:scale-[0.98] shadow-xs ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/40'
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-primary/15 text-primary' : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">{goal.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-on-surface">{goal.title}</span>
                          {goal.badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                              {goal.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                          {goal.desc}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-2 mt-0.5 ${
                        isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-outline'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isSelected ? 'check' : 'add'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Monthly Focus Single-select */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-2.5">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-primary text-[18px]">target</span>
                <span>#1 Focus for the Next 30 Days</span>
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {MONTHLY_FOCUS_OPTIONS.map((focusItem, idx) => {
                  const isSelected = monthlyFocus === focusItem;
                  return (
                    <button
                      key={focusItem}
                      type="button"
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setMonthlyFocus(focusItem);
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        idx === 4 ? 'col-span-2' : ''
                      } ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface border-outline-variant hover:bg-surface-container'
                      }`}
                    >
                      <span>{focusItem}</span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ================= STEP 3: OCCUPATION DEEP-DIVE ================= */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <section className="space-y-1">
              <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
                Your Professional Cadence
              </h1>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Understanding your daily workflow helps Kairos adapt recommendations to your natural tempo.
              </p>
            </section>

            {/* Daily Workflow Selector */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-3">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-secondary text-[18px]">schedule</span>
                <span>Typical daily workflow &amp; structure</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {WORKFLOW_OPTIONS.map((wf) => {
                  const isSelected = workflow === wf.id;
                  return (
                    <button
                      key={wf.id}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setWorkflow(wf.id);
                      }}
                      type="button"
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary shadow-xs'
                          : 'bg-surface-container-low border-outline-variant hover:bg-surface-container text-on-surface'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-on-surface">{wf.title}</p>
                        <p className="text-xs text-on-surface-variant leading-snug">{wf.desc}</p>
                      </div>
                      <span
                        className={`material-symbols-outlined text-[20px] shrink-0 ml-2 ${
                          isSelected ? 'text-primary' : 'text-outline'
                        }`}
                      >
                        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Peak Cognitive Energy Pills */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-3">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-primary text-[18px]">wb_sunny</span>
                <span>When is your peak cognitive energy?</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {ENERGY_PEAKS.map((ep) => {
                  const isSelected = energyPeak === ep.id;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setEnergyPeak(ep.id);
                      }}
                      type="button"
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.97] ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            isSelected ? 'text-primary' : 'text-outline'
                          }`}
                        >
                          {ep.icon}
                        </span>
                        <span className="text-xs font-bold text-on-surface">{ep.title}</span>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {ep.time}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Friction Points / Challenges */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">psychology_alt</span>
                  <span>Day-to-day friction points</span>
                </span>
                <span className="text-xs text-outline">Tap all that apply</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {CHALLENGES.map((ch) => {
                  const isSelected = challenges.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChallenge(ch)}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface border-outline-variant hover:bg-surface-container'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ================= STEP 4: AI COMPANION CUSTOMIZATION ================= */}
        {step === 4 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <section className="space-y-1">
              <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
                Craft your AI Companion
              </h1>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Personalize your companion's identity, tone, and voice model.
              </p>
            </section>

            {/* Persona Name & Quick Pick */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider" htmlFor="companion-name-input">
                  <span className="material-symbols-outlined text-secondary text-[18px]">smart_toy</span>
                  <span>Custom Persona Name</span>
                </label>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">
                  Online
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  className="w-full h-12 bg-surface-container-low text-on-surface text-base font-medium rounded-2xl px-4 pr-20 border border-transparent focus:border-primary/40 focus:bg-surface-container-lowest transition-all focus:outline-none"
                  id="companion-name-input"
                  placeholder="e.g. Aria, Nova, Kairos"
                  type="text"
                  value={companionName}
                  onChange={(e) => setCompanionName(e.target.value)}
                />
                <button
                  onClick={() => setCompanionName('Kairos')}
                  className="absolute right-2 px-3 py-1.5 rounded-xl bg-surface-container-high text-primary font-bold text-xs hover:bg-surface-variant transition-colors cursor-pointer"
                  type="button"
                >
                  Reset
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-outline font-medium">Quick pick:</span>
                {['Aria', 'Nova', 'Atlas', 'Sol', 'Kairos'].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setCompanionName(name);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      companionName === name
                        ? 'bg-primary/15 text-primary border-primary/40 shadow-2xs'
                        : 'bg-surface-container-low text-on-surface border-outline-variant/60 hover:bg-surface-container'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>

            {/* Companion Archetype Selector */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-3">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                <span>Archetype &amp; Guidance Style</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {ARCHETYPES.map((arch) => {
                  const isSelected = archetype === arch.id;
                  return (
                    <div
                      key={arch.id}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setArchetype(arch.id);
                      }}
                      className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary shadow-xs'
                          : 'bg-surface-container-low border-outline-variant hover:bg-surface-container text-on-surface'
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{arch.icon}</span>
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">{arch.title}</span>
                          <p className="text-xs text-on-surface-variant leading-tight">{arch.desc}</p>
                        </div>
                      </div>
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          isSelected ? 'text-primary' : 'text-outline'
                        }`}
                      >
                        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Voice Model Selector */}
            <section className="w-full bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-sm border border-outline-variant/70 flex flex-col gap-3">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-secondary text-[18px]">record_voice_over</span>
                <span>Voice Model</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {VOICES.map((v) => {
                  const isSelected = selectedVoice === v.id;
                  const isPlaying = playingVoice === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        triggerHaptic(ImpactStyle.Light);
                        setSelectedVoice(v.id);
                      }}
                      className={`cursor-pointer p-3.5 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-secondary-fixed/50 border border-secondary text-on-surface shadow-xs'
                          : 'bg-surface-container-low border border-outline-variant hover:bg-surface-container text-on-surface'
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-3.5">
                        <button
                          onClick={(e) => toggleVoicePlay(e, v.id)}
                          aria-label={`Play ${v.name} preview`}
                          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xs cursor-pointer ${
                            isPlaying
                              ? 'bg-secondary text-on-secondary animate-pulse'
                              : isSelected
                              ? 'bg-secondary text-on-secondary'
                              : 'bg-surface-container-high text-on-surface'
                          }`}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isPlaying ? 'pause' : 'play_arrow'}
                          </span>
                        </button>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">{v.name}</span>
                          <span className="text-xs text-on-surface-variant leading-tight">{v.desc}</span>
                        </div>
                      </div>

                      {/* Animated Audio Equalizer Wave */}
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-lowest/80 border border-outline-variant/30">
                        <span
                          className={`w-0.5 h-3.5 bg-secondary rounded-full ${
                            isPlaying ? 'animate-pulse' : 'opacity-40'
                          }`}
                        />
                        <span
                          className={`w-0.5 h-5 bg-secondary rounded-full ${
                            isPlaying ? 'animate-pulse' : 'opacity-60'
                          }`}
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className={`w-0.5 h-2.5 bg-secondary rounded-full ${
                            isPlaying ? 'animate-pulse' : 'opacity-40'
                          }`}
                          style={{ animationDelay: '300ms' }}
                        />
                        <span
                          className={`w-0.5 h-4.5 bg-secondary rounded-full ${
                            isPlaying ? 'animate-pulse' : 'opacity-50'
                          }`}
                          style={{ animationDelay: '75ms' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pace Slider */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Speaking Pace
                  </span>
                  <span className="text-xs font-bold text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-full">
                    {getPaceLabel()}
                  </span>
                </div>
                <input
                  className="w-full h-2.5 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
                  max="1.4"
                  min="0.8"
                  step="0.1"
                  type="range"
                  value={pace}
                  onChange={(e) => setPace(parseFloat(e.target.value))}
                />
                <div className="flex justify-between text-xs text-outline font-medium">
                  <span>Grounded (0.8x)</span>
                  <span>Energetic (1.4x)</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM ACTION FOOTER */}
      <footer className="w-full px-5 py-3.5 pb-safe bg-surface/95 backdrop-blur-lg border-t border-surface-container-high/60 z-40 flex-shrink-0 flex flex-col gap-2">
        <button
          onClick={handleNext}
          disabled={isSubmitting}
          className="w-full h-14 rounded-full bg-gradient-to-r from-primary via-primary-container to-secondary text-on-primary font-bold text-base shadow-lg shadow-primary/25 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          type="button"
          id="primary-action-btn"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Configuring Companion...</span>
            </span>
          ) : (
            <>
              <span>{step < 4 ? 'Continue' : 'Setup Kairos'}</span>
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {step < 4 ? 'arrow_forward' : 'auto_awesome'}
              </span>
            </>
          )}
        </button>
        <p className="text-center text-xs text-outline font-medium">
          Step {step} of 4 • Autosaved to your private enclave
        </p>
      </footer>

      {/* SUCCESS MODAL (Triggered on Completion) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-outline-variant text-center flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 text-white">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-on-surface">Welcome to Kairos!</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your personalized cognitive operating system has been calibrated for {preferredName}. +100 XP added to your profile.
              </p>
            </div>
            <div className="w-full bg-surface-container-low rounded-2xl p-3.5 flex items-center justify-between text-left text-xs border border-outline-variant/40">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[22px]">verified_user</span>
                <div>
                  <p className="font-bold text-on-surface">Cadence Calibrated</p>
                  <p className="text-[11px] text-outline">Encrypted &amp; private by default</p>
                </div>
              </div>
              <span className="text-xs font-bold text-primary bg-primary-fixed/60 px-2.5 py-1 rounded-full">
                Ready
              </span>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                onFinish();
              }}
              className="w-full h-13 rounded-full bg-primary text-on-primary font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              type="button"
            >
              <span>Enter Today's Command Center</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
