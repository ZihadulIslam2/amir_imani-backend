import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { sendEmail } from '../utils/sendEmail';
import { getBrandedEmailHtml } from '../utils/getBrandedEmailHtml';

@Injectable()
export class ContactUsService {
  async sendContactMessage(dto: CreateContactDto) {
    const { firstName, lastName, email, phoneNumber, message } = dto;
    const fullName = `${firstName} ${lastName}`.trim();

    const contactSubject = dto.subject?.trim() || 'General Inquiry';
    const frontendUrl = process.env.FRONTEND_URL || 'https://doundogames.com';

    // 1. Admin/Support Notification Email
    const adminContentHtml = `
      <div style="background-color: #FAF6EE; border-left: 4px solid #F04D2A; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
        <h2 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">New Contact Inquiry</h2>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Sender Name:</strong> ${fullName}</p>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Email Address:</strong> ${email}</p>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Phone Number:</strong> ${phoneNumber || 'N/A'}</p>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Subject:</strong> ${contactSubject}</p>
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
      <p style="margin: 0 0 16px; font-size: 16px; color: #1F2937;">Hi <strong>${firstName}</strong>,</p>
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #374151;">
        Thank you for contacting DoUndo Games.
      </p>
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #374151;">
        We’ve successfully received your message, and a member of our team will review it.
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        There’s no need to submit the form again. If you would like to add anything to your original message, simply reply to this email.
      </p>
      <div style="background-color: #FAF6EE; border-left: 4px solid #F04D2A; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px 0; color: #0E1D2B; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Your Message</h4>
        <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;"><strong>Subject:</strong> ${contactSubject}</p>
        <div style="background-color: #ffffff; border: 1px solid #E5E7EB; padding: 14px; border-radius: 6px; color: #1F2937; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${message}</div>
      </div>
      <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #374151;">
        Thank you for reaching out.
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
        We look forward to connecting with you.
      </p>
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #1F2937;">
        Best,<br>
        <strong>The DoUndo Games Team</strong><br>
        <a href="${frontendUrl}" style="color: #0EA5B8; text-decoration: none;">www.doundogames.com</a>
      </p>
    `;

    const userBrandedHtml = getBrandedEmailHtml({
      title: 'We Received Your Message',
      bodyHtml: userContentHtml,
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
        'We Received Your Message, DoUndo Games',
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
