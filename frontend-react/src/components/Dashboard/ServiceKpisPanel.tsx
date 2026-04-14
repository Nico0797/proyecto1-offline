import { useMemo } from 'react';
import { CalendarDays, CheckCircle, DollarSign, Clock3, Star, User } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { offlineAppointmentsLocal } from '../../services/offlineAgendaLocal';
import { shouldShowAgendaForBusiness } from '../../config/businessOnboardingPresets';

const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export const ServiceKpisPanel = () => {
  const { activeBusiness } = useBusinessStore();
  const show = shouldShowAgendaForBusiness(activeBusiness);

  const kpis = useMemo(() => {
    if (!show || !activeBusiness?.id) return null;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const all = offlineAppointmentsLocal.list(activeBusiness.id);
    const todayAppts = all.filter((a) => a.starts_at.startsWith(todayStr));

    const scheduledToday = todayAppts.filter((a) => a.status === 'scheduled').length;
    const completedToday = todayAppts.filter((a) => a.status === 'completed').length;

    const completedAll = all.filter((a) => a.status === 'completed');
    const serviceRevenue = completedAll.reduce((sum, a) => sum + (a.price_snapshot || 0), 0);

    const payments = completedAll.flatMap((a) => offlineAppointmentsLocal.getPayments(activeBusiness.id, a.id));
    const pendingBalance = payments.reduce((sum, p) => sum + (p.balance_due || 0), 0);

    // Top service
    const serviceCounts: Record<string, number> = {};
    completedAll.forEach((a) => {
      serviceCounts[a.service_name_snapshot] = (serviceCounts[a.service_name_snapshot] || 0) + 1;
    });
    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

    // Top employee
    const empCounts: Record<string, number> = {};
    completedAll.forEach((a) => {
      if (a.employee_name_snapshot) {
        empCounts[a.employee_name_snapshot] = (empCounts[a.employee_name_snapshot] || 0) + 1;
      }
    });
    const topEmployee = Object.entries(empCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      scheduledToday,
      completedToday,
      serviceRevenue,
      pendingBalance,
      topService: topService ? { name: topService[0], count: topService[1] } : null,
      topEmployee: topEmployee ? { name: topEmployee[0], count: topEmployee[1] } : null,
    };
  }, [show, activeBusiness?.id]);

  if (!kpis) return null;

  const cards = [
    { id: 'scheduled', label: 'Programadas hoy', value: String(kpis.scheduledToday), icon: CalendarDays, accent: 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20' },
    { id: 'completed', label: 'Completadas hoy', value: String(kpis.completedToday), icon: CheckCircle, accent: 'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/20' },
    { id: 'revenue', label: 'Ingresos por servicios', value: formatCOP(kpis.serviceRevenue), icon: DollarSign, accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/20' },
    { id: 'pending', label: 'Cartera pendiente', value: formatCOP(kpis.pendingBalance), icon: Clock3, accent: kpis.pendingBalance > 0 ? 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20' : 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-800/50' },
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-gray-900 dark:text-white">Servicios y agenda</div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.id} className="app-surface rounded-[20px] p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{card.label}</div>
                <div className="mt-1.5 text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
              </div>
              <div className={`rounded-xl p-2 ${card.accent}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {(kpis.topService || kpis.topEmployee) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {kpis.topService && (
            <div className="app-surface flex items-center gap-3 rounded-[20px] p-3.5 shadow-sm">
              <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300">
                <Star className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Servicio mas vendido</div>
                <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white truncate">{kpis.topService.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{kpis.topService.count} atenciones</div>
              </div>
            </div>
          )}
          {kpis.topEmployee && (
            <div className="app-surface flex items-center gap-3 rounded-[20px] p-3.5 shadow-sm">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Empleado top</div>
                <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white truncate">{kpis.topEmployee.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{kpis.topEmployee.count} atenciones</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
