import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  PieChart, 
  LineChart, 
  Users, 
  UserCircle, 
  Package, 
  Store, 
  Database, 
  ShieldCheck, 
  Key, 
  Lock, 
  FileText, 
  Globe, 
  Plug, 
  Settings,
  Search,
  X
} from 'lucide-react';
import logo from '../../../assets/logo.png';
import { cn } from '../../../utils/cn';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const sidebarClasses = cn(
    "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-white/10 transition-transform duration-300 ease-in-out transform",
    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
  );

  const navItemClasses = ({ isActive }: { isActive: boolean }) => cn(
    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
    isActive 
      ? "bg-blue-500/10 text-blue-400" 
      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg text-white">Admin Panel</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-6">
          <div>
            <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Principal
            </div>
            <div className="space-y-1">
              <NavLink to="/admin" end className={navItemClasses}>
                <PieChart size={18} />
                <span>Resumen</span>
              </NavLink>
              <NavLink to="/admin/analytics" className={navItemClasses}>
                <LineChart size={18} />
                <span>Analíticas</span>
              </NavLink>
            </div>
          </div>

          <div>
            <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gestión
            </div>
            <div className="space-y-1">
              <NavLink to="/admin/users" className={navItemClasses}>
                <Users size={18} />
                <span>Usuarios</span>
              </NavLink>
              <NavLink to="/admin/customers" className={navItemClasses}>
                <UserCircle size={18} />
                <span>Clientes</span>
              </NavLink>
              <NavLink to="/admin/products" className={navItemClasses}>
                <Package size={18} />
                <span>Productos</span>
              </NavLink>
            </div>
          </div>

          <div>
            <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Negocios
            </div>
            <div className="space-y-1">
              <NavLink to="/admin/businesses" className={navItemClasses}>
                <Store size={18} />
                <span>Negocios</span>
              </NavLink>
              <NavLink to="/admin/data" className={navItemClasses}>
                <Database size={18} />
                <span>Datos</span>
              </NavLink>
            </div>
          </div>

          <div>
            <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sistema
            </div>
            <div className="space-y-1">
              <NavLink to="/admin/roles" className={navItemClasses}>
                <ShieldCheck size={18} />
                <span>Roles</span>
              </NavLink>
              <NavLink to="/admin/permissions" className={navItemClasses}>
                <Key size={18} />
                <span>Permisos</span>
              </NavLink>
              <NavLink to="/admin/security" className={navItemClasses}>
                <Lock size={18} />
                <span>Seguridad</span>
              </NavLink>
              <NavLink to="/admin/audit" className={navItemClasses}>
                <FileText size={18} />
                <span>Auditoría</span>
              </NavLink>
            </div>
          </div>

          <div>
            <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Configuración
            </div>
            <div className="space-y-1">
              <NavLink to="/admin/domains" className={navItemClasses}>
                <Globe size={18} />
                <span>Dominios</span>
              </NavLink>
              <NavLink to="/admin/integrations" className={navItemClasses}>
                <Plug size={18} />
                <span>Integraciones</span>
              </NavLink>
              <NavLink to="/admin/settings" className={navItemClasses}>
                <Settings size={18} />
                <span>Ajustes</span>
              </NavLink>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};
