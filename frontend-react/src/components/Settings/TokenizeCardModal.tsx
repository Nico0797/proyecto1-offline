import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { wompiService } from '../../services/wompiService';
import api from '../../services/api';

interface Props { onClose: () => void; onSuccess: () => void; }

export const TokenizeCardModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [holder, setHolder] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!number || !exp || !cvc || !holder) return;
    setLoading(true);
    try {
      const [mm, yy] = exp.replace(/\s+/g,'').split('/');
      const token = await wompiService.tokenizeCard({
        number: number.replace(/\s+/g,''),
        cvc: cvc.trim(),
        exp_month: mm,
        exp_year: yy?.length === 2 ? `20${yy}` : yy,
        card_holder: holder
      });
      const res = await api.post('/billing/save-payment-source', { token });
      if (!res.data?.success) throw new Error('No se pudo guardar el método de pago');
      onSuccess();
    } catch (e:any) {
      alert(e?.message || 'Error al actualizar método de pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Actualizar método de pago">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">Usar tarjeta</div>
          <button
            onClick={async () => {
              try {
                const gpayToken = await wompiService.requestGooglePayToken();
                const res = await api.post('/billing/save-googlepay-source', { token: gpayToken });
                if (!res.data?.success) throw new Error('No se pudo guardar Google Pay');
                onSuccess();
              } catch (e: any) {
                alert(e?.message || 'Google Pay no disponible');
              }
            }}
            className="text-sm px-3 py-1 rounded bg-white text-black hover:bg-gray-200"
          >
            Google Pay
          </button>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Titular</label>
          <input className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" placeholder="Nombre como aparece en la tarjeta" autoComplete="cc-name" name="cc-name" value={holder} onChange={e=>setHolder(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Número de tarjeta</label>
          <input className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" placeholder="0000 0000 0000 0000" autoComplete="cc-number" name="cc-number" inputMode="numeric" value={number} onChange={e=>setNumber(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Vencimiento</label>
            <input className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" placeholder="MM/AAAA" autoComplete="cc-exp" name="cc-exp" inputMode="numeric" value={exp} onChange={e=>setExp(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">CVC</label>
            <input className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" placeholder="CVC" autoComplete="cc-csc" name="cc-csc" inputMode="numeric" value={cvc} onChange={e=>setCvc(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </div>
    </Modal>
  );
};
