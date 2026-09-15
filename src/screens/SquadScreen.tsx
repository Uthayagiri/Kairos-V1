import React, { useState, useRef, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface SquadScreenProps {
  userProfile?: { email: string; name: string } | null;
  onNavigateTab?: (tab: string) => void;
}

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  isCurrentUser?: boolean;
  avatar: string;
  xp: number;
  tasksCount: number;
  statusText?: string;
  isOnline?: boolean;
  tag?: string;
}

interface Challenge {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  cadenceTag: string;
  hpReward: number;
  currentDays: number;
  totalDays: number;
  gradientClass: string;
  borderColor: string;
  accentColor: string;
  icon: string;
  joinedUsers: { name: string; avatar: string }[];
  roster: {
    name: string;
    avatar: string;
    isCurrentUser?: boolean;
    percentage: number;
    detail: string;
    ringColor: string;
    textColor: string;
    completed?: boolean;
  }[];
}

const LEADERBOARD_DATA: LeaderboardUser[] = [
  {
    id: 'user-jordan',
    rank: 1,
    name: 'Jordan',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgLOuJNzuXdfMA_l_HciKsSVC0oQXPWyUR2PEhp5sfyDYy_MN7VjOgjlO9rNFa8gwP-VU3yiUh-pLQJ2TEIrstc_8RnsFKYlSzMKP8OYTtxSqPI0pj24k4sYxnqYhRsK-K8ROdr0b--_dorazU9amHEYofZqgsXW7UyL6BRwSrW38ceF_G2TDNgVZer2UfPXy5hnH_QBSdPpomakBqpjHOZRUgx9uGXMKwQ5WKwNcuJAGGYLO-TzRAA',
    xp: 3120,
    tasksCount: 48,
    isOnline: true,
    statusText: 'Active in Deep Work'
  },
  {
    id: 'user-maya',
    rank: 2,
    name: 'Maya',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAs_vwMusojb-eY35Vyr6oQnfSJv38GfQM_rtZfY-2h6RByM_EznAJcfce51innk4TiJ4swgJhxKpeW7xeJuQ7GMip_0io1YeejgTWGhXuM95mx8YPuy_1muGBCXmcXhW8atFdL8evIYhxzfskuqNedddJd22HY9D9UdT9yXATpt1q2rIBIP866wfYw7yACHP4GNLSbvb45VqFGl3UkmawBmhGyuJ8r0DzN26xONS9QPXllzWVkJTyTZA',
    xp: 2890,
    tasksCount: 41,
    isOnline: true,
    statusText: 'Online now'
  },
  {
    id: 'user-liam',
    rank: 3,
    name: 'Liam',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCQTalMmdsR6Bj-zot2fAbA780RQzgpP4Lk8G3L2_XTyB7qYAUhnymErXjOL123wuzGc1-svM0L-mOdy4Ar_nZ4h52f8_4drCZToBiISdQDW6NLwdhKaHx1VWP49AAJJGoucRBYBUyZlYZ4MdRz5NfKhyji-BJ3HBlvKsxHMU0hv_TC7U5V9VW4src7a_OWr5voSel6q5vz-Uu8Le14lMrbFcAITszTXXrkZoyP2tZXP7djKHt5GWCHhg',
    xp: 2610,
    tasksCount: 36,
    isOnline: false,
    statusText: 'Offline - resting'
  },
  {
    id: 'user-alex',
    rank: 4,
    name: 'Alex (You)',
    isCurrentUser: true,
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw',
    xp: 2450,
    tasksCount: 34,
    tag: 'Sprint Mode',
    statusText: '34 rituals achieved this week'
  },
  {
    id: 'user-elena',
    rank: 5,
    name: 'Elena Rostova',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA-dUMB91GpxNASDHpLyQmX3in6r0r2w30vCH0taa-VKiv5y3TOr8Rft4gnLjE1sTAQE6y_49BImOG00eRJaX9yPvli10c0IM4b_1SlLQDXqONklKjmZVI2Gs6VmD2M-MDWezcI0eBNv1qHMTJF7LDs5BqrDOinXek-RRtRCoqzsxyp5Nf3223A1clDjV5vdCfoyZvvOJEtOW3lmWSRvOuuYCgPL0RhHUcTaxwNkFe1AomYrjBC6ud5cQ',
    xp: 2180,
    tasksCount: 29,
    statusText: 'Offline • Focused session 2h ago'
  },
  {
    id: 'user-david',
    rank: 6,
    name: 'David K.',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCGlJ3SWiykNUSn7aV3Mm94ruAL5tDY-jvLfi-DaWOqamfaFEaq-0R8WUcLxqhxdywseLBhr1IapeQn4Q4Sn9sNdN7EsVKwfDzyWIhVzwlFugvsf2yQdfCq-wQ0ap45QhhB4H8L8Qn3E9M4Zzw5a5ps-6u5b0LnRDskyVbC8kHUIrppQrYmKkx12hQ2cKVVpjnW4aS5B9zM-g34q9h9Ut6cdi2BjUIUn2uuLLRP3Ja7t0si5Ayvil0NyQ',
    xp: 1940,
    tasksCount: 24,
    isOnline: true,
    statusText: 'Online • Evening reading'
  }
];

