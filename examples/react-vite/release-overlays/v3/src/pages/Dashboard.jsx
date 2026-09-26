import { accounts, customer, transactions, formatMoney } from '@compression-dictionaries/demo-content'

const SAVINGS_GOAL = 10000

export default function Dashboard() {
  const savings = accounts.find((a) => a.id === 'savings')

  return (
    <>
      <h1>Good to see you, {customer.firstName}</h1>

      <h2>Accounts</h2>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Sort code</th>
            <th>Number</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td>{account.name}</td>
              <td>{account.sortCode}</td>
              <td>{account.number}</td>
              <td>{formatMoney(account.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {savings && (
        <>
          <h2>Savings goal</h2>
          <p>
            You have saved {formatMoney(savings.balance)} towards your goal of{' '}
            {formatMoney(SAVINGS_GOAL)}.{' '}
            {savings.balance >= SAVINGS_GOAL
              ? 'You have reached your goal.'
              : `${formatMoney(SAVINGS_GOAL - savings.balance)} to go.`}
          </p>
        </>
      )}

      <h2>Recent transactions</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.date}</td>
              <td>{tx.description}</td>
              <td>{tx.category}</td>
              <td className={`amount ${tx.amount >= 0 ? 'in' : 'out'}`}>
                {formatMoney(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
