import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { BILLING_BASE } from './config';

export const getBillingDetails = async () => {
  return await apiCallGet(`${BILLING_BASE}/details`);
};

export const createCheckoutSession = async () => {
  return await apiCallPost(`${BILLING_BASE}/create-checkout-session`, {});
};

export const createPortalSession = async () => {
  return await apiCallPost(`${BILLING_BASE}/create-portal-session`, {});
};
