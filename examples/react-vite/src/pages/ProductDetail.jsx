import { Link, useParams } from 'react-router-dom'
import { products, formatMoney } from '@compression-dictionaries/demo-content'

export default function ProductDetail() {
  const { id } = useParams()
  const product = products.find((p) => p.id === id)

  if (!product) {
    return <p>Product not found. <Link to="/products">Back to products</Link></p>
  }

  return (
    <>
      <nav><Link to="/products">Back to all products</Link></nav>
      <h1>{product.name}</h1>
      <p>Compare the rate, fees and eligibility for this product before you apply. Rates are variable unless stated otherwise and may change at any time.</p>
      <table>
        <tbody>
          <tr><th scope="row">Interest rate (AER)</th><td>{product.rate}%</td></tr>
          <tr><th scope="row">Monthly fee</th><td>{product.fee}</td></tr>
          <tr><th scope="row">Minimum opening balance</th><td>{formatMoney(0)}</td></tr>
          <tr><th scope="row">Access to funds</th><td>Instant, through the app and online banking</td></tr>
        </tbody>
      </table>
      <h2>Eligibility</h2>
      <p>You must be 18 or over and a UK resident. We will run a soft credit check that does not affect your credit score.</p>
      <h2>Important information</h2>
      <p>Eligible deposits are protected up to the applicable limit. Read the key facts document and terms and conditions before you apply. Product reference {product.id}.</p>
    </>
  )
}
