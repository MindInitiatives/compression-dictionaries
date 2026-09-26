import { Link } from 'react-router-dom'
import { products } from '@compression-dictionaries/demo-content'

export default function Products() {
  return (
    <>
      <h1>Products</h1>
      <p>Browse our accounts, savings and lending products.</p>
      <ul className="products">
        {products.map((product) => (
          <li key={product.id}>
            <Link to={`/products/${product.id}`}>{product.name}</Link>
          </li>
        ))}
      </ul>
    </>
  )
}
