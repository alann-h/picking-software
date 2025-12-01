import { OrderStatus } from './quote';

export type RunStatus = 'pending' | 'completed';

export interface Run {
    id: string;
    company_id: string;
    created_at: Date;
    run_number: number;
    run_name: string | null;
    driver_name: string | null;
    status: RunStatus;
}

export interface QuoteInRun {
    quoteId: string;
    quoteNumber: string;
    customerName: string;
    customerAddress?: string;
    totalAmount: number;
    priority: number;
    orderStatus: OrderStatus;
    size?: string;
    type?: string;
    deliveryCost?: number;
    notes?: string;
}

export interface RunWithDetails extends Run {
    quotes: QuoteInRun[];
}

export interface RunItemFromDB {
    run_id: string;
    priority: number;
    id: string; 
    quote_number: string;
    customer_name: string;
    total_amount: string;
    status: OrderStatus;
}
