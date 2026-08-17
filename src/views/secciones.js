/* ============================================================
   Secciones relacionadas dentro de cada ficha de detalle
   ============================================================ */

import { el, chip, emptyState, toast } from '../lib/ui.js';
import * as S from '../data/store.js';
import { setSecciones } from './registry.js';
import { abrirFormulario, abrirDetalle } from './crud.js';
import { totalesCotizacion, margenPct, totalesProduccion } from '../data/schema.js';
import { money, fecha, num, pct, sortBy, sum, diasHasta } from '../lib/utils.js';

/* ── Bloques reutilizables ───────────────────────────────── */

function seccion(titulo, contenido, accion) {
  return el('div.section', {}, [
    el('div.section__title', {}, [titulo, accion || null]),
    contenido,
  ]);
}

function botonAgregar(texto, onclick) {
  return el('button.btn.btn--sm', { html: `<span class="btn__plus">＋</span> ${texto}`, onclick });
}

function miniLista(items, render, vacio = 'Sin registros.') {
  if (!items.length) return el('div.muted', { text: vacio, style: { fontSize: '13px', padding: '4px 0' } });
  return el('div.mini-list', {}, items.map(render));
}

function fila({ titulo, sub, valor, extra, onclick }) {
  return el('div.mini-row', { onclick, style: onclick ? { cursor: 'pointer' } : {} }, [
    el('div.mini-row__main', {}, [
      el('div.mini-row__title', { text: titulo }),
      sub ? el('div.mini-row__sub', { text: sub }) : null,
    ]),
    ...(extra || []),
    valor != null ? el('div.mini-row__val', { text: valor }) : null,
  ]);
}

/* ════════════════════════════════════════════════════════════
   Empresa
   ════════════════════════════════════════════════════════════ */

