import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useOfflineSyncStore } from '../../store/offlineSyncStore';
import { getSyncPresentation } from './syncStatus';
import { AppStatusBadge } from '../ui/AppStatusBadge';

type SyncStatusIndicatorProps = {
  compact?: boolean;
  className?: string;
};

const toneClasses = {
  success: 'app-sync-indicator-success',
  info: 'app-sync-indicator-info',
  warning: 'app-sync-indicator-warning',
  danger: 'app-sync-indicator-danger',
  neutral: 'app-sync-indicator-neutral',
};

export const SyncStatusIndicator = ({ compact = false, className }: SyncStatusIndicatorProps) => {
  const enabled = useOfflineSyncStore((state) => state.enabled);
  const isOnline = useOfflineSyncStore((state) => state.isOnline);
  const isSyncing = useOfflineSyncStore((state) => state.isSyncing);
  const pendingCount = useOfflineSyncStore((state) => state.pendingCount);
  const failedCount = useOfflineSyncStore((state) => state.failedCount);
  const conflictedCount = useOfflineSyncStore((state) => state.conflictedCount);
  const blockedCount = useOfflineSyncStore((state) => state.blockedCount);
  const lastSyncAt = useOfflineSyncStore((state) => state.lastSyncAt);
  const lastError = useOfflineSyncStore((state) => state.lastError);

  const status = getSyncPresentation({
    enabled,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    conflictedCount,
    blockedCount,
    lastSyncAt,
    lastError,
  });
  const Icon = !isOnline ? WifiOff : status.tone === 'danger' ? AlertTriangle : RefreshCw;

  return (
    <Link
      to="/settings?section=sync"
      className={cn('app-sync-indicator', toneClasses[status.tone], compact && 'app-sync-indicator-compact', className)}
      aria-label={`${status.label}. ${status.detail}`}
      title={status.detail}
    >
      <span className="app-sync-indicator__icon">
        <Icon className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
      </span>
      {!compact ? <span className="truncate text-xs font-semibold">{status.label}</span> : <span className="sr-only">{status.label}</span>}
      {status.showAlertBadge && status.count > 0 ? (
        <AppStatusBadge tone={status.tone === 'danger' ? 'danger' : status.tone === 'warning' ? 'warning' : 'info'} className="min-w-5 justify-center px-2 py-0.5">
          {status.count}
        </AppStatusBadge>
      ) : null}
    </Link>
  );
};
