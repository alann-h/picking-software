export interface Customer {
  id: string;
  company_id: string;
  customer_name: string;
  address?: string;
}

export interface FrontendCustomer {
  customerId: string;
  customerName: string;
  company_id: string;
  address?: string;
}

export interface LocalCustomer {
  id: string;
  customer_name: string;
  address?: string;
}
