import { calculateWalletsBudget, DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES, formatRupiah, getStatus, getWalletDailyAllowance, migrateLegacyState, toDateKey } from "./budget.js";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";
import "./style.css";

const STORAGE_KEY = "dompet-jatah-v1";
const app = document.querySelector("#app");
const FinanceExport = registerPlugin("FinanceExport");
const DailyNotifications = registerPlugin("DailyNotifications");
let today = new Date();
const state = loadState();
let activeView = "home";
let calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
let editingExpenseId = null;
let modalType = "";
let editingWalletId = null;
let editingCategoryType = "expense";
let editingCategoryName = null;
let confirmationAction = null;
let reportRange = "month";
let reportFrom = `${toDateKey(today).slice(0, 7)}-01`;
let reportTo = toDateKey(today);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.expenses)) {
      return migrateLegacyState(saved) || { wallets: [], expenses: [], categories: { expense: DEFAULT_CATEGORIES, income: DEFAULT_INCOME_CATEGORIES } };
    }
  } catch (error) {
    console.error("Data Dompet Jatah tidak dapat dibaca.", error);
  }
  return { wallets: [], expenses: [], categories: { expense: DEFAULT_CATEGORIES, income: DEFAULT_INCOME_CATEGORIES } };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    syncNotifications();
  } catch (error) {
    console.error("Data Dompet Jatah tidak dapat disimpan.", error);
    showToast("Penyimpanan gagal. Periksa ruang perangkat.");
  }
}

const labels = {
  safe: ["Aman", "✓"],
  near: ["Hampir habis", "!"],
  over: ["Keluar jatah", "↗"],
};

const rupiah = (value) => `${value < 0 ? "-" : ""}${formatRupiah(value)}`;
const parseCurrencyInput = (value) => Number(String(value ?? "").replace(/\D/g, ""));
const formatCurrencyInput = (value) => {
  const amount = parseCurrencyInput(value);
  return amount ? new Intl.NumberFormat("id-ID").format(amount) : "";
};
const dateLabel = (value, options = { day: "numeric", month: "long", year: "numeric" }) =>
  new Intl.DateTimeFormat("id-ID", options).format(value);
const monthLabel = (value) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(value);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

function icon(name, size = 20) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    chart: '<path d="M4 19V5M4 19h17M8 15l4-4 3 2 5-7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.6 7.6 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a7.6 7.6 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7.8 7.8 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a7.6 7.6 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a7.6 7.6 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7.8 7.8 0 0 1 0 1.8Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 5h.01"/>',
    trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
    edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function statusBadge(status) {
  const [text, symbol] = labels[status];
  return `<span class="status status-${status}"><span aria-hidden="true">${symbol}</span>${text}</span>`;
}

