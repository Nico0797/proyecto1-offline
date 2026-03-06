import { useEffect, useState } from 'react';
import { useAlertsPreferences } from '../store/alertsPreferences.store';
import { useAlertsSnoozeStore } from '../store/alertsSnooze.store';
import { RegisterPaymentModal } from '../components/Payments/RegisterPaymentModal';
import { WhatsAppPreviewModal } from '../components/Customers/WhatsAppPreviewModal';
import { ProductModal } from '../components/Products/ProductModal';
import { useBusinessStore } from '../store/businessStore';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Search, ShieldAlert, Calendar, Package, CheckCircle } from 'lucide-react';
import { usePaymentStore } from '../store/paymentStore';
import { useSaleStore } from '../store/saleStore';
import { useCustomerStore } from '../store/customerStore';
import { useRecurringExpenseStore } from '../store/recurringExpenseStore';
import { useProductStore } from '../store/productStore';
import { useAlertsStore } from '../store/alertsStore';
import { cn } from '../utils/cn';
import { Product } from '../types';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';

export const Alerts = () => {
  const { activeBusiness } = useBusinessStore();
  const { isAuthenticated } = useAuthStore();
  const prefs = useAlertsPreferences();
  const snooze = useAlertsSnoozeStore();
  const { alerts, loading, fetchAlerts } = useAlertsStore();
  
  const { fetchPayments } = usePaymentStore();
  const { fetchSales } = useSaleStore();
  const { fetchCustomers } = useCustomerStore();
  const { fetchRecurringExpenses } = useRecurringExpenseStore();
  const { fetchProducts } = useProductStore();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all'|'receivables'|'recurring'|'inventory'|'config'>('all');
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  // const [loading, setLoading] = useState(false); // Removed local loading
  const [kpi, setKpi] = useState({ overdue: 0, overdueCount: 0, recurring: 0, stock: 0 });
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('alerts'));
  
  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerCustomerId, setRegisterCustomerId] = useState<number|undefined>(undefined);
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waCustomer, setWaCustomer] = useState('');
  const [waBalance, setWaBalance] = useState(0);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  const refresh = async () => {
    if (!activeBusiness || !isAuthenticated) return;
    await fetchAlerts(activeBusiness.id);
  };

  useEffect(() => {
    const now = new Date();
    const activeAlerts = alerts.filter(a => {
      const st = snooze.getStatus(a.id);
      if (st?.status === 'resolved') return false;
      if (st?.status === 'snoozed' && st.until && new Date(st.until) > now) return false;
      if (!prefs.preferences.recurring && a.type === 'recurring') return false;
      if (!prefs.preferences.stockLow && a.type === 'inventory') return false;
      if (!prefs.preferences.arDueSoon && a.type === 'receivable' && a.severity === 'warning') return false;
      return true;
    });

    const filtered = activeAlerts.filter(a => {
      if (onlyCritical && a.severity !== 'critical') return false;
      if (tab === 'receivables') return a.type === 'receivable';
      if (tab === 'recurring') return a.type === 'recurring';
      if (tab === 'inventory') return a.type === 'inventory';
      
      // Date Range Filter
      // Inventory: Always show (assume 'now')
      // Others: Check dueDate
      if (a.type !== 'inventory' && a.dueDate) {
          if (dateRange.start && new Date(a.dueDate) < new Date(dateRange.start)) return false;
          if (dateRange.end) {
              const endDate = new Date(dateRange.end);
              endDate.setHours(23, 59, 59, 999);
              if (new Date(a.dueDate) > endDate) return false;
          }
      }

      return true;
    }).filter(a => (a.title + ' ' + a.description).toLowerCase().includes(query.toLowerCase()));
    
    setItems(filtered);
    
    const overdue = activeAlerts.filter(a => a.type==='receivable' && a.severity==='critical');
    const rec = activeAlerts.filter(a => a.type==='recurring').length;
    const low = activeAlerts.filter(a => a.type==='inventory').length;
    setKpi({ overdue: overdue.reduce((s,a)=>s + (a.data?.balance||0),0), overdueCount: overdue.length, recurring: rec, stock: low });
  }, [alerts, snooze, prefs.preferences, onlyCritical, tab, query, dateRange]);

  useEffect(() => {
    if (!activeBusiness || !isAuthenticated) return;
    fetchPayments(activeBusiness.id);
    fetchSales(activeBusiness.id);
    fetchCustomers(activeBusiness.id);
    fetchRecurringExpenses(activeBusiness.id);
    fetchProducts(activeBusiness.id);
    refresh();
  }, [activeBusiness, isAuthenticated]);

  // Removed useEffect calling refresh on prefs/filters change, as logic is now in filter useEffect above

  const criticalCount = items.filter(i => i.severity==='critical').length;

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-4" data-tour="alerts.panel">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white">Alertas</h1>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-400">Críticas {criticalCount}</span>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-500/20 text-blue-400">Activas {items.length}</span>
        </div>
        <div className="flex gap-2 items-center flex-wrap" data-tour="alerts.filters">
          <PeriodFilter 
             moduleId="alerts"
             value={dateRange}
             onChange={setDateRange}
             iconOnly
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-9 w-40 md:w-64" placeholder="Buscar..." value={query} onChange={e=>setQuery(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={onlyCritical} onChange={e=>setOnlyCritical(e.target.checked)} /> Solo críticas
          </label>
          <Button variant="secondary" onClick={refresh}>Refrescar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Cobros vencidos</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white">${kpi.overdue.toLocaleString()}</div>
            <div className="text-xs text-gray-400">{kpi.overdueCount} clientes</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Recurrentes 7d</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{kpi.recurring}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Stock bajo</span>
              <Package className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">{kpi.stock}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 border-b border-white/10">
        <button onClick={()=>setTab('all')} className={cn('pb-2 px-3 text-sm border-b-2', tab==='all'?'border-blue-500 text-blue-400':'border-transparent text-gray-400')}>Todas</button>
        <button onClick={()=>setTab('receivables')} className={cn('pb-2 px-3 text-sm border-b-2', tab==='receivables'?'border-red-500 text-red-400':'border-transparent text-gray-400')}>Cobros</button>
        <button onClick={()=>setTab('recurring')} className={cn('pb-2 px-3 text-sm border-b-2', tab==='recurring'?'border-green-500 text-green-400':'border-transparent text-gray-400')}>Recurrentes</button>
        <button onClick={()=>setTab('inventory')} className={cn('pb-2 px-3 text-sm border-b-2', tab==='inventory'?'border-yellow-500 text-yellow-400':'border-transparent text-gray-400')}>Inventario</button>
        <button onClick={()=>setTab('config')} className={cn('pb-2 px-3 text-sm border-b-2', tab==='config'?'border-gray-500 text-gray-300':'border-transparent text-gray-400')}>Configuración</button>
      </div>

      {tab !== 'config' && (
        <div className="space-y-2" data-tour="alerts.list">
          {loading && <div className="grid gap-2">{[1,2,3,4].map(i=><div key={i} className="h-16 bg-white/5 border border-white/10 rounded-xl animate-pulse"/>)}</div>}
          {!loading && items.length===0 && (
            <div className="text-center p-10 bg-white/5 border border-white/10 rounded-xl text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              Sin alertas para mostrar
            </div>
          )}
          {!loading && items.map(a=>(
            <Card key={a.id} className={cn("border-l-4", a.severity==='critical'?'border-l-red-500':'border-l-yellow-500')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">{a.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{a.description}</p>
                  {a.dueDate && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(a.dueDate).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {a.type==='receivable' && (
                    <>
                      <Button variant="secondary" onClick={()=>{
                        const c=a.data?.customer;
                        if(!c) return;
                        const phone=(c.phone||'').replace(/\D/g,'');
                        setWaCustomer(c.name); setWaBalance(a.data?.balance||0); setWaPhone(phone||''); setWaOpen(true);
                      }}>WhatsApp</Button>
                      <Button variant="secondary" onClick={()=>{ const u=new Date(); u.setDate(u.getDate()+1); snooze.setStatus(a.id,'snoozed',u.toISOString().split('T')[0]); refresh(); }} data-tour="alerts.snooze">Posponer</Button>
                      <Button onClick={()=>{ setRegisterCustomerId(a.data?.customer?.id); setIsRegisterModalOpen(true); }} data-tour="alerts.resolve">Resolver</Button>
                    </>
                  )}
                  {a.type==='recurring' && (
                    <>
                      <Button variant="secondary" onClick={()=>{
                        const until=new Date(); until.setDate(until.getDate()+3);
                        snooze.setStatus(a.id,'snoozed',until.toISOString().split('T')[0]);
                        refresh();
                      }} data-tour="alerts.snooze">Posponer</Button>
                      <Button onClick={async()=>{
                        if(!activeBusiness) return;
                        const r=a.data?.recurring;
                        if(!r) return;
                        await api.post(`/businesses/${activeBusiness.id}/expenses`,{description:r.name,amount:r.amount,category:r.category||'Recurrente',expense_date:new Date().toISOString().split('T')[0],recurring_expense_id:r.id}).catch(()=>{});
                        const nd=new Date(r.next_due_date||new Date().toISOString());
                        if(r.frequency==='monthly') nd.setMonth(nd.getMonth()+1);
                        else if(r.frequency==='weekly') nd.setDate(nd.getDate()+7);
                        else if(r.frequency==='annual') nd.setFullYear(nd.getFullYear()+1);
                        await api.put(`/businesses/${activeBusiness.id}/recurring-expenses/${r.id}`,{next_due_date:nd.toISOString().split('T')[0]}).catch(()=>{});
                        snooze.setStatus(a.id,'resolved'); refresh();
                      }} data-tour="alerts.resolve">Resolver</Button>
                    </>
                  )}
                  {a.type==='inventory' && (
                    <>
                      <Button variant="secondary" onClick={()=>{ const u=new Date(); u.setDate(u.getDate()+1); snooze.setStatus(a.id,'snoozed',u.toISOString().split('T')[0]); refresh(); }} data-tour="alerts.snooze">Posponer</Button>
                      <Button onClick={()=>{ setSelectedProduct(a.data?.product); setIsProductModalOpen(true); }} data-tour="alerts.resolve">Resolver</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab==='config' && (
        <div className="grid gap-4 max-w-xl" data-tour="alerts.config">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <span className="text-gray-300 text-sm">Recurrentes</span>
            <input type="checkbox" checked={prefs.preferences.recurring} onChange={e=>prefs.setPreferences({recurring:e.target.checked})}/>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Cobros por vencer</span>
              <input type="checkbox" checked={prefs.preferences.arDueSoon} onChange={e=>prefs.setPreferences({arDueSoon:e.target.checked})}/>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Días</span>
              <Input className="w-20 h-8" type="number" value={String(prefs.preferences.arDueSoonDays)} onChange={e=>prefs.setPreferences({arDueSoonDays:Math.max(1,parseInt(e.target.value)||1)})}/>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Stock bajo</span>
              <input type="checkbox" checked={prefs.preferences.stockLow} onChange={e=>prefs.setPreferences({stockLow:e.target.checked})}/>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Umbral</span>
              <Input className="w-20 h-8" type="number" value={String(prefs.preferences.stockThreshold)} onChange={e=>prefs.setPreferences({stockThreshold:Math.max(0,parseInt(e.target.value)||0)})}/>
            </div>
          </div>
        </div>
      )}

      <RegisterPaymentModal isOpen={isRegisterModalOpen} onClose={()=>setIsRegisterModalOpen(false)} onSuccess={refresh} initialCustomerId={registerCustomerId}/>
      <WhatsAppPreviewModal isOpen={waOpen} onClose={()=>setWaOpen(false)} phoneNumber={waPhone} customerName={waCustomer} balance={waBalance} messageType="collection" />
      <ProductModal isOpen={isProductModalOpen} onClose={()=>{setIsProductModalOpen(false); setSelectedProduct(undefined);}} onSuccess={refresh} product={selectedProduct} />
    </div>
  );
};
