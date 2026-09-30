import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { AddressesPage } from './pages/AddressesPage'
import { AuthCallbackPage, SignInPage, SignUpPage } from './pages/AuthPages'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ComparePage } from './pages/ComparePage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { OrdersPage } from './pages/OrdersPage'
import { PrivacyPage } from './pages/PrivacyPage'
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
      { path: '/addresses', element: <AddressesPage /> },
      { path: '/orders/:id/confirmation', element: <OrderConfirmationPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/signup', element: <SignUpPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
