import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOfflineSyncStore } from '../../store/offlineSyncStore';
import { Button } from '../ui/Button';
import { AppStatusBadge } from '../ui/AppStatusBadge';
import { getSyncPresentation } from '../Sync/syncStatus';

const toneClasses = {
  success: 'app-banner-success',
  info: 'app-banner-info',
  warning: 'app-banner-warning',
  danger: 'app-banner-danger',
  neutral: 'app-banner-info',
};

export const SyncAlertBanner = () => {
  const {
    enabled,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    conflictedCount,
    blockedCount,
    lastSyncAt,
    lastError,
    trackedBusinessId,
    syncNow,
  } = useOfflineSyncStore();

  const presentation = getSyncPresentation({
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

  if (!presentation.showBanner) {
    return null;
  }

  const Icon = !isOnline ? WifiOff : AlertTriangle;

  return (
    <div className="app-shell-gutter py-2 lg:py-3">
      <div className={`app-compact-banner ${toneClasses[presentation.tone]}`}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="app-icon-container app-module-sync h-10 w-10 rounded-2xl">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold app-text">{presentation.label}</div>
              {presentation.count > 0 ? (
                <AppStatusBadge tone={presentation.tone === 'danger' ? 'danger' : 'warning'}>
                  {presentation.count} pendiente{presentation.count === 1 ? '' : 's'}
                </AppStatusBadge>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 sm:text-sm">{presentation.detail}</p>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Link to="/settings?section=sync" className="min-w-0">
            <Button variant="secondary" className="w-full sm:w-auto">
              Ver detalle
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => void syncNow(trackedBusinessId, 'manual')}
            disabled={isSyncing || !isOnline}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const OfflineSyncBanner = SyncAlertBanner;
