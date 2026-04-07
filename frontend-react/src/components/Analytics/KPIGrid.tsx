import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KPI } from '../../services/analyticsService';

interface KPICardProps {
  kpi: KPI;
}

const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const { label, value, prefix = '', suffix = '', trend, change, color } = kpi;
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  // Color base classes
  const colorClasses = {
    'text-green-500': 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    'text-red-500': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    'text-blue-500': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    'text-gray-500': 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60',
  };

  const trendColorClass = trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-500';

  return (
    <div className="app-surface group rounded-xl p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </h3>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || 'bg-gray-100 dark:bg-gray-800'}`}>
          <TrendIcon className="w-5 h-5" />
        </div>
      </div>
      
      {change !== undefined && (
        <div className="flex items-center text-sm">
          <span className={`font-medium flex items-center ${trendColorClass} mr-2`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
          <span className="text-gray-400 text-xs">vs periodo anterior</span>
        </div>
      )}
    </div>
  );
};

export const KPIGrid: React.FC<{ kpis: KPI[] }> = ({ kpis }) => {
  return (
    <div className="dashboard-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
};
