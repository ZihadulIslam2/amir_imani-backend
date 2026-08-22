import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { sendEmail } from '../utils/sendEmail';
import { getBrandedEmailHtml } from '../utils/getBrandedEmailHtml';

@Injectable()
export class ContactUsService {
  async sendContactMessage(dto: CreateContactDto) {
    const { firstName, lastName, email, phoneNumber, message } = dto;
    const fullName = `${firstName} ${lastName}`.trim();

    // 1. Admin/Support Notification Email
    const adminContentHtml = `
      <div style="background-color: #FAF6EE; border-left: 4px solid #F04D2A; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
        <h2 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">New Contact Inquiry</h2>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Sender Name:</strong> ${fullName}</p>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Email Address:</strong> ${email}</p>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Phone Number:</strong> ${phoneNumber || 'N/A'}</p>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #E5E7EB; padding: 20px; border-radius: 6px;">
        <p style="margin-top: 0; font-weight: 700; color: #0E1D2B; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Message Details:</p>
        <p style="margin-bottom: 0; color: #1F2937; white-space: pre-wrap; line-height: 1.6;">${message}</p>
      </div>
    `;

    const adminBrandedHtml = getBrandedEmailHtml({
      title: 'New Support Message',
      bodyHtml: adminContentHtml,
    });

    // 2. User Auto-Reply "Thank You" Confirmation Email
    const userContentHtml = `
      <div style="background-color: #FAF6EE; border-left: 4px solid #0EA5B8; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">Thank You for Reaching Out!</h3>
        <p style="color: #4B5563; font-size: 15px; line-height: 1.6; margin-bottom: 0;">
          Hi <strong>${firstName}</strong>, we have received your message. A member of our support team will review your inquiry and get back to you as soon as possible.
        </p>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #E5E7EB; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin-top: 0; font-weight: 700; color: #0E1D2B; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Your Message Summary:</p>
        <p style="margin-bottom: 0; color: #4B5563; white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${message}</p>
      </div>
      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        If you need to provide additional details, simply reply to this email or contact us at <a href="mailto:support@doundogames.com" style="color: #0EA5B8; text-decoration: underline;">support@doundogames.com</a>.
      </p>
    `;

    const userBrandedHtml = getBrandedEmailHtml({
      title: 'Support Inquiry Received',
      bodyHtml: userContentHtml,
      ctaText: 'Visit Doundo Games',
      ctaUrl: process.env.FRONTEND_URL || 'https://doundogames.com',
    });

    // Send both emails concurrently with safe error handling
    const emailPromises = [
      sendEmail(
        process.env.SUPPORT_NOTIFICATION_RECIPIENT || 'support@doundogames.com',
        `New Contact Message from ${fullName}`,
        adminBrandedHtml,
        'support',
      ).catch((err) => {
        console.error('Failed to send support admin notification email:', err);
      }),
      sendEmail(
        email,
        'Thank You for Contacting DOUNDO Games Support',
        userBrandedHtml,
        'support',
      ).catch((err) => {
        console.error(`Failed to send support auto-reply confirmation to ${email}:`, err);
      }),
    ];

    await Promise.allSettled(emailPromises);

    return { message: 'Message sent successfully' };
  }
}
