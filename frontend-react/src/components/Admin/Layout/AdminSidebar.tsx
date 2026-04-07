import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  HeartPulse,
  PieChart,
  LineChart,
  Users,
  Store,
  BellRing,
  ShieldCheck,
  Settings,
  X,
  FileText,
  Database,
  ShoppingBag,
  UserCircle,
  LogOut,
  Briefcase,
} from 'lucide-react';
import logo from '../../../assets/logo.png';
import { cn } from '../../../utils/cn';
import { useAuthStore } from '../../../store/authStore';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const sidebarClasses = cn(
    'app-sidebar fixed inset-y-0 left-0 z-50 w-72 rounded-none border-r app-divider shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out transform',
    isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
  );

  const NavItem = ({ to, icon: Icon, label, end = false }: { to: string; icon: any; label: string; end?: boolean }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group mx-3 flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200',
          isActive
            ? 'app-tab-active'
            : 'app-tab-idle hover:bg-[color:var(--app-surface-soft)]'
        )
      }
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={cn('transition-colors', location.pathname === to ? 'text-blue-500' : 'group-hover:text-gray-900 dark:group-hover:text-white')} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {location.pathname === to && (
        <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
      )}
    </NavLink>
  );

  const NavSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <div className="mb-3 px-7 text-[10px] font-bold uppercase tracking-widest app-text-muted">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex h-24 items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <img src={logo} alt="Logo" className="h-6 w-6 object-contain brightness-0 invert" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-gray-900 dark:text-white">Admin<span className="text-blue-400">Pro</span></h1>
              <p className="text-[10px] font-medium tracking-wider text-gray-500 dark:text-slate-400">PLATFORM MANAGER</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-white md:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 overflow-y-auto px-0 py-4">
          <NavSection title="Dashboard">
            <NavItem to="/admin" end icon={PieChart} label="Resumen General" />
            <NavItem to="/admin/revenue" icon={LineChart} label="Revenue Center" />
            <NavItem to="/admin/health" icon={HeartPulse} label="System Health" />
            <NavItem to="/admin/activity" icon={Activity} label="Activity Center" />
            <NavItem to="/admin/alerts" icon={BellRing} label="Alerts Center" />
          </NavSection>

          <NavSection title="Gestion">
            <NavItem to="/admin/users" icon={Users} label="Usuarios (Duenos)" />
            <NavItem to="/admin/employees" icon={Briefcase} label="Empleados" />
            <NavItem to="/admin/businesses" icon={Store} label="Negocios" />
            <NavItem to="/admin/customers" icon={UserCircle} label="Clientes Globales" />
            <NavItem to="/admin/products" icon={ShoppingBag} label="Productos Globales" />
          </NavSection>

          <NavSection title="Sistema">
            <NavItem to="/admin/roles" icon={ShieldCheck} label="Roles y Permisos" />
            <NavItem to="/admin/data" icon={Database} label="Base de Datos" />
            <NavItem to="/admin/audit" icon={FileText} label="Auditoria" />
          </NavSection>

          <NavSection title="Configuracion">
            <NavItem to="/admin/settings" icon={Settings} label="Ajustes Generales" />
          </NavSection>
        </nav>

        <div className="app-soft-surface m-4 mt-0 rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--app-border)] bg-gradient-to-r from-[color:var(--app-surface-muted)] to-[color:var(--app-surface-soft)] font-bold app-text">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{user?.name}</p>
              <p className="truncate text-xs text-gray-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] px-4 py-2 text-xs font-medium app-text-secondary transition-all duration-200 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500"
          >
            <span className="flex items-center justify-center gap-2">
              <LogOut size={14} />
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

