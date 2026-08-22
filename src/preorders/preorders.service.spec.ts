import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PreordersService } from './preorders.service';
import { Preorder, PreorderStatus } from './preorder.schema';
import { Product } from '../products/product.schema';
import { User } from '../user/user.schema';
import * as sendEmailModule from '../utils/sendEmail';

describe('PreordersService', () => {
  let service: PreordersService;
  let mockPreorderModel: any;
  let mockProductModel: any;
  let mockUserModel: any;
  let sendEmailSpy: jest.SpyInstance;

  const validUserId = new Types.ObjectId().toString();
  const validProductId = new Types.ObjectId().toString();

  beforeEach(async () => {
    sendEmailSpy = jest
      .spyOn(sendEmailModule, 'sendEmail')
      .mockResolvedValue(undefined as any);

    mockUserModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: validUserId,
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@example.com',
            phoneNum: '+1987654321',
          }),
        }),
      }),
    };

    mockProductModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: validProductId,
            productName: 'Cyber Quest',
            productType: 'Board Game',
            category: 'Sci-Fi',
            imgs: ['https://example.com/img1.jpg'],
            isPreOrder: true,
          }),
        }),
      }),
    };

    mockPreorderModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((doc) =>
        Promise.resolve({
          ...doc,
          _id: new Types.ObjectId(),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreordersService,
        {
          provide: getModelToken(Preorder.name),
          useValue: mockPreorderModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<PreordersService>(PreordersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('createPreorder should create preorder and send both customer auto-reply and admin notification', async () => {
    const result = await service.createPreorder(validUserId, validProductId);

    expect(result.productName).toBe('Cyber Quest');
    expect(result.userEmail).toBe('alice@example.com');
    expect(result.status).toBe(PreorderStatus.PENDING);

    expect(sendEmailSpy).toHaveBeenCalledTimes(2);

    // Auto-reply confirmation to customer
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'alice@example.com',
      'Pre-Order Confirmation: Cyber Quest',
      expect.stringContaining('Thank You for Your Pre-Order!'),
      'orders',
    );

    // Internal orders team notification
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.any(String),
      'New Pre-Order: Cyber Quest by Alice Smith',
      expect.stringContaining('New Pre-Order Placed'),
      'orders',
    );
  });
});
