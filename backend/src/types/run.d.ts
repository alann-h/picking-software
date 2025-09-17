import { OrderStatus } from './quote';

export type RunStatus = 'pending' | 'checking' | 'finalised';

export interface Run {
    id: string;
    company_id: string;
    created_at: Date;
    run_number: number;
    run_name?: string;
    status: RunStatus;
}

export interface QuoteInRun {
    quoteId: string;
    quoteNumber: string;
    customerName: string;
    totalAmount: number;
    priority: number;
    orderStatus: OrderStatus;
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
