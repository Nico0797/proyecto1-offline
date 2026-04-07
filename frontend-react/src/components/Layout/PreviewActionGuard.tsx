import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDemoPreview } from '../../hooks/useDemoPreview';

const SENSITIVE_ACTION_PATTERN = /\b(importar|sincronizar|sync|invitar|equipo|miembros?|billing|suscripci[oó]n|membres[ií]a|checkout|portal de pago|payment method|m[eé]todo de pago|facturaci[oó]n|subir logo|cargar logo)\b/i;

const buildElementLabel = (element: HTMLElement | null) => {
  if (!element) return '';
  const directText = (element.textContent || '').trim().replace(/\s+/g, ' ');
  const ariaLabel = element.getAttribute('aria-label') || '';
  const title = element.getAttribute('title') || '';
  const value = element instanceof HTMLInputElement ? element.value || '' : '';
  return `${ariaLabel} ${title} ${value} ${directText}`.trim();
};

const isSensitivePreviewActionElement = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest<HTMLElement>('button, a, [role="button"], input[type="button"], input[type="submit"]');
  if (!interactive) return false;
  if (interactive.dataset.previewAllow === 'true') return false;
  const label = buildElementLabel(interactive);
  const href = interactive instanceof HTMLAnchorElement ? interactive.getAttribute('href') || '' : '';
  const action = interactive.getAttribute('data-action') || '';
  const intentLabel = `${label} ${href} ${action}`.trim();
  return SENSITIVE_ACTION_PATTERN.test(intentLabel);
};

export const PreviewActionGuard = () => {
  const { isDemoPreview } = useDemoPreview();

  useEffect(() => {
    if (!isDemoPreview) {
      return undefined;
    }

    const notify = () => {
      toast('Esta acción requiere un plan activo. En la vista previa interactiva puedes probar formularios, pero importaciones, sincronización y ajustes sensibles quedan protegidos.');
    };

    const handleClick = (event: MouseEvent) => {
      if (!isSensitivePreviewActionElement(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      notify();
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || form.dataset.previewAllow === 'true') {
        return;
      }
      const actionLabel = [
        form.getAttribute('aria-label') || '',
        form.getAttribute('data-action') || '',
        form.getAttribute('action') || '',
        form.textContent || '',
      ].join(' ');

      if (!SENSITIVE_ACTION_PATTERN.test(actionLabel)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      notify();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, [isDemoPreview]);

  return null;
};
