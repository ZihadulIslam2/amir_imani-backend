import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  afterAll(() => {
    if (originalStripeSecretKey) {
      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
    } else {
      delete process.env.STRIPE_SECRET_KEY;
    }
  });

  const product = {
    _id: { toString: () => '60d21b4667d0d8992e610c85' },
    productName: 'Oracle Deck',
    price: 25,
    ca_price: 35,
    isPreOrder: false,
  };

  const createService = () => {
    const paymentModel = {
      create: jest.fn().mockResolvedValue({ _id: 'payment-1' }),
    };
    const productModel = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(product)
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(product) }),
    };
    const cartService = {
      createCart: jest
        .fn()
        .mockRejectedValue(new Error('A product in the cart no longer exists')),
    };
    const shippingService = {
      calculateShipping: jest
        .fn()
        .mockReturnValue({ cost: 0, currency: 'usd' }),
    };
    const service = new PaymentService(
      paymentModel as any,
      productModel as any,
      cartService as any,
      shippingService as any,
      {} as any,
      {} as any,
      {} as any,
    );

    jest
      .spyOn((service as any).stripe.paymentIntents, 'create')
      .mockResolvedValue({
        id: 'pi_1',
        client_secret: 'pi_1_secret',
        currency: 'usd',
        livemode: false,
      } as any);

    return { service, paymentModel, cartService };
  };

  it('creates an inline checkout intent without mutating an old server cart', async () => {
    const { service, paymentModel, cartService } = createService();

    await service.createPaymentIntent({
      userId: '60d21b4667d0d8992e610c85',
      items: [{ productId: '60d21b4667d0d8992e610c85', quantity: 1 }],
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        province: 'NY',
        postalCode: '10001',
        country: 'US',
      },
    });

    expect(cartService.createCart).not.toHaveBeenCalled();
    expect(paymentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ itemIds: [] }),
    );
  });

  it('handlePaymentSuccess sends order notification email to orders team with full details without customer auto-reply', async () => {
    const payment = {
      _id: 'payment-999',
      userId: 'user-1',
      paymentIntent: 'pi_test_123',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      totalAmount: 50,
      currency: 'usd',
      subtotal: 50,
      shippingCost: 0,
      discountAmount: 0,
      items: [
        {
          productId: '60d21b4667d0d8992e610c85',
          productName: 'Oracle Deck',
          price: 25,
          currency: 'usd',
          quantity: 2,
        },
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'Toronto',
        province: 'ON',
        postalCode: 'M5V 2T6',
        country: 'CA',
      },
      save: jest.fn().mockResolvedValue(true),
    };

    const paymentModel = {
      findOne: jest.fn().mockResolvedValue(payment),
    };
    const user = {
      _id: 'user-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      phoneNum: '+1234567890',
    };
    const userService = {
      findById: jest.fn().mockResolvedValue(user),
    };
    const emailService = {
      sendPaymentConfirmationEmail: jest.fn(),
      sendPaymentNotificationEmail: jest.fn().mockResolvedValue(undefined),
    };
    const productModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(product),
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const service = new PaymentService(
      paymentModel as any,
      productModel as any,
      { deleteCartById: jest.fn() } as any,
      {} as any,
      emailService as any,
      {} as any,
      userService as any,
    );

    const intent = {
      id: 'pi_test_123',
      payment_method_types: ['card'],
    } as any;

    await (service as any).handlePaymentSuccess(intent);

    expect(payment.paymentStatus).toBe('paid');
    expect(payment.orderStatus).toBe('processing');
    expect(emailService.sendPaymentConfirmationEmail).not.toHaveBeenCalled();
    expect(emailService.sendPaymentNotificationEmail).toHaveBeenCalledWith(
      'Alice',
      'Smith',
      50,
      'payment-999',
      expect.stringContaining('Oracle Deck'),
      'usd',
    );
  });
});
