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

  const primaryUser =
    process.env.MAIL_USER ||
    process.env.INFO_MAIL_USER ||
    'info@doundogames.com';
  const primaryPass =
    process.env.MAIL_PASS ||
    process.env.INFO_MAIL_PASS ||
    '';

  let aliasAddress = 'info@doundogames.com';
  let authUser = primaryUser;
  let authPass = primaryPass;
  let senderName = 'Doundo Games';

  switch (accountType) {
    case 'noreply':
      aliasAddress =
        process.env.NO_REPLY_MAIL_USER || 'no-reply@doundogames.com';
      if (process.env.NO_REPLY_MAIL_PASS) {
        authUser = process.env.NO_REPLY_MAIL_USER || aliasAddress;
        authPass = process.env.NO_REPLY_MAIL_PASS;
      }
      senderName = 'Doundo Games No-Reply';
      break;
    case 'subscribe':
      aliasAddress =
        process.env.SUBSCRIBE_MAIL_USER || 'subscribe@doundogames.com';
      if (process.env.SUBSCRIBE_MAIL_PASS) {
        authUser = process.env.SUBSCRIBE_MAIL_USER || aliasAddress;
        authPass = process.env.SUBSCRIBE_MAIL_PASS;
      }
      senderName = 'Doundo Games Newsletter';
      break;
    case 'support':
      aliasAddress =
        process.env.SUPPORT_MAIL_USER || 'support@doundogames.com';
      if (process.env.SUPPORT_MAIL_PASS) {
        authUser = process.env.SUPPORT_MAIL_USER || aliasAddress;
        authPass = process.env.SUPPORT_MAIL_PASS;
      }
      senderName = 'Doundo Games Support';
      break;
    case 'orders':
      aliasAddress =
        process.env.ORDERS_MAIL_USER || 'orders@doundogames.com';
      if (process.env.ORDERS_MAIL_PASS) {
        authUser = process.env.ORDERS_MAIL_USER || aliasAddress;
        authPass = process.env.ORDERS_MAIL_PASS;
      }
      senderName = 'Doundo Games Orders';
      break;
    case 'info':
    default:
      aliasAddress =
        process.env.INFO_MAIL_USER || 'info@doundogames.com';
      if (process.env.INFO_MAIL_PASS) {
        authUser = process.env.INFO_MAIL_USER || aliasAddress;
        authPass = process.env.INFO_MAIL_PASS;
      }
      senderName = 'Doundo Games';
      break;
  }

  const createTransporter = (u: string, p: string) => {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: u, pass: p },
      requireTLS: port === 587,
    });
  };

  if (!authUser || !authPass) {
    throw new Error(
      `Email configuration is missing for the ${accountType} mailbox. Configure its SMTP username and password.`,
    );
  }

  const transporter = createTransporter(authUser, authPass);
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
