import React from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { balanceService, BalanceSummary, BalanceMovement, PeriodType } from '../../services/balanceService';
import { PeriodSelector } from '../Balance/PeriodSelector';
import { MovementsTable } from '../Balance/MovementsTable';
import { SummaryCard } from '../Dashboard/SummaryCard';
import { TrendingUp, TrendingDown, Wallet, Lightbulb, AlertTriangle } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export const BalanceTab = () => {
  const { activeBusiness } = useBusinessStore();
  const [period, setPeriod] = React.useState<PeriodType>('monthly');
  const [startDate, setStartDate] = React.useState(new Date());
  const [endDate, setEndDate] = React.useState(new Date());
  
  const [summary, setSummary] = React.useState<BalanceSummary | null>(null);
  const [movements, setMovements] = React.useState<BalanceMovement[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (activeBusiness && startDate && endDate) {
      loadData();
    }
  }, [activeBusiness, startDate, endDate]);

  const loadData = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    try {
        const [sum, movs] = await Promise.all([
            balanceService.getSummary(activeBusiness.id, startStr, endStr),
            balanceService.getMovements(activeBusiness.id, startStr, endStr)
        ]);
        setSummary(sum);
        setMovements(movs);
    } catch (err) {
        console.error("Error loading balance data", err);
    } finally {
        setLoading(false);
    }
  };

  // Insights Logic
  const getInsights = () => {
      if (!summary) return [];
      const insights = [];

      if (summary.expenses > summary.income) {
          insights.push({
              type: 'warning',
              icon: AlertTriangle,
              title: 'Gastos Superiores',
              text: 'Tus gastos superan tus ingresos en este periodo. Revisa categorías no esenciales.'
          });
      }

      const expenseChange = summary.previousExpenses > 0 ? ((summary.expenses - summary.previousExpenses) / summary.previousExpenses) * 100 : 0;
      if (expenseChange > 10) {
           insights.push({
              type: 'warning', // Changed to warning for visibility
              icon: TrendingDown,
              title: 'Aumento de Gastos',
              text: `Tus gastos han subido un ${expenseChange.toFixed(1)}% respecto al periodo anterior.`
          });
      } else if (summary.income > summary.previousIncome && summary.previousIncome > 0) {
           insights.push({
              type: 'success',
              icon: TrendingUp,
              title: 'Crecimiento de Ingresos',
              text: `¡Bien hecho! Tus ingresos han aumentado un ${((summary.income - summary.previousIncome) / summary.previousIncome * 100).toFixed(1)}%.`
          });
      }

      if (summary.margin > 20) {
          insights.push({
              type: 'success',
              icon: Lightbulb,
              title: 'Margen Saludable',
              text: `¡Excelente! Mantienes un margen de utilidad del ${summary.margin.toFixed(1)}%.`
          });
      }
      
      return insights.slice(0, 3); // Max 3 insights
  };

  const insights = getInsights();

  // Chart Data Preparation
  const chartData = {
      labels: ['Ingresos', 'Gastos'],
      datasets: [
          {
              label: 'Total',
              data: [summary?.income || 0, summary?.expenses || 0],
              backgroundColor: ['#22c55e', '#ef4444'],
              borderRadius: 8,
          }
      ]
  };
  
  const expenseCategories = movements
    .filter(m => m.type === 'expense')
    .reduce((acc, curr) => {
        acc[curr.category || 'Otros'] = (acc[curr.category || 'Otros'] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

  const doughnutData = {
      labels: Object.keys(expenseCategories),
      datasets: [{
          data: Object.values(expenseCategories),
          backgroundColor: [
              '#3b82f6', '#ef4444', '#eab308', '#a855f7', '#ec4899', '#64748b'
          ],
          borderWidth: 0
      }]
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      <PeriodSelector 
        period={period} 
        onChangePeriod={setPeriod} 
        startDate={startDate} 
        endDate={endDate} 
        onChangeDateRange={(s, e) => { setStartDate(s); setEndDate(e); }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Ingresos" 
          value={`$${summary?.income?.toLocaleString() || 0}`} 
          icon={TrendingUp} 
          color="green"
          trend={{
              value: summary?.previousIncome ? ((summary.income - summary.previousIncome) / summary.previousIncome) * 100 : 0,
              label: "vs periodo anterior"
          }}
        />
        <SummaryCard 
          title="Gastos" 
          value={`$${summary?.expenses?.toLocaleString() || 0}`} 
          icon={TrendingDown} 
          color="red"
          trend={{
              value: summary?.previousExpenses ? ((summary.expenses - summary.previousExpenses) / summary.previousExpenses) * 100 : 0,
              label: "vs periodo anterior"
          }}
        />
        <SummaryCard 
          title="Utilidad Neta" 
          value={`$${summary?.profit?.toLocaleString() || 0}`} 
          icon={Wallet} 
          color={summary?.profit && summary.profit >= 0 ? 'blue' : 'red'} 
        />
         <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Margen de Utilidad</h3>
            <div className="flex items-end gap-2 mt-2">
                <span className={`text-2xl font-bold ${summary?.margin && summary.margin >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                    {summary?.margin?.toFixed(1) || 0}%
                </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                <div 
                    className={`h-2 rounded-full ${summary?.margin && summary.margin >= 0 ? 'bg-blue-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min(Math.abs(summary?.margin || 0), 100)}%` }}
                ></div>
            </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map((insight, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex gap-3 ${
                      insight.type === 'warning' ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' :
                      insight.type === 'success' ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800' :
                      'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800'
                  }`}>
                      <div className={`p-2 rounded-lg h-fit ${
                          insight.type === 'warning' ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200' :
                          insight.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200' :
                          'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200'
                      }`}>
                          <insight.icon className="w-5 h-5" />
                      </div>
                      <div>
                          <h4 className={`font-bold text-sm ${
                              insight.type === 'warning' ? 'text-red-800 dark:text-red-200' :
                              insight.type === 'success' ? 'text-green-800 dark:text-green-200' :
                              'text-blue-800 dark:text-blue-200'
                          }`}>{insight.title}</h4>
                          <p className={`text-xs mt-1 ${
                               insight.type === 'warning' ? 'text-red-600 dark:text-red-300' :
                               insight.type === 'success' ? 'text-green-600 dark:text-green-300' :
                               'text-blue-600 dark:text-blue-300'
                          }`}>
                              {insight.text}
                          </p>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Charts & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-tour="dashboard.balance.summary">
        <div className="lg:col-span-2 space-y-6">
            {/* Main Chart */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 h-80">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Resumen Financiero</h3>
                <Bar 
                    data={chartData} 
                    options={{ 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { grid: { color: '#374151' } }, x: { grid: { display: false } } }
                    }} 
                />
            </div>

            {/* Movements List */}
            <MovementsTable movements={movements} loading={loading} />
        </div>

        <div className="space-y-6">
            {/* Expense Breakdown */}
             <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Distribución de Gastos</h3>
                <div className="h-64 relative">
                    {Object.keys(expenseCategories).length > 0 ? (
                        <Doughnut 
                            data={doughnutData} 
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: false, 
                                cutout: '70%',
                                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }
                            }} 
                        />
                    ) : (
                         <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                             Sin gastos registrados
                         </div>
                    )}
                </div>
            </div>
            
             {/* Mini Goal (Example Creative Feature) */}
             <div className="bg-indigo-600 rounded-xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="w-24 h-24" />
                </div>
                <h3 className="font-bold text-lg mb-1">Meta de Utilidad</h3>
                <p className="text-indigo-200 text-sm mb-4">Objetivo mensual sugerido</p>
                
                <div className="flex justify-between text-sm mb-1">
                    <span>Progreso</span>
                    <span>{Math.min(((summary?.profit || 0) / 1000000) * 100, 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2 mb-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${Math.min(((summary?.profit || 0) / 1000000) * 100, 100)}%` }}></div>
                </div>
                <p className="text-xs text-indigo-200 text-right">Meta: $1,000,000</p>
            </div>
        </div>
      </div>
    </div>
  );
};
