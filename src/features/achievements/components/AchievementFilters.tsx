import React from 'react';
import { FilterState, AchievementCategory, AchievementRarity } from '../types/achievement.types';
import { ACHIEVEMENT_CATEGORIES } from '../data/categories';
import { ACHIEVEMENT_RARITIES } from '../data/rarities';

export interface AchievementFiltersProps {
  filters: FilterState;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: AchievementCategory) => void;
  onRarityChange: (rarity: AchievementRarity | 'all') => void;
  onStatusChange: (status: 'all' | 'unlocked' | 'in-progress' | 'locked') => void;
  onSortChange: (sortBy: 'progress' | 'rarity' | 'xp' | 'hp' | 'recent') => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

export const AchievementFilters: React.FC<AchievementFiltersProps> = ({
  filters,
  onSearchChange,
  onCategoryChange,
  onRarityChange,
  onStatusChange,
  onSortChange,
  onReset,
  totalCount,
  filteredCount
}) => {
  const raritiesList: (AchievementRarity | 'all')[] = [
    'all',
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
    'mythic'
  ];

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.category !== 'all' ||
    filters.rarity !== 'all' ||
    filters.status !== 'all';

  return (
    <div className="space-y-4 mb-6">
      {/* Search, Status, and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search milestones, quests, lifetime titles..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-xs"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Status Segmented Control */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/90 overflow-x-auto">
          {(['all', 'unlocked', 'in-progress', 'locked'] as const).map((st) => (
            <button
              key={st}
              onClick={() => onStatusChange(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold capitalize whitespace-nowrap transition-all ${
                filters.status === st
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'in-progress' ? 'In Progress' : st}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={filters.sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            aria-label="Sort milestones by"
            className="h-full px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-xs cursor-pointer appearance-none pr-8"
          >
            <option value="progress">Sort by Progress</option>
            <option value="rarity">Sort by Rarity Tier</option>
            <option value="xp">Sort by Reward XP</option>
            <option value="hp">Sort by Energy HP</option>
            <option value="recent">Sort by Unlocked</option>
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      {/* 10 Category Horizontal Scrollable Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
        {ACHIEVEMENT_CATEGORIES.map((cat) => {
          const isSelected = filters.category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                  : 'bg-white text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Rarity Selector & Filter Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-bold mr-1 text-[11px] uppercase tracking-wider">
            Rarity:
          </span>
          {raritiesList.map((r) => {
            const isSelected = filters.rarity === r;
            const meta = r !== 'all' ? ACHIEVEMENT_RARITIES[r] : null;
            const label = r === 'all' ? 'All' : meta?.label || r;
            return (
              <button
                key={r}
                onClick={() => onRarityChange(r)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all border ${
                  isSelected
                    ? meta
                      ? `${meta.bgClass} shadow-xs scale-105`
                      : 'bg-slate-900 text-white border-slate-900 font-black shadow-xs'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center gap-2.5">
          <span className="text-slate-500 font-medium text-[11px]">
            Showing <strong className="text-slate-900 font-bold">{filteredCount}</strong> of {totalCount}
          </span>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[13px]">refresh</span>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchievementFilters;
