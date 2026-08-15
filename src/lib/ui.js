/* ============================================================
   Primitivas de interfaz: DOM, modales, formularios, toasts
   ============================================================ */

import { escapeHtml } from './utils.js';

/* ── DOM ─────────────────────────────────────────────────── */

/** el('div.card', { onclick }, [hijos]) */
export function el(spec, props = {}, children = []) {
  const [tagAndId, ...classes] = String(spec).split('.');
  const [tag, id] = tagAndId.split('#');
  const node = document.createElement(tag || 'div');
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');

  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = [node.className, v].filter(Boolean).join(' ');
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'value') node.value = v;
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }

  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const frag = (children) => {
  const f = document.createDocumentFragment();
  for (const c of [].concat(children)) if (c) f.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  return f;
};

export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ── Toasts ──────────────────────────────────────────────── */

export function toast(message, kind = 'info', ms = 3400) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const icon = { good: '✓', error: '✕', warn: '!', info: 'i' }[kind] || 'i';
  const node = el(`div.toast.toast--${kind}`, {}, [
    el('span', { text: icon, style: { fontWeight: '700', opacity: '.8' } }),
    el('span', { text: message }),
  ]);
  host.appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity .2s, transform .2s';
    node.style.opacity = '0'; node.style.transform = 'translateY(6px)';
    setTimeout(() => node.remove(), 220);
  }, ms);
}

/* ── Overlays ────────────────────────────────────────────── */

const stack = [];

function mount(overlay, onClose) {
  const root = document.getElementById('modal-root');
  root.appendChild(overlay);
  const entry = { overlay, onClose };
  stack.push(entry);

  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(entry); });
  document.body.style.overflow = 'hidden';

  const focusable = overlay.querySelector('input, select, textarea, button');
  setTimeout(() => focusable?.focus({ preventScroll: true }), 60);
  return entry;
}

function close(entry) {
  const i = stack.indexOf(entry);
  if (i === -1) return;
  stack.splice(i, 1);
  entry.overlay.remove();
  if (!stack.length) document.body.style.overflow = '';
  entry.onClose?.();
}

export const closeTop = () => { if (stack.length) close(stack[stack.length - 1]); };
export const closeAll = () => { while (stack.length) close(stack[stack.length - 1]); };
export const overlayCount = () => stack.length;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) { e.stopPropagation(); closeTop(); }
});

/**
 * Panel lateral. opts: { title, subtitle, body(Node), actions:[Node], wide }
 * Devuelve { close }.
 */
export function drawer({ title, subtitle, body, actions = [], onClose, headExtra }) {
  const overlay = el('div.overlay');
  const panel = el('aside.drawer', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Detalle' });

  const head = el('div.drawer__head', {}, [
    el('div', { style: { flex: '1', minWidth: '0' } }, [
      el('div.drawer__title', { text: title || '' }),
      subtitle ? el('div.drawer__sub', { text: subtitle }) : null,
    ]),
    ...(headExtra || []),
    el('button.icon-btn', { text: '✕', 'aria-label': 'Cerrar', onclick: () => entry && close(entry) }),
  ]);

  const bodyWrap = el('div.drawer__body');
  if (body) bodyWrap.appendChild(body);

  panel.append(head, bodyWrap);
  if (actions.length) panel.appendChild(el('div.drawer__foot', {}, actions));
  overlay.appendChild(panel);

  const entry = mount(overlay, onClose);
  return { close: () => close(entry), body: bodyWrap, panel };
}

/** Diálogo centrado. */
export function dialog({ title, body, actions = [], wide = false, onClose }) {
  const overlay = el('div.overlay.overlay--center');
  const box = el(`div.dialog${wide ? '.dialog--wide' : ''}`, { role: 'dialog', 'aria-modal': 'true' });

  box.appendChild(el('div.card__head', {}, [
    el('div.card__title', { text: title || '' }),
    el('button.icon-btn', { text: '✕', 'aria-label': 'Cerrar', style: { marginLeft: 'auto' }, onclick: () => close(entry) }),
  ]));

  const bodyWrap = el('div.card__body', { style: wide ? { overflowY: 'auto', flex: '1' } : {} });
  if (body) bodyWrap.appendChild(body);
  box.appendChild(bodyWrap);
  if (actions.length) box.appendChild(el('div.drawer__foot', {}, actions));

  overlay.appendChild(box);
  const entry = mount(overlay, onClose);
  return { close: () => close(entry), body: bodyWrap };
}

/** Confirmación → Promise<boolean> */
export function confirmar({ title = '¿Confirmar?', message = '', ok = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; d.close(); resolve(v); };
    const d = dialog({
      title,
      body: el('p', { text: message, style: { color: 'var(--ink-2)' } }),
      actions: [
        el('div.spacer', { style: { flex: '1' } }),
        el('button.btn', { text: 'Cancelar', onclick: () => finish(false) }),
        el(`button.btn.${danger ? 'btn--danger' : 'btn--primary'}`, { text: ok, onclick: () => finish(true) }),
      ],
      onClose: () => finish(false),
    });
  });
}

