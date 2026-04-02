import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Shield, User, DollarSign, PieChart } from 'lucide-react';
import api from '../../services/api';
import { Role, TeamMember } from '../../types';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
  businessId: number;
  member: TeamMember | null;
}

export default function EditMemberModal({ isOpen, onClose, onUpdateSuccess, businessId, member }: EditMemberModalProps) {
  const [roleId, setRoleId] = useState<number | ''>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && member) {
      fetchRoles();
      setRoleId(member.role_id || ''); // Assume member has role_id
      setError(null);
    }
  }, [isOpen, member]);

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
    if (!roleId || !member) return;

    setLoading(true);
    setError(null);

    try {
      await api.put(`/businesses/${businessId}/team/${member.id}`, {
        role_id: Number(roleId)
      });
      onUpdateSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating member:', err);
      setError(err.response?.data?.error || 'Error al actualizar miembro');
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-[#1e293b] text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900 dark:text-white">
                    Editar Rol de {member?.user_name}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Seleccionar Nuevo Rol
                    </label>
                    
                    {rolesLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {roles.map((role) => (
                          <div 
                            key={role.id}
                            onClick={() => setRoleId(role.id)}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                              roleId === role.id 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className={`p-2 rounded-lg mr-3 ${
                              roleId === role.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                              {getRoleIcon(role.name)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{role.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{role.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || rolesLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
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
