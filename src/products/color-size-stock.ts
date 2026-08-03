import { Product, SizeStock } from './product.schema';

export function usesColorSizeStock(product: Product): boolean {
  return Boolean(product.colorSizeStocks?.length);
}

export function findColorSizeStock(
  product: Product,
  color: string | undefined,
  size: string | undefined,
): SizeStock | undefined {
  if (!color || !size) return undefined;

  return product.colorSizeStocks
    ?.find((stock) => stock.color === color)
    ?.sizes.find((stock) => stock.size === size);
}
