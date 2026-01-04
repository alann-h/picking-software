import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { sendSubscriptionConfirmationEmail, sendCancellationEmail } from './emailService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export class StripeService {
  static async handleSubscriptionUpdate(subscriptionId: string, customerId: string, event: Stripe.Event | null = null) {
    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
    const subscription = subscriptionResponse as Stripe.Subscription;
    
    // Logic to determine if the user should still have access
    // 1. If status is active/trialing/past_due, they have access.
    // 2. If status is canceled, check if they are within the paid period (expiresAt > now).
  
    const currentPeriodEnd = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : new Date((subscription as any).current_period_end * 1000);
  
    // subscription.ended_at is set when the subscription is truly revoked (e.g. immediate cancellation)
    const endedAt = subscription.ended_at ? new Date(subscription.ended_at * 1000) : null;
    const isTrulyEnded = endedAt && endedAt <= new Date();
  
    const isCanceled = subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired';
    
    let status = 'inactive';
  
    // Explicitly handle deletion event - if it's deleted, it's over.
    if (event?.type === 'customer.subscription.deleted') {
      status = 'inactive';
    }
    // Basic active states
    else if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
      status = 'active';
    } 
    // Handling cancellation with grace period
    else if (isCanceled && !isTrulyEnded && currentPeriodEnd > new Date()) {
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
  
      if (email && event) {
        if (event.type === 'checkout.session.completed') {
          // New Subscription
          await sendSubscriptionConfirmationEmail(email, name || 'Customer', currentPeriodEnd.toLocaleDateString());
        } else if (
          event.type === 'customer.subscription.updated' && 
          subscription.cancel_at_period_end && 
          // Only send if it JUST changed to true (prevent duplicates on future updates)
          (event as any).data?.previous_attributes?.cancel_at_period_end === false
        ) {
          // Just Cancelled (scheduled)
          await sendCancellationEmail(email, name || 'Customer', currentPeriodEnd.toLocaleDateString());
        }
      }
    }
  
    console.log(`Updated subscription for customer ${customerId} to ${status} (Expires: ${currentPeriodEnd.toISOString()})`);
  }
  
  static async handleInvoicePayment(invoice: Stripe.Invoice) {
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
}
