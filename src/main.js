import { calculateBudget, DEFAULT_CATEGORIES, formatRupiah, getDailyAllowance, getExpectedExhaustionDate, getStatus, toDateKey } from "./budget.js";
import { Capacitor } from "@capacitor/core";
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";
import "./style.css";

const STORAGE_KEY = "dompet-jatah-v1";
const app = document.querySelector("#app");
let today = new Date();
const state = loadState();
let activeView = "home";
let calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
let editingExpenseId = null;
let modalOpen = false;
let addingIncome = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.wallet && Array.isArray(saved.expenses)) {
      return { ...saved, categories: Array.isArray(saved.categories) ? saved.categories : DEFAULT_CATEGORIES };
    }
  } catch (error) {
    console.error("Data Dompet Jatah tidak dapat dibaca.", error);
  }
  return { wallet: null, expenses: [], categories: DEFAULT_CATEGORIES };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  if (!state.wallet) {
    renderSetup();
    return;
  }
  const budget = calculateBudget(state.wallet, state.expenses, today);
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#" aria-label="Dompet Jatah beranda"><span class="brand-mark">${icon("wallet", 21)}</span><span>dompet<span class="brand-soft">jatah</span></span></a>
        <div class="sidebar-label">MENU</div>
        ${navItems("side")}
        <div class="side-spacer"></div>
        <button class="wallet-mini" data-action="settings"><span class="mini-avatar">${icon("wallet", 19)}</span><span><b>${escapeHTML(state.wallet.name || "Dompet Utama")}</b><small>${escapeHTML(state.wallet.mode === "daily" ? "Mode per hari" : "Mode per bulan")}</small></span>${icon("right", 17)}</button>
      </aside>
      <main class="main-content">
        <header class="topbar"><div class="mobile-brand"><span class="brand-mark">${icon("wallet", 18)}</span><span>dompet<span class="brand-soft">jatah</span></span></div><div class="topbar-date">${dateLabel(today, { weekday: "long", day: "numeric", month: "long" })}</div><button class="icon-button settings-button" aria-label="Pengaturan dompet" data-action="settings">${icon("settings")}</button></header>
        <section class="page-content">${renderView(budget)}</section>
      </main>
      <nav class="bottom-nav" aria-label="Navigasi utama">${navItems("bottom")}<button class="bottom-item" data-action="settings">${icon("settings")}<span>Atur</span></button></nav>
      <button class="fab" data-action="add-expense" aria-label="Tambah pengeluaran">${icon("plus", 24)}</button>
      ${modalOpen ? renderExpenseModal() : ""}
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
        <p class="setup-copy">Buat Dompet Utama dan tentukan berapa lama uangmu harus bertahan.</p>
        <form id="setup-form" class="form-stack">
          <label>Nama dompet<input name="name" value="Dompet Utama" maxlength="32" required></label>
          <label>Saldo awal<div class="money-input"><span>Rp</span><input name="amount" type="text" inputmode="numeric" data-currency-input placeholder="3.000.000" required></div></label>
          <fieldset><legend>Atur jatah</legend><div class="segmented"><label><input type="radio" name="mode" value="daily" checked><span>Per hari</span></label><label><input type="radio" name="mode" value="monthly"><span>Per bulan</span></label></div></fieldset>
          <label>Uang ini harus bertahan selama<div class="period-input"><input name="periods" type="number" min="1" max="3650" value="30" required><span class="period-unit">hari</span></div></label>
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
  const isDaily = state.wallet.mode === "daily";
  const allowance = isDaily ? budget.dailyAllowance : budget.monthlyAllowance;
  const currentSpent = isDaily ? budget.spentToday : budget.spentThisMonth;
  const currentRemaining = allowance - currentSpent;
  const fill = allowance > 0 ? Math.min(100, Math.round(currentSpent / allowance * 100)) : 0;
  const status = isDaily ? budget.dailyStatus : budget.monthlyStatus;
  const recent = state.expenses.filter((item) => item.type !== "income").sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4);
  const spentPercent = budget.totalSpent / Math.max(budget.effectiveAmount, 1);
  const remainingUnit = isDaily ? "hari" : "bulan";
  const future = getExpectedExhaustionDate(state.wallet, budget.remainingPeriods, today);

  return `<div class="page-heading"><div><p class="eyebrow">RINGKASAN DOMPET</p><h1>Halo, tetap di jalur.</h1><p class="muted">Setiap keputusan kecil bikin uangmu bertahan lebih lama.</p></div><div class="page-heading-actions"><button class="text-button" data-action="add-income">${icon("plus", 16)} Pemasukan</button><button class="text-button" data-action="settings">${icon("edit", 16)} Atur dompet</button></div></div>
    ${status === "over" ? `<div class="alert alert-over"><span class="alert-icon">!</span><p><b>Kamu keluar jatah.</b> Uangmu sekarang cukup untuk sekitar ${budget.remainingPeriods} ${remainingUnit} lagi.</p></div>` : ""}
    <div class="dashboard-grid">
      <section class="card balance-card"><div class="card-topline"><span class="card-label">SISA SALDO</span><span class="balance-icon">${icon("wallet", 18)}</span></div><div class="balance-value">${rupiah(budget.remaining)}</div><div class="balance-meta"><span class="positive-dot"></span>${budget.remaining > 0 ? `Cukup sekitar <b>${budget.remainingPeriods} ${remainingUnit} lagi</b>` : "Saldo sudah habis"}</div><div class="balance-divider"></div><div class="balance-foot"><span>Dari ${rupiah(state.wallet.amount + budget.totalIncome)}</span><span>Perkiraan habis ${dateLabel(future, { day: "numeric", month: "short", year: "numeric" })}</span></div><div class="balance-progress"><i style="width:${Math.max(0, 100 - spentPercent * 100)}%"></i></div></section>
      <section class="card quota-card"><div class="card-topline"><span class="card-label">${isDaily ? "JATAH HARI INI" : "JATAH BULAN INI"}</span>${statusBadge(status)}</div><div class="quota-value">${rupiah(allowance)}<small> / ${isDaily ? "hari" : "bulan"}</small></div><div class="quota-spent"><span>Terpakai ${rupiah(currentSpent)}</span><b>${fill}%</b></div><div class="quota-track"><i class="fill-${status}" style="width:${fill}%"></i></div><div class="quota-foot"><span>${currentRemaining >= 0 ? `Sisa ${rupiah(currentRemaining)}` : `Melebihi ${rupiah(Math.abs(currentRemaining))}`}</span><span>${isDaily ? dateLabel(today, { day: "numeric", month: "short" }) : monthLabel(today)}</span></div></section>
      <section class="card overview-card"><div class="section-title"><h2>Ringkasan periode</h2><span class="period-chip">${state.wallet.mode === "daily" ? `${state.wallet.periods} hari` : `${state.wallet.periods} bulan`}</span></div><div class="overview-row"><span>Total pengeluaran</span><b>${rupiah(budget.totalSpent)}</b></div><div class="overview-row"><span>Total pemasukan</span><b>${rupiah(budget.totalIncome)}</b></div><div class="overview-row"><span>Jatah ${isDaily ? "harian" : "bulanan"}</span><b>${rupiah(allowance)}</b></div>${isDaily ? "" : `<div class="overview-row"><span>Jatah harian rata-rata</span><b>${rupiah(budget.dailyAllowance)}</b></div>`}<div class="overview-row"><span>Kondisi ${isDaily ? "hari ini" : "bulan ini"}</span>${statusBadge(status)}</div></section>
      <section class="card recent-card"><div class="section-title"><h2>Pengeluaran terbaru</h2><button class="link-button" data-view="reports">Lihat semua ${icon("arrow", 15)}</button></div>${recent.length ? `<div class="expense-list compact-list">${recent.map(expenseRow).join("")}</div>` : `<div class="empty-inline"><span class="empty-icon">${icon("wallet", 21)}</span><div><b>Belum ada pengeluaran</b><small>Catat yang pertama, biar jatahmu terpantau.</small></div></div>`}</section>
    </div>`;
}