/* ── Chips ───────────────────────────────────────────────── */

const TONOS = {
  activo: 'good', ganada: 'good', pagada: 'good', completada: 'good', aprobada: 'good', vigente: 'good',
  prospecto: 'accent', enviada: 'accent', 'en curso': 'accent', abierta: 'accent', nueva: 'accent',
  pendiente: 'warning', pausado: 'warning', borrador: 'muted', negociacion: 'warning',
  inactivo: 'muted', archivada: 'muted', cancelada: 'muted', vencida: 'serious',
  perdida: 'critical', rechazada: 'critical', bloqueado: 'critical',
};

export function chip(text, tone) {
  if (text == null || text === '') return el('span.muted', { text: '—' });
  const key = String(text).toLowerCase();
  const t = tone || TONOS[key] || 'plain';
  return el(`span.chip.chip--${t}`, { text: String(text) });
}

export function chipList(values, tone = 'plain') {
  const arr = [].concat(values || []).filter(Boolean);
  if (!arr.length) return el('span.muted', { text: '—' });
  return el('span.chips', {}, arr.map(v => el(`span.chip.chip--${tone}`, { text: v })));
}

/* ── Constructor de formularios ──────────────────────────── */

/**
 * Crea un formulario a partir de definiciones de campo.
 * field: { key, label, type, options, required, help, group, full, min, step, prefix, placeholder }
 * Devuelve { node, read(), validate(), setValue(k,v), get(k) }
 */
export function buildForm(fields, values = {}, ctx = {}) {
  const form = el('form.form', { onsubmit: (e) => e.preventDefault(), autocomplete: 'off' });
  const controls = new Map();
  let currentGroup = null;
  let row = null;

  const pushRow = () => { row = el('div.form__row'); form.appendChild(row); return row; };

  for (const f of fields) {
    if (f.when && !f.when(values, ctx)) continue;

    if (f.group && f.group !== currentGroup) {
      currentGroup = f.group;
      form.appendChild(el('div.form__group-title', { text: f.group }));
      row = null;
    }
    if (!row) pushRow();

    const wrap = el(`div.field${f.full ? '.field--full' : ''}${f.type === 'checkbox' ? '.field--check' : ''}`);
    const id = `f-${f.key}-${Math.random().toString(36).slice(2, 7)}`;
    const value = values?.[f.key];

    let input;
    switch (f.type) {
      case 'textarea':
        input = el('textarea', { id, rows: f.rows || 3, placeholder: f.placeholder || '' });
        input.value = value ?? '';
        break;
      case 'select': {
        input = el('select', { id });
        const opts = typeof f.options === 'function' ? f.options(ctx, values) : (f.options || []);
        // Los obligatorios que ya traen valor no necesitan opción vacía.
        const yaTieneValor = value != null && value !== '';
        if (f.allowEmpty === true || (!f.required && f.allowEmpty !== false) || (f.required && !yaTieneValor && f.allowEmpty !== false)) {
          input.appendChild(el('option', { value: '', text: f.placeholder || '— Seleccionar —' }));
        }
        for (const o of opts) {
          const ov = typeof o === 'object' ? o.value : o;
          const ol = typeof o === 'object' ? o.label : o;
          input.appendChild(el('option', { value: ov, text: ol }));
        }
        input.value = value ?? '';
        break;
      }
      case 'checkbox':
        input = el('input', { id, type: 'checkbox' });
        input.checked = !!value;
        break;
      case 'tags':
        input = tagsInput(value || [], f.suggestions);
        break;
      case 'number': case 'currency':
        input = el('input', { id, type: 'number', step: f.step ?? (f.type === 'currency' ? '0.01' : '1'), min: f.min ?? undefined, placeholder: f.placeholder || '' });
        input.value = value ?? '';
        break;
      case 'date':
        input = el('input', { id, type: 'date' });
        input.value = (value || '').slice(0, 10);
        break;
      default:
        input = el('input', {
          id,
          type: { email: 'email', tel: 'tel', url: 'url' }[f.type] || 'text',
          placeholder: f.placeholder || '',
        });
        input.value = value ?? '';
    }

    if (f.readonly) { input.setAttribute('readonly', ''); input.style.opacity = '.7'; }
    if (f.oninput) input.addEventListener('input', () => f.oninput(readOne(f, input), api));

    const label = el('label', { for: id, html: escapeHtml(f.label) + (f.required ? ' <span class="req">*</span>' : '') });

    if (f.type === 'checkbox') wrap.append(input, label);
    else {
      wrap.appendChild(label);
      if (f.prefix) {
        wrap.appendChild(el('div.input-prefix', {}, [el('span', { text: f.prefix }), input]));
      } else wrap.appendChild(input);
      if (f.help) wrap.appendChild(el('div.help', { text: f.help }));
    }

    if (f.full) { form.appendChild(wrap); row = null; }
    else row.appendChild(wrap);

    controls.set(f.key, { field: f, input, wrap });
  }

  function readOne(f, input) {
    if (f.type === 'checkbox') return input.checked;
    if (f.type === 'tags') return input._getTags();
    if (f.type === 'number' || f.type === 'currency') {
      const raw = input.value.trim();
      return raw === '' ? null : Number(raw);
    }
    return input.value.trim();
  }

  const api = {
    node: form,
    read() {
      const out = {};
      for (const [key, { field, input }] of controls) out[key] = readOne(field, input);
      return out;
    },
    get(key) {
      const c = controls.get(key);
      return c ? readOne(c.field, c.input) : undefined;
    },
    setValue(key, v) {
      const c = controls.get(key);
      if (!c) return;
      if (c.field.type === 'checkbox') c.input.checked = !!v;
      else if (c.field.type === 'tags') c.input._setTags(v || []);
      else c.input.value = v ?? '';
    },
    focus(key) { controls.get(key)?.input?.focus(); },
    validate() {
      let ok = true, first = null;
      for (const [, { field, input, wrap }] of controls) {
        const v = readOne(field, input);
        const missing = field.required && (v === '' || v == null || (Array.isArray(v) && !v.length));
        wrap.classList.toggle('is-invalid', !!missing);
        if (missing) { ok = false; first = first || input; }
      }
      if (!ok) { first?.focus(); toast('Faltan campos obligatorios', 'error'); }
      return ok;
    },
  };
  return api;
}

