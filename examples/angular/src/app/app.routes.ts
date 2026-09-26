import { Routes } from '@angular/router'
import { DashboardComponent } from './pages/dashboard.component'
import { ProductsComponent } from './pages/products.component'
import { ProductDetailComponent } from './pages/product-detail.component'

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  {
    path: 'transfers',
    loadComponent: () =>
      import('./pages/transfers.component').then((m) => m.TransfersComponent),
  },
  { path: 'products', component: ProductsComponent },
  { path: 'products/:id', component: ProductDetailComponent },
  { path: '**', redirectTo: '' },
]
