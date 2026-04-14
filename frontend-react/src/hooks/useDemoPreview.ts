import { useMemo } from 'react';
import { useAccountAccessStore } from '../store/accountAccessStore';
import { isOfflineProductMode } from '../runtime/runtimeMode';

export const getDemoPreviewSnapshot = () => {
  const access = useAccountAccessStore.getState().access;
  const offlineProductMode = isOfflineProductMode();
  return {
    isDemoPreview: offlineProductMode ? false : Boolean(access?.demo_preview_active),
    canStartDemoPreview: offlineProductMode ? false : Boolean(access?.demo_preview_available),
    demoBusinessId: access?.demo_business_id ?? null,
    demoBusinessName: access?.demo_business_name ?? null,
  };
};

export const useDemoPreview = () => {
  const access = useAccountAccessStore((state) => state.access);
  const offlineProductMode = isOfflineProductMode();

  return useMemo(() => ({
    isDemoPreview: offlineProductMode ? false : Boolean(access?.demo_preview_active),
    canStartDemoPreview: offlineProductMode ? false : Boolean(access?.demo_preview_available),
    demoBusinessId: access?.demo_business_id ?? null,
    demoBusinessName: access?.demo_business_name ?? null,
  }), [access, offlineProductMode]);
};
