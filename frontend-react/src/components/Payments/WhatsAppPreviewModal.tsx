import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MessageSquare, Copy, Send, Phone } from 'lucide-react';
import { ClientReceivable } from '../../utils/receivables.compute';
import { Input } from '../ui/Input';

interface WhatsAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientReceivable | null;
  message: string;
}

export const WhatsAppPreviewModal: React.FC<WhatsAppPreviewModalProps> = ({
  isOpen,
  onClose,
  client,
  message
}) => {
  const [phoneNumber, setPhoneNumber] = useState(client?.phone || '');
  const [editableMessage, setEditableMessage] = useState(message);

  useEffect(() => {
    if (client) {
        setPhoneNumber(client.phone || '');
    }
    setEditableMessage(message);
  }, [client, message]);

  const handleSend = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Por favor ingresa un número de teléfono válido.');
      return;
    }
    const url = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(editableMessage)}`;
    window.open(url, '_blank');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableMessage);
    alert('Mensaje copiado al portapapeles.');
  };

  if (!isOpen || !client) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enviar WhatsApp"
      className="max-w-md"
    >
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Recordatorio de Pago</p>
            <p className="text-sm text-gray-500">Para: {client.customerName}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Número de Teléfono (sin +57)
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="3001234567"
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mensaje
          </label>
          <textarea
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            variant="secondary" 
            onClick={handleCopy}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </Button>
          <Button 
            onClick={handleSend}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none"
            disabled={!phoneNumber}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
};
