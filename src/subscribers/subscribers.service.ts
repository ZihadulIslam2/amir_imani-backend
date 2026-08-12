import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHmac } from 'node:crypto';
import { sendEmail } from '../utils/sendEmail';
import { getBrandedEmailHtml } from '../utils/getBrandedEmailHtml';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { NotifySubscribersDto } from './dto/notify-subscribers.dto';
import {
  Subscriber,
  SubscriberDocument,
  SubscriberStatus,
} from './subscriber.schema';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectModel(Subscriber.name)
    private readonly subscriberModel: Model<SubscriberDocument>,
  ) {}

  async subscribe(dto: CreateSubscriberDto): Promise<Subscriber> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const updatePayload = {
      email: normalizedEmail,
      status: SubscriberStatus.SUBSCRIBED,
      ...(dto.subscriberName
        ? { subscriberName: dto.subscriberName.trim() }
        : {}),
      ...(dto.game ? { game: dto.game.trim() } : {}),
      ...(dto.gameCategory ? { gameCategory: dto.gameCategory.trim() } : {}),
      ...(dto.releaseDate ? { releaseDate: new Date(dto.releaseDate) } : {}),
    };

    const subscriber = await this.subscriberModel
      .findOneAndUpdate(
        { email: normalizedEmail },
        {
          $set: updatePayload,
          $setOnInsert: {
            subscriptionDate: new Date(),
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    await sendEmail(
      process.env.SUBSCRIPTION_NOTIFICATION_RECIPIENT ||
        'subscribe@dundogames.com',
      'New newsletter subscription',
      this.buildSubscriptionNotificationEmail(subscriber),
      'subscribe',
    );

    return subscriber;
  }

  async getAllSubscribers(): Promise<Subscriber[]> {
    return this.subscriberModel
      .find()
      .select(
        'subscriberName email game gameCategory subscriptionDate releaseDate status createdAt',
      )
      .sort({ subscriptionDate: -1 })
      .exec();
  }

  async getSubscribedSubscribers(): Promise<Subscriber[]> {
    return this.subscriberModel
      .find({ status: SubscriberStatus.SUBSCRIBED })
      .exec();
  }

  async unsubscribe(email: string, token: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !token) {
      throw new BadRequestException(
        'Email and unsubscribe token are required.',
      );
    }

    if (token !== this.createUnsubscribeToken(normalizedEmail)) {
      throw new BadRequestException(
        'This unsubscribe link is invalid or expired.',
      );
    }

    const subscriber = await this.subscriberModel
      .findOneAndUpdate(
        { email: normalizedEmail },
        { $set: { status: SubscriberStatus.UNSUBSCRIBED } },
        { new: true },
      )
      .exec();

    if (!subscriber) {
      throw new BadRequestException('Subscriber not found.');
    }

    return {
      email: normalizedEmail,
      status: subscriber.status,
      message: 'You have been unsubscribed successfully.',
    };
  }

  async notifySubscribers(dto: NotifySubscribersDto) {
    const subscribers = await this.getSubscribedSubscribers();

    if (!subscribers.length) {
      return {
        totalSubscribers: 0,
        sent: 0,
        failed: 0,
        message: 'No subscribed users found',
      };
    }

    const results = await Promise.allSettled(
      subscribers.map((subscriber) =>
        sendEmail(
          subscriber.email,
          dto.messageSubject,
          this.buildNotificationEmail(subscriber, dto),
          'subscribe',
        ),
      ),
    );

    const sent = results.filter(
      (result) => result.status === 'fulfilled',
    ).length;
    const failed = results.length - sent;
    const failedReasons = results
      .filter((result) => result.status === 'rejected')
      .map((result) => this.getEmailFailureMessage(result.reason));

    if (sent === 0 && failed > 0) {
      console.error('Subscriber notification email failures:', failedReasons);
      throw new InternalServerErrorException({
        message:
          'We could not send the notification right now. Please check the email service settings and try again.',
        error: 'Email delivery failed',
        details:
          failedReasons[0] || 'The email service did not accept the request.',
      });
    }

    return {
      totalSubscribers: subscribers.length,
      sent,
      failed,
      message:
        failed > 0
          ? `Notification sent to ${sent} subscriber(s), but ${failed} email(s) failed.`
          : 'Subscriber notification published successfully',
    };
  }

  private getEmailFailureMessage(reason: unknown): string {
    if (reason instanceof Error) {
      if (
        reason.message.includes('Email configuration is missing') ||
        reason.message.includes('Missing credentials')
      ) {
        return 'Email service is not configured correctly. Please check MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS.';
      }

      if (
        reason.message.includes('Invalid login') ||
        reason.message.includes('Username and Password not accepted') ||
        reason.message.includes('authentication failed')
      ) {
        return 'Email login failed. Please check the SMTP username and app password.';
      }

      if (
        reason.message.includes('ECONNECTION') ||
        reason.message.includes('ETIMEDOUT') ||
        reason.message.includes('ECONNREFUSED') ||
        reason.message.includes('ENOTFOUND')
      ) {
        return 'Email service is unreachable. Please check the SMTP host, port, and network connection.';
      }

      return reason.message;
    }

    return 'The email service did not accept the request.';
  }

  private buildNotificationEmail(
    subscriber: Subscriber,
    dto: NotifySubscribersDto,
  ): string {
    const releaseDate = subscriber.releaseDate
      ? new Intl.DateTimeFormat('en', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(new Date(subscriber.releaseDate))
      : 'Coming soon';
    const subscriberName = subscriber.subscriberName || 'there';

    const frontendUrl = process.env.FRONTEND_URL || 'https://doundogames.com';
    const unsubscribeUrl = this.buildUnsubscribeUrl(subscriber.email);

    const innerHtml = `
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1F2937;">Hi <strong>${subscriberName}</strong>,</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#374151;">${dto.messageDescription}</p>
      ${
        subscriber.game || subscriber.gameCategory
          ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:14px 16px;background-color:#FAF6EE;font-size:13px;color:#6b7280;width:40%;">Game</td>
              <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#0E1D2B;">${subscriber.game || 'General newsletter'}</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;background-color:#FAF6EE;font-size:13px;color:#6b7280;">Game Category</td>
              <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#0E1D2B;">${subscriber.gameCategory || 'All updates'}</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;background-color:#FAF6EE;font-size:13px;color:#6b7280;">Release Date</td>
              <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#0E1D2B;">${releaseDate}</td>
            </tr>
          </table>`
          : ''
      }
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;text-align:center;">
        You received this email because you subscribed to updates from Doundo Games.
        <br />
        <a href="${unsubscribeUrl}" style="color:#0EA5B8;text-decoration:underline;">Unsubscribe from these emails</a>
      </div>
    `;

    return getBrandedEmailHtml({
      title: dto.messageSubject,
      bodyHtml: innerHtml,
      ctaText: 'Visit Doundo Games',
      ctaUrl: frontendUrl,
    });
  }

  private buildSubscriptionNotificationEmail(subscriber: Subscriber): string {
    const name = subscriber.subscriberName || 'Not provided';
    const game = subscriber.game || 'General newsletter';
    const category = subscriber.gameCategory || 'Not provided';

    return getBrandedEmailHtml({
      title: 'New Newsletter Subscription',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:16px;color:#1F2937;">A visitor has subscribed to Doundo Games updates.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb;">
          <tr><td style="padding:12px;background:#FAF6EE;font-weight:600;">Name</td><td style="padding:12px;">${name}</td></tr>
          <tr><td style="padding:12px;background:#FAF6EE;font-weight:600;">Email</td><td style="padding:12px;">${subscriber.email}</td></tr>
          <tr><td style="padding:12px;background:#FAF6EE;font-weight:600;">Game</td><td style="padding:12px;">${game}</td></tr>
          <tr><td style="padding:12px;background:#FAF6EE;font-weight:600;">Category</td><td style="padding:12px;">${category}</td></tr>
        </table>
      `,
    });
  }

  private buildUnsubscribeUrl(email: string): string {
    const apiUrl =
      process.env.API_URL ||
      process.env.BACKEND_URL ||
      process.env.APP_URL ||
      'http://localhost:5000';
    const normalizedEmail = email.trim().toLowerCase();
    const token = this.createUnsubscribeToken(normalizedEmail);
    const params = new URLSearchParams({ email: normalizedEmail, token });

    return `${apiUrl.replace(/\/$/, '')}/subscribers/unsubscribe?${params.toString()}`;
  }

  private createUnsubscribeToken(email: string): string {
    const secret =
      process.env.UNSUBSCRIBE_SECRET ||
      process.env.JWT_SECRET ||
      process.env.MAIL_PASS ||
      'subscriber-unsubscribe-secret';

    return createHmac('sha256', secret).update(email).digest('hex');
  }
}
