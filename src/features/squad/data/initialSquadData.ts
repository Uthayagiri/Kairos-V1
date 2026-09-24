import { Squad, SquadMember, Challenge } from '../types/squad.types';

export const DEFAULT_SQUAD_ID = 'squad-productivity-champs';
export const DEFAULT_SQUAD_NAME = 'Productivity Champs';
export const CURRENT_USER_MEMBER_ID = 'user-alex';

export const formatDateToLocalISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDaysToLocalISO = (isoStr: string, days: number): string => {
  const parts = (isoStr || formatDateToLocalISO()).split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatDateToLocalISO(d);
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
  return formatDateToLocalISO(d);
};

export const formatDateRange = (startStr?: string, endStr?: string): string => {
  if (!startStr) return '';
  try {
    const partsS = startStr.split('-').map(Number);
    const s = new Date(partsS[0], partsS[1] - 1, partsS[2]);
    const sFmt = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!endStr) return sFmt;
    const partsE = endStr.split('-').map(Number);
    const e = new Date(partsE[0], partsE[1] - 1, partsE[2]);
    const eFmt = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${sFmt} - ${eFmt}`;
  } catch {
    return `${startStr} - ${endStr || ''}`;
  }
};

export const INITIAL_SQUAD_MEMBERS: SquadMember[] = [
  {
    id: 'user-jordan',
    name: 'Jordan',
    role: 'Deep Work Lead',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgLOuJNzuXdfMA_l_HciKsSVC0oQXPWyUR2PEhp5sfyDYy_MN7VjOgjlO9rNFa8gwP-VU3yiUh-pLQJ2TEIrstc_8RnsFKYlSzMKP8OYTtxSqPI0pj24k4sYxnqYhRsK-K8ROdr0b--_dorazU9amHEYofZqgsXW7UyL6BRwSrW38ceF_G2TDNgVZer2UfPXy5hnH_QBSdPpomakBqpjHOZRUgx9uGXMKwQ5WKwNcuJAGGYLO-TzRAA',
    xp: 3120,
    tasksCount: 48,
    isOnline: true,
    statusText: 'Active in Deep Work'
  },
  {
    id: 'user-maya',
    name: 'Maya',
    role: 'Circadian Strategist',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAs_vwMusojb-eY35Vyr6oQnfSJv38GfQM_rtZfY-2h6RByM_EznAJcfce51innk4TiJ4swgJhxKpeW7xeJuQ7GMip_0io1YeejgTWGhXuM95mx8YPuy_1muGBCXmcXhW8atFdL8evIYhxzfskuqNedddJd22HY9D9UdT9yXATpt1q2rIBIP866wfYw7yACHP4GNLSbvb45VqFGl3UkmawBmhGyuJ8r0DzN26xONS9QPXllzWVkJTyTZA',
    xp: 2890,
    tasksCount: 41,
    isOnline: true,
    statusText: 'Online now'
  },
  {
    id: 'user-liam',
    name: 'Liam',
    role: 'Rhythm Keeper',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCQTalMmdsR6Bj-zot2fAbA780RQzgpP4Lk8G3L2_XTyB7qYAUhnymErXjOL123wuzGc1-svM0L-mOdy4Ar_nZ4h52f8_4drCZToBiISdQDW6NLwdhKaHx1VWP49AAJJGoucRBYBUyZlYZ4MdRz5NfKhyji-BJ3HBlvKsxHMU0hv_TC7U5V9VW4src7a_OWr5voSel6q5vz-Uu8Le14lMrbFcAITszTXXrkZoyP2tZXP7djKHt5GWCHhg',
    xp: 2610,
    tasksCount: 36,
    isOnline: false,
    statusText: 'Offline - resting'
  },
  {
    id: CURRENT_USER_MEMBER_ID,
    name: 'Alex (You)',
    isCurrentUser: true,
    role: 'Squad Vanguard',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw',
    xp: 2450,
    tasksCount: 34,
    tag: 'Sprint Mode',
    statusText: '34 tasks achieved this week'
  },
  {
    id: 'user-elena',
    name: 'Elena Rostova',
    role: 'Mindful Architect',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA-dUMB91GpxNASDHpLyQmX3in6r0r2w30vCH0taa-VKiv5y3TOr8Rft4gnLjE1sTAQE6y_49BImOG00eRJaX9yPvli10c0IM4b_1SlLQDXqONklKjmZVI2Gs6VmD2M-MDWezcI0eBNv1qHMTJF7LDs5BqrDOinXek-RRtRCoqzsxyp5Nf3223A1clDjV5vdCfoyZvvOJEtOW3lmWSRvOuuYCgPL0RhHUcTaxwNkFe1AomYrjBC6ud5cQ',
    xp: 2180,
    tasksCount: 29,
    statusText: 'Offline • Focused session 2h ago'
  },
  {
    id: 'user-david',
    name: 'David K.',
    role: 'Neural Catalyst',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCGlJ3SWiykNUSn7aV3Mm94ruAL5tDY-jvLfi-DaWOqamfaFEaq-0R8WUcLxqhxdywseLBhr1IapeQn4Q4Sn9sNdN7EsVKwfDzyWIhVzwlFugvsf2yQdfCq-wQ0ap45QhhB4H8L8Qn3E9M4Zzw5a5ps-6u5b0LnRDskyVbC8kHUIrppQrYmKkx12hQ2cKVVpjnW4aS5B9zM-g34q9h9Ut6cdi2BjUIUn2uuLLRP3Ja7t0si5Ayvil0NyQ',
    xp: 1940,
    tasksCount: 24,
    isOnline: true,
    statusText: 'Online • Evening reading'
  }
];

export const getInitialSquadChallenges = (): Challenge[] => {
  const today = formatDateToLocalISO();
  return [
    {
      id: 'chal-1',
      squadId: DEFAULT_SQUAD_ID,
      title: '7-Day Deep Work Sprint',
      subtitle: 'Focus 2 hrs daily uninterrupted',
      category: 'Deep Work',
      criteria: {
        type: 'task_category',
        category: 'Deep Work'
      },
      durationTag: 'Daily',
      hpReward: 150,
      currentDays: 5,
      totalDays: 7,
      startDate: today,
      endDate: addDaysToLocalISO(today, 7),
      startTime: '09:00',
      endTime: '11:00',
      dateRangeText: formatDateRange(today, addDaysToLocalISO(today, 7)),
      timeWindowText: '09:00 AM - 11:00 AM',
      gradientClass: 'from-[#fff2f3] via-[#ffffff] to-[#f4efff]',
      borderColor: 'border-rose-200/80',
      accentColor: 'rose',
      icon: 'psychology',
      joinedUsers: [
        { name: 'Jordan', avatar: INITIAL_SQUAD_MEMBERS[0].avatar },
        { name: 'Maya', avatar: INITIAL_SQUAD_MEMBERS[1].avatar },
        { name: 'Liam', avatar: INITIAL_SQUAD_MEMBERS[2].avatar },
        { name: 'Alex', avatar: INITIAL_SQUAD_MEMBERS[3].avatar }
      ],
      roster: [
        {
          name: 'Jordan',
          avatar: INITIAL_SQUAD_MEMBERS[0].avatar,
          percentage: 100,
          completed: true,
          detail: '100% completed',
          ringColor: 'text-emerald-500',
          textColor: 'text-emerald-700'
        },
        {
          name: 'Alex (You)',
          isCurrentUser: true,
          avatar: INITIAL_SQUAD_MEMBERS[3].avatar,
          percentage: 71,
          detail: '5 / 7 days done',
          ringColor: 'text-primary',
          textColor: 'text-primary'
        },
        {
          name: 'Maya',
          avatar: INITIAL_SQUAD_MEMBERS[1].avatar,
          percentage: 57,
          detail: '4 / 7 days done',
          ringColor: 'text-secondary',
          textColor: 'text-secondary'
        },
        {
          name: 'Elena Rostova',
          avatar: INITIAL_SQUAD_MEMBERS[4].avatar,
          percentage: 42,
          detail: '3 / 7 days done',
          ringColor: 'text-amber-500',
          textColor: 'text-amber-600'
        }
      ]
    },
    {
      id: 'chal-2',
      squadId: DEFAULT_SQUAD_ID,
      title: 'Hydration Heroes',
      subtitle: '2.5L clean water daily for 14 days',
      category: 'Circadian Health',
      criteria: {
        type: 'task_category',
        category: 'Circadian Health'
      },
      durationTag: '14 Days',
      hpReward: 80,
      currentDays: 9,
      totalDays: 14,
      startDate: today,
      endDate: addDaysToLocalISO(today, 14),
      startTime: '08:00',
      endTime: '20:00',
      dateRangeText: formatDateRange(today, addDaysToLocalISO(today, 14)),
      timeWindowText: '08:00 AM - 08:00 PM',
      gradientClass: 'from-[#f0fdf4] via-[#ffffff] to-[#ecfeff]',
      borderColor: 'border-emerald-200/80',
      accentColor: 'emerald',
      icon: 'water_drop',
      joinedUsers: [
        { name: 'Elena', avatar: INITIAL_SQUAD_MEMBERS[4].avatar },
        { name: 'David', avatar: INITIAL_SQUAD_MEMBERS[5].avatar },
        { name: 'Alex', avatar: INITIAL_SQUAD_MEMBERS[3].avatar }
      ],
      roster: [
        {
          name: 'Alex (You)',
          isCurrentUser: true,
          avatar: INITIAL_SQUAD_MEMBERS[3].avatar,
          percentage: 85,
          detail: '12 / 14 days done',
          ringColor: 'text-emerald-500',
          textColor: 'text-emerald-700'
        },
        {
          name: 'Elena',
          avatar: INITIAL_SQUAD_MEMBERS[4].avatar,
          percentage: 64,
          detail: '9 / 14 days done',
          ringColor: 'text-teal-500',
          textColor: 'text-teal-700'
        },
        {
          name: 'David',
          avatar: INITIAL_SQUAD_MEMBERS[5].avatar,
          percentage: 50,
          detail: '7 / 14 days done',
          ringColor: 'text-amber-500',
          textColor: 'text-amber-600'
        }
      ]
    },
    {
      id: 'chal-3',
      squadId: DEFAULT_SQUAD_ID,
      title: 'Circadian Sunrise Walk',
      subtitle: '20 mins sunlight before 8:30 AM',
      category: 'Mindfulness',
      criteria: {
        type: 'task_category',
        category: 'Mindfulness'
      },
      durationTag: '10 Days',
      hpReward: 120,
      currentDays: 8,
      totalDays: 10,
      startDate: today,
      endDate: addDaysToLocalISO(today, 10),
      startTime: '06:30',
      endTime: '08:30',
      dateRangeText: formatDateRange(today, addDaysToLocalISO(today, 10)),
      timeWindowText: '06:30 AM - 08:30 AM',
      gradientClass: 'from-[#eef2ff] via-[#ffffff] to-[#e0f2fe]',
      borderColor: 'border-indigo-200/80',
      accentColor: 'indigo',
      icon: 'wb_sunny',
      joinedUsers: [
        { name: 'Jordan', avatar: INITIAL_SQUAD_MEMBERS[0].avatar },
        { name: 'Maya', avatar: INITIAL_SQUAD_MEMBERS[1].avatar },
        { name: 'Liam', avatar: INITIAL_SQUAD_MEMBERS[2].avatar },
        { name: 'Alex', avatar: INITIAL_SQUAD_MEMBERS[3].avatar },
        { name: 'Elena', avatar: INITIAL_SQUAD_MEMBERS[4].avatar }
      ],
      roster: [
        {
          name: 'Jordan',
          avatar: INITIAL_SQUAD_MEMBERS[0].avatar,
          percentage: 90,
          detail: '9 / 10 days done',
          ringColor: 'text-indigo-600',
          textColor: 'text-indigo-700'
        },
        {
          name: 'Alex (You)',
          isCurrentUser: true,
          avatar: INITIAL_SQUAD_MEMBERS[3].avatar,
          percentage: 80,
          detail: '8 / 10 days done',
          ringColor: 'text-primary',
          textColor: 'text-primary'
        },
        {
          name: 'Liam',
          avatar: INITIAL_SQUAD_MEMBERS[2].avatar,
          percentage: 70,
          detail: '7 / 10 days done',
          ringColor: 'text-blue-500',
          textColor: 'text-blue-700'
        }
      ]
    }
  ];
};

export const INITIAL_SQUAD: Squad = {
  id: DEFAULT_SQUAD_ID,
  name: DEFAULT_SQUAD_NAME,
  createdAt: '2026-09-01T00:00:00.000Z',
  ownerId: CURRENT_USER_MEMBER_ID,
  league: 'Squad League • Division 1',
  members: INITIAL_SQUAD_MEMBERS,
  challengeIds: ['chal-1', 'chal-2', 'chal-3']
};

export const PRESET_CHALLENGES = [
  {
    title: 'Zero Distraction Sprint',
    subtitle: '3 Pomodoros daily with notifications muted',
    category: 'Deep Work',
    criteria: {
      type: 'task_category' as const,
      category: 'Deep Work'
    },
    duration: 7,
    hpReward: 150,
    accentColor: 'rose' as const,
    icon: 'psychology',
    startTime: '09:00',
    endTime: '11:30',
    isAllDay: false
  },
  {
    title: 'Hydro Flow 3L',
    subtitle: 'Drink 3L of clean water before 8 PM',
    category: 'Circadian Health',
    criteria: {
      type: 'task_category' as const,
      category: 'Circadian Health'
    },
    duration: 14,
    hpReward: 100,
    accentColor: 'emerald' as const,
    icon: 'water_drop',
    startTime: '08:00',
    endTime: '20:00',
    isAllDay: true
  },
  {
    title: 'Sunset Digital Curfew',
    subtitle: 'No screens 45 mins before sleep',
    category: 'Mindfulness',
    criteria: {
      type: 'task_category' as const,
      category: 'Mindfulness'
    },
    duration: 10,
    hpReward: 120,
    accentColor: 'indigo' as const,
    icon: 'bedtime',
    startTime: '21:30',
    endTime: '22:30',
    isAllDay: false
  },
  {
    title: 'Morning 10k Steps',
    subtitle: 'Hit 10,000 steps before 2 PM',
    category: 'Fitness',
    criteria: {
      type: 'task_category' as const,
      category: 'Fitness'
    },
    duration: 21,
    hpReward: 200,
    accentColor: 'amber' as const,
    icon: 'directions_run',
    startTime: '06:30',
    endTime: '14:00',
    isAllDay: false
  }
];
