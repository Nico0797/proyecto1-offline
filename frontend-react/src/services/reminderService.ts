import api from './api';

export type Priority = 'low' | 'medium' | 'high';
export type ReminderStatus = 'active' | 'completed' | 'archived';

export interface Reminder {
  id: string;
  businessId: number;
  title: string;
  content: string;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  tags: string[];
  status: ReminderStatus;
  pinned: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  created_by_name?: string;
  created_by_role?: string;
}

export interface CreateReminderDTO {
  title: string;
  content?: string;
  priority?: Priority;
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
}

export interface UpdateReminderDTO {
  title?: string;
  content?: string;
  priority?: Priority;
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
  status?: ReminderStatus;
  pinned?: boolean;
}

const STORAGE_KEY_PREFIX = 'reminders_business_'; // Legacy key for reference

export const reminderService = {
  list: async (businessId: number): Promise<Reminder[]> => {
    void STORAGE_KEY_PREFIX;
    try {
      const response = await api.get(`/businesses/${businessId}/reminders`);
      return response.data.reminders;
    } catch (error) {
      console.error("Failed to fetch reminders", error);
      return [];
    }
  },

  create: async (businessId: number, data: CreateReminderDTO): Promise<Reminder> => {
    const response = await api.post(`/businesses/${businessId}/reminders`, data);
    return response.data.reminder;
  },

  update: async (businessId: number, id: string, data: UpdateReminderDTO): Promise<Reminder> => {
    const response = await api.put(`/businesses/${businessId}/reminders/${id}`, data);
    return response.data.reminder;
  },

  delete: async (businessId: number, id: string): Promise<void> => {
    await api.delete(`/businesses/${businessId}/reminders/${id}`);
  },

  toggleComplete: async (businessId: number, id: string, currentStatus: ReminderStatus): Promise<Reminder> => {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    const response = await api.put(`/businesses/${businessId}/reminders/${id}`, { status: newStatus });
    return response.data.reminder;
  },

  togglePin: async (businessId: number, id: string, currentPinned: boolean): Promise<Reminder> => {
    const response = await api.put(`/businesses/${businessId}/reminders/${id}`, { pinned: !currentPinned });
    return response.data.reminder;
  },

  archive: async (businessId: number, id: string): Promise<Reminder> => {
    const response = await api.put(`/businesses/${businessId}/reminders/${id}`, { status: 'archived' });
    return response.data.reminder;
  },
  
  restore: async (businessId: number, id: string): Promise<Reminder> => {
      const response = await api.put(`/businesses/${businessId}/reminders/${id}`, { status: 'active' });
      return response.data.reminder;
  }
};
