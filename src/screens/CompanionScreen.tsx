import React, { useState, useRef, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface CompanionScreenProps {
  userProfile?: { email: string; name: string } | null;
  onNavigateTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'companion';
  text?: string;
  timestamp: string;
  status?: 'delivered' | 'read' | 'sending';
  structuredContent?: {
    type: 'paxos-explanation' | 'generic-card';
    title?: string;
    description?: string;
    steps?: { num: number; title: string; desc: string }[];
    ruleOfThumb?: string;
    quiz?: {
      question: string;
      options: { label: string; text: string; isCorrect: boolean; feedback: string }[];
    };
    deviceAction?: {
      actionType: string;
      title: string;
      subtitle: string;
      xpReward: string;
      memoryCategory: string;
    };
  };
}

interface Persona {
  id: string;
  name: string;
  title: string;
  description: string;
  gradient: string;
  badge: string;
  activeColor: string;
  voiceName: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'aura',
    name: 'Aura',
    title: 'Distillation Mode',
    description: 'Concise synthesis, cognitive pacing & active recall',
    gradient: 'from-purple-600 via-indigo-500 to-pink-500',
    badge: 'Distillation Mode',
    activeColor: 'text-indigo-600 bg-indigo-50 border-indigo-100/70',
    voiceName: 'Aura Neural 2.5'
  },
  {
    id: 'lumina',
    name: 'Lumina',
    title: 'Creative Mode',
    description: 'Divergent brainstorming, analogies & creative synthesis',
    gradient: 'from-amber-500 via-rose-500 to-purple-600',
    badge: 'Creative Mode',
    activeColor: 'text-rose-600 bg-rose-50 border-rose-100/70',
    voiceName: 'Lumina Velvet V2'
  },
  {
    id: 'chronos',
    name: 'Chronos',
    title: 'Executive Mode',
    description: 'High-stakes execution, calendar routing & timeline optimization',
    gradient: 'from-blue-600 via-cyan-500 to-indigo-700',
    badge: 'Executive Mode',
    activeColor: 'text-cyan-600 bg-cyan-50 border-cyan-100/70',
    voiceName: 'Chronos Deep Precision'
  }
];

