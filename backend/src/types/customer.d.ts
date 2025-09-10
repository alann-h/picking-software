export interface Customer {
  id: string;
  company_id: string;
  customer_name: string;
}

export interface FrontendCustomer {
  customerId: string;
  customerName: string;
  company_id: string;
}

export interface LocalCustomer {
  id: string;
  customer_name: string;
}
