import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import config from '../config/index.js'; // Ensure this path is correct
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any, // Use installed version or latest supported
});

// Create Checkout Session
router.post('/create-checkout-session', isAuthenticated, asyncHandler(async (req, res) => {
  const companyId = req.session.companyId;
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  // Use existing customer or create new one
  let customerId = company.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.session.email,
      name: company.companyName,
      metadata: {
        companyId: companyId
      }
    });
    customerId = customer.id;
    await prisma.company.update({
      where: { id: companyId },
      data: { stripeCustomerId: customerId }
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID, // Ensure this is set in .env
        quantity: 1,
      },
    ],
    success_url: `${config.client.url}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.client.url}/settings/billing`,
    metadata: {
      companyId: companyId
    }
  });

  res.json({ url: session.url });
}));

// Create Portal Session
router.post('/create-portal-session', isAuthenticated, asyncHandler(async (req, res) => {
  const companyId = req.session.companyId;
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.stripeCustomerId) {
    return res.status(400).json({ error: 'No Stripe customer found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${config.client.url}/settings/billing`,
  });

  res.json({ url: session.url });
}));

// Get Billing Details (Subscription + Invoices)
router.get('/details', isAuthenticated, asyncHandler(async (req, res) => {
  const companyId = req.session.companyId;
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 12
      }
    }
  });

  if (!company) return res.status(404).json({ error: 'Company not found' });

  let subscriptionDetails: any = null;
  if (company.subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(company.subscriptionId) as Stripe.Subscription;
      subscriptionDetails = {
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: (sub as any).current_period_end * 1000,
        cancel_at: sub.cancel_at ? sub.cancel_at * 1000 : null,
      };
    } catch (error) {
      console.error('Error fetching subscription from Stripe:', error);
      // Fallback to local data if stripe fails
      subscriptionDetails = {
        status: company.subscriptionStatus,
        cancel_at_period_end: false,
        current_period_end: company.subscriptionExpiresAt ? company.subscriptionExpiresAt.getTime() : null,
      };
    }
  }

  res.json({
    payments: company.payments,
    subscription: subscriptionDetails
  });
}));

export default router;
