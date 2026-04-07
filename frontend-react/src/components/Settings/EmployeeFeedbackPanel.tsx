import React, { useState } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import api from '../../services/api';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';

export const EmployeeFeedbackPanel = () => {
    const { activeBusiness } = useBusinessStore();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('suggestion');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeBusiness) return;
        
        setLoading(true);
        setStatus('idle');
        setErrorMsg('');

        try {
            await api.post(`/businesses/${activeBusiness.id}/feedback`, {
                subject,
                message,
                type
            });
            setStatus('success');
            setSubject('');
            setMessage('');
            setTimeout(() => setStatus('idle'), 5000);
        } catch (err: any) {
            console.error('Error sending feedback:', err);
            setStatus('error');
            setErrorMsg(err.response?.data?.error || 'Error al enviar el mensaje');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Buzón de Equipo</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Envía sugerencias, reporta problemas o comparte tus ideas directamente con la administración. 
                Tu mensaje será visible para los administradores del negocio.
            </p>

            {status === 'success' ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-300" />
                    </div>
                    <h4 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">¡Mensaje Enviado!</h4>
                    <p className="text-green-700 dark:text-green-400 mb-6">Gracias por tu aporte. Los administradores revisarán tu mensaje pronto.</p>
                    <button 
                        onClick={() => setStatus('idle')}
                        className="text-green-700 dark:text-green-400 font-medium hover:underline"
                    >
                        Enviar otro mensaje
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {status === 'error' && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {errorMsg}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="suggestion">💡 Sugerencia</option>
                                <option value="complaint">⚠️ Queja / Problema</option>
                                <option value="notice">📝 Aviso / Otro</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Asunto
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Resumen breve del tema"
                                required
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mensaje
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={5}
                            placeholder="Describe tu sugerencia o problema en detalle..."
                            required
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Enviar Mensaje
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
