import React from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { Forecast } from '../../services/analyticsService';

interface ForecastCardProps {
  forecast: Forecast;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ forecast }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
        <TrendingUp className="w-48 h-48" />
      </div>

      <h3 className="text-lg font-semibold mb-1 opacity-90">Proyección fin de mes</h3>
      <p className="text-sm opacity-75 mb-6">Basado en tu ritmo actual de ventas</p>

      <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
        <div>
          <p className="text-sm font-medium opacity-80 mb-1">Ingresos estimados</p>
          <h2 className="text-3xl font-bold">${forecast.projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
          <p className="text-xs opacity-60 mt-1">Rango: ${forecast.confidence.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} - ${forecast.confidence.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <p className="text-sm font-medium opacity-80 mb-1">Utilidad estimada</p>
          <h2 className="text-3xl font-bold text-green-200">${forecast.projectedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 relative z-10">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          ¿Cómo mejorar?
        </h4>
        <ul className="space-y-1 text-sm opacity-90 list-disc list-inside">
          {forecast.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
