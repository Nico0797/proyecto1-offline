import React from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface ChartsPanelProps {
  salesTrend: any;
  expensesByCategory: { category: string; total: number }[];
  topProducts: any[];
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ salesTrend, expensesByCategory, topProducts }) => {
  
  // Configuración común
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#9CA3AF',
          font: { size: 12 }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: '#9CA3AF' }
      },
      y: {
        grid: { color: 'rgba(75, 85, 99, 0.1)', drawBorder: false },
        ticks: { color: '#9CA3AF', callback: (value: any) => `$${value}` }
      }
    }
  };

  // Datos de Tendencia (Ingresos)
  const lineChartData = {
    labels: salesTrend?.map((d: any) => d.date) || [],
    datasets: [
      {
        label: 'Ingresos',
        data: salesTrend?.map((d: any) => d.amount ?? d.total ?? 0) || [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  // Datos de Gastos por Categoría
  const doughnutData = {
    labels: expensesByCategory.map(e => e.category),
    datasets: [
      {
        data: expensesByCategory.map(e => e.total),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'
        ],
        borderWidth: 0,
        hoverOffset: 10
      }
    ]
  };

  // Datos de Top Productos
  const barChartData = {
    labels: topProducts.slice(0, 5).map((p: any) => p.name),
    datasets: [
      {
        label: 'Ventas ($)',
        data: topProducts.slice(0, 5).map((p: any) => p.total ?? p.total_sales ?? 0),
        backgroundColor: '#10B981',
        borderRadius: 4,
      }
    ]
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Gráfico Principal: Tendencia de Ingresos */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm col-span-1 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tendencia de Ingresos</h3>
        <div className="h-80 w-full">
          <Line options={commonOptions} data={lineChartData} />
        </div>
      </div>

      {/* Gráfico Secundario: Gastos por Categoría */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución de Gastos</h3>
        <div className="h-64 w-full flex justify-center">
          <Doughnut 
            data={doughnutData} 
            options={{
              ...commonOptions,
              cutout: '70%',
              plugins: { ...commonOptions.plugins, legend: { position: 'right' } },
              scales: {} // No scales for doughnut
            }} 
          />
        </div>
      </div>

      {/* Gráfico Terciario: Top Productos */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Productos Más Vendidos</h3>
        <div className="h-64 w-full">
          <Bar options={commonOptions} data={barChartData} />
        </div>
      </div>
    </div>
  );
};
