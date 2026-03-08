import { Business } from '../types';

export interface ProfileSettings {
  name: string;
  email: string;
  phone?: string;
  currency?: string;
}

export interface BusinessSettings {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  logoUrl?: string;
  taxId?: string; // NIT/RUT
  invoicePrefix?: string;
}

export interface NotificationSettings {
  debtAlerts: boolean;
  recurringAlerts: boolean;
  reminders: boolean;
  showBadges: boolean;
  weeklySummary: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'sm' | 'md' | 'lg';
  density: 'compact' | 'normal';
}

export const settingsService = {
  // Profile
  getProfile: (): ProfileSettings => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const localProfile = JSON.parse(localStorage.getItem('profile_settings') || '{}');
    return {
      name: user.name || '',
      email: user.email || '',
      phone: localProfile.phone || '',
      currency: localProfile.currency || 'COP'
    };
  },
  
  updateProfile: async (data: ProfileSettings): Promise<void> => {
    // In a real app, this would hit an API
    // await api.put('/user/profile', data);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...user, name: data.name, email: data.email }));
    localStorage.setItem('profile_settings', JSON.stringify(data));
  },

  // Business
  getBusiness: (business: Business | null): BusinessSettings => {
    if (!business) return { name: '' };
    const localBiz = JSON.parse(localStorage.getItem(`business_settings_${business.id}`) || '{}');
    return {
      name: business.name,
      address: localBiz.address || '',
      city: localBiz.city || '',
      phone: localBiz.phone || '',
      logoUrl: localBiz.logoUrl || '',
      taxId: localBiz.taxId || '',
      invoicePrefix: localBiz.invoicePrefix || ''
    };
  },

  updateBusiness: async (businessId: number, data: BusinessSettings): Promise<void> => {
    // await api.put(`/businesses/${businessId}`, data);
    localStorage.setItem(`business_settings_${businessId}`, JSON.stringify(data));
    // Also update main business store if needed via API call
  },

  // Notifications
  getNotifications: (): NotificationSettings => {
    const defaults: NotificationSettings = {
      debtAlerts: true,
      recurringAlerts: true,
      reminders: true,
      showBadges: true,
      weeklySummary: true
    };
    const local = JSON.parse(localStorage.getItem('notification_settings') || 'null');
    return local || defaults;
  },

  updateNotifications: (data: NotificationSettings): void => {
    localStorage.setItem('notification_settings', JSON.stringify(data));
  },

  // Appearance
  getAppearance: (): AppearanceSettings => {
    const defaults: AppearanceSettings = {
      theme: 'auto',
      fontSize: 'md',
      density: 'normal'
    };
    const local = JSON.parse(localStorage.getItem('appearance_settings') || 'null');
    return local || defaults;
  },

  updateAppearance: (data: AppearanceSettings): void => {
    localStorage.setItem('appearance_settings', JSON.stringify(data));
    // Apply theme immediately if needed
    if (data.theme === 'dark' || (data.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  },

  // Templates (WhatsApp already exists in business, expanding here if needed)
  getTemplates: (businessId: number) => {
    const local = JSON.parse(localStorage.getItem(`templates_${businessId}`) || '{}');
    return {
      sale: local.sale || 'Hola {cliente}, tu compra en {negocio} por ${total} fue exitosa.',
      debt: local.debt || 'Hola {cliente}, te recordamos tu saldo pendiente de ${saldo} en {negocio}.',
      welcome: local.welcome || '¡Bienvenido a {negocio}, {cliente}!',
      payment: local.payment || 'Hola {cliente}, hemos recibido tu abono de ${monto} en {negocio}. Tu nuevo saldo es ${saldo}. ¡Gracias!'
    };
  },

  updateTemplates: (businessId: number, templates: any) => {
    localStorage.setItem(`templates_${businessId}`, JSON.stringify(templates));
  },

  // Membership
  getMembershipInfo: () => {
      // Mock data based on user plan
      return {
          nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          paymentMethod: 'Visa termina en 4242',
          billingCycle: 'Mensual'
      };
  }
};
