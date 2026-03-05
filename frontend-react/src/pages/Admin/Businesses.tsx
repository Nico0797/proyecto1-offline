import { useEffect, useState } from 'react';
import { Store, Search, DollarSign } from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../utils/cn';

interface Business {
  id: number;
  name: string;
  currency: string;
  sales_count: number;
  sales_total: number;
  expenses_total: number;
  customers_count: number;
  created_at: string;
  user_name?: string;
}

export const AdminBusinesses = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await api.get('/admin/businesses');
        setBusinesses(res.data.businesses || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();
  }, []);

  const filtered = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.user_name && b.user_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Negocios</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar negocio..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No hay negocios encontrados</div>
        ) : (
          filtered.map(business => (
            <div key={business.id} className="bg-slate-800 border border-white/10 rounded-xl p-6 hover:bg-slate-800/80 transition-colors">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{business.name}</h3>
                    <p className="text-sm text-slate-400">
                      ID: {business.id} • Propietario: <span className="text-white">{business.user_name || 'Desconocido'}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Creado: {new Date(business.created_at).toLocaleDateString()}</p>
                    
                    <div className="mt-3 flex gap-3 text-sm">
                      <span className="bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-700">
                        {business.customers_count} Clientes
                      </span>
                      <span className="bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-700">
                        {business.sales_count} Ventas
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Ventas Totales</span>
                    <span className="text-xl font-bold text-green-400 flex items-center">
                      <DollarSign size={16} />
                      {business.sales_total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Gastos</span>
                    <span className="text-sm font-medium text-red-400 flex items-center">
                      <DollarSign size={14} />
                      {business.expenses_total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 pt-2 border-t border-white/5">
                    <span className="text-slate-400 text-sm">Utilidad</span>
                    <span className={cn(
                      "font-bold",
                      (business.sales_total - business.expenses_total) >= 0 ? "text-blue-400" : "text-red-400"
                    )}>
                      ${(business.sales_total - business.expenses_total).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
