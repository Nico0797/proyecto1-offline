import { useEffect, useState } from 'react';
import { 
  Database, 
  Download, 
  HardDrive,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

export const AdminData = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reusing admin stats as data stats for now
    api.get('/admin/stats').then(res => {
      setStats(res.data);
      setLoading(false);
    });
  }, []);

  const handleExport = () => {
    alert('Iniciando exportación de base de datos... (Simulado)');
  };

  if (loading) return <div>Cargando datos...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Datos y Almacenamiento</h1>
        <p className="text-slate-400 text-sm">Gestión de base de datos y copias de seguridad</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Database className="text-blue-400" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Estadísticas de DB</h3>
              <p className="text-slate-400 text-sm">Resumen de registros</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
              <span className="text-slate-300">Usuarios Totales</span>
              <span className="text-white font-mono">{stats.total_users}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
              <span className="text-slate-300">Negocios</span>
              <span className="text-white font-mono">{stats.total_businesses}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
              <span className="text-slate-300">Ventas Registradas</span>
              <span className="text-white font-mono">{stats.total_sales}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
              <span className="text-slate-300">Productos</span>
              <span className="text-white font-mono">{stats.total_products}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <HardDrive className="text-green-400" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Acciones de Datos</h3>
              <p className="text-slate-400 text-sm">Mantenimiento y backups</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-slate-700 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Download size={18} className="text-blue-400" />
                  <span className="text-white font-medium">Exportar SQL</span>
                </div>
                <Button size="sm" onClick={handleExport}>Descargar</Button>
              </div>
              <p className="text-xs text-slate-500">
                Genera un dump completo de la base de datos en formato SQL.
              </p>
            </div>

            <div className="p-4 border border-slate-700 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-yellow-400" />
                  <span className="text-white font-medium">Logs de Sistema</span>
                </div>
                <Button size="sm" variant="secondary">Ver Logs</Button>
              </div>
              <p className="text-xs text-slate-500">
                Descarga los archivos de log del servidor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
