import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, Command, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { AdminSidebar } from './AdminSidebar';
import api from '../../../services/api';

interface SearchResultItem {
  id: number;
  name: string;
  owner_name?: string;
  owner_email?: string;
  email?: string;
  plan?: string;
  route: string;
}

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ businesses: SearchResultItem[]; users: SearchResultItem[] }>({ businesses: [], users: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const pathSegments = location.pathname.split('/').filter(Boolean).slice(1);

  const breadcrumbMap: Record<string, string> = {
    activity: 'Actividad',
    alerts: 'Alertas',
    users: 'Usuarios',
    businesses: 'Negocios',
    customers: 'Clientes',
    products: 'Productos',
    roles: 'Roles',
    permissions: 'Permisos',
    settings: 'Ajustes',
    security: 'Seguridad',
    audit: 'Auditoria',
    analytics: 'Analiticas',
    data: 'Datos',
    domains: 'Dominios',
    integrations: 'Integraciones',
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults({ businesses: [], users: [] });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      api.get('/admin/search', { params: { q: searchQuery.trim() } })
        .then((res) => {
          setSearchResults({
            businesses: res?.data?.businesses || [],
            users: res?.data?.users || [],
          });
          setSearchOpen(true);
        })
        .catch(() => {
          setSearchResults({ businesses: [], users: [] });
        });
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const navigateFromSearch = (route: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(route);
  };

  return (
    <div className="admin-theme-scope app-canvas app-text min-h-screen flex font-sans selection:bg-blue-500/30">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="relative flex flex-1 flex-col transition-all duration-300 md:ml-72">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute right-[-5%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/10 opacity-50 blur-3xl dark:bg-blue-500/5" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 opacity-30 blur-3xl dark:bg-purple-500/5" />
        </div>

        <header className="app-page-header sticky top-0 z-30 flex h-20 items-center justify-between border-b app-divider px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-lg p-2 app-text-muted transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)] md:hidden"
            >
              <Menu size={24} />
            </button>

            <div className="hidden items-center gap-2 text-sm app-text-muted md:flex">
              <span className="cursor-pointer transition-colors hover:text-[color:var(--app-text)]" onClick={() => navigate('/admin')}>Admin</span>
              {pathSegments.map((segment, index) => (
                <div key={segment} className="flex items-center gap-2">
                  <ChevronRight size={14} className="app-text-muted" />
                  <span className={index === pathSegments.length - 1 ? 'font-medium capitalize app-text' : 'capitalize'}>
                    {breadcrumbMap[segment] || segment}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-6">
            <div className="relative hidden md:block">
              <div className="app-surface group flex w-64 items-center gap-3 rounded-full px-4 py-2 transition-all duration-300 focus-within:w-80 focus-within:border-blue-500/50">
                <Search size={16} className="text-gray-400 transition-colors group-focus-within:text-blue-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar negocio, owner o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  className="w-full border-none bg-transparent text-sm app-text outline-none placeholder:app-text-muted"
                />
                <div className="theme-surface-soft flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] app-text-muted">
                  <Command size={10} /> K
                </div>
              </div>

              {searchOpen && (searchResults.businesses.length > 0 || searchResults.users.length > 0 || searchQuery.trim().length >= 2) && (
                <div className="app-surface absolute right-0 top-[calc(100%+10px)] z-40 w-[30rem] overflow-hidden rounded-2xl shadow-2xl backdrop-blur-xl">
                  <div className="custom-scrollbar max-h-[28rem] overflow-auto p-3">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider app-text-muted">Busqueda owner</div>

                    <div className="space-y-2">
                      <div className="px-2 text-[11px] font-semibold uppercase tracking-wider app-text-muted">Negocios</div>
                      {searchResults.businesses.length > 0 ? searchResults.businesses.map((item) => (
                        <button key={`business-${item.id}`} onClick={() => navigateFromSearch(item.route)} className="app-soft-surface w-full rounded-xl border border-transparent p-3 text-left transition hover:border-[color:var(--app-border)] hover:bg-[color:var(--app-surface-soft)]">
                          <div className="font-medium app-text">{item.name}</div>
                          <div className="mt-1 text-xs app-text-muted">{item.owner_name || 'Owner'} · {item.owner_email || 'Sin email'}</div>
                        </button>
                      )) : <div className="app-soft-surface rounded-xl p-3 text-sm app-text-muted">Sin negocios coincidentes.</div>}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="px-2 text-[11px] font-semibold uppercase tracking-wider app-text-muted">Usuarios</div>
                      {searchResults.users.length > 0 ? searchResults.users.map((item) => (
                        <button key={`user-${item.id}`} onClick={() => navigateFromSearch(item.route)} className="app-soft-surface w-full rounded-xl border border-transparent p-3 text-left transition hover:border-[color:var(--app-border)] hover:bg-[color:var(--app-surface-soft)]">
                          <div className="font-medium app-text">{item.name}</div>
                          <div className="mt-1 text-xs app-text-muted">{item.email || 'Sin email'}{item.plan ? ` · ${item.plan}` : ''}</div>
                        </button>
                      )) : <div className="app-soft-surface rounded-xl p-3 text-sm app-text-muted">Sin usuarios coincidentes.</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button className="relative rounded-full p-2 app-text-muted transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]">
                <Bell size={20} />
                <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              </button>

              <div className="mx-2 h-8 w-[1px] bg-[color:var(--app-divider)]" />

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-bold app-text">{user?.name}</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">Super Admin</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px] shadow-lg shadow-blue-500/20">
                  <div className="theme-surface flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                    <span className="font-bold app-text">{user?.name?.charAt(0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="custom-scrollbar relative z-10 flex-1 overflow-x-hidden overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
