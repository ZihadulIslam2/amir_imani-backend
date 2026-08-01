import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePaymentIntentDto } from './create-payment-intent.dto';

describe('CreatePaymentIntentDto', () => {
  const validPayload = {
    userId: '60d21b4667d0d8992e610c85',
    items: [
      {
        productId: '60d21b4667d0d8992e610c85',
        quantity: 1,
      },
    ],
    shippingAddress: {
      street: '123 Main St',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5V 2T6',
      country: 'CA',
    },
  };

  it('accepts preorder as an order type', async () => {
    const dto = plainToInstance(CreatePaymentIntentDto, {
      ...validPayload,
      orderType: 'preorder',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.orderType).toBe('preorder');
  });
});
