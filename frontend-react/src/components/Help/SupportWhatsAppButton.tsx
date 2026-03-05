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
      className={`px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium flex items-center gap-2 ${className}`}
    >
      <MessageCircle className="w-4 h-4" />
      Soporte por WhatsApp
    </button>
  );
};
