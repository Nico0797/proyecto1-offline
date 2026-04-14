import { create } from 'zustand';
import type { Employee } from '../types';
import { offlineEmployeesLocal } from '../services/offlineAgendaLocal';

interface EmployeeState {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  fetchEmployees: (businessId: number) => void;
  createEmployee: (businessId: number, data: Partial<Employee>) => Employee;
  updateEmployee: (businessId: number, id: number, data: Partial<Employee>) => Employee;
  removeEmployee: (businessId: number, id: number) => void;
}

export const useEmployeeStore = create<EmployeeState>((set) => ({
  employees: [],
  loading: false,
  error: null,
  fetchEmployees: (businessId) => {
    set({ loading: true, error: null });
    try {
      const employees = offlineEmployeesLocal.list(businessId);
      set({ employees, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  createEmployee: (businessId, data) => {
    const employee = offlineEmployeesLocal.create(businessId, data);
    set((state) => ({ employees: [employee, ...state.employees] }));
    return employee;
  },
  updateEmployee: (businessId, id, data) => {
    const updated = offlineEmployeesLocal.update(businessId, id, data);
    set((state) => ({ employees: state.employees.map((e) => (e.id === id ? updated : e)) }));
    return updated;
  },
  removeEmployee: (businessId, id) => {
    offlineEmployeesLocal.remove(businessId, id);
    set((state) => ({ employees: state.employees.filter((e) => e.id !== id) }));
  },
}));
