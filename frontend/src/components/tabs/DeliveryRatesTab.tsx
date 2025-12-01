import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDeliveryRates, updateDeliveryRates } from '../../api/settings';
import { useSnackbarContext } from '../SnackbarContext';
import { DollarSign, Save, Loader2 } from 'lucide-react';

const DeliveryRatesTab: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const queryClient = useQueryClient();
  
  const [forkliftPrice, setForkliftPrice] = useState<string>('');
  const [handUnloadPrice, setHandUnloadPrice] = useState<string>('');

  const { data: rates, isLoading } = useQuery({
    queryKey: ['deliveryRates'],
    queryFn: getDeliveryRates,
  });

  useEffect(() => {
    if (rates) {
      setForkliftPrice(rates.forkliftPrice);
      setHandUnloadPrice(rates.handUnloadPrice);
    }
  }, [rates]);

  const saveMutation = useMutation({
    mutationFn: async (data: { forkliftPrice: number; handUnloadPrice: number }) => {
      return updateDeliveryRates(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRates'] });
      handleOpenSnackbar('Delivery rates updated successfully', 'success');
    },
    onError: (error: any) => {
      handleOpenSnackbar(error?.message || 'Failed to update delivery rates', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const forklift = parseFloat(forkliftPrice);
    const handUnload = parseFloat(handUnloadPrice);

    if (isNaN(forklift) || isNaN(handUnload)) {
        handleOpenSnackbar('Please enter valid numbers for prices', 'error');
        return;
    }

    saveMutation.mutate({ forkliftPrice: forklift, handUnloadPrice: handUnload });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Delivery Rates</h2>
        <p className="text-gray-500 mt-1">Set the base prices for different delivery types.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="forklift" className="block text-sm font-medium text-gray-700 mb-2">
              Forklift Delivery Price ($)
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                step="0.01"
                id="forklift"
                value={forkliftPrice}
                onChange={(e) => setForkliftPrice(e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border"
                placeholder="0.00"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Cost per unit for forklift unloading.</p>
          </div>

          <div>
            <label htmlFor="handUnload" className="block text-sm font-medium text-gray-700 mb-2">
              Hand Unload Price ($)
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                step="0.01"
                id="handUnload"
                value={handUnloadPrice}
                onChange={(e) => setHandUnloadPrice(e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border"
                placeholder="0.00"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Cost per unit for hand unloading.</p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Rates
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryRatesTab;

