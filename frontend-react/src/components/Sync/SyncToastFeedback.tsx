import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useOfflineSyncStore } from '../../store/offlineSyncStore';

export const SyncToastFeedback = () => {
  const lastToastEvent = useOfflineSyncStore((state) => state.lastToastEvent);
  const lastHandledId = useRef<number | null>(null);

  useEffect(() => {
    if (!lastToastEvent || lastHandledId.current === lastToastEvent.id) {
      return;
    }

    lastHandledId.current = lastToastEvent.id;
    const message = lastToastEvent.description
      ? `${lastToastEvent.title}. ${lastToastEvent.description}`
      : lastToastEvent.title;

    if (lastToastEvent.tone === 'success') {
      toast.success(message, { position: 'top-center' });
      return;
    }

    if (lastToastEvent.tone === 'error') {
      toast.error(message, { position: 'top-center' });
      return;
    }

    toast(message, {
      position: 'top-center',
      icon: lastToastEvent.tone === 'warning' ? '!' : 'i',
    });
  }, [lastToastEvent]);

  return null;
};
