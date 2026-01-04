import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig || !endpointSecret) {
    console.error('Missing signature or webhook secret');
    return res.status(400).send('Webhook Error: Missing signature or config');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Signature Verification Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          await handleSubscriptionUpdate(session.subscription as string, session.customer as string, event.type);
        }
        break;
      }
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': 
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription.id, subscription.customer as string, event.type);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePayment(invoice);
        break;
      }

      default:
        // console.log(`Unhandled event type ${event.type}`);
        break;
    }
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    // Return 200 to Stripe so it doesn't retry indefinitely for app errors
    return res.json({ received: true });
  }

  res.json({ received: true });
});

import { sendSubscriptionConfirmationEmail, sendCancellationEmail } from '../services/emailService.js';

// ... (existing helper function update below)

async function handleSubscriptionUpdate(subscriptionId: string, customerId: string, eventType: string) {
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscription = subscriptionResponse as Stripe.Subscription;
  
  // Logic to determine if the user should still have access
  // 1. If status is active/trialing/past_due, they have access.
  // 2. If status is canceled, check if they are within the paid period (expiresAt > now).

  const currentPeriodEnd = subscription.cancel_at
    ? new Date(subscription.cancel_at * 1000)
    : new Date((subscription as any).current_period_end * 1000);

  const isCanceled = subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired';
  
  let status = 'inactive';
  // Basic active states
  if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
    status = 'active';
  } 
  // Handling cancellation with grace period
  else if (isCanceled && currentPeriodEnd > new Date()) {
    status = 'active';
  }

  // Database Update
  // Find company to also get email for notifications
  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
    include: { users: { where: { isAdmin: true }, take: 1 } }
  });

  if (company) {
    await prisma.company.update({
      where: { id: company.id },
      data: { 
        subscriptionId: subscription.id,
        subscriptionStatus: status,
        subscriptionExpiresAt: currentPeriodEnd
      }
    });

    // Email Notifications
    let email: string | undefined | null;
    let name: string | undefined | null;

    // Try to find the specific user who owns the subscription
    if (subscription.metadata?.userId) {
      const user = await prisma.user.findUnique({ where: { id: subscription.metadata.userId } });
      if (user) {
        email = user.displayEmail;
        name = user.givenName;
      }
    }

    // Fallback to first admin if no specific user found
    if (!email) {
      const adminUser = company.users[0];
      email = adminUser?.displayEmail;
      name = adminUser?.givenName;
    }

    if (email) {
      if (eventType === 'checkout.session.completed') {
        // New Subscription
        await sendSubscriptionConfirmationEmail(email, name || 'Customer', currentPeriodEnd.toLocaleDateString());
      } else if (eventType === 'customer.subscription.updated' && subscription.cancel_at_period_end) {
        // Just Cancelled (scheduled)
        await sendCancellationEmail(email, name || 'Customer', currentPeriodEnd.toLocaleDateString());
      }
    }
  }

  console.log(`Updated subscription for customer ${customerId} to ${status} (Expires: ${currentPeriodEnd.toISOString()})`);
}

async function handleInvoicePayment(invoice: Stripe.Invoice) {
  if (!invoice.customer) return;
  
  const customerId = invoice.customer as string;
  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId }
  });

  if (company) {
    await prisma.payment.create({
      data: {
        companyId: company.id,
        amount: (invoice.amount_paid / 100), // Convert cents to dollars
        currency: invoice.currency,
        status: invoice.status || 'unknown',
        stripePaymentId: (invoice as any).payment_intent as string || invoice.id,
        invoiceUrl: invoice.hosted_invoice_url,
      }
    });
  }
}

export default router;