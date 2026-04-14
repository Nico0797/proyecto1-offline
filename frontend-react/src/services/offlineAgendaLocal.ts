import type { Appointment, AppointmentPayment, Employee, ServiceItem, Customer } from '../types';
import { nextLocalNumericId, readLocalCollection, writeLocalCollection } from './offlineLocalData';
import { offlineSyncService } from './offlineSyncService';

// ── Collections ──────────────────────────────────────────────────────

const EMPLOYEES_COL = 'employees';
const SERVICES_COL = 'services_catalog';
const APPOINTMENTS_COL = 'appointments';
const APPT_PAYMENTS_COL = 'appointment_payments';

// ── Employees ────────────────────────────────────────────────────────

const EMPLOYEE_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
];

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const offlineEmployeesLocal = {
  list(businessId: number): Employee[] {
    return readLocalCollection<Employee>(businessId, EMPLOYEES_COL).filter((e) => e.active !== false);
  },
  listAll(businessId: number): Employee[] {
    return readLocalCollection<Employee>(businessId, EMPLOYEES_COL);
  },
  create(businessId: number, data: Partial<Employee>): Employee {
    const all = readLocalCollection<Employee>(businessId, EMPLOYEES_COL);
    const id = nextLocalNumericId(all);
    const employee: Employee = {
      id,
      business_id: businessId,
      name: String(data.name || '').trim(),
      phone: data.phone ?? null,
      role: data.role ?? null,
      active: true,
      color: data.color ?? EMPLOYEE_COLORS[id % EMPLOYEE_COLORS.length],
      compensation_type: data.compensation_type === 'percentage' ? 'percentage' : 'salary',
      salary_amount: toOptionalNumber(data.salary_amount),
      commission_percent: toOptionalNumber(data.commission_percent),
      compensation_notes: data.compensation_notes ?? null,
      created_at: new Date().toISOString(),
    };
    writeLocalCollection(businessId, EMPLOYEES_COL, [employee, ...all]);
    return employee;
  },
  update(businessId: number, id: number, data: Partial<Employee>): Employee {
    const all = readLocalCollection<Employee>(businessId, EMPLOYEES_COL);
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) throw new Error('Empleado no encontrado');
    const updated = {
      ...all[idx],
      ...data,
      compensation_type: data.compensation_type ?? all[idx].compensation_type ?? 'salary',
      salary_amount: data.salary_amount !== undefined ? toOptionalNumber(data.salary_amount) : all[idx].salary_amount ?? null,
      commission_percent: data.commission_percent !== undefined ? toOptionalNumber(data.commission_percent) : all[idx].commission_percent ?? null,
      compensation_notes: data.compensation_notes !== undefined ? data.compensation_notes ?? null : all[idx].compensation_notes ?? null,
      id,
      business_id: businessId,
    };
    all[idx] = updated;
    writeLocalCollection(businessId, EMPLOYEES_COL, all);
    return updated;
  },
  remove(businessId: number, id: number) {
    const all = readLocalCollection<Employee>(businessId, EMPLOYEES_COL);
    writeLocalCollection(businessId, EMPLOYEES_COL, all.map((e) => e.id === id ? { ...e, active: false } : e));
  },
};

// ── Service catalog ──────────────────────────────────────────────────

