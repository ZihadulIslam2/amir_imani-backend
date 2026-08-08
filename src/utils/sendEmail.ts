/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import nodemailer from 'nodemailer';

export type EmailAccountType =
  | 'info'
  | 'subscribe'
  | 'orders'
  | 'noreply'
  | 'support';

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  accountType: EmailAccountType = 'info',
): Promise<void> => {
  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.MAIL_PORT) || 587;

  // Primary credentials used for authenticating with SMTP server if alias-specific pass is not set
  const primaryAuthUser =
    process.env.MAIL_USER ||
    process.env.INFO_MAIL_USER ||
    'info@doundogames.com';
  const primaryAuthPass =
    process.env.MAIL_PASS ||
    process.env.INFO_MAIL_PASS ||
    process.env.SUBSCRIBE_MAIL_PASS ||
    process.env.ORDERS_MAIL_PASS ||
    '';

  let aliasAddress = primaryAuthUser;
  let accountPass = primaryAuthPass;
  let senderName = 'Doundo Games';

  switch (accountType) {
    case 'noreply':
      aliasAddress =
        process.env.NO_REPLY_MAIL_USER || 'no-reply@doundogames.com';
      accountPass = process.env.NO_REPLY_MAIL_PASS || primaryAuthPass;
      senderName = 'Doundo Games No-Reply';
      break;
    case 'subscribe':
      aliasAddress =
        process.env.SUBSCRIBE_MAIL_USER || 'subscribe@doundogames.com';
      accountPass = process.env.SUBSCRIBE_MAIL_PASS || primaryAuthPass;
      senderName = 'Doundo Games Newsletter';
      break;
    case 'support':
      aliasAddress =
        process.env.SUPPORT_MAIL_USER || 'support@doundogames.com';
      accountPass = process.env.SUPPORT_MAIL_PASS || primaryAuthPass;
      senderName = 'Doundo Games Support';
      break;
    case 'orders':
      aliasAddress =
        process.env.ORDERS_MAIL_USER || 'orders@doundogames.com';
      accountPass = process.env.ORDERS_MAIL_PASS || primaryAuthPass;
      senderName = 'Doundo Games Orders';
      break;
    case 'info':
    default:
      aliasAddress =
        process.env.INFO_MAIL_USER || primaryAuthUser || 'info@doundogames.com';
      accountPass = process.env.INFO_MAIL_PASS || primaryAuthPass;
      senderName = 'Doundo Games';
      break;
  }

  // SMTP Authentication credentials (use alias credentials if defined, otherwise fallback to primary auth)
  const authUser = accountPass ? aliasAddress : primaryAuthUser;
  const authPass = accountPass || primaryAuthPass;

  let transporter: nodemailer.Transporter;

  if (host && authUser && authPass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: authUser, pass: authPass },
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
      `Email configuration is missing for ${accountType}. Check your .env file for MAIL_USER and MAIL_PASS variables.`,
    );
  }

  const info = await transporter.sendMail({
    from: `"${senderName}" <${aliasAddress}>`,
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('Email preview URL:', previewUrl);
  }
};
