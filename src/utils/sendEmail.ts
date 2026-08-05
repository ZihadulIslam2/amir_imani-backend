/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import nodemailer from 'nodemailer';

export type EmailAccountType = 'info' | 'subscribe' | 'orders';

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  accountType: EmailAccountType = 'info',
): Promise<void> => {
  const host = process.env.MAIL_HOST; // e.g. "smtp.gmail.com"
  const port = Number(process.env.MAIL_PORT) || 587; // 587 = STARTTLS, 465 = SMTPS
  
  let user = process.env.INFO_MAIL_USER;
  let pass = process.env.INFO_MAIL_PASS;

  if (accountType === 'subscribe') {
    user = process.env.SUBSCRIBE_MAIL_USER;
    pass = process.env.SUBSCRIBE_MAIL_PASS;
  } else if (accountType === 'orders') {
    user = process.env.ORDERS_MAIL_USER;
    pass = process.env.ORDERS_MAIL_PASS;
  }

  let transporter: nodemailer.Transporter;

  // Use real SMTP if configured; otherwise fall back to Ethereal in non-production
  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      // SMTPS (implicit TLS) only on 465; 587 uses STARTTLS
      secure: port === 465,
      auth: { user, pass },
      // Enforce STARTTLS when using 587
      requireTLS: port === 587,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      requireTLS: true,
    });
  } else {
    throw new Error(
      `Email configuration is missing for ${accountType}. Check your .env file for the respective MAIL_USER and MAIL_PASS variables.`,
    );
  }

  const info = await transporter.sendMail({
    from: user ? `"Website Contact" <${user}>` : 'noreply@example.com',
    to,
    subject,
    html,
  });

  // In dev with Ethereal, log preview URL to help debugging
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('Email preview URL:', previewUrl);
  }
};
