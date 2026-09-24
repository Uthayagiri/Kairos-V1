import React from 'react';
import { FilterState } from '../types/achievement.types';

export interface AchievementFiltersProps {
  filters: FilterState;
  onSearchChange?: (query: string) => void;
  onCategoryChange?: (category: any) => void;
  onRarityChange?: (rarity: any) => void;
  onStatusChange: (status: 'all' | 'unlocked' | 'locked') => void;
  onSortChange?: (sortBy: any) => void;
  onReset?: () => void;
  totalCount: number;
  filteredCount: number;
}

export const AchievementFilters: React.FC<AchievementFiltersProps> = ({
  filters,
  onStatusChange
}) => {
  const statusOptions: { id: 'all' | 'unlocked' | 'locked'; label: string; icon?: string }[] = [
    { id: 'all', label: 'All', icon: 'grid_view' },
    { id: 'unlocked', label: 'Unlocked', icon: 'verified' },
    { id: 'locked', label: 'Locked', icon: 'lock' }
  ];

  return (
    <div className="w-full mb-3.5">
      {/* Only Status Filter Options: All | Unlocked | Locked */}
      <div className="grid grid-cols-3 p-1 bg-surface-container-low rounded-2xl border border-surface-container-high/60 gap-1 shadow-2xs">
        {statusOptions.map((opt) => {
          const isSelected =
            filters.status === opt.id || (opt.id === 'all' && (filters.status as string) === 'in-progress');
          return (
            <button
              key={opt.id}
              onClick={() => onStatusChange(opt.id)}
              type="button"
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                isSelected
                  ? 'bg-primary text-on-primary shadow-sm scale-[1.01]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/60 bg-transparent'
              }`}
            >
              {opt.icon && (
                <span
                  className="material-symbols-outlined text-[15px]"
                  style={opt.id === 'unlocked' ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {opt.icon}
                </span>
              )}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementFilters;