export const offlineServicesLocal = {
  list(businessId: number): ServiceItem[] {
    return readLocalCollection<ServiceItem>(businessId, SERVICES_COL).filter((s) => s.active !== false);
  },
  listAll(businessId: number): ServiceItem[] {
    return readLocalCollection<ServiceItem>(businessId, SERVICES_COL);
  },
  create(businessId: number, data: Partial<ServiceItem>): ServiceItem {
    const all = readLocalCollection<ServiceItem>(businessId, SERVICES_COL);
    const id = nextLocalNumericId(all);
    const service: ServiceItem = {
      id,
      business_id: businessId,
      name: String(data.name || '').trim(),
      duration_minutes: Number(data.duration_minutes || 60),
      price: Number(data.price || 0),
      category: data.category ?? null,
      active: true,
      requires_employee: data.requires_employee ?? false,
      created_at: new Date().toISOString(),
    };
    writeLocalCollection(businessId, SERVICES_COL, [service, ...all]);
    return service;
  },
  update(businessId: number, id: number, data: Partial<ServiceItem>): ServiceItem {
    const all = readLocalCollection<ServiceItem>(businessId, SERVICES_COL);
    const idx = all.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error('Servicio no encontrado');
    const updated = { ...all[idx], ...data, id, business_id: businessId };
    all[idx] = updated;
    writeLocalCollection(businessId, SERVICES_COL, all);
    return updated;
  },
  remove(businessId: number, id: number) {
    const all = readLocalCollection<ServiceItem>(businessId, SERVICES_COL);
    writeLocalCollection(businessId, SERVICES_COL, all.map((s) => s.id === id ? { ...s, active: false } : s));
  },
};

// ── Appointments ─────────────────────────────────────────────────────

const sortAppointments = (list: Appointment[]) =>
  [...list].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

const _completingSet = new Set<string>();

const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  const s1 = new Date(aStart).getTime();
  const e1 = new Date(aEnd).getTime();
  const s2 = new Date(bStart).getTime();
  const e2 = new Date(bEnd).getTime();
  return s1 < e2 && s2 < e1;
};

