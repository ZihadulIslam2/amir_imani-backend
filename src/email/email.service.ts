import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { sendEmail } from '../utils/sendEmail';
import { getBrandedEmailHtml } from '../utils/getBrandedEmailHtml';
import { NotifyAdminDto } from './dto/notify-admin.dto';
import { Email } from './email.schema';

@Injectable()
export class EmailService {
  private infoTransporter: nodemailer.Transporter;
  private subscribeTransporter: nodemailer.Transporter;
  private ordersTransporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    @InjectModel(Email.name) private emailModel: Model<Email>,
  ) {
    const host = configService.get<string>('MAIL_HOST');
    const port = configService.get<number>('MAIL_PORT');

    this.infoTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: configService.get<string>('INFO_MAIL_USER'),
        pass: configService.get<string>('INFO_MAIL_PASS'),
      },
    });

    this.subscribeTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: configService.get<string>('SUBSCRIBE_MAIL_USER'),
        pass: configService.get<string>('SUBSCRIBE_MAIL_PASS'),
      },
    });

    this.ordersTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: configService.get<string>('ORDERS_MAIL_USER'),
        pass: configService.get<string>('ORDERS_MAIL_PASS'),
      },
    });
  }

  async sendPasswordMail(to: string, password: string) {
    try {
      const contentHtml = `
        <div style="background-color: #FAF6EE; border-left: 4px solid #F04D2A; padding: 24px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">Welcome to Doundo Games!</h3>
          <p style="color: #4B5563; margin-bottom: 12px;">Your account has been successfully created. Here is your auto-generated login password:</p>
          <div style="background-color: #ffffff; border: 1px dashed #F04D2A; padding: 16px; text-align: center; border-radius: 6px; font-size: 24px; font-weight: 700; color: #F04D2A; letter-spacing: 2px; margin: 16px 0;">
            ${password}
          </div>
          <p style="color: #6B7280; font-size: 13px; margin-bottom: 0;">Please change your password after logging in for security purposes.</p>
        </div>
      `;

      const brandedHtml = getBrandedEmailHtml({
        title: 'Your Account Password',
        bodyHtml: contentHtml,
      });

      await sendEmail(to, 'Your Account Password', brandedHtml, 'noreply');
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to send password email');
    }
  }

  async sendOtpMail(to: string, otp: string) {
    try {
      const contentHtml = `
        <div style="background-color: #FAF6EE; border-left: 4px solid #0EA5B8; padding: 24px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">Password Reset Verification Code</h3>
          <p style="color: #4B5563; margin-bottom: 12px;">Use the OTP code below to reset your Doundo Games account password:</p>
          <div style="background-color: #ffffff; border: 2px solid #0EA5B8; padding: 18px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: 700; color: #0E1D2B; letter-spacing: 6px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6B7280; font-size: 13px; margin-bottom: 0;">This OTP is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
        </div>
      `;

      const brandedHtml = getBrandedEmailHtml({
        title: 'Password Reset OTP',
        bodyHtml: contentHtml,
      });

      await sendEmail(to, 'Password Reset OTP', brandedHtml, 'noreply');
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async notifyAdmin(dto: NotifyAdminDto) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (!adminEmail) {
      throw new InternalServerErrorException('ADMIN_EMAIL is not configured');
    }

    try {
      await this.emailModel.create({
        name: dto.name,
        email: dto.email,
      });

      const contentHtml = `
        <div style="background-color: #FAF6EE; border-left: 4px solid #0EA5B8; padding: 20px; border-radius: 6px;">
          <h3 style="margin-top: 0; color: #0E1D2B; font-size: 18px;">New User Submission</h3>
          <p style="margin: 8px 0; color: #374151;"><strong>Name:</strong> ${dto.name}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${dto.email}</p>
        </div>
      `;

      const brandedHtml = getBrandedEmailHtml({
        title: 'New Submission Received',
        bodyHtml: contentHtml,
      });

      await sendEmail(
        adminEmail,
        `New submission from ${dto.name}`,
        brandedHtml,
        'info',
      );

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

                  <a href="${this.configService.get<string>('FRONTEND_URL') || 'https://yourstore.com'}" class="cta-button">Shop Now</a>
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
        'subscribe'
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
      await sendEmail(
        email,
        'Payment Confirmation - Your Order is Confirmed',
        html,
        'orders',
      );
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
