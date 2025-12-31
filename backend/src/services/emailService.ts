import { MailjetRequest, MailjetResponse } from '../types/email.js';
import Mailjet from 'node-mailjet';

// @ts-expect-error - Mailjet types are not compatible with the current version of Mailjet
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY!,
  process.env.MAILJET_API_SECRET!
);

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's display name
 * @returns {Promise<any>} Mailjet response body
 */
export async function sendPasswordResetEmail(email: string, resetToken: string, userName: string | null): Promise<any> {
  try {
    const resetUrl = `https://smartpicker.com.au/reset-password?token=${resetToken}`;
    
    const request = mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'noreply@smartpicker.com.au',
            Name: 'Smart Picker'
          },
          To: [
            {
              Email: email,
              Name: userName || 'User'
            }
          ],
          Subject: 'Reset Your Password - Smart Picker',
          TextPart: `Hello ${userName || 'User'},

You requested to reset your password for your Smart Picker account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
Smart Picker Team`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Reset Your Password</h2>
              <p>Hello ${userName || 'User'},</p>
              <p>You requested to reset your password for your Smart Picker account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 1 hour for security reasons.
              </p>
              <p style="color: #666; font-size: 14px;">
                If you didn't request this password reset, please ignore this email.
              </p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">
                Best regards,<br>
                Smart Picker Team
              </p>
            </div>
          `
        }
      ]
    } as MailjetRequest);

    const response: MailjetResponse = await request;
    console.log('Password reset email sent successfully:', response.body);
    return response.body;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send subscription confirmation email
 * @param {string} email - User's email address
 * @param {string} userName - User's display name
 * @param {string} endDate - Subscription end date (or renewal date)
 * @returns {Promise<any>} Mailjet response body
 */
export async function sendSubscriptionConfirmationEmail(email: string, userName: string | null, endDate: string): Promise<any> {
    try {
      const request = mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: 'noreply@smartpicker.com.au',
              Name: 'Smart Picker'
            },
            To: [
              {
                Email: email,
                Name: userName || 'Customer'
              }
            ],
            Subject: 'Welcome to Smart Picker Pro!',
            TextPart: `Hello ${userName || 'Customer'},
  
  Welcome to Smart Picker Pro! Your subscription is now active.
  
  You now have access to unlimited users, advanced reporting, and all integrations.
  
  Your next billing date is ${endDate}.
  
  Best regards,
  Smart Picker Team`,
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">Welcome to Pro!</h2>
                <p>Hello ${userName || 'Customer'},</p>
                <p>Thank you for subscribing to Smart Picker Pro. Your account has been upgraded.</p>
                <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">What's Included:</h3>
                  <ul style="padding-left: 20px; color: #555;">
                    <li>Unlimited Users</li>
                    <li>Advanced Reporting</li>
                    <li>QuickBooks & Xero Integrations</li>
                  </ul>
                </div>
                <p>Your subscription will auto-renew on <strong>${endDate}</strong>.</p>
                <p>You can manage your subscription at any time from your settings page.</p>
                <br>
                <p style="color: #999; font-size: 12px;">
                  Best regards,<br>
                  Smart Picker Team
                </p>
              </div>
            `
          }
        ]
      } as MailjetRequest);
  
      const response: MailjetResponse = await request;
      console.log('Subscription confirmation email sent successfully:', response.body);
      return response.body;
    } catch (error) {
      console.error('Error sending subscription confirmation email:', error);
      // Don't throw to prevent webhook failure
      return null;
    }
  }
  
  /**
   * Send subscription cancellation email
   * @param {string} email - User's email address
   * @param {string} userName - User's display name
   * @param {string} date - Date when access ends
   * @returns {Promise<any>} Mailjet response body
   */
  export async function sendCancellationEmail(email: string, userName: string | null, date: string): Promise<any> {
    try {
      const request = mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: 'noreply@smartpicker.com.au',
              Name: 'Smart Picker'
            },
            To: [
              {
                Email: email,
                Name: userName || 'Customer'
              }
            ],
            Subject: 'Subscription Cancellation - Smart Picker',
            TextPart: `Hello ${userName || 'Customer'},
  
  We've received your request to cancel your Smart Picker Pro subscription.
  
  Your access will continue until the end of your current billing period on ${date}. After that, your account will not be active.
  
  We're sorry to see you go! If there's anything we could have done better, please let us know.
  
  Best regards,
  Smart Picker Team`,
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #666;">Subscription Cancelled</h2>
                <p>Hello ${userName || 'Customer'},</p>
                <p>We've received your request to cancel your Smart Picker Pro subscription.</p>
                <div style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <strong>Note:</strong> Your Pro features will remain active until <strong>${date}</strong>.
                </div>
                <p>After this date, your account will not be active and you will not be able to access Pro features.</p>
                <p>We're sorry to see you go! You are welcome to resubscribe at any time.</p>
                <br>
                <p style="color: #999; font-size: 12px;">
                  Best regards,<br>
                  Smart Picker Team
                </p>
              </div>
            `
          }
        ]
      } as MailjetRequest);
  
      const response: MailjetResponse = await request;
      console.log('Cancellation email sent successfully:', response.body);
      return response.body;
    } catch (error) {
      console.error('Error sending cancellation email:', error);
      // Don't throw to prevent webhook failure
      return null; 
    }
  }
/**
 * Send password reset confirmation email
 * @param {string} email - User's email address
 * @param {string} userName - User's display name
 * @returns {Promise<any>} Mailjet response body
 */
export async function sendPasswordResetConfirmationEmail(email: string, userName: string | null): Promise<any> {
  try {
    const request = mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'noreply@smartpicker.com.au',
            Name: 'Smart Picker'
          },
          To: [
            {
              Email: email,
              Name: userName || 'User'
            }
          ],
          Subject: 'Password Successfully Reset - Smart Picker',
          TextPart: `Hello ${userName || 'User'},

Your password has been successfully reset for your Smart Picker account.

If you didn't make this change, please contact our support team immediately.

Best regards,
Smart Picker Team`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">Password Successfully Reset</h2>
              <p>Hello ${userName || 'User'},</p>
              <p>Your password has been successfully reset for your Smart Picker account.</p>
              <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately.
              </div>
              <p>You can now log in with your new password.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">
                Best regards,<br>
                Smart Picker Team
              </p>
            </div>
          `
        }
      ]
    } as MailjetRequest);

    const response: MailjetResponse = await request;
    console.log('Password reset confirmation email sent successfully:', response.body);
    return response.body;
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    throw new Error('Failed to send password reset confirmation email');
  }
}