import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, User, CheckCircle, Clock, AlertCircle, 
  Users, MoreVertical, Search, RefreshCw, MessageSquare, Edit, Download
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { TeamMember } from '../../types';
import api from '../../services/api';
import InviteMemberModal from './InviteMemberModal';
import EditMemberModal from './EditMemberModal';
import { useAuthStore } from '../../store/authStore';
import { Menu, Transition, Tab } from '@headlessui/react';
import { Fragment } from 'react';
import { useAccess } from '../../hooks/useAccess';
import { FeedbackList } from './FeedbackList';
import { EmployeeFeedbackPanel } from './EmployeeFeedbackPanel';

export default function TeamSettingsTab() {
  const { activeBusiness } = useBusinessStore();
  const { user } = useAuthStore();
  const { hasPermission } = useAccess();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Permission Checks
  const canManageTeam = hasPermission('team.manage');
  
  useEffect(() => {
    if (!activeBusiness) {
      setMembers([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (!canManageTeam) {
      setMembers([]);
      setError(null);
      setLoading(false);
      return;
    }

    fetchMembers();
  }, [activeBusiness, canManageTeam]);

  const fetchMembers = async () => {
    if (!activeBusiness || !canManageTeam) return;
    setLoading(true);
    try {
      const response = await api.get(`/businesses/${activeBusiness.id}/team`);
      setMembers(response.data.members);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      if (err.response?.status === 403) {
          setError("No tienes permisos para ver la lista completa del equipo.");
      } else {
          setError('Error al cargar miembros del equipo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('¿Estás seguro de eliminar este miembro del equipo?')) return;
    if (!activeBusiness) return;

    try {
      await api.delete(`/businesses/${activeBusiness.id}/team/${memberId}`);
      fetchMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Error al eliminar miembro');
    }
  };

  const handleExportTeam = () => {
    if (!activeBusiness || members.length === 0) return;
    
    const headers = ['ID', 'Nombre', 'Email', 'Rol', 'Estado', 'Fecha Registro'];
    const csvContent = [
      headers.join(','),
      ...members.map(m => [
        m.id, 
        `"${m.user_name || ''}"`, 
        m.user_email, 
        m.role, 
        m.status,
        m.created_at
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `equipo_${activeBusiness.id}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGradient = (roleName: string) => {
    switch (roleName?.toUpperCase()) {
        case 'ADMINISTRADOR': 
        case 'SUPERADMIN': return 'from-purple-500 to-indigo-600';
        case 'VENTAS': return 'from-emerald-400 to-teal-600';
        case 'CAJA Y COBRANZA': return 'from-blue-400 to-cyan-600';
        case 'INVENTARIO': return 'from-amber-400 to-orange-600';
        default: return 'from-gray-400 to-gray-600';
    }
  }

  // Filtering
  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      (member.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.user_email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = [
    { label: 'Total Miembros', value: members.length, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Activos', value: members.filter(m => m.status === 'active').length, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Pendientes', value: members.filter(m => m.status === 'invited').length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Tab.Group>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Equipo</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Gestión de colaboradores y comunicación.
                </p>
            </div>
            
            <Tab.List className="app-muted-panel flex space-x-1 rounded-xl p-1">
                <Tab as={Fragment}>
                    {({ selected }) => (
                    <button
                        className={`
                        w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5
                        ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                        ${selected
                            ? 'app-surface text-blue-700 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Colaboradores</span>
                        </div>
                    </button>
                    )}
                </Tab>
                <Tab as={Fragment}>
                    {({ selected }) => (
                    <button
                        className={`
                        w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5
                        ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                        ${selected
                            ? 'app-surface text-blue-700 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span>Buzón</span>
                        </div>
                    </button>
                    )}
                </Tab>
            </Tab.List>
        </div>

        <Tab.Panels className="mt-2">
            {/* Panel 1: Team Members */}
            <Tab.Panel className="outline-none">
                <div className="space-y-6">
                    {/* Actions Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nombre o correo..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="app-field-surface w-full rounded-lg py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="app-select"
                                >
                                    <option value="ALL">Todos los estados</option>
                                    <option value="active">Activos</option>
                                    <option value="invited">Pendientes</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                                {['ALL', 'ADMINISTRADOR', 'VENTAS', 'CAJA Y COBRANZA'].map(role => (
                                    <button
                                        key={role}
                                        onClick={() => setRoleFilter(role)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                                            roleFilter === role 
                                            ? 'bg-blue-600 text-white border-blue-600' 
                                            : 'app-surface text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {role === 'ALL' ? 'Todos' : role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Invite Button - Restricted */}
                        {canManageTeam && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportTeam}
                                    className="app-surface inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Exportar
                                </button>
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Invitar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats - Only for managers to save space or show to all? Let's show to all for transparency if they can see list */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {stats.map((stat, idx) => {
                            const Icon = stat.icon;
                            return (
                                <div key={idx} className="app-surface flex items-center gap-4 rounded-xl p-4 shadow-sm">
                                    <div className={`p-3 rounded-lg ${stat.bg}`}>
                                        <Icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{stat.label}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Members Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="app-surface h-40 rounded-xl p-6 animate-pulse" />
                        ))}
                        </div>
                    ) : !canManageTeam ? (
                        <div className="app-surface flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
                        <div className="app-muted-panel mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                            <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Acceso limitado</h3>
                        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                            No tienes permiso para consultar ni gestionar la lista completa del equipo.
                        </p>
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="app-surface flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
                        <div className="app-muted-panel mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                            <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No se encontraron miembros</h3>
                        {canManageTeam && (
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline text-sm"
                            >
                                Invitar al primero
                            </button>
                        )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredMembers.map((member) => (
                            <div 
                            key={member.id} 
                            className="app-surface group relative overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-md"
                            >
                            <div className="p-5 flex items-start gap-4">
                                {/* Avatar */}
                                <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getGradient(member.role)} flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0`}>
                                    {member.user_name ? member.user_name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate pr-2">{member.user_name || 'Usuario Invitado'}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.user_email}</p>
                                        </div>
                                        
                                        {/* Menu Actions - Restricted */}
                                        {canManageTeam && member.user_id !== user?.id && (
                                            <Menu as="div" className="relative ml-2">
                                                <Menu.Button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                    <MoreVertical className="w-5 h-5" />
                                                </Menu.Button>
                                                <Transition
                                                    as={Fragment}
                                                    enter="transition ease-out duration-100"
                                                    enterFrom="transform opacity-0 scale-95"
                                                    enterTo="transform opacity-100 scale-100"
                                                    leave="transition ease-in duration-75"
                                                    leaveFrom="transform opacity-100 scale-100"
                                                    leaveTo="transform opacity-0 scale-95"
                                                >
                                                    <Menu.Items className="app-surface absolute right-0 top-full z-10 mt-1 w-48 origin-top-right divide-y divide-gray-100 rounded-lg shadow-lg ring-1 ring-black/5 focus:outline-none dark:divide-gray-700">
                                                    <div className="p-1">
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                            <button
                                                                className={`${
                                                                    active ? 'bg-gray-50 dark:bg-gray-700' : ''
                                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700 dark:text-gray-200`}
                                                                onClick={() => {
                                                                    setEditingMember(member);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                            >
                                                                <Edit className="mr-2 h-4 w-4 text-gray-400" />
                                                                Editar rol
                                                            </button>
                                                            )}
                                                        </Menu.Item>
                                                        
                                                        {member.status === 'invited' && (
                                                            <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                className={`${
                                                                    active ? 'bg-gray-50 dark:bg-gray-700' : ''
                                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700 dark:text-gray-200`}
                                                                onClick={() => {/* TODO: Resend invite */}}
                                                                >
                                                                <RefreshCw className="mr-2 h-4 w-4 text-gray-400" />
                                                                Reenviar invitación
                                                                </button>
                                                            )}
                                                            </Menu.Item>
                                                        )}
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                            <button
                                                                className={`${
                                                                    active ? 'bg-red-50 dark:bg-red-900/20' : ''
                                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600 dark:text-red-400`}
                                                                onClick={() => handleRemoveMember(member.id)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar miembro
                                                            </button>
                                                            )}
                                                        </Menu.Item>
                                                    </div>
                                                    </Menu.Items>
                                                </Transition>
                                            </Menu>
                                        )}
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            member.role === 'ADMINISTRADOR' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' :
                                            member.role === 'VENTAS' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                                            'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                        }`}>
                                            {member.role}
                                        </span>
                                        
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            member.status === 'active' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : 
                                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                        }`}>
                                            {member.status === 'active' ? 'Activo' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
            </Tab.Panel>

            {/* Panel 2: Feedback */}
            <Tab.Panel className="outline-none">
                {canManageTeam ? (
                    <FeedbackList />
                ) : (
                    <EmployeeFeedbackPanel />
                )}
            </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      <InviteMemberModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSuccess={fetchMembers}
        businessId={activeBusiness?.id || 0}
      />
      
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => {
            setIsEditModalOpen(false);
            setEditingMember(null);
        }}
        onUpdateSuccess={fetchMembers}
        businessId={activeBusiness?.id || 0}
        member={editingMember}
      />
    </div>
  );
}
