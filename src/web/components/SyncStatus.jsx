import { useSyncStatus } from '../hooks/useSyncStatus';
import { Wifi, WifiOff, RotateCw } from 'lucide-react';

export default function SyncStatus() {
  const { status, queueLength, isSyncing } = useSyncStatus();

  if (status === 'online' && !isSyncing) {
    return null; // Hidden when fully synced
  }

  const configs = {
    offline: {
      icon: WifiOff,
      label: 'Offline',
      color: 'text-zx-negative',
      bg: 'bg-zx-negative/10',
    },
    syncing: {
      icon: RotateCw,
      label: `Syncing (${queueLength})`,
      color: 'text-zx-accent',
      bg: 'bg-zx-accent/10',
      animate: true,
    },
    online: {
      icon: Wifi,
      label: 'Online',
      color: 'text-zx-positive',
      bg: 'bg-zx-positive/10',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-zx-sm text-xs font-medium ${config.bg} ${config.color} transition`}>
      <Icon className={`h-3.5 w-3.5 ${config.animate ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
    </div>
  );
}
