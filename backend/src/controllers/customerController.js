// src/controllers/customerController.js
import { fetchCustomers, saveCustomers } from '../services/customerService.js';

// GET /customers
export async function getCustomers(req, res, next) {
  try {
    const data = await fetchCustomers(req.session.companyId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /customers
export async function saveCustomerList(req, res, next) {
  try {
    const customerList = req.body;
    const companyId = req.session.companyId;
    await saveCustomers(customerList, companyId);
    res.status(200).json({ message: 'Customers saved successfully in database' });
  } catch (err) {
    next(err);
  }
}