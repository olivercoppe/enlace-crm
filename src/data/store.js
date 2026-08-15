/* ============================================================
   Store central — estado, persistencia y sincronización
   ============================================================ */

import { ALL_TABLES, DATA_TABLES } from './tables.js';
import { createLocalAdapter } from './local.js';
import { createSupabaseAdapter } from './supabase.js';
import { uid, nowISO, ls, sortBy } from '../lib/utils.js';

export const AJUSTES_DEFAULT = {
  id: 'global',
  empresa_nombre: 'Enlace',
  razon_social: '',
  rfc: '',
  direccion: '',
  telefono: '',
  email: '',
  sitio_web: '',
  moneda_base: 'MXN',
  tc_usd: 17.5,
  tc_eur: 19.5,
  iva_pct: 16,
  prefijo_cotizacion: 'COT',
  condiciones_default: '30 días',
  vigencia_dias: 15,
  equipo: ['Socio 1', 'Socio 2'],
  notas_cotizacion: 'Precios sujetos a cambio sin previo aviso. Los precios no incluyen flete salvo indicación contraria.',
};

const listeners = { change: [], status: [] };

export const store = {
  db: Object.fromEntries(ALL_TABLES.map(t => [t, []])),
  ajustes: { ...AJUSTES_DEFAULT },
  adapter: null,
  mode: 'local',
  status: 'local',      // local | syncing | live | error
  statusDetail: '',
  usuario: ls.get('enlace-crm:usuario', '') || '',
  session: null,
  ready: false,
};

/* ── Eventos ─────────────────────────────────────────────── */

export function on(event, cb) {
  (listeners[event] ||= []).push(cb);
  return () => { listeners[event] = listeners[event].filter(f => f !== cb); };
}

const emit = (event, payload) => { for (const cb of listeners[event] || []) cb(payload); };

export function setStatus(state, detail = '') {
  store.status = state;
  store.statusDetail = detail;
  emit('status', { state, detail });
}

/* ── Inicialización ──────────────────────────────────────── */

export function getConfig() {
  const cfg = window.ENLACE_CONFIG || {};
  const url = String(cfg.supabaseUrl || '').trim();
  const key = String(cfg.supabaseAnonKey || '').trim();
  const valid = /^https:\/\/.+\.supabase\.co\/?$/.test(url) && key.length > 20;
  return { ...cfg, supabaseUrl: url, supabaseAnonKey: key, cloudReady: valid };
}

export async function init() {
  const cfg = getConfig();

  if (cfg.cloudReady) {
    try {
      const adapter = createSupabaseAdapter({ url: cfg.supabaseUrl, anonKey: cfg.supabaseAnonKey });
      const { session } = await adapter.init();
      adapter.onStatus((state, detail) => setStatus(state, detail));
      adapter.onChange(applyRemoteChange);
      adapter.onAuthChange((s) => { store.session = s; });
      store.adapter = adapter;
      store.mode = 'supabase';
      store.session = session;
      setStatus('syncing', 'Conectando…');
      if (session) await loadAll();
      store.ready = true;
      return { mode: 'supabase', needsLogin: !session };
    } catch (err) {
      console.error('[store] falló Supabase, se usa modo local', err);
      setStatus('error', err.message || 'Error de conexión');
    }
  }

  const adapter = createLocalAdapter();
  await adapter.init();
  adapter.onChange(({ table, rows }) => {
    if (table === '*') return;
    setTable(table, rows);
    emit('change', { table, source: 'remote' });
  });
  store.adapter = adapter;
  store.mode = 'local';
  await loadAll();
  setStatus('local');
  store.ready = true;
  return { mode: 'local', needsLogin: false };
}

export async function loadAll() {
  const data = await store.adapter.loadAll();
  for (const t of ALL_TABLES) setTable(t, data[t] || []);
  if (store.mode === 'supabase') {
    store.adapter.subscribeRealtime();
  }
  emit('change', { table: '*', source: 'load' });
}

function setTable(table, rows) {
  if (table === 'ajustes') {
    const row = (rows || []).find(r => r.id === 'global') || rows?.[0];
    store.ajustes = { ...AJUSTES_DEFAULT, ...(row || {}) };
    store.db.ajustes = [store.ajustes];
    return;
  }
  store.db[table] = rows || [];
}

/* ── Cambios remotos en tiempo real ──────────────────────── */