setSecciones('empresas', (empresa, { pintar }) => {
  const secciones = [];

  /* — Resumen comercial — */
  const cotis = S.cotizacionesDe(empresa.id);
  const oportunidades = S.oportunidadesDe(empresa.id);
  const ganadas = oportunidades.filter(o => o.etapa === 'Ganada');
  const abiertas = oportunidades.filter(o => !['Ganada', 'Perdida'].includes(o.etapa));
  const BASE = S.monedaBase();
  const facturado = sum(cotis.filter(c => c.estatus === 'Aprobada'), c => S.aBase(totalesCotizacion(c).total, c.moneda));

  secciones.push(seccion(`Resumen comercial (${BASE})`, el('div.detail-grid', {}, [
    el('div.dl', {}, [el('div.dl__k', { text: 'Negocio ganado' }), el('div.dl__v', { text: money(S.sumaBase(ganadas, 'valor'), BASE) })]),
    el('div.dl', {}, [el('div.dl__k', { text: 'Pipeline abierto' }), el('div.dl__v', { text: money(S.sumaBase(abiertas, 'valor'), BASE) })]),
    el('div.dl', {}, [el('div.dl__k', { text: 'Cotizado aprobado' }), el('div.dl__v', { text: money(facturado, BASE) })]),
    el('div.dl', {}, [el('div.dl__k', { text: 'Materiales ligados' }), el('div.dl__v', { text: num(S.catalogoDe(empresa.id).length, 0) })]),
  ])));

  /* — Contactos — */
  const contactos = sortBy(S.contactosDe(empresa.id), 'principal', 'desc');
  secciones.push(seccion(
    `Contactos (${contactos.length})`,
    miniLista(contactos, (c) => fila({
      titulo: c.nombre,
      sub: [c.puesto, c.email, c.movil].filter(Boolean).join(' · '),
      extra: c.principal ? [chip('Principal', 'accent')] : [],
      onclick: () => abrirDetalle('contactos', c.id),
    }), 'Aún no hay contactos en esta empresa.'),
    botonAgregar('Contacto', () => abrirFormulario('contactos', null, {
      prefill: { empresa_id: empresa.id }, onSaved: pintar,
    })),
  ));

  /* — Materiales y precios — */
  const cat = S.catalogoDe(empresa.id);
  const venta = cat.filter(c => c.rol === 'Venta');
  const compra = cat.filter(c => c.rol === 'Compra');

  const renderPrecio = (c) => {
    const m = S.byId('materiales', c.material_id);
    const vencido = c.vigencia && diasHasta(c.vigencia) < 0;
    return fila({
      titulo: m?.nombre || '(material eliminado)',
      sub: [m?.sku, c.unidad || m?.unidad, c.lead_time_dias != null ? `entrega ${c.lead_time_dias} d` : null,
        c.cantidad_minima ? `mín. ${num(c.cantidad_minima, 0)}` : null].filter(Boolean).join(' · '),
      extra: [
        c.descuento_pct ? chip(`-${num(c.descuento_pct, 1)}%`, 'accent') : null,
        vencido ? chip('Vencido', 'serious') : null,
      ].filter(Boolean),
      valor: money(c.precio, c.moneda || 'MXN'),
      onclick: () => abrirDetalle('catalogo', c.id),
    });
  };

  secciones.push(seccion(
    `Le vendemos (${venta.length})`,
    miniLista(venta, renderPrecio, 'No hay materiales asignados para venta a esta empresa.'),
    botonAgregar('Precio de venta', () => abrirFormulario('catalogo', null, {
      prefill: { empresa_id: empresa.id, rol: 'Venta', moneda: empresa.moneda || 'MXN' }, onSaved: pintar,
    })),
  ));

  secciones.push(seccion(
    `Nos suministra (${compra.length})`,
    miniLista(compra, renderPrecio, 'Esta empresa no tiene materiales registrados como proveedor.'),
    botonAgregar('Precio de compra', () => abrirFormulario('catalogo', null, {
      prefill: { empresa_id: empresa.id, rol: 'Compra', moneda: empresa.moneda || 'MXN' }, onSaved: pintar,
    })),
  ));

  /* — Oportunidades — */
  secciones.push(seccion(
    `Oportunidades (${oportunidades.length})`,
    miniLista(sortBy(oportunidades, 'cierre_estimado'), (o) => fila({
      titulo: o.titulo,
      sub: [fecha(o.cierre_estimado), o.responsable].filter(Boolean).join(' · '),
      extra: [chip(o.etapa)],
      valor: money(o.valor, o.moneda || 'MXN'),
      onclick: () => abrirDetalle('oportunidades', o.id),
    }), 'Sin oportunidades registradas.'),
    botonAgregar('Oportunidad', () => abrirFormulario('oportunidades', null, {
      prefill: { empresa_id: empresa.id, moneda: empresa.moneda || 'MXN' }, onSaved: pintar,
    })),
  ));

  /* — Cotizaciones — */
  secciones.push(seccion(
    `Cotizaciones (${cotis.length})`,
    miniLista(sortBy(cotis, 'fecha', 'desc'), (c) => fila({
      titulo: c.folio || '(sin folio)',
      sub: [fecha(c.fecha), `${(c.items || []).length} renglón(es)`].filter(Boolean).join(' · '),
      extra: [chip(c.estatus)],
      valor: money(totalesCotizacion(c).total, c.moneda || 'MXN'),
      onclick: () => abrirDetalle('cotizaciones', c.id),
    }), 'Sin cotizaciones.'),
    botonAgregar('Cotización', () => abrirFormulario('cotizaciones', null, {
      prefill: { empresa_id: empresa.id, moneda: empresa.moneda || 'MXN' }, onSaved: pintar,
    })),
  ));

  /* — Actividades — */
  const acts = S.actividadesDe(empresa.id).slice(0, 12);
  secciones.push(seccion(
    `Actividades recientes (${S.actividadesDe(empresa.id).length})`,
    miniLista(acts, (a) => fila({
      titulo: a.asunto,
      sub: [a.tipo, fecha(a.fecha), a.responsable].filter(Boolean).join(' · '),
      extra: [chip(a.estatus)],
      onclick: () => abrirDetalle('actividades', a.id),
    }), 'Sin actividades registradas.'),
    botonAgregar('Actividad', () => abrirFormulario('actividades', null, {
      prefill: { empresa_id: empresa.id, responsable: S.store.usuario }, onSaved: pintar,
    })),
  ));

  return secciones;
});

