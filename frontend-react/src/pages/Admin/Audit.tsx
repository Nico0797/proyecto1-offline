import { useEffect, useState } from 'react';
import { Filter, User } from 'lucide-react';
import api from '../../services/api';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminTable, Column } from '../../components/Admin/ui/AdminTable';
import { AdminCard } from '../../components/Admin/ui/AdminCard';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';

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
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = `/admin/audit?page=${page}&per_page=${itemsPerPage}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      
      const res = await api.get(url);
      const payload = res?.data;
      if (!payload) {
        throw new Error('Respuesta vacía en admin audit');
      }
      setLogs(payload.logs || []);
      setTotalPages(payload.pages || 1);
      setTotalItems(payload.total || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const columns: Column<AuditLog>[] = [
    {
      header: 'Usuario',
      cell: (log) => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-500" />
          <span className="text-white font-medium">{log.user_email || 'Sistema'}</span>
        </div>
      )
    },
    {
      header: 'Acción',
      cell: (log) => {
        let variant: 'success' | 'info' | 'error' | 'warning' | 'purple' = 'info';
        if (log.action === 'create') variant = 'success';
        if (log.action === 'update') variant = 'info';
        if (log.action === 'delete') variant = 'error';
        if (['login', 'logout'].includes(log.action)) variant = 'purple';
        
        return (
          <StatusBadge variant={variant}>
            {log.action.toUpperCase()}
          </StatusBadge>
        );
      }
    },
    {
      header: 'Entidad',
      cell: (log) => (
        <div>
          <span className="text-slate-300">{log.entity}</span>
          <span className="text-xs text-slate-500 ml-1">#{log.entity_id}</span>
        </div>
      )
    },
    {
      header: 'Fecha',
      cell: (log) => new Date(log.timestamp).toLocaleString()
    },
    {
      header: 'Detalles',
      cell: (log) => (
        <div className="max-w-xs truncate text-xs font-mono text-slate-500" title={JSON.stringify(log.details, null, 2)}>
          {JSON.stringify(log.details)}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Auditoría del Sistema" 
        description="Registro detallado de actividad y cambios en la plataforma."
      />

      <AdminCard noPadding>
        <div className="p-4 border-b border-white/10 flex gap-4">
          <div className="relative w-full max-w-xs">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <select 
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white appearance-none focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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

        <AdminTable
          columns={columns}
          data={logs}
          isLoading={loading}
          emptyMessage="No hay registros de auditoría"
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            onPageChange: setPage,
            totalItems: totalItems,
            itemsPerPage: itemsPerPage
          }}
        />
      </AdminCard>
    </div>
  );
};
