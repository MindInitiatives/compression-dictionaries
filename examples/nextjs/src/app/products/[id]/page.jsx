import { products } from '@compression-dictionaries/demo-content'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }))
}

export default function ProductDetail({ params }) {
  const product = products.find((p) => p.id === params.id)
  if (!product) notFound()

  return (
    <>
      <h1>{product.name}</h1>
      <dl className="product-detail">
        <dt>Rate</dt>
        <dd>{product.rate}</dd>
        <dt>Fee</dt>
        <dd>{product.fee}</dd>
      </dl>
      <p>
        Eligibility: you must be aged 18 or over, a UK resident and hold a current account with us.
      </p>
    </>
  )
}
