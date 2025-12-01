// src/controllers/customerController.ts
import { fetchCustomersLocal, saveCustomers } from '../services/customerService.js';
import { Request, Response, NextFunction } from 'express';

// GET /customers
export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.session.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID not found in session' });
    }

    const data = await fetchCustomersLocal(companyId);
    const transformedData = data.map(customer => ({
      customerId: customer.id,
      customerName: customer.customer_name,
      address: customer.address
    }));
    res.json(transformedData);
  } catch (err) {
    next(err);
  }
}

// POST /customers
export async function saveCustomerList(req: Request, res: Response, next: NextFunction) {
  try {
    const customerList = req.body;
    const companyId = req.session.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID not found in session' });
    }
    
    await saveCustomers(customerList, companyId);
    res.status(200).json({ message: 'Customers saved successfully in database' });
  } catch (err) {
    next(err);
  }
}