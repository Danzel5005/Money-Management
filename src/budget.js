export const DEFAULT_CATEGORIES = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Lainnya"];

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
