import { findColorSizeStock, usesColorSizeStock } from './color-size-stock';
import { Product } from './product.schema';

const product = {
  colorSizeStocks: [
    { color: 'red', sizes: [{ size: 'l', quantity: 10 }] },
    {
      color: 'yellow',
      sizes: [
        { size: 's', quantity: 5 },
        { size: 'm', quantity: 8 },
      ],
    },
  ],
} as Product;

describe('color-size stock', () => {
  it('finds stock only for the selected color and size', () => {
    expect(findColorSizeStock(product, 'yellow', 'm')).toEqual({
      size: 'm',
      quantity: 8,
    });
    expect(findColorSizeStock(product, 'red', 'm')).toBeUndefined();
  });

  it('identifies products that use color-size stock', () => {
    expect(usesColorSizeStock(product)).toBe(true);
    expect(usesColorSizeStock({} as Product)).toBe(false);
  });
});
