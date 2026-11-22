import test from "node:test";
import assert from "node:assert/strict";
import { calculateBudget, calculateRemainingDays, calculateWalletsBudget, getDailyAllowance, getExpectedExhaustionDate, getMonthlyAllowance, getPeriodDates, getStatus, migrateLegacyState } from "./budget.js";

test("daily budget keeps the allowance fixed and recalculates remaining coverage", () => {
  const wallet = { amount: 3_000_000, periods: 30, mode: "daily" };
  const expenses = [{ amount: 200_000, date: "2026-11-07" }];
  const result = calculateBudget(wallet, expenses, new Date(2026, 10, 7));

  assert.equal(result.dailyAllowance, 100_000);
  assert.equal(result.remaining, 2_800_000);
  assert.equal(result.remainingPeriods, 28);
  assert.equal(result.status, "over");
});

test("monthly split uses the actual number of days in the month", () => {
  const wallet = { amount: 30_000_000, periods: 3, mode: "monthly" };
  assert.equal(getPeriodDates(new Date(2024, 1, 15)).days, 29);
  const result = calculateBudget(wallet, [], new Date(2026, 10, 7));
  assert.equal(result.dailyAllowance, 333_333);
  assert.equal(result.remainingPeriods, 3);
});

test("status boundaries distinguish near-limit from over-budget", () => {
  assert.equal(getStatus(79, 100), "safe");
  assert.equal(getStatus(80, 100), "near");
  assert.equal(getStatus(101, 100), "over");
});

test("small budgets still include the final rounded remainder period", () => {
  const wallet = { amount: 1, periods: 30, mode: "daily" };
  assert.equal(calculateBudget(wallet, [], new Date(2026, 10, 7)).remainingPeriods, 30);
});

test("income increases the remaining balance and extends coverage without changing the quota", () => {
  const wallet = { amount: 1_000_000, periods: 30, mode: "daily" };
  const entries = [
    { type: "expense", amount: 300_000, date: "2026-11-07" },
    { type: "income", amount: 500_000, date: "2026-11-06" },
  ];
  const result = calculateBudget(wallet, entries, new Date(2026, 10, 7));

  assert.equal(result.totalIncome, 500_000);
  assert.equal(result.totalSpent, 300_000);
  assert.equal(result.remaining, 1_200_000);
  assert.equal(result.dailyAllowance, 33_333);
  assert.equal(result.remainingPeriods, 37);
});

test("daily and monthly rounding remainders land in their final periods", () => {
  const dailyWallet = { amount: 3_000_001, periods: 30, mode: "daily", startDate: "2026-10-09" };
  assert.equal(getDailyAllowance(dailyWallet, new Date(2026, 10, 6)), 100_000);
  assert.equal(getDailyAllowance(dailyWallet, new Date(2026, 10, 7)), 100_001);

  const monthlyWallet = { amount: 30_000_002, periods: 3, mode: "monthly", startDate: "2026-09-07" };
  assert.equal(getMonthlyAllowance(monthlyWallet, new Date(2026, 9, 1)), 10_000_000);
  assert.equal(getMonthlyAllowance(monthlyWallet, new Date(2026, 10, 1)), 10_000_002);
  assert.equal(getDailyAllowance(monthlyWallet, new Date(2026, 10, 29)), 333_333);
  assert.equal(getDailyAllowance(monthlyWallet, new Date(2026, 10, 30)), 333_345);
});

test("expected exhaustion date follows daily periods and clamps monthly dates", () => {
  const dailyWallet = { amount: 3_000_000, periods: 30, mode: "daily" };
  const monthlyWallet = { amount: 3_000_000, periods: 3, mode: "monthly" };

  assert.equal(getExpectedExhaustionDate(dailyWallet, 5, new Date(2026, 10, 7)).toDateString(), new Date(2026, 10, 12).toDateString());
  assert.equal(getExpectedExhaustionDate(monthlyWallet, 1, new Date(2026, 0, 31)).toDateString(), new Date(2026, 1, 28).toDateString());
});

test("remaining days assumes today's allowance is already spent", () => {
  assert.equal(calculateRemainingDays(100_000, 10_000), 9);
});

test("remaining days returns zero for no allowance or balance at or below allowance", () => {
  assert.equal(calculateRemainingDays(100_000, 0), 0);
  assert.equal(calculateRemainingDays(10_000, 10_000), 0);
  assert.equal(calculateRemainingDays(5_000, 10_000), 0);
});

test("legacy migration keeps wallet settings and attaches old transactions", () => {
  const migrated = migrateLegacyState({
    wallet: { name: "Dompet Lama", amount: 1_000_000, periods: 20, mode: "daily", startDate: "2026-01-01" },
    expenses: [
      { id: "transaksi-lama", amount: 25_000, type: "expense", date: "2026-01-02" },
      { id: "transaksi-tanpa-jenis", amount: 5_000, date: "2026-01-03" },
      { id: "pemasukan-lama", amount: 50_000, type: "income", category: "Pemasukan", date: "2026-01-04" },
    ],
    categories: ["Makanan", "Lainnya"],
  });
  assert.equal(migrated.wallets[0].name, "Dompet Lama");
  assert.equal(migrated.wallets[0].dailyAllowance, 50_000);
  assert.equal(migrated.expenses[0].id, "transaksi-lama");
  assert.equal(migrated.expenses[0].walletId, "wallet-default");
  assert.equal(migrated.expenses[1].type, "expense");
  assert.equal(migrated.expenses[2].category, "Lainnya");
  assert.deepEqual(migrated.categories.expense, ["Makanan", "Lainnya"]);
});

test("multiple wallets add balances and daily allowances before estimating remaining days", () => {
  const wallets = [
    { id: "cash", amount: 60_000, dailyAllowance: 10_000 },
    { id: "bank", amount: 40_000, dailyAllowance: 10_000 },
  ];
  const expenses = [
    { walletId: "cash", amount: 15_000, type: "expense", date: "2026-11-07" },
    { walletId: "bank", amount: 5_000, type: "income", date: "2026-11-07" },
  ];
  const result = calculateWalletsBudget(wallets, expenses, new Date(2026, 10, 7));
  assert.equal(result.dailyAllowance, 20_000);
  assert.equal(result.totalBalance, 90_000);
  assert.equal(result.remainingDays, 3);
  assert.equal(result.expectedExhaustionDate.toDateString(), new Date(2026, 10, 10).toDateString());
});
