import nodemailer from 'nodemailer';
import type { EmailConfiguration } from '@shared/schema';
import { storage } from './storage';

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
      
      // Find email configuration by matching SMTP settings to log the test email
      try {
        const emailConfigs = await storage.getAllEmailConfigurations();
        const matchingConfig = emailConfigs.find(cfg => 
          cfg.smtpHost === config.smtpHost && 
          cfg.smtpUser === config.smtpUser &&
          cfg.fromEmail === config.fromEmail
        );
        
        if (matchingConfig) {
          await storage.createEmailLog({
            emailConfigurationId: matchingConfig.id,
            portId: matchingConfig.portId,
            toEmail: testEmailAddress,
            fromEmail: config.fromEmail,
            fromName: config.fromName,
            subject: 'PortRay - Test Email Configuration',
            emailType: 'test',
            status: 'sent',
            userId: undefined,
          });
        }
      } catch (logError) {
        console.error('Failed to log test email:', logError);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send test email:', error);
      
      // Log failed test email
      try {
        const emailConfigs = await storage.getAllEmailConfigurations();
        const matchingConfig = emailConfigs.find(cfg => 
          cfg.smtpHost === config.smtpHost && 
          cfg.smtpUser === config.smtpUser &&
          cfg.fromEmail === config.fromEmail
        );
        
        if (matchingConfig) {
          await storage.createEmailLog({
            emailConfigurationId: matchingConfig.id,
            portId: matchingConfig.portId,
            toEmail: testEmailAddress,
            fromEmail: config.fromEmail,
            fromName: config.fromName,
            subject: 'PortRay - Test Email Configuration',
            emailType: 'test',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            userId: undefined,
          });
        }
      } catch (logError) {
        console.error('Failed to log failed test email:', logError);
      }
      
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

  // Get email configuration for a specific port
  async getPortEmailConfiguration(portId: number): Promise<EmailConfiguration | null> {
    try {
      const emailConfigs = await storage.getAllEmailConfigurations();
      // Find email configuration for this port
      const portConfig = emailConfigs.find(config => config.portId === portId);
      return portConfig || null;
    } catch (error) {
      console.error('Error getting port email configuration:', error);
      return null;
    }
  }

  // Send verification email using port-specific configuration
  async sendPortVerificationEmail(portId: number, userEmail: string, userName: string, verificationToken: string): Promise<boolean> {
    try {
      const emailConfig = await this.getPortEmailConfiguration(portId);
      
      if (!emailConfig) {
        console.error(`No email configuration found for port ${portId}`);
        return false;
      }

      const transporter = this.createTransporter({
        smtpHost: emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort,
        smtpUser: emailConfig.smtpUser,
        smtpPassword: emailConfig.smtpPassword,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
        enableTLS: emailConfig.enableTLS
      });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        (process.env.REPL_SLUG && process.env.REPL_OWNER ? 
          `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app` : 
          'http://localhost:5000');
          
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
        to: userEmail,
        subject: 'PortRay - Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to PortRay!</h2>
            <p>Hello ${userName},</p>
            <p>Thank you for joining PortRay. Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
            </p>
          </div>
        `,
        text: `
Welcome to PortRay!

Hello ${userName},

Thank you for joining PortRay. Please verify your email address to activate your account.

Click here to verify: ${verificationUrl}

This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
        `
      };

      await transporter.sendMail(mailOptions);
      
      // Log the email
      try {
        await storage.createEmailLog({
          emailConfigurationId: emailConfig.id,
          portId: portId,
          toEmail: userEmail,
          fromEmail: emailConfig.fromEmail,
          fromName: emailConfig.fromName,
          subject: 'PortRay - Verify Your Email Address',
          emailType: 'verification',
          status: 'sent',
          userId: undefined,
        });
      } catch (logError) {
        console.error('Failed to log verification email:', logError);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      
      // Log the failed email (get emailConfig again since it might be out of scope)
      try {
        const emailConfig = await this.getPortEmailConfiguration(portId);
        if (emailConfig) {
          await storage.createEmailLog({
            emailConfigurationId: emailConfig.id,
            portId: portId,
            toEmail: userEmail,
            fromEmail: emailConfig.fromEmail,
            fromName: emailConfig.fromName,
            subject: 'PortRay - Verify Your Email Address',
            emailType: 'verification',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            userId: undefined,
          });
        }
      } catch (logError) {
        console.error('Failed to log failed verification email:', logError);
      }
      
      return false;
    }
  }

  // Send password setup email using port-specific configuration
  async sendPortPasswordSetupEmail(portId: number, userEmail: string, userName: string, passwordToken: string): Promise<boolean> {
    try {
      const emailConfig = await this.getPortEmailConfiguration(portId);
      
      if (!emailConfig) {
        console.error(`No email configuration found for port ${portId}`);
        return false;
      }

      const transporter = this.createTransporter({
        smtpHost: emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort,
        smtpUser: emailConfig.smtpUser,
        smtpPassword: emailConfig.smtpPassword,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
        enableTLS: emailConfig.enableTLS
      });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        (process.env.REPL_SLUG && process.env.REPL_OWNER ? 
          `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app` : 
          'http://localhost:5000');
          
      const setupUrl = `${baseUrl}/setup-password?token=${passwordToken}`;

      const mailOptions = {
        from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
        to: userEmail,
        subject: 'PortRay - Set Up Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Set Up Your PortRay Account Password</h2>
            <p>Hello ${userName},</p>
            <p>Your email has been verified successfully! Now please set up your account password to complete the registration process.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${setupUrl}" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Set Up Password
              </a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${setupUrl}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This setup link will expire in 24 hours.
            </p>
          </div>
        `,
        text: `
Set Up Your PortRay Account Password

Hello ${userName},

Your email has been verified successfully! Now please set up your account password to complete the registration process.

Click here to set up password: ${setupUrl}

This setup link will expire in 24 hours.
        `
      };

      await transporter.sendMail(mailOptions);
      
      // Log the email
      try {
        await storage.createEmailLog({
          emailConfigurationId: emailConfig.id,
          portId: portId,
          toEmail: userEmail,
          fromEmail: emailConfig.fromEmail,
          fromName: emailConfig.fromName,
          subject: 'PortRay - Set Up Your Password',
          emailType: 'password_setup',
          status: 'sent',
          userId: undefined,
        });
      } catch (logError) {
        console.error('Failed to log password setup email:', logError);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending password setup email:', error);
      
      // Log the failed email (get emailConfig again since it might be out of scope)
      try {
        const emailConfig = await this.getPortEmailConfiguration(portId);
        if (emailConfig) {
          await storage.createEmailLog({
            emailConfigurationId: emailConfig.id,
            portId: portId,
            toEmail: userEmail,
            fromEmail: emailConfig.fromEmail,
            fromName: emailConfig.fromName,
            subject: 'PortRay - Set Up Your Password',
            emailType: 'password_setup',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            userId: undefined,
          });
        }
      } catch (logError) {
        console.error('Failed to log failed password setup email:', logError);
      }
      
      return false;
    }
  }
}

