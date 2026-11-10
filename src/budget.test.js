import test from "node:test";
import assert from "node:assert/strict";
import { calculateBudget, getDailyAllowance, getMonthlyAllowance, getPeriodDates, getStatus } from "./budget.js";

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
