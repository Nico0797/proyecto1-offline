export const formatCOP = (value: number | string) => {
  const n = typeof value === 'string' ? parseFloat(value) : value || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
};
