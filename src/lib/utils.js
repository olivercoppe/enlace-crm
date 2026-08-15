/* ============================================================
   Utilidades generales
   ============================================================ */

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      }));

export const nowISO = () => new Date().toISOString();

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function addDays(dateISO, days) {
  const d = new Date(dateISO || todayISO());
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── Números y moneda ────────────────────────────────────── */

export function money(value, currency = 'MXN', opts = {}) {
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency,
    minimumFractionDigits: opts.decimals ?? 2,
    maximumFractionDigits: opts.decimals ?? 2,
  }).format(n);
}

export function moneyShort(value, currency = 'MXN') {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const sym = { MXN: '$', USD: 'US$', EUR: '€' }[currency] || '$';
  if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`;
  return `${sign}${sym}${abs.toFixed(0)}`;
}

export const num = (value, decimals = 2) => {
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(n);
};

export const pct = (value) => `${Math.round(Number(value) || 0)}%`;

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ── Fechas ──────────────────────────────────────────────── */

export function fecha(iso, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-MX', opts.long
    ? { day: '2-digit', month: 'long', year: 'numeric' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function desde(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} d`;
  return fecha(iso);
}

/** Días entre hoy y una fecha (negativo = vencida). */
export function diasHasta(iso) {
  if (!iso) return null;
  const target = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(target)) return null;
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  return Math.round((target - hoy) / 86400000);
}

/* ── Texto ───────────────────────────────────────────────── */

export const norm = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const initials = (name) =>
  String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

export const truncate = (s, n = 60) =>
  String(s ?? '').length > n ? String(s).slice(0, n - 1) + '…' : String(s ?? '');

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Genera un folio incremental tipo COT-2026-0007. */
export function folio(prefix, existing) {
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = existing.reduce((acc, f) => {
    const m = re.exec(String(f || ''));
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

/* ── Colecciones ─────────────────────────────────────────── */

export function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

export const sum = (arr, fn = (x) => x) => arr.reduce((a, b) => a + (Number(fn(b)) || 0), 0);

export function sortBy(arr, key, dir = 'asc') {
  const mult = dir === 'desc' ? -1 : 1;
  return [...arr].sort((a, b) => {
    const av = a?.[key], bv = b?.[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    return String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' }) * mult;
  });
}

export function debounce(fn, ms = 220) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── CSV ─────────────────────────────────────────────────── */

export function toCSV(rows, headers) {
  const cols = headers || Object.keys(rows[0] || {});
  const esc = (v) => {
    const s = v == null ? '' : (Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v));
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\r\n');
}

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(c => c !== '')).map(r =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob(['﻿' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function pickFile(accept = '.csv,.json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result) });
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  });
}

/* ── Persistencia local ──────────────────────────────────── */

export const ls = {
  get(key, fallback = null) {
    try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} },
};
