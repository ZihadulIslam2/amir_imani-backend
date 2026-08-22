import { Test, TestingModule } from '@nestjs/testing';
import { ContactUsService } from './contact-us.service';
import * as sendEmailModule from '../utils/sendEmail';

describe('ContactUsService', () => {
  let service: ContactUsService;
  let sendEmailSpy: jest.SpyInstance;

  beforeEach(async () => {
    sendEmailSpy = jest
      .spyOn(sendEmailModule, 'sendEmail')
      .mockResolvedValue(undefined as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactUsService],
    }).compile();

    service = module.get<ContactUsService>(ContactUsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send internal support notification and auto-reply confirmation to the user', async () => {
    const dto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phoneNumber: '+1234567890',
      message: 'I have a question about my game pre-order.',
    };

    const result = await service.sendContactMessage(dto);

    expect(result).toEqual({ message: 'Message sent successfully' });
    expect(sendEmailSpy).toHaveBeenCalledTimes(2);

    // Support Admin notification
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.any(String),
      'New Contact Message from Jane Doe',
      expect.stringContaining('New Contact Inquiry'),
      'support',
    );

    // Auto-reply to customer
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'jane.doe@example.com',
      'Thank You for Contacting DOUNDO Games Support',
      expect.stringContaining('Thank You for Reaching Out!'),
      'support',
    );
  });
});
