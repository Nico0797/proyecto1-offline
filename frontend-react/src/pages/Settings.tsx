import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { ProGate } from '../components/ui/ProGate';
import { FEATURES } from '../auth/plan';
import { 
  User, 
  Building2, 
  LayoutTemplate, 
  Star
} from 'lucide-react';

import { ProfileSettingsTab } from '../components/Settings/ProfileSettingsTab';
import { BusinessSettingsTab } from '../components/Settings/BusinessSettingsTab';
import { NotificationSettingsTab } from '../components/Settings/NotificationSettingsTab';
import { TemplatesSettingsTab } from '../components/Settings/TemplatesSettingsTab';
import { MembershipTab } from '../components/Settings/MembershipTab';

export const Settings = () => {
  const { user } = useAuthStore();
  // const { activeBusiness } = useBusinessStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'business' | 'notifications' | 'templates' | 'membership' | 'appearance'>('profile');

  // Redirect if trying to access membership as free user
  // This logic was here, but maybe we should allow it for upgrade?
  // But for now, let's keep it consistent or remove it if we want to show membership page.
  // The user didn't ask to change Membership tab specifically, but "Fuente de verdad del plan..."
  
  useEffect(() => {
    if (activeTab === 'membership' && user?.plan !== 'pro') {
      // setActiveTab('profile'); 
      // Actually, Membership tab is a good place to show plan status and upgrade button.
      // But the previous code hid it. Let's keep it hidden if the previous developer intended it, 
      // or show it if we want to facilitate upgrade.
      // Given "UI premium... sin alerts feos", maybe showing it is better.
      // But for now I'll stick to the explicit requirement about Templates.
    }
  }, [activeTab, user]);

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'business', label: 'Negocio', icon: Building2 },
    // { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'templates', label: 'Plantillas', icon: LayoutTemplate },
    // Only show Membership tab if PRO
    ...(user?.plan === 'pro' ? [{ id: 'membership', label: 'Membresía', icon: Star }] : []),
    // { id: 'appearance', label: 'Apariencia', icon: Palette }, // Future implementation
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh] px-4 sm:px-6 lg:px-8 py-4" data-tour="settings.panel">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col lg:justify-between lg:h-[calc(100vh-120px)] lg:sticky lg:top-6">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Ajustes</h1>
            <p className="text-gray-400 text-sm">Gestiona tu cuenta y preferencias.</p>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  data-tour={
                      tab.id === 'profile' ? 'settings.profile' :
                      tab.id === 'business' ? 'settings.business' :
                      tab.id === 'templates' ? 'settings.whatsapp' :
                      tab.id === 'membership' ? 'settings.billing' :
                      undefined
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-8 border-t border-gray-800 mt-auto">
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl">
          {activeTab === 'profile' && <ProfileSettingsTab />}
          {activeTab === 'business' && <BusinessSettingsTab />}
          {activeTab === 'notifications' && <NotificationSettingsTab />}
          {activeTab === 'templates' && (
            <ProGate feature={FEATURES.WHATSAPP_TEMPLATES} mode="block">
              <TemplatesSettingsTab />
            </ProGate>
          )}
          {activeTab === 'membership' && <MembershipTab />}
        </div>
      </main>
    </div>
  );
};
