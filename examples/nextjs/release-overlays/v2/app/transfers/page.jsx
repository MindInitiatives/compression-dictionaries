'use client'

import { useState } from 'react'
import { payees, formatMoney } from '@compression-dictionaries/demo-content'

export default function Transfers() {
  const [payee, setPayee] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const numericAmount = parseFloat(amount) || 0
  const fee = numericAmount > 1000 ? 0.25 : 0

  function handleConfirm(e) {
    e.preventDefault()
    if (payee && amount) setConfirmed(true)
  }

  if (confirmed) {
    return (
      <div className="confirmation">
        <h1>Transfer submitted</h1>
        <p>
          {formatMoney(numericAmount)} to {payees.find((p) => p.id === payee)?.name}.
          {fee > 0 && <> Fee: {formatMoney(fee)}.</>}
        </p>
        <button onClick={() => { setConfirmed(false); setPayee(''); setAmount(''); setReference('') }}>
          New transfer
        </button>
      </div>
    )
  }

  return (
    <>
      <h1>New transfer</h1>
      <form onSubmit={handleConfirm}>
        <label>
          Payee
          <select value={payee} onChange={(e) => setPayee(e.target.value)} required>
            <option value="">Select payee</option>
            {payees.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label>
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        {amount && (
          <p className="fee-estimate">
            {fee > 0
              ? `Estimated fee: ${formatMoney(fee)}`
              : 'No fee for this transfer'}
          </p>
        )}

        <label>
          Reference
          <input
            type="text"
            placeholder="Optional"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>

        <button type="submit">Confirm transfer</button>
      </form>
    </>
  )
}
