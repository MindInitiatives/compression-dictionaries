import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { products } from '@compression-dictionaries/demo-content'

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Products</h1>
    <p>Browse our accounts, savings and lending products.</p>
    <ul class="products">
      @for (p of products; track p.id) {
        <li><a [routerLink]="['/products', p.id]">{{ p.name }}</a></li>
      }
    </ul>
  `,
})
export class ProductsComponent {
  products = products
}
