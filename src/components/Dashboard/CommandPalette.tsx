import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Youtube, Tv, PlaySquare, Monitor, Grid, Settings, User, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Scene, Platform } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  onSelectScene: (scene: Scene) => void;
  onNavigate: (section: 'all' | Platform | 'YouTube' | 'profile') => void;
  onOpenAddScene: () => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

const platformIcons: Record<Platform | 'YouTube' | 'all' | 'profile', React.ReactNode> = {
  all: <Grid className="w-4 h-4" />,
  YouTube: <Youtube className="w-4 h-4" />,
  JioHotstar: <Tv className="w-4 h-4" />,
  Zee5: <PlaySquare className="w-4 h-4" />,
  SonyLIV: <Monitor className="w-4 h-4" />,
  Other: <Grid className="w-4 h-4" />,
  profile: <User className="w-4 h-4" />,
};

export function CommandPalette({
  isOpen,
  onClose,
  scenes,
  onSelectScene,
  onNavigate,
  onOpenAddScene,
  onOpenImport,
  onOpenSettings,
  onSignOut,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const filteredItems = useMemo(() => [
    {
      id: 'add-scene',
      title: 'Add Scene',
      icon: <Plus className="w-4 h-4" />,
      category: 'Actions',
      action: () => {
        onOpenAddScene();
        onClose();
      },
    },
    {
      id: 'import-playlist',
      title: 'Import YouTube Playlist',
      icon: <Youtube className="w-4 h-4" />,
      category: 'Actions',
      action: () => {
        onOpenImport();
        onClose();
      },
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      category: 'Actions',
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      id: 'signout',
      title: 'Sign Out',
      icon: <LogOut className="w-4 h-4" />,
      category: 'Actions',
      action: () => {
        onSignOut();
        onClose();
      },
    },
    {
      id: 'all',
      title: 'All Scenes',
      icon: platformIcons.all,
      category: 'Navigation',
      action: () => {
        onNavigate('all');
        onClose();
      },
    },
    {
      id: 'youtube',
      title: 'YouTube',
      icon: platformIcons.YouTube,
      category: 'Navigation',
      action: () => {
        onNavigate('YouTube');
        onClose();
      },
    },
    {
      id: 'jiohotstar',
      title: 'JioHotstar',
      icon: platformIcons.JioHotstar,
      category: 'Navigation',
      action: () => {
        onNavigate('JioHotstar');
        onClose();
      },
    },
    {
      id: 'zee5',
      title: 'Zee5',
      icon: platformIcons.Zee5,
      category: 'Navigation',
      action: () => {
        onNavigate('Zee5');
        onClose();
      },
    },
    {
      id: 'sonyliv',
      title: 'SonyLIV',
      icon: platformIcons.SonyLIV,
      category: 'Navigation',
      action: () => {
        onNavigate('SonyLIV');
        onClose();
      },
    },
    {
      id: 'other',
      title: 'Other',
      icon: platformIcons.Other,
      category: 'Navigation',
      action: () => {
        onNavigate('Other');
        onClose();
      },
    },
    {
      id: 'profile',
      title: 'Profile',
      icon: platformIcons.profile,
      category: 'Navigation',
      action: () => {
        onNavigate('profile');
        onClose();
      },
    },
    ...scenes.slice(0, 50).map((scene) => ({
      id: `scene-${scene.id}`,
      title: scene.title,
      icon: platformIcons[scene.platform],
      category: 'Scenes',
      description: `${scene.platform} • ${scene.category}`,
      action: () => {
        onSelectScene(scene);
        onClose();
      },
    })),
  ].filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      ('description' in item && item.description?.toLowerCase().includes(q))
    );
  }), [query, scenes, onOpenAddScene, onOpenImport, onOpenSettings, onSignOut, onNavigate, onSelectScene, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) item.action();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh] z-50">
      <div className="modal-surface w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--surface-border)]">
          <Search className="w-5 h-5 text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent outline-none text-white placeholder-[var(--text-secondary)]"
          />
          <kbd className="px-2 py-1 text-xs bg-[var(--surface-3)] rounded border border-[var(--surface-border)] text-[var(--text-secondary)]">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-[var(--text-secondary)]">No results.</div>
          ) : (
            <div>
              {['Actions', 'Navigation', 'Scenes'].map((category) => {
                const categoryItems = filteredItems.filter((item) => item.category === category);
                if (categoryItems.length === 0) return null;
                return (
                  <div key={category}>
                    <div className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                      {category}
                    </div>
                    {categoryItems.map((item) => {
                      const globalIndex = filteredItems.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition ${
                            isSelected ? 'bg-[var(--accent-red-subtle)]' : 'hover:bg-[var(--surface-3)]'
                          }`}
                        >
                          <span className="text-[var(--text-secondary)]">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{item.title}</div>
                            {'description' in item && (
                              <div className="text-xs text-[var(--text-secondary)] truncate">{item.description}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[var(--surface-border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--surface-3)] rounded border border-[var(--surface-border)]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[var(--surface-3)] rounded border border-[var(--surface-border)]">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--surface-3)] rounded border border-[var(--surface-border)]">↵</kbd>
              <span>Select</span>
            </div>
          </div>
          <div>Signed in as {user?.email}</div>
        </div>
      </div>
    </div>
  );
}
