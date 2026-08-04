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
});
