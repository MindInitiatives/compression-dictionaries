import { Component } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { payees, formatMoney } from '@compression-dictionaries/demo-content'

function estimateFee(amount: number): number | null {
  if (!amount || amount <= 0) return null
  return amount > 1000 ? 0.25 : 0
}

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (!confirmed) {
      <h1>Make a transfer</h1>
      <form class="transfer" (ngSubmit)="confirm()">
        <label>
          Payee
          <select [(ngModel)]="selectedPayee" name="payee">
            @for (p of payees; track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
        </label>
        <label>
          Amount (£)
          <input
            type="number"
            [(ngModel)]="amount"
            name="amount"
            min="0.01"
            step="0.01"
            required
          />
        </label>
        @if (fee !== null) {
          <p>Estimated fee: {{ fee === 0 ? 'Free' : fmt(fee) }}</p>
        }
        <label>
          Reference
          <input type="text" [(ngModel)]="reference" name="reference" />
        </label>
        <button type="submit">Confirm transfer</button>
      </form>
    } @else {
      <p>Transfer of {{ fmt(amount) }} to {{ recipientName }} submitted.</p>
    }
  `,
})
export class TransfersComponent {
  payees = payees
  selectedPayee = payees[0].id
  amount = 0
  reference = ''
  confirmed = false
  fmt = formatMoney

  get fee() {
    return estimateFee(this.amount)
  }

  get recipientName() {
    return this.payees.find((p) => p.id === this.selectedPayee)?.name ?? ''
  }

  confirm() {
    this.confirmed = true
  }
}
