import { NavLink } from 'react-router-dom'
import { bank } from '@compression-dictionaries/demo-content'

export default function Header() {
  return (
    <header className="site">
      <nav>
        <span className="brand">{bank.name}</span>
        <NavLink to="/">Accounts</NavLink>
        <NavLink to="/transfers">Transfers</NavLink>
        <NavLink to="/products">Products</NavLink>
      </nav>
    </header>
  )
}
