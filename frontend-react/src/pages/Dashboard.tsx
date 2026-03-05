import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { SummaryCard } from '../components/Dashboard/SummaryCard';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CreateSaleModal } from '../components/Sales/CreateSaleModal';
import { CreateExpenseModal } from '../components/Expenses/CreateExpenseModal';
import { BannerCarousel } from '../components/Public/BannerCarousel';
import { RemindersTab } from '../components/Dashboard/RemindersTab';
import { BalanceTab } from '../components/Dashboard/BalanceTab';
import { AnalyticsTab } from '../components/Analytics/AnalyticsTab';
import { reminderService } from '../services/reminderService';
import { ProGate } from '../components/ui/ProGate';
import { FEATURES } from '../auth/plan';
import { SwipePager } from '../components/ui/SwipePager';
import {
  DollarSign,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Minus,
  Wallet,
  Save,
  BarChart2,
  Calendar,
  Bell
} from 'lucide-react';

export const Dashboard = () => {
  const { activeBusiness, fetchBusinesses } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const { isAuthenticated } = useAuthStore();
  // Tabs
  const [activeTab, setActiveTab] = useState<string>('hoy');
  const [activeRemindersCount, setActiveRemindersCount] = useState(0);

  // Modals
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Cash Register (Caja Hoy)
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchBusinesses();
    }
  }, [fetchBusinesses, isAuthenticated]);

  const loadDashboardData = async () => {
    if (!activeBusiness) return;

    setLoading(true);
    try {
      const [statsRes, reminders] = await Promise.all([
        api.get(`/businesses/${activeBusiness.id}/dashboard`),
        Promise.resolve(reminderService.list(activeBusiness.id).filter(r => r.status === 'active'))
      ]);

      let data = statsRes.data || {};
      // Fallback compute if backend dashboard lacks summary fields
      // Use local date instead of UTC to fix timezone issues (e.g. evening in LATAM showing as tomorrow)
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      if (!data.summary || typeof data.summary !== 'object') data.summary = {};
      const summary = data.summary;

      if (summary.sales == null || typeof summary.sales.total !== 'number') {
        const salesRes = await api.get(`/businesses/${activeBusiness.id}/sales`);
        const sales: any[] = salesRes.data.sales || [];
        const todaysSales = sales.filter(s => (s.sale_date || '').startsWith(todayStr));
        summary.sales = {
          total: todaysSales.reduce((sum, s) => sum + (s.total || 0), 0),
          count: todaysSales.length
        };
        data.dashboard = data.dashboard || {};
        data.dashboard.recent_sales = todaysSales
          .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
          .slice(0, 10);
      }

      if (summary.expenses == null || typeof summary.expenses.total !== 'number') {
        const expRes = await api.get(`/businesses/${activeBusiness.id}/expenses`, { params: { start_date: todayStr, end_date: todayStr }});
        const expenses: any[] = expRes.data.expenses || [];
        summary.expenses = {
          total: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
          count: expenses.length
        };
      }

      if (summary.cash_flow == null) {
        summary.cash_flow = { in: 0, out: 0 };
      }

      setStats(data);

      // Load opening balance from local storage
      // Reuse todayStr which is local date
      const storedBalance = localStorage.getItem(`openingBalance_${activeBusiness.id}_${todayStr}`);
      if (storedBalance) {
        setOpeningBalance(parseFloat(storedBalance));
      } else {
        setOpeningBalance(0);
      }
      
      setActiveRemindersCount(reminders.length);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBusiness) {
      loadDashboardData();
    }
  }, [activeBusiness]);

  const saveOpeningBalance = () => {
    if (!activeBusiness) return;
    const today = new Date().toISOString().split('T')[0];
    const val = parseFloat(tempBalance);
    if (!isNaN(val)) {
      setOpeningBalance(val);
      localStorage.setItem(`openingBalance_${activeBusiness.id}_${today}`, val.toString());
      setIsEditingBalance(false);
    }
  };



  if (!activeBusiness && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h2 className="text-xl font-semibold text-white mb-2">No hay negocio seleccionado</h2>
        <p className="text-gray-400">Por favor crea un negocio para comenzar.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 w-48 bg-gray-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-800 rounded-xl"></div>
      </div>
    );
  }

  // Remove the problematic blocking return
  // if (!activeBusiness) return null; 

  const { summary, dashboard } = stats || {};
  
  // Calculate Cash Box
  const cashIn = summary?.cash_flow?.in || 0;
  const cashOut = summary?.cash_flow?.out || 0;
  const cashOnHand = openingBalance + cashIn - cashOut;

  const HoyContent = (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <BannerCarousel />
      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="dashboard.kpis">
        {/* Caja Hoy Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Caja Hoy (Efectivo)</p>
              <div className="mt-2">
                 <div className="text-2xl font-bold text-gray-900 dark:text-white">
                   ${cashOnHand.toLocaleString()}
                 </div>
                 <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-2">
                   <span className="text-green-600 dark:text-green-400">In: ${cashIn.toLocaleString()}</span>
                   <span className="text-red-600 dark:text-red-400">Out: ${cashOut.toLocaleString()}</span>
                 </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
             {isEditingBalance ? (
               <div className="flex gap-2">
                 <Input 
                   type="number" 
                   value={tempBalance} 
                   onChange={e => setTempBalance(e.target.value)}
                   className="h-8 text-sm bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                   placeholder="Saldo inicial"
                   autoFocus
                 />
                 <Button size="sm" onClick={saveOpeningBalance}><Save className="w-4 h-4" /></Button>
               </div>
             ) : (
               <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-500 dark:text-gray-400">Saldo Inicial: ${openingBalance.toLocaleString()}</span>
                 <button onClick={() => { setTempBalance(openingBalance.toString()); setIsEditingBalance(true); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-xs">
                   Editar
                 </button>
               </div>
             )}
          </div>
        </div>

        <SummaryCard
          title="Ventas Hoy"
          value={`$${summary?.sales?.total?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="green"
          trend={{
            value: dashboard?.projections?.daily_average ? ((summary?.sales?.total || 0) - dashboard.projections.daily_average) / dashboard.projections.daily_average * 100 : 0,
            label: "vs promedio diario"
          }}
          data-tour="dashboard.comparison"
        />
        <SummaryCard
          title="Gastos Hoy"
          value={`$${summary?.expenses?.total?.toLocaleString() || 0}`}
          icon={CreditCard}
          color="red"
        />
         <SummaryCard
          title="Por Cobrar"
          value={`$${summary?.accounts_receivable?.toLocaleString() || 0}`}
          icon={AlertTriangle}
          color="yellow"
          trend={{
             value: dashboard?.fiados_alerts?.count || 0,
             label: "ventas pendientes"
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-tour="dashboard.charts">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col h-[400px]" data-tour="dashboard.topProducts">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ventas Recientes</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {dashboard?.recent_sales?.length > 0 ? (
              dashboard.recent_sales.map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                      <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {sale.customer_name || 'Cliente Casual'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${sale.total.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay ventas recientes</p>
            )}
          </div>
        </div>

        {/* Reminders Summary */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white h-[400px] flex flex-col justify-between relative overflow-hidden" data-tour="dashboard.alerts">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Bell className="w-32 h-32 transform rotate-12" />
           </div>
           
           <div>
             <div className="bg-white/20 p-3 rounded-lg w-fit mb-4 backdrop-blur-sm">
               <Bell className="w-6 h-6 text-white" />
             </div>
             <h3 className="text-xl font-bold mb-2">Recordatorios</h3>
             <p className="text-blue-100">Mantén tus tareas organizadas y no olvides nada importante.</p>
           </div>

           <div className="space-y-4 relative z-10">
             <div className="flex items-center justify-between bg-white/10 p-4 rounded-lg backdrop-blur-sm">
               <span className="text-blue-100">Pendientes</span>
               <span className="text-2xl font-bold">{activeRemindersCount}</span>
             </div>
             
             <Button 
               onClick={() => setActiveTab('recordatorios')}
               className="w-full bg-white text-blue-600 hover:bg-blue-50 border-none font-semibold"
             >
               Ver Todos
             </Button>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden" data-tour="dashboard.panel">
      {/* Header Sticky */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-white dark:bg-gray-900 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Negocio: <span className="text-gray-900 dark:text-white font-medium">{activeBusiness?.name}</span>
            </div>
          </div>
          <div className="flex gap-3" data-tour="dashboard.quickActions">
            <Button onClick={() => setIsExpenseModalOpen(true)} variant="secondary" className="flex items-center gap-2">
              <Minus className="w-4 h-4" />
              Gasto Rápido
            </Button>
            <Button onClick={() => setIsSaleModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Venta Rápida
            </Button>
          </div>
        </div>
      </div>
      
      {/* Swipe Pager */}
      <SwipePager 
        activePageId={activeTab}
        onPageChange={setActiveTab}
        pages={[
          { 
            id: 'hoy', 
            title: 'Hoy', 
            icon: Calendar, 
            content: HoyContent,
            'data-tour': 'dashboard.tabs.hoy'
          },
          { 
            id: 'balance', 
            title: 'Balance', 
            icon: Wallet, 
            content: <BalanceTab />,
            'data-tour': 'dashboard.tabs.balance'
          },
          { 
            id: 'analiticas', 
            title: 'Analíticas', 
            icon: BarChart2, 
            content: (
              <ProGate feature={FEATURES.DASHBOARD_ANALYTICS} mode="block">
                <AnalyticsTab />
              </ProGate>
            ),
            'data-tour': 'dashboard.tabs.analytics'
          },
          { 
            id: 'recordatorios', 
            title: 'Recordatorios', 
            icon: Bell, 
            content: (
              <ProGate feature={FEATURES.DASHBOARD_REMINDERS} mode="block">
                <RemindersTab />
              </ProGate>
            ),
            badge: activeRemindersCount > 0 ? activeRemindersCount : undefined,
            'data-tour': 'dashboard.tabs.reminders'
          }
        ]}
        className="flex-1"
      />

      <CreateSaleModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        onSuccess={loadDashboardData}
      />
      <CreateExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        onSuccess={loadDashboardData}
      />
    </div>
  );
};
