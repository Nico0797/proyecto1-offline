import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface AnalyticsHeaderProps {
  period: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ period, onPeriodChange, onRefresh, loading }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analíticas PRO</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Visión 360° de tu negocio</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 flex">
          {['7d', '30d', '90d', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {p === 'month' ? 'Este Mes' : p.toUpperCase()}
            </button>
          ))}
        </div>

        <Button variant="outline" onClick={onRefresh} disabled={loading} className="h-9">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
        
        <Button variant="secondary" className="h-9">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>
    </div>
  );
};
