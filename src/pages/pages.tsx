import { Link, useParams, useSearchParams } from 'react-router'
import { Placeholder } from '../components/Placeholder'

export function HomePage() {
  return (
    <Placeholder title="Shop without the noise">
      Decide with facts, not noise. No sponsored results, no badges: just the product, its price, delivery, and
      return policy.
    </Placeholder>
  )
}

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q')
  return <Placeholder title={q ? `Results for “${q}”` : 'All products'} />
}

export function ProductPage() {
  const { id } = useParams()
  return <Placeholder title={`Product ${id}`} />
}

export function CartPage() {
  return <Placeholder title="Cart" />
}

export function OrdersPage() {
  return <Placeholder title="Orders" />
}

export function NotFoundPage() {
  return (
    <Placeholder title="Page not found">
      <Link to="/" className="text-action underline underline-offset-2">
        Back to home
      </Link>
    </Placeholder>
  )
}
