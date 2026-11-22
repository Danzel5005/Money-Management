export const DEFAULT_CATEGORIES = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Lainnya"];
export const DEFAULT_INCOME_CATEGORIES = ["Gaji", "Bonus", "Lainnya"];

export function getPeriodDates(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0),
    days: new Date(year, month + 1, 0).getDate(),
  };
}

export function getMonthlyAllowance(wallet, date = new Date()) {
  const base = Math.floor(wallet.amount / wallet.periods);
  const remainder = wallet.amount % wallet.periods;
  const start = wallet.startDate ? new Date(`${wallet.startDate}T00:00:00`) : date;
  const lastMonth = new Date(start.getFullYear(), start.getMonth() + wallet.periods - 1, 1);
  return base + (date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth() ? remainder : 0);
}

export function getDailyAllowance(wallet, date = new Date()) {
  if (wallet.mode === "daily") {
    const base = Math.floor(wallet.amount / wallet.periods);
    const start = wallet.startDate ? new Date(`${wallet.startDate}T00:00:00`) : date;
    const lastDay = new Date(start);
    lastDay.setDate(lastDay.getDate() + wallet.periods - 1);
    return base + (toDateKey(date) === toDateKey(lastDay) ? wallet.amount % wallet.periods : 0);
  }
  const monthlyAllowance = getMonthlyAllowance(wallet, date);
  const days = getPeriodDates(date).days;
  return Math.floor(monthlyAllowance / days) + (date.getDate() === days ? monthlyAllowance % days : 0);
}

export function getExpectedExhaustionDate(wallet, remainingPeriods, date = new Date()) {
  const expectedDate = new Date(date);
  if (wallet.mode === "daily") {
    expectedDate.setDate(expectedDate.getDate() + remainingPeriods);
    return expectedDate;
  }

  const day = expectedDate.getDate();
  expectedDate.setDate(1);
  expectedDate.setMonth(expectedDate.getMonth() + remainingPeriods);
  expectedDate.setDate(Math.min(day, getPeriodDates(expectedDate).days));
  return expectedDate;
}

export function calculateBudget(wallet, expenses = [], incomesOrDate = [], dateValue = new Date()) {
  let incomes = expenses.filter((entry) => entry.type === "income");
  let date = dateValue;

  if (Array.isArray(incomesOrDate)) {
    incomes = [...incomes, ...incomesOrDate];
  } else if (incomesOrDate instanceof Date) {
    date = incomesOrDate;
  }

  const expenseEntries = expenses.filter((entry) => entry.type !== "income");
  const totalSpent = expenseEntries.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const effectiveWallet = { ...wallet, amount: wallet.amount + totalIncome };
  const remaining = effectiveWallet.amount - totalSpent;
  const monthlyAllowance = getMonthlyAllowance(wallet, date);
  const dailyAllowance = getDailyAllowance(wallet, date);
  const todayKey = toDateKey(date);
  const monthKey = todayKey.slice(0, 7);
  const spentToday = expenseEntries
    .filter((expense) => expense.date === todayKey)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const spentThisMonth = expenseEntries
    .filter((expense) => expense.date.startsWith(monthKey))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const dailyStatus = getStatus(spentToday, dailyAllowance);
  const monthlyStatus = getStatus(spentThisMonth, monthlyAllowance);
  const periodAllowance = Math.floor(wallet.amount / wallet.periods);
  const remainingPeriods = remaining > 0
    ? periodAllowance > 0 ? Math.ceil(remaining / periodAllowance) : wallet.periods
    : 0;

  return {
    totalSpent,
    totalIncome,
    effectiveAmount: effectiveWallet.amount,
    remaining,
    monthlyAllowance,
    dailyAllowance,
    spentToday,
    spentThisMonth,
    remainingToday: dailyAllowance - spentToday,
    remainingPeriods,
    dailyStatus,
    monthlyStatus,
    status: wallet.mode === "daily" ? dailyStatus : monthlyStatus,
  };
}

