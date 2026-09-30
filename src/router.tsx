import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { CartPage, HomePage, NotFoundPage, OrdersPage, ProductPage, SearchPage } from './pages/pages'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/product/:id', element: <ProductPage /> },
      { path: '/cart', element: <CartPage /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
