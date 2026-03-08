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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORT_TYPES.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading === report.id;

          return (
            <Card key={report.id} className="p-6 flex flex-col justify-between h-full hover:shadow-lg transition-shadow border-l-4 border-l-transparent hover:border-l-blue-500">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${report.color}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {report.title}
                </h3>
                <p className="text-base text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                  {report.description}
                </p>
              </div>
              
              <Button 
                size="lg"
                className="w-full justify-center group text-base py-6"
                onClick={() => handleDownload(report.id, report.title)}
                disabled={globalLoading || isDownloading}
              >
                {isDownloading ? (
                   <span className="flex items-center gap-3">
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     Generando Reporte...
                   </span>
                ) : (
                   <span className="flex items-center gap-3">
                     <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                     Descargar Excel Completo
                   </span>
                )}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
