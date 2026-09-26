import Link from 'next/link'
import { bank } from '@compression-dictionaries/demo-content'
import '@compression-dictionaries/demo-content/styles.css'

export const metadata = {
  title: bank.name,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="site">
          <nav>
            <span className="brand">{bank.name}</span>
            <Link href="/">Accounts</Link>
            <Link href="/transfers">Transfers</Link>
            <Link href="/products">Products</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