export function calculateRemainingDays(balance, dailyAllowance) {
  if (!Number.isFinite(balance) || !Number.isFinite(dailyAllowance) || dailyAllowance <= 0 || balance <= dailyAllowance) return 0;
  return Math.floor(Math.max(balance - dailyAllowance, 0) / dailyAllowance);
}

export function getWalletDailyAllowance(wallet, date = new Date()) {
  return Number.isFinite(wallet.dailyAllowance)
    ? Math.max(0, wallet.dailyAllowance)
    : getDailyAllowance(wallet, date);
}

export function calculateWalletsBudget(wallets, expenses = [], date = new Date()) {
  const balances = wallets.map((wallet) => {
    const transactions = expenses.filter((entry) => entry.walletId === wallet.id);
    return wallet.amount
      + transactions.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0)
      - transactions.filter((entry) => entry.type !== "income").reduce((sum, entry) => sum + entry.amount, 0);
  });
  const dailyAllowance = wallets.reduce((sum, wallet) => sum + getWalletDailyAllowance(wallet, date), 0);
  const totalBalance = balances.reduce((sum, balance) => sum + balance, 0);
  const spentToday = expenses
    .filter((entry) => entry.type !== "income" && entry.date === toDateKey(date))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalSpent = expenses.filter((entry) => entry.type !== "income").reduce((sum, entry) => sum + entry.amount, 0);
  const totalIncome = expenses.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const remainingDays = calculateRemainingDays(totalBalance, dailyAllowance);
  const expectedExhaustionDate = new Date(date);
  expectedExhaustionDate.setDate(expectedExhaustionDate.getDate() + remainingDays);

  return {
    balances,
    totalBalance,
    dailyAllowance,
    spentToday,
    totalSpent,
    totalIncome,
    remainingDays,
    expectedExhaustionDate,
    remainingToday: dailyAllowance - spentToday,
    status: getStatus(spentToday, dailyAllowance),
  };
}

export function migrateLegacyState(saved) {
  if (Array.isArray(saved.wallets)) {
    return {
      ...saved,
      wallets: saved.wallets.map((wallet) => ({ ...wallet, id: wallet.id || crypto.randomUUID() })),
      expenses: (saved.expenses || []).map((entry) => ({
        ...entry,
        type: entry.type === "income" ? "income" : "expense",
        category: entry.type === "income" && entry.category === "Pemasukan" ? "Lainnya" : entry.category,
        walletId: entry.walletId || saved.wallets[0]?.id,
      })),
      categories: {
        expense: saved.categories?.expense || (Array.isArray(saved.categories) ? saved.categories : DEFAULT_CATEGORIES),
        income: saved.categories?.income || DEFAULT_INCOME_CATEGORIES,
      },
    };
  }
  if (!saved.wallet) return null;

  const wallet = {
    ...saved.wallet,
    id: "wallet-default",
    dailyAllowance: Number.isFinite(saved.wallet.dailyAllowance)
      ? saved.wallet.dailyAllowance
      : getDailyAllowance(saved.wallet),
  };
  return {
    ...saved,
    wallet: undefined,
    wallets: [wallet],
    expenses: (saved.expenses || []).map((entry) => ({
      ...entry,
      type: entry.type === "income" ? "income" : "expense",
      category: entry.type === "income" && entry.category === "Pemasukan" ? "Lainnya" : entry.category,
      walletId: wallet.id,
    })),
    categories: {
      expense: Array.isArray(saved.categories) ? saved.categories : DEFAULT_CATEGORIES,
      income: DEFAULT_INCOME_CATEGORIES,
    },
  };
}

export function getStatus(spent, allowance) {
  if (spent > allowance) return "over";
  if (allowance > 0 && spent >= Math.ceil(allowance * 0.8)) return "near";
  return "safe";
}

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatRupiah(amount) {
  return `Rp${Math.abs(amount).toLocaleString("id-ID")}`;
}
