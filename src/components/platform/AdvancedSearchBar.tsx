import { Search, SlidersHorizontal } from 'lucide-react';

export type AdvancedSortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

export type FilterChipId =
  | 'all'
  | 'F/M'
  | 'F/F'
  | 'M/F'
  | 'M/M'
  | 'available'
  | 'unavailable';

interface Chip {
  id: FilterChipId;
  label: string;
}

const defaultChips: Chip[] = [
  { id: 'all', label: 'All' },
  { id: 'F/M', label: 'F/M' },
  { id: 'F/F', label: 'F/F' },
  { id: 'M/F', label: 'M/F' },
  { id: 'M/M', label: 'M/M' },
  { id: 'available', label: 'Available' },
  { id: 'unavailable', label: 'Unavailable' },
];

interface AdvancedSearchBarProps {
  query: string;
  onQueryChange: (next: string) => void;
  sortBy: AdvancedSortOption;
  onSortByChange: (next: AdvancedSortOption) => void;
  activeChip: FilterChipId;
  onChipChange: (next: FilterChipId) => void;
  onOpenFilters?: () => void;
  chips?: Chip[];
}

function chipClass(active: boolean) {
  return [
    'px-3 py-2 rounded-full text-sm border transition',
    active
      ? 'bg-[var(--accent-red-subtle)] text-white border-[rgba(255,0,0,0.25)]'
      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--bg-tertiary)] hover:text-white hover:bg-black/20',
  ].join(' ');
}

export function AdvancedSearchBar({
  query,
  onQueryChange,
  sortBy,
  onSortByChange,
  activeChip,
  onChipChange,
  onOpenFilters,
  chips = defaultChips,
}: AdvancedSearchBarProps) {
  return (
    <div className="card p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search scenes, titles, channels..."
              className="w-full pl-12 pr-4 py-3 rounded-[14px] bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as AdvancedSortOption)}
            className="px-4 py-3 rounded-[14px] bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
          </select>

          <button
            type="button"
            className="px-4 py-3 rounded-[14px] bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-white hover:bg-black/20 transition flex items-center gap-2"
            onClick={onOpenFilters}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            className={chipClass(activeChip === c.id)}
            onClick={() => onChipChange(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