/* ════════════════════════════════════════════════════════════
   Material
   ════════════════════════════════════════════════════════════ */

setSecciones('materiales', (material, { pintar }) => {
  const secciones = [];
  const cat = S.catalogoDeMaterial(material.id);
  const proveedores = sortBy(cat.filter(c => c.rol === 'Compra'), 'precio', 'asc');
  const clientes = sortBy(cat.filter(c => c.rol === 'Venta'), 'precio', 'desc');

  /* — Costo de producción — */
  const prod = totalesProduccion(material);
  const MON = material.moneda || 'MXN';
  const enUso = material.usar_costo_produccion !== false && prod.conceptos > 0;

  secciones.push(seccion(
    `Costo de producción (${prod.conceptos} concepto${prod.conceptos === 1 ? '' : 's'})`,
    prod.conceptos
      ? el('div', {}, [
          el('div.mini-list', {}, (material.costos_produccion || []).map((c, i) => fila({
            titulo: `${i + 1}. ${c.concepto || c.categoria || 'Concepto'}`,
            sub: [
              c.categoria,
              `${num(c.cantidad)} ${c.unidad || ''}`.trim() + ` × ${money(c.costo_unitario, MON)}`,
            ].filter(Boolean).join(' · '),
            valor: money(prod.importe(c), MON),
          }))),
          el('div.totals', {}, [
            el('div.totals__row', {}, [
              el('span', { text: 'Total del lote' }),
              el('span', { text: money(prod.totalLote, MON) }),
            ]),
            el('div.totals__row', {}, [
              el('span', { text: 'Unidades por lote' }),
              el('span', { text: num(prod.unidades, 2) }),
            ]),
            el('div.totals__row.totals__row--grand', {}, [
              el('span', { text: 'Costo por unidad' }),
              el('span', { text: money(prod.costoUnitario, MON) }),
            ]),
            el('div.totals__row', { style: { marginTop: '6px' } }, [
              el('span', { style: { color: 'var(--ink-muted)', fontSize: '12.5px' }, text: 'Costo base del material' }),
              enUso ? chip('Calculado', 'good') : chip('Manual', 'muted'),
            ]),
          ]),
          prod.porCategoria.length > 1
            ? el('div', { style: { marginTop: '14px' } }, [
                el('div.dl__k', { text: 'Reparto por tipo de gasto', style: { marginBottom: '8px' } }),
                ...prod.porCategoria.map(({ categoria, monto }) => el('div.bar-row', {}, [
                  el('div.bar-row__label', { text: categoria, title: categoria }),
                  el('div.bar-row__track', {}, [
                    el('div.bar-row__fill', {
                      style: {
                        width: `${Math.max(2, (monto / prod.totalLote) * 100)}%`,
                        background: 'var(--seq-450)',
                      },
                    }),
                  ]),
                  el('div.bar-row__val', { text: money(monto, MON) }),
                ])),
              ])
            : null,
        ])
      : el('div.muted', {
          style: { fontSize: '13px', padding: '4px 0' },
          text: 'Sin desglose. Edita el material para anotar en qué se gasta al producirlo.',
        }),
    el('button.btn.btn--sm', {
      text: prod.conceptos ? '✎ Editar desglose' : '＋ Desglosar costo',
      onclick: () => abrirFormulario('materiales', material, { onSaved: pintar }),
    }),
  ));

  const m = margenPct(material);
  secciones.push(seccion('Rentabilidad', el('div.detail-grid', {}, [
    el('div.dl', {}, [el('div.dl__k', { text: 'Utilidad por unidad' }), el('div.dl__v', {
      text: (material.precio_lista != null && material.costo != null)
        ? money(Number(material.precio_lista) - Number(material.costo), material.moneda || 'MXN') : '—',
    })]),
    el('div.dl', {}, [el('div.dl__k', { text: 'Margen' }), el('div.dl__v', {}, [m == null ? el('span.muted', { text: '—' }) : chip(pct(m), m >= 25 ? 'good' : m >= 10 ? 'warning' : 'critical')])]),
    el('div.dl', {}, [el('div.dl__k', { text: 'Mejor precio de compra' }), el('div.dl__v', {
      text: proveedores.length ? `${money(proveedores[0].precio, proveedores[0].moneda)} · ${S.nombreEmpresa(proveedores[0].empresa_id)}` : '—',
    })]),
    el('div.dl', {}, [el('div.dl__k', { text: 'Empresas vinculadas' }), el('div.dl__v', { text: num(cat.length, 0) })]),
  ])));

  const renderRel = (c) => fila({
    titulo: S.nombreEmpresa(c.empresa_id) || '(empresa eliminada)',
    sub: [c.codigo_proveedor, c.lead_time_dias != null ? `entrega ${c.lead_time_dias} d` : null,
      c.vigencia ? `vigente a ${fecha(c.vigencia)}` : null].filter(Boolean).join(' · '),
    valor: money(c.precio, c.moneda || 'MXN'),
    onclick: () => abrirDetalle('catalogo', c.id),
  });

  secciones.push(seccion(
    `Proveedores (${proveedores.length})`,
    miniLista(proveedores, renderRel, 'Ninguna empresa registrada como proveedor de este material.'),
    botonAgregar('Proveedor', () => abrirFormulario('catalogo', null, {
      prefill: { material_id: material.id, rol: 'Compra', moneda: material.moneda || 'MXN', unidad: material.unidad }, onSaved: pintar,
    })),
  ));

  secciones.push(seccion(
    `Clientes (${clientes.length})`,
    miniLista(clientes, renderRel, 'Este material aún no se ha asignado a ningún cliente.'),
    botonAgregar('Cliente', () => abrirFormulario('catalogo', null, {
      prefill: { material_id: material.id, rol: 'Venta', moneda: material.moneda || 'MXN', unidad: material.unidad, precio: material.precio_lista }, onSaved: pintar,
    })),
  ));

  return secciones;
});

