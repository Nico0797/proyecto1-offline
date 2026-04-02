import { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Plus, Trash2, Edit2, Lock, AlertCircle, Save,
  Briefcase, UserCog, DollarSign, Package, Eye
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useBusinessStore } from '../../store/businessStore';
import { BusinessRbacRoleTemplate, Role } from '../../types';

interface Permission {
  id?: number;
  name: string;
  description: string;
  category: string;
}

const ORDERED_CATEGORIES = [
  'commercial', 'receivables', 'products', 'production', 'raw_inventory', 'finance', 'reports', 'settings', 'team'
];

const CATEGORY_LABELS: Record<string, string> = {
  commercial: 'Comercial',
  receivables: 'Cartera y cobros',
  products: 'Productos',
  production: 'Producción',
  raw_inventory: 'Bodega e insumos',
  finance: 'Finanzas',
  reports: 'Reportes y análisis',
  settings: 'Configuración',
  team: 'Equipo'
};

const PREDEFINED_ROLES_ORDER = [
  'PROPIETARIO',
  'ADMINISTRADOR',
  'VENTAS / CAJA',
  'COTIZACIONES / PEDIDOS',
  'CARTERA / COBROS',
  'INVENTARIO PRODUCTO TERMINADO',
  'BODEGA / MATERIAS PRIMAS',
  'PRODUCCIÓN',
  'COMPRAS',
  'ANALISTA / SOLO LECTURA'
];

// Helper for icons based on role name
const getRoleIcon = (roleName: string) => {
  const normalized = roleName.toUpperCase();
  if (normalized.includes('PROPIETARIO')) return <Shield className="w-4 h-4 mr-2 text-purple-600" />;
  if (normalized.includes('ADMIN')) return <UserCog className="w-4 h-4 mr-2 text-blue-600" />;
  if (normalized.includes('VENTAS')) return <Briefcase className="w-4 h-4 mr-2 text-green-600" />;
  if (normalized.includes('CAJA') || normalized.includes('COBRANZA')) return <DollarSign className="w-4 h-4 mr-2 text-amber-600" />;
  if (normalized.includes('INVENTARIO')) return <Package className="w-4 h-4 mr-2 text-indigo-600" />;
  if (normalized.includes('LECTURA')) return <Eye className="w-4 h-4 mr-2 text-gray-600" />;
  return <Shield className="w-4 h-4 mr-2 text-gray-400" />;
};