function expenseRow(expense) {
  const date = new Date(`${expense.date}T${expense.time || "12:00"}`);
  const initial = escapeHTML((expense.category || "L").slice(0, 1).toUpperCase());
  const isIncome = expense.type === "income";
  return `<article class="expense-row"><span class="category-mark category-${escapeHTML(expense.category)}">${initial}</span><span class="expense-info"><b>${escapeHTML(expense.category)}</b><small>${escapeHTML(expense.note || dateLabel(date, { day: "numeric", month: "short" }))} · ${expense.time || ""}</small></span><b class="expense-amount ${isIncome ? "income-amount" : ""}">${isIncome ? "+" : "-"}${rupiah(expense.amount)}</b><button class="row-edit" data-edit="${expense.id}" aria-label="Edit transaksi">${icon("edit", 15)}</button></article>`;
}

function renderCalendar(budget) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const selectedKey = state.selectedDate || toDateKey(today);
  const todayKey = toDateKey(today);
  const expectedEndKey = toDateKey(getExpectedExhaustionDate(state.wallet, budget.remainingPeriods, today));
  const week = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const cells = [];
  for (let blank = 0; blank < firstDay; blank += 1) cells.push('<span class="calendar-blank"></span>');
  for (let day = 1; day <= days; day += 1) {
    const key = `${monthKey}-${String(day).padStart(2, "0")}`;
    const expenses = state.expenses.filter((item) => item.type !== "income" && item.date === key);
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const dailyCap = getDailyAllowance(state.wallet, new Date(year, month, day));
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
  const categories = state.categories.map((category) => ({
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
    <section class="card all-expenses"><div class="section-title"><h2>Semua transaksi</h2><span class="period-chip">${state.expenses.length} catatan</span></div>${state.expenses.length ? `<div class="expense-list">${[...state.expenses].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(expenseRow).join("")}</div>` : `<div class="empty-inline"><span class="empty-icon">${icon("wallet", 20)}</span><div><b>Belum ada transaksi</b><small>Catatanmu akan tampil di sini.</small></div></div>`}</section>`;
}

function renderExpenseModal() {
  const expense = editingExpenseId ? state.expenses.find((item) => item.id === editingExpenseId) : null;
  const entryType = expense?.type || (addingIncome ? "income" : "expense");
  const categoryOptions = entryType === "income" ? ["Pemasukan"] : state.categories;
  return `<div class="modal-backdrop" data-action="close-modal"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><p class="eyebrow">${expense ? "PERBARUI CATATAN" : "CATAT TRANSAKSI"}</p><h2 id="modal-title">${expense ? (entryType === "income" ? "Edit pemasukan" : "Edit pengeluaran") : (entryType === "income" ? "Pemasukan baru" : "Pengeluaran baru")}</h2></div><button class="icon-button" data-action="close-modal" aria-label="Tutup">${icon("close")}</button></div><form id="expense-form" class="form-stack"><label>Jenis transaksi<select name="entryType"><option value="expense" ${entryType === "expense" ? "selected" : ""}>Pengeluaran</option><option value="income" ${entryType === "income" ? "selected" : ""}>Pemasukan</option></select></label><label>Nominal<div class="money-input"><span>Rp</span><input name="amount" type="text" inputmode="numeric" data-currency-input value="${formatCurrencyInput(expense?.amount ?? "")}" placeholder="10.000" required autofocus></div></label><label>Kategori<select name="category">${categoryOptions.map((category) => `<option value="${escapeHTML(category)}" ${expense?.category === category ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}</select></label><label>Catatan <span class="optional">(opsional)</span><input name="note" maxlength="80" value="${escapeHTML(expense?.note || "")}" placeholder="Contoh: makan siang"></label><p class="form-error" aria-live="polite"></p><div class="modal-actions">${expense ? `<button class="danger-button" type="button" data-action="delete-expense" data-id="${expense.id}">${icon("trash", 17)} Hapus</button>` : ""}<button class="primary-button" type="submit">${expense ? "Simpan perubahan" : "Simpan transaksi"}</button></div></form></section></div>`;
}

function renderSettings() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.dataset.action = "close-modal";
  modal.innerHTML = `<section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="modal-head"><div><p class="eyebrow">PREFERENSI</p><h2 id="settings-title">Atur dompet</h2></div><button class="icon-button" data-action="close-modal" aria-label="Tutup">${icon("close")}</button></div><form id="settings-form" class="form-stack"><label>Nama dompet<input name="name" maxlength="32" value="${escapeHTML(state.wallet.name)}" required></label><label>Saldo awal<div class="money-input"><span>Rp</span><input name="amount" type="text" inputmode="numeric" data-currency-input value="${formatCurrencyInput(state.wallet.amount)}" required></div></label><fieldset><legend>Atur jatah</legend><div class="segmented"><label><input type="radio" name="mode" value="daily" ${state.wallet.mode === "daily" ? "checked" : ""}><span>Per hari</span></label><label><input type="radio" name="mode" value="monthly" ${state.wallet.mode === "monthly" ? "checked" : ""}><span>Per bulan</span></label></div></fieldset><label>Jumlah <span class="settings-unit">${state.wallet.mode === "daily" ? "hari" : "bulan"}</span><input name="periods" type="number" min="1" max="3650" value="${state.wallet.periods}" required></label><p class="settings-note">Pengeluaran yang sudah dicatat tetap tersimpan saat aturan jatah berubah.</p><button class="outline-button calendar-reminder-button" type="button" data-action="calendar-reminder">${icon("calendar", 17)} Buat pengingat di kalender</button><div class="modal-actions settings-actions"><button class="danger-button" type="button" data-action="delete-wallet">${icon("trash", 17)} Hapus dompet</button><button class="primary-button" type="submit">Simpan</button></div></form></section>`;
  app.querySelector(".app-shell").append(modal);
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
  addingIncome = !id && entryType === "income";
  modalOpen = true;
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

    const budget = calculateBudget(state.wallet, state.expenses, today);
    const startDate = getExpectedExhaustionDate(state.wallet, budget.remainingPeriods, today);
    startDate.setHours(20, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    await CapacitorCalendar.createEventWithPrompt({
      title: "Perkiraan saldo habis - Dompet Jatah",
      description: `Saldo dompet diperkirakan habis pada ${dateLabel(startDate)}. Atur ulang dompet atau catat pemasukan jika diperlukan.`,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });
    showToast(Capacitor.isNativePlatform() ? "Pengingat dibuka di kalender." : "Pengingat kalender siap disimpan.");
  } catch (error) {
    console.error("Pengingat kalender tidak dapat dibuat.", error);
    showToast("Kalender tidak dapat dibuka.");
  }
}

function refreshToday() {
  const current = new Date();
  if (toDateKey(current) !== toDateKey(today)) {
    today = current;
    calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    render();
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshToday();
});
window.addEventListener("focus", refreshToday);
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
  } else if (target.dataset.action === "add-income") {
    openExpense(null, "income");
  } else if (target.dataset.action === "calendar-reminder") {
    createCalendarReminder();
  } else if (target.dataset.action === "settings") {
    renderSettings();
  } else if (target.dataset.action === "close-modal") {
    if (event.target === target || target.classList.contains("icon-button")) {
      target.closest(".modal-backdrop")?.remove();
      modalOpen = false;
      editingExpenseId = null;
    }
  } else if (target.dataset.action === "delete-expense") {
    state.expenses = state.expenses.filter((expense) => expense.id !== target.dataset.id);
    saveState();
    modalOpen = false;
    editingExpenseId = null;
    render();
    showToast("Pengeluaran dihapus.");
  } else if (target.dataset.action === "delete-wallet") {
    if (confirm("Hapus dompet dan semua catatan pengeluaran? Tindakan ini tidak bisa dibatalkan.")) {
      state.wallet = null;
      state.expenses = [];
      saveState();
      render();
    }
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
    const periods = Number(data.get("periods"));
    if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(periods) || periods <= 0) return;
    state.wallet = { name: data.get("name").trim() || "Dompet Utama", amount, periods, mode: data.get("mode"), startDate: toDateKey(today) };
    saveState();
    render();
    return;
  }
  if (form.id === "expense-form") {
    const amount = parseCurrencyInput(data.get("amount"));
    const entryType = data.get("entryType") === "income" ? "income" : "expense";
    const error = form.querySelector(".form-error");
    const previous = editingExpenseId && state.expenses.find((expense) => expense.id === editingExpenseId);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      error.textContent = "Masukkan nominal lebih dari Rp0.";
      return;
    }
    const recordedAt = new Date();
    const date = previous?.date || toDateKey(recordedAt);
    const time = previous?.time || recordedAt.toTimeString().slice(0, 5);
    const expense = {
      id: previous?.id || crypto.randomUUID(),
      type: entryType,
      amount,
      category: entryType === "income" ? "Pemasukan" : data.get("category"),
      note: data.get("note").trim(),
      date,
      time,
      timestamp: previous?.timestamp || `${date}T${time}:00`,
    };
    state.expenses = previous
      ? state.expenses.map((item) => item.id === previous.id ? expense : item)
      : [...state.expenses, expense];
    saveState();
    modalOpen = false;
    editingExpenseId = null;
    addingIncome = false;
    activeView = activeView === "calendar" ? "calendar" : "home";
    render();
    const budget = calculateBudget(state.wallet, state.expenses, today);
    showToast(entryType === "income" ? "Pemasukan tersimpan dan menambah sisa saldo." : (budget.status === "over" ? `Keluar jatah — cukup sekitar ${budget.remainingPeriods} hari lagi.` : "Pengeluaran tersimpan."));
    return;
  }
  if (form.id === "settings-form") {
    const amount = parseCurrencyInput(data.get("amount"));
    const periods = Number(data.get("periods"));
    if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(periods) || periods <= 0) return;
    const changed = amount !== state.wallet.amount || periods !== state.wallet.periods || data.get("mode") !== state.wallet.mode;
    state.wallet = {
      name: data.get("name").trim() || "Dompet Utama",
      amount,
      periods,
      mode: data.get("mode"),
      startDate: changed ? toDateKey(today) : state.wallet.startDate || toDateKey(today),
    };
    saveState();
    render();
    showToast("Aturan dompet diperbarui.");
  }
});

app.addEventListener("change", (event) => {
  if (event.target.name === "mode" && event.target.closest("#setup-form")) {
    const unit = app.querySelector(".period-unit");
    if (unit) unit.textContent = event.target.value === "daily" ? "hari" : "bulan";
  }
  if (event.target.name === "mode" && event.target.closest("#settings-form")) {
    const label = app.querySelector(".settings-unit");
    if (label) label.textContent = event.target.value === "daily" ? "hari" : "bulan";
  }
  if (event.target.name === "entryType" && event.target.closest("#expense-form")) {
    const form = event.target.closest("#expense-form");
    const categorySelect = form.querySelector('select[name="category"]');
    const isIncome = event.target.value === "income";
    categorySelect.innerHTML = (isIncome ? ["Pemasukan"] : state.categories)
      .map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`)
      .join("");
  }
});

app.addEventListener("input", (event) => {
  if (event.target.matches("[data-currency-input]")) {
    const digits = String(event.target.value).replace(/\D/g, "");
    event.target.value = digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
  }
});

render();
