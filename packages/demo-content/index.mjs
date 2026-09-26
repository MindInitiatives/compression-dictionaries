// Shared data for the demo banking app. Every example imports this, so the
// four implementations render the same app and differ only in framework and
// in how they apply compression dictionaries. All names and figures are fictional.

export const bank = { name: "Demo Bank", currency: "GBP" };

export const customer = { firstName: "Ada" };

export const accounts = [
  { id: "current", name: "Everyday current account", balance: 1842.37, sortCode: "00-00-00", number: "12345678" },
  { id: "savings", name: "Instant access savings", balance: 6250.0, sortCode: "00-00-00", number: "87654321" },
];

export const transactions = [
  { id: "t1", date: "2026-09-22", description: "Grocery shop", amount: -46.12, category: "Groceries" },
  { id: "t2", date: "2026-09-21", description: "Salary", amount: 2450.0, category: "Income" },
  { id: "t3", date: "2026-09-20", description: "Train ticket", amount: -18.4, category: "Transport" },
  { id: "t4", date: "2026-09-19", description: "Coffee", amount: -3.2, category: "Eating out" },
  { id: "t5", date: "2026-09-18", description: "Electricity bill", amount: -72.55, category: "Bills" },
  { id: "t6", date: "2026-09-17", description: "Transfer to savings", amount: -200.0, category: "Transfers" },
];

export const payees = [
  { id: "p1", name: "J. Okafor", sortCode: "00-00-01", number: "11112222" },
  { id: "p2", name: "Landlord Ltd", sortCode: "00-00-02", number: "33334444" },
];

export const products = [
  "Everyday current account", "Fixed-term savings", "Business current account", "Instant access savings",
  "Personal loan", "Travel card", "Salary advance", "Joint account", "Student account",
  "Premium current account", "Cash ISA", "Merchant collections",
].map((name, i) => ({
  id: String(i + 1),
  name,
  rate: (1.5 + i * 0.35).toFixed(2),
  fee: i % 3 === 0 ? "No monthly fee" : `£${3 + i} a month`,
}));

// What each release changes. Every example reproduces these changes with
// real source edits, so the deltas reflect a realistic deploy.
export const releases = {
  v1: "Initial release.",
  v2: "The transfers page shows an estimated fee before the user confirms, and the dashboard greeting changes wording.",
  v3: "The dashboard gains a savings goal card, and product pages update their eligibility text.",
};

export function formatMoney(amount, currency = bank.currency) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}
