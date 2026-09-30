import { t } from '../i18n'
import type { Product } from './catalog'

export interface Department {
  slug: string
  name: string
  /** DummyJSON category slugs, in the order their tiles appear. */
  categories: string[]
}

// Every one of DummyJSON's 24 categories belongs to exactly one department.
export const DEPARTMENTS: Department[] = [
  { slug: 'electronics', name: 'Electronics', categories: ['smartphones', 'laptops', 'tablets', 'mobile-accessories'] },
  { slug: 'beauty', name: 'Beauty', categories: ['beauty', 'fragrances', 'skin-care'] },
  { slug: 'home', name: 'Home', categories: ['furniture', 'home-decoration', 'kitchen-accessories'] },
  { slug: 'groceries', name: 'Groceries', categories: ['groceries'] },
  { slug: 'mens-fashion', name: 'Men’s fashion', categories: ['mens-shirts', 'mens-shoes', 'mens-watches'] },
  {
    slug: 'womens-fashion',
    name: 'Women’s fashion',
    categories: ['tops', 'womens-dresses', 'womens-bags', 'womens-shoes', 'womens-jewellery', 'womens-watches'],
  },
  { slug: 'sports-outdoors', name: 'Sports & outdoors', categories: ['sports-accessories', 'sunglasses'] },
  { slug: 'vehicles', name: 'Vehicles', categories: ['motorcycle', 'vehicle'] },
]

/** The department's name in the current language. `name` stays English: search matches it. */
export function departmentName(department: Department): string {
  return t.departments[department.slug] ?? department.name
}

export function findDepartment(slug: string | null | undefined): Department | undefined {
  return DEPARTMENTS.find((d) => d.slug === slug)
}

export function inDepartment(product: Product, department: Department): boolean {
  return department.categories.includes(product.category)
}

export function departmentOf(category: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.categories.includes(category))
}
