import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="card p-10">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-[18px] bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-red)]">
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold text-white">{title}</div>
          <div className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl">{description}</div>
        </div>
        {actionLabel && onAction && (
          <button type="button" className="btn-primary" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
