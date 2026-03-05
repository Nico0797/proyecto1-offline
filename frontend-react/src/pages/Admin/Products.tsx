import { useEffect, useState } from 'react';
import { 
  Search, 
  Package, 
  Store, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

interface AdminProduct {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  business_name: string;
  active: boolean;
  created_at: string;
}

export const AdminProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/products?page=${page}&search=${search}`);
      setProducts(res.data.products || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timeout);
  }, [page, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-slate-400 text-sm">Inventario global de productos</p>
        </div>
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Producto</th>
                <th className="px-6 py-3 font-medium">Negocio</th>
                <th className="px-6 py-3 font-medium">Stock</th>
                <th className="px-6 py-3 font-medium">Precios</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">No se encontraron productos</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                          <Package size={18} />
                        </div>
                        <div>
                          <div className="font-medium text-white">{product.name}</div>
                          {product.sku && <div className="text-xs text-slate-500">SKU: {product.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Store size={14} className="text-slate-500" />
                        {product.business_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={product.stock <= product.min_stock ? "text-red-400 font-bold" : "text-slate-300"}>
                          {product.stock}
                        </span>
                        {product.stock <= product.min_stock && (
                          <div title="Stock bajo">
                            <AlertTriangle size={14} className="text-red-500" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">Mín: {product.min_stock}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">${product.price.toLocaleString()}</div>
                      {product.cost > 0 && (
                        <div className="text-xs text-slate-500">Costo: ${product.cost.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {product.active ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded w-fit">
                          <CheckCircle size={12} /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded w-fit">
                          <XCircle size={12} /> Inactivo
                        </span>
                      )}
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