function render() {
  if (!state.wallets.length) {
    renderSetup();
    return;
  }
  const budget = calculateWalletsBudget(state.wallets, state.expenses, today);
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#" aria-label="Dompet Jatah beranda"><span class="brand-mark">${icon("wallet", 21)}</span><span>dompet<span class="brand-soft">jatah</span></span></a>
        <div class="sidebar-label">MENU</div>
        ${navItems("side")}
        <div class="side-spacer"></div>
        <button class="wallet-mini" data-action="settings"><span class="mini-avatar">${icon("wallet", 19)}</span><span><b>${state.wallets.length} dompet</b><small>${rupiah(budget.dailyAllowance)} jatah harian</small></span>${icon("right", 17)}</button>
      </aside>
      <main class="main-content">
        <header class="topbar"><div class="mobile-brand"><span class="brand-mark">${icon("wallet", 18)}</span><span>dompet<span class="brand-soft">jatah</span></span></div><div class="topbar-date">${dateLabel(today, { weekday: "long", day: "numeric", month: "long" })}</div><button class="icon-button settings-button" aria-label="Pengaturan dompet" data-action="settings">${icon("settings")}</button></header>
        <section class="page-content">${renderView(budget)}</section>
      </main>
      <nav class="bottom-nav" aria-label="Navigasi utama">${navItems("bottom")}<button class="bottom-item" data-action="settings">${icon("settings")}<span>Atur</span></button></nav>
      <button class="fab" data-action="add-expense" aria-label="Catat transaksi" title="Catat transaksi">${icon("plus", 24)}</button>
      ${modalType ? renderModal() : ""}
      <div class="toast" role="status" aria-live="polite"></div>
    </div>`;
}

function navItems(place) {
  return [
    ["home", "Beranda"],
    ["calendar", "Kalender"],
    ["reports", "Laporan"],
  ].map(([view, title]) => `<button class="${place === "bottom" ? "bottom-item" : "nav-item"} ${activeView === view ? "active" : ""}" data-view="${view}">${icon(view === "reports" ? "chart" : view)}<span>${title}</span></button>`).join("");
}

function renderSetup() {
  app.innerHTML = `
    <main class="setup-shell">
      <div class="setup-card">
        <a class="brand setup-brand" href="#"><span class="brand-mark">${icon("wallet", 21)}</span><span>dompet<span class="brand-soft">jatah</span></span></a>
        <p class="eyebrow">MULAI DENGAN RENCANA</p>
        <h1>Uangmu, punya<br>arah yang jelas.</h1>
        <p class="setup-copy">Buat Dompet Utama dan tentukan jatah harian agar saldomu terpantau.</p>
        <form id="setup-form" class="form-stack">
          <label>Nama dompet<input name="name" value="Dompet Utama" maxlength="32" required></label>
          <label>Saldo awal<div class="money-input"><span>Rp</span><input name="amount" type="text" inputmode="numeric" data-currency-input placeholder="3.000.000" required></div></label>
          <label>Jatah harian <span class="optional">(opsional)</span><div class="money-input"><span>Rp</span><input name="dailyAllowance" type="text" inputmode="numeric" data-currency-input placeholder="100.000"></div></label>
          <p class="form-error" aria-live="polite"></p>
          <button class="primary-button" type="submit">Buat dompet <span>${icon("arrow", 18)}</span></button>
        </form>
        <p class="privacy-note">${icon("wallet", 15)} Disimpan di perangkatmu, tanpa perlu akun.</p>
      </div>
      <div class="setup-art"><div class="art-halo"></div><div class="art-card art-card-back"><span>JATAH HARIAN</span><b>Rp100.000</b><small>Masih di jalurmu</small></div><div class="art-card art-card-front"><span>SALDO TERSISA</span><b>Rp2.800.000</b><div class="art-progress"><i></i></div><small>${icon("chart", 14)} Cukup untuk 28 hari lagi</small></div><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-dot"></div></div>
    </main>`;
}

function renderView(budget) {
  if (activeView === "calendar") return renderCalendar(budget);
  if (activeView === "reports") return renderReports(budget);
  return renderHome(budget);
}

function renderHome(budget) {
  const recentExpenses = state.expenses.filter((item) => item.type !== "income").sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4);
  const recentIncome = state.expenses.filter((item) => item.type === "income").sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4);
  const spentPercent = budget.totalSpent / Math.max(budget.totalBalance + budget.totalSpent - budget.totalIncome, 1);
  const future = budget.expectedExhaustionDate;
  const fill = budget.dailyAllowance > 0 ? Math.min(100, Math.round(budget.spentToday / budget.dailyAllowance * 100)) : 0;
  const currentRemaining = budget.remainingToday;
  const originalBalance = state.wallets.reduce((sum, wallet) => sum + wallet.amount, 0) + budget.totalIncome;

  return `<div class="page-heading"><div><p class="eyebrow">RINGKASAN DOMPET</p><h1>Halo, tetap di jalur.</h1><p class="muted">Setiap keputusan kecil bikin uangmu bertahan lebih lama.</p></div><div class="page-heading-actions"><button class="text-button" data-action="settings">${icon("edit", 16)} Atur dompet</button></div></div>
    ${budget.status === "over" ? `<div class="alert alert-over"><span class="alert-icon">!</span><p><b>Kamu keluar jatah.</b> Uangmu sekarang cukup untuk sekitar ${budget.remainingDays} hari lagi.</p></div>` : ""}
    <div class="dashboard-grid">
      <section class="card balance-card"><div class="card-topline"><span class="card-label">SALDO TOTAL</span><span class="balance-icon">${icon("wallet", 18)}</span></div><div class="balance-value">${rupiah(budget.totalBalance)}</div><div class="balance-meta"><span class="positive-dot"></span>${budget.remainingDays ? `Cukup sekitar <b>${budget.remainingDays} hari lagi</b>` : "Jatah harian sudah terpakai"}</div><div class="balance-divider"></div><div class="balance-foot"><span>Dari ${rupiah(originalBalance)}</span><span>Perkiraan habis ${dateLabel(future, { day: "numeric", month: "short", year: "numeric" })}</span></div><div class="balance-progress"><i style="width:${Math.max(0, 100 - spentPercent * 100)}%"></i></div></section>
      <section class="card quota-card"><div class="card-topline"><span class="card-label">JATAH HARI INI</span>${statusBadge(budget.status)}</div><div class="quota-value">${rupiah(budget.dailyAllowance)}<small> / hari</small></div><div class="quota-spent"><span>Terpakai ${rupiah(budget.spentToday)}</span><b>${fill}%</b></div><div class="quota-track"><i class="fill-${budget.status}" style="width:${fill}%"></i></div><div class="quota-foot"><span>${currentRemaining >= 0 ? `Sisa ${rupiah(currentRemaining)}` : `Melebihi ${rupiah(Math.abs(currentRemaining))}`}</span><span>${dateLabel(today, { day: "numeric", month: "short" })}</span></div></section>
      <section class="card overview-card"><div class="section-title"><h2>Ringkasan dompet</h2><span class="period-chip">${state.wallets.length} dompet</span></div><div class="overview-row"><span>Total pengeluaran</span><b>${rupiah(budget.totalSpent)}</b></div><div class="overview-row"><span>Total pemasukan</span><b>${rupiah(budget.totalIncome)}</b></div><div class="overview-row"><span>Jatah harian total</span><b>${rupiah(budget.dailyAllowance)}</b></div><div class="overview-row"><span>Kondisi hari ini</span>${statusBadge(budget.status)}</div></section>
      <section class="card recent-card"><div class="section-title"><h2>Pengeluaran terbaru</h2><button class="link-button" data-view="reports">Lihat semua ${icon("arrow", 15)}</button></div>${recentExpenses.length ? `<div class="expense-list compact-list">${recentExpenses.map(expenseRow).join("")}</div>` : `<div class="empty-inline"><span class="empty-icon">${icon("wallet", 21)}</span><div><b>Belum ada pengeluaran</b><small>Catat yang pertama, biar jatahmu terpantau.</small></div></div>`}</section>
      <section class="card recent-card"><div class="section-title"><h2>Pemasukan terbaru</h2><button class="link-button" data-view="reports">Lihat semua ${icon("arrow", 15)}</button></div>${recentIncome.length ? `<div class="expense-list compact-list">${recentIncome.map(expenseRow).join("")}</div>` : `<div class="empty-inline"><span class="empty-icon">${icon("wallet", 21)}</span><div><b>Belum ada pemasukan</b><small>Pemasukan yang kamu catat akan tampil di sini.</small></div></div>`}</section>
    </div>`;
}

function expenseRow(expense) {
  const date = new Date(`${expense.date}T${expense.time || "12:00"}`);
  const wallet = state.wallets.find((item) => item.id === expense.walletId);
  const initial = escapeHTML((expense.category || "L").slice(0, 1).toUpperCase());
  const isIncome = expense.type === "income";
  return `<article class="expense-row"><span class="category-mark category-${escapeHTML(expense.category)}">${initial}</span><span class="expense-info"><b>${escapeHTML(expense.category)}</b><small>${escapeHTML(expense.note || dateLabel(date, { day: "numeric", month: "short" }))} · ${escapeHTML(wallet?.name || "Dompet")}</small></span><b class="expense-amount ${isIncome ? "income-amount" : ""}">${isIncome ? "+" : "-"}${rupiah(expense.amount)}</b><button class="row-edit" data-edit="${expense.id}" aria-label="Edit transaksi">${icon("edit", 15)}</button></article>`;
}

function renderCalendar(budget) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const selectedKey = state.selectedDate || toDateKey(today);
  const todayKey = toDateKey(today);
  const expectedEndKey = toDateKey(budget.expectedExhaustionDate);
  const week = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const cells = [];
  for (let blank = 0; blank < firstDay; blank += 1) cells.push('<span class="calendar-blank"></span>');
  for (let day = 1; day <= days; day += 1) {
    const key = `${monthKey}-${String(day).padStart(2, "0")}`;
    const expenses = state.expenses.filter((item) => item.type !== "income" && item.date === key);
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const dailyCap = state.wallets.reduce((sum, wallet) => sum + getWalletDailyAllowance(wallet, new Date(year, month, day)), 0);
    const status = getStatus(total, dailyCap);
    const isToday = key === toDateKey(today);
    const isSelected = key === selectedKey;
    const inBalancePeriod = budget.remaining > 0 && key >= todayKey && key <= expectedEndKey;
    cells.push(`<button class="calendar-day ${expenses.length ? `day-${status}` : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""} ${key > todayKey ? "is-future" : ""} ${inBalancePeriod ? "is-balance-period" : ""}" data-date="${key}" aria-label="${day} ${monthLabel(calendarDate)}${expenses.length ? `, ${rupiah(total)}` : ""}${inBalancePeriod ? ", periode saldo bertahan" : ""}" aria-pressed="${isSelected}">${day}${expenses.length ? `<i></i>` : ""}</button>`);
  }
  const selectedExpenses = state.expenses.filter((item) => item.type !== "income" && item.date === selectedKey).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const selectedTotal = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return `<div class="page-heading"><div><p class="eyebrow">JEJAK PENGELUARAN</p><h1>Kalender</h1><p class="muted">Lihat status belanja dan perkiraan periode saldo bertahan.</p></div></div>
    <div class="calendar-layout"><section class="card calendar-card"><div class="calendar-head"><button class="icon-button" data-action="prev-month" aria-label="Bulan sebelumnya">${icon("left")}</button><h2>${monthLabel(calendarDate)}</h2><button class="icon-button" data-action="next-month" aria-label="Bulan berikutnya">${icon("right")}</button></div><div class="calendar-grid calendar-weekdays">${week.map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div><div class="calendar-legend"><span><i class="legend-safe"></i>Aman</span><span><i class="legend-near"></i>Hampir habis</span><span><i class="legend-over"></i>Keluar jatah</span><span><i class="legend-balance-period"></i>Periode saldo bertahan</span></div></section>
      <section class="card selected-day-card"><p class="eyebrow">RINCIAN HARI</p><h2>${dateLabel(new Date(`${selectedKey}T12:00:00`), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2><div class="selected-total"><span>Total pengeluaran</span><b>${rupiah(selectedTotal)}</b></div>${selectedExpenses.length ? `<div class="expense-list">${selectedExpenses.map(expenseRow).join("")}</div>` : `<div class="empty-inline"><span class="empty-icon">${icon("calendar", 20)}</span><div><b>Belum ada catatan</b><small>Hari ini masih jadi kesempatan baru.</small></div></div>`}</section>
    </div>`;
}

function renderReports(budget) {
  const monthKey = toDateKey(today).slice(0, 7);
  const expenseEntries = state.expenses.filter((expense) => expense.type !== "income");
  const monthExpenses = expenseEntries.filter((expense) => expense.date.startsWith(monthKey));
  const monthIncome = state.expenses.filter((entry) => entry.type === "income" && entry.date.startsWith(monthKey)).reduce((sum, entry) => sum + entry.amount, 0);
  const yearExpenses = expenseEntries.filter((expense) => expense.date.startsWith(String(today.getFullYear())));
  const categories = state.categories.expense.map((category) => ({
    category,
    total: monthExpenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
  })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const maxCategory = Math.max(1, ...categories.map((item) => item.total));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 6 + index);
    const key = toDateKey(date);
    return { date, total: expenseEntries.filter((expense) => expense.date === key).reduce((sum, expense) => sum + expense.amount, 0) };
  });
  const maxDay = Math.max(1, ...weekDays.map((day) => day.total));

  return `<div class="page-heading"><div><p class="eyebrow">KENALI POLA BELANJAMU</p><h1>Laporan</h1><p class="muted">Ringkasan pengeluaran yang bantu kamu ambil kendali.</p></div></div>
    <div class="report-stats"><section class="card stat-card"><span>Hari ini</span><b>${rupiah(budget.spentToday)}</b><small>${dateLabel(today, { day: "numeric", month: "long" })}</small></section><section class="card stat-card"><span>Bulan ini</span><b>${rupiah(budget.spentThisMonth)}</b><small>${monthLabel(today)}</small></section><section class="card stat-card"><span>Tahun ini</span><b>${rupiah(yearExpenses.reduce((sum, item) => sum + item.amount, 0))}</b><small>${today.getFullYear()}</small></section><section class="card stat-card"><span>Pemasukan</span><b>${rupiah(monthIncome)}</b><small>${monthLabel(today)}</small></section></div>
    <div class="report-grid"><section class="card chart-card"><div class="section-title"><div><h2>Pengeluaran mingguan</h2><p class="muted">7 hari terakhir</p></div><span class="chart-total">${rupiah(weekDays.reduce((sum, day) => sum + day.total, 0))}</span></div><div class="bar-chart">${weekDays.map(({ date, total }) => `<div class="bar-column"><div class="bar-rail"><i style="height:${total ? Math.max(6, total / maxDay * 100) : 0}%"></i></div><span>${new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date)}</span></div>`).join("")}</div></section>
    <section class="card chart-card category-card"><div class="section-title"><div><h2>Per kategori</h2><p class="muted">${monthLabel(today)}</p></div></div>${categories.length ? `<div class="category-list">${categories.map(({ category, total }) => `<div class="category-item"><div><span>${escapeHTML(category)}</span><b>${rupiah(total)}</b></div><div class="category-track"><i style="width:${total / maxCategory * 100}%"></i></div></div>`).join("")}</div>` : `<div class="empty-inline"><span class="empty-icon">${icon("chart", 20)}</span><div><b>Belum ada data bulan ini</b><small>Ringkasan kategori muncul setelah kamu mencatat.</small></div></div>`}</section></div>
    <section class="card all-expenses"><div class="section-title"><div><h2>Ekspor laporan PDF</h2><p class="muted">Pilih rentang tanggal laporan.</p></div></div><div class="report-filter"><label>Rentang<select name="reportRange"><option value="month" ${reportRange === "month" ? "selected" : ""}>Bulan ini</option><option value="custom" ${reportRange === "custom" ? "selected" : ""}>Tanggal khusus</option></select></label>${reportRange === "custom" ? `<label>Dari<input type="date" name="reportFrom" value="${reportFrom}"></label><label>Sampai<input type="date" name="reportTo" value="${reportTo}"></label>` : ""}<button class="primary-button" type="button" data-action="export-pdf">Ekspor PDF</button></div></section>
    <section class="card all-expenses"><div class="section-title"><h2>Semua transaksi</h2><span class="period-chip">${state.expenses.length} catatan</span></div>${state.expenses.length ? `<div class="expense-list">${[...state.expenses].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(expenseRow).join("")}</div>` : `<div class="empty-inline"><span class="empty-icon">${icon("wallet", 20)}</span><div><b>Belum ada transaksi</b><small>Catatanmu akan tampil di sini.</small></div></div>`}</section>`;
}

function modalShell(title, eyebrow, content) {
  return `<div class="modal-backdrop" data-action="close-modal"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><p class="eyebrow">${eyebrow}</p><h2 id="modal-title">${title}</h2></div><button class="icon-button" data-action="close-modal" aria-label="Tutup">${icon("close")}</button></div>${content}</section></div>`;
}

function renderTransactionModal() {
  const expense = editingExpenseId ? state.expenses.find((item) => item.id === editingExpenseId) : null;
  const entryType = expense?.type || "expense";
  const categoryOptions = state.categories[entryType] || [];
  const content = `<form id="expense-form" class="form-stack"><label>Jenis transaksi<select name="entryType"><option value="expense" ${entryType === "expense" ? "selected" : ""}>Pengeluaran</option><option value="income" ${entryType === "income" ? "selected" : ""}>Pemasukan</option></select></label><label>Dompet<select name="walletId" required>${state.wallets.map((wallet) => `<option value="${wallet.id}" ${(expense?.walletId || state.wallets[0].id) === wallet.id ? "selected" : ""}>${escapeHTML(wallet.name)}</option>`).join("")}</select></label><label>Nominal<div class="money-input"><span>Rp</span><input name="amount" type="text" inputmode="numeric" data-currency-input value="${formatCurrencyInput(expense?.amount ?? "")}" placeholder="10.000" required autofocus></div></label><label>Kategori<select name="category">${categoryOptions.map((category) => `<option value="${escapeHTML(category)}" ${expense?.category === category ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}</select></label><label>Catatan <span class="optional">(opsional)</span><input name="note" maxlength="80" value="${escapeHTML(expense?.note || "")}" placeholder="Contoh: makan siang"></label><p class="form-error" aria-live="polite"></p><div class="modal-actions">${expense ? `<button class="danger-button" type="button" data-action="delete-expense" data-id="${expense.id}">${icon("trash", 17)} Hapus</button>` : ""}<button class="primary-button" type="submit">${expense ? "Simpan perubahan" : "Simpan transaksi"}</button></div></form>`;
  return modalShell(expense ? "Edit transaksi" : "Catat transaksi", "TRANSAKSI", content);
}

function renderSettings() {
  modalType = "wallets";
  render();
}

function renderWalletsModal() {
  const rows = state.wallets.map((wallet) => `<div class="manage-row"><span><b>${escapeHTML(wallet.name)}</b><small>Saldo awal ${rupiah(wallet.amount)} · Jatah ${rupiah(getWalletDailyAllowance(wallet, today))}/hari</small></span><button class="row-edit" data-action="edit-wallet" data-id="${wallet.id}" aria-label="Ubah dompet">${icon("edit", 15)}</button><button class="row-edit" data-action="delete-wallet" data-id="${wallet.id}" aria-label="Hapus dompet">${icon("trash", 15)}</button></div>`).join("");
  return modalShell("Atur dompet", "DOMPET", `<div class="manage-list">${rows}</div><div class="modal-actions"><button class="outline-button" type="button" data-action="add-wallet">Tambah dompet</button><button class="primary-button" type="button" data-action="manage-categories">Atur kategori</button></div><button class="outline-button calendar-reminder-button" type="button" data-action="calendar-reminder">${icon("calendar", 17)} Perbarui pengingat kalender</button>${Capacitor.isNativePlatform() ? '<button class="outline-button" type="button" data-action="request-notifications">Atur izin notifikasi</button>' : ""}`);
}

function renderWalletForm() {
  const wallet = state.wallets.find((item) => item.id === editingWalletId);
  return modalShell(wallet ? "Ubah dompet" : "Dompet baru", "DOMPET", `<form id="wallet-form" class="form-stack"><label>Nama dompet<input name="name" maxlength="32" value="${escapeHTML(wallet?.name || "")}" required></label><label>Saldo awal<div class="money-input"><span>Rp</span><input name="amount" type="text" inputmode="numeric" data-currency-input value="${formatCurrencyInput(wallet?.amount ?? "")}" required></div></label><label>Jatah harian <span class="optional">(opsional)</span><div class="money-input"><span>Rp</span><input name="dailyAllowance" type="text" inputmode="numeric" data-currency-input value="${formatCurrencyInput(wallet?.dailyAllowance ?? "")}"></div></label><p class="form-error" aria-live="polite"></p><div class="modal-actions"><button class="outline-button" type="button" data-action="cancel-wallet-form">Batal</button><button class="primary-button" type="submit">Simpan dompet</button></div></form>`);
}

function renderCategoriesModal() {
  const categories = state.categories[editingCategoryType];
  const rows = categories.map((name) => `<div class="manage-row"><span><b>${escapeHTML(name)}</b></span><button class="row-edit" data-action="edit-category" data-name="${escapeHTML(name)}" aria-label="Ubah kategori">${icon("edit", 15)}</button><button class="row-edit" data-action="delete-category" data-name="${escapeHTML(name)}" aria-label="Hapus kategori">${icon("trash", 15)}</button></div>`).join("");
  return modalShell("Atur kategori", "KATEGORI", `<label class="category-type">Jenis kategori<select name="categoryType"><option value="expense" ${editingCategoryType === "expense" ? "selected" : ""}>Pengeluaran</option><option value="income" ${editingCategoryType === "income" ? "selected" : ""}>Pemasukan</option></select></label><div class="manage-list">${rows}</div><div class="modal-actions"><button class="outline-button" type="button" data-action="back-wallets">Kembali</button><button class="primary-button" type="button" data-action="add-category">Tambah kategori</button></div>`);
}

function renderCategoryForm() {
  return modalShell(editingCategoryName ? "Ubah kategori" : "Kategori baru", "KATEGORI", `<form id="category-form" class="form-stack"><label>Nama kategori<input name="name" maxlength="32" value="${escapeHTML(editingCategoryName || "")}" required></label><p class="form-error" aria-live="polite"></p><div class="modal-actions"><button class="outline-button" type="button" data-action="back-categories">Batal</button><button class="primary-button" type="submit">Simpan kategori</button></div></form>`);
}

function renderConfirmation() {
  const confirmation = confirmationAction;
  return modalShell(confirmation.title, "KONFIRMASI", `<p class="settings-note">${escapeHTML(confirmation.message)}</p><div class="modal-actions"><button class="outline-button" type="button" data-action="close-modal">Batal</button><button class="${confirmation.danger ? "danger-button" : "primary-button"}" type="button" data-action="confirm">${escapeHTML(confirmation.confirmLabel || "Konfirmasi")}</button></div>`);
}

function renderModal() {
  if (modalType === "transaction") return renderTransactionModal();
  if (modalType === "wallets") return renderWalletsModal();
  if (modalType === "wallet-form") return renderWalletForm();
  if (modalType === "categories") return renderCategoriesModal();
  if (modalType === "category-form") return renderCategoryForm();
  if (modalType === "confirmation") return renderConfirmation();
  return "";
}

function askConfirmation({ title, message, action, payload = {}, danger = false, confirmLabel }) {
  confirmationAction = { title, message, action, payload, danger, confirmLabel };
  modalType = "confirmation";
  render();
}

function showToast(message) {
  const toast = app.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2800);
}

function openExpense(id = null, entryType = "expense") {
  const current = new Date();
  if (toDateKey(current) !== toDateKey(today)) {
    calendarDate = new Date(current.getFullYear(), current.getMonth(), 1);
  }
  today = current;
  editingExpenseId = id;
  modalType = "transaction";
  render();
}

async function createCalendarReminder() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { result } = await CapacitorCalendar.requestFullCalendarAccess();
      if (result !== "granted") {
        showToast("Izin kalender belum diberikan.");
        return;
      }
    }

    const budget = calculateWalletsBudget(state.wallets, state.expenses, today);
    const startDate = new Date(budget.expectedExhaustionDate);
    startDate.setHours(20, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    const title = "Hari terakhir jatah habis";
    const reminderDate = dateLabel(startDate, { day: "2-digit", month: "short", year: "numeric" });
    const description = `Saldo saat ini: ${rupiah(budget.totalBalance)}\nJatah harian: ${rupiah(budget.dailyAllowance)}\nPerkiraan habis: ${reminderDate}\nKurangi pengeluaran harian atau tambah pemasukan sebelum tanggal ini.`;
    if (Capacitor.isNativePlatform()) {
      const from = new Date();
      const to = new Date(from);
      to.setFullYear(to.getFullYear() + 10);
      const { result: events } = await CapacitorCalendar.listEventsInRange({ from: from.getTime(), to: to.getTime() });
      const matches = events.filter((event) => event.title === title);
      const existing = matches[0];
      if (existing) {
        await CapacitorCalendar.modifyEvent({
          id: existing.id,
          calendarId: existing.calendarId || undefined,
          title,
          description,
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
        });
        for (const duplicate of matches.slice(1)) await CapacitorCalendar.deleteEvent({ id: duplicate.id, calendarId: duplicate.calendarId || undefined });
      } else {
        await CapacitorCalendar.createEvent({
          title,
          description,
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
        });
      }
      showToast(existing ? "Pengingat kalender diperbarui." : "Pengingat kalender dibuat.");
    } else {
      await CapacitorCalendar.createEvent({ title, description, startDate: startDate.getTime(), endDate: endDate.getTime(), autoDownloadIcsFile: true });
      showToast("Berkas pengingat kalender disiapkan.");
    }
  } catch (error) {
    console.error("Pengingat kalender tidak dapat dibuat.", error);
    showToast("Kalender tidak dapat dibuka.");
  }
}

function syncNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  const budget = calculateWalletsBudget(state.wallets, state.expenses, new Date());
  DailyNotifications.updateSnapshot({
    allowance: budget.dailyAllowance,
    spentToday: budget.spentToday,
    dateKey: toDateKey(new Date()),
    enabled: state.wallets.length > 0,
  }).catch((error) => console.error("Jadwal notifikasi tidak dapat diperbarui.", error));
}

function reportEntries() {
  const start = reportRange === "month" ? `${toDateKey(today).slice(0, 7)}-01` : reportFrom;
  const end = reportRange === "month" ? toDateKey(today) : reportTo;
  return state.expenses.filter((entry) => entry.date >= start && entry.date <= end);
}

function exportReportPdf() {
  const entries = reportEntries();
  const rows = entries.map((entry) => ({
    type: entry.type === "income" ? "Pemasukan" : "Pengeluaran",
    date: dateLabel(new Date(`${entry.date}T12:00:00`), { day: "2-digit", month: "short", year: "numeric" }),
    category: entry.category,
    wallet: state.wallets.find((wallet) => wallet.id === entry.walletId)?.name || "Dompet",
    note: entry.note || "-",
    amount: formatRupiah(entry.amount),
  }));
  const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = entries.filter((entry) => entry.type !== "income").reduce((sum, entry) => sum + entry.amount, 0);
  const from = reportRange === "month" ? `${toDateKey(today).slice(0, 7)}-01` : reportFrom;
  const to = reportRange === "month" ? toDateKey(today) : reportTo;
  const report = { rows, from, to, totalIncome: formatRupiah(income), totalExpense: formatRupiah(expense), difference: rupiah(income - expense) };
  if (Capacitor.isNativePlatform()) {
    FinanceExport.exportPdf({ report }).catch((error) => {
      console.error("Laporan PDF tidak dapat dibagikan.", error);
      showToast("Laporan PDF tidak dapat dibuat.");
    });
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Izinkan pop-up untuk menyiapkan PDF.");
    return;
  }
  printWindow.document.write(buildPrintableReport(report));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function buildPrintableReport(report) {
  const table = (type) => report.rows.filter((row) => row.type === type).map((row) => `<tr><td>${escapeHTML(row.date)}</td><td>${escapeHTML(row.category)}</td><td>${escapeHTML(row.wallet)}</td><td>${escapeHTML(row.note)}</td><td>${escapeHTML(row.amount)}</td></tr>`).join("");
  return `<!doctype html><html lang="id"><meta charset="utf-8"><title>Laporan keuangan</title><style>body{font:12px Arial,sans-serif;color:#222}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin:12px 0 24px}th,td{border:1px solid #bbb;padding:6px;text-align:left}th:last-child,td:last-child{text-align:right}.totals{margin-top:24px;text-align:right}</style><h1>Laporan keuangan</h1><p>${escapeHTML(report.from)} – ${escapeHTML(report.to)}</p><h2>Pemasukan</h2><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Dompet</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>${table("Pemasukan")}</tbody></table><h2>Pengeluaran</h2><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Dompet</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>${table("Pengeluaran")}</tbody></table><div class="totals">Total pemasukan: ${report.totalIncome}<br>Total pengeluaran: ${report.totalExpense}<br>Selisih: ${report.difference}</div></html>`;
}

function refreshToday() {
  const current = new Date();
  if (toDateKey(current) !== toDateKey(today)) {
    today = current;
    calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    syncNotifications();
    render();
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshToday();
});
window.addEventListener("focus", () => {
  refreshToday();
  syncNotifications();
});
setInterval(refreshToday, 60_000);

app.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-action]");
  if (!target) return;
  if (target.dataset.view) {
    activeView = target.dataset.view;
    render();
  } else if (target.dataset.edit) {
    openExpense(target.dataset.edit);
  } else if (target.dataset.date) {
    state.selectedDate = target.dataset.date;
    render();
  } else if (target.dataset.action === "add-expense") {
    openExpense();
  } else if (target.dataset.action === "calendar-reminder") {
    createCalendarReminder();
  } else if (target.dataset.action === "settings") {
    renderSettings();
  } else if (target.dataset.action === "close-modal") {
    if (event.target === target || target.closest(".icon-button") || target.type === "button") {
      modalType = "";
      editingExpenseId = null;
      confirmationAction = null;
      render();
    }
  } else if (target.dataset.action === "delete-expense") {
    askConfirmation({ title: "Hapus transaksi?", message: "Transaksi ini akan dihapus permanen.", action: "delete-expense", payload: { id: target.dataset.id }, danger: true, confirmLabel: "Hapus" });
  } else if (target.dataset.action === "delete-wallet") {
    const wallet = state.wallets.find((item) => item.id === target.dataset.id);
    if (wallet && state.wallets.length === 1 && (wallet.amount > 0 || state.expenses.some((entry) => entry.walletId === wallet.id))) {
      showToast("Tambahkan dompet lain dan pindahkan saldo/transaksi sebelum menghapus dompet terakhir.");
      return;
    }
    if (wallet) askConfirmation({
      title: "Hapus dompet?",
      message: state.wallets.length > 1
        ? `Saldo awal dan transaksi dari ${wallet.name} akan dipindahkan ke dompet lain agar catatan tidak hilang.`
        : "Dompet kosong ini akan dihapus.",
      action: "delete-wallet",
      payload: { id: wallet.id },
      danger: true,
      confirmLabel: "Hapus dompet",
    });
  } else if (target.dataset.action === "confirm") {
    const confirmation = confirmationAction;
    if (!confirmation) return;
    confirmationAction = null;
    modalType = "wallets";
    if (confirmation.action === "delete-expense") {
      state.expenses = state.expenses.filter((expense) => expense.id !== confirmation.payload.id);
      modalType = "";
      editingExpenseId = null;
      saveState();
      render();
      showToast("Transaksi dihapus.");
    } else if (confirmation.action === "delete-wallet") {
      const walletIndex = state.wallets.findIndex((wallet) => wallet.id === confirmation.payload.id);
      if (walletIndex < 0) return;
      const [wallet] = state.wallets.splice(walletIndex, 1);
      const destination = state.wallets[0];
      if (destination) {
        destination.amount += wallet.amount;
        destination.dailyAllowance = getWalletDailyAllowance(destination, today) + getWalletDailyAllowance(wallet, today);
        state.expenses = state.expenses.map((entry) => entry.walletId === wallet.id ? { ...entry, walletId: destination.id } : entry);
      } else if (state.expenses.some((entry) => entry.walletId === wallet.id) || wallet.amount > 0) {
        state.wallets.push(wallet);
        modalType = "wallets";
        render();
        showToast("Dompet terakhir memiliki saldo atau transaksi. Tambahkan dompet lain sebelum menghapusnya.");
        return;
      }
      saveState();
      render();
      showToast("Dompet dihapus. Saldo dan transaksi tetap tersimpan.");
    } else if (confirmation.action === "delete-category") {
      const { name, type } = confirmation.payload;
      if (name === "Lainnya") {
        showToast("Kategori Lainnya tidak dapat dihapus.");
        return;
      }
      const used = state.expenses.some((entry) => entry.type === type && entry.category === name);
      if (used && !state.categories[type].includes("Lainnya")) state.categories[type].push("Lainnya");
      if (used) {
        state.expenses = state.expenses.map((entry) => entry.type === type && entry.category === name ? { ...entry, category: "Lainnya" } : entry);
      }
      state.categories[type] = state.categories[type].filter((category) => category !== name);
      saveState();
      modalType = "categories";
      render();
      showToast(used ? "Transaksi dipindahkan ke Lainnya." : "Kategori dihapus.");
    }
  } else if (target.dataset.action === "add-wallet") {
    editingWalletId = null;
    modalType = "wallet-form";
    render();
  } else if (target.dataset.action === "edit-wallet") {
    editingWalletId = target.dataset.id;
    modalType = "wallet-form";
    render();
  } else if (target.dataset.action === "cancel-wallet-form") {
    modalType = "wallets";
    render();
  } else if (target.dataset.action === "manage-categories") {
    editingCategoryType = "expense";
    modalType = "categories";
    render();
  } else if (target.dataset.action === "back-wallets") {
    modalType = "wallets";
    render();
  } else if (target.dataset.action === "add-category") {
    editingCategoryName = null;
    modalType = "category-form";
    render();
  } else if (target.dataset.action === "edit-category") {
    editingCategoryName = target.dataset.name;
    modalType = "category-form";
    render();
  } else if (target.dataset.action === "back-categories") {
    modalType = "categories";
    render();
  } else if (target.dataset.action === "delete-category") {
    const name = target.dataset.name;
    const used = state.expenses.some((entry) => entry.type === editingCategoryType && entry.category === name);
    askConfirmation({
      title: "Hapus kategori?",
      message: used ? `Kategori ini dipakai transaksi. Transaksinya akan dipindahkan ke Lainnya.` : `Kategori ${name} akan dihapus.`,
      action: "delete-category",
      payload: { name, type: editingCategoryType },
      danger: true,
      confirmLabel: used ? "Pindahkan dan hapus" : "Hapus",
    });
  } else if (target.dataset.action === "export-pdf") {
    exportReportPdf();
  } else if (target.dataset.action === "request-notifications") {
    DailyNotifications.requestPermissions().then((result) => {
      showToast(!result.notificationsAllowed
        ? "Izin notifikasi belum diberikan."
        : result.exactAlarmAllowed ? "Izin notifikasi dan alarm aktif." : "Aktifkan alarm tepat pada pengaturan Android.");
    }).catch((error) => {
      console.error("Izin notifikasi tidak dapat diminta.", error);
      showToast("Pengaturan notifikasi tidak dapat dibuka.");
    });
  } else if (target.dataset.action === "prev-month" || target.dataset.action === "next-month") {
    calendarDate.setMonth(calendarDate.getMonth() + (target.dataset.action === "next-month" ? 1 : -1));
    render();
  }
});

