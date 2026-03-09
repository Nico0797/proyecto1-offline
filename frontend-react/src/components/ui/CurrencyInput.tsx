import React, { useEffect, useState } from 'react';
import { Input } from './Input';

// Omit value and onChange from Input props to override them
type InputProps = React.ComponentProps<typeof Input>;
interface CurrencyInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value: number | string; // Accept string too for compatibility, but treat as number
  onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, ...props }) => {
  const [displayValue, setDisplayValue] = useState('');

  // Format number to string with dots (e.g. 1000 -> 1.000)
  const formatNumber = (num: number | string) => {
    if (num === '' || num === undefined || num === null) return '';
    
    // Handle string inputs that might already be formatted or plain
    const n = typeof num === 'string' ? parseInt(num.toString().replace(/\./g, ''), 10) : num;
    
    if (isNaN(n)) return '';
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  };

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove dots and non-numeric chars (allow only digits)
    const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    
    // Convert to number
    const numericValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
    
    // Update parent
    onChange(numericValue);
  };

  return (
    <Input
      {...props}
      type="text" // Must be text to allow dots
      value={displayValue}
      onChange={handleChange}
      inputMode="numeric" // Triggers numeric keyboard on mobile
      autoComplete="off"
    />
  );
};
