import { useMemo } from 'react';
import { useAccountAccessStore } from '../store/accountAccessStore';

export const getDemoPreviewSnapshot = () => {
  const access = useAccountAccessStore.getState().access;
  return {
    isDemoPreview: Boolean(access?.demo_preview_active),
    canStartDemoPreview: Boolean(access?.demo_preview_available),
    demoBusinessId: access?.demo_business_id ?? null,
    demoBusinessName: access?.demo_business_name ?? null,
  };
};

export const useDemoPreview = () => {
  const access = useAccountAccessStore((state) => state.access);

  return useMemo(() => ({
    isDemoPreview: Boolean(access?.demo_preview_active),
    canStartDemoPreview: Boolean(access?.demo_preview_available),
    demoBusinessId: access?.demo_business_id ?? null,
    demoBusinessName: access?.demo_business_name ?? null,
  }), [access]);
};
