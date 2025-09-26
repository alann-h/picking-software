import React, { useState } from 'react';
import { Search, Package, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { Product } from '../../utils/types';
import ProductList from '../ProductListSettings';
import { updateProductDb, setProductArchiveStatus, addProductDb } from '../../api/products'; 
import { useQueryClient } from '@tanstack/react-query';

interface ProductsTabProps {
  searchTerm: string;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  filteredProducts: Product[];
  isLoading: boolean;
  isAdmin: boolean;
}

const ProductsTab: React.FC<ProductsTabProps> = ({
  searchTerm,
  onSearchChange,
  filteredProducts,
  isLoading,
  isAdmin
}) => {
  const [searchField, setSearchField] = useState<'all' | 'name' | 'sku'>('all');
  const queryClient = useQueryClient();

  const handleSearchFieldChange = (field: 'all' | 'name' | 'sku') => {
    setSearchField(field);
  };

  const getSearchPlaceholder = () => {
    switch (searchField) {
      case 'name': return 'Search by product name...';
      case 'sku': return 'Search by SKU...';
      default: return 'Search by product name or SKU...';
    }
  };

  const getFilteredProducts = () => {
    if (!searchTerm) return filteredProducts;
    
    return filteredProducts.filter((product) => {
      const searchLower = searchTerm.toLowerCase();
      
      switch (searchField) {
        case 'name':
          return product.productName.toLowerCase().includes(searchLower);
        case 'sku':
          return product.sku && product.sku.toLowerCase().includes(searchLower);
        default:
          return product.productName.toLowerCase().includes(searchLower) ||
                 (product.sku && product.sku.toLowerCase().includes(searchLower));
      }
    });
  };

  const finalFilteredProducts = getFilteredProducts();

  // Function to refresh products data using TanStack Query
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  // Wrapper functions to match expected return types
  const handleUpdateProduct = async (productId: number, productData: Partial<Product>) => {
    await updateProductDb(productId, productData);
  };

  const handleSetProductArchiveStatus = async (productId: number, isArchived: boolean) => {
    await setProductArchiveStatus(productId, isArchived);
  };

  const handleAddProduct = async (productName: string, sku: string, barcode: string, category?: string) => {
    const result = await addProductDb(productName, sku, barcode, category);
    return result as string;
  };

  return (
    <div>
      <div>
        <title>Smart Picker | Current Products</title>
        
        {/* Header Section */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Current Products in System
              </h2>
              <p className="text-gray-500">
                Manage your product inventory, search by name or SKU, and update product details
              </p>
            </div>
          </div>

          {/* Enhanced Search Section */}
          <div className="rounded-xl border border-gray-200 bg-gray-50">
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                {/* Search Field Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm font-medium text-gray-600">
                    Search by:
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSearchFieldChange('all')}
                      className={clsx(
                        'px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer',
                        {
                          'bg-blue-600 text-white': searchField === 'all',
                          'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100': searchField !== 'all',
                        }
                      )}
                    >
                      All Fields
                    </button>
                    <button
                      onClick={() => handleSearchFieldChange('name')}
                      className={clsx(
                        'px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer',
                        {
                          'bg-blue-600 text-white': searchField === 'name',
                          'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100': searchField !== 'name',
                        }
                      )}
                    >
                      Product Name
                    </button>
                    <button
                      onClick={() => handleSearchFieldChange('sku')}
                      className={clsx(
                        'px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer',
                        {
                          'bg-blue-600 text-white': searchField === 'sku',
                          'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100': searchField !== 'sku',
                        }
                      )}
                    >
                      SKU
                    </button>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={getSearchPlaceholder()}
                    value={searchTerm}
                    onChange={onSearchChange}
                    className="block w-full rounded-lg border-gray-300 py-3 pl-10 pr-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {searchTerm && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <button
                        onClick={() => onSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
                        className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Search Results Summary */}
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <Package className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {finalFilteredProducts.length} products found
                      {searchTerm && ` (filtered from ${filteredProducts.length} total)`}
                    </p>
                    {searchTerm && (
                      <p className="text-sm font-medium text-blue-700">
                        Search results for "{searchTerm}" in {searchField === 'all' ? 'all fields' : searchField === 'name' ? 'product names' : 'SKUs'}
                      </p>
                    )}
                    {!searchTerm && (
                      <p className="text-sm text-gray-500">
                        Products are paginated (50 per page)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div>
          <ProductList 
            products={finalFilteredProducts} 
            isLoading={isLoading} 
            onRefresh={handleRefresh} 
            updateProductDb={handleUpdateProduct} 
            setProductArchiveStatus={handleSetProductArchiveStatus} 
            addProductDb={handleAddProduct} 
            isAdmin={isAdmin}
          />
        </div>

      </div>
    </div>
  );
};

export default ProductsTab;