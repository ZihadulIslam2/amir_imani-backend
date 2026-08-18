import nodemailer from 'nodemailer';

export type EmailAccountType =
  'info' | 'subscribe' | 'orders' | 'noreply' | 'support';

type MailboxConfig = {
  from: string;
  name: string;
  replyTo?: string;
  authUser: string;
  authPass: string;
};

const DEFAULT_MAIL_DOMAIN = 'doundogames.com';

const required = (value: string | undefined, key: string): string => {
  if (!value?.trim()) {
    throw new Error(`Email configuration is missing: ${key}.`);
  }
  return value.trim();
};

const address = (value: string | undefined, fallback: string): string =>
  (value || fallback).trim().toLowerCase();

/**
 * Gmail authorizes a "Send mail as" alias against the account used to log in to
 * SMTP. The operations aliases must therefore all authenticate as Operations,
 * never as an individual alias or another mailbox.
 */
const getMailboxConfig = (accountType: EmailAccountType): MailboxConfig => {
  const amirUser = process.env.AMIR_MAIL_USER || process.env.INFO_MAIL_USER;
  const amirPass = process.env.AMIR_MAIL_PASS || process.env.INFO_MAIL_PASS;
  const operationsUser = process.env.OPERATIONS_MAIL_USER;
  const operationsPass = process.env.OPERATIONS_MAIL_PASS;

  const infoAddress = address(
    process.env.INFO_MAIL_ADDRESS || process.env.INFO_MAIL_USER,
    `info@${DEFAULT_MAIL_DOMAIN}`,
  );
  const supportAddress = address(
    process.env.SUPPORT_MAIL_ADDRESS || process.env.SUPPORT_MAIL_USER,
    `support@${DEFAULT_MAIL_DOMAIN}`,
  );

  if (accountType === 'info') {
    return {
      from: infoAddress,
      name: process.env.INFO_MAIL_NAME || 'DOUNDO Games',
      replyTo: address(process.env.INFO_REPLY_TO, infoAddress),
      authUser: required(amirUser, 'AMIR_MAIL_USER'),
      authPass: required(amirPass, 'AMIR_MAIL_PASS'),
    };
  }

  const operationMailboxes: Record<
    Exclude<EmailAccountType, 'info'>,
    Omit<MailboxConfig, 'authUser' | 'authPass'>
  > = {
    noreply: {
      from: address(
        process.env.NO_REPLY_MAIL_ADDRESS,
        `no-reply@${DEFAULT_MAIL_DOMAIN}`,
      ),
      name: process.env.NO_REPLY_MAIL_NAME || 'DOUNDO Games',
      // A no-reply sender should still provide customers with a working route.
      replyTo: address(process.env.NO_REPLY_REPLY_TO, supportAddress),
    },
    subscribe: {
      from: address(
        process.env.SUBSCRIBE_MAIL_ADDRESS,
        `subscribe@${DEFAULT_MAIL_DOMAIN}`,
      ),
      name: process.env.SUBSCRIBE_MAIL_NAME || 'DOUNDO Games Newsletter',
      replyTo: address(process.env.SUBSCRIBE_REPLY_TO, supportAddress),
    },
    support: {
      from: supportAddress,
      name: process.env.SUPPORT_MAIL_NAME || 'DOUNDO Games Support',
      replyTo: address(process.env.SUPPORT_REPLY_TO, supportAddress),
    },
    orders: {
      from: address(
        process.env.ORDERS_MAIL_ADDRESS,
        `orders@${DEFAULT_MAIL_DOMAIN}`,
      ),
      name: process.env.ORDERS_MAIL_NAME || 'DOUNDO Games Orders',
      replyTo: address(process.env.ORDERS_REPLY_TO, supportAddress),
    },
  };

  return {
    ...operationMailboxes[accountType],
    authUser: required(operationsUser, 'OPERATIONS_MAIL_USER'),
    authPass: required(operationsPass, 'OPERATIONS_MAIL_PASS'),
  };
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  accountType: EmailAccountType = 'info',
): Promise<void> => {
  if (!to?.trim()) {
    throw new Error('A recipient email address is required.');
  }

  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.MAIL_PORT) || 587;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MAIL_PORT must be a valid TCP port.');
  }

  const mailbox = getMailboxConfig(accountType);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: mailbox.authUser, pass: mailbox.authPass },
    requireTLS: port === 587,
  });

  await transporter.sendMail({
    from: `"${mailbox.name.replace(/"/g, '')}" <${mailbox.from}>`,
    replyTo: mailbox.replyTo,
    to: to.trim(),
    subject,
    html,
  });
};
