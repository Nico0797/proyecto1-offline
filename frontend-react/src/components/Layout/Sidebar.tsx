import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { useAlertsPreferences } from '../../store/alertsPreferences.store';
import { useAlertsSnoozeStore } from '../../store/alertsSnooze.store';
import { useAlertsStore } from '../../store/alertsStore';
import { CreateBusinessModal } from '../Business/CreateBusinessModal';
import { UpgradeModal } from '../ui/UpgradeModal';
import { cn } from '../../utils/cn';
import { FEATURES, FeatureKey, canAccess } from '../../auth/plan';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Wallet,
  Target,
  FileBarChart,
  LogOut,
  Store,
  ChevronDown,
  Plus,
  Check,
  Settings,
  Bell,
  HelpCircle,
  Lock,
  Sparkles,
  CreditCard
} from 'lucide-react';
import logo from '../../assets/logo.png';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

type NavItem = {
  path: string;
  icon: React.FC<any>;
  label: string;
  feature?: FeatureKey;
  adminOnly?: boolean;
  badge?: string;
  badgeColor?: 'default' | 'red';
};

type NavSection = {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { businesses, activeBusiness, setActiveBusiness, fetchBusinesses } = useBusinessStore();
  const location = useLocation();
  const navigate = useNavigate();
  const prefs = useAlertsPreferences();
  const snooze = useAlertsSnoozeStore();
  const { alerts, fetchAlerts } = useAlertsStore();
  
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);
  const [isCreateBusinessModalOpen, setIsCreateBusinessModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey | undefined>(undefined);
  const [alertsCount, setAlertsCount] = useState(0);
  
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBusinesses();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const updateCount = () => {
      const now = new Date();
      const count = alerts.filter(a => {
        const st = snooze.getStatus(a.id);
        if (st?.status === 'resolved') return false;
        if (st?.status === 'snoozed' && st.until && new Date(st.until) > now) return false;
        if (!prefs.preferences.recurring && a.type === 'recurring') return false;
        if (!prefs.preferences.stockLow && a.type === 'inventory') return false;
        if (!prefs.preferences.arDueSoon && a.type === 'receivable' && a.severity === 'warning') return false;
        return true;
      }).length;
      setAlertsCount(count);
    };

    updateCount();
  }, [alerts, snooze, prefs.preferences]);

  useEffect(() => {
    if (activeBusiness) {
      fetchAlerts(activeBusiness.id);
      const interval = setInterval(() => fetchAlerts(activeBusiness.id), 60000);
      return () => clearInterval(interval);
    }
  }, [activeBusiness, prefs.preferences]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBusinessDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    },
    {
      title: 'Operación',
      items: [
        { path: '/sales', icon: ShoppingCart, label: 'Ventas' },
        { path: '/orders', icon: Store, label: 'Pedidos', feature: FEATURES.ORDERS, badge: 'PRO' },
        { path: '/payments', icon: Wallet, label: 'Pagos/Abonos' },
      ],
      collapsible: true
    },
    {
      title: 'Clientes & Catálogo',
      items: [
        { path: '/customers', icon: Users, label: 'Clientes' },
        { path: '/products', icon: Store, label: 'Productos & Servicios' },
      ],
      collapsible: true
    },
    {
      title: 'Finanzas',
      items: [
        { path: '/expenses', icon: Wallet, label: 'Gastos' },
        { path: '/debts', icon: CreditCard, label: 'Deudas' },
        { path: '/reports', icon: FileBarChart, label: 'Reportes', feature: FEATURES.REPORTS, badge: 'PRO' },
        { path: '/alerts', icon: Bell, label: 'Alertas', feature: FEATURES.ALERTS, badge: alertsCount > 0 ? String(alertsCount) : 'PRO', badgeColor: alertsCount > 0 ? 'red' : 'default' },
      ],
      collapsible: true
    },
    {
      title: 'Crecimiento',
      items: [
        { path: '/sales-goals', icon: Target, label: 'Metas de ventas', feature: FEATURES.REPORTS, badge: 'PRO' },
      ],
      collapsible: true
    },
    {
      title: 'Configuración',
      items: [
        { path: '/settings', icon: Settings, label: 'Configuración' },
        { path: '/help', icon: HelpCircle, label: 'Ayuda' },
      ],
      collapsible: true
    }
  ];

  const handleLogout = () => {
    logout();
  };

  const handleSwitchBusiness = (business: any) => {
    setActiveBusiness(business);
    setIsBusinessDropdownOpen(false);
  };

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleItemClick = (e: React.MouseEvent, item: NavItem) => {
    if (item.feature && !canAccess(item.feature, user)) {
      e.preventDefault();
      setSelectedFeature(item.feature);
      setShowUpgradeModal(true);
      return;
    }
    setIsOpen(false);
  };

  const handleCreateBusinessClick = () => {
    setIsBusinessDropdownOpen(false);
    
    // Check if user can create more businesses
    // For free plan, limit is 1 business
    if (user?.plan === 'free' && businesses.length >= 1) {
      setSelectedFeature(FEATURES.MULTI_BUSINESS);
      setShowUpgradeModal(true);
      return;
    }
    
    setIsCreateBusinessModalOpen(true);
  };

  return (
    <>
      <CreateBusinessModal 
        isOpen={isCreateBusinessModalOpen} 
        onClose={() => setIsCreateBusinessModalOpen(false)}
        onSuccess={() => {
            fetchBusinesses();
        }} 
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={selectedFeature}
      />

      {/* Mobile Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform lg:translate-x-0 transition-colors duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* App Logo */}
        <div className="h-32 flex items-center justify-center bg-white dark:bg-gray-900 shrink-0 p-0 overflow-hidden mt-5">
          <img src={logo} alt="App Logo" className="w-full h-full object-cover" />
        </div>

        {/* Header / Business Switcher */}
        <div className="h-20 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 relative z-50 shrink-0" ref={dropdownRef}>
          <div 
            className="flex-1 flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors relative min-w-0"
            onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Store className="w-6 h-6 text-green-600 dark:text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {activeBusiness?.name || 'Seleccionar'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.plan === 'free' ? 'Plan Gratis' : 'Plan Pro'}
              </p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200", isBusinessDropdownOpen && "rotate-180")} />
          </div>

          {/* Dropdown Menu (Absolute) */}
          {isBusinessDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 mx-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-w-full">
              <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                {businesses.map((business) => (
                  <button
                    key={business.id}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                      activeBusiness?.id === business.id && "bg-gray-50 dark:bg-gray-800"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwitchBusiness(business);
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <Store className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                      {business.name}
                    </span>
                    {activeBusiness?.id === business.id && (
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 p-1">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateBusinessClick();
                  }}
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Crear nuevo negocio</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {/* Section Header */}
              {section.title !== 'Principal' ? (
                <div 
                  className={cn(
                    "px-3 flex items-center justify-between group cursor-pointer",
                    !section.collapsible && "cursor-default"
                  )}
                  onClick={() => section.collapsible && toggleSection(section.title)}
                >
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </h3>
                  {section.collapsible && (
                    <ChevronDown 
                      className={cn(
                        "w-3 h-3 text-gray-400 transition-transform duration-200 opacity-0 group-hover:opacity-100",
                        collapsedSections[section.title] && "-rotate-90"
                      )} 
                    />
                  )}
                </div>
              ) : (
                <div className="h-2"></div>
              )}

              {/* Items */}
              <div className={cn(
                "space-y-1 transition-all duration-200",
                collapsedSections[section.title] ? "hidden" : "block"
              )}>
                {section.items.map((item) => {
                  const isLocked = item.feature && !canAccess(item.feature, user);
                  
                  return (
                    <NavLink
                      key={item.path}
                      to={isLocked ? '#' : item.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group',
                          isActive && !isLocked
                            ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-500'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                          isLocked && 'opacity-75 hover:opacity-100'
                        )
                      }
                      onClick={(e) => handleItemClick(e, item)}
                    >
                      <item.icon 
                        className={cn(
                          'w-5 h-5 mr-3 transition-colors', 
                          location.pathname === item.path && !isLocked
                            ? 'text-blue-600 dark:text-blue-500' 
                            : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                        )} 
                      />
                      
                      <span className="flex-1">{item.label}</span>
                      
                      {/* Badge PRO or Count */}
                      {item.badge && (
                        <span className={cn(
                          "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border",
                          isLocked 
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700" 
                            : item.badgeColor === 'red'
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-500 border-red-200 dark:border-red-700/50 rounded-full"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-700/50"
                        )}>
                          {item.badge}
                        </span>
                      )}

                      {/* Lock Icon for Free users on PRO items */}
                      {isLocked && (
                        <Lock className="w-3.5 h-3.5 ml-2 text-gray-400" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2 shrink-0 bg-white dark:bg-gray-900 z-50">
          {user?.plan === 'free' && (
            <div className="mb-4 relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 p-4 text-white shadow-lg group cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate('/pro')}>
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </div>
                <span className="font-bold text-sm tracking-wide">Actualiza a PRO</span>
              </div>
              
              <p className="text-xs text-indigo-100 mb-3 leading-relaxed">
                Desbloquea reportes, alertas y multi-negocio.
              </p>
              
              <button 
                className="w-full py-2 px-3 bg-white text-indigo-600 text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/pro');
                }}
              >
                Ver Planes <ChevronDown className="w-3 h-3 -rotate-90" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};
