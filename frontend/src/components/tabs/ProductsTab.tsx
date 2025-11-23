import React, { useState, useEffect } from 'react';
import { Search, Package, X, RefreshCw, Download } from 'lucide-react';
import clsx from 'clsx';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Initialize search field from URL, default to 'all'
  const [searchField, setSearchField] = useState<'all' | 'name' | 'sku' | 'barcode'>(() => {
    const fieldFromUrl = searchParams.get('field');
    if (fieldFromUrl === 'name' || fieldFromUrl === 'sku' || fieldFromUrl === 'barcode' || fieldFromUrl === 'all') {
      return fieldFromUrl;
    }
    return 'all';
  });

  // Update search field from URL when it changes
  useEffect(() => {
    const fieldFromUrl = searchParams.get('field');
    if (fieldFromUrl === 'name' || fieldFromUrl === 'sku' || fieldFromUrl === 'barcode' || fieldFromUrl === 'all') {
      setSearchField(fieldFromUrl);
    } else if (!fieldFromUrl) {
      setSearchField('all');
    }
  }, [searchParams]);

  const handleSearchFieldChange = (field: 'all' | 'name' | 'sku' | 'barcode') => {
    setSearchField(field);
    
    // Update URL with new search field
    const newParams = new URLSearchParams(searchParams);
    newParams.set('field', field);
    
    // Preserve search term if it exists
    const search = searchParams.get('search');
    if (search) {
      newParams.set('search', search);
    }
    
    setSearchParams(newParams);
  };

  const getSearchPlaceholder = () => {
    switch (searchField) {
      case 'name': return 'Search by product name...';
      case 'sku': return 'Search by SKU...';
      case 'barcode': return 'Search by barcode...';
      default: return 'Search by product name, SKU, or barcode...';
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
        case 'barcode':
          return product.barcode && product.barcode.toLowerCase().includes(searchLower);
        default:
          return product.productName.toLowerCase().includes(searchLower) ||
                 (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
                 (product.barcode && product.barcode.toLowerCase().includes(searchLower));
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

  const handleAddProduct = async (productName: string, sku: string, barcode: string) => {
    const result = await addProductDb(productName, sku, barcode);
    return result as string;
  };

  // Function to export products to CSV
  const handleExportCSV = () => {
    const productsToExport = finalFilteredProducts;
    
    if (productsToExport.length === 0) {
      alert('No products to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Product Name',
      'SKU',
      'Barcode',
      'Price',
      'Quantity on Hand',
      'External Item ID',
      'Tax Code Ref',
      'Is Archived',
      'Created At',
      'Updated At'
    ];

    // Convert products to CSV format
    const csvContent = [
      headers.join(','),
      ...productsToExport.map(product => [
        `"${product.productName.replace(/"/g, '""')}"`,
        `"${product.sku || ''}"`,
        `"${product.barcode || ''}"`,
        product.price,
        product.quantityOnHand,
        `"${product.externalItemId || ''}"`,
        `"${product.taxCodeRef || ''}"`,
        product.isArchived ? 'Yes' : 'No',
        `"${new Date(product.createdAt).toLocaleString()}"`,
        `"${new Date(product.updatedAt).toLocaleString()}"`
      ].join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `products_export_${dateStr}.csv`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div>
        <title>Smart Picker | Current Products</title>
        
        {/* Header Section */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                Current Products in System
              </h2>
              <p className="text-sm sm:text-base text-gray-500">
                Manage your product inventory, search by name or SKU, and update product details
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-3 sm:p-4">
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
                  className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
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

              {/* Toolbar: Filter + Results + Export */}
              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
                {/* Left: Filter Dropdown + Results */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <select
                    value={searchField}
                    onChange={(e) => handleSearchFieldChange(e.target.value as 'all' | 'name' | 'sku' | 'barcode')}
                    className="text-xs font-medium rounded-lg border-gray-200 bg-gray-50 py-1.5 pl-3 pr-8 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer transition-colors hover:bg-gray-100"
                  >
                    <option value="all">All Fields</option>
                    <option value="name">Name</option>
                    <option value="sku">SKU</option>
                    <option value="barcode">Barcode</option>
                  </select>
                  
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-md">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">
                      {finalFilteredProducts.length} of {filteredProducts.length}
                    </span>
                  </div>
                </div>
                
                {/* Right: Export Button */}
                <button
                  onClick={handleExportCSV}
                  disabled={finalFilteredProducts.length === 0}
                  title="Export CSV"
                  className={clsx(
                    'flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 flex-shrink-0',
                    finalFilteredProducts.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer shadow-sm'
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
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