function applyRemoteChange({ table, event, row, oldId }) {
  if (!ALL_TABLES.includes(table)) return;

  if (table === 'ajustes') {
    if (row) store.ajustes = { ...AJUSTES_DEFAULT, ...row };
    emit('change', { table, source: 'remote' });
    return;
  }

  const rows = store.db[table] || [];
  if (event === 'DELETE') {
    store.db[table] = rows.filter(r => r.id !== oldId);
  } else if (row) {
    const i = rows.findIndex(r => r.id === row.id);
    if (i >= 0) rows[i] = row; else rows.push(row);
    store.db[table] = [...rows];
  }
  emit('change', { table, source: 'remote' });
}

/* ── Lectura ─────────────────────────────────────────────── */

export const list = (table) => store.db[table] || [];

export const byId = (table, id) => (store.db[table] || []).find(r => r.id === id) || null;

export const nombreEmpresa = (id) => byId('empresas', id)?.nombre || '';
export const nombreContacto = (id) => byId('contactos', id)?.nombre || '';
export const nombreMaterial = (id) => byId('materiales', id)?.nombre || '';

export const equipo = () => {
  const base = store.ajustes.equipo?.length ? store.ajustes.equipo : AJUSTES_DEFAULT.equipo;
  const extra = store.usuario && !base.includes(store.usuario) ? [store.usuario] : [];
  return [...base, ...extra];
};

/** Contexto que consumen las opciones dinámicas del schema. */
export const ctx = () => ({ db: store.db, usuarios: equipo(), ajustes: store.ajustes });

/* ── Escritura ───────────────────────────────────────────── */

function limpiar(record) {
  const out = {};
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined) continue;
    out[k] = v === '' ? null : v;
  }
  return out;
}

export async function save(table, record) {
  const isNew = !record.id;
  const row = limpiar({
    ...record,
    id: record.id || uid(),
    created_at: record.created_at || nowISO(),
    updated_at: nowISO(),
    created_by: record.created_by || store.usuario || null,
    updated_by: store.usuario || null,
  });

  // Optimista: refleja el cambio de inmediato.
  const rows = [...(store.db[table] || [])];
  const i = rows.findIndex(r => r.id === row.id);
  if (i >= 0) rows[i] = row; else rows.push(row);
  store.db[table] = rows;
  emit('change', { table, source: 'local' });

  try {
    const saved = await store.adapter.upsert(table, row);
    if (saved && saved.id) {
      const idx = store.db[table].findIndex(r => r.id === saved.id);
      if (idx >= 0) { store.db[table][idx] = saved; emit('change', { table, source: 'local' }); }
    }
    return saved || row;
  } catch (err) {
    // Revertir si falla.
    if (isNew) store.db[table] = store.db[table].filter(r => r.id !== row.id);
    emit('change', { table, source: 'local' });
    throw err;
  }
}

export async function saveMany(table, records) {
  const prepared = records.map(r => limpiar({
    ...r,
    id: r.id || uid(),
    created_at: r.created_at || nowISO(),
    updated_at: nowISO(),
    created_by: r.created_by || store.usuario || null,
    updated_by: store.usuario || null,
  }));
  const rows = [...(store.db[table] || [])];
  for (const row of prepared) {
    const i = rows.findIndex(r => r.id === row.id);
    if (i >= 0) rows[i] = row; else rows.push(row);
  }
  store.db[table] = rows;
  emit('change', { table, source: 'local' });
  await store.adapter.upsertMany(table, prepared);
  return prepared;
}

export async function remove(table, id) {
  const previo = store.db[table] || [];
  store.db[table] = previo.filter(r => r.id !== id);
  emit('change', { table, source: 'local' });
  try {
    await store.adapter.remove(table, id);
  } catch (err) {
    store.db[table] = previo;
    emit('change', { table, source: 'local' });
    throw err;
  }
}

/** Borra un registro y todo lo que cuelga de él. */
export async function removeCascada(table, id) {
  const hijos = {
    empresas: [['contactos', 'empresa_id'], ['catalogo', 'empresa_id'], ['oportunidades', 'empresa_id'], ['cotizaciones', 'empresa_id'], ['actividades', 'empresa_id']],
    materiales: [['catalogo', 'material_id']],
    oportunidades: [['actividades', 'oportunidad_id']],
    contactos: [],
    catalogo: [], cotizaciones: [], actividades: [],
  }[table] || [];

  for (const [tabla, campo] of hijos) {
    const ids = list(tabla).filter(r => r[campo] === id).map(r => r.id);
    if (!ids.length) continue;
    store.db[tabla] = list(tabla).filter(r => r[campo] !== id);
    await store.adapter.removeMany(tabla, ids);
  }
  await remove(table, id);
  emit('change', { table: '*', source: 'local' });
}

