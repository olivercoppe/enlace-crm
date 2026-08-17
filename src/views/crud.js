/* ============================================================
   Motor genérico: listas, formularios y fichas de detalle.
   Todas las secciones de datos se construyen desde aquí.
   ============================================================ */

import { el, clear, chip, chipList, dataTable, buildForm, drawer, dialog, confirmar, toast, emptyState } from '../lib/ui.js';
import * as S from '../data/store.js';
import {
  RESOURCES, COLUMN_LABELS, nuevoRegistro, margenPct, totalesCotizacion, etiquetaNuevo,
  totalesProduccion,
} from '../data/schema.js';
import {
  norm, money, num, pct, fecha, fechaHora, desde, sortBy, toCSV, parseCSV,
  download, pickFile, truncate, diasHasta, sum, uid,
} from '../lib/utils.js';
import { getEditor, getSecciones } from './registry.js';

/* Estado de UI por recurso (se conserva entre navegaciones). */
const uiState = new Map();
const getUI = (key) => {
  if (!uiState.has(key)) uiState.set(key, { q: '', filtros: {}, sort: { key: null, dir: 'asc' } });
  return uiState.get(key);
};

/* ════════════════════════════════════════════════════════════
   Renderizado de celdas
   ════════════════════════════════════════════════════════════ */

const CHIP_FIELDS = new Set(['tipo', 'estatus', 'etapa', 'rol', 'prioridad', 'categoria']);
const MONEY_FIELDS = new Set(['costo', 'precio_lista', 'precio', 'valor', 'total', 'limite_credito', 'subtotal']);
const DATE_FIELDS = new Set(['fecha', 'vigencia', 'cierre_estimado', 'cumpleanos']);

export function renderCell(resourceKey, row, colKey) {
  const v = row[colKey];

  if (colKey === 'empresa_id') {
    const nombre = S.nombreEmpresa(v);
    return nombre
      ? el('a', { text: nombre, href: `#/empresas/${v}`, onclick: (e) => e.stopPropagation() })
      : el('span.muted', { text: '—' });
  }
  if (colKey === 'material_id') {
    const m = S.byId('materiales', v);
    if (!m) return el('span.muted', { text: '—' });
    return el('span', {}, [
      el('span.cell-strong', { text: m.nombre }),
      m.sku ? el('div.cell-sub', { text: m.sku }) : null,
    ]);
  }
  if (colKey === 'contacto_id') return S.nombreContacto(v) || '—';

  if (colKey === 'costo_produccion') {
    const t = totalesProduccion(row);
    if (!t.conceptos) return el('span.muted', { text: '—' });
    return el('span', { title: `${t.conceptos} concepto(s) · lote de ${num(t.unidades, 2)}` }, [
      el('span', { text: money(t.costoUnitario, row.moneda || 'MXN') }),
      t.unidades !== 1 ? el('div.cell-sub', { text: `lote ${money(t.totalLote, row.moneda || 'MXN')}` }) : null,
    ]);
  }

  if (colKey === 'margen') {
    const m = margenPct(row);
    if (m == null) return el('span.muted', { text: '—' });
    const tone = m >= 25 ? 'good' : m >= 10 ? 'warning' : 'critical';
    return el(`span.chip.chip--${tone}`, { text: pct(m) });
  }

  if (colKey === 'total' && resourceKey === 'cotizaciones') {
    return money(totalesCotizacion(row).total, row.moneda || 'MXN');
  }

  if (colKey === 'nombre' || colKey === 'titulo' || colKey === 'asunto' || colKey === 'folio') {
    const sub = {
      empresas: row.razon_social || row.rfc,
      contactos: row.puesto,
      materiales: row.descripcion ? truncate(row.descripcion, 48) : null,
      oportunidades: S.nombreEmpresa(row.empresa_id),
      actividades: S.nombreEmpresa(row.empresa_id),
      cotizaciones: S.nombreEmpresa(row.empresa_id),
    }[resourceKey];
    return el('div', {}, [
      el('div.cell-strong', { text: v || '(sin nombre)' }),
      sub ? el('div.cell-sub', { text: sub }) : null,
    ]);
  }

  if (colKey === 'estatus' && resourceKey === 'cotizaciones' && row.estatus !== 'Aprobada') {
    const d = diasHasta(row.vigencia);
    if (row.vigencia && d != null && d < 0 && row.estatus === 'Enviada') {
      return el('span.chips', {}, [chip('Enviada'), chip('Vencida', 'serious')]);
    }
  }

  if (colKey === 'estatus' && resourceKey === 'actividades' && row.estatus === 'Pendiente') {
    const d = diasHasta(row.fecha);
    if (d != null && d < 0) {
      return el('span.chips', {}, [chip('Pendiente'), chip(`${Math.abs(d)} d tarde`, 'critical')]);
    }
  }

  if (CHIP_FIELDS.has(colKey)) return chip(v);
  if (colKey === 'etiquetas') return chipList(v);
  if (colKey === 'principal' || colKey === 'activo' || colKey === 'vigente') {
    return v ? chip('Sí', 'good') : el('span.muted', { text: 'No' });
  }
  if (colKey === 'probabilidad') return v == null ? '—' : pct(v);
  if (colKey === 'lead_time_dias') return v == null ? '—' : `${num(v, 0)} d`;
  if (MONEY_FIELDS.has(colKey)) return v == null ? el('span.muted', { text: '—' }) : money(v, row.moneda || 'MXN');
  if (DATE_FIELDS.has(colKey)) {
    if (!v) return el('span.muted', { text: '—' });
    const d = diasHasta(v);
    const vencida = d != null && d < 0;
    return el('span', { class: vencida ? 'chip chip--serious' : '', text: fecha(v) });
  }
  if (colKey === 'stock') {
    if (v == null) return el('span.muted', { text: '—' });
    const bajo = row.stock_min != null && Number(v) <= Number(row.stock_min);
    return el('span', { class: bajo ? 'chip chip--warning' : '', text: `${num(v, 2)}` });
  }
  if (Array.isArray(v)) return chipList(v);
  return v == null || v === '' ? el('span.muted', { text: '—' }) : String(v);
}