const CHALLENGES_DATA: Challenge[] = [
  {
    id: 'chal-1',
    title: '7-Day Deep Work Sprint',
    subtitle: 'Focus 2 hrs daily uninterrupted',
    category: 'Deep Work',
    cadenceTag: 'Daily',
    hpReward: 150,
    currentDays: 5,
    totalDays: 7,
    gradientClass: 'from-[#fff2f3] via-[#ffffff] to-[#f4efff]',
    borderColor: 'border-rose-200/80',
    accentColor: 'rose',
    icon: 'psychology',
    joinedUsers: [
      {
        name: 'Jordan',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgLOuJNzuXdfMA_l_HciKsSVC0oQXPWyUR2PEhp5sfyDYy_MN7VjOgjlO9rNFa8gwP-VU3yiUh-pLQJ2TEIrstc_8RnsFKYlSzMKP8OYTtxSqPI0pj24k4sYxnqYhRsK-K8ROdr0b--_dorazU9amHEYofZqgsXW7UyL6BRwSrW38ceF_G2TDNgVZer2UfPXy5hnH_QBSdPpomakBqpjHOZRUgx9uGXMKwQ5WKwNcuJAGGYLO-TzRAA'
      },
      {
        name: 'Maya',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAs_vwMusojb-eY35Vyr6oQnfSJv38GfQM_rtZfY-2h6RByM_EznAJcfce51innk4TiJ4swgJhxKpeW7xeJuQ7GMip_0io1YeejgTWGhXuM95mx8YPuy_1muGBCXmcXhW8atFdL8evIYhxzfskuqNedddJd22HY9D9UdT9yXATpt1q2rIBIP866wfYw7yACHP4GNLSbvb45VqFGl3UkmawBmhGyuJ8r0DzN26xONS9QPXllzWVkJTyTZA'
      },
      {
        name: 'Liam',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCQTalMmdsR6Bj-zot2fAbA780RQzgpP4Lk8G3L2_XTyB7qYAUhnymErXjOL123wuzGc1-svM0L-mOdy4Ar_nZ4h52f8_4drCZToBiISdQDW6NLwdhKaHx1VWP49AAJJGoucRBYBUyZlYZ4MdRz5NfKhyji-BJ3HBlvKsxHMU0hv_TC7U5V9VW4src7a_OWr5voSel6q5vz-Uu8Le14lMrbFcAITszTXXrkZoyP2tZXP7djKHt5GWCHhg'
      },
      {
        name: 'Alex',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw'
      }
    ],
    roster: [
      {
        name: 'Jordan',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgLOuJNzuXdfMA_l_HciKsSVC0oQXPWyUR2PEhp5sfyDYy_MN7VjOgjlO9rNFa8gwP-VU3yiUh-pLQJ2TEIrstc_8RnsFKYlSzMKP8OYTtxSqPI0pj24k4sYxnqYhRsK-K8ROdr0b--_dorazU9amHEYofZqgsXW7UyL6BRwSrW38ceF_G2TDNgVZer2UfPXy5hnH_QBSdPpomakBqpjHOZRUgx9uGXMKwQ5WKwNcuJAGGYLO-TzRAA',
        percentage: 100,
        completed: true,
        detail: '100% completed',
        ringColor: 'text-emerald-500',
        textColor: 'text-emerald-700'
      },
      {
        name: 'Alex (You)',
        isCurrentUser: true,
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw',
        percentage: 71,
        detail: '5 / 7 days done',
        ringColor: 'text-primary',
        textColor: 'text-primary'
      },
      {
        name: 'Maya',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAs_vwMusojb-eY35Vyr6oQnfSJv38GfQM_rtZfY-2h6RByM_EznAJcfce51innk4TiJ4swgJhxKpeW7xeJuQ7GMip_0io1YeejgTWGhXuM95mx8YPuy_1muGBCXmcXhW8atFdL8evIYhxzfskuqNedddJd22HY9D9UdT9yXATpt1q2rIBIP866wfYw7yACHP4GNLSbvb45VqFGl3UkmawBmhGyuJ8r0DzN26xONS9QPXllzWVkJTyTZA',
        percentage: 57,
        detail: '4 / 7 days done',
        ringColor: 'text-secondary',
        textColor: 'text-secondary'
      },
      {
        name: 'Elena Rostova',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuA-dUMB91GpxNASDHpLyQmX3in6r0r2w30vCH0taa-VKiv5y3TOr8Rft4gnLjE1sTAQE6y_49BImOG00eRJaX9yPvli10c0IM4b_1SlLQDXqONklKjmZVI2Gs6VmD2M-MDWezcI0eBNv1qHMTJF7LDs5BqrDOinXek-RRtRCoqzsxyp5Nf3223A1clDjV5vdCfoyZvvOJEtOW3lmWSRvOuuYCgPL0RhHUcTaxwNkFe1AomYrjBC6ud5cQ',
        percentage: 42,
        detail: '3 / 7 days done',
        ringColor: 'text-amber-500',
        textColor: 'text-amber-600'
      }
    ]
  },
  {
    id: 'chal-2',
    title: 'Hydration Heroes',
    subtitle: '2.5L clean water daily for 14 days',
    category: 'Circadian Health',
    cadenceTag: '14 Days',
    hpReward: 80,
    currentDays: 9,
    totalDays: 14,
    gradientClass: 'from-[#f0fdf4] via-[#ffffff] to-[#ecfeff]',
    borderColor: 'border-emerald-200/80',
    accentColor: 'emerald',
    icon: 'water_drop',
    joinedUsers: [
      {
        name: 'Elena',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuA-dUMB91GpxNASDHpLyQmX3in6r0r2w30vCH0taa-VKiv5y3TOr8Rft4gnLjE1sTAQE6y_49BImOG00eRJaX9yPvli10c0IM4b_1SlLQDXqONklKjmZVI2Gs6VmD2M-MDWezcI0eBNv1qHMTJF7LDs5BqrDOinXek-RRtRCoqzsxyp5Nf3223A1clDjV5vdCfoyZvvOJEtOW3lmWSRvOuuYCgPL0RhHUcTaxwNkFe1AomYrjBC6ud5cQ'
      },
      {
        name: 'David',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCGlJ3SWiykNUSn7aV3Mm94ruAL5tDY-jvLfi-DaWOqamfaFEaq-0R8WUcLxqhxdywseLBhr1IapeQn4Q4Sn9sNdN7EsVKwfDzyWIhVzwlFugvsf2yQdfCq-wQ0ap45QhhB4H8L8Qn3E9M4Zzw5a5ps-6u5b0LnRDskyVbC8kHUIrppQrYmKkx12hQ2cKVVpjnW4aS5B9zM-g34q9h9Ut6cdi2BjUIUn2uuLLRP3Ja7t0si5Ayvil0NyQ'
      },
      {
        name: 'Alex',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw'
      }
    ],
    roster: [
      {
        name: 'Alex (You)',
        isCurrentUser: true,
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw',
        percentage: 85,
        detail: '12 / 14 days done',
        ringColor: 'text-emerald-500',
        textColor: 'text-emerald-700'
      },
      {
        name: 'Elena',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuA-dUMB91GpxNASDHpLyQmX3in6r0r2w30vCH0taa-VKiv5y3TOr8Rft4gnLjE1sTAQE6y_49BImOG00eRJaX9yPvli10c0IM4b_1SlLQDXqONklKjmZVI2Gs6VmD2M-MDWezcI0eBNv1qHMTJF7LDs5BqrDOinXek-RRtRCoqzsxyp5Nf3223A1clDjV5vdCfoyZvvOJEtOW3lmWSRvOuuYCgPL0RhHUcTaxwNkFe1AomYrjBC6ud5cQ',
        percentage: 64,
        detail: '9 / 14 days done',
        ringColor: 'text-teal-500',
        textColor: 'text-teal-700'
      },
      {
        name: 'David',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCGlJ3SWiykNUSn7aV3Mm94ruAL5tDY-jvLfi-DaWOqamfaFEaq-0R8WUcLxqhxdywseLBhr1IapeQn4Q4Sn9sNdN7EsVKwfDzyWIhVzwlFugvsf2yQdfCq-wQ0ap45QhhB4H8L8Qn3E9M4Zzw5a5ps-6u5b0LnRDskyVbC8kHUIrppQrYmKkx12hQ2cKVVpjnW4aS5B9zM-g34q9h9Ut6cdi2BjUIUn2uuLLRP3Ja7t0si5Ayvil0NyQ',
        percentage: 50,
        detail: '7 / 14 days done',
        ringColor: 'text-amber-500',
        textColor: 'text-amber-600'
      }
    ]
  },
  {
    id: 'chal-3',
    title: 'Circadian Sunrise Walk',
    subtitle: '20 mins sunlight before 8:30 AM',
    category: 'Mindfulness',
    cadenceTag: '10 Days',
    hpReward: 120,
    currentDays: 8,
    totalDays: 10,
    gradientClass: 'from-[#eef2ff] via-[#ffffff] to-[#e0f2fe]',
    borderColor: 'border-indigo-200/80',
    accentColor: 'indigo',
    icon: 'wb_sunny',
    joinedUsers: [
      {
        name: 'Jordan',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgLOuJNzuXdfMA_l_HciKsSVC0oQXPWyUR2PEhp5sfyDYy_MN7VjOgjlO9rNFa8gwP-VU3yiUh-pLQJ2TEIrstc_8RnsFKYlSzMKP8OYTtxSqPI0pj24k4sYxnqYhRsK-K8ROdr0b--_dorazU9amHEYofZqgsXW7UyL6BRwSrW38ceF_G2TDNgVZer2UfPXy5hnH_QBSdPpomakBqpjHOZRUgx9uGXMKwQ5WKwNcuJAGGYLO-TzRAA'
      },
      {
        name: 'Maya',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAs_vwMusojb-eY35Vyr6oQnfSJv38GfQM_rtZfY-2h6RByM_EznAJcfce51innk4TiJ4swgJhxKpeW7xeJuQ7GMip_0io1YeejgTWGhXuM95mx8YPuy_1muGBCXmcXhW8atFdL8evIYhxzfskuqNedddJd22HY9D9UdT9yXATpt1q2rIBIP866wfYw7yACHP4GNLSbvb45VqFGl3UkmawBmhGyuJ8r0DzN26xONS9QPXllzWVkJTyTZA'
      },
      {
        name: 'Liam',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCQTalMmdsR6Bj-zot2fAbA780RQzgpP4Lk8G3L2_XTyB7qYAUhnymErXjOL123wuzGc1-svM0L-mOdy4Ar_nZ4h52f8_4drCZToBiISdQDW6NLwdhKaHx1VWP49AAJJGoucRBYBUyZlYZ4MdRz5NfKhyji-BJ3HBlvKsxHMU0hv_TC7U5V9VW4src7a_OWr5voSel6q5vz-Uu8Le14lMrbFcAITszTXXrkZoyP2tZXP7djKHt5GWCHhg'
      },
      {
        name: 'Alex',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw'
      },
      {
        name: 'Elena',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuA-dUMB91GpxNASDHpLyQmX3in6r0r2w30vCH0taa-VKiv5y3TOr8Rft4gnLjE1sTAQE6y_49BImOG00eRJaX9yPvli10c0IM4b_1SlLQDXqONklKjmZVI2Gs6VmD2M-MDWezcI0eBNv1qHMTJF7LDs5BqrDOinXek-RRtRCoqzsxyp5Nf3223A1clDjV5vdCfoyZvvOJEtOW3lmWSRvOuuYCgPL0RhHUcTaxwNkFe1AomYrjBC6ud5cQ'
      }
    ],
    roster: [
      {
        name: 'Jordan',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAwgLOuJNzuXdfMA_l_HciKsSVC0oQXPWyUR2PEhp5sfyDYy_MN7VjOgjlO9rNFa8gwP-VU3yiUh-pLQJ2TEIrstc_8RnsFKYlSzMKP8OYTtxSqPI0pj24k4sYxnqYhRsK-K8ROdr0b--_dorazU9amHEYofZqgsXW7UyL6BRwSrW38ceF_G2TDNgVZer2UfPXy5hnH_QBSdPpomakBqpjHOZRUgx9uGXMKwQ5WKwNcuJAGGYLO-TzRAA',
        percentage: 90,
        detail: '9 / 10 days done',
        ringColor: 'text-indigo-600',
        textColor: 'text-indigo-700'
      },
      {
        name: 'Alex (You)',
        isCurrentUser: true,
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuApyzwKOIPyLa7oDHcQJE3EuKbjR1GAcBM067yYwql352SWV6rEONTW-rXwQA7LF21Oy_2aW49EPGk5qkufisfpv4RKja21xmC4JkEDfZHn416oYqbj0jn7trFhQZUgnWmMRrGibDl-xoTEZBDxs5XENzIG5-Qz9GqnLV1gk_il0keyzXJn7kqxpNqV_ihDVkcsoyaCUW80cJj28dyFp1AvcRW0OIM8AscQiN-8SzIAUxL0xigvSm5OEw',
        percentage: 80,
        detail: '8 / 10 days done',
        ringColor: 'text-primary',
        textColor: 'text-primary'
      },
      {
        name: 'Liam',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCQTalMmdsR6Bj-zot2fAbA780RQzgpP4Lk8G3L2_XTyB7qYAUhnymErXjOL123wuzGc1-svM0L-mOdy4Ar_nZ4h52f8_4drCZToBiISdQDW6NLwdhKaHx1VWP49AAJJGoucRBYBUyZlYZ4MdRz5NfKhyji-BJ3HBlvKsxHMU0hv_TC7U5V9VW4src7a_OWr5voSel6q5vz-Uu8Le14lMrbFcAITszTXXrkZoyP2tZXP7djKHt5GWCHhg',
        percentage: 70,
        detail: '7 / 10 days done',
        ringColor: 'text-blue-500',
        textColor: 'text-blue-700'
      }
    ]
  }
];

