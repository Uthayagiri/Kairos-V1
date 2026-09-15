import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface TasksScreenProps {
  userProfile?: { email: string; name: string } | null;
  onNavigateTab: (tab: string) => void;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  category: 'Gym' | 'Study' | 'Health' | 'Routine' | 'Deep Work' | string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'High' | 'Medium' | 'Low';
  hp: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  cadence: string;
  createdAt: string;
  completedAt: string | null;
}

const INITIAL_TASKS: TaskItem[] = [
  // Completed tasks (Displayed clean WITHOUT strikethrough styling as requested)
  {
    id: 'comp-1',
    title: 'Binaural Sunlight Meditation',
    description: '15 minutes non-sleep deep rest protocol with optical photonic morning calibration.',
    category: 'Health',
    status: 'completed',
    priority: 'High',
    hp: 25,
    startDate: '2024-05-24',
    startTime: '08:30',
    endDate: '2024-05-24',
    endTime: '08:45',
    cadence: 'Daily Cadence',
    createdAt: 'May 24, 2024 at 06:30 AM',
    completedAt: 'May 24, 2024 at 08:45 AM'
  },
  {
    id: 'comp-2',
    title: 'Morning Wake-up & Sunlight',
    description: 'Photonic circadian clock reset and 10 minute nasal breathing morning walk.',
    category: 'Routine',
    status: 'completed',
    priority: 'High',
    hp: 20,
    startDate: '2024-05-24',
    startTime: '07:00',
    endDate: '2024-05-24',
    endTime: '07:15',
    cadence: 'Daily Cadence',
    createdAt: 'May 24, 2024 at 06:30 AM',
    completedAt: 'May 24, 2024 at 07:15 AM'
  },
  {
    id: 'comp-3',
    title: '500ml Hydration & Electrolytes',
    description: 'Pink salt, magnesium blend, and filtered cold water intake to jumpstart cellular hydration.',
    category: 'Health',
    status: 'completed',
    priority: 'Medium',
    hp: 15,
    startDate: '2024-05-24',
    startTime: '07:20',
    endDate: '2024-05-24',
    endTime: '07:30',
    cadence: 'Daily Cadence',
    createdAt: 'May 24, 2024 at 06:30 AM',
    completedAt: 'May 24, 2024 at 07:30 AM'
  },
  {
    id: 'comp-4',
    title: 'Review CS Thesis Outline',
    description: 'Structured abstract, verified references, benchmark metrics, and neural code samples.',
    category: 'Study',
    status: 'completed',
    priority: 'High',
    hp: 40,
    startDate: '2024-05-24',
    startTime: '08:00',
    endDate: '2024-05-24',
    endTime: '09:00',
    cadence: 'Single Event / No Repeat',
    createdAt: 'May 24, 2024 at 07:00 AM',
    completedAt: 'May 24, 2024 at 09:00 AM'
  },
  {
    id: 'comp-5',
    title: 'Weekly Squad Cadence Sync',
    description: 'Shared sprint commitments, blocker removals, and team energy allocation review.',
    category: 'Routine',
    status: 'completed',
    priority: 'Medium',
    hp: 40,
    startDate: '2024-05-24',
    startTime: '09:45',
    endDate: '2024-05-24',
    endTime: '10:15',
    cadence: 'Weekly Repeat',
    createdAt: 'May 24, 2024 at 07:00 AM',
    completedAt: 'May 24, 2024 at 10:15 AM'
  },

  // Pending tasks
  {
    id: 'pend-1',
    title: 'Strength: Posterior Chain Focus',
    description: 'Warmup, deadlifts 4x6 @ RPE 8, barbell hip thrusts, and active somatic recovery stretch.',
    category: 'Gym',
    status: 'pending',
    priority: 'High',
    hp: 45,
    startDate: '2024-05-24',
    startTime: '11:30',
    endDate: '2024-05-24',
    endTime: '12:30',
    cadence: 'Weekly Repeat',
    createdAt: 'May 24, 2024 at 07:00 AM',
    completedAt: null
  },
  {
    id: 'pend-2',
    title: 'Calculus III: Vector Fields Lab',
    description: 'Finish problem sets 4.2 to 4.5; compile Jupyter notebook for peer squad review and evaluation.',
    category: 'Study',
    status: 'pending',
    priority: 'Medium',
    hp: 30,
    startDate: '2024-05-24',
    startTime: '14:00',
    endDate: '2024-05-24',
    endTime: '15:30',
    cadence: 'Single Event / No Repeat',
    createdAt: 'May 24, 2024 at 07:00 AM',
    completedAt: null
  },
  {
    id: 'pend-3',
    title: 'Deep Architecture Flow: Cache Layer',
    description: 'Refactor real-time websocket distributor and implement edge invalidation strategy.',
    category: 'Deep Work',
    status: 'pending',
    priority: 'High',
    hp: 40,
    startDate: '2024-05-24',
    startTime: '16:00',
    endDate: '2024-05-24',
    endTime: '17:30',
    cadence: 'Custom Diurnal Window',
    createdAt: 'May 24, 2024 at 07:00 AM',
    completedAt: null
  },

  // Overdue task
  {
    id: 'over-1',
    title: 'Schedule Biometric Bloodwork',
    description: 'Annual metabolic panel, lipid panel, and endocrine biomarkers synchronization with health portal.',
    category: 'Health',
    status: 'overdue',
    priority: 'High',
    hp: 20,
    startDate: '2024-05-23',
    startTime: '17:00',
    endDate: '2024-05-23',
    endTime: '17:30',
    cadence: 'Single Event / No Repeat',
    createdAt: 'May 23, 2024 at 09:00 AM',
    completedAt: null
  }
];

