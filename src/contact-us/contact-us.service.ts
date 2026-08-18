import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { sendEmail } from '../utils/sendEmail';
import { getBrandedEmailHtml } from '../utils/getBrandedEmailHtml';

@Injectable()
export class ContactUsService {
  async sendContactMessage(dto: CreateContactDto) {
    const { firstName, lastName, email, phoneNumber, message } = dto;

    const contentHtml = `
      <div style="background-color: #FAF6EE; border-left: 4px solid #F04D2A; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
        <h2 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">New Contact Inquiry</h2>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Sender Name:</strong> ${firstName} ${lastName}</p>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Email Address:</strong> ${email}</p>
        <p style="margin: 6px 0; color: #4B5563;"><strong>Phone Number:</strong> ${phoneNumber || 'N/A'}</p>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #E5E7EB; padding: 20px; border-radius: 6px;">
        <p style="margin-top: 0; font-weight: 700; color: #0E1D2B; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Message Details:</p>
        <p style="margin-bottom: 0; color: #1F2937; white-space: pre-wrap; line-height: 1.6;">${message}</p>
      </div>
    `;

    const brandedHtml = getBrandedEmailHtml({
      title: 'New Support Message',
      bodyHtml: contentHtml,
    });

    await sendEmail(
      process.env.SUPPORT_NOTIFICATION_RECIPIENT || 'support@doundogames.com',
      `New Contact Message from ${firstName} ${lastName}`,
      brandedHtml,
      'support',
    );

    return { message: 'Message sent successfully' };
  }
}