/* ════════════════════════════════════════════════════════════
   Contacto
   ════════════════════════════════════════════════════════════ */

setSecciones('contactos', (contacto, { pintar }) => {
  const acts = sortBy(S.list('actividades').filter(a => a.contacto_id === contacto.id), 'fecha', 'desc');
  const oport = S.list('oportunidades').filter(o => o.contacto_id === contacto.id);

  return [
    seccion(`Oportunidades (${oport.length})`, miniLista(oport, (o) => fila({
      titulo: o.titulo, sub: fecha(o.cierre_estimado), extra: [chip(o.etapa)],
      valor: money(o.valor, o.moneda || 'MXN'), onclick: () => abrirDetalle('oportunidades', o.id),
    }), 'Sin oportunidades ligadas a este contacto.')),

    seccion(`Actividades (${acts.length})`, miniLista(acts.slice(0, 15), (a) => fila({
      titulo: a.asunto, sub: [a.tipo, fecha(a.fecha)].filter(Boolean).join(' · '),
      extra: [chip(a.estatus)], onclick: () => abrirDetalle('actividades', a.id),
    }), 'Sin actividades.'),
    botonAgregar('Actividad', () => abrirFormulario('actividades', null, {
      prefill: { contacto_id: contacto.id, empresa_id: contacto.empresa_id, responsable: S.store.usuario }, onSaved: pintar,
    }))),
  ];
});

