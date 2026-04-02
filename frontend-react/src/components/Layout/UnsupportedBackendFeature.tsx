import { AlertTriangle } from 'lucide-react';
import { TeachingEmptyState } from '../ui/TeachingEmptyState';
import { BackendCapability, getBackendCapabilityLabel, getBackendCapabilitySupportMessage } from '../../config/backendCapabilities';

interface UnsupportedBackendFeatureProps {
  capability: BackendCapability;
  backTo?: string;
}

export const UnsupportedBackendFeature = ({ capability, backTo = '/dashboard' }: UnsupportedBackendFeatureProps) => {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-3 shadow-sm dark:border-amber-900/30 dark:bg-gray-950">
        <TeachingEmptyState
          icon={AlertTriangle}
          title={`${getBackendCapabilityLabel(capability)} no disponible en este backend`}
          description={getBackendCapabilitySupportMessage(capability)}
          secondaryActionLabel="Volver"
          onSecondaryAction={() => {
            window.location.assign(backTo);
          }}
        />
      </div>
    </div>
  );
};
