import { body } from 'express-validator';

export const csvContentRule = () => 
  body('csvContent')
    .notEmpty()
    .withMessage('CSV content is required')
    .isString()
    .withMessage('CSV content must be a string');

export const ordersRule = () => 
  body('orders')
    .isArray()
    .withMessage('Orders must be an array')
    .notEmpty()
    .withMessage('Orders array cannot be empty');

export const orderCustomerRule = () =>
  body('orders.*.customerId')
    .notEmpty()
    .withMessage('Customer ID is required for each order')
    .isString()
    .withMessage('Customer ID must be a string');
