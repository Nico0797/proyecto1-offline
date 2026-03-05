import React from 'react';
import { AlertTriangle, Info, Zap, ArrowRight, TrendingDown } from 'lucide-react';
import { Insight } from '../../services/analyticsService';

interface InsightsPanelProps {
  insights: Insight[];
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700 h-full flex flex-col justify-center items-center">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-3">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Todo se ve bien</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No hay alertas ni riesgos detectados en este momento.</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-5 h-5 text-white" />;
      case 'risk': return <TrendingDown className="w-5 h-5 text-white" />;
      case 'opportunity': return <Zap className="w-5 h-5 text-white" />;
      default: return <Info className="w-5 h-5 text-white" />;
    }
  };

  const getStyles = (severity: string) => {
    switch (severity) {
      case 'critical': return {
        bg: 'bg-red-50 dark:bg-red-900/10',
        border: 'border-red-100 dark:border-red-900/30',
        iconBg: 'bg-red-500',
        text: 'text-red-900 dark:text-red-100',
        metric: 'text-red-600 dark:text-red-400'
      };
      case 'warning': return {
        bg: 'bg-orange-50 dark:bg-orange-900/10',
        border: 'border-orange-100 dark:border-orange-900/30',
        iconBg: 'bg-orange-500',
        text: 'text-orange-900 dark:text-orange-100',
        metric: 'text-orange-600 dark:text-orange-400'
      };
      case 'info': return {
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        border: 'border-blue-100 dark:border-blue-900/30',
        iconBg: 'bg-blue-500',
        text: 'text-blue-900 dark:text-blue-100',
        metric: 'text-blue-600 dark:text-blue-400'
      };
      default: return {
        bg: 'bg-gray-50 dark:bg-gray-800',
        border: 'border-gray-100 dark:border-gray-700',
        iconBg: 'bg-gray-500',
        text: 'text-gray-900 dark:text-gray-100',
        metric: 'text-gray-600 dark:text-gray-400'
      };
    }
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Insights
        </h3>
      </div>
      
      <div className="space-y-3">
        {insights.map((insight) => {
            const styles = getStyles(insight.severity);
            return (
                <div 
                    key={insight.id} 
                    className={`relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md ${styles.bg} ${styles.border}`}
                >
                    <div className="flex gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center shadow-sm`}>
                            {getIcon(insight.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className={`text-base font-bold ${styles.text} leading-tight mb-1 pr-2`}>
                                    {insight.title}
                                </h4>
                                {insight.metric && (
                                    <span className={`text-sm font-bold ${styles.metric} bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded whitespace-nowrap`}>
                                        {insight.metric}
                                    </span>
                                )}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                                {insight.description}
                            </p>
                            
                            {insight.actionLabel && (
                                <button className="text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all opacity-80 hover:opacity-100">
                                    {insight.actionLabel} <ArrowRight className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