app.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.id === "setup-form") {
    const amount = parseCurrencyInput(data.get("amount"));
    const dailyAllowance = parseCurrencyInput(data.get("dailyAllowance"));
    if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(dailyAllowance) || dailyAllowance < 0) {
      form.querySelector(".form-error").textContent = "Masukkan saldo awal lebih dari Rp0 dan jatah harian yang valid.";
      return;
    }
    state.wallets = [{ id: crypto.randomUUID(), name: data.get("name").trim() || "Dompet Utama", amount, dailyAllowance, startDate: toDateKey(today) }];
    saveState();
    render();
    if (Capacitor.isNativePlatform()) DailyNotifications.requestPermissions().catch((error) => console.error("Izin notifikasi tidak dapat diminta.", error));
    return;
  }
  if (form.id === "expense-form") {
    const amount = parseCurrencyInput(data.get("amount"));
    const entryType = data.get("entryType") === "income" ? "income" : "expense";
    const error = form.querySelector(".form-error");
    const previous = editingExpenseId && state.expenses.find((expense) => expense.id === editingExpenseId);
    const walletId = data.get("walletId");
    const category = data.get("category");
    if (!Number.isSafeInteger(amount) || amount <= 0 || !state.wallets.some((wallet) => wallet.id === walletId) || !state.categories[entryType].includes(category)) {
      error.textContent = "Periksa nominal, dompet, dan kategori transaksi.";
      return;
    }
    const recordedAt = new Date();
    const date = previous?.date || toDateKey(recordedAt);
    const time = previous?.time || recordedAt.toTimeString().slice(0, 5);
    const expense = {
      id: previous?.id || crypto.randomUUID(),
      type: entryType,
      walletId,
      amount,
      category,
      note: data.get("note").trim(),
      date,
      time,
      timestamp: previous?.timestamp || `${date}T${time}:00`,
    };
    state.expenses = previous
      ? state.expenses.map((item) => item.id === previous.id ? expense : item)
      : [...state.expenses, expense];
    saveState();
    modalType = "";
    editingExpenseId = null;
    activeView = activeView === "calendar" ? "calendar" : "home";
    render();
    showToast(entryType === "income" ? "Pemasukan tersimpan dan menambah saldo." : "Pengeluaran tersimpan.");
    return;
  }
  if (form.id === "wallet-form") {
    const amount = parseCurrencyInput(data.get("amount"));
    const dailyAllowance = parseCurrencyInput(data.get("dailyAllowance"));
    if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(dailyAllowance) || dailyAllowance < 0) {
      form.querySelector(".form-error")?.replaceChildren("Masukkan saldo dan jatah harian yang valid.");
      return;
    }
    const old = state.wallets.find((wallet) => wallet.id === editingWalletId);
    const wallet = {
      id: old?.id || crypto.randomUUID(),
      name: data.get("name").trim() || "Dompet Utama",
      amount,
      dailyAllowance,
      startDate: old?.startDate || toDateKey(today),
    };
    state.wallets = old ? state.wallets.map((item) => item.id === old.id ? wallet : item) : [...state.wallets, wallet];
    saveState();
    modalType = "wallets";
    render();
    showToast(old ? "Dompet diperbarui." : "Dompet ditambahkan.");
    return;
  }
  if (form.id === "category-form") {
    const name = String(data.get("name")).trim();
    const categories = state.categories[editingCategoryType];
    if (!name || (categories.some((category) => category.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID") && category !== editingCategoryName))) {
      form.querySelector(".form-error")?.replaceChildren("Nama kategori wajib diisi dan tidak boleh sama.");
      return;
    }
    if (editingCategoryName) {
      state.categories[editingCategoryType] = categories.map((category) => category === editingCategoryName ? name : category);
      state.expenses = state.expenses.map((entry) => entry.type === editingCategoryType && entry.category === editingCategoryName ? { ...entry, category: name } : entry);
    } else {
      state.categories[editingCategoryType].push(name);
    }
    saveState();
    modalType = "categories";
    render();
    showToast(editingCategoryName ? "Kategori diperbarui." : "Kategori ditambahkan.");
  }
});

app.addEventListener("change", (event) => {
  if (event.target.name === "entryType" && event.target.closest("#expense-form")) {
    const form = event.target.closest("#expense-form");
    const categorySelect = form.querySelector('select[name="category"]');
    categorySelect.innerHTML = state.categories[event.target.value]
      .map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`)
      .join("");
  }
  if (event.target.name === "categoryType") {
    editingCategoryType = event.target.value;
    render();
  }
  if (event.target.name === "reportRange") {
    reportRange = event.target.value;
    render();
  }
  if (event.target.name === "reportFrom") {
    reportFrom = event.target.value;
  }
  if (event.target.name === "reportTo") {
    reportTo = event.target.value;
  }
});

app.addEventListener("input", (event) => {
  if (event.target.matches("[data-currency-input]")) {
    const digits = String(event.target.value).replace(/\D/g, "");
    event.target.value = digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
  }
});

render();
syncNotifications();
