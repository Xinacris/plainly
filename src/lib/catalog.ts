import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'

export interface Review {
  rating: number
  comment: string
  reviewerName: string
}

// Only the DummyJSON fields Plainly shows. Fields that would look broken
// (minimumOrderQuantity, identical review dates) are deliberately left out.
export interface Product {
  id: number
  title: string
  description: string
  category: string
  price: number
  stock: number
  brand?: string
  availabilityStatus: 'In Stock' | 'Low Stock' | 'Out of Stock'
  shippingInformation: string
  returnPolicy: string
  warrantyInformation: string
  reviews: Review[]
  images: string[]
  thumbnail: string
}

const CATALOG_URL = 'https://dummyjson.com/products?limit=0'

async function fetchCatalog(): Promise<Product[]> {
  const res = await fetch(CATALOG_URL)
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`)
  const data: { products: Product[] } = await res.json()
  return data.products
}

// The whole catalog (194 products, ~46 KB gzipped) loads once; search, sort and
// product lookups all run against this single cached copy.
export const catalogQuery = queryOptions({ queryKey: ['catalog'], queryFn: fetchCatalog })

export function useCatalog(): Product[] {
  return useSuspenseQuery(catalogQuery).data
}

export function useProduct(id: number): Product | undefined {
  return useCatalog().find((p) => p.id === id)
}
