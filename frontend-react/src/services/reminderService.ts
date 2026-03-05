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

const STORAGE_KEY_PREFIX = 'reminders_business_';

export const reminderService = {
  list: (businessId: number): Reminder[] => {
    const key = `${STORAGE_KEY_PREFIX}${businessId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  create: (businessId: number, data: CreateReminderDTO): Reminder => {
    const reminders = reminderService.list(businessId);
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      businessId,
      title: data.title,
      content: data.content || '',
      priority: data.priority || 'medium',
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      tags: data.tags || [],
      status: 'active',
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedList = [newReminder, ...reminders];
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${businessId}`, JSON.stringify(updatedList));
    return newReminder;
  },

  update: (businessId: number, id: string, data: UpdateReminderDTO): Reminder | null => {
    const reminders = reminderService.list(businessId);
    const index = reminders.findIndex(r => r.id === id);
    if (index === -1) return null;

    const updatedReminder = {
      ...reminders[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    reminders[index] = updatedReminder;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${businessId}`, JSON.stringify(reminders));
    return updatedReminder;
  },

  delete: (businessId: number, id: string): void => {
    const reminders = reminderService.list(businessId);
    const filtered = reminders.filter(r => r.id !== id);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${businessId}`, JSON.stringify(filtered));
  },

  toggleComplete: (businessId: number, id: string): Reminder | null => {
    const reminders = reminderService.list(businessId);
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return null;

    const newStatus = reminder.status === 'completed' ? 'active' : 'completed';
    return reminderService.update(businessId, id, { status: newStatus });
  },

  togglePin: (businessId: number, id: string): Reminder | null => {
    const reminders = reminderService.list(businessId);
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return null;

    return reminderService.update(businessId, id, { pinned: !reminder.pinned });
  },

  archive: (businessId: number, id: string): Reminder | null => {
    return reminderService.update(businessId, id, { status: 'archived' });
  },
  
  restore: (businessId: number, id: string): Reminder | null => {
      return reminderService.update(businessId, id, { status: 'active' });
  }
};
