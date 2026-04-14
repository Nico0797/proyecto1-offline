import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import type { ServiceItem } from '../../types';
import { formatCOP } from './helpers';

interface ManageServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceItem[];
  onCreate: (data: Partial<ServiceItem>) => void;
  onUpdate: (id: number, data: Partial<ServiceItem>) => void;
  onRemove: (id: number) => void;
}

export const ManageServicesModal: React.FC<ManageServicesModalProps> = ({
  isOpen,
  onClose,
  services,
  onCreate,
  onUpdate,
  onRemove,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [category, setCategory] = useState('');

  const resetForm = () => { setName(''); setPrice(''); setDuration('60'); setCategory(''); setShowForm(false); setEditingId(null); };

  const handleSave = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), price: parseFloat(price) || 0, duration_minutes: parseInt(duration) || 60, category: category.trim() || null };
    if (editingId) { onUpdate(editingId, data); } else { onCreate(data); }
    resetForm();
  };

  const startEdit = (s: ServiceItem) => {
    setEditingId(s.id);
    setName(s.name);
    setPrice(String(s.price));
    setDuration(String(s.duration_minutes));
    setCategory(s.category ?? '');
    setShowForm(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Catalogo de servicios" maxWidth="max-w-xl">
      <div className="space-y-4">
        {services.length === 0 && !showForm && (
          <p className="text-sm app-text-muted text-center py-6">No hay servicios registrados aun.</p>
        )}

        {services.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-2xl border app-divider px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium app-text truncate">{s.name}</div>
              <div className="text-xs app-text-muted">{formatCOP(s.price)} · {s.duration_minutes} min{s.category ? ` · ${s.category}` : ''}</div>
            </div>
            <button type="button" onClick={() => startEdit(s)} className="app-text-muted hover:app-text p-1"><Edit2 className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => onRemove(s.id)} className="text-red-500 hover:text-red-600 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}

        {showForm && (
          <div className="space-y-3 rounded-2xl border app-divider p-3.5">
            <Input placeholder="Nombre del servicio *" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} min={0} />
              <Input type="number" placeholder="Min" value={duration} onChange={(e) => setDuration(e.target.value)} min={5} step={5} />
              <Input placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}><Check className="h-3.5 w-3.5" /> Guardar</Button>
              <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-3.5 w-3.5" /> Cancelar</Button>
            </div>
          </div>
        )}

        {!showForm && (
          <Button variant="outline" className="w-full" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Agregar servicio
          </Button>
        )}
      </div>
    </Modal>
  );
};
