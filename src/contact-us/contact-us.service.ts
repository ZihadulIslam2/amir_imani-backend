import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { sendEmail } from '../utils/sendEmail';

@Injectable()
export class ContactUsService {
  async sendContactMessage(dto: CreateContactDto) {
    const { firstName, lastName, email, phoneNumber, message } = dto;

    const html = `
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phoneNumber}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `;

    await sendEmail(
      process.env.ADMIN_EMAIL || 'zihadul708@gmail.com',
      `New Contact Message from ${firstName} ${lastName}`,
      html,
      'info'
    );

    return { message: 'Message sent successfully' };
  }
}
