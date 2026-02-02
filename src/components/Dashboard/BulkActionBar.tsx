import { Tag, AlertCircle, Trash2, Download, Tags } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onChangeCategory: () => void;
  onChangeStatus: () => void;
  onBulkTags: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  onChangeCategory,
  onChangeStatus,
  onBulkTags,
  onDelete,
  onExport,
  onClearSelection,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-white">
              {selectedCount} scene{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-px h-6 bg-zinc-700"></div>

            <button
              onClick={onChangeCategory}
              className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-zinc-800 transition text-sm text-zinc-300 hover:text-white"
              title="Change category for all selected"
            >
              <Tag className="w-4 h-4" />
              <span>Change Category</span>
            </button>

            <button
              onClick={onChangeStatus}
              className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-zinc-800 transition text-sm text-zinc-300 hover:text-white"
              title="Mark as unavailable"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Mark as Unavailable</span>
            </button>

            <button
              onClick={onBulkTags}
              className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-zinc-800 transition text-sm text-zinc-300 hover:text-white"
              title="Add/remove/replace tags for selected"
            >
              <Tags className="w-4 h-4" />
              <span>Tags</span>
            </button>

            <button
              onClick={onExport}
              className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-zinc-800 transition text-sm text-zinc-300 hover:text-white"
              title="Export selected scenes"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            <div className="w-px h-6 bg-zinc-700"></div>

            <button
              onClick={onDelete}
              className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-red-500/20 transition text-sm text-zinc-300 hover:text-red-500"
              title="Delete selected scenes"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
