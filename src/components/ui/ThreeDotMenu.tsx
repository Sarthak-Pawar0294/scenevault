import { useEffect, useRef, useState } from 'react';

type MenuItem =
  | {
      type?: 'item';
      label: string;
      onClick: () => void;
      disabled?: boolean;
      danger?: boolean;
    }
  | {
      type: 'divider';
    };

interface ThreeDotMenuProps {
  items: MenuItem[];
  buttonAriaLabel?: string;
}

export function ThreeDotMenu({ items, buttonAriaLabel }: ThreeDotMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setOpen(false);
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={buttonAriaLabel || 'Open menu'}
        className="w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/80 border border-white/10"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="text-lg leading-none">⋮</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-[8px] overflow-hidden z-50"
          style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', boxShadow: '0 18px 40px rgba(0,0,0,0.55)' }}
          role="menu"
        >
          {items.map((it, idx) => {
            if (it.type === 'divider') {
              return <div key={`div-${idx}`} className="h-px" style={{ background: '#2a2a3e' }} />;
            }

            const danger = !!it.danger;
            const disabled = !!it.disabled;

            return (
              <button
                key={`${it.label}-${idx}`}
                type="button"
                role="menuitem"
                disabled={disabled}
                className="w-full text-left px-4 py-3 text-sm flex items-center gap-2"
                style={{
                  color: danger ? '#ef4444' : 'rgba(255,255,255,0.85)',
                  opacity: disabled ? 0.5 : 1,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (disabled) return;
                  setOpen(false);
                  it.onClick();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#2a2a3e';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
