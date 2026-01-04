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
            Subject: 'Welcome to Smart Picker Pro! - Thank You for Subscribing',
            TextPart: `Hello ${userName || 'Customer'},
  
  Thank you so much for subscribing to Smart Picker Pro! We are thrilled to have you on board.
  
  Your subscription is now active. You have access to unlimited users, advanced reporting, and all integrations.
  
  What to do next?
  To help you get the most out of your new features, please visit our FAQ page:
  https://smartpicker.com.au/faq
  
  Your next billing date is ${endDate}.
  
  Best regards,
  Smart Picker Team`,
            HTMLPart: `
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #007bff; margin-bottom: 20px;">Welcome to the Family!</h2>
                <p style="font-size: 16px; line-height: 1.5;">Hello ${userName || 'Customer'},</p>
                <p style="font-size: 16px; line-height: 1.5;">Thank you so much for subscribing to Smart Picker Pro. We are thrilled to have you on board support your business growth.</p>
                
                <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 25px 0; border-radius: 4px;">
                  <h3 style="margin-top: 0; color: #28a745;">Your Subscription is Active</h3>
                  <p style="margin-bottom: 0;">You now have full access to Unlimited Users, Advanced Reporting, and QuickBooks & Xero Integrations.</p>
                </div>

                <h3 style="margin-top: 30px;">What to do next?</h3>
                <p style="font-size: 16px; line-height: 1.5;">To make sure you get the most out of your subscription, we recommend checking out our guides and FAQ:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://smartpicker.com.au/faq" 
                     style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Visit Smart Picker FAQ
                  </a>
                </div>

                <p style="font-size: 14px; color: #666; margin-top: 30px;">Your subscription will automatically renew on <strong>${endDate}</strong>.</p>
                
                <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
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
            Subject: 'Sad to see you go - Smart Picker Subscription',
            TextPart: `Hello ${userName || 'Customer'},
  
  We are truly sad to see you go.
  
  We've received your request to cancel your Smart Picker Pro subscription.
  Your access will continue until the end of your current billing period on ${date}.
  
  If you did not authorize this change, please contact our support team immediately: support@smartpicker.com.au
  
  We hope to welcome you back in the future.
  
  Best regards,
  Smart Picker Team`,
            HTMLPart: `
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #666; margin-bottom: 20px;">We are truly sad to see you go...</h2>
                <p style="font-size: 16px; line-height: 1.5;">Hello ${userName || 'Customer'},</p>
                <p style="font-size: 16px; line-height: 1.5;">We have received your request to cancel your Smart Picker Pro subscription.</p>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 20px; border-radius: 4px; margin: 25px 0;">
                  <strong>Note:</strong> Your Pro features will remain active until <strong>${date}</strong>.
                </div>

                <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold; color: #dc3545;">Did you not authorize this change?</p>
                  <p style="margin-top: 5px; font-size: 14px;">If you did not make this request, please contact our support team immediately:</p>
                  <p style="margin-bottom: 0;">
                    <a href="mailto:support@smartpicker.com.au" style="color: #007bff; text-decoration: underline;">support@smartpicker.com.au</a>
                  </p>
                </div>

                <p style="font-size: 16px; line-height: 1.5;">We hope to have the opportunity to serve you again in the future.</p>
                
                <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
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