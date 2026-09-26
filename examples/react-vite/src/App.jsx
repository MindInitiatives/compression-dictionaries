import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/ProductDetail.jsx'

const Transfers = lazy(() => import('./pages/Transfers.jsx'))

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/transfers"
            element={
              <Suspense fallback={<p>Loading...</p>}>
                <Transfers />
              </Suspense>
            }
          />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
        </Routes>
      </main>
    </>
  )
}
