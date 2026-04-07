import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { KPI, Insight } from '../../types/analytics';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ShoppingCart, Percent } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ExecutiveSummaryTabProps {
  data: any;
  loading: boolean;
}

export const ExecutiveSummaryTab: React.FC<ExecutiveSummaryTabProps> = ({ data, loading }) => {
  if (loading || !data) return null;

  const kpis = data?.kpis || [];
  const insights = data?.insights || [];

  const getIcon = (id: string) => {
    switch (id) {
      case 'sales': return DollarSign;
      case 'expenses': return Wallet;
      case 'profit': return Percent; // Or another icon
      case 'ticket': return ShoppingCart;
      default: return DollarSign;
    }
  };

  const getColor = (kpi: KPI) => {
    if (kpi.trend === 'neutral') return 'bg-gray-100 text-gray-600';
    if (kpi.inverse) {
      return kpi.trend === 'up' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600';
    }
    return kpi.trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi: KPI) => {
          const Icon = getIcon(kpi.id);
          
          return (
            <Card key={kpi.id} className="border-none shadow-sm bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </div>
                  {kpi.change !== 0 && !isNaN(kpi.change) && (
                    <div className={cn("flex items-center text-xs font-bold px-2 py-1 rounded-full bg-opacity-10", 
                      getColor(kpi)
                    )}>
                      {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {kpi.format === 'currency' 
                      ? `$${(kpi.value || 0).toLocaleString()}` 
                      : (kpi.value || 0)}
                  </h3>
                  {kpi.previousValue !== undefined && (
                    <p className="text-xs text-gray-400 mt-2">
                      vs ${(kpi.previousValue || 0).toLocaleString()} anterior
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Insights Detectados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight: Insight) => (
              <div 
                key={insight.id} 
                className={cn(
                  "p-4 rounded-xl border border-l-4 shadow-sm",
                  insight.type === 'positive' ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 border-l-green-500" :
                  insight.type === 'negative' ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 border-l-red-500" :
                  insight.type === 'warning' ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 border-l-yellow-500" :
                  "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 border-l-blue-500"
                )}
              >
                <h4 className={cn("font-bold mb-1", 
                   insight.type === 'positive' ? "text-green-800 dark:text-green-400" :
                   insight.type === 'negative' ? "text-red-800 dark:text-red-400" :
                   insight.type === 'warning' ? "text-yellow-800 dark:text-yellow-400" :
                   "text-blue-800 dark:text-blue-400"
                )}>
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
