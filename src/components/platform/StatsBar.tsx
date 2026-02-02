import { ReactNode } from 'react';
import { CheckCircle2, CircleDot, XCircle } from 'lucide-react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: 'neutral' | 'success' | 'danger' | 'accent';
}

function toneClass(tone: StatCardProps['tone']) {
  switch (tone) {
    case 'success':
      return 'text-[var(--status-available)] bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.18)]';
    case 'danger':
      return 'text-[var(--status-unavailable)] bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.18)]';
    case 'accent':
      return 'text-[var(--accent-red)] bg-[var(--accent-red-subtle)] border-[rgba(255,0,0,0.18)]';
    default:
      return 'text-white bg-[var(--bg-secondary)] border-[var(--bg-tertiary)]';
  }
}

function StatCard({ icon, label, value, tone }: StatCardProps) {
  return (
    <div className="rounded-[16px] border p-5 bg-[var(--bg-secondary)] border-[var(--bg-tertiary)]">
      <div className="flex items-center gap-4">
        <div className={['w-11 h-11 rounded-[14px] border flex items-center justify-center', toneClass(tone)].join(' ')}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
          <div className="text-2xl font-bold text-white mt-1">{value}</div>
        </div>
      </div>
    </div>
  );
}

interface StatsBarProps {
  total: number;
  available: number;
  unavailable: number;
  extraLabel: string;
  extraValue: string | number;
  extraTone?: StatCardProps['tone'];
  extraIcon: ReactNode;
}

export function StatsBar({ total, available, unavailable, extraLabel, extraValue, extraTone = 'accent', extraIcon }: StatsBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={<CircleDot className="w-5 h-5" />} label="Total" value={total} tone="neutral" />
      <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Available" value={available} tone="success" />
      <StatCard icon={<XCircle className="w-5 h-5" />} label="Unavailable" value={unavailable} tone="danger" />
      <StatCard icon={extraIcon} label={extraLabel} value={extraValue} tone={extraTone} />
    </div>
  );
}
