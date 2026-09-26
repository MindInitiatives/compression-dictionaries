import { Component } from '@angular/core'
import { RouterOutlet, RouterLink } from '@angular/router'
import { bank } from '@compression-dictionaries/demo-content'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="site">
      <nav>
        <span class="brand">{{ brand }}</span>
        <a routerLink="/">Accounts</a>
        <a routerLink="/transfers">Transfers</a>
        <a routerLink="/products">Products</a>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class App {
  brand = bank.name
}
