import { Search, Filter, X, Check } from 'lucide-react';
import { Platform, Category, Status, Tag } from '../../types';
import { TagPicker } from './TagPicker';

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';
type FilterType = 'search' | 'platform' | 'category' | 'status';

interface ActiveFilter {
  type: FilterType;
  value: string;
}

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPlatform: Platform | 'all';
  onPlatformChange: (platform: Platform | 'all') => void;
  selectedCategory: Category | 'all';
  onCategoryChange: (category: Category | 'all') => void;
  selectedStatus: Status | 'all';
  onStatusChange: (status: Status | 'all') => void;
  allTags: Tag[];
  selectedTagIds: string[];
  onSelectedTagIdsChange: (tagIds: string[]) => void;
  tagMatchMode: 'and' | 'or';
  onTagMatchModeChange: (mode: 'and' | 'or') => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeFilters: ActiveFilter[];
  onRemoveFilter: (type: FilterType) => void;
  onClearAllFilters: () => void;
  resultsCount: number;
  totalCount: number;
  selectedCount?: number;
  onSelectAll?: () => void;
}

const platforms: (Platform | 'all')[] = ['all', 'YouTube', 'JioHotstar', 'Zee5', 'SonyLIV', 'Other'];
const categories: (Category | 'all')[] = ['all', 'F/M', 'F/F', 'M/F', 'M/M'];
const statuses: (Status | 'all')[] = ['all', 'available', 'private', 'unavailable'];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
];

function getFilterLabel(filter: ActiveFilter): string {
  switch (filter.type) {
    case 'search':
      return `Search: "${filter.value}"`;
    case 'platform':
      return `Platform: ${filter.value}`;
    case 'category':
      return `Category: ${filter.value}`;
    case 'status':
      return `Status: ${filter.value.charAt(0).toUpperCase() + filter.value.slice(1)}`;
    default:
      return '';
  }
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  allTags,
  selectedTagIds,
  onSelectedTagIdsChange,
  tagMatchMode,
  onTagMatchModeChange,
  sortBy,
  onSortChange,
  activeFilters,
  onRemoveFilter,
  onClearAllFilters,
  resultsCount,
  totalCount,
  selectedCount = 0,
  onSelectAll,
}: FilterBarProps) {
  return (
    <div className="card p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <h3 className="text-sm font-semibold text-white">Filters</h3>
        </div>
        {onSelectAll && (
          <button
            onClick={onSelectAll}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition ${
              selectedCount > 0
                ? 'bg-[var(--accent-red-subtle)] text-[var(--accent-red)] hover:bg-[var(--bg-tertiary)]'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)]'
            }`}
            title="Select all scenes"
          >
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                selectedCount > 0
                  ? 'bg-[var(--accent-red)] border-[var(--accent-red)]'
                  : 'border-[var(--text-tertiary)]'
              }`}
            >
              {selectedCount > 0 && <Check className="w-3 h-3 text-white" />}
            </div>
            <span>Select All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, channel, notes..."
            className="input-search text-sm"
          />
        </div>

        <select
          value={selectedPlatform}
          onChange={(e) => onPlatformChange(e.target.value as Platform | 'all')}
          className="input text-sm py-2"
        >
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform === 'all' ? 'All Platforms' : platform}
            </option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as Category | 'all')}
          className="input text-sm py-2"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as Status | 'all')}
          className="input text-sm py-2"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="input text-sm py-2"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2 border-t border-[var(--bg-tertiary)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Tags</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs border transition ${
                tagMatchMode === 'and'
                  ? 'bg-white/10 text-white border-white/10'
                  : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:border-[var(--surface-border)]'
              }`}
              onClick={() => onTagMatchModeChange('and')}
            >
              AND
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-xs border transition ${
                tagMatchMode === 'or'
                  ? 'bg-white/10 text-white border-white/10'
                  : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:border-[var(--surface-border)]'
              }`}
              onClick={() => onTagMatchModeChange('or')}
            >
              OR
            </button>
          </div>
        </div>

        <TagPicker
          allTags={allTags}
          selectedTagIds={selectedTagIds}
          onChange={onSelectedTagIdsChange}
          placeholder="Filter by tags..."
        />
      </div>

      {activeFilters.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-[var(--bg-tertiary)]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Active Filters</div>
            <button
              onClick={onClearAllFilters}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition"
            >
              Clear All
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <div
                key={`${filter.type}-${filter.value}`}
                className="inline-flex items-center space-x-2 px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-xs text-white"
              >
                <span>{getFilterLabel(filter)}</span>
                <button
                  onClick={() => onRemoveFilter(filter.type)}
                  className="ml-1 hover:text-[var(--accent-red)] transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--bg-tertiary)]">
        Showing <span className="text-white font-medium">{resultsCount}</span> of{' '}
        <span className="text-white font-medium">{totalCount}</span> scenes
      </div>
    </div>
  );
}
