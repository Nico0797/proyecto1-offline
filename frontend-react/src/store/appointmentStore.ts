import { create } from 'zustand';
import type { Appointment } from '../types';
import { offlineAppointmentsLocal } from '../services/offlineAgendaLocal';

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: (businessId: number) => void;
  fetchByDate: (businessId: number, date: string) => void;
  createAppointment: (businessId: number, data: Partial<Appointment> & { service_id: number }) => Promise<Appointment>;
  updateAppointment: (businessId: number, id: number, data: Partial<Appointment>) => Appointment;
  completeAppointment: (
    businessId: number,
    id: number,
    paymentData: { payment_method: string; amount_paid: number; treasury_account_id?: number | null },
  ) => Promise<{ appointment: Appointment; saleId: number }>;
  cancelAppointment: (businessId: number, id: number) => Appointment;
  noShowAppointment: (businessId: number, id: number) => Appointment;
  removeAppointment: (businessId: number, id: number) => void;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  loading: false,
  error: null,
  fetchAppointments: (businessId) => {
    set({ loading: true, error: null });
    try {
      const appointments = offlineAppointmentsLocal.list(businessId);
      set({ appointments, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  fetchByDate: (businessId, date) => {
    set({ loading: true, error: null });
    try {
      const appointments = offlineAppointmentsLocal.listByDate(businessId, date);
      set({ appointments, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  createAppointment: async (businessId, data) => {
    set({ loading: true, error: null });
    try {
      const appointment = await offlineAppointmentsLocal.create(businessId, data);
      set((state) => ({ appointments: [appointment, ...state.appointments], loading: false }));
      return appointment;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  updateAppointment: (businessId, id, data) => {
    const updated = offlineAppointmentsLocal.update(businessId, id, data);
    set((state) => ({ appointments: state.appointments.map((a) => (a.id === id ? updated : a)) }));
    return updated;
  },
  completeAppointment: async (businessId, id, paymentData) => {
    set({ loading: true, error: null });
    try {
      const result = await offlineAppointmentsLocal.complete(businessId, id, paymentData);
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? result.appointment : a)),
        loading: false,
      }));
      return result;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  cancelAppointment: (businessId, id) => {
    const updated = offlineAppointmentsLocal.cancel(businessId, id);
    set((state) => ({ appointments: state.appointments.map((a) => (a.id === id ? updated : a)) }));
    return updated;
  },
  noShowAppointment: (businessId, id) => {
    const updated = offlineAppointmentsLocal.noShow(businessId, id);
    set((state) => ({ appointments: state.appointments.map((a) => (a.id === id ? updated : a)) }));
    return updated;
  },
  removeAppointment: (businessId, id) => {
    offlineAppointmentsLocal.remove(businessId, id);
    set((state) => ({ appointments: state.appointments.filter((a) => a.id !== id) }));
  },
}));
