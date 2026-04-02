import { useEffect, useState } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import api from '../../services/api';
import { TeamFeedback } from '../../types';
import { MessageSquare, RefreshCw, User, Clock, AlertCircle, Download } from 'lucide-react';

export const FeedbackList = () => {
    const { activeBusiness } = useBusinessStore();
    const [feedback, setFeedback] = useState<TeamFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        if (activeBusiness) {
            fetchFeedback();
        }
    }, [activeBusiness]);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/businesses/${activeBusiness?.id}/feedback`);
            setFeedback(response.data.feedback || response.data); // Handle both formats if backend changed
        } catch (err) {
            console.error("Error fetching feedback", err);
            setError("Error al cargar mensajes del equipo");
        } finally {
            setLoading(false);
        }
    };

    const handleExportFeedback = () => {
        if (!activeBusiness || feedback.length === 0) return;
        
        const headers = ['ID', 'Fecha', 'Tipo', 'Asunto', 'Mensaje', 'Usuario', 'Estado'];
        const csvContent = [
          headers.join(','),
          ...feedback.map(f => [
            f.id,
            f.created_at,
            f.type,
            `"${f.subject.replace(/"/g, '""')}"`,
            `"${f.message.replace(/"/g, '""')}"`,
            `"${f.user_name || ''}"`,
            f.status
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `feedback_${activeBusiness.id}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'suggestion': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'complaint': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'notice': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const filteredFeedback = feedback.filter(item => {
        if (filter === 'ALL') return true;
        return item.type === filter;
    });

    if (loading) return (
        <div className="flex justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Buzón de Equipo
                </h3>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleExportFeedback}
                        disabled={feedback.length === 0}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        title="Exportar Buzón"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <select 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                        <option value="ALL">Todos los mensajes</option>
                        <option value="suggestion">Sugerencias</option>
                        <option value="complaint">Quejas / Reportes</option>
                        <option value="notice">Avisos</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {filteredFeedback.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No hay mensajes en el buzón</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredFeedback.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getTypeColor(item.type)}`}>
                                        {item.type === 'suggestion' ? 'Sugerencia' : 
                                         item.type === 'complaint' ? 'Queja' : 
                                         item.type === 'notice' ? 'Aviso' : 'Otro'}
                                    </div>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Future actions: Archive, Mark as Read */}
                                </div>
                            </div>
                            
                            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                                {item.subject}
                            </h4>
                            
                            <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap mb-4 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                {item.message}
                            </p>
                            
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                </div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {item.user_name}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
