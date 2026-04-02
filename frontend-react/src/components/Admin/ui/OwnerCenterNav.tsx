import { Activity, BellRing, HeartPulse, LayoutDashboard, LineChart, Store } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../../utils/cn';

const items = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/revenue', label: 'Revenue', icon: LineChart },
  { to: '/admin/businesses', label: 'Businesses', icon: Store },
  { to: '/admin/health', label: 'Health', icon: HeartPulse },
  { to: '/admin/activity', label: 'Activity', icon: Activity },
  { to: '/admin/alerts', label: 'Alerts', icon: BellRing },
];

export const OwnerCenterNav = () => {
  return (
    <div className="app-soft-surface flex flex-wrap items-center gap-2 rounded-2xl p-2">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn(
            'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'app-tab-active'
              : 'app-tab-idle'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </div>
  );
};
