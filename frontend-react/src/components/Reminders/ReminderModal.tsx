import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Reminder, CreateReminderDTO, Priority } from '../../services/reminderService';
import { Tag, Calendar, Clock, AlertCircle } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateReminderDTO) => void;
  initialData?: Reminder | null;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setPriority(initialData.priority);
      setDueDate(initialData.dueDate || '');
      setDueTime(initialData.dueTime || '');
      setTags(initialData.tags.join(', '));
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('medium');
    setDueDate('');
    setDueTime('');
    setTags('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;

    onSave({
      title,
      content,
      priority,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
    });
    onClose();
  };

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: 'Baja', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { value: 'medium', label: 'Media', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { value: 'high', label: 'Alta', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Llamar a proveedor"
            required
            autoFocus
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Nota / Descripción
          </label>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detalles adicionales..."
              maxLength={500}
              className="w-full h-24 bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm"
            />
            <span className="absolute bottom-2 right-2 text-xs text-gray-500">
              {content.length}/500
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Calendar className="w-4 h-4 inline-block mr-1" /> Fecha
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Clock className="w-4 h-4 inline-block mr-1" /> Hora
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <AlertCircle className="w-4 h-4 inline-block mr-1" /> Prioridad
          </label>
          <div className="flex gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                  priority === p.value
                    ? p.color + ' ring-2 ring-offset-1 ring-offset-gray-800 ring-gray-500'
                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Input
            label="Etiquetas (separadas por comas)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Ej: personal, urgente, ventas"
            className="bg-gray-700 border-gray-600 text-white"
            icon={Tag}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Guardar Cambios' : 'Crear Recordatorio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
