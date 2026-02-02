import { User } from 'lucide-react';
import { PlatformHeader } from '../components/platform/PlatformHeader';
import { EmptyState } from '../components/platform/EmptyState';

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <PlatformHeader
        icon={<User className="w-6 h-6" />}
        title="Profile"
        description="Account and usage information"
      />

      <EmptyState
        icon={<User className="w-7 h-7" />}
        title="Profile page is coming here"
        description="In a later batch, this page will be migrated from the legacy Dashboard and expanded with account details."
      />
    </div>
  );
}
