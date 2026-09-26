import { customer, accounts, transactions, formatMoney } from '@compression-dictionaries/demo-content'

export default function Dashboard() {
  return (
    <>
      <h1>Welcome back, {customer.firstName}</h1>

      <section className="accounts">
        {accounts.map((a) => (
          <div key={a.id} className="card">
            <h2>{a.name}</h2>
            <p className="balance">{formatMoney(a.balance)}</p>
            <p className="meta">{a.sortCode} &nbsp; {a.number}</p>
          </div>
        ))}
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
