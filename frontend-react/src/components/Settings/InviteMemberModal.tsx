import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Shield, User, DollarSign, PieChart, Check } from 'lucide-react';
import api from '../../services/api';
import { Role } from '../../types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess: () => void;
  businessId: number;
}

export default function InviteMemberModal({ isOpen, onClose, onInviteSuccess, businessId }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      setEmail('');
      setRoleId('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const response = await api.get('/roles', { params: { business_id: businessId } });
      const fetchedRoles = Array.isArray(response.data.roles)
        ? response.data.roles.filter((role: Role) => role.name !== 'SUPERADMIN')
        : [];
      setRoles(fetchedRoles);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Error al cargar roles');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !roleId) {
        setError('Por favor completa todos los campos');
        return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post(`/businesses/${businessId}/team/invite`, {
        email: email.trim(), // Trim whitespace
        role_id: Number(roleId)
      });
      
      if (res.data.email_sent) {
         setSuccessMsg(
             <div className="flex flex-col gap-1">
                <span>Invitación enviada correctamente.</span>
                <span className="text-xs font-normal text-gray-500">
                    El usuario recibirá un correo con las instrucciones.
                </span>
             </div>
         );
      } else {
         // Email failed or Dev Mode
         const inviteUrl = res.data.invite_url || res.data.dev_url || `${window.location.origin}/accept-invite?token=${res.data.debug_token}`;
         setSuccessMsg(
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-yellow-400">
                    <span>⚠</span>
                    <span>{res.data.debug_token ? "Modo Desarrollo" : "Correo no enviado"}</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                    {res.data.debug_token ? "Simulación de envío." : "La invitación se creó pero el correo falló."}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Copia este enlace manualmente:</span>
                <div className="break-all rounded border border-amber-200 bg-amber-50 p-2 font-mono text-xs text-blue-700 select-all dark:border-yellow-500/30 dark:bg-black/30 dark:text-blue-300">
                    {inviteUrl}
                </div>
            </div>
         );
      }

      setTimeout(() => {
          onInviteSuccess();
          onClose();
      }, (res.data.email_sent) ? 2000 : 15000); // Give more time to copy link if email failed
    } catch (err: any) {
      console.error('Error inviting member:', err);
      setError(err.response?.data?.error || 'Error al enviar invitación');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toUpperCase()) {
      case 'ADMINISTRADOR': 
      case 'SUPERADMIN': return <Shield className="w-5 h-5 text-purple-600" />;
      case 'VENTAS': return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'CAJA Y COBRANZA': return <PieChart className="w-5 h-5 text-blue-600" />;
      case 'INVENTARIO': return <div className="w-5 h-5 text-amber-600">📦</div>;
      default: return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="app-surface w-full max-w-lg transform overflow-hidden rounded-2xl text-left align-middle shadow-2xl transition-all">
                {/* Header with Gradient */}
                <div className="relative border-b border-gray-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/80 p-6 pb-8 dark:border-gray-800 dark:from-[#0f1420] dark:via-[#111827] dark:to-[#0f172a]">
                  <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3 mb-2">
                    <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 dark:text-white">
                      Nuevo Miembro
                    </Dialog.Title>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Envía una invitación por correo para unirse a tu equipo.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 rounded-b-2xl bg-white p-6 dark:bg-[#111827]">
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                      <div className="mt-0.5 min-w-[16px]">⚠️</div>
                      {error}
                    </div>
                  )}
                  {successMsg && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
                      <div className="mt-0.5 min-w-[16px]">✅</div>
                      {successMsg}
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@empresa.com"
                        required
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-all placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Seleccionar Rol
                    </label>
                    
                    {rolesLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse dark:bg-[#0f172a]" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {roles.map((role) => (
                          <div 
                            key={role.id}
                            onClick={() => setRoleId(role.id)}
                            className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${
                              roleId === role.id 
                                ? 'border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-500/10'
                                : 'border-gray-200 bg-slate-50 hover:border-gray-300 dark:border-gray-700 dark:bg-[#0f172a] dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 p-1.5 rounded-lg ${
                                roleId === role.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 group-hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:text-gray-300'
                              } transition-colors`}>
                                {getRoleIcon(role.name)}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className={`font-semibold ${roleId === role.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-200'}`}>
                                        {role.name}
                                    </span>
                                    {roleId === role.id && (
                                        <div className="bg-blue-500 text-white p-0.5 rounded-full">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm leading-snug text-gray-600 dark:text-gray-500">
                                  {role.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl px-6 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || rolesLoading}
                      className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all transform active:scale-95"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <span>Enviar Invitación</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