export const SquadScreen: React.FC<SquadScreenProps> = ({ userProfile, onNavigateTab }) => {
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Modals & Toasts
  const [selectedChallengeIndex, setSelectedChallengeIndex] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [limitToastOpen, setLimitToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Touch handlers for swipe
  const touchStartXRef = useRef<number>(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style }).catch(() => {});
    } catch {
      // Ignore in web
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const showLimitToast = () => {
    triggerHaptic(ImpactStyle.Heavy);
    setLimitToastOpen(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setLimitToastOpen(false);
    }, 4500);
  };

  const hideLimitToast = () => {
    setLimitToastOpen(false);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };

  // Swiping next logic
  const swipeNext = () => {
    triggerHaptic(ImpactStyle.Medium);
    setIsSwiping(true);
    setTimeout(() => {
      setCurrentTopIndex((prev) => (prev + 1) % CHALLENGES_DATA.length);
      setIsSwiping(false);
      setSwipeOffset(0);
    }, 250);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartXRef.current;
    if (Math.abs(diff) < 120) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - endX;
    if (Math.abs(diff) > 45) {
      swipeNext();
    } else {
      setSwipeOffset(0);
    }
  };

  // Celebrate Confetti Burst
  const triggerConfetti = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic(ImpactStyle.Heavy);
    showToast('🎉 Squad Celebration Sent! +25 Team Spirit');

    const rect = e.currentTarget.getBoundingClientRect();
    const colors = ['#4f46e5', '#8792fe', '#bf0f3c', '#ffb2b7', '#3525cd', '#10b981', '#f59e0b'];

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.position = 'fixed';
      particle.style.left = `${rect.left + rect.width / 2}px`;
      particle.style.top = `${rect.top}px`;
      particle.style.width = '7px';
      particle.style.height = '7px';
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      particle.style.backgroundColor = color;
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '9999';
      document.body.appendChild(particle);

      const angle = Math.random() * Math.PI - Math.PI / 2;
      const velocity = 3 + Math.random() * 5;
      const dx = Math.sin(angle) * velocity * 18;
      const dy = -Math.cos(angle) * velocity * 18;

      let frame = 0;
      const anim = setInterval(() => {
        frame++;
        particle.style.transform = `translate(${dx * (frame / 18)}px, ${
          dy * (frame / 18) + frame * frame * 0.15
        }px) rotate(${frame * 15}deg)`;
        particle.style.opacity = (1 - frame / 25).toString();
        if (frame >= 25) {
          clearInterval(anim);
          particle.remove();
        }
      }, 16);
    }
  };

  const selectedChallenge =
    selectedChallengeIndex !== null ? CHALLENGES_DATA[selectedChallengeIndex] : null;

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed antialiased relative pb-32">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fade-in">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700/50 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="fixed top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-16 px-gutter-mobile flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary-container flex items-center justify-center shadow-[0_2px_8px_rgba(53,37,205,0.35)] relative overflow-hidden ring-1 ring-white/30">
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-full pointer-events-none" />
              <span className="text-on-primary font-headline-sm text-sm font-extrabold tracking-tight relative z-50">
                K
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-2xs">
                <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface font-bold">
                  Kairos
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wider uppercase">
                Friends
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full px-gutter-mobile pt-16 pb-dock-safe-inset bg-surface mobile-scroll overflow-y-auto">
        <div className="flex flex-col w-full space-y-space-md pt-2">
          {/* Top Ambient Celebration Hero */}
          <div className="relative w-full rounded-3xl overflow-hidden bg-surface-container shadow-md">
            <div className="relative h-44 w-full">
              <img
                alt="Joyful squad celebration with trophy and confetti"
                className="w-full h-full object-cover object-center"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6mZZrcY6bNldd55NLP5fhREt4tPfrWvJvv1t3n5pdEQPzVvra727bsH53vJ9bClN1vtaEr9Jjxg6P-PXTdPwuwZW7CFQC3tm-FjUP4kZFUEAtZhNcVyvK9gT06m83AWBuIkxdhvVHS6HvHilz1UTWg0jp7qOWGpjlJlfZKg9B9oXprajtv7XqDkVLeo3Pjj_GnOWP0UoCp2Q0QTQ4Ks-MLrKuzIAU2PBUkMPNGOysJnqoVCCheIZvqw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider">
                      Squad League
                    </span>
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Productivity Champs
                  </h2>
                </div>
                <button
                  className="h-10 px-3.5 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-[0_4px_14px_rgba(53,37,205,0.3)] active:scale-95 transition-transform cursor-pointer"
                  id="confetti-btn"
                  type="button"
                  onClick={triggerConfetti}
                >
                  <span className="material-symbols-outlined text-body-lg">celebration</span>
                  <span>Celebrate</span>
                </button>
              </div>
            </div>
          </div>

          {/* LEADERBOARD VIEW */}
          <div className="flex flex-col w-full space-y-space-md" id="view-leaderboard">
            {/* Meta Pill Bar */}
            <div className="flex items-center justify-between px-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant shadow-sm">
                <span className="material-symbols-outlined text-body-md text-primary">timer</span>
                <span className="font-label-md text-label-md">Week 43 • Resets in 2d 14h</span>
              </div>
              <div className="flex items-center gap-1 text-tertiary font-label-md text-label-md">
                <span className="material-symbols-outlined text-body-lg">emoji_events</span>
              </div>
            </div>

            {/* Top 3 Podium Cards */}
            <div className="grid grid-cols-3 gap-space-xs items-end pt-3">
              {/* 2nd Place (Silver Crown) */}
              <div className="flex flex-col items-center p-space-xs pt-3 rounded-2xl bg-surface-container-lowest shadow-sm transform hover:-translate-y-1 transition-transform">
                <div className="flex items-center justify-center mb-1">
                  <span className="material-symbols-outlined text-body-lg" style={{ color: '#94a3b8' }}>
                    crown
                  </span>
                </div>
                <div className="relative mb-2">
                  <img
                    className="w-12 h-12 rounded-full object-cover"
                    alt="Maya"
                    src={LEADERBOARD_DATA[1].avatar}
                  />
                  <span className="absolute -top-2 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-outline-variant text-on-surface font-label-sm text-label-sm font-bold shadow">
                    2
                  </span>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-surface-container-lowest"
                    title="Online now"
                  />
                </div>
                <span className="font-label-md text-label-md text-on-surface font-bold truncate max-w-full">
                  Maya
                </span>
                <span className="font-metric-numeral text-metric-numeral text-secondary font-bold text-sm">
                  2,890
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">41 tasks</span>
              </div>

              {/* 1st Place (Gold Crown Champion) */}
              <div className="flex flex-col items-center p-space-xs pt-4 rounded-2xl bg-gradient-to-b from-primary-fixed/40 to-surface-container-lowest shadow-md -translate-y-2">
                <div className="flex items-center justify-center mb-1">
                  <span
                    className="material-symbols-outlined text-headline-sm animate-bounce drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                    style={{ color: 'rgb(245, 158, 11)' }}
                  >
                    crown
                  </span>
                </div>
                <div className="relative mb-2">
                  <img
                    className="w-14 h-14 rounded-full object-cover"
                    alt="Jordan"
                    src={LEADERBOARD_DATA[0].avatar}
                  />
                  <span className="absolute -top-2 -right-1 w-6 h-6 flex items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-extrabold shadow">
                    1
                  </span>
                  <span
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary ring-2 ring-surface-container-lowest"
                    title="Active in Deep Work"
                  />
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold truncate max-w-full">
                  Jordan
                </span>
                <span className="font-metric-numeral text-metric-numeral text-primary font-extrabold text-base">
                  3,120
                </span>
                <span className="font-label-sm text-label-sm text-primary font-semibold">48 tasks</span>
              </div>

              {/* 3rd Place (Bronze Crown) */}
              <div className="flex flex-col items-center p-space-xs pt-3 rounded-2xl bg-surface-container-lowest shadow-sm transform hover:-translate-y-1 transition-transform">
                <div className="flex items-center justify-center mb-1">
                  <span className="material-symbols-outlined text-body-lg" style={{ color: '#b45309' }}>
                    crown
                  </span>
                </div>
                <div className="relative mb-2">
                  <img
                    className="w-12 h-12 rounded-full object-cover"
                    alt="Liam"
                    src={LEADERBOARD_DATA[2].avatar}
                  />
                  <span className="absolute -top-2 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold shadow">
                    3
                  </span>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-outline ring-2 ring-surface-container-lowest"
                    title="Offline - resting"
                  />
                </div>
                <span className="font-label-md text-label-md text-on-surface font-bold truncate max-w-full">
                  Liam
                </span>
                <span className="font-metric-numeral text-metric-numeral text-secondary font-bold text-sm">
                  2,610
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">36 tasks</span>
              </div>
            </div>

            {/* Rest of Squad Roster */}
            <div className="flex flex-col space-y-space-xs">
              {/* 4th Place Friend (Alex - You) */}
              <div className="flex items-center justify-between p-space-xs px-space-sm rounded-2xl bg-gradient-to-r from-primary/10 via-secondary-container/20 to-primary-fixed/30 ring-1 ring-primary/20 shadow-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md text-primary font-bold w-4 text-center">
                    4
                  </span>
                  <div className="relative">
                    <img
                      alt="Alex Profile"
                      className="w-9 h-9 rounded-full object-cover"
                      src={LEADERBOARD_DATA[3].avatar}
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-secondary ring-1 ring-surface-container-lowest" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">
                        Alex (You)
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
                        Sprint Mode
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      34 rituals achieved this week
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-metric-numeral text-metric-numeral text-primary font-extrabold">
                    2,450
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    XP Earned
                  </span>
                </div>
              </div>

              {/* 5th Place Friend (Elena Rostova) */}
              <div className="flex items-center justify-between p-space-xs px-space-sm rounded-2xl bg-surface-container-lowest shadow-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant w-4 text-center">
                    5
                  </span>
                  <div className="relative">
                    <img
                      className="w-9 h-9 rounded-full object-cover"
                      alt="Elena"
                      src={LEADERBOARD_DATA[4].avatar}
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-outline ring-1 ring-surface-container-lowest" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Elena Rostova
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Offline • Focused session 2h ago
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    2,180
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    29 tasks
                  </span>
                </div>
              </div>

              {/* 6th Place Friend (David K.) */}
              <div className="flex items-center justify-between p-space-xs px-space-sm rounded-2xl bg-surface-container-lowest shadow-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant w-4 text-center">
                    6
                  </span>
                  <div className="relative">
                    <img
                      className="w-9 h-9 rounded-full object-cover"
                      alt="David"
                      src={LEADERBOARD_DATA[5].avatar}
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-secondary ring-1 ring-surface-container-lowest" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      David K.
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Online • Evening reading
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    1,940
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    24 tasks
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE CHALLENGES SECTION & STACKABLE SWIPEABLE CARDS */}
          <div className="flex flex-col w-full space-y-space-sm pt-2" id="view-challenges">
            {/* Section Header & Badge */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Active Challenges
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-extrabold tracking-wide">
                  3 / 3 Active
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md"
                id="card-counter"
              >
                <span className="font-bold text-primary" id="stack-index">
                  {currentTopIndex + 1}
                </span>
                <span className="opacity-60">/ 3</span>
              </div>
            </div>

            {/* Create New Challenge Button */}
            <div className="px-1">
              <button
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-primary-fixed via-surface-container to-secondary-fixed text-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 border border-primary/20 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                id="create-challenge-btn"
                type="button"
                onClick={showLimitToast}
              >
                <span className="material-symbols-outlined text-body-lg font-bold">add_circle</span>
                <span>+ Create New Challenge</span>
              </button>
            </div>

            {/* Swipeable Card Stack Container */}
            <div className="relative w-full pt-1 pb-2">
              <div
                ref={containerRef}
                className="card-stack-container w-full h-[230px] relative touch-pan-y"
                id="challenge-stack"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {CHALLENGES_DATA.map((challenge, i) => {
                  const offset =
                    (i - currentTopIndex + CHALLENGES_DATA.length) % CHALLENGES_DATA.length;
                  const isTop = offset === 0;

                  let cardStyle: React.CSSProperties = {};

                  if (isTop) {
                    const translateX = isSwiping ? 120 : swipeOffset;
                    const rotate = isSwiping ? 16 : swipeOffset * 0.08;
                    const opacity = isSwiping ? 0 : 1;

                    cardStyle = {
                      transform: `translate3d(${translateX}px, 0px, 0px) rotate(${rotate}deg) scale(1)`,
                      opacity: opacity,
                      zIndex: 30,
                      pointerEvents: 'auto'
                    };
                  } else if (offset === 1) {
                    cardStyle = {
                      transform: 'translate3d(0px, 10px, -20px) scale(0.95)',
                      opacity: 0.88,
                      zIndex: 20,
                      pointerEvents: 'none'
                    };
                  } else {
                    cardStyle = {
                      transform: 'translate3d(0px, 20px, -40px) scale(0.90)',
                      opacity: 0.65,
                      zIndex: 10,
                      pointerEvents: 'none'
                    };
                  }

                  const progressPct = Math.round(
                    (challenge.currentDays / challenge.totalDays) * 100
                  );

                  return (
                    <div
                      key={challenge.id}
                      className={`swipe-card absolute inset-0 cursor-pointer p-5 rounded-3xl bg-gradient-to-br ${challenge.gradientClass} border-2 ${challenge.borderColor} shadow-card flex flex-col justify-between transition-all duration-300`}
                      style={cardStyle}
                      onClick={() => {
                        if (isTop) {
                          triggerHaptic(ImpactStyle.Light);
                          setSelectedChallengeIndex(i);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${
                              challenge.accentColor === 'rose'
                                ? 'from-rose-500 to-violet-600'
                                : challenge.accentColor === 'emerald'
                                ? 'from-emerald-500 to-teal-500'
                                : 'from-indigo-600 to-blue-500'
                            } flex items-center justify-center text-white shadow-md`}
                          >
                            <span className="material-symbols-outlined text-headline-sm">
                              {challenge.icon}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-headline-sm text-base text-on-surface font-extrabold">
                                {challenge.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${
                                  challenge.accentColor === 'rose'
                                    ? 'bg-rose-100 text-rose-700'
                                    : challenge.accentColor === 'emerald'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {challenge.cadenceTag}
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                              {challenge.subtitle}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-md text-label-md font-extrabold shadow-sm border ${
                            challenge.accentColor === 'rose'
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : challenge.accentColor === 'emerald'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-body-md ${
                              challenge.accentColor === 'rose'
                                ? 'text-rose-600'
                                : challenge.accentColor === 'emerald'
                                ? 'text-emerald-600'
                                : 'text-indigo-600'
                            }`}
                          >
                            military_tech
                          </span>
                          +{challenge.hpReward} HP
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-label-md font-label-md">
                          <span className="text-on-surface font-semibold text-xs">
                            Squad Progress
                          </span>
                          <span
                            className={`font-bold text-xs ${
                              challenge.accentColor === 'rose'
                                ? 'text-rose-600'
                                : challenge.accentColor === 'emerald'
                                ? 'text-emerald-700'
                                : 'text-indigo-600'
                            }`}
                          >
                            {challenge.currentDays} / {challenge.totalDays} Days ({progressPct}%)
                          </span>
                        </div>
                        <div
                          className={`w-full h-2 rounded-full overflow-hidden ${
                            challenge.accentColor === 'rose'
                              ? 'bg-rose-100/70'
                              : challenge.accentColor === 'emerald'
                              ? 'bg-emerald-100/70'
                              : 'bg-indigo-100/70'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${
                              challenge.accentColor === 'rose'
                                ? 'from-rose-500 to-violet-600'
                                : challenge.accentColor === 'emerald'
                                ? 'from-emerald-500 to-cyan-500'
                                : 'from-indigo-600 to-blue-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div
                        className={`flex items-center justify-between pt-1 border-t ${
                          challenge.accentColor === 'rose'
                            ? 'border-rose-100/80'
                            : challenge.accentColor === 'emerald'
                            ? 'border-emerald-100/80'
                            : 'border-indigo-100/80'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="flex -space-x-2 overflow-hidden">
                            {challenge.joinedUsers.map((u, uIdx) => (
                              <img
                                key={uIdx}
                                alt={u.name}
                                className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                                src={u.avatar}
                              />
                            ))}
                          </div>
                          <span className="ml-2 font-label-sm text-label-sm text-on-surface-variant font-semibold">
                            {challenge.joinedUsers.length} joined
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 font-label-sm font-bold px-2.5 py-1 rounded-full text-xs ${
                            challenge.accentColor === 'rose'
                              ? 'text-rose-700 bg-rose-100/80'
                              : challenge.accentColor === 'emerald'
                              ? 'text-emerald-800 bg-emerald-100/80'
                              : 'text-indigo-700 bg-indigo-100/80'
                          }`}
                        >
                          Tap for Roster{' '}
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Swipe Controls & Indicator Dots */}
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-1.5" id="dots-container">
                {CHALLENGES_DATA.map((_, idx) => (
                  <span
                    key={idx}
                    className={`transition-all duration-300 cursor-pointer ${
                      idx === currentTopIndex
                        ? 'w-6 h-2 rounded-full bg-primary'
                        : 'w-2 h-2 rounded-full bg-outline-variant'
                    }`}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Light);
                      setCurrentTopIndex(idx);
                    }}
                  />
                ))}
              </div>

              <div
                className="inline-flex items-center gap-1 text-on-surface-variant font-label-sm text-xs opacity-75 cursor-pointer active:scale-95 transition-transform"
                onClick={swipeNext}
              >
                <span className="material-symbols-outlined text-sm text-primary">swipe</span>
                <span>Swipe card to explore</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* TOAST: Active Limit Reached Notice */}
      <div
        className={`fixed top-20 inset-x-4 z-50 transform transition-all duration-300 ease-out ${
          limitToastOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-24 opacity-0 pointer-events-none'
        }`}
        id="toast-limit"
      >
        <div className="p-4 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-md border border-error/20 shadow-[0_12px_28px_rgba(186,26,26,0.12)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-base">info</span>
          </div>
          <div className="flex-1">
            <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
              Active Limit Reached
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
              Maximum 3 challenges at a time. Complete or archive an active challenge to create a new one.
            </p>
          </div>
          <button
            className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
            id="close-toast-btn"
            type="button"
            onClick={hideLimitToast}
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>

      {/* MODAL: Detailed Challenge Roster View */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-200 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest shadow-2xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 pb-4 bg-gradient-to-b from-surface-container-low to-surface-container-lowest border-b border-surface-container">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold tracking-wide">
                  {selectedChallenge.cadenceTag} Sprint
                </span>
                <button
                  className="w-8 h-8 rounded-full bg-surface-container-high/60 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  onClick={() => setSelectedChallengeIndex(null)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-base font-bold">close</span>
                </button>
              </div>
              <h3 className="font-headline-sm text-xl text-on-surface font-extrabold leading-tight">
                {selectedChallenge.title}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                {selectedChallenge.subtitle}
              </p>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant/20">
                <div className="flex items-center gap-1.5 text-tertiary-container font-label-md text-label-md font-bold">
                  <span className="material-symbols-outlined text-body-lg text-tertiary">
                    military_tech
                  </span>
                  <span>+{selectedChallenge.hpReward} HP Reward</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md ml-auto">
                  <span className="material-symbols-outlined text-body-md text-primary">schedule</span>
                  <span>Ends in 2 days</span>
                </div>
              </div>
            </div>

            {/* Modal Participants Roster */}
            <div className="p-5 overflow-y-auto space-y-3 mobile-scroll">
              <div className="flex items-center justify-between pb-1">
                <span className="font-label-lg text-label-lg font-bold text-on-surface">
                  Participant Roster
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Completion rate
                </span>
              </div>

              {selectedChallenge.roster.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-2xl transition-colors ${
                    p.isCurrentUser
                      ? 'bg-primary-fixed/20 border border-primary/20'
                      : 'bg-surface-container-low/60 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      alt={p.name}
                      className={`w-10 h-10 rounded-full object-cover ${
                        p.completed
                          ? 'ring-2 ring-amber-400'
                          : p.isCurrentUser
                          ? 'ring-2 ring-primary'
                          : 'ring-1 ring-outline-variant'
                      }`}
                      src={p.avatar}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          {p.name}
                        </span>
                        {p.completed && (
                          <span className="material-symbols-outlined text-xs text-amber-500">
                            check_circle
                          </span>
                        )}
                        {p.isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded-full bg-primary text-white font-label-sm text-[9px] font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-label-sm text-label-sm font-semibold ${
                          p.completed
                            ? 'text-emerald-600'
                            : p.isCurrentUser
                            ? 'text-primary'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {p.detail}
                      </span>
                    </div>
                  </div>

                  <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-surface-container-high stroke-current"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="3.5"
                      />
                      <path
                        className={`${p.ringColor} stroke-current`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeDasharray={`${p.percentage}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <span className={`absolute text-[10px] font-extrabold ${p.textColor}`}>
                      {p.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-surface-container-lowest border-t border-surface-container flex items-center justify-end gap-2">
              <button
                className="w-full py-2.5 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-bold hover:bg-primary-container shadow-md active:scale-98 transition-all cursor-pointer"
                onClick={() => setSelectedChallengeIndex(null)}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Dock */}
      <nav
        className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-gutter-mobile pointer-events-none pb-safe"
        data-active-classes="bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)]"
      >
        <div className="pointer-events-auto flex items-center justify-between w-full max-w-[390px] h-16 px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_16px_40px_-6px_rgba(19,27,46,0.12),0_2px_12px_rgba(53,37,205,0.06)] border border-surface-container-high/60">
          <button
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer"
            data-path="home"
            data-screen="SCREEN_22"
            type="button"
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab?.('home');
            }}
          >
            <span className="material-symbols-outlined text-headline-sm">home</span>
          </button>

          <button
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer"
            data-path="daily-tasks"
            data-screen="SCREEN_20"
            type="button"
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab?.('tasks');
            }}
          >
            <span className="material-symbols-outlined text-headline-sm">check_circle</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
          </button>

          <button
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer"
            data-path="ai-companion-chat"
            data-screen="SCREEN_11"
            type="button"
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab?.('companion');
            }}
          >
            <span className="material-symbols-outlined text-headline-sm">auto_awesome</span>
          </button>

          <button
            aria-current="page"
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(79,70,229,0.38)] cursor-pointer"
            data-path="squad-progression"
            data-screen="SCREEN_12"
            type="button"
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab?.('squad');
            }}
          >
            <span className="material-symbols-outlined text-headline-sm">groups</span>
          </button>

          <button
            className="relative min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant transition-all duration-300 hover:text-on-surface active:scale-95 cursor-pointer"
            data-path="evolution-profile"
            data-screen="SCREEN_29"
            type="button"
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              onNavigateTab?.('profile');
            }}
          >
            <span className="material-symbols-outlined text-headline-sm">person</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default SquadScreen;