export const RolesPermissionsTab = () => {
  const { activeBusiness } = useBusinessStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [suggestedRoles, setSuggestedRoles] = useState<BusinessRbacRoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, [activeBusiness?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles', { params: { business_id: activeBusiness?.id } }),
        api.get('/permissions', { params: { scope: 'business', business_id: activeBusiness?.id } })
      ]);
      
      let fetchedRoles: Role[] = rolesRes.data.roles;
      
      // Filter out SUPERADMIN just in case backend leaks it
      fetchedRoles = fetchedRoles.filter(r => r.name !== 'SUPERADMIN');
      
      setRoles(fetchedRoles);
      setPermissions(permsRes.data.permissions);
      setSuggestedRoles(Array.isArray(rolesRes.data.suggested_roles) ? rolesRes.data.suggested_roles : []);
      
      // Select first role by default if none selected
      if (!selectedRole && fetchedRoles.length > 0) {
        // Try to select Propietario or first available
        const prop = fetchedRoles.find(r => r.name === 'PROPIETARIO');
        setSelectedRole(prop || fetchedRoles[0]);
      } else if (selectedRole) {
        const refreshedSelection = fetchedRoles.find((role) => role.id === selectedRole.id);
        if (refreshedSelection) {
          setSelectedRole(refreshedSelection);
        }
      }
    } catch (err) {
      console.error('Error fetching roles/permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sort roles for display
  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => {
      const indexA = PREDEFINED_ROLES_ORDER.indexOf(a.name);
      const indexB = PREDEFINED_ROLES_ORDER.indexOf(b.name);
      
      // If both are predefined, sort by order
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      
      // If only A is predefined, it comes first
      if (indexA !== -1) return -1;
      
      // If only B is predefined, it comes first
      if (indexB !== -1) return 1;
      
      // Both custom: sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [roles]);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setFormData({ name: '', description: '', permissions: [] });
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    // Only update form data, don't change selection yet
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions
    });
    setIsModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedRole && isModalOpen) {
        // Update existing (via Modal)
        await api.put(`/roles/${selectedRole.id}`, { ...formData, business_id: activeBusiness?.id });
      } else {
        // Create new
        const res = await api.post('/roles', { ...formData, business_id: activeBusiness?.id });
        setSelectedRole(res.data); // Select the new role
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving role:', err);
      alert('Error al guardar el rol');
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    try {
      await api.delete(`/roles/${selectedRole.id}`);
      setIsDeleteModalOpen(false);
      setSelectedRole(null);
      fetchData();
    } catch (err: any) {
      console.error('Error deleting role:', err);
      alert(err.response?.data?.error || 'Error al eliminar el rol');
    }
  };

  const togglePermission = (permName: string) => {
    if (!selectedRole) return;
    
    const currentPerms = new Set(selectedRole.permissions);
    if (currentPerms.has(permName)) {
      currentPerms.delete(permName);
    } else {
      currentPerms.add(permName);
    }
    
    setSelectedRole({
      ...selectedRole,
      permissions: Array.from(currentPerms)
    });
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    try {
      const response = await api.put(`/roles/${selectedRole.id}`, {
        permissions: selectedRole.permissions,
        business_id: activeBusiness?.id
      });
      alert('Permisos actualizados correctamente');
      
      // If the backend returned a new role (e.g. system role override), update selection
      if (response.data.id !== selectedRole.id) {
          console.log("Role migrated from system to custom:", response.data);
          setSelectedRole(response.data);
      }
      
      fetchData(); // Refresh list to reflect changes
    } catch (err) {
      console.error('Error updating permissions:', err);
      alert('Error al actualizar permisos');
    }
  };

  // Helper to toggle a whole category
  const toggleCategory = (category: string, enable: boolean) => {
    if (!selectedRole || !permissions[category]) return;
    
    const catPerms = permissions[category].map(p => p.name);
    const currentPerms = new Set(selectedRole.permissions);
    
    catPerms.forEach(p => {
        if (enable) currentPerms.add(p);
        else currentPerms.delete(p);
    });
    
    setSelectedRole({
        ...selectedRole,
        permissions: Array.from(currentPerms)
    });
  };

  const renderCategory = (category: string, perms: Permission[]) => {
    if (!perms || perms.length === 0) return null;

    return (
      <div key={category} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
            {CATEGORY_LABELS[category] || category}
          </h4>
          <div className="flex gap-2">
            <button 
                onClick={() => toggleCategory(category, true)}
                className="text-xs text-blue-600 hover:underline"
            >
                Todo
            </button>
            <span className="text-gray-300">|</span>
            <button 
                onClick={() => toggleCategory(category, false)}
                className="text-xs text-gray-500 hover:underline"
            >
                Nada
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {perms.map(perm => (
            <label key={perm.name} className="flex items-start gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  checked={selectedRole?.permissions.includes(perm.name)}
                  onChange={() => togglePermission(perm.name)}
                  disabled={selectedRole?.is_system && selectedRole?.name === 'SUPERADMIN'} 
                />
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                  {perm.description || perm.name}
                </span>
                <p className="text-xs text-gray-400">{perm.name}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando roles y permisos...</div>;
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100dvh-200px)] lg:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Roles y Permisos</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Define qué pueden hacer los miembros de tu equipo.</p>
          {suggestedRoles.length > 0 && (
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              Roles sugeridos para este negocio: {suggestedRoles.map((role) => role.name).join(', ')}.
            </p>
          )}
        </div>
        <Button onClick={handleCreateRole} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-1 lg:flex-row lg:gap-6 lg:overflow-hidden">
        {/* Roles List (Sidebar) */}
        <div className="app-surface flex max-h-[38dvh] flex-col overflow-hidden rounded-xl lg:max-h-none lg:w-64 lg:flex-shrink-0">
          <div className="app-table-head p-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Roles</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sortedRoles.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group transition-colors ${
                  selectedRole?.id === role.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center truncate">
                  {getRoleIcon(role.name)}
                  <span className="truncate font-medium">{role.name}</span>
                </div>
                {/* Show badge for system roles, but maybe different for predefined vs custom? */}
                {/* User asked for discreet icons/badges */}
                <div className="flex items-center gap-2">
                  {role.is_suggested && <span className="app-chip rounded-full px-2 py-0.5 text-[10px]">Sugerido</span>}
                  {role.is_system && <Lock className="w-3 h-3 opacity-30" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Editor (Main) */}
        <div className="app-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
          {selectedRole ? (
            <>
              {/* Toolbar */}
              <div className="app-table-head flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedRole.name}
                    {selectedRole.is_system && (
                      <span className="app-chip rounded-full px-2 py-0.5 text-xs">Preestablecido</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedRole.description || "Sin descripción"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!selectedRole.is_system && (
                    <>
                        <Button variant="ghost" size="sm" onClick={() => handleEditRole(selectedRole)}>
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setIsDeleteModalOpen(true)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </>
                  )}
                  <Button size="sm" onClick={savePermissions}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>

              {/* Matrix */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Map ordered categories first */}
                  {ORDERED_CATEGORIES.map(category => {
                      if (!permissions[category]) return null;
                      return renderCategory(category, permissions[category]);
                  })}
                  {/* Then map any other categories not in the list */}
                  {Object.entries(permissions).map(([category, perms]) => {
                      if (ORDERED_CATEGORIES.includes(category)) return null;
                      return renderCategory(category, perms);
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Shield className="w-16 h-16 mb-4 opacity-20" />
              <p>Selecciona un rol para ver sus permisos</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRole ? 'Editar Rol' : 'Nuevo Rol'}
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <Input
            label="Nombre del Rol"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="EJ: SUPERVISOR"
            required
            disabled={selectedRole?.is_system}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              className="app-textarea min-h-[96px]"
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Describe las responsabilidades de este rol..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar Rol"
      >
        <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm">
                    ¿Estás seguro de eliminar el rol <strong>{selectedRole?.name}</strong>? 
                    Esta acción no se puede deshacer y podría afectar a usuarios asignados.
                </p>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteRole}>Eliminar Definitivamente</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};
