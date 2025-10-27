import React, { useState, useEffect, ChangeEvent } from 'react';
import { QrCode, X, Plus, Minus, Calculator, Sigma, ChevronsUp, LoaderCircle } from 'lucide-react';
import { cn } from '../utils/other';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (_qty: number) => void;
  availableQty: number;
  productName: string;
  isLoading?: boolean;
}

const STEP = 1;

const BarcodeModal: React.FC<BarcodeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableQty,
  productName,
  isLoading = false,
}) => {
  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);
  const [decimalInput, setDecimalInput] = useState<string>('1');
  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');
  const [parsedQty, setParsedQty] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setIsFractionMode(false);
      setDecimalInput('1');
      setNumeratorInput('1');
      setDenominatorInput('1');
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

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

  const handleMax = () => {
    if (!isFractionMode) {
      setParsedQty(availableQty);
      setDecimalInput(availableQty.toString());
    }
  };

  const handleConfirmClick = () => {
    if (!isLoading) {
      onConfirm(parsedQty);
    }
  };

  const isTooLow = parsedQty <= 0;
  const isTooHigh = parsedQty > availableQty;
  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;

  const getCalculatedValueColor = () => {
    if (isTooLow) return 'text-red-600 border-red-200 bg-red-50';
    if (isTooHigh) return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    return 'text-green-600 border-green-200 bg-green-50';
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" />
      <div className="relative z-50 w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all cursor-default">
        {/* Header */}
        <div className="flex justify-between items-center text-lg font-medium leading-6 text-gray-900">
          <div className="flex items-center gap-2">
            <QrCode className="h-6 w-6 text-blue-600" />
            <span>{productName}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">Quantity Required</p>
            <p className="text-2xl font-bold text-blue-800">{availableQty}</p>
          </div>

          <div>
            <div className="flex space-x-2">
              <label className="sr-only">Input Method</label>
              <button
                type="button"
                onClick={() => setIsFractionMode(false)}
                className={cn(
                  'flex-1 cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                  !isFractionMode
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-center">
                  <Calculator className="mr-2 h-4 w-4" />
                  Decimal
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsFractionMode(true)}
                className={cn(
                  'flex-1 cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                  isFractionMode
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
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
                <input id="numerator" type="number" value={numeratorInput} onChange={handleNumeratorChange} min={0} step={1} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="denominator" className="block text-sm font-medium text-gray-700">Units in Box</label>
                <input id="denominator" type="number" value={denominatorInput} onChange={handleDenominatorChange} min={1} step={1} className={cn('mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm', isInvalidFraction && 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500')} />
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
                  className={cn(
                    'relative inline-flex items-center rounded-l-md border bg-gray-50 px-3 text-gray-500 hover:bg-gray-100 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
                    (isTooLow || isTooHigh) ? 'border-red-300' : 'border-gray-300',
                  )}
                >
                  <Minus className="h-4 w-4"/>
                </button>
                <input
                  id="quantity"
                  type="number"
                  value={decimalInput}
                  onChange={handleDecimalChange}
                  min={0}
                  step={1.00}
                  className={cn(
                    '-ml-px block w-full flex-1 border py-2 text-center sm:text-sm focus:z-10 focus:outline-none focus:ring-1',
                    (isTooLow || isTooHigh)
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  )}
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  className={cn(
                    'relative -ml-px inline-flex items-center border bg-gray-50 px-3 text-gray-500 hover:bg-gray-100 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
                    (isTooLow || isTooHigh) ? 'border-red-300' : 'border-gray-300',
                  )}
                >
                  <Plus className="h-4 w-4"/>
                </button>
                <button
                  type="button"
                  onClick={handleMax}
                  className={cn(
                    'relative -ml-px inline-flex items-center rounded-r-md border border-gray-300 bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                  )}
                >
                  <ChevronsUp className="h-4 w-4 mr-1"/>
                  Max
                </button>
              </div>
              {isTooLow && <p className="mt-1 text-sm text-red-600">Quantity must be greater than 0</p>}
              {isTooHigh && <p className="mt-1 text-sm text-yellow-600">{`Cannot exceed available quantity (${availableQty})`}</p>}
            </div>
          )}

          <div className={cn("mt-4 rounded-lg border p-4", getCalculatedValueColor())}>
            <p className="text-sm">Calculated Value:</p>
            <p className='text-2xl font-bold'>
              {typeof parsedQty === 'number' && !isNaN(parsedQty) ? parsedQty.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isTooLow || isTooHigh || isInvalidFraction || isLoading}
            className="inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading && <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />}
            {isLoading ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeModal;