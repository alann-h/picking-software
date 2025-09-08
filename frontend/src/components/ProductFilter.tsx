// src/components/ProductFilter.tsx

import React, { ChangeEvent } from 'react';

interface ProductFilterProps {
  searchTerm: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const ProductFilter: React.FC<ProductFilterProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div className="flex items-center mb-2 gap-2">
      <input
        type="text"
        placeholder="Search"
        className="border border-gray-300 rounded-md p-2"
        value={searchTerm}
        onChange={onSearchChange}
      />
    </div>
  );
};

export default ProductFilter;