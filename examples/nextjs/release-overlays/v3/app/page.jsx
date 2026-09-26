import { customer, accounts, transactions, formatMoney } from '@compression-dictionaries/demo-content'

export default function Dashboard() {
  const savings = accounts.find((a) => a.name.toLowerCase().includes('savings'))
  const savingsBalance = savings ? savings.balance : 0
  const savingsGoal = 10000

  return (
    <>
      <h1>Good to see you, {customer.firstName}</h1>

      <section className="accounts">
        {accounts.map((a) => (
          <div key={a.id} className="card">
            <h2>{a.name}</h2>
            <p className="balance">{formatMoney(a.balance)}</p>
            <p className="meta">{a.sortCode} &nbsp; {a.number}</p>
          </div>
        ))}
      </section>

      <section className="savings-goal card">
        <h2>Savings goal</h2>
        <p>
          {formatMoney(savingsBalance)} saved towards your {formatMoney(savingsGoal)} goal.
        </p>
        <progress value={savingsBalance} max={savingsGoal} />
      </section>

      <section>
        <h2>Recent transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th className="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.description}</td>
                <td>{t.category}</td>
                <td className={'amount ' + (t.amount < 0 ? 'negative' : 'positive')}>
                  {formatMoney(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
