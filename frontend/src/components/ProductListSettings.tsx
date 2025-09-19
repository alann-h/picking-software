import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Product } from '../utils/types';
import { useSnackbarContext } from './SnackbarContext';
import { Loader2, Plus, RefreshCw, AlertTriangle, X } from 'lucide-react';
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
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.isArchived === showArchived),
    [products, showArchived],
  );

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(JSON.parse(JSON.stringify(product)));
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setSelectedProduct(null);
    setOpenEdit(false);
  };

  const handleChangeEdit = useCallback(<K extends keyof Product>(field: K, value: Product[K]) => {
    if (selectedProduct) {
      setSelectedProduct({ ...selectedProduct, [field]: value });
    }
  }, [selectedProduct]);

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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
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