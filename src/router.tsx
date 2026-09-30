import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ComparePage } from './pages/ComparePage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductPage } from './pages/ProductPage'
import { SearchPage } from './pages/SearchPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/product/:id', element: <ProductPage /> },
      { path: '/cart', element: <CartPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '/orders/:id/confirmation', element: <OrderConfirmationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
