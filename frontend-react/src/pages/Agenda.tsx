import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, Plus, Settings, Users } from 'lucide-react';
import {
  CompactActionGroup,
  ContentAnchor,
  ContentSection,
  PageHeader,
  PageHeaderActionButton,
  PageLayout,
  PageNotice,
  PageStack,
  SectionStack,
  SummarySection,
  ToolbarSection,
} from '../components/Layout/PageLayout';
import {
  MobileFilterDrawer,
  MobileHelpDisclosure,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';
import { Button } from '../components/ui/Button';
import { SwipePager } from '../components/ui/SwipePager';
import { toast } from 'react-hot-toast';
import { useBusinessStore } from '../store/businessStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { useEmployeeStore } from '../store/employeeStore';
import { useServiceCatalogStore } from '../store/serviceCatalogStore';
import { useSaleStore } from '../store/saleStore';
import { useExpenseStore } from '../store/expenseStore';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { offlineSyncService } from '../services/offlineSyncService';
import type { Appointment, Customer, Employee } from '../types';
import { shouldShowAgendaForBusiness } from '../config/businessOnboardingPresets';

import { AppointmentCard } from '../components/Agenda/AppointmentCard';
import { AgendaToolbar } from '../components/Agenda/AgendaToolbar';
import { AgendaKpis } from '../components/Agenda/AgendaKpis';
import { CreateAppointmentModal } from '../components/Agenda/CreateAppointmentModal';
import { CompleteAppointmentModal } from '../components/Agenda/CompleteAppointmentModal';
import { ManageServicesModal } from '../components/Agenda/ManageServicesModal';
import { ManageEmployeesModal } from '../components/Agenda/ManageEmployeesModal';
import { AgendaMonthCalendar } from '../components/Agenda/AgendaMonthCalendar';
import { todayISO } from '../components/Agenda/helpers';

export const Agenda = () => {
  const { activeBusiness } = useBusinessStore();
  const { appointments, loading, fetchAppointments, completeAppointment, cancelAppointment, noShowAppointment, createAppointment, updateAppointment } = useAppointmentStore();
  const { employees, fetchEmployees, createEmployee, updateEmployee, removeEmployee } = useEmployeeStore();
  const { services, fetchServices, createService, updateService, removeService } = useServiceCatalogStore();
  const { fetchSales } = useSaleStore();
  const { addExpense } = useExpenseStore();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<string>('calendar');
  const [dateFilter, setDateFilter] = useState(todayISO());
  const [calendarMonth, setCalendarMonth] = useState(() => todayISO().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState<number | ''>('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const businessId = activeBusiness?.id;

  useEffect(() => {
    if (!businessId) return;
    fetchAppointments(businessId);
    fetchEmployees(businessId);
    fetchServices(businessId);
    offlineSyncService.getOfflineMergedCustomers(businessId).then((state) => setCustomers(state.customers)).catch(() => {});
  }, [businessId, fetchAppointments, fetchEmployees, fetchServices]);

  useEffect(() => {
    if (!dateFilter) return;
    const monthValue = dateFilter.slice(0, 7);
    if (monthValue && monthValue !== calendarMonth) {
      setCalendarMonth(monthValue);
    }
  }, [dateFilter]);

  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (dateFilter) list = list.filter((a) => a.starts_at.startsWith(dateFilter));
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    if (employeeFilter) list = list.filter((a) => a.employee_id === employeeFilter);
    return list;
  }, [appointments, dateFilter, statusFilter, employeeFilter]);

  const appointmentsForSelectedDay = useMemo(
    () => appointments.filter((appointment) => appointment.starts_at.startsWith(dateFilter)),
    [appointments, dateFilter],
  );

  const statusCounts = useMemo(() => {
    const base = dateFilter ? appointments.filter((a) => a.starts_at.startsWith(dateFilter)) : appointments;
    return {
      scheduled: base.filter((a) => a.status === 'scheduled').length,
      completed: base.filter((a) => a.status === 'completed').length,
      cancelled: base.filter((a) => a.status === 'cancelled').length,
      no_show: base.filter((a) => a.status === 'no_show').length,
    };
  }, [appointments, dateFilter]);

  const handleCreate = async (data: Partial<Appointment> & { service_id: number }) => {
    if (!businessId || isProcessing) return;
    setIsProcessing(true);
    try {
      await createAppointment(businessId, data);
      setIsCreateOpen(false);
      setEditingAppt(null);
      toast.success('Cita agendada');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo crear la cita');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = (data: Partial<Appointment> & { service_id: number }) => {
    if (!businessId || !editingAppt || isProcessing) return;
    setIsProcessing(true);
    try {
      updateAppointment(businessId, editingAppt.id, data);
      setIsCreateOpen(false);
      setEditingAppt(null);
      toast.success('Cita actualizada');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar la cita');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async (paymentData: { payment_method: string; amount_paid: number; treasury_account_id?: number | null }) => {
    if (!businessId || !completingAppt || isProcessing) return;
    setIsProcessing(true);
    try {
      await completeAppointment(businessId, completingAppt.id, paymentData);
      await fetchSales(businessId, { includeItems: false });
      setCompletingAppt(null);
      toast.success('Cita completada y venta registrada');
    } catch (err: any) {
      toast.error(err?.message || 'Error al completar la cita');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async (appt: Appointment) => {
    if (!businessId) return;
    const accepted = await confirm({
      title: 'Cancelar cita',
      message: `Se cancelara la cita de ${appt.service_name_snapshot}. Esta accion no genera venta.`,
      confirmLabel: 'Cancelar cita',
      cancelLabel: 'Volver',
      variant: 'destructive',
    });
    if (!accepted) return;
    try {
      cancelAppointment(businessId, appt.id);
      toast.success('Cita cancelada');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cancelar la cita');
    }
  };

  const handleNoShow = async (appt: Appointment) => {
    if (!businessId) return;
    const accepted = await confirm({
      title: 'Marcar como no asistio',
      message: `Se marcara la cita de ${appt.service_name_snapshot} como "no asistio".`,
      confirmLabel: 'Confirmar',
      cancelLabel: 'Volver',
    });
    if (!accepted) return;
    noShowAppointment(businessId, appt.id);
  };

  const handleEdit = (appt: Appointment) => {
    if (appt.status === 'completed') {
      toast.error('No se puede editar una cita completada.');
      return;
    }
    if (appt.status === 'cancelled') {
      toast.error('No se puede editar una cita cancelada.');
      return;
    }
    setEditingAppt(appt);
    setIsCreateOpen(true);
  };

  const handleNewAppt = () => {
    setEditingAppt(null);
    setIsCreateOpen(true);
  };

  const handleRegisterSalaryExpense = async (employee: Employee) => {
    if (!businessId) return;
    const amount = Number(employee.salary_amount || 0);
    if (amount <= 0) {
      toast.error('Define un sueldo fijo antes de registrarlo como gasto.');
      return;
    }
    try {
      await addExpense(businessId, {
        category: 'nomina',
        amount,
        description: `Pago de sueldo: ${employee.name}`,
        expense_date: new Date().toISOString().split('T')[0],
        source_type: 'manual',
        payment_method: 'cash',
      });
      toast.success('Sueldo registrado en gastos.');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo registrar el sueldo.');
    }
  };

  const hasActiveFilters = statusFilter !== 'all' || !!employeeFilter;
  const mobileFilterSummary = hasActiveFilters ? 'Con filtros activos' : 'Fecha, estado y empleado';
  const mobileFilters = useMobileFilterDraft({
    value: { dateFilter, statusFilter, employeeFilter },
    onApply: (v) => { setDateFilter(v.dateFilter); setStatusFilter(v.statusFilter); setEmployeeFilter(v.employeeFilter); },
    createEmptyValue: () => ({ dateFilter: todayISO(), statusFilter: 'all', employeeFilter: '' as number | '' }),
  });

  const showEmployeeSetupNotice = shouldShowAgendaForBusiness(activeBusiness) && employees.length === 0;
  const showServicesSetupNotice = services.length === 0;
  const selectedDateLabel = useMemo(() => {
    try {
      return new Date(`${dateFilter}T12:00:00`).toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return dateFilter;
    }
  }, [dateFilter]);

  const renderSetupNotices = (className?: string) => (
    <div className={className}>
      {showServicesSetupNotice ? (
        <PageNotice
          title="Primero crea tu primer servicio"
          description="Necesitas al menos un servicio para poder agendar citas. Puedes agregarlo ahora mismo desde este modulo."
          action={(
            <Button variant="secondary" onClick={() => setIsServicesOpen(true)}>
              <Settings className="h-4 w-4" /> Crear servicio
            </Button>
          )}
        />
      ) : null}
      {showEmployeeSetupNotice ? (
        <PageNotice
          title="Agrega empleados cuando tu agenda lo necesite"
          description="Si trabajas con equipo, crea tus empleados para asignarlos a las citas. Si trabajas solo, puedes seguir sin asignar uno."
          action={(
            <Button variant="secondary" onClick={() => setIsEmployeesOpen(true)}>
              <Users className="h-4 w-4" /> Crear empleado
            </Button>
          )}
        />
      ) : null}
    </div>
  );

  const renderList = () => (
    <div className="space-y-3">
      {renderSetupNotices('lg:hidden')}
      {filteredAppointments.length === 0 && !loading && (
        <div className="py-16 text-center">
          <CalendarDays className="mx-auto h-10 w-10 app-text-muted" />
          <p className="mt-3 text-sm font-medium app-text">Sin citas para esta fecha</p>
          <p className="mt-1 text-xs app-text-muted">Agenda una nueva cita para comenzar.</p>
          <Button variant="outline" className="mt-4" onClick={handleNewAppt}>
            <Plus className="h-4 w-4" /> Nueva cita
          </Button>
        </div>
      )}
      {filteredAppointments.map((appt) => (
        <AppointmentCard
          key={appt.id}
          appointment={appt}
          onComplete={setCompletingAppt}
          onCancel={handleCancel}
          onNoShow={handleNoShow}
          onEdit={handleEdit}
        />
      ))}
    </div>
  );

  const renderDayWorkspace = () => (
    <SectionStack>
      <div className="hidden lg:block">
        <PageStack>
          <PageNotice
            description="Agendar una cita no genera venta. Solo al completarla se registrara el cobro y la venta."
            dismissible
          />
          {renderSetupNotices('hidden lg:block')}
          <SummarySection title="Resumen del dia" description="Estado de las citas filtradas.">
            <AgendaKpis appointments={filteredAppointments} />
          </SummarySection>
          <ToolbarSection>
            <AgendaToolbar
              date={dateFilter}
              onDateChange={setDateFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              employeeFilter={employeeFilter}
              onEmployeeFilterChange={setEmployeeFilter}
              employees={employees}
              statusCounts={statusCounts}
            />
          </ToolbarSection>
        </PageStack>
      </div>

      <ContentSection>
        <MobileUnifiedPageShell
          utilityBar={
            <MobileUtilityBar>
              <Button
                variant="secondary"
                onClick={() => setActiveTab('calendar')}
                className="w-full justify-center gap-2 sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" /> Calendario
              </Button>
              <MobileFilterDrawer summary={mobileFilterSummary} {...mobileFilters.sheetProps}>
                <AgendaToolbar
                  date={mobileFilters.draft.dateFilter}
                  onDateChange={(v) => mobileFilters.setDraft((c) => ({ ...c, dateFilter: v }))}
                  statusFilter={mobileFilters.draft.statusFilter}
                  onStatusFilterChange={(v) => mobileFilters.setDraft((c) => ({ ...c, statusFilter: v }))}
                  employeeFilter={mobileFilters.draft.employeeFilter}
                  onEmployeeFilterChange={(v) => mobileFilters.setDraft((c) => ({ ...c, employeeFilter: v }))}
                  employees={employees}
                  statusCounts={statusCounts}
                />
              </MobileFilterDrawer>
              <MobileSummaryDrawer summary={`${filteredAppointments.length} cita(s)`}>
                <AgendaKpis appointments={filteredAppointments} />
              </MobileSummaryDrawer>
              <MobileHelpDisclosure summary="Como usar la agenda">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Agenda citas con tus clientes. Al completar una cita, se registra automaticamente la venta y el pago.
                </p>
              </MobileHelpDisclosure>
            </MobileUtilityBar>
          }
        >
          <div className="space-y-4">
            <div className="app-section-card space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold capitalize app-text">{selectedDateLabel}</div>
                  <div className="text-xs app-text-muted">
                    {appointmentsForSelectedDay.length} cita(s) en el dia seleccionado
                  </div>
                </div>
                <Button variant="secondary" onClick={handleNewAppt} className="shrink-0 gap-2">
                  <Plus className="h-4 w-4" /> Nueva
                </Button>
              </div>
            </div>
            {renderList()}
          </div>
        </MobileUnifiedPageShell>
      </ContentSection>
    </SectionStack>
  );

  const renderCalendarWorkspace = () => (
    <SectionStack>
      <PageStack>
        {renderSetupNotices()}
        <PageNotice
          description="Usa el calendario para detectar rapido los dias con actividad y toca uno para abrir el detalle de ese dia."
          dismissible
        />
        <ContentSection>
          <div className="space-y-4">
            <div className="app-section-card">
              <AgendaMonthCalendar
                appointments={appointments}
                selectedDate={dateFilter}
                visibleMonth={calendarMonth}
                onMonthChange={setCalendarMonth}
                onSelectDate={(nextDate) => {
                  setDateFilter(nextDate);
                  setActiveTab('day');
                }}
              />
            </div>

            <div className="app-section-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold capitalize app-text">{selectedDateLabel}</div>
                  <p className="mt-1 text-xs app-text-muted">
                    Vista rapida del dia seleccionado. Desde aqui puedes entrar al detalle operativo.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setActiveTab('day')} className="shrink-0 gap-2">
                  Ver dia
                </Button>
              </div>

              {appointmentsForSelectedDay.length > 0 ? (
                <div className="space-y-2">
                  {appointmentsForSelectedDay.slice(0, 3).map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onComplete={setCompletingAppt}
                      onCancel={handleCancel}
                      onNoShow={handleNoShow}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-[color:var(--app-border)] px-4 py-5 text-sm app-text-muted">
                  No hay citas en este dia. Puedes crear una nueva desde el detalle diario.
                </div>
              )}
            </div>
          </div>
        </ContentSection>
      </PageStack>
    </SectionStack>
  );

  return (
    <PageLayout>
      <PageHeader
        title="Agenda"
        description="Gestiona citas, servicios y empleados."
        mobileFab={{
          label: '+Cita',
          icon: Plus,
          onClick: handleNewAppt,
        }}
        action={
          <CompactActionGroup
            collapseLabel="Mas"
            primary={
              <PageHeaderActionButton onClick={handleNewAppt} icon={Plus} label="Nueva cita" mobileLabel="Cita" />
            }
            secondary={[
              <Button key="svc" variant="secondary" onClick={() => setIsServicesOpen(true)} className="w-full gap-2 sm:w-auto">
                <Settings className="w-4 h-4" /> Servicios
              </Button>,
              <Button key="emp" variant="secondary" onClick={() => setIsEmployeesOpen(true)} className="w-full gap-2 sm:w-auto">
                <Users className="w-4 h-4" /> Empleados
              </Button>,
            ]}
          />
        }
      />

      <ContentAnchor />

      <SwipePager
        activePageId={activeTab}
        onPageChange={setActiveTab}
        className="flex-1"
        pages={[
          {
            id: 'calendar',
            title: 'Calendario',
            mobileTitle: 'Calendario',
            icon: CalendarDays,
            content: renderCalendarWorkspace(),
          },
          {
            id: 'day',
            title: 'Detalle del dia',
            mobileTitle: 'Dia',
            icon: CalendarDays,
            content: renderDayWorkspace(),
          },
        ]}
      />

      <CreateAppointmentModal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setEditingAppt(null); }}
        onSubmit={editingAppt ? handleUpdate : handleCreate}
        services={services}
        employees={employees}
        customers={customers}
        editing={editingAppt}
        defaultDate={dateFilter}
      />

      <CompleteAppointmentModal
        appointment={completingAppt}
        onClose={() => setCompletingAppt(null)}
        onConfirm={handleComplete}
        isProcessing={isProcessing}
      />

      <ManageServicesModal
        isOpen={isServicesOpen}
        onClose={() => setIsServicesOpen(false)}
        services={services}
        onCreate={(data) => businessId && createService(businessId, data)}
        onUpdate={(id, data) => businessId && updateService(businessId, id, data)}
        onRemove={(id) => businessId && removeService(businessId, id)}
      />

      <ManageEmployeesModal
        isOpen={isEmployeesOpen}
        onClose={() => setIsEmployeesOpen(false)}
        employees={employees}
        onCreate={(data) => businessId && createEmployee(businessId, data)}
        onUpdate={(id, data) => businessId && updateEmployee(businessId, id, data)}
        onRemove={(id) => businessId && removeEmployee(businessId, id)}
        onRegisterSalaryExpense={handleRegisterSalaryExpense}
      />
    </PageLayout>
  );
};