const sortValue = (resourceKey, row, colKey) => {
  if (colKey === 'empresa_id') return S.nombreEmpresa(row.empresa_id);
  if (colKey === 'material_id') return S.nombreMaterial(row.material_id);
  if (colKey === 'contacto_id') return S.nombreContacto(row.contacto_id);
  if (colKey === 'margen') return margenPct(row) ?? -Infinity;
  if (colKey === 'costo_produccion') {
    const t = totalesProduccion(row);
    return t.conceptos ? t.costoUnitario : -Infinity;
  }
  if (colKey === 'total' && resourceKey === 'cotizaciones') return totalesCotizacion(row).total;
  return row[colKey];
};

/* ════════════════════════════════════════════════════════════
   Búsqueda y filtros
   ════════════════════════════════════════════════════════════ */

export function buscar(resourceKey, rows, q) {
  const term = norm(q).trim();
  if (!term) return rows;
  const partes = term.split(/\s+/);
  const campos = RESOURCES[resourceKey].search || [];
  return rows.filter(r => {
    const heno = norm([
      ...campos.map(c => (Array.isArray(r[c]) ? r[c].join(' ') : r[c])),
      S.nombreEmpresa(r.empresa_id),
      S.nombreMaterial(r.material_id),
    ].filter(Boolean).join(' '));
    return partes.every(p => heno.includes(p));
  });
}

function aplicarFiltros(rows, filtros) {
  return rows.filter(r => Object.entries(filtros).every(([k, v]) => !v || String(r[k] ?? '') === v));
}