const validateEmployeeOverlap = (
  all: Appointment[],
  employeeId: number | null | undefined,
  startsAt: string,
  endsAt: string,
  excludeId?: number,
): string | null => {
  if (!employeeId) return null;
  const conflict = all.find(
    (a) =>
      a.id !== excludeId &&
      a.employee_id === employeeId &&
      (a.status === 'scheduled' || a.status === 'completed') &&
      rangesOverlap(startsAt, endsAt, a.starts_at, a.ends_at),
  );
  if (conflict) {
    const empName = conflict.employee_name_snapshot || `Empleado #${employeeId}`;
    const cTime = new Date(conflict.starts_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${empName} ya tiene una cita a las ${cTime} (${conflict.service_name_snapshot}). Elige otro horario o empleado.`;
  }
  return null;
};

const resolveCustomerName = async (businessId: number, customerId?: number | null): Promise<string | null> => {
  if (!customerId) return null;
  try {
    const state = await offlineSyncService.getOfflineMergedCustomers(businessId);
    const found = state.customers.find((c: Customer) => Number(c.id) === Number(customerId));
    return found?.name ?? null;
  } catch {
    return null;
  }
};

export const offlineAppointmentsLocal = {
  list(businessId: number): Appointment[] {
    return sortAppointments(readLocalCollection<Appointment>(businessId, APPOINTMENTS_COL));
  },

  listByDate(businessId: number, date: string): Appointment[] {
    const all = readLocalCollection<Appointment>(businessId, APPOINTMENTS_COL);
    return sortAppointments(all.filter((a) => a.starts_at.startsWith(date)));
  },

  async create(businessId: number, data: Partial<Appointment> & { service_id: number }): Promise<Appointment> {
    const all = readLocalCollection<Appointment>(businessId, APPOINTMENTS_COL);
    const services = offlineServicesLocal.list(businessId);
    const employees = offlineEmployeesLocal.list(businessId);
    const service = services.find((s) => s.id === data.service_id);
    const employee = data.employee_id ? employees.find((e) => e.id === data.employee_id) : null;
    const customerName = await resolveCustomerName(businessId, data.customer_id);

    const id = nextLocalNumericId(all);
    const startsAt = data.starts_at || new Date().toISOString();
    const durationMs = (service?.duration_minutes ?? data.duration_minutes ?? 60) * 60_000;
    const endsAt = data.ends_at || new Date(new Date(startsAt).getTime() + durationMs).toISOString();

    const overlapError = validateEmployeeOverlap(all, data.employee_id, startsAt, endsAt);
    if (overlapError) throw new Error(overlapError);

    const appointment: Appointment = {
      id,
      business_id: businessId,
      customer_id: data.customer_id ?? null,
      customer_name: data.customer_name || customerName,
      service_id: data.service_id,
      service_name_snapshot: service?.name ?? String(data.service_name_snapshot || 'Servicio'),
      employee_id: data.employee_id ?? null,
      employee_name_snapshot: employee?.name ?? data.employee_name_snapshot ?? null,
      employee_compensation_type: employee?.compensation_type ?? null,
      employee_commission_percent: employee?.compensation_type === 'percentage' ? Number(employee?.commission_percent || 0) : null,
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'scheduled',
      price_snapshot: data.price_snapshot ?? service?.price ?? 0,
      notes: data.notes ?? null,
      created_at: new Date().toISOString(),
      completed_at: null,
      linked_sale_id: null,
    };

    writeLocalCollection(businessId, APPOINTMENTS_COL, sortAppointments([appointment, ...all]));
    return appointment;
  },

  update(businessId: number, id: number, data: Partial<Appointment>): Appointment {
    const all = readLocalCollection<Appointment>(businessId, APPOINTMENTS_COL);
    const idx = all.findIndex((a) => a.id === id);
    if (idx < 0) throw new Error('Cita no encontrada');
    const current = all[idx];

    if (current.status === 'completed') {
      const SAFE_FIELDS = new Set(['notes']);
      const touchesSensitive = Object.keys(data).some((k) => !SAFE_FIELDS.has(k));
      if (touchesSensitive) throw new Error('No se puede editar una cita ya completada. Solo puedes modificar las notas.');
    }

    const startsAt = data.starts_at ?? current.starts_at;
    const endsAt = data.ends_at ?? current.ends_at;
    const empId = data.employee_id !== undefined ? data.employee_id : current.employee_id;
    if (current.status === 'scheduled' && (data.starts_at || data.ends_at || data.employee_id !== undefined)) {
      const overlapError = validateEmployeeOverlap(all, empId, startsAt, endsAt, id);
      if (overlapError) throw new Error(overlapError);
    }

    const employee = empId ? offlineEmployeesLocal.listAll(businessId).find((item) => item.id === empId) : null;
    const updated = {
      ...current,
      ...data,
      employee_name_snapshot: employee?.name ?? (data.employee_name_snapshot ?? current.employee_name_snapshot ?? null),
      employee_compensation_type: employee?.compensation_type ?? current.employee_compensation_type ?? null,
      employee_commission_percent: employee?.compensation_type === 'percentage'
        ? Number(employee?.commission_percent || 0)
        : (employee ? null : current.employee_commission_percent ?? null),
      id,
      business_id: businessId,
    };
    all[idx] = updated;
    writeLocalCollection(businessId, APPOINTMENTS_COL, sortAppointments(all));
    return updated;
  },

  async complete(
    businessId: number,
    appointmentId: number,
    paymentData: { payment_method: string; amount_paid: number; treasury_account_id?: number | null },
  ): Promise<{ appointment: Appointment; saleId: number }> {
    const lockKey = `${businessId}:${appointmentId}`;
    if (_completingSet.has(lockKey)) throw new Error('Esta cita ya se esta procesando. Espera un momento.');

    const all = readLocalCollection<Appointment>(businessId, APPOINTMENTS_COL);
    const idx = all.findIndex((a) => a.id === appointmentId);
    if (idx < 0) throw new Error('Cita no encontrada');

    const appt = all[idx];
    if (appt.status === 'completed') throw new Error('Esta cita ya fue completada anteriormente.');
    if (appt.linked_sale_id) throw new Error('Esta cita ya tiene una venta asociada.');
    if (appt.status === 'cancelled') throw new Error('No se puede completar una cita cancelada.');

    _completingSet.add(lockKey);
    try {
    const total = appt.price_snapshot;
    const amountPaid = Number(paymentData.amount_paid || 0);
    const isPaid = total - amountPaid <= 0.01;
    const employee = appt.employee_id ? offlineEmployeesLocal.listAll(businessId).find((item) => item.id === appt.employee_id) : null;
    const employeeCompensationType = employee?.compensation_type === 'percentage' ? 'percentage' : 'salary';
    const employeeCommissionPercent = employeeCompensationType === 'percentage'
      ? Number(employee?.commission_percent || 0)
      : 0;
    const employeeCommissionAmount = employeeCommissionPercent > 0
      ? Number(((total * employeeCommissionPercent) / 100).toFixed(2))
      : 0;

    const empLabel = appt.employee_name_snapshot ? ` · ${appt.employee_name_snapshot}` : '';
    const saleNote = `Desde cita #${appointmentId} — ${appt.service_name_snapshot}${empLabel}`;
    const sale = await offlineSyncService.createOfflineSale(businessId, {
      customer_id: appt.customer_id ?? null,
      items: [
        {
          name: appt.service_name_snapshot,
          qty: 1,
          quantity: 1,
          unit_price: total,
          total,
        },
      ],
      subtotal: total,
      discount: 0,
      total,
      sale_date: new Date().toISOString().split('T')[0],
      amount_paid: amountPaid,
      payment_method: paymentData.payment_method,
      treasury_account_id: paymentData.treasury_account_id ?? null,
      paid: isPaid,
      note: saleNote,
      total_cost: employeeCommissionAmount,
      sale_origin: 'appointment',
      appointment_id: appointmentId,
      appointment_employee: appt.employee_name_snapshot ?? null,
      appointment_service: appt.service_name_snapshot,
      appointment_employee_id: appt.employee_id ?? null,
      employee_compensation_type: employeeCompensationType,
      employee_commission_percent: employeeCommissionPercent || null,
      employee_commission_amount: employeeCommissionAmount || null,
    });

    const completed: Appointment = {
      ...appt,
      status: 'completed',
      completed_at: new Date().toISOString(),
      linked_sale_id: sale.id,
    };
    all[idx] = completed;
    writeLocalCollection(businessId, APPOINTMENTS_COL, sortAppointments(all));

    // Save payment record
    const payments = readLocalCollection<AppointmentPayment>(businessId, APPT_PAYMENTS_COL);
    const paymentId = nextLocalNumericId(payments);
    const paymentRecord: AppointmentPayment = {
      id: paymentId,
      appointment_id: appointmentId,
      payment_method: paymentData.payment_method,
      amount_paid: amountPaid,
      payment_status: isPaid ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
      balance_due: Math.max(0, total - amountPaid),
      created_at: new Date().toISOString(),
    };
    writeLocalCollection(businessId, APPT_PAYMENTS_COL, [paymentRecord, ...payments]);

    return { appointment: completed, saleId: sale.id };
    } finally {
      _completingSet.delete(lockKey);
    }
  },

  cancel(businessId: number, id: number): Appointment {
    const all = readLocalCollection<Appointment>(businessId, APPOINTMENTS_COL);
    const existing = all.find((a) => a.id === id);
    if (existing?.status === 'completed') throw new Error('No se puede cancelar una cita ya completada. Elimina la venta asociada primero.');
    return this.update(businessId, id, { status: 'cancelled' });
  },

  noShow(businessId: number, id: number): Appointment {
    return this.update(businessId, id, { status: 'no_show' });
  },

  remove(businessId: number, id: number) {
    const all = readLocalCollection<Appointment>(businessId, APPOINTMENTS_COL);
    writeLocalCollection(businessId, APPOINTMENTS_COL, all.filter((a) => a.id !== id));
  },

  getPayments(businessId: number, appointmentId: number): AppointmentPayment[] {
    return readLocalCollection<AppointmentPayment>(businessId, APPT_PAYMENTS_COL)
      .filter((p) => p.appointment_id === appointmentId);
  },
};
