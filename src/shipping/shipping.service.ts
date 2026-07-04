import { Injectable } from '@nestjs/common';

interface ShippingRule {
  flatRate: number;
  freeThreshold: number;
  currency: 'usd' | 'cad';
}

const SHIPPING_RULES: Record<string, ShippingRule> = {
  CA: { flatRate: 15, freeThreshold: 99, currency: 'cad' },
  US: { flatRate: 10, freeThreshold: 75, currency: 'usd' },
};

@Injectable()
export class ShippingService {
  calculateShipping(country: string, subtotalUsd: number): {
    cost: number;
    currency: 'usd' | 'cad';
  } {
    const rule = SHIPPING_RULES[country.toUpperCase()];
    if (!rule) {
      // Shipping not supported for this country
      return { cost: 0, currency: 'usd' };
    }

    // Convert subtotal to the rule's currency for threshold comparison
    const exchangeRate = parseFloat(
      process.env.CAD_EXCHANGE_RATE || '1.44',
    );
    const subtotalInRuleCurrency =
      rule.currency === 'cad'
        ? subtotalUsd * exchangeRate
        : subtotalUsd;

    if (subtotalInRuleCurrency >= rule.freeThreshold) {
      return { cost: 0, currency: rule.currency };
    }

    return { cost: rule.flatRate, currency: rule.currency };
  }

  isShippingSupported(country: string): boolean {
    return ['US', 'CA'].includes(country.toUpperCase());
  }
}
