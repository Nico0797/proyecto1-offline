import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Building2,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminTable, Column } from '../../components/Admin/ui/AdminTable';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { AdminCard } from '../../components/Admin/ui/AdminCard';

interface AdminEmployee {
  id: number;
  name: string;
  email: string;
  business_name?: string;
  is_active: boolean;
  last_login?: string;
  roles?: any[];
  created_at?: string;
}

interface BusinessOption {
  id: number;
  name: string;
  owner_email: string;
}

interface Role {
  id: number;
  name: string;
}

export const AdminEmployees = () => {
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Data sources
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<AdminEmployee | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    linked_business_id: '',
    role_id: '',
    is_active: true
  });
  
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users', {
        params: {
          page,
          per_page: itemsPerPage,
          search,
          account_type: 'team_member'
        }
      });
      
      const employeesData = res.data.users || [];
      // If we need to enrich with business name but API doesn't provide it yet
      // Check if employeesData has business_name
      
      setEmployees(employeesData);
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err: any) {
      console.error('Error al cargar empleados', err);
      // Handle 404/403 specifically if needed
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [bizRes, rolesRes] = await Promise.all([
        api.get('/admin/businesses'),
        api.get('/admin/roles').catch(() => ({ data: { roles: [] } })) // Fallback if admin/roles not specific
      ]);
      
      // If /admin/roles doesn't exist, try /roles (might need admin token context)
      // Actually main.py has /api/roles. Let's use that if /admin/roles fails or use what we have.
      // Wait, main.py has `get_roles` at `/api/roles`.
      
      setBusinesses(bizRes.data.businesses || []);
      
      // For roles, we might want to fetch from /api/roles
      if (!rolesRes.data.roles && !rolesRes.data.length) {
         const r = await api.get('/roles');
         setRoles(r.data.roles || []);
      } else {
         setRoles(rolesRes.data.roles || []);
      }
      
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, search]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        account_type: 'team_member',
        linked_business_id: formData.linked_business_id,
        role_id: formData.role_id, // Send single role for team member primary role
        is_active: true
      });
      setIsCreateModalOpen(false);
      toast.success('Empleado creado exitosamente');
      fetchEmployees();
      // Reset form
      setFormData({ name: '', email: '', password: '', linked_business_id: '', role_id: '', is_active: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear empleado');
    }
  };

  const handleEdit = async (employee: AdminEmployee) => {
    // For editing, we might need to fetch details to get linked_business_id if not present in list
    // But list has business_name.
    // The update endpoint might not support changing business easily.
    // Let's just allow editing basic info + active status.
    
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '',
      linked_business_id: '', // Disable editing business for now or fetch if needed
      role_id: '', // Disable editing role here for simplicity or add logic
      is_active: employee.is_active
    });
    
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    
    try {
      await api.put(`/admin/users/${selectedEmployee.id}`, {
        name: formData.name,
        email: formData.email,
        is_active: formData.is_active,
        // Don't update business/role for now in this simple edit
      });
      
      setIsEditModalOpen(false);
      toast.success('Empleado actualizado');
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este empleado? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Empleado eliminado');
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const columns: Column<AdminEmployee>[] = [
    {
      header: 'Empleado',
      cell: (user) => (
        <div>
          <div className="font-medium text-white">{user.name}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>
      )
    },
    {
      header: 'Negocio',
      cell: (user) => (
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-indigo-400" />
          <span className="text-sm text-slate-300">{user.business_name || 'Sin Asignar'}</span>
        </div>
      )
    },
    {
      header: 'Rol',
      cell: (user) => (
        <div className="flex gap-1 flex-wrap">
           {user.roles && user.roles.length > 0 ? (
             user.roles.map((r: any) => (
               <span key={r.id} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                 {r.name}
               </span>
             ))
           ) : (
             <span className="text-xs text-slate-600">Sin Rol</span>
           )}
        </div>
      )
    },
    {
      header: 'Estado',
      cell: (user) => (
        <StatusBadge variant={user.is_active ? 'success' : 'error'} icon>
          {user.is_active ? 'Activo' : 'Inactivo'}
        </StatusBadge>
      )
    },
    {
      header: 'Creado',
      accessorKey: 'created_at',
      cell: (user) => user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'
    },
    {
      header: 'Acciones',
      align: 'right',
      cell: (user) => (
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Gestión de Empleados (Subcuentas)" 
        description="Administra todas las cuentas de equipo vinculadas a negocios."
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} /> Nuevo Empleado
          </Button>
        }
      />

      <AdminCard noPadding>
        <div className="p-4 border-b border-white/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o negocio..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={employees}
          isLoading={loading}
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            onPageChange: setPage,
            totalItems: totalItems,
            itemsPerPage: itemsPerPage
          }}
        />
      </AdminCard>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Alta de Nuevo Empleado"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nombre Completo"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input
            label="Email Corporativo"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            placeholder="empleado@empresa.com"
          />
          <Input
            label="Contraseña Temporal"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Negocio (Empresa)</label>
            <div className="relative">
                <Building2 className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <select
                value={formData.linked_business_id}
                onChange={(e) => setFormData({...formData, linked_business_id: e.target.value})}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                >
                <option value="">Seleccionar Negocio...</option>
                {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                    {b.name} ({b.owner_email})
                    </option>
                ))}
                </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol Asignado</label>
            <div className="relative">
                <Users className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <select
                value={formData.role_id}
                onChange={(e) => setFormData({...formData, role_id: e.target.value})}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                >
                <option value="">Seleccionar Rol...</option>
                {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                ))}
                </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">El rol define los permisos del empleado dentro del negocio.</p>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit">Crear Cuenta de Empleado</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal (Simplified) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Empleado"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            disabled // Email change not supported in simple edit
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
            <select
            value={String(formData.is_active)}
            onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
            <option value="true">Activo</option>
            <option value="false">Inactivo (Suspendido)</option>
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit">Guardar Cambios</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
