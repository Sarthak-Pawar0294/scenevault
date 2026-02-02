import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  Youtube,
  Tv,
  PlaySquare,
  Monitor,
  Grid,
  Tag as TagIcon,
  Settings,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Film,
} from 'lucide-react';
import { Platform } from '../../types';

export type SidebarSection = 'all' | Platform | 'profile' | 'tags';

interface SidebarProps {
  active: SidebarSection;
  onNavigate: (section: SidebarSection) => void;
  onOpenSettings: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ active, onNavigate, onOpenSettings, open, onOpenChange }: SidebarProps) {
  const { user, signOut } = useAuth();

  const navItems = useMemo(
    () =>
      [
        { id: 'all' as const, label: 'All Scenes', icon: <Home className="w-5 h-5" /> },
        { id: 'YouTube' as const, label: 'YouTube', icon: <Youtube className="w-5 h-5" /> },
        { id: 'JioHotstar' as const, label: 'JioHotstar', icon: <Tv className="w-5 h-5" /> },
        { id: 'Zee5' as const, label: 'Zee5', icon: <PlaySquare className="w-5 h-5" /> },
        { id: 'SonyLIV' as const, label: 'SonyLIV', icon: <Monitor className="w-5 h-5" /> },
        { id: 'Other' as const, label: 'Other', icon: <Grid className="w-5 h-5" /> },
        { id: 'tags' as const, label: 'Tags', icon: <TagIcon className="w-5 h-5" /> },
      ],
    []
  );

  const linkClass = (isActive: boolean) =>
    [
      'w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm transition',
      isActive ? 'text-white bg-[var(--bg-tertiary)] border-l-4 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)]',
    ].join(' ');

  const panel = (
    <aside className="h-full w-[240px] bg-[var(--bg-primary)] border-r border-[var(--bg-tertiary)] flex flex-col">
      <div className="px-4 py-5 flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-3"
          onClick={() => {
            onNavigate('all');
            onOpenChange(false);
          }}
        >
          <Film className="w-6 h-6 text-[var(--accent-red)]" />
          <div className="text-left">
            <div className="text-white font-bold">SceneVault</div>
            <div className="text-xs text-[var(--text-secondary)] truncate max-w-[160px]">{user?.email}</div>
          </div>
        </button>

        <button
          type="button"
          className="md:hidden p-2 rounded-[12px] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)]"
          onClick={() => onOpenChange(false)}
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="px-3 py-2 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={linkClass(active === item.id)}
              onClick={() => {
                onNavigate(item.id);
                onOpenChange(false);
              }}
            >
              <span className="text-[var(--text-secondary)]">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-[var(--bg-tertiary)] pt-4 space-y-1">
          <button
            type="button"
            className={linkClass(active === 'profile')}
            onClick={() => {
              onNavigate('profile');
              onOpenChange(false);
            }}
          >
            <span className="text-[var(--text-secondary)]">
              <UserIcon className="w-5 h-5" />
            </span>
            <span className="font-medium">Profile</span>
          </button>

          <button
            type="button"
            className={linkClass(false)}
            onClick={() => {
              onOpenSettings();
              onOpenChange(false);
            }}
          >
            <span className="text-[var(--text-secondary)]">
              <Settings className="w-5 h-5" />
            </span>
            <span className="font-medium">Settings</span>
          </button>

          <button
            type="button"
            className={linkClass(false)}
            onClick={() => {
              signOut();
              onOpenChange(false);
            }}
          >
            <span className="text-[var(--text-secondary)]">
              <LogOut className="w-5 h-5" />
            </span>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </nav>
    </aside>
  );

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-[1001]">
        <button
          type="button"
          className="p-3 rounded-[12px] bg-[var(--bg-secondary)] text-white hover:bg-[var(--bg-tertiary)]"
          onClick={() => onOpenChange(true)}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="hidden md:block fixed inset-y-0 left-0 w-[240px] z-[1000]">{panel}</div>

      {open && (
        <div className="md:hidden fixed inset-0 z-[1000]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => onOpenChange(false)}
            role="button"
            tabIndex={-1}
          />
          <div className="absolute inset-y-0 left-0">{panel}</div>
        </div>
      )}
    </>
  );
}
