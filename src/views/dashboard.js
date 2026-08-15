/* ============================================================
   Tablero — indicadores, embudo, pendientes y alertas
   ============================================================ */

import { el, clear, chip, barList, emptyState } from '../lib/ui.js';
import * as S from '../data/store.js';
import { ETAPAS_ABIERTAS, totalesCotizacion, margenPct } from '../data/schema.js';
import { abrirDetalle, abrirFormulario } from './crud.js';
import { navegar } from '../router.js';
import { money, moneyShort, num, pct, fecha, desde, sum, sortBy, diasHasta, groupBy } from '../lib/utils.js';

/* Rampa ordinal azul: el paso más claro sigue legible sobre la superficie. */
const RAMPA = ['var(--seq-250)', 'var(--seq-350)', 'var(--seq-450)', 'var(--seq-550)'];

export function renderDashboard(host) {
  clear(host);

  const empresas = S.list('empresas');
  const materiales = S.list('materiales');
  const oportunidades = S.list('oportunidades');
  const cotizaciones = S.list('cotizaciones');
  const actividades = S.list('actividades');
  const catalogo = S.list('catalogo');

  const abiertas = oportunidades.filter(o => ETAPAS_ABIERTAS.includes(o.etapa));
  const ganadas = oportunidades.filter(o => o.etapa === 'Ganada');
  const perdidas = oportunidades.filter(o => o.etapa === 'Perdida');
  const cotAprobadas = cotizaciones.filter(c => c.estatus === 'Aprobada');
  const cerradas = ganadas.length + perdidas.length;

  /* Todos los agregados se expresan en la moneda base configurada. */
  const BASE = S.monedaBase();
  const M = (v) => money(v, BASE);
  const Mk = (v) => moneyShort(v, BASE);
  const ponderado = S.sumaBase(abiertas, o => (Number(o.valor) || 0) * ((Number(o.probabilidad) || 0) / 100));
  const valorTotalCot = (c) => S.aBase(totalesCotizacion(c).total, c.moneda);

  const saludo = (() => {
    const h = new Date().getHours();
    const nombre = S.store.usuario ? `, ${S.store.usuario.split(' ')[0]}` : '';
    return `${h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'}${nombre}`;
  })();

  host.appendChild(el('div.view__head', {}, [
    el('div', {}, [
      el('h1.view__title', { text: saludo }),
      el('div.view__sub', { text: `${empresas.length} empresa(s) · ${materiales.length} material(es) · ${catalogo.length} precio(s) acordado(s)` }),
    ]),
    el('div.view__tools', {}, [
      el('button.btn', { text: '＋ Empresa', onclick: () => abrirFormulario('empresas', null, { onSaved: () => navegar('#/') }) }),
      el('button.btn', { text: '＋ Material', onclick: () => abrirFormulario('materiales', null, { onSaved: () => navegar('#/') }) }),
      el('button.btn.btn--primary', { text: '＋ Cotización', onclick: () => abrirFormulario('cotizaciones', null, { onSaved: () => navegar('#/') }) }),
    ]),
  ]));

  /* ── Indicadores ─────────────────────────────────────── */
  host.appendChild(el('div.kpis', {}, [
    kpi('Pipeline abierto', M(S.sumaBase(abiertas, 'valor')), `${abiertas.length} oportunidad(es) en curso`),
    kpi('Valor ponderado', M(ponderado), 'Ajustado por probabilidad de cierre'),
    kpi('Ganado', M(S.sumaBase(ganadas, 'valor')), cerradas ? `Tasa de cierre ${Math.round((ganadas.length / cerradas) * 100)}%` : 'Sin cierres aún'),
    kpi('Cotizado aprobado', M(sum(cotAprobadas, valorTotalCot)), `${cotAprobadas.length} de ${cotizaciones.length} cotización(es)`),
  ]));

  /* ── Embudo + pendientes ─────────────────────────────── */
  const fila1 = el('div.grid-2', { style: { marginBottom: 'var(--sp-4)' } });

  /* Embudo por etapa abierta (rampa ordinal, una sola serie) */
  const maxEtapa = Math.max(1, ...ETAPAS_ABIERTAS.map(k => S.sumaBase(abiertas.filter(o => o.etapa === k), 'valor')));
  const embudo = el('div.funnel', {}, ETAPAS_ABIERTAS.map((k, i) => {
    const enEtapa = abiertas.filter(o => o.etapa === k);
    const valor = S.sumaBase(enEtapa, 'valor');
    const color = RAMPA[Math.min(i, RAMPA.length - 1)];
    return el('div.funnel__row', {}, [
      el('div.funnel__fill', { style: { width: `${(valor / maxEtapa) * 100}%`, background: color } }),
      el('div.funnel__name', {}, [
        el('span.funnel__swatch', { style: { background: color } }),
        k,
      ]),
      el('div.funnel__meta', {}, [
        el('span', { text: `${enEtapa.length}` }),
        el('span', { text: M(valor), style: { fontWeight: '600' } }),
      ]),
    ]);
  }));

  fila1.appendChild(tarjeta(`Embudo por etapa · valor abierto (${BASE})`, embudo, {
    accion: el('button.btn.btn--sm', { text: 'Ver tablero', onclick: () => navegar('#/embudo') }),
    pie: abiertas.length ? null : 'Aún no hay oportunidades abiertas.',
  }));

  /* Pendientes de hoy y atrasados */
  const pendientes = sortBy(actividades.filter(a => a.estatus === 'Pendiente'), 'fecha');
  const atrasadas = pendientes.filter(a => (diasHasta(a.fecha) ?? 99) < 0);
  const hoy = pendientes.filter(a => diasHasta(a.fecha) === 0);
  const proximas = pendientes.filter(a => (diasHasta(a.fecha) ?? -1) > 0).slice(0, 6);

  const listaPend = [...atrasadas, ...hoy, ...proximas].slice(0, 9);
  const pendNode = listaPend.length
    ? el('div.mini-list', {}, listaPend.map(a => {
        const d = diasHasta(a.fecha);
        return el('div.mini-row', { onclick: () => abrirDetalle('actividades', a.id), style: { cursor: 'pointer' } }, [
          el('div.mini-row__main', {}, [
            el('div.mini-row__title', { text: a.asunto }),
            el('div.mini-row__sub', { text: [a.tipo, S.nombreEmpresa(a.empresa_id), a.responsable].filter(Boolean).join(' · ') }),
          ]),
          d < 0 ? chip(`${Math.abs(d)} d tarde`, 'critical') : d === 0 ? chip('Hoy', 'warning') : el('span.muted', { text: fecha(a.fecha), style: { fontSize: '12px' } }),
        ]);
      }))
    : el('div.empty', { style: { padding: '28px 12px' } }, [
        el('div.empty__ico', { text: '✓' }),
        el('div.empty__title', { text: 'Todo al día' }),
        el('div.empty__text', { text: 'No hay actividades pendientes.' }),
      ]);

  fila1.appendChild(tarjeta(
    `Pendientes${atrasadas.length ? ` · ${atrasadas.length} atrasada(s)` : ''}`,
    pendNode,
    { accion: el('button.btn.btn--sm', { text: 'Ver agenda', onclick: () => navegar('#/actividades') }) },
  ));

  host.appendChild(fila1);

  /* ── Empresas y materiales ───────────────────────────── */
  const fila2 = el('div.grid-2', { style: { marginBottom: 'var(--sp-4)' } });

  /* Top empresas por valor ganado + cotizado aprobado */
  const porEmpresa = empresas.map(e => ({
    label: e.nombre,
    value: S.sumaBase(oportunidades.filter(o => o.empresa_id === e.id && o.etapa === 'Ganada'), 'valor')
      + sum(cotAprobadas.filter(c => c.empresa_id === e.id), valorTotalCot),
    id: e.id,
  })).filter(x => x.value > 0);

  fila2.appendChild(tarjeta(
    `Empresas por negocio cerrado (${BASE})`,
    porEmpresa.length
      ? barList(sortBy(porEmpresa, 'value', 'desc').slice(0, 8), { format: Mk })
      : vacio('Sin negocio cerrado todavía', 'Marca una oportunidad como Ganada o aprueba una cotización.'),
  ));

  /* Materiales más presentes en cotizaciones */
  const conteoMat = new Map();
  for (const c of cotizaciones) {
    for (const it of c.items || []) {
      if (!it.material_id) continue;
      const imp = (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0) * (1 - (Number(it.descuento_pct) || 0) / 100);
      conteoMat.set(it.material_id, (conteoMat.get(it.material_id) || 0) + S.aBase(imp, c.moneda));
    }
  }
  const topMat = [...conteoMat.entries()]
    .map(([id, v]) => ({ label: S.nombreMaterial(id) || '(eliminado)', value: v, id }));

  fila2.appendChild(tarjeta(
    `Materiales más cotizados (${BASE})`,
    topMat.length
      ? barList(sortBy(topMat, 'value', 'desc').slice(0, 8), { format: Mk })
      : vacio('Sin datos de cotizaciones', 'Agrega renglones a tus cotizaciones para ver este análisis.'),
  ));

  host.appendChild(fila2);

  /* ── Alertas y actividad reciente ────────────────────── */
  const fila3 = el('div.grid-2');

  const alertas = [];

  for (const m of materiales) {
    if (m.stock != null && m.stock_min != null && Number(m.stock) <= Number(m.stock_min)) {
      alertas.push({ tono: 'warning', titulo: `Existencia baja: ${m.nombre}`, sub: `${num(m.stock)} ${m.unidad || ''} · mínimo ${num(m.stock_min)}`, go: () => abrirDetalle('materiales', m.id) });
    }
    const mg = margenPct(m);
    if (mg != null && mg < 5) {
      alertas.push({ tono: 'serious', titulo: `Margen bajo: ${m.nombre}`, sub: `${pct(mg)} sobre precio de lista`, go: () => abrirDetalle('materiales', m.id) });
    }
  }
  for (const c of cotizaciones.filter(c => c.estatus === 'Enviada')) {
    const d = diasHasta(c.vigencia);
    if (d != null && d <= 5) {
      alertas.push({
        tono: d < 0 ? 'critical' : 'warning',
        titulo: `${c.folio} ${d < 0 ? 'venció' : 'vence pronto'}`,
        sub: `${S.nombreEmpresa(c.empresa_id)} · ${money(totalesCotizacion(c).total, c.moneda)}`,
        go: () => abrirDetalle('cotizaciones', c.id),
      });
    }
  }
  for (const cp of S.list('catalogo')) {
    const d = diasHasta(cp.vigencia);
    if (d != null && d < 0 && cp.vigente !== false) {
      alertas.push({
        tono: 'serious',
        titulo: `Precio vencido: ${S.nombreMaterial(cp.material_id)}`,
        sub: `${S.nombreEmpresa(cp.empresa_id)} · venció ${fecha(cp.vigencia)}`,
        go: () => abrirDetalle('catalogo', cp.id),
      });
    }
  }
  for (const e of empresas.filter(e => e.estatus === 'Activo')) {
    const ultima = sortBy(S.actividadesDe(e.id), 'fecha', 'desc')[0];
    const d = ultima ? diasHasta(ultima.fecha) : null;
    if (!ultima || (d != null && d < -60)) {
      alertas.push({ tono: 'muted', titulo: `Sin seguimiento: ${e.nombre}`, sub: ultima ? `Última actividad ${fecha(ultima.fecha)}` : 'Nunca se ha registrado actividad', go: () => navegar(`#/empresas/${e.id}`) });
    }
  }

  fila3.appendChild(tarjeta(
    `Alertas${alertas.length ? ` · ${alertas.length}` : ''}`,
    alertas.length
      ? el('div.mini-list', {}, alertas.slice(0, 10).map(a => el('div.mini-row', { onclick: a.go, style: { cursor: 'pointer' } }, [
          chip(' ', a.tono),
          el('div.mini-row__main', {}, [
            el('div.mini-row__title', { text: a.titulo }),
            el('div.mini-row__sub', { text: a.sub }),
          ]),
        ])))
      : vacio('Sin alertas', 'No hay existencias bajas, precios vencidos ni cotizaciones por caducar.'),
  ));

  const recientes = sortBy(
    [...empresas.map(r => ({ r, t: 'empresas' })), ...materiales.map(r => ({ r, t: 'materiales' })),
     ...oportunidades.map(r => ({ r, t: 'oportunidades' })), ...cotizaciones.map(r => ({ r, t: 'cotizaciones' })),
     ...actividades.map(r => ({ r, t: 'actividades' }))]
      .map(x => ({ ...x, updated_at: x.r.updated_at })),
    'updated_at', 'desc',
  ).slice(0, 10);

  fila3.appendChild(tarjeta(
    'Actividad del equipo',
    recientes.length
      ? el('div.mini-list', {}, recientes.map(({ r, t }) => el('div.mini-row', { onclick: () => abrirDetalle(t, r.id), style: { cursor: 'pointer' } }, [
          el('div.mini-row__main', {}, [
            el('div.mini-row__title', { text: r.nombre || r.titulo || r.folio || r.asunto || '(registro)' }),
            el('div.mini-row__sub', { text: `${t} · ${r.updated_by || r.created_by || 'sistema'}` }),
          ]),
          el('span.muted', { text: desde(r.updated_at), style: { fontSize: '11.5px' } }),
        ])))
      : vacio('Sin movimientos', 'Los cambios de ambos socios aparecerán aquí.'),
  ));

  host.appendChild(fila3);
}

/* ── Piezas ──────────────────────────────────────────────── */

function kpi(label, value, foot) {
  return el('div.kpi', {}, [
    el('div.kpi__label', { text: label }),
    el('div.kpi__value', { text: value }),
    foot ? el('div.kpi__foot', { text: foot }) : null,
  ]);
}

function tarjeta(titulo, contenido, { accion, pie } = {}) {
  return el('div.card', {}, [
    el('div.card__head', {}, [
      el('div.card__title', { text: titulo }),
      accion ? el('div.card__tools', {}, [accion]) : null,
    ]),
    el('div.card__body', {}, [contenido, pie ? el('div.muted', { text: pie, style: { fontSize: '12px', marginTop: '10px' } }) : null]),
  ]);
}

function vacio(titulo, texto) {
  return el('div.empty', { style: { padding: '26px 12px' } }, [
    el('div.empty__title', { text: titulo }),
    el('div.empty__text', { text: texto }),
  ]);
}