function opcionesFiltro(f, rows, ctx) {
  if (f.dynamic) {
    return [...new Set(rows.map(r => r[f.key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
  }
  const raw = typeof f.options === 'function' ? f.options(ctx) : f.options;
  return raw || [];
}

/* ════════════════════════════════════════════════════════════
   Vista de lista
   ════════════════════════════════════════════════════════════ */

export function renderLista(resourceKey, host, { titulo, subtitulo, filtroBase, extraTools } = {}) {
  const R = RESOURCES[resourceKey];
  const ui = getUI(resourceKey);
  clear(host);

  const head = el('div.view__head', {}, [
    el('div', {}, [
      el('h1.view__title', { text: titulo || R.label }),
      el('div.view__sub', { text: subtitulo || '' }),
    ]),
    el('div.view__tools', {}, [
      ...(extraTools || []),
      el('button.btn', {
        text: '↓ CSV',
        title: 'Exportar la vista actual a CSV',
        onclick: () => exportarCSV(resourceKey, vistaActual()),
      }),
      el('button.btn', { text: '↑ Importar', onclick: () => importarCSV(resourceKey) }),
      el('button.btn.btn--primary', {
        html: `<span class="btn__plus">＋</span> ${etiquetaNuevo(R)}`,
        onclick: () => abrirFormulario(resourceKey),
      }),
    ]),
  ]);

  const card = el('div.card');
  const toolbar = el('div.toolbar');
  const cuerpo = el('div');
  card.append(toolbar, cuerpo);
  host.append(head, card);

  /* — Toolbar — */
  const inputBusqueda = el('input', {
    type: 'search', placeholder: `Buscar en ${R.label.toLowerCase()}…`, value: ui.q,
    oninput: (e) => { ui.q = e.target.value; pintar(); },
  });
  toolbar.appendChild(el('div.field-inline', { style: { flex: '1', maxWidth: '320px' } }, [inputBusqueda]));

  for (const f of R.filters || []) {
    const sel = el('select', {
      onchange: (e) => { ui.filtros[f.key] = e.target.value; pintar(); },
    });
    sel.appendChild(el('option', { value: '', text: `Todos · ${f.label}` }));
    toolbar.appendChild(el('div.field-inline', {}, [sel]));
    sel._def = f;
  }

  const contador = el('span.count-pill');
  toolbar.append(el('div.toolbar__spacer'), contador);

  function refrescarFiltros(rows) {
    for (const wrap of toolbar.querySelectorAll('.field-inline')) {
      const sel = wrap.querySelector('select');
      if (!sel?._def) continue;
      const f = sel._def;
      const actual = ui.filtros[f.key] || '';
      const opts = opcionesFiltro(f, rows, S.ctx());
      clear(sel);
      sel.appendChild(el('option', { value: '', text: `Todos · ${f.label}` }));
      for (const o of opts) {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        sel.appendChild(el('option', { value: v, text: l }));
      }
      sel.value = actual;
    }
  }

  function vistaActual() {
    let rows = S.list(resourceKey);
    if (filtroBase) rows = rows.filter(filtroBase);
    rows = aplicarFiltros(buscar(resourceKey, rows, ui.q), ui.filtros);
    if (ui.sort.key) {
      rows = [...rows].sort((a, b) => {
        const av = sortValue(resourceKey, a, ui.sort.key);
        const bv = sortValue(resourceKey, b, ui.sort.key);
        const mult = ui.sort.dir === 'desc' ? -1 : 1;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
        return String(av).localeCompare(String(bv), 'es', { numeric: true }) * mult;
      });
    } else {
      rows = sortBy(rows, 'updated_at', 'desc');
    }
    return rows;
  }

  function pintar() {
    const base = filtroBase ? S.list(resourceKey).filter(filtroBase) : S.list(resourceKey);
    refrescarFiltros(base);
    const rows = vistaActual();
    contador.textContent = `${rows.length} de ${base.length}`;

    const columnas = [
      ...R.columns.map(c => ({
        key: c,
        label: R.columnLabels?.[c] || COLUMN_LABELS[c] || c,
        num: MONEY_FIELDS.has(c) || ['margen', 'stock', 'probabilidad', 'lead_time_dias', 'costo_produccion'].includes(c),
        render: (row) => renderCell(resourceKey, row, c),
      })),
      {
        key: '_acciones', label: '', num: true, width: '90px',
        render: (row) => el('div.row-actions', {}, [
          el('button.icon-btn', { text: '✎', title: 'Editar', onclick: (e) => { e.stopPropagation(); abrirFormulario(resourceKey, row); } }),
          el('button.icon-btn', { text: '🗑', title: 'Eliminar', onclick: (e) => { e.stopPropagation(); eliminar(resourceKey, row); } }),
        ]),
      },
    ];

    clear(cuerpo).appendChild(dataTable(rows, columnas, {
      sort: ui.sort,
      onSort: (k) => {
        if (k === '_acciones') return;
        ui.sort = ui.sort.key === k
          ? { key: k, dir: ui.sort.dir === 'asc' ? 'desc' : 'asc' }
          : { key: k, dir: 'asc' };
        pintar();
      },
      onRow: (row) => abrirDetalle(resourceKey, row.id),
      empty: {
        icon: R.icon,
        title: base.length ? 'Sin resultados' : `Aún no hay ${R.label.toLowerCase()}`,
        text: base.length
          ? 'Ajusta la búsqueda o los filtros.'
          : `Crea tu primer registro para comenzar a organizar la información.`,
        action: base.length ? null : el('button.btn.btn--primary', {
          text: etiquetaNuevo(R), onclick: () => abrirFormulario(resourceKey),
        }),
      },
    }));
  }

  pintar();
  return { pintar };
}

/* ════════════════════════════════════════════════════════════
   Formulario
   ════════════════════════════════════════════════════════════ */

export function abrirFormulario(resourceKey, record = null, { prefill = {}, onSaved } = {}) {
  const editorPropio = getEditor(resourceKey);
  if (editorPropio) return editorPropio(record, { prefill, onSaved });

  const R = RESOURCES[resourceKey];
  const esNuevo = !record?.id;
  const valores = esNuevo ? nuevoRegistro(resourceKey, prefill) : { ...record };

  let form;
  const contenedor = el('div');

  const construir = () => {
    form = buildForm(R.fields, valores, S.ctx());
    // Recalcula campos condicionales al cambiar el disparador.
    for (const key of ['etapa', 'empresa_id']) {
      const ctrl = form.node.querySelector(`[id^="f-${key}-"]`);
      ctrl?.addEventListener('change', () => {
        Object.assign(valores, form.read());
        clear(contenedor);
        construir();
      });
    }
    contenedor.appendChild(form.node);
  };
  construir();

  const d = drawer({
    title: esNuevo ? etiquetaNuevo(R) : `Editar ${R.singular.toLowerCase()}`,
    subtitle: esNuevo ? R.label : (record[R.titleField] || ''),
    body: contenedor,
    actions: [
      el('div.spacer'),
      el('button.btn', { text: 'Cancelar', onclick: () => d.close() }),
      el('button.btn.btn--primary', { text: 'Guardar', onclick: guardar }),
    ],
  });

  async function guardar() {
    if (!form.validate()) return;
    const datos = { ...valores, ...form.read() };
    try {
      const saved = await S.save(resourceKey, datos);
      // Un solo contacto principal por empresa.
      if (resourceKey === 'contactos' && saved.principal) {
        const otros = S.contactosDe(saved.empresa_id).filter(c => c.id !== saved.id && c.principal);
        for (const o of otros) await S.save('contactos', { ...o, principal: false });
      }
      toast(esNuevo ? `${R.singular} creada` : 'Cambios guardados', 'good');
      d.close();
      onSaved?.(saved);
    } catch (err) {
      toast(`No se pudo guardar: ${err.message}`, 'error', 6000);
    }
  }

  return d;
}

export async function eliminar(resourceKey, row) {
  const R = RESOURCES[resourceKey];
  const nombre = row[R.titleField] || 'este registro';
  const dependientes = contarDependientes(resourceKey, row.id);
  const ok = await confirmar({
    title: `Eliminar ${R.singular.toLowerCase()}`,
    message: dependientes
      ? `Se eliminará «${nombre}» y ${dependientes} registro(s) relacionado(s). Esta acción no se puede deshacer.`
      : `Se eliminará «${nombre}». Esta acción no se puede deshacer.`,
    ok: 'Eliminar',
    danger: true,
  });
  if (!ok) return false;
  try {
    await S.removeCascada(resourceKey, row.id);
    toast(`${R.singular} eliminada`, 'good');
    return true;
  } catch (err) {
    toast(`No se pudo eliminar: ${err.message}`, 'error', 6000);
    return false;
  }
}

function contarDependientes(resourceKey, id) {
  const mapa = {
    empresas: [['contactos', 'empresa_id'], ['catalogo', 'empresa_id'], ['oportunidades', 'empresa_id'], ['cotizaciones', 'empresa_id'], ['actividades', 'empresa_id']],
    materiales: [['catalogo', 'material_id']],
    oportunidades: [['actividades', 'oportunidad_id']],
  }[resourceKey] || [];
  return mapa.reduce((acc, [t, c]) => acc + S.list(t).filter(r => r[c] === id).length, 0);
}

/* ════════════════════════════════════════════════════════════
   Ficha de detalle
   ════════════════════════════════════════════════════════════ */

export function abrirDetalle(resourceKey, id) {
  const R = RESOURCES[resourceKey];
  const row = S.byId(resourceKey, id);
  if (!row) { toast('El registro ya no existe', 'warn'); return; }

  const cuerpo = el('div');

  const pintar = () => {
    const actual = S.byId(resourceKey, id);
    if (!actual) { d.close(); return; }
    clear(cuerpo);

    /* Datos del registro agrupados como en el formulario */
    let grupo = null, grid = null;
    for (const f of R.fields) {
      if (f.when && !f.when(actual, S.ctx())) continue;
      const v = actual[f.key];
      if (f.group && f.group !== grupo) {
        grupo = f.group;
        cuerpo.appendChild(el('div.section__title', { text: grupo, style: { marginTop: '20px' } }));
        grid = el('div.detail-grid');
        cuerpo.appendChild(grid);
      }
      if (!grid) { grid = el('div.detail-grid'); cuerpo.appendChild(grid); }
      grid.appendChild(el('div.dl', {}, [
        el('div.dl__k', { text: f.label }),
        valorLegible(resourceKey, actual, f),
      ]));
    }

    /* Secciones relacionadas */
    const secciones = getSecciones(resourceKey);
    if (secciones) for (const s of secciones(actual, { pintar, close: () => d.close() })) cuerpo.appendChild(s);

    cuerpo.appendChild(el('div.section', {}, [
      el('div.section__title', { text: 'Trazabilidad' }),
      el('div.detail-grid', {}, [
        el('div.dl', {}, [el('div.dl__k', { text: 'Creado' }), el('div.dl__v', { text: `${fechaHora(actual.created_at)}${actual.created_by ? ' · ' + actual.created_by : ''}` })]),
        el('div.dl', {}, [el('div.dl__k', { text: 'Última edición' }), el('div.dl__v', { text: `${desde(actual.updated_at)}${actual.updated_by ? ' · ' + actual.updated_by : ''}` })]),
      ]),
    ]));
  };

  let desuscribir = null;

  const d = drawer({
    title: row[R.titleField] || R.singular,
    subtitle: subtituloDetalle(resourceKey, row),
    body: cuerpo,
    onClose: () => desuscribir?.(),
    actions: [
      el('button.btn.btn--danger', { text: 'Eliminar', onclick: async () => { if (await eliminar(resourceKey, S.byId(resourceKey, id) || row)) d.close(); } }),
      el('div.spacer'),
      el('button.btn', { text: 'Cerrar', onclick: () => d.close() }),
      el('button.btn.btn--primary', {
        text: 'Editar',
        onclick: () => abrirFormulario(resourceKey, S.byId(resourceKey, id), { onSaved: pintar }),
      }),
    ],
  });

  pintar();
  desuscribir = S.on('change', ({ table }) => { if (table === resourceKey || table === '*') pintar(); });
  return d;
}

function subtituloDetalle(resourceKey, row) {
  switch (resourceKey) {
    case 'empresas': return [row.tipo, row.ciudad].filter(Boolean).join(' · ');
    case 'contactos': return [row.puesto, S.nombreEmpresa(row.empresa_id)].filter(Boolean).join(' · ');
    case 'materiales': return [row.sku, row.categoria].filter(Boolean).join(' · ');
    case 'oportunidades': return [S.nombreEmpresa(row.empresa_id), row.etapa].filter(Boolean).join(' · ');
    case 'cotizaciones': return [S.nombreEmpresa(row.empresa_id), row.estatus].filter(Boolean).join(' · ');
    case 'actividades': return [row.tipo, fecha(row.fecha)].filter(Boolean).join(' · ');
    default: return '';
  }
}

function valorLegible(resourceKey, row, f) {
  const v = row[f.key];
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return el('div.dl__v.empty-v', { text: '—' });

  if (f.type === 'checkbox') return el('div.dl__v', {}, [v ? chip('Sí', 'good') : chip('No', 'muted')]);
  if (f.type === 'tags') return el('div.dl__v', {}, [chipList(v)]);
  if (f.key === 'empresa_id') return el('div.dl__v', {}, [el('a', { text: S.nombreEmpresa(v), href: `#/empresas/${v}` })]);
  if (f.key === 'contacto_id') return el('div.dl__v', { text: S.nombreContacto(v) || '—' });
  if (f.key === 'material_id') return el('div.dl__v', { text: S.nombreMaterial(v) || '—' });
  if (f.key === 'oportunidad_id') return el('div.dl__v', { text: S.byId('oportunidades', v)?.titulo || '—' });
  if (f.type === 'currency') return el('div.dl__v', { text: money(v, row.moneda || 'MXN') });
  if (f.type === 'date') return el('div.dl__v', { text: fecha(v, { long: true }) });
  if (f.type === 'email') return el('div.dl__v', {}, [el('a', { text: v, href: `mailto:${v}` })]);
  if (f.type === 'tel') return el('div.dl__v', {}, [el('a', { text: v, href: `tel:${String(v).replace(/[^\d+]/g, '')}` })]);
  if (f.type === 'url') return el('div.dl__v', {}, [el('a', { text: v, href: v, target: '_blank', rel: 'noopener' })]);
  if (CHIP_FIELDS.has(f.key)) return el('div.dl__v', {}, [chip(v)]);
  if (f.key === 'probabilidad') return el('div.dl__v', { text: pct(v) });
  if (f.type === 'textarea') return el('div.dl__v', { text: v, style: { whiteSpace: 'pre-wrap' } });
  if (f.type === 'number') return el('div.dl__v', { text: num(v) });
  return el('div.dl__v', { text: String(v) });
}

/* ════════════════════════════════════════════════════════════
   Importar / exportar CSV
   ════════════════════════════════════════════════════════════ */

export function exportarCSV(resourceKey, rows) {
  const R = RESOURCES[resourceKey];
  if (!rows.length) { toast('No hay registros para exportar', 'warn'); return; }
  const cols = R.fields.map(f => f.key);
  const planas = rows.map(r => {
    const o = {};
    for (const c of cols) {
      let v = r[c];
      if (c === 'empresa_id') v = S.nombreEmpresa(r[c]);
      else if (c === 'material_id') v = S.nombreMaterial(r[c]);
      else if (c === 'contacto_id') v = S.nombreContacto(r[c]);
      o[c] = Array.isArray(v) ? v.join('; ') : v;
    }
    return o;
  });
  download(`enlace-${resourceKey}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(planas, cols), 'text/csv;charset=utf-8');
  toast(`${rows.length} registro(s) exportado(s)`, 'good');
}

export async function importarCSV(resourceKey) {
  const R = RESOURCES[resourceKey];
  const archivo = await pickFile('.csv');
  if (!archivo) return;

  let filas;
  try { filas = parseCSV(archivo.text); }
  catch { toast('No se pudo leer el CSV', 'error'); return; }
  if (!filas.length) { toast('El archivo está vacío', 'warn'); return; }

  const columnasValidas = new Set(R.fields.map(f => f.key));
  const encontradas = Object.keys(filas[0]).filter(k => columnasValidas.has(k));

  const cuerpo = el('div.stack', {}, [
    el('div.callout', { text: `Se detectaron ${filas.length} renglones y ${encontradas.length} columnas reconocidas.` }),
    el('div', {}, [
      el('div.dl__k', { text: 'Columnas que se importarán' }),
      el('div.chips', { style: { marginTop: '8px' } }, encontradas.map(c => el('span.chip.chip--plain', { text: c }))),
    ]),
    encontradas.length !== Object.keys(filas[0]).length
      ? el('div.callout.callout--warn', {
          text: 'Las columnas no reconocidas se ignorarán: ' +
            Object.keys(filas[0]).filter(k => !columnasValidas.has(k)).join(', '),
        })
      : null,
    el('div.callout', { text: 'Las referencias a empresas y materiales se resuelven por nombre exacto; si no existen, se crean automáticamente.' }),
  ]);

  const d = dialog({
    title: `Importar ${R.label.toLowerCase()}`,
    body: cuerpo,
    actions: [
      el('div.spacer', { style: { flex: '1' } }),
      el('button.btn', { text: 'Cancelar', onclick: () => d.close() }),
      el('button.btn.btn--primary', { text: `Importar ${filas.length}`, onclick: ejecutar }),
    ],
  });

  async function ejecutar() {
    d.close();
    try {
      const registros = [];
      for (const fila of filas) {
        const reg = nuevoRegistro(resourceKey);
        for (const f of R.fields) {
          if (!(f.key in fila)) continue;
          const raw = fila[f.key];
          if (raw === '') continue;
          if (f.type === 'tags') reg[f.key] = raw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
          else if (f.type === 'checkbox') reg[f.key] = /^(s[ií]|true|1|x|yes)$/i.test(raw);
          else if (f.type === 'number' || f.type === 'currency') reg[f.key] = Number(String(raw).replace(/[^\d.-]/g, '')) || 0;
          else reg[f.key] = raw;
        }
        if ('empresa_id' in fila || reg.empresa_id) reg.empresa_id = await resolverEmpresa(fila.empresa_id || reg.empresa_id);
        if ('material_id' in fila || reg.material_id) reg.material_id = await resolverMaterial(fila.material_id || reg.material_id);
        registros.push(reg);
      }
      await S.saveMany(resourceKey, registros);
      toast(`${registros.length} registro(s) importado(s)`, 'good');
    } catch (err) {
      toast(`Error al importar: ${err.message}`, 'error', 7000);
    }
  }
}

async function resolverEmpresa(valor) {
  if (!valor) return null;
  const existente = S.list('empresas').find(e => e.id === valor || norm(e.nombre) === norm(valor));
  if (existente) return existente.id;
  const nueva = await S.save('empresas', nuevoRegistro('empresas', { nombre: String(valor) }));
  return nueva.id;
}

async function resolverMaterial(valor) {
  if (!valor) return null;
  const existente = S.list('materiales').find(m => m.id === valor || norm(m.nombre) === norm(valor) || norm(m.sku) === norm(valor));
  if (existente) return existente.id;
  const nuevo = await S.save('materiales', nuevoRegistro('materiales', { nombre: String(valor) }));
  return nuevo.id;
}
