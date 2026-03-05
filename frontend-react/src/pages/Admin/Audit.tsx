import { useEffect, useState } from 'react';
import { Filter, User, Clock } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  entity: string;
  entity_id: number;
  timestamp: string;
  details: any;
}

export const AdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = `/admin/audit?page=${page}&per_page=20`;
      if (actionFilter) url += `&action=${actionFilter}`;
      
      const res = await api.get(url);
      setLogs(res.data.logs || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Auditoría del Sistema</h1>
          <p className="text-slate-400 text-sm">Registro de actividad y cambios</p>
        </div>
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl p-4 flex gap-4">
        <div className="relative max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <select 
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white appearance-none focus:outline-none focus:border-blue-500"
          >
            <option value="">Todas las acciones</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="create">Crear</option>
            <option value="update">Actualizar</option>
            <option value="delete">Eliminar</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Usuario</th>
                <th className="px-6 py-3 font-medium">Acción</th>
                <th className="px-6 py-3 font-medium">Entidad</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Cargando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">No hay registros de auditoría</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-500" />
                        <span className="text-white">{log.user_email || 'Sistema'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                        ${log.action === 'create' ? 'bg-green-500/10 text-green-400' : ''}
                        ${log.action === 'update' ? 'bg-blue-500/10 text-blue-400' : ''}
                        ${log.action === 'delete' ? 'bg-red-500/10 text-red-400' : ''}
                        ${['login', 'logout'].includes(log.action) ? 'bg-purple-500/10 text-purple-400' : ''}
                      `}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300">{log.entity}</span>
                      <span className="text-xs text-slate-500 ml-1">#{log.entity_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock size={12} />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-xs font-mono text-slate-500">
                        {JSON.stringify(log.details)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex justify-center gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <span className="flex items-center px-4 text-sm text-slate-400">
              Página {page} de {totalPages}
            </span>
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
