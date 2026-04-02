import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface AnalyticsHeaderProps {
  onRefresh: () => void;
  loading: boolean;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ onRefresh, loading }) => {
  return (
    <div className="app-toolbar flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analiticas PRO</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Vision 360 del negocio en el periodo activo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={loading} className="min-w-[148px]">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>

        <Button variant="secondary" className="min-w-[148px]">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>
    </div>
  );
};
