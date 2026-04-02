import { useEffect, useState } from 'react';
import { Copy, MessageCircleMore, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface InvoiceMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  contactName?: string | null;
  initialPhone?: string | null;
  initialMessage: string;
}

export const InvoiceMessageModal = ({
  isOpen,
  onClose,
  title,
  description,
  contactName,
  initialPhone,
  initialMessage,
}: InvoiceMessageModalProps) => {
  const [phone, setPhone] = useState(initialPhone || '');
  const [message, setMessage] = useState(initialMessage || '');

  useEffect(() => {
    setPhone(initialPhone || '');
  }, [initialPhone]);

  useEffect(() => {
    setMessage(initialMessage || '');
  }, [initialMessage]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Mensaje copiado al portapapeles');
    } catch (error) {
      toast.error('No fue posible copiar el mensaje');
    }
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-200">
          <div className="font-semibold">{contactName || 'Mensaje listo para compartir'}</div>
          {description && <div className="mt-1 text-green-700/90 dark:text-green-200/80">{description}</div>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Telefono
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="3001234567"
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mensaje
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-[240px] w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-900/50 dark:focus:ring-blue-900/30"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={handleCopy} className="w-full sm:w-auto">
            <Copy className="h-4 w-4" /> Copiar mensaje
          </Button>
          <Button onClick={handleOpenWhatsApp} className="w-full sm:w-auto">
            <MessageCircleMore className="h-4 w-4" /> Abrir WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
};