export const CompanionScreen: React.FC<CompanionScreenProps> = ({ userProfile, onNavigateTab }) => {
  // Drawer & Modals State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [voiceStreamOpen, setVoiceStreamOpen] = useState(false);

  // Active Companion Persona
  const [activePersona, setActivePersona] = useState<Persona>(PERSONAS[0]);

  // Quiz State
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [cadenceHp, setCadenceHp] = useState(85);

  // Device Action Undo State
  const [calendarActionUndone, setCalendarActionUndone] = useState(false);

  // Feedback State
  const [liked, setLiked] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Input & Chat State
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial Conversation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'user',
      text: 'Explain Paxos consensus simply and remind me to review at 4 PM',
      timestamp: '11:42 AM',
      status: 'delivered'
    },
    {
      id: 'msg-2',
      sender: 'companion',
      timestamp: '11:42 AM',
      structuredContent: {
        type: 'paxos-explanation',
        title: 'Paxos Simplified: The Parliamentary Protocol',
        description:
          'Think of Paxos as a distributed legislature voting on a single bill even if messengers get lost or nodes fall asleep:',
        steps: [
          {
            num: 1,
            title: 'Proposers (Delegates)',
            desc: 'Draft laws with a numbered ticket: “Prepare proposal #42”.'
          },
          {
            num: 2,
            title: 'Acceptors (Parliament)',
            desc: 'Promise to reject any older numbered drafts and vote on the newest proposal.'
          },
          {
            num: 3,
            title: 'Learners (Citizens)',
            desc: 'Adopt the decided value once a strict majority (quorum) agrees.'
          }
        ],
        ruleOfThumb: 'Rule of Thumb: Safety guaranteed, liveness not bulletproof.',
        quiz: {
          question:
            'In basic Paxos, who initiates a proposal with a uniquely incremented identifier?',
          options: [
            {
              label: 'A',
              text: 'The Proposer Node',
              isCorrect: true,
              feedback: 'Correct! Proposers initiate ballots with incremented proposal numbers.'
            },
            {
              label: 'B',
              text: 'The Citizen Learner',
              isCorrect: false,
              feedback: 'Incorrect. Learners only listen to adopted consensus values.'
            }
          ]
        },
        deviceAction: {
          actionType: 'Calendar',
          title: 'Calendar: Review Paxos',
          subtitle: 'Today @ 4:00 PM – 4:30 PM • 15m notification set',
          xpReward: '+15 HP Cognitive Cadence',
          memoryCategory: 'Memory: Study/Distributed Systems'
        }
      }
    }
  ]);

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
      setToastMessage(null);
    }, 2800);
  };

  const scrollToBottom = () => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle Tab Navigation
  const handleTabClick = (tabKey: string) => {
    triggerHaptic(ImpactStyle.Light);
    if (onNavigateTab) {
      onNavigateTab(tabKey);
    }
  };

  // Copy text to clipboard
  const handleCopy = (textToCopy: string) => {
    triggerHaptic(ImpactStyle.Light);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      showToast('Copied to clipboard');
    }
  };

  // Edit Prompt
  const handleEditPrompt = (text: string) => {
    triggerHaptic(ImpactStyle.Light);
    setInputValue(text);
    inputRef.current?.focus();
    showToast('Prompt loaded into editor');
  };

  // Quiz Click
  const handleQuizOption = (index: number, isCorrect: boolean) => {
    triggerHaptic(isCorrect ? ImpactStyle.Medium : ImpactStyle.Heavy);
    setQuizSelected(index);
    if (isCorrect && quizSelected !== index) {
      setCadenceHp((prev) => Math.min(100, prev + 5));
      showToast('⚡ +5 HP Cognitive Cadence Earned!');
    }
  };

  // Undo / Restore Calendar action
  const handleToggleCalendarAction = () => {
    triggerHaptic(ImpactStyle.Medium);
    setCalendarActionUndone((prev) => {
      const next = !prev;
      showToast(next ? 'Calendar review event removed' : 'Calendar event restored for 4:00 PM');
      return next;
    });
  };

  // Send Message
  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed && !attachedFile) return;

    triggerHaptic(ImpactStyle.Medium);

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsgText = attachedFile ? `[Attachment: ${attachedFile}] ${trimmed}` : trimmed;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: timeString,
      status: 'delivered'
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setAttachedFile(null);
    setAttachmentSheetOpen(false);
    setIsTyping(true);

    // Simulate Companion AI Response
    setTimeout(() => {
      setIsTyping(false);
      triggerHaptic(ImpactStyle.Light);

      let companionResponse: ChatMessage;

      const lower = userMsgText.toLowerCase();

      if (lower.includes('raft') || lower.includes('consensus')) {
        companionResponse = {
          id: `msg-${Date.now() + 1}`,
          sender: 'companion',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          structuredContent: {
            type: 'generic-card',
            title: 'Raft vs. Paxos Distillation',
            description:
              'While Paxos decouples consensus into independent ballots, Raft structures consensus around an elected Leader with explicit term leases:',
            steps: [
              {
                num: 1,
                title: 'Leader Election',
                desc: 'Nodes elect a single leader via randomized election timeouts to eliminate split-brain.'
              },
              {
                num: 2,
                title: 'Log Replication',
                desc: 'All entries flow unidirectionally from Leader to Followers with monotonic indexing.'
              },
              {
                num: 3,
                title: 'Safety Invariant',
                desc: 'A leader is never overwritten; logs are strictly append-only once committed.'
              }
            ],
            ruleOfThumb: 'Raft trades minimal theoretical flexibility for deterministic human understandability.',
            quiz: {
              question: 'In Raft, what mechanism prevents two nodes from becoming leader simultaneously?',
              options: [
                {
                  label: 'A',
                  text: 'Randomized Election Timeouts & Majority Quorum',
                  isCorrect: true,
                  feedback: 'Correct! Randomized timers prevent persistent split votes.'
                },
                {
                  label: 'B',
                  text: 'Centralized Master Registry',
                  isCorrect: false,
                  feedback: 'Incorrect. Raft is decentralized and requires no external master.'
                }
              ]
            },
            deviceAction: {
              actionType: 'Flashcard Vault',
              title: 'Flashcard Generated: Raft Invariants',
              subtitle: 'Anchored into your Spaced Repetition Queue • 3 Cards',
              xpReward: '+10 HP Neural Sync',
              memoryCategory: 'Memory: Distributed Consensus'
            }
          }
        };
      } else {
        // Generic smart companion response
        companionResponse = {
          id: `msg-${Date.now() + 1}`,
          sender: 'companion',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          structuredContent: {
            type: 'generic-card',
            title: `${activePersona.name} Insight Synthesis`,
            description: `Distilled analysis for: "${trimmed.slice(0, 48)}${trimmed.length > 48 ? '...' : ''}"`,
            steps: [
              {
                num: 1,
                title: 'Core Concept',
                desc: 'Synthesized the primary levers and cognitive focus required for this objective.'
              },
              {
                num: 2,
                title: 'Actionable Workflow',
                desc: 'Break into 25-minute Pomodoro cadence with zero context switching.'
              },
              {
                num: 3,
                title: 'Neural Consolidation',
                desc: 'Active recall scheduled prior to evening twilight recovery.'
              }
            ],
            ruleOfThumb: 'Clarity is velocity: align high-friction cognitive work with your morning peak.',
            deviceAction: {
              actionType: 'Routine Sync',
              title: `Neural Anchor: ${trimmed.slice(0, 24)}...`,
              subtitle: 'Logged in Kairos Memory Vault • Auto-categorized',
              xpReward: '+10 HP Cadence',
              memoryCategory: 'Memory: Cognitive Focus'
            }
          }
        };
      }

      setMessages((prev) => [...prev, companionResponse]);
    }, 1400);
  };

  return (
    <div className="font-sans text-slate-800 bg-[#F7F8FC] antialiased min-h-screen flex flex-col justify-between select-none relative overflow-x-hidden">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fade-in">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700/50 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BEGIN: TopNavigation                                                      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#F7F8FC]/90 backdrop-blur-md px-4 pt-3 pb-3 border-b border-slate-100 flex items-center justify-between">
        {/* Back Button */}
        <button
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-700 active:bg-slate-200/60 transition-colors cursor-pointer"
          type="button"
          onClick={() => handleTabClick('home')}
          data-screen="SCREEN_22"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Center Identity / Avatar */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => setDrawerOpen(true)}
        >
          <div className="relative flex items-center justify-center">
            {/* Radiant Glow Aura */}
            <div
              className={`absolute -inset-1.5 bg-gradient-to-tr ${activePersona.gradient} rounded-full blur-[6px] opacity-70 animate-pulse`}
            />
            {/* Monogram Badge */}
            <div
              className={`relative w-10 h-10 rounded-full bg-gradient-to-tr ${activePersona.gradient} flex items-center justify-center text-white font-bold text-lg shadow-inner ring-2 ring-white`}
            >
              <span className="tracking-tighter">K</span>
            </div>
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center space-x-1.5">
              <span className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                Kairos
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[11px] font-medium text-slate-500 tracking-wide">
              {activePersona.name} • Chat
            </span>
          </div>
        </div>

        {/* Right Menu Toggle */}
        <button
          aria-label="Open sidebar drawer"
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-800 hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
          id="open-drawer-btn"
          type="button"
          onClick={() => {
            triggerHaptic(ImpactStyle.Light);
            setDrawerOpen(true);
          }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </header>
      {/* END: TopNavigation */}

      {/* ========================================================================= */}
      {/* BEGIN: ChatFeedArea                                                       */}
      {/* ========================================================================= */}
      <main
        className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-5 pb-40 overflow-y-auto mobile-scroll"
        data-purpose="chat-feed"
      >
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              /* User Prompt Message Block */
              <div
                key={msg.id}
                className="flex flex-col items-end space-y-1.5 pl-8 animate-fade-in"
                data-purpose="user-message"
              >
                <div className="bg-gradient-to-r from-[#3125C2] to-[#4338CA] text-white px-5 py-3.5 rounded-[22px] rounded-br-sm shadow-md text-[14.5px] leading-relaxed font-medium tracking-normal">
                  {msg.text}
                </div>
                {/* Timestamp and status chips */}
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-medium pr-1">
                  {/* Copy subtle icon */}
                  <button
                    className="hover:text-slate-600 transition-colors cursor-pointer"
                    title="Copy user prompt"
                    type="button"
                    onClick={() => handleCopy(msg.text || '')}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  {/* Edit pencil icon */}
                  <button
                    className="hover:text-slate-600 transition-colors cursor-pointer"
                    title="Edit prompt"
                    type="button"
                    onClick={() => handleEditPrompt(msg.text || '')}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <span>{msg.timestamp}</span>
                  {/* Double checkmark delivered status */}
                  <svg
                    className="w-3.5 h-3.5 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 6L9 17l-5-5" />
                    <path d="M20 12L11 21l-2-2" />
                  </svg>
                </div>
              </div>
            );
          }

          // Companion Structured Content Response
          const content = msg.structuredContent;

          return (
            <div key={msg.id} className="space-y-4 animate-fade-in">
              {/* AI Companion Response Header Badge */}
              <div
                className="flex items-center justify-between pt-1"
                data-purpose="companion-header-meta"
              >
                <div className="flex items-center space-x-2">
                  {/* Mini Companion Aura Orb */}
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${activePersona.gradient} flex items-center justify-center text-white shadow-sm ring-2 ring-white`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-800 tracking-tight">
                    {activePersona.name}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${activePersona.activeColor}`}>
                    {activePersona.badge}
                  </span>
                </div>
                {/* Instant Status Badge */}
                <div className="flex items-center space-x-1 text-slate-600 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" viewBox="0 0 24 24">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Instant</span>
                </div>
              </div>

              {/* Structured Card 1: Paxos / Protocol Explanation */}
              {content && (
                <article
                  className="bg-white rounded-3xl p-5 shadow-card border border-slate-100 space-y-4"
                  data-purpose="structured-explanation-card"
                >
                  <div className="flex items-start space-x-3">
                    {/* Protocol Icon */}
                    <div className="mt-0.5 text-indigo-600">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                      </svg>
                    </div>
                    <h2 className="text-[17px] font-extrabold text-slate-900 leading-snug tracking-tight">
                      {content.title}
                    </h2>
                  </div>
                  <p className="text-[13.5px] text-slate-600 leading-relaxed font-normal">
                    {content.description}
                  </p>

                  {/* Steps Breakdown */}
                  {content.steps && (
                    <div className="space-y-2.5">
                      {content.steps.map((step) => (
                        <div
                          key={step.num}
                          className="flex items-start space-x-3 p-3 rounded-2xl bg-[#F4F5FB]/80 border border-slate-100/80"
                        >
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {step.num}
                          </span>
                          <div className="text-[13px] leading-tight">
                            <h3 className="font-bold text-slate-900">{step.title}</h3>
                            <p className="text-slate-500 font-normal mt-1 leading-normal">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Step 4: Rule of Thumb */}
                      {content.ruleOfThumb && (
                        <div className="flex items-center space-x-3 p-3 rounded-2xl bg-[#EBEFFE]/80 border border-indigo-100/90 text-indigo-900">
                          <div className="w-6 h-6 rounded-lg bg-indigo-200/70 text-indigo-700 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.001z" />
                            </svg>
                          </div>
                          <p className="text-[12.5px] font-semibold tracking-tight leading-snug">
                            {content.ruleOfThumb}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )}

              {/* Structured Card 2: Active Recall Check Interactive Quiz */}
              {content?.quiz && (
                <article
                  className="bg-[#EFF2FC] rounded-3xl p-5 border border-indigo-100/80 space-y-3.5 shadow-sm"
                  data-purpose="active-recall-quiz-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-4 h-4 text-indigo-700"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
                        <path d="M9 9h.01" />
                        <path d="M15 9h.01" />
                        <path d="M9 13h6" />
                        <path d="M9 17h6" />
                      </svg>
                      <span className="text-[12px] font-extrabold tracking-wider uppercase text-slate-800">
                        Active Recall Check
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">Question 1 of 1</span>
                  </div>
                  <p className="text-[13.5px] font-semibold text-slate-800 leading-snug">
                    {content.quiz.question}
                  </p>

                  {/* Quiz Interactive Options */}
                  <div className="space-y-2 pt-1" id="quiz-options-group">
                    {content.quiz.options.map((opt, idx) => {
                      const isSelected = quizSelected === idx;
                      let btnClasses =
                        'w-full bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between transition-all text-left shadow-sm cursor-pointer';

                      if (isSelected) {
                        if (opt.isCorrect) {
                          btnClasses =
                            'w-full bg-emerald-50/70 border-2 border-emerald-500 rounded-2xl p-3.5 flex items-center justify-between transition-all text-left shadow-sm ring-2 ring-emerald-400/50';
                        } else {
                          btnClasses =
                            'w-full bg-rose-50/70 border-2 border-rose-400 rounded-2xl p-3.5 flex items-center justify-between transition-all text-left shadow-sm';
                        }
                      }

                      return (
                        <div key={opt.label} className="space-y-1">
                          <button
                            className={btnClasses}
                            type="button"
                            onClick={() => handleQuizOption(idx, opt.isCorrect)}
                          >
                            <div className="flex items-center space-x-3">
                              <span
                                className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                  isSelected && opt.isCorrect
                                    ? 'bg-emerald-500 text-white'
                                    : isSelected && !opt.isCorrect
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-indigo-50 text-indigo-700'
                                }`}
                              >
                                {opt.label}
                              </span>
                              <span
                                className={`text-[13px] font-medium ${
                                  isSelected && opt.isCorrect
                                    ? 'text-emerald-950 font-bold'
                                    : isSelected && !opt.isCorrect
                                    ? 'text-rose-950 font-bold'
                                    : 'text-slate-800'
                                }`}
                              >
                                {opt.text}
                              </span>
                            </div>

                            {isSelected && opt.isCorrect && (
                              <svg
                                className="w-5 h-5 text-emerald-600 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                          {isSelected && (
                            <p
                              className={`text-[11px] font-semibold px-3 py-1 rounded-lg ${
                                opt.isCorrect
                                  ? 'text-emerald-700 bg-emerald-100/50'
                                  : 'text-rose-700 bg-rose-100/50'
                              }`}
                            >
                              {opt.feedback}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              )}

              {/* Structured Card 3: Autonomous Device Action & Memory Cadence */}
              {content?.deviceAction && (
                <article
                  className="bg-white rounded-3xl p-5 shadow-card border border-slate-100 space-y-3.5"
                  data-purpose="device-action-status-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {/* Calendar Icon Badge */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          calendarActionUndone
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-indigo-100 text-indigo-600'
                        }`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
                          <line x1="16" x2="16" y1="2" y2="6" />
                          <line x1="8" x2="8" y1="2" y2="6" />
                          <line x1="3" x2="21" y1="10" y2="10" />
                          <path d="M9 16l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <div
                          className={`flex items-center space-x-1.5 text-[11px] font-bold tracking-wider uppercase ${
                            calendarActionUndone ? 'text-slate-400' : 'text-indigo-600'
                          }`}
                        >
                          <span>
                            {calendarActionUndone ? 'Action Cancelled' : 'Device Action Completed'}
                          </span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full inline-block ${
                              calendarActionUndone ? 'bg-slate-300' : 'bg-indigo-600'
                            }`}
                          />
                        </div>
                        <h3
                          className={`text-[16px] font-extrabold mt-0.5 ${
                            calendarActionUndone ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          {content.deviceAction.title}
                        </h3>
                        <p className="text-[12px] text-slate-500 font-medium">
                          {calendarActionUndone
                            ? 'Removed from system calendar'
                            : content.deviceAction.subtitle}
                        </p>
                      </div>
                    </div>
                    {/* Undo / Restore Button */}
                    <button
                      className="px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 text-xs font-semibold tracking-tight transition-colors cursor-pointer"
                      type="button"
                      onClick={handleToggleCalendarAction}
                    >
                      {calendarActionUndone ? 'Restore' : 'Undo'}
                    </button>
                  </div>

                  {/* Action Chips (XP & Memory Vault) */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Cadence XP Pill */}
                    <div
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-bold cursor-pointer active:scale-95 transition-transform"
                      onClick={() => showToast('Cadence HP tracks your cognitive sync efficiency')}
                    >
                      <svg className="w-3 h-3 text-rose-500 fill-rose-500" viewBox="0 0 24 24">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span>{content.deviceAction.xpReward}</span>
                    </div>
                    {/* Long-term Memory Vault Pill */}
                    <div
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer active:scale-95"
                      onClick={() => setVaultModalOpen(true)}
                    >
                      <svg
                        className="w-3 h-3 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{content.deviceAction.memoryCategory}</span>
                    </div>
                  </div>
                </article>
              )}

              {/* Message Actions Toolbar & Model Signature */}
              <div
                className="flex items-center justify-between px-1 pt-1 text-slate-400 text-xs"
                data-purpose="chat-actions-toolbar"
              >
                <div className="flex items-center space-x-3.5">
                  {/* Copy Button */}
                  <button
                    aria-label="Copy answer"
                    className="hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `${content?.title || ''}\n${content?.description || ''}\n${content?.ruleOfThumb || ''}`
                      )
                    }
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>

                  {/* Thumbs Up */}
                  <button
                    aria-label="Good response"
                    className={`hover:text-slate-600 active:scale-95 transition-all cursor-pointer ${
                      liked === true ? 'text-indigo-600' : ''
                    }`}
                    type="button"
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setLiked(liked === true ? null : true);
                      showToast('Thanks for your feedback!');
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={liked === true ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                  </button>

                  {/* Thumbs Down */}
                  <button
                    aria-label="Bad response"
                    className={`hover:text-slate-600 active:scale-95 transition-all cursor-pointer ${
                      liked === false ? 'text-rose-600' : ''
                    }`}
                    type="button"
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setLiked(liked === false ? null : false);
                      showToast('We will refine distillation models for this query.');
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={liked === false ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                    </svg>
                  </button>

                  {/* Regenerate */}
                  <button
                    aria-label="Regenerate message"
                    className="hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
                    type="button"
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Medium);
                      showToast('Regenerating distillation...');
                      setIsTyping(true);
                      setTimeout(() => setIsTyping(false), 900);
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>

                  {/* Share */}
                  <button
                    aria-label="Share response"
                    className="hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: 'Paxos Consensus Distillation — Kairos AI',
                            text: 'Paxos Simplified: The Parliamentary Protocol'
                          })
                          .catch(() => {});
                      } else {
                        handleCopy('Paxos Simplified: The Parliamentary Protocol');
                      }
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                    </svg>
                  </button>
                </div>
                {/* Model Tag */}
                <span className="text-[11px] font-semibold text-slate-400">
                  {activePersona.name} 2.5 Pro
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing / Distilling Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 pt-2 animate-fade-in">
            <div
              className={`w-7 h-7 rounded-full bg-gradient-to-tr ${activePersona.gradient} flex items-center justify-center text-white shadow-sm ring-2 ring-white`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
              <span
                className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: '0.3s' }}
              />
              <span className="text-xs text-slate-400 font-medium pl-1">
                {activePersona.name} is distilling...
              </span>
            </div>
          </div>
        )}

        <div ref={feedEndRef} />
      </main>
      {/* END: ChatFeedArea */}

      {/* ========================================================================= */}
      {/* BEGIN: AttachmentModalSheet                                               */}
      {/* ========================================================================= */}
      <div
        className={`fixed inset-x-0 bottom-24 z-50 max-w-md mx-auto px-4 transition-all duration-300 ${
          attachmentSheetOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        data-purpose="attachment-sheet-menu"
        id="attachment-sheet"
      >
        <div
          className={`sheet-transition transform ${
            attachmentSheetOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          } bg-white/95 backdrop-blur-xl border border-slate-100 rounded-3xl p-4 shadow-2xl`}
        >
          <div className="grid grid-cols-4 gap-3 text-center">
            {/* Option 1: Camera */}
            <button
              className="flex flex-col items-center space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              type="button"
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setAttachedFile('Captured_Visual_Snapshot.jpg');
                setAttachmentSheetOpen(false);
                showToast('Camera snapshot attached');
              }}
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Camera</span>
            </button>

            {/* Option 2: Photos */}
            <button
              className="flex flex-col items-center space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              type="button"
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setAttachedFile('Diagram_Architecture.png');
                setAttachmentSheetOpen(false);
                showToast('Photo asset attached');
              }}
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Photos</span>
            </button>

            {/* Option 3: Document */}
            <button
              className="flex flex-col items-center space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              type="button"
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setAttachedFile('Distributed_Systems_Notes.md');
                setAttachmentSheetOpen(false);
                showToast('Knowledge vault document linked');
              }}
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Doc Vault</span>
            </button>

            {/* Option 4: Audio File */}
            <button
              className="flex flex-col items-center space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              type="button"
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setAttachedFile('Voice_Memo_Paxos.m4a');
                setAttachmentSheetOpen(false);
                showToast('Voice memo attached');
              }}
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="23" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Voice Note</span>
            </button>
          </div>
        </div>
      </div>
      {/* END: AttachmentModalSheet */}

      {/* ========================================================================= */}
      {/* BEGIN: FloatingInputConsole                                               */}
      {/* ========================================================================= */}
      <footer
        className="fixed inset-x-0 z-40 max-w-md mx-auto px-4 pb-6 pt-2 pointer-events-none"
        data-purpose="floating-bottom-bar"
        style={{ bottom: '64px' }}
      >
        {attachedFile && (
          <div className="pointer-events-auto mb-2 mx-2 bg-indigo-50/90 border border-indigo-200 text-indigo-800 text-xs px-3 py-1.5 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
            <span className="truncate font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              Attached: {attachedFile}
            </span>
            <button
              onClick={() => setAttachedFile(null)}
              className="text-slate-500 hover:text-slate-800 font-bold ml-2 cursor-pointer"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-full p-2 pl-3 shadow-float border border-slate-200/80 flex items-center space-x-2.5 transition-all">
          {/* Plus Attachment Toggle Button */}
          <button
            aria-label="Toggle Attachments"
            className="w-10 h-10 rounded-full bg-[#EFF1FA] hover:bg-slate-200/80 active:scale-95 flex items-center justify-center text-slate-700 transition-all flex-shrink-0 cursor-pointer"
            id="attachment-toggle-btn"
            type="button"
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              setAttachmentSheetOpen((prev) => !prev);
            }}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${
                attachmentSheetOpen ? 'rotate-45' : ''
              }`}
              fill="none"
              id="attachment-icon"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
          </button>

          {/* Prompt Input Field */}
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              autoComplete="off"
              className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-[14px] text-slate-800 placeholder:text-slate-400 font-medium px-1 py-1.5"
              id="chat-input"
              placeholder={`Ask ${activePersona.name} anything, brainstorm...`}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
          </div>

          {/* Audio Cadence Waveform Button */}
          <button
            aria-label="Voice Cadence Stream"
            className="w-10 h-10 rounded-full border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 active:scale-95 flex items-center justify-center text-indigo-600 transition-all flex-shrink-0 cursor-pointer"
            type="button"
            onClick={() => {
              triggerHaptic(ImpactStyle.Medium);
              setVoiceStreamOpen(true);
            }}
          >
            {/* Equalizer Waveform Bars */}
            <div className="flex items-center space-x-[2.5px] h-4">
              <span className="w-[2.5px] h-2.5 bg-indigo-600 rounded-full animate-pulse" />
              <span className="w-[2.5px] h-4 bg-indigo-600 rounded-full" />
              <span className="w-[2.5px] h-3 bg-indigo-600 rounded-full animate-pulse" />
              <span className="w-[2.5px] h-1.5 bg-indigo-600 rounded-full" />
            </div>
          </button>

          {/* Primary Action: Mic or Send Button */}
          <button
            aria-label="Send or Voice"
            className="w-10 h-10 rounded-full bg-[#3B28CC] hover:bg-[#3221B3] active:scale-95 flex items-center justify-center text-white shadow-md transition-all flex-shrink-0 cursor-pointer"
            id="send-or-mic-btn"
            type="button"
            onClick={() => {
              if (inputValue.trim() || attachedFile) {
                handleSendMessage();
              } else {
                triggerHaptic(ImpactStyle.Medium);
                setVoiceStreamOpen(true);
              }
            }}
          >
            {inputValue.trim() || attachedFile ? (
              /* Flight / Send Airplane Icon (Active when typing) */
              <svg
                className="w-5 h-5 animate-fade-in"
                fill="none"
                id="send-icon"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <line x1="22" x2="11" y1="2" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            ) : (
              /* Mic Icon (Default) */
              <svg
                className="w-5 h-5 animate-fade-in"
                fill="none"
                id="mic-icon"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="23" />
                <line x1="8" x2="16" y1="23" y2="23" />
              </svg>
            )}
          </button>
        </div>
      </footer>
      {/* END: FloatingInputConsole */}

      {/* ========================================================================= */}
      {/* BEGIN: BottomNavigation                                                   */}
      {/* ========================================================================= */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 py-2 flex items-center justify-around shadow-lg"
        data-purpose="bottom-navigation"
      >
        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          data-screen="SCREEN_22"
          aria-label="Home"
          onClick={() => handleTabClick('home')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[10px] font-semibold mt-0.5">Home</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          data-screen="SCREEN_20"
          aria-label="Tasks & Routines Hub"
          onClick={() => handleTabClick('tasks')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect height="18" rx="2" width="18" x="3" y="3" />
            <polyline points="9 11 12 14 22 4" />
            <line x1="9" x2="15" y1="17" y2="17" />
          </svg>
          <span className="text-[10px] font-semibold mt-0.5">Tasks</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-1 text-indigo-600 font-bold transition-colors cursor-pointer"
          data-screen="SCREEN_11"
          aria-label="Kairos AI Companion"
          onClick={() => handleTabClick('companion')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[10px] font-bold mt-0.5 text-indigo-600">Companion</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          data-screen="SCREEN_12"
          aria-label="Friends & Squad Challenges"
          onClick={() => handleTabClick('squad')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-[10px] font-semibold mt-0.5">Squad</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          data-screen="SCREEN_29"
          aria-label="Profile - Analytics & Evolution"
          onClick={() => handleTabClick('profile')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[10px] font-semibold mt-0.5">Profile</span>
        </button>
      </nav>
      {/* END: BottomNavigation */}

      {/* ========================================================================= */}
      {/* BEGIN: NavigationDrawerSidebar                                            */}
      {/* ========================================================================= */}
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        id="drawer-backdrop"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer Container (Right-to-Left Slide-out) */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-[300px] bg-white z-50 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        } drawer-transition`}
        data-purpose="history-and-companion-drawer"
        id="chat-drawer"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              K
            </div>
            <span className="font-extrabold text-base text-slate-900">Kairos Hub</span>
          </div>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
            id="close-drawer-btn"
            type="button"
            onClick={() => setDrawerOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 mobile-scroll">
          {/* Companion Personas */}
          <section data-purpose="companion-personas">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
              Companions
            </div>
            <div className="space-y-1">
              {PERSONAS.map((persona) => {
                const isActive = activePersona.id === persona.id;
                return (
                  <div
                    key={persona.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-indigo-50/80 border border-indigo-100/80'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setActivePersona(persona);
                      showToast(`Switched companion to ${persona.name}`);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isActive ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                      />
                      <span
                        className={`text-[13.5px] ${
                          isActive ? 'font-bold text-slate-800' : 'font-medium text-slate-600'
                        }`}
                      >
                        {persona.name} {persona.id !== 'aura' ? `(${persona.title.split(' ')[0]})` : ''}
                      </span>
                    </div>
                    {isActive && (
                      <span className="text-[11px] font-semibold text-indigo-600">Active</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Chat History */}
          <section data-purpose="chat-history">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Today
              </span>
              <button
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  setMessages([
                    {
                      id: `msg-${Date.now()}`,
                      sender: 'companion',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      structuredContent: {
                        type: 'generic-card',
                        title: 'New Neural Thread Initialized',
                        description: `How can ${activePersona.name} assist your circadian flow right now?`,
                        ruleOfThumb: 'Ask for concepts distillation, scheduling, or active recall testing.'
                      }
                    }
                  ]);
                  setDrawerOpen(false);
                  showToast('New thread started');
                }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                type="button"
              >
                + New Chat
              </button>
            </div>
            <div className="space-y-1 text-[13px] font-medium text-slate-700">
              <div
                className="p-2.5 rounded-xl bg-slate-100 text-slate-900 font-semibold truncate cursor-pointer"
                onClick={() => setDrawerOpen(false)}
              >
                Paxos consensus & 4 PM reminder
              </div>
              <div
                className="p-2.5 rounded-xl hover:bg-slate-50 truncate text-slate-600 cursor-pointer"
                onClick={() => {
                  setInputValue('Explain Raft vs Paxos state machine replication');
                  setDrawerOpen(false);
                }}
              >
                Raft vs Paxos distributed state
              </div>
              <div
                className="p-2.5 rounded-xl hover:bg-slate-50 truncate text-slate-600 cursor-pointer"
                onClick={() => {
                  setInputValue('Weekly cognitive stamina review and circadian metric score');
                  setDrawerOpen(false);
                }}
              >
                Weekly cognitive stamina review
              </div>
            </div>
          </section>

          {/* Knowledge & Long Term Memory */}
          <section data-purpose="memory-vault">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
              Vault & Stats
            </div>
            <div className="p-3 bg-[#F6F8FD] rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Cadence HP</span>
                <span className="font-extrabold text-rose-600">{cadenceHp} / 100 HP</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${cadenceHp}%` }}
                />
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>34 Anchored memories</span>
                <button
                  className="text-indigo-600 font-semibold cursor-pointer hover:underline"
                  type="button"
                  onClick={() => setVaultModalOpen(true)}
                >
                  Inspect
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Drawer Footer / Settings */}
        <div className="p-4 border-t border-slate-100 space-y-1">
          <button
            className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-100 text-[13px] font-medium text-slate-700 cursor-pointer"
            id="open-settings-btn"
            type="button"
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              setSettingsModalOpen(true);
            }}
          >
            <svg
              className="w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Companion Settings</span>
          </button>
        </div>
      </aside>
      {/* END: NavigationDrawerSidebar */}

      {/* ========================================================================= */}
      {/* MODAL: Voice Cadence Live Stream Overlay                                 */}
      {/* ========================================================================= */}
      {voiceStreamOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-between p-6 animate-fade-in">
          <div className="w-full flex items-center justify-between text-white/70 pt-safe">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">
              Voice Cadence Active • {activePersona.name}
            </span>
            <button
              onClick={() => setVoiceStreamOpen(false)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 cursor-pointer"
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col items-center justify-center space-y-6 text-center my-auto">
            {/* Glowing Pulsing Voice Core */}
            <div className="relative">
              <div
                className={`w-36 h-36 rounded-full bg-gradient-to-tr ${activePersona.gradient} opacity-40 blur-2xl animate-pulse absolute -inset-4`}
              />
              <div
                className={`w-32 h-32 rounded-full bg-gradient-to-tr ${activePersona.gradient} flex items-center justify-center text-white shadow-2xl ring-4 ring-white/20`}
              >
                <div className="flex items-center space-x-1.5 h-12">
                  <span className="w-1.5 h-8 bg-white rounded-full animate-pulse" />
                  <span
                    className="w-1.5 h-14 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <span
                    className="w-1.5 h-10 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <span
                    className="w-1.5 h-16 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: '0.3s' }}
                  />
                  <span
                    className="w-1.5 h-8 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: '0.15s' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">Listening to your thoughts...</h3>
              <p className="text-sm text-slate-300 max-w-xs mt-1 font-medium">
                Speak freely. {activePersona.name} will distill key insights and automatically schedule
                action reminders.
              </p>
            </div>
          </div>

          <div className="w-full max-w-xs pb-safe space-y-3">
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Medium);
                setVoiceStreamOpen(false);
                setInputValue('Summarized key takeaways from my morning focus block');
                showToast('Transcribed voice speech into prompt');
              }}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg active:scale-95 transition-transform cursor-pointer"
              type="button"
            >
              Finish & Send Note
            </button>
            <button
              onClick={() => setVoiceStreamOpen(false)}
              className="w-full py-2.5 rounded-full bg-white/10 text-slate-300 font-semibold text-xs hover:bg-white/20 transition-colors cursor-pointer"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Memory Vault Inspector                                             */}
      {/* ========================================================================= */}
      {vaultModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <h3 className="font-extrabold text-base text-slate-900">Anchored Memory Vault</h3>
              </div>
              <button
                onClick={() => setVaultModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto mobile-scroll pr-1 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>Study/Distributed Systems</span>
                  <span className="text-indigo-600 text-[10px]">Today 11:42 AM</span>
                </div>
                <p className="text-slate-500 mt-1">Paxos Parliamentary Protocol & Quorum invariants</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>Circadian Rhythm Profile</span>
                  <span className="text-indigo-600 text-[10px]">Yesterday</span>
                </div>
                <p className="text-slate-500 mt-1">High-clarity morning focus window: 8:30 AM - 11:30 AM</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>Squad Milestone</span>
                  <span className="text-indigo-600 text-[10px]">3 days ago</span>
                </div>
                <p className="text-slate-500 mt-1">Completed 7-day deep work streak with +45 XP</p>
              </div>
            </div>

            <button
              onClick={() => setVaultModalOpen(false)}
              className="w-full py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-md active:scale-95 transition-transform cursor-pointer"
              type="button"
            >
              Close Vault
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Companion Settings                                                 */}
      {/* ========================================================================= */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Companion Settings</h3>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-bold text-slate-800">Proactive Device Actions</div>
                  <div className="text-slate-500 text-[11px]">Auto-schedule calendar reviews</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-bold text-slate-800">Active Recall Checks</div>
                  <div className="text-slate-500 text-[11px]">Generate mini retention quizzes</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-bold text-slate-800">Voice Synthesis Engine</div>
                  <div className="text-slate-500 text-[11px]">{activePersona.voiceName}</div>
                </div>
                <span className="text-[11px] font-bold text-indigo-600">HD Neural</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSettingsModalOpen(false);
                showToast('Companion settings saved');
              }}
              className="w-full py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-md active:scale-95 transition-transform cursor-pointer"
              type="button"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanionScreen;
