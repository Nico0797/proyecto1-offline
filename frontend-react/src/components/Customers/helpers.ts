export const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export interface CustomerInsights {
  totalPurchased: number;
  purchaseCount: number;
  avgTicket: number;
  lastPurchaseDate?: string;
  segment: 'Top' | 'Nuevo' | 'Inactivo' | 'Regular';
}

export const calculateCustomerInsights = (): CustomerInsights => {
  // In a real app, sales would be fetched. Here we mock or use what we have.
  // Assuming 'sales' array is passed if available, otherwise we use customer data if extended.
  // Since we don't have full sales history in customer object, we might need to rely on what's available or fetch it.
  // For this UI demo, we might simulate some values if not present.
  
  const totalPurchased = 0; // Placeholder
  const purchaseCount = 0;
  const avgTicket = 0;
  
  return {
    totalPurchased,
    purchaseCount,
    avgTicket,
    segment: 'Regular' // Default
  };
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'debt': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
};
