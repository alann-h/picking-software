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