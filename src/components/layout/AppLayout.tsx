import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, SidebarSection } from '../Dashboard/Sidebar';
import { Platform } from '../../types';

function platformToPathSegment(platform: Platform): string {
  switch (platform) {
    case 'YouTube':
      return 'youtube';
    case 'JioHotstar':
      return 'jiohotstar';
    case 'Zee5':
      return 'zee5';
    case 'SonyLIV':
      return 'sonyliv';
    case 'Other':
      return 'other';
  }
}

function pathSegmentToPlatform(segment: string): Platform | null {
  switch (segment.toLowerCase()) {
    case 'youtube':
      return 'YouTube';
    case 'jiohotstar':
      return 'JioHotstar';
    case 'zee5':
      return 'Zee5';
    case 'sonyliv':
      return 'SonyLIV';
    case 'other':
      return 'Other';
    default:
      return null;
  }
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const active = useMemo<SidebarSection>(() => {
    const path = location.pathname;

    if (path === '/all-scenes' || path === '/') return 'all';
    if (path.startsWith('/tags')) return 'tags';
    if (path.startsWith('/profile')) return 'profile';

    if (path.startsWith('/platforms/')) {
      const segment = path.split('/')[2] || '';
      const platform = pathSegmentToPlatform(segment);
      return platform ?? 'all';
    }

    return 'all';
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <Sidebar
        active={active}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onOpenSettings={() => {
          navigate('/settings');
        }}
        onNavigate={(section) => {
          if (section === 'all') {
            navigate('/all-scenes');
            return;
          }

          if (section === 'tags') {
            navigate('/tags');
            return;
          }

          if (section === 'profile') {
            navigate('/profile');
            return;
          }

          const segment = platformToPathSegment(section);
          navigate(`/platforms/${segment}`);
        }}
      />

      <main className="md:ml-[240px] min-h-screen p-6 pt-16 md:pt-6">
        <div className="w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
