import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MessageCircle, Copy, Check } from 'lucide-react';

interface WhatsAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  customerName: string;
  messageType?: 'greeting' | 'collection' | 'statement';
  balance?: number;
}

export const WhatsAppPreviewModal: React.FC<WhatsAppPreviewModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  customerName,
  messageType = 'greeting',
  balance = 0,
}) => {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      let template = '';
      switch (messageType) {
        case 'greeting':
          template = `Hola ${customerName}, esperamos que estés muy bien. Gracias por tu confianza en nuestro negocio.`;
          break;
        case 'collection':
          template = `Hola ${customerName}, te recordamos que tienes un saldo pendiente de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(balance)}. Agradecemos tu pronto pago.`;
          break;
        case 'statement':
          template = `Hola ${customerName}, este es tu estado de cuenta actual: Saldo pendiente ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(balance)}. Si necesitas más detalles, avísanos.`;
          break;
        default:
          template = `Hola ${customerName},`;
      }
      setMessage(template);
    }
  }, [isOpen, messageType, customerName, balance]);

  const handleSend = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    // Use 57 as default country code if not present (assuming Colombia based on COP currency context)
    const finalPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    
    window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar Mensaje de WhatsApp">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Destinatario: <span className="font-bold">{customerName}</span> ({phoneNumber})
          </label>
          <div className="relative">
             <textarea
                className="w-full h-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
             />
             <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-gray-100 dark:bg-gray-600 rounded-md text-gray-500 dark:text-gray-300 hover:text-green-600 transition-colors"
                title="Copiar texto"
             >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
             </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">
             {message.length} caracteres
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white border-none">
             <MessageCircle className="w-4 h-4 mr-2" /> Enviar WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
};
