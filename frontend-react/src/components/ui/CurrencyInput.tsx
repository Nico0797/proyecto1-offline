import React, { useEffect, useState } from 'react';
import { Input } from './Input';

type InputProps = React.ComponentProps<typeof Input>;

interface CurrencyInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value: number | string | undefined;
  onChange: (value: number | undefined) => void;
  allowDecimals?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ 
  value, 
  onChange, 
  allowDecimals = true,
  placeholder = "0.00",
  startAdornment = "$",
  ...props 
}) => {
  // We manage the display string locally
  const [displayValue, setDisplayValue] = useState('');
  
  // Format numeric value to string with dots for thousands and commas for decimals (ES-CO style)
  const formatValue = (val: number | string | undefined) => {
    if (val === '' || val === undefined || val === null) return '';
    
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '';

    return new Intl.NumberFormat('de-DE', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 20, 
    }).format(num);
  };

  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
        setDisplayValue(formatValue(value));
    } else {
        setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Remove all non-numeric/dot/comma
    inputValue = inputValue.replace(/[^0-9,.]/g, '');

    // Clean for parsing: remove dots, replace comma with dot
    let cleanVal = inputValue.replace(/\./g, '').replace(',', '.');
    
    // Check if valid number
    if (cleanVal === '' || cleanVal === '.') {
        setDisplayValue(inputValue);
        onChange(undefined);
        return;
    }
    
    // Prevent multiple decimals
    if ((cleanVal.match(/\./g) || []).length > 1) {
        return; 
    }
    
    // Limit decimal places to 2
    if (cleanVal.includes('.')) {
        const parts = cleanVal.split('.');
        if (parts[1].length > 2) {
            cleanVal = `${parts[0]}.${parts[1].substring(0, 2)}`;
        }
    }

    const numVal = parseFloat(cleanVal);
    
    setDisplayValue(inputValue);
    
    if (!isNaN(numVal)) {
        onChange(numVal);
    }
  };

  const handleBlur = () => {
    // Re-format on blur to ensure consistent look
    if (value !== undefined && value !== null) {
        setDisplayValue(formatValue(value));
    }
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      startAdornment={startAdornment}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
};
