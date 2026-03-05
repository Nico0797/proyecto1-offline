import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { ShoppingBag } from 'lucide-react';

interface ProductsReportTabProps {
  data: any;
  loading: boolean;
}

export const ProductsReportTab: React.FC<ProductsReportTabProps> = ({ data, loading }) => {
  if (loading || !data) return null;

  const products = data?.products || [];

  // Assuming data structure has top products
  const topProducts = products || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Producto Más Vendido</h3>
              <ShoppingBag className="w-5 h-5 text-green-500" />
            </div>
            {topProducts.length > 0 ? (
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{topProducts[0].name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {topProducts[0].qty} unidades vendidas
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ranking de Productos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3 text-center">Unidades</th>
                <th className="px-6 py-3 text-right">Total Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {topProducts.map((p: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-500">{idx + 1}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{p.qty}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                    ${p.total.toLocaleString()}
                  </td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay productos vendidos en este periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
