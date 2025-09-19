import React, { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react';
import { X, Plus, Minus, Calculator, Sigma, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Product } from '../utils/types';
import { useQuery } from '@tanstack/react-query';
import { getAllProducts } from '../api/products';
import { cn } from '../utils/other';
import PortalDropdown from './PortalDropdown';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (variables: { productId: number; qty: number }) => void;
  isSubmitting: boolean;
}

const STEP = 1;

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit, isSubmitting }) => {
  const { data: allProducts = [], isLoading: isProductListLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getAllProducts,
    staleTime: 5 * 60 * 1000,
  });

  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);
  const [decimalInput, setDecimalInput] = useState<string>('1');
  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');
  const [parsedQty, setParsedQty] = useState<number>(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedProduct(null);
      setIsFractionMode(false);
      setDecimalInput('1');
      setNumeratorInput('1');
      setDenominatorInput('1');
      setQuery('');
      setIsProductDropdownOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!isFractionMode) {
      const num = parseFloat(decimalInput);
      setParsedQty(isNaN(num) ? 0 : num);
    }
  }, [decimalInput, isFractionMode]);

  useEffect(() => {
    if (isFractionMode) {
      const num = parseFloat(numeratorInput);
      const den = parseFloat(denominatorInput);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        setParsedQty(num / den);
      } else {
        setParsedQty(0);
      }
    }
  }, [numeratorInput, denominatorInput, isFractionMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is within the modal
      if (modalRef.current && modalRef.current.contains(target)) {
        return;
      }
      
      // Check if click is within the dropdown portal
      const dropdownElement = document.querySelector('[data-portal-dropdown]');
      if (dropdownElement && dropdownElement.contains(target)) {
        return;
      }
      
      // If click is outside both modal and dropdown, close the modal
      onClose();
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  const handleDecimalChange = (e: ChangeEvent<HTMLInputElement>) => setDecimalInput(e.target.value);
  const handleNumeratorChange = (e: ChangeEvent<HTMLInputElement>) => setNumeratorInput(e.target.value);
  const handleDenominatorChange = (e: ChangeEvent<HTMLInputElement>) => setDenominatorInput(e.target.value);

  const handleIncrement = () => {
    if (!isFractionMode) {
      const next = parseFloat((parsedQty + STEP).toFixed(4));
      setParsedQty(next);
      setDecimalInput(next.toString());
    }
  };

  const handleDecrement = () => {
    if (!isFractionMode) {
      const next = parseFloat((parsedQty - STEP).toFixed(4));
      if (next > 0) {
        setParsedQty(next);
        setDecimalInput(next.toString());
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedProduct && parsedQty > 0) {
      onSubmit({ productId: selectedProduct.productId, qty: parsedQty });
      onClose();
    }
  };

  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;
  const isTooLow = parsedQty <= 0;

  const filteredProducts =
    query === ''
      ? allProducts
      : allProducts.filter((product) =>
          product.productName
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().replace(/\s+/g, ''))
        );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 bg-black/30">
      <div
        ref={modalRef}
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all cursor-default"
      >
        <div className="flex justify-between items-center text-lg font-medium leading-6 text-gray-900">
          <h3>Add Product</h3>
          <button onClick={onClose} disabled={isSubmitting} className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="mt-2">
          <hr className="-mx-6" />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="product-search" className="block text-sm font-medium text-gray-700 mb-1">Select Product</label>
            <div ref={triggerRef} className="relative">
              <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 sm:text-sm">
                <input
                  id="product-search"
                  className="w-full border-none focus:outline-none focus:ring-0 placeholder:text-gray-400"
                  onChange={(event) => {
                    const newValue = event.target.value;
                    setQuery(newValue);
                    setIsProductDropdownOpen(true);
                    
                    // Clear selected product if user is typing something different
                    if (selectedProduct && newValue !== selectedProduct.productName) {
                      setSelectedProduct(null);
                    }
                  }}
                  value={selectedProduct?.productName || query}
                  placeholder="Search products..."
                  onFocus={() => setIsProductDropdownOpen(true)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-2"
                  onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                >
                  <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </button>
                {isProductListLoading && (
                  <div className="absolute inset-y-0 right-10 flex items-center pr-2">
                    <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>

              <PortalDropdown
                isOpen={isProductDropdownOpen}
                triggerRef={triggerRef}
                setIsDropdownOpen={setIsProductDropdownOpen}
                className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              >
                {filteredProducts.length === 0 && query !== '' ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Nothing found.
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.productId}
                      className="group relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 hover:bg-indigo-50 transition-colors"
                      onClick={() => {
                        setSelectedProduct(product);
                        setQuery(product.productName);
                        setIsProductDropdownOpen(false);
                      }}
                    >
                      <span className={`block truncate ${selectedProduct?.productId === product.productId ? 'font-medium' : 'font-normal'}`}>
                        {product.productName}
                        <span className="ml-2 text-xs text-gray-500">
                          SKU: {product.sku}
                        </span>
                      </span>
                      {selectedProduct?.productId === product.productId && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                          <Check className="h-5 w-5" />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </PortalDropdown>
            </div>
          </div>

          <div>
            <div className="flex space-x-2">
              <button
                type="button"
                className={cn(
                  `flex-1 cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none`,
                  !isFractionMode
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
                onClick={() => setIsFractionMode(false)}
              >
                <div className="flex items-center justify-center">
                  <Calculator className="mr-2 h-4 w-4" />
                  Decimal
                </div>
              </button>
              <button
                type="button"
                className={cn(
                  `flex-1 cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none`,
                  isFractionMode
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
                onClick={() => setIsFractionMode(true)}
              >
                <div className="flex items-center justify-center">
                  <Sigma className="mr-2 h-4 w-4" />
                  Fraction
                </div>
              </button>
            </div>
          </div>

          {isFractionMode ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="numerator" className="block text-sm font-medium text-gray-700">Units</label>
                <input id="numerator" type="number" value={numeratorInput} onChange={handleNumeratorChange} disabled={isSubmitting} min={0} step={1} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="denominator" className="block text-sm font-medium text-gray-700">Units in Box</label>
                <input id="denominator" type="number" value={denominatorInput} onChange={handleDenominatorChange} disabled={isSubmitting} min={1} step={1} className={cn('mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm', isInvalidFraction && 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500')} />
                {isInvalidFraction && <p className="mt-1 text-sm text-red-600">Denominator must be greater than 0</p>}
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
              <div className="relative mt-1 flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={isSubmitting}
                  className={cn(
                    'relative inline-flex items-center rounded-l-md border bg-gray-50 px-3 text-gray-500 hover:bg-gray-100 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
                    isTooLow ? 'border-red-300' : 'border-gray-300',
                    isTooLow && 'focus:border-red-500 focus:ring-red-500'
                  )}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="quantity"
                  type="number"
                  value={decimalInput}
                  onChange={handleDecimalChange}
                  disabled={isSubmitting}
                  min={0}
                  step={1.00}
                  className={cn(
                    '-ml-px block w-full flex-1 border py-2 text-center sm:text-sm focus:z-10 focus:outline-none focus:ring-1',
                    isTooLow
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  )}
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={isSubmitting}
                  className={cn(
                    'relative -ml-px inline-flex items-center rounded-r-md border bg-gray-50 px-3 text-gray-500 hover:bg-gray-100 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
                    isTooLow ? 'border-red-300' : 'border-gray-300',
                    isTooLow && 'focus:border-red-500 focus:ring-red-500'
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {isTooLow && <p className="mt-1 text-sm text-red-600">Quantity must be greater than 0</p>}
            </div>
          )}

          <div className={cn(
            "mt-4 rounded-lg border p-4",
            isTooLow
              ? 'border-red-200 bg-red-50'
              : 'border-green-200 bg-green-50'
          )}>
            <p className="text-sm text-gray-500">Calculated Value:</p>
            <p className={cn('text-2xl font-bold', isTooLow ? 'text-red-600' : 'text-green-600')}>
              {typeof parsedQty === 'number' && !isNaN(parsedQty) ? parsedQty.toFixed(2) : '0.00'}
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isProductListLoading || isSubmitting || !selectedProduct || parsedQty <= 0 || isInvalidFraction}
              className="inline-flex w-full justify-center items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Adding Product...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-5 w-5" />
                  Add Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;