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