/** Campo de etiquetas libres. */
function tagsInput(initial, suggestions = []) {
  const box = el('div.tag-input');
  let tags = [...(initial || [])];
  const input = el('input', { placeholder: 'Escribe y Enter…', list: suggestions.length ? 'tag-sugg' : undefined });

  const render = () => {
    [...box.querySelectorAll('.tag')].forEach(n => n.remove());
    tags.forEach((t, i) => {
      box.insertBefore(el('span.tag', {}, [
        t,
        el('button', { type: 'button', text: '✕', onclick: () => { tags.splice(i, 1); render(); } }),
      ]), input);
    });
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = input.value.trim().replace(/,$/, '');
      if (v && !tags.includes(v)) { tags.push(v); render(); }
      input.value = '';
    } else if (e.key === 'Backspace' && !input.value && tags.length) {
      tags.pop(); render();
    }
  });
  input.addEventListener('blur', () => {
    const v = input.value.trim();
    if (v && !tags.includes(v)) { tags.push(v); render(); input.value = ''; }
  });

  box.appendChild(input);
  if (suggestions.length) {
    const dl = el('datalist', { id: 'tag-sugg' }, suggestions.map(s => el('option', { value: s })));
    box.appendChild(dl);
  }
  render();
  box._getTags = () => [...tags];
  box._setTags = (v) => { tags = [...v]; render(); };
  return box;
}

/* ── Tabla de datos ──────────────────────────────────────── */

/**
 * columns: [{ key, label, render(row)->Node|string, num, sortValue(row), width }]
 * opts: { onRow(row), empty:{icon,title,text,action}, sort:{key,dir}, onSort(key) }
 */
export function dataTable(rows, columns, opts = {}) {
  if (!rows.length) return emptyState(opts.empty || {});

  const table = el('table.tbl');
  const thead = el('thead', {}, [
    el('tr', {}, columns.map(c => {
      const th = el(`th${c.num ? '.num' : ''}`, {
        text: c.label,
        style: c.width ? { width: c.width } : {},
        onclick: () => opts.onSort?.(c.key),
      });
      if (opts.sort?.key === c.key) th.appendChild(el('span.sort', { text: opts.sort.dir === 'asc' ? '▲' : '▼' }));
      return th;
    })),
  ]);

  const tbody = el('tbody', {}, rows.map(r => {
    const tr = el('tr', { onclick: (e) => { if (!e.target.closest('button,a')) opts.onRow?.(r); } });
    for (const c of columns) {
      const td = el(`td${c.num ? '.num' : ''}`);
      const v = c.render ? c.render(r) : r[c.key];
      if (v instanceof Node) td.appendChild(v);
      else td.textContent = v == null || v === '' ? '—' : String(v);
      tr.appendChild(td);
    }
    return tr;
  }));

  table.append(thead, tbody);
  return el('div.table-wrap', {}, [table]);
}

export function emptyState({ icon = '◦', title = 'Sin registros', text = '', action } = {}) {
  return el('div.empty', {}, [
    el('div.empty__ico', { text: icon }),
    el('div.empty__title', { text: title }),
    text ? el('div.empty__text', { text }) : null,
    action || null,
  ]);
}

/* ── Barras (magnitud) ───────────────────────────────────── */

export function barList(items, { color = 'var(--seq-450)', format = (v) => v } = {}) {
  const max = Math.max(1, ...items.map(i => Math.abs(i.value)));
  return el('div.bars', {}, items.map(i => el('div.bar-row', {}, [
    el('div.bar-row__label', { text: i.label, title: i.label }),
    el('div.bar-row__track', {}, [
      el('div.bar-row__fill', { style: { width: `${Math.max(2, (Math.abs(i.value) / max) * 100)}%`, background: i.color || color } }),
    ]),
    el('div.bar-row__val', { text: format(i.value) }),
  ])));
}
