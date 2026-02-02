import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Category } from '../../types';

export type AdvancedSortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

type StatusChip = 'available' | 'unavailable';

interface AdvancedSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  selectedCategories: Category[];
  onToggleCategory: (category: Category) => void;
  selectedStatuses: StatusChip[];
  onToggleStatus: (status: StatusChip) => void;
  sortBy: AdvancedSortOption;
  onSortChange: (sort: AdvancedSortOption) => void;
}

const categories: Category[] = ['F/M', 'F/F', 'M/F', 'M/M'];
const statusChips: StatusChip[] = ['available', 'unavailable'];

const sortOptions: { value: AdvancedSortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
];

export function AdvancedSearch({
  query,
  onQueryChange,
  selectedCategories,
  onToggleCategory,
  selectedStatuses,
  onToggleStatus,
  sortBy,
  onSortChange,
}: AdvancedSearchProps) {
  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-4 h-4 text-[var(--text-secondary)]" />
        <h3 className="text-sm font-semibold text-white">Advanced Search</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search titles, channels, notes..."
          className="input-search text-base py-3 pl-12"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Categories</div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onToggleCategory(cat)}
                  className={
                    active
                      ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent-red-subtle)] text-[var(--accent-red)] border border-[var(--accent-red)]/20'
                      : 'px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white border border-transparent hover:border-[var(--surface-border)]'
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Status</div>
          <div className="flex flex-wrap gap-2">
            {statusChips.map((s) => {
              const active = selectedStatuses.includes(s);
              const label = s === 'available' ? 'Available' : 'Unavailable';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onToggleStatus(s)}
                  className={
                    active
                      ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/10'
                      : 'px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white border border-transparent hover:border-[var(--surface-border)]'
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Sort</div>
          <div className="relative">
            <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as AdvancedSortOption)}
              className="input text-sm py-3 pl-10"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-[var(--text-secondary)]">
        Tip: leave chips unselected to include everything.
      </div>
    </div>
  );
}
