import React, { useState } from 'react';
import { Customer } from '../../types';
import { ShoppingBag, TrendingUp } from 'lucide-react';

interface TopCustomersCardProps {
    customers: Customer[];
    sales: any[]; // Ideally typed
    onSelectCustomer: (c: Customer) => void;
}

export const TopCustomersCard: React.FC<TopCustomersCardProps> = ({ customers, sales, onSelectCustomer }) => {
    const [period, setPeriod] = useState<7 | 30 | 90 | 365>(30);

    const topCustomers = React.useMemo(() => {
        const now = new Date();
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - period);

        const customerMap = new Map<number, {
            customer: Customer,
            total: number,
            count: number,
            lastDate: string
        }>();

        sales.forEach(sale => {
            if (!sale.customer_id) return;
            const saleDate = new Date(sale.sale_date);
            if (saleDate < cutoff) return;

            const customer = customers.find(c => c.id === sale.customer_id);
            if (!customer) return;

            const current = customerMap.get(customer.id) || {
                customer,
                total: 0,
                count: 0,
                lastDate: sale.sale_date
            };

            current.total += sale.total;
            current.count += 1;
            if (new Date(sale.sale_date) > new Date(current.lastDate)) {
                current.lastDate = sale.sale_date;
            }

            customerMap.set(customer.id, current);
        });

        return Array.from(customerMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [customers, sales, period]);

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    Top Clientes
                </h3>
                <select 
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value) as any)}
                    className="text-sm bg-gray-100 dark:bg-gray-700 border-none rounded-lg px-3 py-1 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500"
                >
                    <option value={7}>7 días</option>
                    <option value={30}>30 días</option>
                    <option value={90}>90 días</option>
                    <option value={365}>1 año</option>
                </select>
            </div>

            <div className="space-y-4">
                {topCustomers.map((data, idx) => (
                    <div 
                        key={data.customer.id} 
                        onClick={() => onSelectCustomer(data.customer)}
                        className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer transition-colors group"
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-600' : 
                            idx === 1 ? 'bg-gray-100 text-gray-600' : 
                            idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                            {idx + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{data.customer.name}</p>
                                <p className="font-bold text-gray-900 dark:text-white">${data.total.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <ShoppingBag className="w-3 h-3" /> {data.count} compras
                                </span>
                                <span>•</span>
                                <span>Ticket: ${Math.round(data.total / data.count).toLocaleString()}</span>
                            </div>
                            
                            {/* Progress bar relative to top customer */}
                            <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-purple-500 rounded-full" 
                                    style={{ width: `${(data.total / topCustomers[0].total) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {topCustomers.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No hay ventas registradas en este periodo.
                    </div>
                )}
            </div>
        </div>
    );
};
