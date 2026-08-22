import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SubscribersService } from './subscribers.service';
import { Subscriber, SubscriberStatus } from './subscriber.schema';
import * as sendEmailModule from '../utils/sendEmail';

describe('SubscribersService', () => {
  let service: SubscribersService;
  let mockSubscriberModel: any;
  let sendEmailSpy: jest.SpyInstance;

  beforeEach(async () => {
    sendEmailSpy = jest
      .spyOn(sendEmailModule, 'sendEmail')
      .mockResolvedValue(undefined as any);

    mockSubscriberModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          email: 'test@example.com',
          subscriberName: 'Test User',
          game: 'Test Game',
          status: SubscriberStatus.SUBSCRIBED,
        }),
      }),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscribersService,
        {
          provide: getModelToken(Subscriber.name),
          useValue: mockSubscriberModel,
        },
      ],
    }).compile();

    service = module.get<SubscribersService>(SubscribersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save subscriber and send both confirmation auto-reply and admin notification', async () => {
    const dto = {
      email: 'test@example.com',
      subscriberName: 'Test User',
      game: 'Test Game',
    };

    const result = await service.subscribe(dto);

    expect(result.email).toBe('test@example.com');
    expect(mockSubscriberModel.findOneAndUpdate).toHaveBeenCalledWith(
      { email: 'test@example.com' },
      expect.objectContaining({
        $set: expect.objectContaining({
          email: 'test@example.com',
          status: SubscriberStatus.SUBSCRIBED,
          subscriberName: 'Test User',
          game: 'Test Game',
        }),
      }),
      expect.any(Object),
    );

    // Verify 2 emails were sent: 1 auto-reply to user, 1 admin notification
    expect(sendEmailSpy).toHaveBeenCalledTimes(2);

    // Auto-reply to subscriber
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'test@example.com',
      'Thank You for Subscribing to DOUNDO Games!',
      expect.stringContaining('Welcome to the DOUNDO Games Community!'),
      'subscribe',
    );

    // Admin notification
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.any(String),
      'New newsletter subscription',
      expect.stringContaining('New Newsletter Subscription'),
      'subscribe',
    );
  });
});