/* ════════════════════════════════════════════════════════════
   Oportunidad
   ════════════════════════════════════════════════════════════ */

setSecciones('oportunidades', (op, { pintar }) => {
  const cotis = S.list('cotizaciones').filter(c => c.oportunidad_id === op.id);
  const acts = sortBy(S.list('actividades').filter(a => a.oportunidad_id === op.id), 'fecha', 'desc');

  return [
    seccion(`Cotizaciones (${cotis.length})`, miniLista(cotis, (c) => fila({
      titulo: c.folio, sub: fecha(c.fecha), extra: [chip(c.estatus)],
      valor: money(totalesCotizacion(c).total, c.moneda || 'MXN'),
      onclick: () => abrirDetalle('cotizaciones', c.id),
    }), 'Sin cotizaciones ligadas.'),
    botonAgregar('Cotización', () => abrirFormulario('cotizaciones', null, {
      prefill: { empresa_id: op.empresa_id, contacto_id: op.contacto_id, oportunidad_id: op.id, moneda: op.moneda }, onSaved: pintar,
    }))),

    seccion(`Actividades (${acts.length})`, miniLista(acts, (a) => fila({
      titulo: a.asunto, sub: [a.tipo, fecha(a.fecha), a.responsable].filter(Boolean).join(' · '),
      extra: [chip(a.estatus)], onclick: () => abrirDetalle('actividades', a.id),
    }), 'Sin actividades.'),
    botonAgregar('Actividad', () => abrirFormulario('actividades', null, {
      prefill: { oportunidad_id: op.id, empresa_id: op.empresa_id, contacto_id: op.contacto_id, responsable: S.store.usuario }, onSaved: pintar,
    }))),
  ];
});

/* ════════════════════════════════════════════════════════════
   Cotización — resumen de renglones dentro de la ficha
   ════════════════════════════════════════════════════════════ */

setSecciones('cotizaciones', (cot) => {
  const t = totalesCotizacion(cot);
  const items = cot.items || [];

  const tabla = items.length
    ? el('div.mini-list', {}, items.map((it, i) => fila({
        titulo: `${i + 1}. ${it.descripcion || S.nombreMaterial(it.material_id) || 'Renglón'}`,
        sub: `${num(it.cantidad)} ${it.unidad || ''} × ${money(it.precio_unitario, cot.moneda)}${it.descuento_pct ? ` · -${num(it.descuento_pct, 1)}%` : ''}`,
        valor: money((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0) * (1 - (Number(it.descuento_pct) || 0) / 100), cot.moneda),
      })))
    : el('div.muted', { text: 'Esta cotización no tiene renglones.', style: { fontSize: '13px' } });

  const totales = el('div.totals', {}, [
    el('div.totals__row', {}, [el('span', { text: 'Subtotal' }), el('span', { text: money(t.subtotalBruto, cot.moneda) })]),
    t.descuento ? el('div.totals__row', {}, [el('span', { text: `Descuento ${num(cot.descuento_pct, 1)}%` }), el('span', { text: '- ' + money(t.descuento, cot.moneda) })]) : null,
    el('div.totals__row', {}, [el('span', { text: `IVA ${num(cot.iva_pct, 1)}%` }), el('span', { text: money(t.iva, cot.moneda) })]),
    el('div.totals__row.totals__row--grand', {}, [el('span', { text: 'Total' }), el('span', { text: money(t.total, cot.moneda) })]),
    t.costo > 0 ? el('div.totals__row', { style: { color: 'var(--ink-muted)', fontSize: '12.5px', marginTop: '6px' } }, [
      el('span', { text: 'Utilidad estimada' }),
      el('span', { text: `${money(t.utilidad, cot.moneda)} · ${t.margen == null ? '—' : pct(t.margen)}` }),
    ]) : null,
  ]);

  return [seccion(`Renglones (${items.length})`, el('div', {}, [tabla, totales]))];
});
