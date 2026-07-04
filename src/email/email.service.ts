import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { sendEmail } from '../utils/sendEmail';
import { NotifyAdminDto } from './dto/notify-admin.dto';
import { Email } from './email.schema';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    @InjectModel(Email.name) private emailModel: Model<Email>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('MAIL_HOST'),
      port: configService.get<number>('MAIL_PORT'),
      secure: false, // true if using 465
      auth: {
        user: configService.get<string>('MAIL_USER'),
        pass: configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendPasswordMail(to: string, password: string) {
    try {
      await this.transporter.sendMail({
        from: `"No Reply" <${process.env.MAIL_USER}>`,
        to,
        subject: 'Your Account Password',
        html: `
          <div>
            <h3>Welcome! Your account has been created.</h3>
            <p>Here is your auto-generated password:</p>
            <p style="font-size: 20px; font-weight: bold;">${password}</p>
            <p>Please change your password after logging in for security purposes.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to send password email');
    }
  }

  async sendOtpMail(to: string, otp: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail({
        from: `"No Reply" <${process.env.MAIL_USER}>`,
        to,
        subject: 'Password Reset OTP',
        html: `
          <div>
            <h3>Your OTP Code</h3>
            <p style="font-size: 20px; font-weight: bold;">${otp}</p>
            <p>This OTP will expire in 10 minutes.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async notifyAdmin(dto: NotifyAdminDto) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      throw new InternalServerErrorException('ADMIN_EMAIL is not configured');
    }

    try {
      // Save notification data to database
      await this.emailModel.create({
        name: dto.name,
        email: dto.email,
      });

      const html = `
        <h2>New user details</h2>
        <p><strong>Name:</strong> ${dto.name}</p>
        <p><strong>Email:</strong> ${dto.email}</p>
      `;

      await sendEmail(adminEmail, `New submission from ${dto.name}`, html);

      return { message: 'Admin notified successfully' };
    } catch (error) {
      console.error('Error in notifyAdmin:', error);
      throw new InternalServerErrorException(
        'Failed to process admin notification',
      );
    }
  }

  async sendProductNotificationEmail(data: {
    subscriberName: string;
    subscriberEmail: string;
    productName: string;
    price: number;
    feature: string;
    description: string;
    productType: string;
    productImage?: string;
  }) {
    try {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 40px;
            }
            .greeting {
              font-size: 16px;
              color: #333;
              margin-bottom: 20px;
            }
            .product-section {
              margin: 30px 0;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              overflow: hidden;
            }
            .product-image {
              width: 100%;
              height: 300px;
              background-color: #f0f0f0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .product-image img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .product-details {
              padding: 25px;
              background-color: #fafafa;
            }
            .product-name {
              font-size: 22px;
              font-weight: 600;
              color: #333;
              margin: 0 0 10px 0;
            }
            .product-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 15px 0;
              flex-wrap: wrap;
            }
            .price-tag {
              font-size: 28px;
              font-weight: 700;
              color: #667eea;
            }
            .type-badge {
              display: inline-block;
              background-color: #667eea;
              color: white;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .feature {
              background-color: #fff;
              padding: 15px;
              border-left: 4px solid #667eea;
              margin: 15px 0;
              border-radius: 4px;
            }
            .feature-label {
              font-weight: 600;
              color: #667eea;
              font-size: 12px;
              text-transform: uppercase;
            }
            .feature-text {
              color: #555;
              margin-top: 5px;
              font-size: 14px;
            }
            .description {
              background-color: #fff;
              padding: 15px;
              border-left: 4px solid #764ba2;
              margin: 15px 0;
              border-radius: 4px;
              line-height: 1.8;
            }
            .description-label {
              font-weight: 600;
              color: #764ba2;
              font-size: 12px;
              text-transform: uppercase;
            }
            .description-text {
              color: #555;
              margin-top: 8px;
              font-size: 14px;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 40px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
              transition: transform 0.2s;
            }
            .cta-button:hover {
              transform: scale(1.05);
            }
            .footer {
              background-color: #f5f5f5;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #999;
              border-top: 1px solid #e0e0e0;
            }
            .footer p {
              margin: 5px 0;
            }
            .divider {
              height: 2px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Product Launch!</h1>
              <p>We're excited to share a new addition to our collection</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                <p>Hi <strong>${data.subscriberName}</strong>,</p>
                <p>We just added something amazing to our store. Check it out below:</p>
              </div>

              <div class="product-section">
                ${
                  data.productImage
                    ? `<div class="product-image">
                      <img src="${data.productImage}" alt="${data.productName}">
                    </div>`
                    : `<div class="product-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 18px;">
                      No Image Available
                    </div>`
                }
                <div class="product-details">
                  <h2 class="product-name">${data.productName}</h2>
                  
                  <div class="product-meta">
                    <div class="price-tag">${data.price.toFixed(2)}</div>
                    <span class="type-badge">${data.productType}</span>
                  </div>

                  <div class="divider"></div>

                  <div class="feature">
                    <div class="feature-label">✨ Highlight</div>
                    <div class="feature-text">${data.feature}</div>
                  </div>

                  <div class="description">
                    <div class="description-label">📝 Description</div>
                    <div class="description-text">${data.description}</div>
                  </div>

                  <a href="${process.env.FRONTEND_URL || 'https://yourstore.com'}" class="cta-button">Shop Now</a>
                </div>
              </div>

              <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                Don't miss out! Limited stock available.
              </p>
            </div>

            <div class="footer">
              <p><strong>Thank you for being part of our community!</strong></p>
              <p>You received this email because you're subscribed to our product updates.</p>
              <p>© ${new Date().getFullYear()} Your Store. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail(
        data.subscriberEmail,
        `🎉 New Product: ${data.productName}`,
        html,
      );
    } catch (error) {
      console.error('Error sending product notification email:', error);
      throw error;
    }
  }

  async sendPaymentConfirmationEmail(
    email: string,
    firstName: string,
    amount: number,
    paymentId: string,
    html: string,
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail({
        from: `"Dound Games" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'Payment Confirmation - Your Order is Confirmed',
        html,
      });
      console.log(`Payment confirmation email sent successfully to ${email}`);
    } catch (error) {
      console.error(
        `Failed to send payment confirmation email to ${email}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to send payment confirmation email',
      );
    }
  }
}
