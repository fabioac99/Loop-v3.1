'use client';
import { useAuthStore } from '@/stores/auth';
import { ShieldX } from 'lucide-react';

export default function PermissionGate({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission } = useAuthStore();

  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ShieldX size={32} />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
