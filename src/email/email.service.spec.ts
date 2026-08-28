import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { Email } from './email.schema';
import * as sendEmailModule from '../utils/sendEmail';

describe('EmailService', () => {
  let service: EmailService;
  let mockEmailModel: any;
  let sendEmailSpy: jest.SpyInstance;

  beforeEach(async () => {
    sendEmailSpy = jest
      .spyOn(sendEmailModule, 'sendEmail')
      .mockResolvedValue(undefined as any);

    mockEmailModel = {
      create: jest.fn().mockResolvedValue({
        name: 'John Doe',
        email: 'john@example.com',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://doundogames.com'),
          },
        },
        {
          provide: getModelToken(Email.name),
          useValue: mockEmailModel,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('notifyAdmin should save record and send both admin notification and user auto-reply confirmation', async () => {
    const dto = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = await service.notifyAdmin(dto);

    expect(result).toEqual({ message: 'Admin notified successfully' });
    expect(mockEmailModel.create).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
    });

    expect(sendEmailSpy).toHaveBeenCalledTimes(2);

    // Admin notification
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.any(String),
      'New submission from John Doe',
      expect.stringContaining('New User Submission'),
      'info',
    );

    // Auto-reply to user
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'john@example.com',
      'Thank You for Contacting DOUNDO Games',
      expect.stringContaining('Thank You for Reaching Out!'),
      'info',
    );
  });

  it('sendPaymentNotificationEmail should send notification to orders@doundogames.com with order details', async () => {
    await service.sendPaymentNotificationEmail(
      'Jane',
      'Doe',
      75.5,
      'order-12345',
      '<div>Order details html</div>',
      'usd',
    );

    expect(sendEmailSpy).toHaveBeenCalledWith(
      'orders@doundogames.com',
      'New Order #order-12345 — Jane Doe ($75.50 USD)',
      '<div>Order details html</div>',
      'orders',
    );
  });
});
