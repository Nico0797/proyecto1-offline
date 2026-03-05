import React from 'react';
import { ProductCatalog } from '../components/Products/ProductCatalog';

export const Products: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <ProductCatalog />
    </div>
  );
};
