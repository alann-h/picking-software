import { apiCallGet, apiCallPut } from '../utils/apiHelpers';

export interface DeliveryRates {
  forkliftPrice: string;
  handUnloadPrice: string;
}

export const getDeliveryRates = async (): Promise<DeliveryRates> => {
  const data = await apiCallGet('api/settings/rates');
  return data;
};

export const updateDeliveryRates = async (rates: { forkliftPrice: number; handUnloadPrice: number }): Promise<DeliveryRates> => {
  const data = await apiCallPut('api/settings/rates', rates);
  return data;
};
