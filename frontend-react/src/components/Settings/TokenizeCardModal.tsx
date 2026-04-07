import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
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
      const [mm, yy] = exp.replace(/\s+/g, '').split('/');
      const token = await wompiService.tokenizeCard({
        number: number.replace(/\s+/g, ''),
        cvc: cvc.trim(),
        exp_month: mm,
        exp_year: yy?.length === 2 ? `20${yy}` : yy,
        card_holder: holder,
      });
      const res = await api.post('/billing/save-payment-source', { token });
      if (!res.data?.success) throw new Error('No se pudo guardar el metodo de pago');
      onSuccess();
    } catch (e: any) {
      alert(e?.message || 'Error al actualizar metodo de pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Actualizar metodo de pago">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">Usar tarjeta</div>
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
            className="app-surface rounded-lg px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Google Pay
          </button>
        </div>

        <Input
          label="Titular"
          placeholder="Nombre como aparece en la tarjeta"
          autoComplete="cc-name"
          name="cc-name"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
        />

        <Input
          label="Numero de tarjeta"
          placeholder="0000 0000 0000 0000"
          autoComplete="cc-number"
          name="cc-number"
          inputMode="numeric"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Vencimiento"
            placeholder="MM/AAAA"
            autoComplete="cc-exp"
            name="cc-exp"
            inputMode="numeric"
            value={exp}
            onChange={(e) => setExp(e.target.value)}
          />
          <Input
            label="CVC"
            placeholder="CVC"
            autoComplete="cc-csc"
            name="cc-csc"
            inputMode="numeric"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </div>
    </Modal>
  );
};
