import { RouterProvider } from 'react-router'
import { useLocale } from './i18n'
import { router } from './router'

// Switching language remounts the routes, so every string and format is read again in
// the new language. The URL, the catalog cache and the stores (cart, compare, theme) stay.
export function App() {
  const locale = useLocale((s) => s.locale)
  return <RouterProvider key={locale} router={router} />
}
