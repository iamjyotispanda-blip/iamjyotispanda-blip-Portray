import nodemailer from 'nodemailer';
import type { EmailConfiguration } from '@shared/schema';

export interface EmailTestConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enableTLS: boolean;
}

export class EmailService {
  private createTransporter(config: EmailTestConfig) {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
      tls: {
        rejectUnauthorized: !config.enableTLS
      }
    });
  }

  async sendTestEmail(config: EmailTestConfig, testEmailAddress: string): Promise<boolean> {
    try {
      const transporter = this.createTransporter(config);

      const mailOptions = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: testEmailAddress,
        subject: 'PortRay - Test Email Configuration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Email Configuration Test</h2>
            <p>Hello,</p>
            <p>This is a test email from your PortRay application to verify that your email configuration is working correctly.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Configuration Details:</h3>
              <ul style="color: #6b7280;">
                <li><strong>SMTP Host:</strong> ${config.smtpHost}</li>
                <li><strong>SMTP Port:</strong> ${config.smtpPort}</li>
                <li><strong>From Email:</strong> ${config.fromEmail}</li>
                <li><strong>From Name:</strong> ${config.fromName}</li>
                <li><strong>TLS Enabled:</strong> ${config.enableTLS ? 'Yes' : 'No'}</li>
              </ul>
            </div>
            <p>If you received this email, your email configuration is working properly!</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This email was sent automatically by PortRay at ${new Date().toLocaleString()}.
            </p>
          </div>
        `,
        text: `
PortRay - Email Configuration Test

Hello,

This is a test email from your PortRay application to verify that your email configuration is working correctly.

Configuration Details:
- SMTP Host: ${config.smtpHost}
- SMTP Port: ${config.smtpPort}
- From Email: ${config.fromEmail}
- From Name: ${config.fromName}
- TLS Enabled: ${config.enableTLS ? 'Yes' : 'No'}

If you received this email, your email configuration is working properly!

This email was sent automatically by PortRay at ${new Date().toLocaleString()}.
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Test email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send test email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(config: EmailConfiguration, recipientEmail: string, verificationToken: string): Promise<boolean> {
    try {
      const testConfig: EmailTestConfig = {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        smtpPassword: config.smtpPassword,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        enableTLS: config.enableTLS
      };

      const transporter = this.createTransporter(testConfig);
      // Use the Replit domain or fallback to localhost for development
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        (process.env.REPL_SLUG && process.env.REPL_OWNER ? 
          `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app` : 
          'http://localhost:5000');
      const verificationUrl = `${baseUrl}/verify?token=${verificationToken}`;

      const mailOptions = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: recipientEmail,
        subject: 'Welcome to PortRay - Verify Your Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to PortRay!</h2>
            <p>Hello,</p>
            <p>You have been added as a Port Administrator contact. Please verify your email address to complete your account setup.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              If you can't click the button, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}">${verificationUrl}</a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This verification link will expire in 24 hours.
            </p>
          </div>
        `,
        text: `
Welcome to PortRay!

You have been added as a Port Administrator contact. Please verify your email address to complete your account setup.

Verification Link: ${verificationUrl}

This verification link will expire in 24 hours.
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', info.messageId);
      console.log('Verification URL sent:', verificationUrl);
      console.log('Email sent to:', recipientEmail);
      console.log('From:', `"${config.fromName}" <${config.fromEmail}>`);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();

// User verification and password setup email functions
export async function sendUserVerificationEmail(userEmail: string, userName: string, verificationToken: string): Promise<boolean> {
  try {
    // Get default email configuration (you may want to make this configurable)
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
      `https://${process.env.REPLIT_DEV_DOMAIN}` : 
      (process.env.REPL_SLUG && process.env.REPL_OWNER ? 
        `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app` : 
        'http://localhost:5000');
    
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    
    // For now, we'll use a simple console log - you can implement actual email sending later
    console.log(`Verification email would be sent to ${userEmail}:`);
    console.log(`Subject: Welcome to PortRay - Verify Your Account`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log(`User: ${userName}`);
    
    return true;
  } catch (error) {
    console.error('Failed to send user verification email:', error);
    return false;
  }
}

export async function sendPasswordSetupEmail(userEmail: string, userName: string, passwordSetupToken: string): Promise<boolean> {
  try {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
      `https://${process.env.REPLIT_DEV_DOMAIN}` : 
      (process.env.REPL_SLUG && process.env.REPL_OWNER ? 
        `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app` : 
        'http://localhost:5000');
    
    const passwordSetupUrl = `${baseUrl}/setup-password?token=${passwordSetupToken}`;
    
    console.log(`Password setup email would be sent to ${userEmail}:`);
    console.log(`Subject: PortRay - Complete Your Account Setup`);
    console.log(`Password Setup URL: ${passwordSetupUrl}`);
    console.log(`User: ${userName}`);
    
    return true;
  } catch (error) {
    console.error('Failed to send password setup email:', error);
    return false;
  }
}