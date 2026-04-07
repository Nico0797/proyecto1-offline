import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { membershipService } from '../../services/membershipService';

interface Props { onClose: () => void; onSuccess: () => void; }

export const LinkNequiModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [prefix, setPrefix] = useState('+57');
  const [loading, setLoading] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const submit = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const result = await membershipService.saveNequiSource(phone.replace(/\D/g,''), prefix);
      if (result?.pending && result?.token) {
        setPendingToken(result.token);
        setStatusMsg('Revisa tu app Nequi y aprueba la suscripción. Verificando...');
        setLogs(l => [...l, 'Token NEQUI creado. Esperando aprobación del usuario.']);
        // Poll every 3s up to ~60s
        const started = Date.now();
        const poll = async () => {
          try {
            const r = await membershipService.checkNequiToken(result.token!, phone.replace(/\D/g,''));
            if (r?.success) {
              setLogs(l => [...l, 'Aprobación confirmada y fuente creada.']);
              onSuccess();
              return;
            }
            if (Date.now() - started > 60000) {
              setStatusMsg('Tiempo de verificación agotado. Intenta de nuevo.');
              setLogs(l => [...l, 'Tiempo agotado sin aprobación.']);
              setLoading(false);
              return;
            }
            setLogs(l => [...l, 'Seguimos esperando aprobación...']);
            setTimeout(poll, 3000);
          } catch (e:any) {
            setStatusMsg(e?.message || 'Error verificando autorización en Nequi');
            setLogs(l => [...l, `Error en verificación: ${e?.message || 'desconocido'}`]);
            setLoading(false);
          }
        };
        poll();
      } else {
        setLogs(l => [...l, 'Fuente NEQUI creada de inmediato.']);
        onSuccess();
      }
    } catch (e:any) {
      alert(e?.message || 'Error al conectar Nequi');
    } finally {
      if (!pendingToken) setLoading(false);
    }
  };
  const retry = async () => {
    if (!pendingToken) return;
    setLoading(true);
    try {
      const r = await membershipService.checkNequiToken(pendingToken, phone.replace(/\D/g,''));
      if (r?.success) {
        setLogs(l => [...l, 'Aprobación confirmada tras reintento.']);
        onSuccess();
      } else {
        setStatusMsg('Sigue pendiente. Reintenta en unos segundos.');
        setLogs(l => [...l, 'Sigue pendiente tras reintento.']);
      }
    } catch (e:any) {
      setStatusMsg(e?.message || 'Error en reintento');
      setLogs(l => [...l, `Error en reintento: ${e?.message || 'desconocido'}`]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal isOpen={true} onClose={onClose} title="Conectar Nequi">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Prefijo</label>
            <select className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" value={prefix} onChange={e=>setPrefix(e.target.value)}>
              <option value="+57">+57 CO</option>
              <option value="+58">+58 VE</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Teléfono</label>
            <input className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" placeholder="300 000 0000" inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value)} />
          </div>
        </div>
        <div className="text-sm text-gray-400">Se solicitará autorización en Nequi para débito automático.</div>
        {logs.length > 0 && (
          <div className="max-h-28 overflow-auto bg-gray-900/60 border border-gray-700 rounded p-2 text-xs text-gray-400">
            {logs.map((l,i)=>(<div key={i}>• {l}</div>))}
          </div>
        )}
        {pendingToken && <div className="text-sm text-yellow-400">{statusMsg}</div>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          {pendingToken ? (
            <Button onClick={retry} disabled={loading}>{loading ? 'Verificando...' : 'Reintentar verificación'}</Button>
          ) : (
            <Button onClick={submit} disabled={loading}>{loading ? 'Conectando...' : 'Conectar'}</Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
export default LinkNequiModal;
