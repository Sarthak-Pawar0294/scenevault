import { ReactNode } from 'react';

interface PlatformHeaderProps {
  icon: ReactNode;
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  tertiaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

export function PlatformHeader({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  tertiaryAction,
}: PlatformHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)]">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-red-subtle)] to-transparent opacity-60" />
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] flex items-center justify-center">
              <span className="text-[var(--accent-red)]">{icon}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
              {description && <div className="text-sm text-[var(--text-secondary)] mt-2">{description}</div>}
            </div>
          </div>

          {(primaryAction || secondaryAction || tertiaryAction) && (
            <div className="flex flex-wrap items-center gap-3">
              {primaryAction && (
                <button
                  type="button"
                  className="btn-primary flex items-center justify-center gap-2"
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.icon}
                  <span>{primaryAction.label}</span>
                </button>
              )}

              {secondaryAction && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-[12px] bg-[var(--bg-tertiary)] text-white border border-[var(--bg-tertiary)] hover:bg-black/20 transition flex items-center gap-2"
                  onClick={secondaryAction.onClick}
                >
                  {secondaryAction.icon}
                  <span>{secondaryAction.label}</span>
                </button>
              )}

              {tertiaryAction && (
                <button
                  type="button"
                  className="px-3 py-2 rounded-[12px] bg-transparent text-[var(--text-secondary)] border border-[var(--bg-tertiary)] hover:text-white hover:bg-black/20 transition flex items-center gap-2"
                  onClick={tertiaryAction.onClick}
                  aria-label={tertiaryAction.label}
                  title={tertiaryAction.label}
                >
                  {tertiaryAction.icon}
                  <span className="hidden md:inline">{tertiaryAction.label}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
