import React, {
  useState,
  useEffect,
  ChangeEvent,
} from 'react';
import {
  Calculator,
  Sigma,
  Plus,
  Minus,
  LoaderCircle,
  X,
} from 'lucide-react';
import { cn } from '../utils/other';

interface AdjustQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentQty: number;
  productId: number;
  onConfirm: (variables: { productId: number; newQty: number }) => void;
  isLoading: boolean;
}

const STEP = 1;

const AdjustQuantityModal: React.FC<AdjustQuantityModalProps> = ({
  isOpen,
  onClose,
  productName,
  currentQty,
  productId,
  onConfirm,
  isLoading,
}) => {
  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);
  const [decimalInput, setDecimalInput] = useState<string>(
    currentQty.toString()
  );
  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');
  const [parsedQty, setParsedQty] = useState<number>(currentQty);

  useEffect(() => {
    if (isOpen) {
      setIsFractionMode(false);
      setDecimalInput(currentQty.toString());
      setNumeratorInput('1');
      setDenominatorInput('1');
      setParsedQty(currentQty);
    }
  }, [isOpen, currentQty]);

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

  const handleDecimalChange = (e: ChangeEvent<HTMLInputElement>) =>
    setDecimalInput(e.target.value);
  const handleNumeratorChange = (e: ChangeEvent<HTMLInputElement>) =>
    setNumeratorInput(e.target.value);
  const handleDenominatorChange = (e: ChangeEvent<HTMLInputElement>) =>
    setDenominatorInput(e.target.value);

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

  const handleConfirm = () => {
    if (parsedQty > 0) {
      onConfirm({ productId, newQty: parsedQty });
      onClose();
    }
  };

  const isInvalidFraction =
    isFractionMode && parseFloat(denominatorInput) === 0;
  const isTooLow = parsedQty <= 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/5 bg-black/30" />
      <div className="relative z-10 w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Adjust Quantity
            <p className="mt-1 text-sm font-normal text-gray-500">
              {productName}
            </p>
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <hr className="my-4" />

        {/* Content */}
        <div className="mt-2">
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Current Quantity:{' '}
              <span className="ml-1 inline-flex items-center justify-center rounded-full border border-blue-500 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {currentQty}
              </span>
            </p>
          </div>

          <div className="mb-4">
            <div className="flex space-x-2">
              <label className="sr-only">
                Input Method
              </label>
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
                <label
                  htmlFor="numerator"
                  className="block text-sm font-medium text-gray-700"
                >
                  Units
                </label>
                <input
                  id="numerator"
                  type="number"
                  value={numeratorInput}
                  onChange={handleNumeratorChange}
                  min={0}
                  step={1}
                  disabled={isLoading}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="denominator"
                  className="block text-sm font-medium text-gray-700"
                >
                  Units in Box
                </label>
                <input
                  id="denominator"
                  type="number"
                  value={denominatorInput}
                  onChange={handleDenominatorChange}
                  min={1}
                  step={1}
                  disabled={isLoading}
                  className={cn(
                    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm',
                    isInvalidFraction &&
                    'border-red-500 focus:border-red-500 focus:ring-red-500'
                  )}
                />
                {isInvalidFraction && (
                  <p className="mt-2 text-sm text-red-600">
                    Denominator must be greater than 0
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="new-quantity"
                className="block text-sm font-medium text-gray-700"
              >
                New Quantity
              </label>
              <div className="relative mt-1 flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={isLoading}
                  className={cn(
                    'relative inline-flex items-center rounded-l-md border bg-gray-50 px-3 text-gray-500',
                    'hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50',
                    'focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer',
                    isTooLow ? 'border-red-300' : 'border-gray-300'
                  )}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="new-quantity"
                  type="number"
                  value={decimalInput}
                  onChange={handleDecimalChange}
                  disabled={isLoading}
                  min={0}
                  step={1.0}
                  className={cn(
                    '-ml-px block w-full flex-1 border py-2 text-center sm:text-sm',
                    'focus:z-10 focus:outline-none focus:ring-1',
                    isTooLow
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  )}
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={isLoading}
                  className={cn(
                    'relative -ml-px inline-flex items-center rounded-r-md border bg-gray-50 px-3 text-gray-500',
                    'hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50',
                    'focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer',
                    isTooLow ? 'border-red-300' : 'border-gray-300'
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {isTooLow && (
                <p className="mt-2 text-sm text-red-600">
                  Quantity must be greater than 0
                </p>
              )}
            </div>
          )}

          <div
            className={cn(
              `mt-4 rounded-lg border p-4`,
              isTooLow
                ? 'border-red-200 bg-red-50'
                : 'border-green-200 bg-green-50'
            )}
          >
            <p className="text-sm text-gray-500">Calculated Value:</p>
            <p
              className={cn(
                'text-2xl font-bold',
                isTooLow ? 'text-red-600' : 'text-green-600'
              )}
            >
              {typeof parsedQty === 'number' && !isNaN(parsedQty)
                ? parsedQty.toFixed(2)
                : '0.00'}
            </p>
          </div>
        </div>

        <hr className="my-4" />

        {/* Footer */}
        <div className="mt-4 flex justify-end space-x-2">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300 cursor-pointer"
            onClick={handleConfirm}
            disabled={isTooLow || isInvalidFraction || isLoading}
          >
            {isLoading && (
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
            )}
            {isLoading ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdjustQuantityModal;