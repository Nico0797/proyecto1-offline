import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';

export const SupportWhatsAppButton = ({ className = '' }: { className?: string }) => {
  const { user } = useAuthStore();
  const { activeBusiness } = useBusinessStore();

  const handleClick = () => {
    const business = activeBusiness?.name || 'Sin negocio';
    const email = user?.email || 'sin-email';
    const screen = window.location.pathname;
    const when = new Date().toLocaleString();
    const msg = `Hola, necesito ayuda.\nNegocio: ${business}\nUsuario: ${email}\nPantalla: ${screen}\nFecha: ${when}`;
    const url = `https://wa.me/573192426874?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-success-soft-border)] bg-[color:color-mix(in_srgb,var(--app-success-soft)_88%,white_12%)] px-4 py-3 text-sm font-medium text-[color:color-mix(in_srgb,var(--app-success)_82%,var(--app-text)_18%)] shadow-[var(--app-shadow-soft)] transition hover:-translate-y-[1px] hover:brightness-105 ${className}`}
    >
      <MessageCircle className="w-4 h-4" />
      Soporte por WhatsApp
    </button>
  );
};
