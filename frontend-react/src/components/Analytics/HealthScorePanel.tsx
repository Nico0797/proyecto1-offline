import React from 'react';
import { Heart, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { HealthScore } from '../../services/analyticsService';

interface HealthScorePanelProps {
  score: HealthScore;
}

export const HealthScorePanel: React.FC<HealthScorePanelProps> = ({ score }) => {
  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="app-surface rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-pink-500" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Salud del Negocio</h3>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
        {/* Score Circular */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              className="text-gray-200 dark:text-gray-700"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="58"
              cx="64"
              cy="64"
            />
            <circle
              className={getScoreColor(score.score)}
              strokeWidth="8"
              strokeDasharray={360}
              strokeDashoffset={360 - (360 * score.score) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="58"
              cx="64"
              cy="64"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-3xl font-bold ${getScoreColor(score.score)}`}>{score.score}</span>
            <span className="text-xs text-gray-500 uppercase font-medium">Puntos</span>
          </div>
        </div>

        <div className="flex-1 space-y-4 w-full">
          {score.indicators.map((indicator, idx) => (
            <div key={idx} className="app-muted-panel flex items-start gap-3 rounded-lg p-3">
              <div className="mt-0.5">{getStatusIcon(indicator.status)}</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{indicator.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{indicator.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
