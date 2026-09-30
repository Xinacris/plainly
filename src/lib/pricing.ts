import type { Product } from './catalog'

// DummyJSON's `price` is the list price before the discount: its own carts API
// charges total × (1 − discountPercentage / 100). So the price you pay is the
// discounted one, rounded to the cent per unit.
export function salePrice(product: Product): number {
  return Math.round(product.price * (100 - product.discountPercentage)) / 100
}

// Whole percent, truncated so it's never overstated (12.9% shows as 12%).
// Under 1% saves a few cents at most, so it isn't presented as a discount.
export function discountPercent(product: Product): number {
  return Math.floor(product.discountPercentage)
}

export function hasDiscount(product: Product): boolean {
  return discountPercent(product) >= 1
}

// The sale filter's rule. Uses the same truncated % the cards show, so every
// product in "10%+ off" shows at least "10% off". See DECISIONS.md for why 10.
export const SALE_THRESHOLD = 10
export const SALE_LABEL = `${SALE_THRESHOLD}%+ off`

export function onSale(product: Product): boolean {
  return discountPercent(product) >= SALE_THRESHOLD
}

/** The "10%+ off" view as context (from the top bar or the home page), biggest discounts first. */
export const SALE_URL = '/search?view=sale&sort=discount'
