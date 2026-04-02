import React, { useState, useEffect } from 'react';
import { 
    Users, DollarSign, TrendingUp, Download, AlertCircle, Loader2 
} from 'lucide-react';
import { TeamPerformanceMetric } from '../../types/TeamMetric';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/dateRange.utils';
import { analyticsService } from '../../services/analyticsService';
import { saveBlobFile } from '../../utils/downloadHelper';

interface TeamReportTabProps {
    businessId: number;
    startDate?: string;
    endDate?: string;
}

interface TeamActivity {
    date: string;
    user_name: string;
    user_role: string;
    action: string;
    reference: string;
    amount: number;
    detail: string;
}

export const TeamReportTab: React.FC<TeamReportTabProps> = ({ businessId, startDate, endDate }) => {
    const [summary, setSummary] = useState<TeamPerformanceMetric[]>([]);
    const [activities, setActivities] = useState<TeamActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [businessId, startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Usa el servicio centralizado que maneja la URL base y token
            const data = await analyticsService.getTeamPerformance(businessId, startDate || '', endDate || '');
            
            if (data.summary) {
                setSummary(data.summary);
                setActivities(data.recent_activity || []);
            } else {
                setSummary(Array.isArray(data) ? data : []);
                setActivities([]);
            }
        } catch (err: any) {
            console.error(err);
            if (err.response && err.response.status === 403) {
                setError("No tienes permisos para ver este reporte.");
            } else {
                setError("Error al cargar datos del equipo.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const blob = await analyticsService.getTeamExport(businessId, startDate || '', endDate || '');
            await saveBlobFile(blob, {
                filename: `Reporte_Equipo_${new Date().toISOString().split('T')[0]}.xlsx`
            });
        } catch (err) {
            console.error(err);
            alert("Error al exportar reporte de equipo.");
        }
    };

    // Cálculos de Totales KPI
    const totalSales = summary.reduce((acc, curr) => acc + curr.sales_total, 0);
    const totalCollected = summary.reduce((acc, curr) => acc + curr.payments_total, 0);
    const topSeller = [...summary].sort((a, b) => b.sales_total - a.sales_total)[0];
    
    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (error) return <div className="text-red-500 p-8 flex items-center gap-2"><AlertCircle /> {error}</div>;

    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gestión de Equipo</h2>
                    <p className="text-sm text-gray-500">Rendimiento operativo y control de caja por colaborador</p>
                </div>
                <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Excel
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Ventas Totales (Equipo)</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalSales)}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Recaudo Total (Caja)</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalCollected)}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Mejor Vendedor</span>
                    </div>
                    {topSeller ? (
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{topSeller.name}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(topSeller.sales_total)}</p>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">Sin datos</p>
                    )}
                </div>
            </div>

            {/* Main Table: Resumen */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-medium text-gray-900 dark:text-white">Resumen por Colaborador</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4">Colaborador</th>
                                <th className="px-6 py-4 text-right bg-blue-50/50 dark:bg-blue-900/10">Ventas ($)</th>
                                <th className="px-6 py-4 text-center"># Ventas</th>
                                <th className="px-6 py-4 text-right bg-green-50/50 dark:bg-green-900/10">Recaudado ($)</th>
                                <th className="px-6 py-4 text-right text-red-600/80">Gastos ($)</th>
                                <th className="px-6 py-4 text-center">Clientes</th>
                                <th className="px-6 py-4 text-center">Mov. Inv.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {summary.map((user) => (
                                <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                                            <span className="text-xs text-gray-500">{user.role || 'Sin Rol'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white bg-blue-50/30 dark:bg-blue-900/5">
                                        {formatCurrency(user.sales_total)}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        {user.sales_count}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/5">
                                        {formatCurrency(user.payments_total)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">
                                        {user.expenses_total > 0 ? `-${formatCurrency(user.expenses_total)}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        {user.customers_created}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        {user.movements_count}
                                    </td>
                                </tr>
                            ))}
                            
                            {summary.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No hay actividad registrada en este periodo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Secondary Table: Detalle Actividad (Auditoría) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                    <h3 className="font-medium text-gray-900 dark:text-white">Auditoría Reciente (Últimos 200 eventos)</h3>
                    <span className="text-xs text-gray-500">Orden cronológico (más reciente primero)</span>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3">Fecha/Hora</th>
                                <th className="px-6 py-3">Usuario</th>
                                <th className="px-6 py-3">Acción</th>
                                <th className="px-6 py-3">Referencia</th>
                                <th className="px-6 py-3 text-right">Monto</th>
                                <th className="px-6 py-3">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {activities.map((act, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500">
                                        {new Date(act.date).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900 dark:text-white text-xs">{act.user_name}</span>
                                            <span className="text-[10px] text-gray-400">{act.user_role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                            act.action.includes('Venta') ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' :
                                            act.action.includes('Recaudo') ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' :
                                            act.action.includes('Gasto') ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' :
                                            'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                        }`}>
                                            {act.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-xs font-mono text-gray-500">
                                        {act.reference}
                                    </td>
                                    <td className="px-6 py-3 text-right text-xs font-medium text-gray-900 dark:text-white">
                                        {act.amount > 0 ? formatCurrency(act.amount) : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-xs text-gray-500 max-w-xs truncate" title={act.detail}>
                                        {act.detail}
                                    </td>
                                </tr>
                            ))}
                            {activities.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-xs">
                                        Sin actividad reciente para mostrar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