export async function saveAjustes(patch) {
  const next = { ...store.ajustes, ...patch, id: 'global', updated_at: nowISO() };
  store.ajustes = next;
  emit('change', { table: 'ajustes', source: 'local' });
  await store.adapter.upsert('ajustes', limpiar(next));
  return next;
}

export function setUsuario(nombre) {
  store.usuario = nombre;
  ls.set('enlace-crm:usuario', nombre);
  emit('change', { table: 'usuario', source: 'local' });
}

/* ── Respaldo / restauración ─────────────────────────────── */

export function exportarJSON() {
  return JSON.stringify({
    _app: 'enlace-crm',
    _version: 1,
    _exported_at: nowISO(),
    ajustes: store.ajustes,
    ...Object.fromEntries(DATA_TABLES.map(t => [t, store.db[t]])),
  }, null, 2);
}

export async function importarJSON(text, { reemplazar = false } = {}) {
  const data = JSON.parse(text);
  if (data._app !== 'enlace-crm') throw new Error('El archivo no es un respaldo de Enlace CRM.');

  if (reemplazar) {
    const db = Object.fromEntries(ALL_TABLES.map(t => [t, t === 'ajustes' ? [{ ...AJUSTES_DEFAULT, ...(data.ajustes || {}), id: 'global' }] : (data[t] || [])]));
    await store.adapter.replaceAll(db);
    await loadAll();
    return;
  }
  for (const t of DATA_TABLES) {
    const rows = data[t] || [];
    if (rows.length) await saveMany(t, rows);
  }
  if (data.ajustes) await saveAjustes(data.ajustes);
}

/* ── Consultas derivadas ─────────────────────────────────── */

export const contactosDe = (empresaId) => list('contactos').filter(c => c.empresa_id === empresaId);
export const catalogoDe = (empresaId) => list('catalogo').filter(c => c.empresa_id === empresaId);
export const catalogoDeMaterial = (materialId) => list('catalogo').filter(c => c.material_id === materialId);
export const oportunidadesDe = (empresaId) => list('oportunidades').filter(o => o.empresa_id === empresaId);
export const cotizacionesDe = (empresaId) => list('cotizaciones').filter(c => c.empresa_id === empresaId);
export const actividadesDe = (empresaId) => sortBy(list('actividades').filter(a => a.empresa_id === empresaId), 'fecha', 'desc');

/* ── Conversión a moneda base ────────────────────────────── */

/** Tipo de cambio de `moneda` respecto a la moneda base configurada. */
export function tipoCambio(moneda) {
  const base = store.ajustes.moneda_base || 'MXN';
  if (!moneda || moneda === base) return 1;
  const aMXN = { MXN: 1, USD: Number(store.ajustes.tc_usd) || 1, EUR: Number(store.ajustes.tc_eur) || 1 };
  const origen = aMXN[moneda] ?? 1;
  const destino = aMXN[base] ?? 1;
  return origen / destino;
}

/** Convierte un importe a la moneda base para poder sumarlo con otros. */
export const aBase = (valor, moneda) => (Number(valor) || 0) * tipoCambio(moneda);

/** Suma una colección convirtiendo cada importe a moneda base. */
export const sumaBase = (rows, campo = 'valor', campoMoneda = 'moneda') =>
  rows.reduce((acc, r) => acc + aBase(
    typeof campo === 'function' ? campo(r) : r[campo],
    typeof campoMoneda === 'function' ? campoMoneda(r) : r[campoMoneda],
  ), 0);

export const monedaBase = () => store.ajustes.moneda_base || 'MXN';

/** Mejor precio de compra registrado para un material. */
export function mejorProveedor(materialId) {
  const ofertas = list('catalogo')
    .filter(c => c.material_id === materialId && c.rol === 'Compra' && Number(c.precio) > 0);
  if (!ofertas.length) return null;
  return ofertas.reduce((best, o) => (aBase(o.precio, o.moneda) < aBase(best.precio, best.moneda) ? o : best));
}