const DATE_STRIP = [
  { dayName: 'Wed', dayNum: '22', hasDot: true },
  { dayName: 'Thu', dayNum: '23', hasDot: true },
  { dayName: 'Fri', dayNum: '24', isToday: true, isComplete: true },
  { dayName: 'Sat', dayNum: '25', hasDot: false },
  { dayName: 'Sun', dayNum: '26', hasDot: false },
  { dayName: 'Mon', dayNum: '27', hasDot: false },
  { dayName: 'Tue', dayNum: '28', hasDot: false }
];

export const TasksScreen: React.FC<TasksScreenProps> = ({ userProfile, onNavigateTab }) => {
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [currentTab, setCurrentTab] = useState<'pending' | 'completed' | 'overdue'>('completed');
  const [selectedDayNum, setSelectedDayNum] = useState<string>('24');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Add Task Form fields
  const [inputTitle, setInputTitle] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [inputCategory, setInputCategory] = useState<string>('Gym');
  const [inputStartDate, setInputStartDate] = useState('2024-05-24');
  const [inputStartTime, setInputStartTime] = useState('14:30');
  const [inputEndDate, setInputEndDate] = useState('2024-05-24');
  const [inputEndTime, setInputEndTime] = useState('15:30');
  const [inputCadence, setInputCadence] = useState('Single Event / No Repeat');
  const [inputPriority, setInputPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // fallback
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Helper Functions
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Gym':
        return 'fitness_center';
      case 'Study':
        return 'menu_book';
      case 'Health':
        return 'vital_signs';
      case 'Routine':
        return 'update';
      case 'Deep Work':
        return 'terminal';
      default:
        return 'task_alt';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Gym':
        return 'bg-secondary-fixed text-on-secondary-fixed';
      case 'Study':
        return 'bg-primary-fixed text-on-primary-fixed';
      case 'Health':
        return 'bg-tertiary-fixed text-on-tertiary-fixed';
      case 'Routine':
        return 'bg-surface-container text-on-surface-variant';
      case 'Deep Work':
        return 'bg-surface-container-high text-primary';
      default:
        return 'bg-surface-container text-on-surface';
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
  };

  // Metrics calculations
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueCount = tasks.filter((t) => t.status === 'overdue').length;
  const totalTasks = tasks.length;
  const gainedHp = tasks
    .filter((t) => t.status === 'completed')
    .reduce((acc, curr) => acc + (curr.hp || 0), 0);

  const pacedPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const strokeDashoffset = 175.9 - (175.9 * pacedPercent) / 100;

  // Toggle status of a task
  const toggleTaskCompletion = (taskId: string) => {
    triggerHaptic(ImpactStyle.Heavy);
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          if (task.status === 'completed') {
            showToast(`Task moved back to pending.`);
            return {
              ...task,
              status: 'pending',
              completedAt: null
            };
          } else {
            const now = new Date();
            const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            showToast(`+${task.hp} HP Claimed! Ritual Completed.`);
            return {
              ...task,
              status: 'completed',
              completedAt: `May 24, 2024 at ${timeFormatted}`
            };
          }
        }
        return task;
      })
    );

    // If detail modal is open for this task, sync it
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => {
        if (!prev) return null;
        const nextStatus = prev.status === 'completed' ? 'pending' : 'completed';
        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          ...prev,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? `May 24, 2024 at ${timeFormatted}` : null
        };
      });
    }
  };

  // Open Detail Modal
  const openDetailModal = (task: TaskItem) => {
    triggerHaptic(ImpactStyle.Light);
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
  };

  // Open & Close Add Task Modal
  const openAddTaskModal = () => {
    triggerHaptic(ImpactStyle.Light);
    setInputStartDate('2024-05-24');
    setInputEndDate('2024-05-24');
    setInputStartTime('14:30');
    setInputEndTime('15:30');
    setIsAddModalOpen(true);
  };

  const closeAddTaskModal = () => {
    setIsAddModalOpen(false);
    setInputTitle('');
    setInputDescription('');
  };

  // Submit Add Task Form
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    triggerHaptic(ImpactStyle.Medium);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newTask: TaskItem = {
      id: 'task-' + Date.now(),
      title: inputTitle.trim(),
      description: inputDescription.trim() || 'No detailed sub-goals provided.',
      category: inputCategory,
      status: 'pending',
      priority: inputPriority,
      hp: 35,
      startDate: inputStartDate || '2024-05-24',
      startTime: inputStartTime || '14:30',
      endDate: inputEndDate || '2024-05-24',
      endTime: inputEndTime || '15:30',
      cadence: inputCadence,
      createdAt: `May 24, 2024 at ${nowTime}`,
      completedAt: null
    };

    setTasks((prev) => [newTask, ...prev]);
    closeAddTaskModal();
    setCurrentTab('pending');
    showToast(`Mission "${newTask.title}" added to pending queue!`);
  };

  // Snooze
  const handleQuickSnooze = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(ImpactStyle.Light);
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, startTime: `${t.startTime} (+15m)` };
        }
        return t;
      })
    );
    showToast('Mission snoozed by +15 minutes.');
  };

  // Delete
  const handleQuickDelete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(ImpactStyle.Medium);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Task removed.');
  };

  const filteredTasks = tasks.filter((t) => t.status === currentTab);

  return (
    <div className="w-full h-full flex flex-col bg-surface overflow-hidden relative selection:bg-primary-fixed selection:text-on-primary-fixed antialiased animate-fade-in font-body-md text-on-surface">
      {/* Top Header App Bar */}
      <header className="fixed top-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe border-b border-surface-container/60">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden shadow-xs shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, rgb(96, 165, 250) 0%, rgb(168, 85, 247) 50%, rgb(236, 72, 153) 100%)'
              }}
            >
              <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full pointer-events-none" />
              <span className="text-white font-serif font-bold text-sm tracking-tight select-none relative z-10 drop-shadow-sm">
                K
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-[16px] tracking-tight text-on-surface font-bold leading-tight">
                  Kairos
                </span>
              </div>
              <span className="font-label-sm text-[11px] text-on-surface-variant leading-tight">
                Tasks
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={openAddTaskModal}
              aria-label="Add task"
              className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-highest text-primary flex items-center justify-center transition-all active:scale-95 shadow-xs border border-primary/10"
              id="openTaskBuilderBtn"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 mobile-scroll w-full px-4 pt-16 pb-28 bg-surface space-y-3">
        {/* Ambient Light Backing Effect */}
        <div className="relative w-full">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-20 bg-primary-fixed-dim/30 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-10 right-2 w-48 h-20 bg-tertiary-fixed/35 rounded-full blur-3xl pointer-events-none -z-10" />
        </div>

        {/* Header: Energy Pulse & Quick Date Switcher */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-headline-sm text-[16px] text-on-surface font-bold tracking-tight">
                Rituals &amp; Flow
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant font-body-sm">
              Synchronized with Kairos Neural Schedule
            </span>
          </div>

          {/* Quick Date Switcher Mini Actions */}
          <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-full shadow-xs border border-surface-container-high/60">
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                const prev = parseInt(selectedDayNum) - 1;
                setSelectedDayNum(prev > 0 ? String(prev) : '24');
              }}
              aria-label="Previous day"
              className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors active:scale-95"
              id="prevDayBtn"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">chevron_left</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setSelectedDayNum('24');
              }}
              className="px-2.5 py-1 rounded-full bg-surface-container-lowest font-label-sm text-[10px] text-primary font-bold shadow-xs transition-transform active:scale-95"
              id="todayBtn"
              type="button"
            >
              Today
            </button>
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                const next = parseInt(selectedDayNum) + 1;
                setSelectedDayNum(String(next));
              }}
              aria-label="Next day"
              className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors active:scale-95"
              id="nextDayBtn"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Horizontal Dynamic Date Strip Calendar */}
        <div className="w-full py-0.5">
          <div className="flex items-center justify-between gap-1 w-full">
            {DATE_STRIP.map((day) => {
              const isSelected = selectedDayNum === day.dayNum;
              return (
                <button
                  key={day.dayNum}
                  onClick={() => {
                    triggerHaptic(ImpactStyle.Light);
                    setSelectedDayNum(day.dayNum);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-1.5 h-13 rounded-xl transition-all active:scale-95 ${
                    isSelected
                      ? 'flex-[1.15] h-14 bg-primary text-on-primary shadow-[0_4px_14px_-2px_rgba(53,37,205,0.4)] scale-105 z-10'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-surface-container-high/40'
                  }`}
                  type="button"
                >
                  <span
                    className={`font-label-sm text-[9px] uppercase font-semibold ${
                      isSelected ? 'text-on-primary-container' : 'text-on-surface-variant'
                    }`}
                  >
                    {day.dayName}
                  </span>
                  <span
                    className={`font-headline-sm text-[15px] font-bold leading-tight ${
                      isSelected ? 'text-on-primary my-0.5' : 'text-on-surface'
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  {day.isToday ? (
                    <span
                      className={`font-label-sm font-bold flex items-center gap-0.5 text-[9px] ${
                        isSelected ? 'text-tertiary-fixed' : 'text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        bolt
                      </span>
                      100%
                    </span>
                  ) : (
                    <div
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        day.hasDot ? 'bg-primary' : 'bg-outline-variant'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Progress Summary Card (Compact) */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm p-3 transition-all border border-outline-variant/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[16px]">donut_large</span>
              </div>
              <div>
                <span className="font-headline-sm text-[14px] text-on-surface font-bold leading-tight block">
                  Friday Cadence Progress
                </span>
                <span className="text-[10px] text-on-surface-variant font-body-sm leading-none">
                  Synchronized Daily Performance
                </span>
              </div>
            </div>
          </div>

          {/* Progress Gauge & Metrics Grid */}
          <div className="flex items-center gap-3">
            {/* Circular Progress Gauge Compact */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 72 72">
                <circle
                  className="text-surface-container-high fill-none"
                  cx="36"
                  cy="36"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                />
                <circle
                  className="text-primary fill-none transition-all duration-500"
                  cx="36"
                  cy="36"
                  id="progressCircle"
                  r="28"
                  stroke="currentColor"
                  strokeDasharray="175.9"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="6"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-[13px] text-on-surface font-extrabold" id="progressPercentage">
                  {pacedPercent}%
                </span>
                <span className="text-[8px] text-on-surface-variant font-bold uppercase tracking-tight">
                  Paced
                </span>
              </div>
            </div>

            {/* 2x2 Metric Breakdown Compact */}
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-container-low">
                <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-label-sm text-[10px] text-on-surface font-bold" id="statCompleted">
                    {completedCount} Done
                  </span>
                  <span className="text-[9px] text-on-surface-variant font-body-sm truncate">Completed</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-container-low">
                <span className="material-symbols-outlined text-[14px] text-secondary shrink-0">pending_actions</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-label-sm text-[10px] text-on-surface font-bold" id="statPending">
                    {pendingCount} Pending
                  </span>
                  <span className="text-[9px] text-on-surface-variant font-body-sm truncate">Remaining</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-container-low">
                <span className="material-symbols-outlined text-[14px] text-primary shrink-0">stars</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-label-sm text-[10px] text-primary font-bold" id="statHp">
                    +{gainedHp} HP
                  </span>
                  <span className="text-[9px] text-on-surface-variant font-body-sm truncate">Gained</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-container-low">
                <span className="material-symbols-outlined text-[14px] text-tertiary shrink-0">warning</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-label-sm text-[10px] text-tertiary font-bold" id="statOverdue">
                    {overdueCount} Overdue
                  </span>
                  <span className="text-[9px] text-on-surface-variant font-body-sm truncate">Alert</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Morning Cadence Routine Overview Banner */}
        <div className="rounded-2xl p-2.5 bg-gradient-to-r from-primary-fixed/60 via-secondary-fixed/50 to-surface-container-lowest border border-primary/10 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[16px]">wb_sunny</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-[12px] text-on-surface font-bold">
                Morning Cadence Activated
              </span>
              <span className="text-[10px] text-on-surface-variant">
                Circadian alignment: 4 of 4 morning micro-habits logged
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-primary text-[10px] font-extrabold shadow-xs">
            Active
          </span>
        </div>

        {/* Modern Browser/Window Tabs Container */}
        <div className="w-full">
          <div className="flex items-stretch gap-1 p-0.5 rounded-xl bg-surface-container-high/60 backdrop-blur-md border border-outline-variant/30 shadow-inner">
            {/* Pending Tab */}
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setCurrentTab('pending');
              }}
              className={`browser-tab flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition-all active:scale-[0.98] text-[11px] ${
                currentTab === 'pending'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-xs border-t border-white/60'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
              }`}
              id="tabBtnPending"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">hourglass_top</span>
              <span className="font-label-md text-[11px]">Pending</span>
              <span
                className={`tab-badge px-1.5 py-0.2 rounded-full text-[9px] font-extrabold leading-tight ${
                  currentTab === 'pending'
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                id="badgePending"
              >
                {pendingCount}
              </span>
            </button>

            {/* Completed Tab */}
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setCurrentTab('completed');
              }}
              className={`browser-tab flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition-all active:scale-[0.98] text-[11px] ${
                currentTab === 'completed'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-xs border-t border-white/60'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
              }`}
              id="tabBtnCompleted"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">task_alt</span>
              <span className="font-label-md text-[11px]">Completed</span>
              <span
                className={`tab-badge px-1.5 py-0.2 rounded-full text-[9px] font-extrabold leading-tight ${
                  currentTab === 'completed'
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                id="badgeCompleted"
              >
                {completedCount}
              </span>
            </button>

            {/* Overdue Tab */}
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                setCurrentTab('overdue');
              }}
              className={`browser-tab flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition-all active:scale-[0.98] text-[11px] ${
                currentTab === 'overdue'
                  ? 'bg-surface-container-lowest text-tertiary font-bold shadow-xs border-t border-white/60'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
              }`}
              id="tabBtnOverdue"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-tertiary">error</span>
              <span className="font-label-md text-[11px]">Overdue</span>
              <span
                className={`tab-badge px-1.5 py-0.2 rounded-full text-[9px] font-extrabold leading-tight ${
                  currentTab === 'overdue'
                    ? 'bg-error-container text-error'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                id="badgeOverdue"
              >
                {overdueCount}
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Container for Active Tab Content */}
        <div className="w-full flex flex-col space-y-2" id="taskContentArea">
          {/* Subheader */}
          {currentTab === 'completed' && (
            <div className="flex items-center justify-between pt-0.5 mb-1">
              <span className="font-label-sm text-[11px] text-on-surface font-bold uppercase tracking-wider">
                COMPLETED TODAY ({filteredTasks.length})
              </span>
              <span className="font-label-sm text-[11px] text-primary font-bold">
                +{gainedHp} HP Total Claimed
              </span>
            </div>
          )}

          {currentTab === 'pending' && (
            <div className="flex items-center justify-between pt-0.5 mb-1">
              <span className="font-label-sm text-[11px] text-on-surface font-bold uppercase tracking-wider">
                Pending Execution ({filteredTasks.length})
              </span>
              <span className="text-[10px] text-on-surface-variant font-body-sm">
                Click task to view full details
              </span>
            </div>
          )}

          {currentTab === 'overdue' && (
            <div className="flex items-center justify-between pt-0.5 mb-1">
              <span className="font-label-sm text-[11px] text-tertiary font-bold uppercase tracking-wider">
                Attention Required ({filteredTasks.length})
              </span>
              <span className="text-[10px] text-on-surface-variant font-body-sm">
                Critical health &amp; mission sync
              </span>
            </div>
          )}

          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/50">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant mb-1">
                done_all
              </span>
              <span className="text-[13px] font-bold text-on-surface">No tasks in {currentTab}</span>
              <span className="text-[11px] text-on-surface-variant">
                Tap the '+' button to log new rituals and missions.
              </span>
            </div>
          )}

          {/* Task Items Render */}
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.status === 'overdue';
            const timeDisplay = formatDisplayTime(task.startTime);

            if (isCompleted) {
              return (
                <div
                  key={task.id}
                  onClick={() => openDetailModal(task)}
                  className="task-card relative overflow-hidden rounded-2xl bg-surface-container-low/80 hover:bg-surface-container py-2.5 px-3 transition-all cursor-pointer border border-outline-variant/20 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompletion(task.id);
                        }}
                        className="toggle-check-btn w-6 h-6 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0 transition-transform active:scale-90"
                        title="Toggle status"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded-md ${getCategoryColor(
                              task.category
                            )} text-[9px] font-bold`}
                          >
                            {task.category}
                          </span>
                          <span className="text-on-surface-variant text-[10px]">
                            {task.completedAt
                              ? 'Done at ' + task.completedAt.split('at ')[1]
                              : 'Completed'}
                          </span>
                        </div>
                        {/* Clean font, NO line-through as requested */}
                        <span className="text-[13px] text-on-surface-variant font-semibold leading-tight truncate">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-on-surface-variant/80 truncate">
                          {task.description}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-[10px] font-bold shrink-0">
                      +{task.hp} HP
                    </span>
                  </div>
                </div>
              );
            }

            if (isOverdue) {
              return (
                <div
                  key={task.id}
                  onClick={() => openDetailModal(task)}
                  className="task-card relative overflow-hidden rounded-2xl bg-error-container/30 border border-error/20 p-2.5 transition-all shadow-xs cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompletion(task.id);
                        }}
                        className="toggle-check-btn mt-0.5 w-6 h-6 rounded-lg bg-surface-container-lowest hover:bg-error/20 flex items-center justify-center text-error transition-all active:scale-90 shadow-xs shrink-0"
                        title="Mark Complete"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="px-1.5 py-0.2 rounded-md bg-error text-on-error text-[10px] font-bold">
                            Overdue
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-md ${getCategoryColor(
                              task.category
                            )} text-[10px] font-bold`}
                          >
                            {task.category}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-surface-container-lowest text-primary text-[10px] font-bold">
                            +{task.hp} HP
                          </span>
                        </div>
                        <span className="text-[13px] text-on-surface font-bold leading-snug">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-on-surface-variant line-clamp-2">
                          {task.description}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-label-md mt-0.5 pt-1 border-t border-error/20">
                    <div className="flex items-center gap-1 text-error font-semibold">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      <span>Yesterday • {timeDisplay || '5:00 PM'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailModal(task);
                        }}
                        className="quick-reschedule-btn px-2 py-0.5 rounded-full bg-surface-container-lowest text-on-surface text-[10px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all hover:bg-surface-container"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[12px] text-primary">
                          event_repeat
                        </span>{' '}
                        Reschedule
                      </button>
                      <button
                        onClick={(e) => handleQuickDelete(task.id, e)}
                        className="quick-delete-btn w-6 h-6 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant hover:text-error active:scale-95 transition-all"
                        title="Dismiss"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Pending Item
            return (
              <div
                key={task.id}
                onClick={() => openDetailModal(task)}
                className="task-card group relative overflow-hidden rounded-2xl bg-surface-container-lowest p-2.5 shadow-xs transition-all border border-outline-variant/20 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-start gap-2 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompletion(task.id);
                      }}
                      className="toggle-check-btn mt-0.5 w-6 h-6 rounded-lg bg-surface-container-low hover:bg-primary-fixed flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 shrink-0"
                      title="Mark Complete"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                    </button>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span
                          className={`px-1.5 py-0.2 rounded-md ${getCategoryColor(
                            task.category
                          )} text-[10px] font-bold`}
                        >
                          {task.category}
                        </span>
                        {task.priority === 'High' && (
                          <span className="px-1.5 py-0.2 rounded-md bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">priority_high</span>{' '}
                            High
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded-md bg-surface-container-high text-primary text-[10px] font-bold">
                          +{task.hp} HP
                        </span>
                      </div>
                      <span className="text-[13px] text-on-surface font-bold leading-snug">
                        {task.title}
                      </span>
                      <span className="text-[11px] text-on-surface-variant line-clamp-2">
                        {task.description}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-label-md mt-0.5 pt-1 border-t border-outline-variant/30">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                    <span>
                      {timeDisplay || '11:30 AM'} • {task.cadence || 'Daily'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleQuickSnooze(task.id, e)}
                      className="quick-snooze-btn px-2 py-0.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-[10px] font-bold flex items-center gap-0.5 active:scale-95 transition-all"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[12px]">snooze</span> +15m
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailModal(task);
                      }}
                      className="quick-reschedule-btn px-2 py-0.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-[10px] font-bold flex items-center gap-0.5 active:scale-95 transition-all"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[12px]">edit_calendar</span> Move
                    </button>
                    <button
                      onClick={(e) => handleQuickDelete(task.id, e)}
                      className="quick-delete-btn w-6 h-6 rounded-full bg-surface-container-low hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-tertiary active:scale-95 transition-all"
                      title="Skip"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Add Task Button (FAB) */}
      <button
        onClick={openAddTaskModal}
        aria-label="Quick Add Task"
        className="fixed right-5 bottom-24 z-40 w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_8px_20px_rgba(53,37,205,0.4)] hover:bg-primary-container active:scale-90 transition-all"
        id="fabAddTaskBtn"
        type="button"
      >
        <span className="material-symbols-outlined text-[24px]">add</span>
      </button>

      {/* Floating Bottom Dock Navigation */}
      <nav
        className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none pb-safe"
        data-active-classes="bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]"
      >
        <div className="pointer-events-auto flex items-center justify-between w-full max-w-[390px] h-16 px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_16px_40px_-6px_rgba(19,27,46,0.12),0_2px_12px_rgba(53,37,205,0.06)] border border-surface-container-high/60">
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab('home');
            }}
            aria-label="Home"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer"
            data-path="home"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">home</span>
          </button>

          <button
            aria-current="page"
            aria-label="Daily Tasks"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)] cursor-pointer"
            data-path="daily-tasks"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
          </button>

          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab('companion');
            }}
            aria-label="AI Companion Chat"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer"
            data-path="ai-companion-chat"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab('squad');
            }}
            aria-label="Squad Progression"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer"
            data-path="squad-progression"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">groups</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab('profile');
            }}
            aria-label="Evolution Profile"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer"
            data-path="evolution-profile"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">person</span>
          </button>
        </div>
      </nav>

      {/* CENTERED ADD TASK MODAL */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-sm transition-opacity duration-200 ${
          isAddModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        id="addTaskModal"
        onClick={closeAddTaskModal}
      >
        <div
          className={`w-full max-w-md bg-surface-container-lowest rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col space-y-3.5 max-h-[88vh] overflow-y-auto transform transition-transform duration-200 ${
            isAddModalOpen ? 'scale-100' : 'scale-95'
          }`}
          id="addTaskModalCard"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]">add_task</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-[16px] text-on-surface font-bold leading-tight">
                  Create Mission &amp; Ritual
                </h3>
                <p className="text-[11px] text-on-surface-variant font-body-sm">
                  Calibrated for neural flow &amp; progression
                </p>
              </div>
            </div>
            <button
              onClick={closeAddTaskModal}
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-90"
              id="closeAddTaskModalBtn"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Add Task Form */}
          <form className="space-y-3" id="addTaskForm" onSubmit={handleAddTaskSubmit}>
            {/* Title */}
            <div className="flex flex-col space-y-1">
              <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                Mission Title *
              </label>
              <input
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30 focus:border-primary focus:outline-none placeholder:text-outline"
                id="inputTitle"
                placeholder="e.g., Deep Work: Neural Systems Architecture"
                required
                type="text"
                autoFocus={isAddModalOpen}
              />
            </div>

            {/* Description Notes */}
            <div className="flex flex-col space-y-1">
              <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                Context, Sub-goals &amp; Notes
              </label>
              <textarea
                value={inputDescription}
                onChange={(e) => setInputDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-[12px] border border-outline-variant/30 focus:border-primary focus:outline-none placeholder:text-outline resize-none"
                id="inputDescription"
                placeholder="Outline focus milestones, tools, squad links, or metrics..."
                rows={2}
              />
            </div>

            {/* Domain / Category Select & Quick Pills */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                  Domain / Category
                </label>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getCategoryColor(
                    inputCategory
                  )}`}
                  id="activeCategoryBadge"
                >
                  {inputCategory}
                </span>
              </div>
              <select
                value={inputCategory}
                onChange={(e) => setInputCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-[12px] border border-outline-variant/30 focus:border-primary focus:outline-none"
                id="inputCategory"
              >
                <option value="Gym">Gym &amp; Physical Conditioning</option>
                <option value="Study">Study &amp; Academic Milestones</option>
                <option value="Health">Health &amp; Circadian Biohacking</option>
                <option value="Routine">Routine &amp; Diurnal Habits</option>
                <option value="Deep Work">Deep Work &amp; Engineering</option>
              </select>

              {/* Interactive Category Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5" id="categoryChipsContainer">
                {['Gym', 'Study', 'Health', 'Routine', 'Deep Work'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setInputCategory(cat);
                    }}
                    className={`modal-cat-chip px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                      inputCategory === cat
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                    type="button"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Time Window: 2x2 Grid */}
            <div className="flex flex-col space-y-1.5 bg-surface-container-low/80 p-2.5 rounded-2xl border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>{' '}
                  Schedule Window
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">Neural Slot</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col space-y-0.5">
                  <label className="text-[9px] text-on-surface-variant uppercase font-bold">Start Date</label>
                  <input
                    value={inputStartDate}
                    onChange={(e) => setInputStartDate(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface text-[11px] border border-outline-variant/40 focus:outline-none"
                    id="inputStartDate"
                    type="date"
                  />
                </div>
                <div className="flex flex-col space-y-0.5">
                  <label className="text-[9px] text-on-surface-variant uppercase font-bold">Start Time</label>
                  <input
                    value={inputStartTime}
                    onChange={(e) => setInputStartTime(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface text-[11px] border border-outline-variant/40 focus:outline-none"
                    id="inputStartTime"
                    type="time"
                  />
                </div>
                <div className="flex flex-col space-y-0.5">
                  <label className="text-[9px] text-on-surface-variant uppercase font-bold">End Date</label>
                  <input
                    value={inputEndDate}
                    onChange={(e) => setInputEndDate(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface text-[11px] border border-outline-variant/40 focus:outline-none"
                    id="inputEndDate"
                    type="date"
                  />
                </div>
                <div className="flex flex-col space-y-0.5">
                  <label className="text-[9px] text-on-surface-variant uppercase font-bold">End Time</label>
                  <input
                    value={inputEndTime}
                    onChange={(e) => setInputEndTime(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface text-[11px] border border-outline-variant/40 focus:outline-none"
                    id="inputEndTime"
                    type="time"
                  />
                </div>
              </div>
            </div>

            {/* Repeat Cadence Selection */}
            <div className="flex flex-col space-y-1">
              <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                Repeat Cadence
              </label>
              <select
                value={inputCadence}
                onChange={(e) => setInputCadence(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-[12px] border border-outline-variant/30 focus:border-primary focus:outline-none"
                id="inputCadence"
              >
                <option value="Single Event / No Repeat">Single Event (No Repeat)</option>
                <option value="Daily Cadence">Daily Cadence (Every Morning)</option>
                <option value="Weekly Repeat">Weekly Repeat (Cadence Sync)</option>
                <option value="Monthly Repeat">Monthly Repeat</option>
                <option value="Custom Diurnal Window">Custom Diurnal Window</option>
              </select>
            </div>

            {/* Reward & Priority */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col space-y-1">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Priority</label>
                <select
                  value={inputPriority}
                  onChange={(e) => setInputPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-low text-on-surface text-[12px] border border-outline-variant/30 focus:outline-none"
                  id="inputPriority"
                >
                  <option value="High">High (Urgent)</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                  Energy Yield
                </label>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-surface-container-low text-primary text-[11px] font-bold border border-outline-variant/30">
                  <span className="flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">bolt</span> +35 HP
                  </span>
                  <span className="text-[10px] text-on-surface-variant">Calibrated</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20">
              <button
                onClick={closeAddTaskModal}
                className="w-1/3 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-[12px] font-bold transition-all active:scale-95"
                id="cancelAddTaskBtn"
                type="button"
              >
                Cancel
              </button>
              <button
                className="w-2/3 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-[12px] font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                type="submit"
              >
                <span className="material-symbols-outlined text-[16px]">add_task</span>
                <span>Create Mission (+35 HP)</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* CENTERED TASK DETAIL POPUP MODAL */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-sm transition-opacity duration-200 ${
          isDetailModalOpen && selectedTask ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        id="detailModal"
        onClick={closeDetailModal}
      >
        {selectedTask && (
          <div
            className={`w-full max-w-md bg-surface-container-lowest rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col space-y-3.5 max-h-[88vh] overflow-y-auto transform transition-transform duration-200 ${
              isDetailModalOpen ? 'scale-100' : 'scale-95'
            }`}
            id="detailModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shadow-xs shrink-0"
                  id="detailCategoryIcon"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {getCategoryIcon(selectedTask.category)}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`px-2 py-0.2 rounded-md ${getCategoryColor(
                        selectedTask.category
                      )} text-[10px] font-bold`}
                      id="detailCategoryTag"
                    >
                      {selectedTask.category}
                    </span>
                    <span
                      className="px-2 py-0.2 rounded-md bg-surface-container-high text-primary text-[10px] font-bold"
                      id="detailHpBadge"
                    >
                      +{selectedTask.hp} HP
                    </span>
                    <span
                      className="px-2 py-0.2 rounded-md bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold"
                      id="detailPriorityBadge"
                    >
                      {selectedTask.priority}
                    </span>
                  </div>
                  <h3
                    className="font-headline-sm text-[16px] text-on-surface font-bold leading-tight truncate"
                    id="detailTitle"
                  >
                    {selectedTask.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeDetailModal}
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-90 shrink-0 ml-2"
                id="closeDetailModalBtn"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Detail Body Content */}
            <div className="space-y-3 text-[12px]">
              {/* Schedule and Cadence Card */}
              <div className="p-3 rounded-2xl bg-surface-container-low/80 border border-outline-variant/20 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-on-surface-variant font-bold uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-primary">event</span>{' '}
                    Schedule Window
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedTask.status === 'completed'
                        ? 'bg-primary-fixed text-primary'
                        : selectedTask.status === 'overdue'
                        ? 'bg-error-container text-error'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                    id="detailStatusBadge"
                  >
                    {selectedTask.status === 'completed'
                      ? 'Completed'
                      : selectedTask.status === 'overdue'
                      ? 'Overdue'
                      : 'Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/20">
                  <div>
                    <span className="text-[10px] text-on-surface-variant block">Start Time</span>
                    <span className="text-[12px] text-on-surface font-bold" id="detailStartTime">
                      Fri, May 24 • {formatDisplayTime(selectedTask.startTime) || '11:30 AM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant block">End Time</span>
                    <span className="text-[12px] text-on-surface font-bold" id="detailEndTime">
                      Fri, May 24 • {formatDisplayTime(selectedTask.endTime) || '12:30 PM'}
                    </span>
                  </div>
                </div>
                <div className="pt-1 border-t border-outline-variant/20 flex items-center justify-between">
                  <span className="text-[10px] text-on-surface-variant">Repeat Cadence:</span>
                  <span className="text-[11px] text-primary font-bold" id="detailCadence">
                    {selectedTask.cadence || 'Daily Cadence'}
                  </span>
                </div>
              </div>

              {/* Notes / Full Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                  Description &amp; Protocol Notes
                </span>
                <div
                  className="p-3 rounded-2xl bg-surface-container-low text-on-surface text-[12px] leading-relaxed border border-outline-variant/20 whitespace-pre-wrap"
                  id="detailDescription"
                >
                  {selectedTask.description || 'Warmup, deadlifts 4x6 @ RPE 8, and active recovery.'}
                </div>
              </div>

              {/* Timestamps metadata */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/20">
                <div>
                  <span className="block text-outline">Created:</span>
                  <span className="font-semibold text-on-surface" id="detailCreatedAt">
                    {selectedTask.createdAt || 'May 24, 2024 at 07:00 AM'}
                  </span>
                </div>
                <div>
                  <span className="block text-outline">Completed:</span>
                  <span className="font-semibold text-on-surface" id="detailCompletedAt">
                    {selectedTask.completedAt || 'Not yet completed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Detail Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20">
              <button
                onClick={() => toggleTaskCompletion(selectedTask.id)}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  selectedTask.status === 'completed'
                    ? 'bg-surface-container-high hover:bg-surface-container text-on-surface'
                    : 'bg-primary hover:bg-primary-container text-on-primary'
                }`}
                id="toggleTaskStatusBtn"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>
                  {selectedTask.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
                </span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  showToast('Reschedule calendar synced with Kairos Diurnal rhythm.');
                }}
                className="px-3 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-[12px] font-bold transition-all active:scale-95 flex items-center gap-1"
                id="rescheduleDetailBtn"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">edit_calendar</span> Move
              </button>
              <button
                onClick={closeDetailModal}
                className="px-3 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-[12px] font-bold transition-all active:scale-95"
                id="closeDetailBottomBtn"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-18 inset-x-4 z-50 flex justify-center pointer-events-none animate-fade-in">
          <div className="bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold max-w-sm">
            <span className="material-symbols-outlined text-[18px] text-primary-fixed">
              auto_awesome
            </span>
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
};
