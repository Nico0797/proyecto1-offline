import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  Calendar,
  Package,
  Activity,
  CreditCard,
  PieChart
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { analyticsService } from '../../services/analyticsService';
import { downloadFile, generateFilename } from '../../utils/downloadHelper';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from 'react-hot-toast';

interface CombinedReportsTabProps {
  dateRange: { start: string; end: string };
  loading?: boolean;
}

const REPORT_TYPES = [
  {
    id: 'general_business',
    title: 'Reporte General del Negocio',
    description: 'Resumen ejecutivo, ventas diarias, ventas por cliente, productos top y análisis de utilidad. El reporte más completo.',
    icon: Activity,
    color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    id: 'customers_full',
    title: 'Reporte de Clientes 360°',
    description: 'Directorio completo, ranking de mejores clientes (VIP) y cartera de deudores (cuentas por cobrar).',
    icon: Users,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    id: 'products_full',
    title: 'Catálogo y Rotación',
    description: 'Inventario actual, productos más vendidos, ingresos por producto y alertas de stock bajo.',
    icon: ShoppingBag,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    id: 'finance_full',
    title: 'Reporte Financiero',
    description: 'Balance general, desglose detallado de gastos por categoría y flujo de caja simple.',
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  }
];

export const CombinedReportsTab: React.FC<CombinedReportsTabProps> = ({ dateRange, loading: globalLoading }) => {
  const { activeBusiness } = useBusinessStore();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (reportId: string, title: string) => {
    if (!activeBusiness) return;
    
    setDownloading(reportId);
    try {
      // 1. Get URL from backend
      const url = await analyticsService.getExportUrl(activeBusiness.id, 'combined', {
        type: reportId,
        startDate: dateRange.start,
        endDate: dateRange.end
      });

      // 2. Download file using helper
      const filename = generateFilename(title.toLowerCase().replace(/ /g, '_'), dateRange.start, dateRange.end);
      const token = localStorage.getItem('token') || undefined;
      
      await downloadFile(url, { filename }, token);

    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {REPORT_TYPES.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading === report.id;

          return (
            <Card 
              key={report.id} 
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800"
            >
              {/* Decorative gradient background opacity */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${report.color.split(' ')[1]} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`} />

              <div className="p-5 md:p-6 flex flex-col h-full relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl shrink-0 ${report.color} shadow-sm`}>
                    <Icon className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2 md:line-clamp-none">
                      {report.description}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <Button 
                    variant="outline"
                    size="lg"
                    className={`w-full justify-between group/btn text-sm md:text-base h-12 md:h-14 border-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all ${
                      isDownloading ? 'cursor-wait opacity-80' : ''
                    }`}
                    onClick={() => handleDownload(report.id, report.title)}
                    disabled={globalLoading || isDownloading}
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {isDownloading ? 'Generando...' : 'Descargar Excel'}
                    </span>
                    
                    {isDownloading ? (
                       <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                       <div className={`p-1.5 rounded-lg ${report.color} bg-opacity-20`}>
                         <Download className="w-4 h-4 md:w-5 md:h-5" />
                       </div>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
