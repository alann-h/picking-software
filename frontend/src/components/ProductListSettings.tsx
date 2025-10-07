import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Product } from '../utils/types';
import { useSnackbarContext } from './SnackbarContext';
import { Loader2, Plus, RefreshCw, AlertTriangle, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onRefresh: () => void;
  updateProductDb: (_productId: number, _fields: Partial<Product>) => Promise<void>;
  setProductArchiveStatus: (_productId: number, _isArchived: boolean) => Promise<void>;
  addProductDb: (_productName: string, _sku: string, _barcode: string) => Promise<string>;
  isAdmin: boolean;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actions }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 bg-black/30">
      <div
        ref={modalRef}
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all cursor-default"
      >
        <div className="flex justify-between items-center text-lg font-medium leading-6 text-gray-900">
          <h3>{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <div className="mt-2">
          <hr className="-mx-6" />
        </div>
        <div className="mt-4">
          {children}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {actions}
        </div>
      </div>
    </div>
  );
};

const ProductList: React.FC<ProductListProps> = ({
  products,
  isLoading,
  onRefresh,
  updateProductDb,
  setProductArchiveStatus,
  addProductDb,
  isAdmin
}) => {
  const { handleOpenSnackbar } = useSnackbarContext();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  // Edit product state
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<'productName' | 'sku' | 'barcode' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.isArchived === showArchived);
    
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField] || '';
        const bValue = b[sortField] || '';
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        return 0;
      });
    }
    
    return filtered;
  }, [products, showArchived, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to first page when products change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts.length]);

  // Handle sorting
  const handleSort = (field: 'productName' | 'sku' | 'barcode') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(JSON.parse(JSON.stringify(product)));
    setEditProduct(JSON.parse(JSON.stringify(product)));
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setSelectedProduct(null);
    setEditProduct({});
    setOpenEdit(false);
  };

  const handleChangeEdit = useCallback(<K extends keyof Product>(field: K, value: Product[K]) => {
    if (selectedProduct) {
      setSelectedProduct({ ...selectedProduct, [field]: value });
      setEditProduct({ ...editProduct, [field]: value });
    }
  }, [selectedProduct, editProduct]);

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;
    try {
      await updateProductDb(selectedProduct.productId, {
        productName: selectedProduct.productName,
        price: selectedProduct.price,
        barcode: selectedProduct.barcode,
        quantityOnHand: selectedProduct.quantityOnHand,
        sku: selectedProduct.sku,
      });
      handleOpenSnackbar('Product updated successfully', 'success');
      onRefresh();
      handleCloseEdit();
    } catch (err) {
      handleOpenSnackbar((err as Error).message || 'Failed to update product', 'error');
    }
  };

  const handleArchiveAction = async () => {
    if (!selectedProduct) return;

    const newStatus = !selectedProduct.isArchived;
    const successMessage = newStatus ? 'Product archived successfully' : 'Product restored successfully';

    try {
      await setProductArchiveStatus(selectedProduct.productId, newStatus);
      handleOpenSnackbar(successMessage, 'success');
      onRefresh();
      handleCloseEdit();
    } catch (err) {
      handleOpenSnackbar((err as Error).message || 'Failed to update status', 'error');
    }
  };

  const handleOpenAdd = () => {
    setNewProductName('');
    setNewSku('');
    setNewBarcode('');
    setOpenAdd(true);
  };


  const handleCloseAdd = () => setOpenAdd(false);

  const handleAdd = async () => {
    if (!newProductName.trim() || !newSku.trim()) {
      handleOpenSnackbar('Product Name and SKU are required.', 'error');
      return;
    }
    setIsAdding(true);
    try {
      await addProductDb(newProductName.trim(), newSku.trim(), newBarcode.trim());
      handleOpenSnackbar(`Product ${newProductName} added successfully`, 'success');
      onRefresh();
      handleCloseAdd();
    } catch (err) {
      handleOpenSnackbar((err as Error).message || 'Failed to add product', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const renderInputField = (
    label: string,
    value: string | number | null | undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    type: string = 'text',
    readOnly: boolean = false,
    required: boolean = false,
    placeholder: string = '',
    borderColorClass: string = 'border-gray-300'
  ) => (
    <div>
      <label htmlFor={label} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        id={label}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        readOnly={readOnly}
        required={required}
        placeholder={placeholder}
        className={clsx(
          `mt-1 block w-full rounded-md px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100`,
          borderColorClass
        )}
        disabled={readOnly}
      />
    </div>
  );

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center mt-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center my-4">
            <button
              onClick={handleOpenAdd}
              disabled={!isAdmin}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add Product
            </button>
            <div className="flex items-center">
              <label htmlFor="show-archived" className="mr-2 text-sm font-medium text-gray-700">Show Archived</label>
              <button
                type="button"
                id="show-archived"
                onClick={() => setShowArchived(!showArchived)}
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  showArchived ? 'bg-blue-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    showArchived ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Showing {filteredProducts.length} {showArchived ? 'archived' : 'active'} products
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('productName')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Product Name</span>
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {sortField === 'productName' ? (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center justify-between">
                      <span>SKU</span>
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {sortField === 'sku' ? (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('barcode')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Barcode</span>
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {sortField === 'barcode' ? (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr
                    key={product.productId}
                    onClick={() => handleOpenEdit(product)}
                    className={clsx(
                      'cursor-pointer hover:bg-gray-50',
                      product.isArchived && 'bg-gray-100 text-gray-500'
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.productName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.barcode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={clsx(
                    'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border',
                    currentPage === 1
                      ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  )}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={clsx(
                          'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border cursor-pointer',
                          currentPage === pageNum
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={clsx(
                    'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border',
                    currentPage === totalPages
                      ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  )}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={onRefresh}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Products
            </button>
          </div>

          {/* -------- Edit Product Dialog -------- */}
          <Modal
            isOpen={openEdit}
            onClose={handleCloseEdit}
            title="Edit Product"
            children={
              <div className="space-y-4">
                {renderInputField('Product Name', selectedProduct?.productName, (e) => handleChangeEdit('productName', e.target.value), 'text', !isAdmin)}
                {renderInputField('Price', selectedProduct?.price, (e) => handleChangeEdit('price', parseFloat(e.target.value)), 'number', !isAdmin)}
                {renderInputField('Barcode', selectedProduct?.barcode, (e) => handleChangeEdit('barcode', e.target.value), 'text', !isAdmin)}
                {renderInputField('Quantity On Hand', selectedProduct?.quantityOnHand, (e) => handleChangeEdit('quantityOnHand', parseInt(e.target.value, 10)), 'number', !isAdmin)}
                {renderInputField('SKU', selectedProduct?.sku, (e) => handleChangeEdit('sku', e.target.value), 'text', !isAdmin)}
                
              </div>
            }
            actions={
              <>
                <button onClick={handleArchiveAction} className={clsx(
                  "inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer",
                  selectedProduct?.isArchived ? "bg-green-100 text-green-900 hover:bg-green-200 focus:ring-green-500" : "bg-red-100 text-red-900 hover:bg-red-200 focus:ring-red-500"
                )}>
                  {selectedProduct?.isArchived ? 'Restore' : 'Archive'}
                </button>
                <button onClick={handleCloseEdit} className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer">
                  Save
                </button>
              </>
            }
          />

          {/* -------- Add Product Dialog -------- */}
          <Modal
            isOpen={openAdd}
            onClose={handleCloseAdd}
            title="Add New Product"
            children={
              <div className="space-y-4">
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          This product must already exist in QuickBooks with the exact same name and SKU, otherwise enrichment will fail.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {renderInputField('Product Name', newProductName, (e) => setNewProductName(e.target.value), 'text', false, true, "New product name", "border-black")}
                {renderInputField('SKU', newSku, (e) => setNewSku(e.target.value), 'text', false, true, "Product SKU", "border-black")}
                {renderInputField('Barcode', newBarcode, (e) => setNewBarcode(e.target.value), 'text', false, false, "Product barcode", "border-black")}
                
              </div>
            }
            actions={
              <>
                <button onClick={handleCloseAdd} className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isAdding}
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isAdding ? 'Adding…' : 'Add'}
                </button>
              </>
            }
          />
        </>
      )}
    </>
  );
};

export default ProductList;