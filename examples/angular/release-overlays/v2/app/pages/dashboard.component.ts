import { Component } from '@angular/core'
import { accounts, customer, transactions, formatMoney } from '@compression-dictionaries/demo-content'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h1>Good to see you, {{ firstName }}</h1>

    <h2>Accounts</h2>
    <table>
      <thead>
        <tr><th>Account</th><th>Sort code</th><th>Number</th><th>Balance</th></tr>
      </thead>
      <tbody>
        @for (account of accounts; track account.id) {
          <tr>
            <td>{{ account.name }}</td>
            <td>{{ account.sortCode }}</td>
            <td>{{ account.number }}</td>
            <td>{{ fmt(account.balance) }}</td>
          </tr>
        }
      </tbody>
    </table>

    <h2>Recent transactions</h2>
    <table>
      <thead>
        <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
      </thead>
      <tbody>
        @for (tx of transactions; track tx.id) {
          <tr>
            <td>{{ tx.date }}</td>
            <td>{{ tx.description }}</td>
            <td>{{ tx.category }}</td>
            <td class="amount {{ tx.amount >= 0 ? 'in' : 'out' }}">{{ fmt(tx.amount) }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class DashboardComponent {
  firstName = customer.firstName
  accounts = accounts
  transactions = transactions
  fmt = formatMoney
}
