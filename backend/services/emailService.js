import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    this.initializeEmailService();
  }

  initializeEmailService() {
    const emailProvider = process.env.EMAIL_PROVIDER || 'nodemailer';
    
    if (emailProvider === 'sendgrid') {
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        console.log('✅ SendGrid email service initialized');
      } else {
        console.warn('⚠️ SendGrid API key not found, falling back to NodeMailer');
        this.initializeNodeMailer();
      }
    } else {
      this.initializeNodeMailer();
    }
  }

  initializeNodeMailer() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('✅ NodeMailer email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize NodeMailer:', error);
    }
  }

  async sendNurseActivationEmail(nurse, user, activationToken, temporaryPassword) {
    try {
      const activationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/activate?token=${activationToken}&nurseId=${nurse._id}`;
      
      const emailContent = this.getNurseActivationEmailTemplate(nurse, activationUrl, temporaryPassword);
      
      const emailData = {
        to: nurse.email,
        from: {
          email: process.env.SENDER_EMAIL || 'noreply@hospital.com',
          name: process.env.SENDER_NAME || 'Hospital Administration'
        },
        subject: `Welcome to ${process.env.HOSPITAL_NAME || 'Hospital'} - Activate Your Nurse Account`,
        html: emailContent.html,
        text: emailContent.text
      };

      let result;
      
      if (process.env.EMAIL_PROVIDER === 'sendgrid' && process.env.SENDGRID_API_KEY) {
        result = await sgMail.send(emailData);
        console.log('✅ Activation email sent via SendGrid to:', nurse.email);
      } else {
        const mailOptions = {
          from: `"${emailData.from.name}" <${emailData.from.email}>`,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        };
        
        result = await this.transporter.sendMail(mailOptions);
        console.log('✅ Activation email sent via NodeMailer to:', nurse.email);
      }

      return {
        success: true,
        messageId: result.messageId || result[0]?.headers?.['x-message-id'],
        activationUrl,
        temporaryPassword
      };

    } catch (error) {
      console.error('❌ Failed to send activation email:', error);
      return {
        success: false,
        error: error.message,
        activationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/activate?token=${activationToken}&nurseId=${nurse._id}`,
        temporaryPassword
      };
    }
  }

  getNurseActivationEmailTemplate(nurse, activationUrl, temporaryPassword) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .credentials { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>��� Welcome to ${process.env.HOSPITAL_NAME || 'Hospital'}</h1>
          </div>
          <div class="content">
            <h2>Hello ${nurse.name}! ���‍⚕️</h2>
            <p>Your nurse account has been created successfully. Please activate your account to access your dashboard.</p>
            
            <div class="credentials">
              <h3>��� Your Login Credentials</h3>
              <p><strong>Email:</strong> ${nurse.email}</p>
              <p><strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
              <p><small>You will create a new password during activation.</small></p>
            </div>
            
            <div style="text-align: center;">
              <a href="${activationUrl}" class="button">��� Activate My Account</a>
            </div>
            
            <p><strong>Account Details:</strong></p>
            <ul>
              <li>Name: ${nurse.name}</li>
              <li>Email: ${nurse.email}</li>
              <li>Nurse ID: ${nurse._id}</li>
              <li>Role: ${nurse.role || 'Staff Nurse'}</li>
            </ul>
            
            <p>Need help? Contact: ${process.env.ADMIN_CONTACT_EMAIL || 'admin@hospital.com'}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${process.env.HOSPITAL_NAME || 'Hospital'}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to ${process.env.HOSPITAL_NAME || 'Hospital'}!

Hello ${nurse.name},

Your nurse account has been created. 

Login Credentials:
- Email: ${nurse.email}
- Temporary Password: ${temporaryPassword}

Activate your account: ${activationUrl}

Need help? Contact: ${process.env.ADMIN_CONTACT_EMAIL || 'admin@hospital.com'}

Best regards,
${process.env.HOSPITAL_NAME || 'Hospital'} Team
    `;

    return { html, text };
  }

  async testConnection() {
    try {
      if (process.env.EMAIL_PROVIDER === 'sendgrid' && process.env.SENDGRID_API_KEY) {
        console.log('✅ SendGrid configured');
        return true;
      } else if (this.transporter) {
        await this.transporter.verify();
        console.log('✅ NodeMailer verified');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Email service error:', error);
      return false;
    }
  }
}

export default new EmailService();