export const emailService = new EmailService();

// User verification and password setup email functions with port-based routing
export async function sendUserVerificationEmail(userEmail: string, userName: string, verificationToken: string, portId?: number): Promise<boolean> {
  try {
    if (portId) {
      // Use port-specific email configuration
      return await emailService.sendPortVerificationEmail(portId, userEmail, userName, verificationToken);
    } else {
      // Fallback to console log for users without port assignment
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        (process.env.REPL_SLUG && process.env.REPL_OWNER ? 
          `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app` : 
          'http://localhost:5000');
      
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
      
      console.log(`Verification email would be sent to ${userEmail}:`);
      console.log(`Subject: Welcome to PortRay - Verify Your Account`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log(`User: ${userName}`);
      
      return true;
    }
  } catch (error) {
    console.error('Failed to send user verification email:', error);
    return false;
  }
}

export async function sendPasswordSetupEmail(userEmail: string, userName: string, passwordSetupToken: string, portId?: number): Promise<boolean> {
  try {
    if (portId) {
      // Use port-specific email configuration
      return await emailService.sendPortPasswordSetupEmail(portId, userEmail, userName, passwordSetupToken);
    } else {
      // Fallback to console log for users without port assignment
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
    }
  } catch (error) {
    console.error('Failed to send password setup email:', error);
    return false;
  }
}