import Link from 'next/link'
import { products } from '@compression-dictionaries/demo-content'

export default function Products() {
  return (
    <>
      <h1>Products</h1>
      <ul className="product-list">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.id}`}>{p.name}</Link>
          </li>
        ))}
      </ul>
    </>
  )
}
