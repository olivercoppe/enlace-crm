/* ============================================================
   Editor de cotizaciones: encabezado + renglones + totales
   ============================================================ */

import { el, clear, buildForm, drawer, dialog, toast } from '../lib/ui.js';
import * as S from '../data/store.js';
import { RESOURCES, nuevoRegistro, totalesCotizacion, UNIDADES } from '../data/schema.js';
import { setEditor } from './registry.js';
import { money, num, pct, fecha, folio, todayISO, addDays, uid, sortBy } from '../lib/utils.js';

setEditor('cotizaciones', abrirEditorCotizacion);

export function abrirEditorCotizacion(record = null, { prefill = {}, onSaved } = {}) {
  const R = RESOURCES.cotizaciones;
  const esNueva = !record?.id;
  const ajustes = S.store.ajustes;

  const cot = esNueva
    ? nuevoRegistro('cotizaciones', {
        folio: folio(ajustes.prefijo_cotizacion || 'COT', S.list('cotizaciones').map(c => c.folio)),
        fecha: todayISO(),
        vigencia: addDays(todayISO(), Number(ajustes.vigencia_dias) || 15),
        iva_pct: Number(ajustes.iva_pct ?? 16),
        moneda: ajustes.moneda_base || 'MXN',
        condiciones_pago: ajustes.condiciones_default || '30 días',
        responsable: S.store.usuario || null,
        notas: ajustes.notas_cotizacion || '',
        items: [],
        ...prefill,
      })
    : { ...record, items: structuredClone(record.items || []) };

  let items = cot.items || [];

  const contenedorForm = el('div');
  const contenedorItems = el('div');
  const contenedorTotales = el('div');

  let form;
  const construirForm = () => {
    form = buildForm(R.fields, cot, S.ctx());
    clear(contenedorForm).appendChild(form.node);
    for (const key of ['empresa_id', 'moneda', 'iva_pct', 'descuento_pct']) {
      const ctrl = form.node.querySelector(`[id^="f-${key}-"]`);
      ctrl?.addEventListener('change', () => {
        Object.assign(cot, form.read());
        if (key === 'empresa_id') { construirForm(); pintarItems(); }
        pintarTotales();
      });
      ctrl?.addEventListener('input', () => { Object.assign(cot, form.read()); pintarTotales(); });
    }
  };
  construirForm();

  /* ── Renglones ────────────────────────────────────────── */

  function nuevoRenglon(extra = {}) {
    return { _id: uid(), material_id: null, descripcion: '', unidad: 'Pieza', cantidad: 1, precio_unitario: 0, costo_unitario: 0, descuento_pct: 0, ...extra };
  }

  /** Precio sugerido: acuerdo con la empresa > precio de lista. */
  function precioSugerido(materialId) {
    const empresaId = form.get('empresa_id');
    const acuerdo = S.list('catalogo').find(c =>
      c.material_id === materialId && c.empresa_id === empresaId && c.rol === 'Venta' && c.vigente !== false);
    if (acuerdo?.precio != null) return { precio: Number(acuerdo.precio), fuente: 'Precio acordado' };
    const m = S.byId('materiales', materialId);
    if (m?.precio_lista != null) return { precio: Number(m.precio_lista), fuente: 'Precio de lista' };
    return { precio: 0, fuente: null };
  }

  function pintarItems() {
    clear(contenedorItems);

    const tabla = el('table.lines');
    tabla.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', { text: '#', style: { width: '28px' } }),
      el('th', { text: 'Material / concepto' }),
      el('th', { text: 'Unidad', style: { width: '110px' } }),
      el('th.num', { text: 'Cant.', style: { width: '86px' } }),
      el('th.num', { text: 'P. unitario', style: { width: '110px' } }),
      el('th.num', { text: 'Desc %', style: { width: '72px' } }),
      el('th.num', { text: 'Importe', style: { width: '110px' } }),
      el('th', { style: { width: '34px' } }),
    ])]));

    const tbody = el('tbody');

    items.forEach((it, i) => {
      const importe = () => (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0) * (1 - (Number(it.descuento_pct) || 0) / 100);
      const celdaImporte = el('td.num', { text: money(importe(), cot.moneda), style: { fontVariantNumeric: 'tabular-nums', paddingRight: '8px' } });

      const recalcular = () => { celdaImporte.textContent = money(importe(), cot.moneda); pintarTotales(); };

      /* Selector de material */
      const selMaterial = el('select');
      selMaterial.appendChild(el('option', { value: '', text: '— Concepto libre —' }));
      for (const m of sortBy(S.list('materiales'), 'nombre')) {
        selMaterial.appendChild(el('option', { value: m.id, text: m.sku ? `${m.sku} · ${m.nombre}` : m.nombre }));
      }
      selMaterial.value = it.material_id || '';
      selMaterial.addEventListener('change', () => {
        it.material_id = selMaterial.value || null;
        if (it.material_id) {
          const m = S.byId('materiales', it.material_id);
          const { precio, fuente } = precioSugerido(it.material_id);
          it.descripcion = m?.descripcion || m?.nombre || '';
          it.unidad = m?.unidad || 'Pieza';
          it.precio_unitario = precio;
          it.costo_unitario = Number(m?.costo) || 0;
          if (fuente) toast(`${fuente} aplicado: ${money(precio, cot.moneda)}`, 'info', 2200);
        }
        pintarItems();
      });

      const inpDescripcion = el('input', { value: it.descripcion || '', placeholder: 'Descripción del renglón' });
      inpDescripcion.addEventListener('input', () => { it.descripcion = inpDescripcion.value; });

      const selUnidad = el('select', {}, UNIDADES.map(u => el('option', { value: u, text: u })));
      selUnidad.value = it.unidad || 'Pieza';
      selUnidad.addEventListener('change', () => { it.unidad = selUnidad.value; });

      const mkNum = (campo, step = '1') => {
        const inp = el('input', { type: 'number', step, min: '0', value: it[campo] ?? 0 });
        inp.addEventListener('input', () => { it[campo] = inp.value === '' ? 0 : Number(inp.value); recalcular(); });
        return el('td.num', {}, [inp]);
      };

      tbody.appendChild(el('tr', {}, [
        el('td', { text: String(i + 1), class: 'muted' }),
        el('td', {}, [selMaterial, inpDescripcion]),
        el('td', {}, [selUnidad]),
        mkNum('cantidad', '0.01'),
        mkNum('precio_unitario', '0.01'),
        mkNum('descuento_pct', '0.5'),
        celdaImporte,
        el('td', {}, [el('button.icon-btn', {
          text: '✕', title: 'Quitar renglón',
          onclick: () => { items.splice(i, 1); pintarItems(); pintarTotales(); },
        })]),
      ]));
    });

    if (!items.length) {
      tbody.appendChild(el('tr', {}, [el('td', {
        colspan: '8', class: 'muted',
        text: 'Sin renglones. Agrega materiales del catálogo o conceptos libres.',
        style: { padding: '16px 8px', textAlign: 'center' },
      })]));
    }

    tabla.appendChild(tbody);
    contenedorItems.append(
      tabla,
      el('div.row', { style: { marginTop: '12px' } }, [
        el('button.btn.btn--sm', { html: '<span class="btn__plus">＋</span> Agregar renglón', onclick: () => { items.push(nuevoRenglon()); pintarItems(); } }),
        el('button.btn.btn--sm', { text: '⊞ Desde catálogo de la empresa', onclick: agregarDesdeCatalogo }),
      ]),
    );
    pintarTotales();
  }

  function agregarDesdeCatalogo() {
    const empresaId = form.get('empresa_id');
    if (!empresaId) { toast('Primero selecciona la empresa', 'warn'); return; }
    const precios = S.catalogoDe(empresaId).filter(c => c.rol === 'Venta');
    if (!precios.length) { toast('Esta empresa no tiene precios de venta registrados', 'warn'); return; }

    const seleccion = new Set();
    const lista = el('div.mini-list', {}, precios.map(p => {
      const m = S.byId('materiales', p.material_id);
      const check = el('input', { type: 'checkbox', style: { width: '16px', height: '16px', accentColor: 'var(--accent)' } });
      check.addEventListener('change', () => check.checked ? seleccion.add(p) : seleccion.delete(p));
      return el('div.mini-row', { onclick: (e) => { if (e.target !== check) { check.checked = !check.checked; check.dispatchEvent(new Event('change')); } } }, [
        check,
        el('div.mini-row__main', {}, [
          el('div.mini-row__title', { text: m?.nombre || '(material eliminado)' }),
          el('div.mini-row__sub', { text: [m?.sku, p.unidad || m?.unidad].filter(Boolean).join(' · ') }),
        ]),
        el('div.mini-row__val', { text: money(p.precio, p.moneda || cot.moneda) }),
      ]);
    }));

    const d = dialog({
      title: 'Agregar materiales acordados',
      body: lista,
      actions: [
        el('div.spacer', { style: { flex: '1' } }),
        el('button.btn', { text: 'Cancelar', onclick: () => d.close() }),
        el('button.btn.btn--primary', {
          text: 'Agregar',
          onclick: () => {
            for (const p of seleccion) {
              const m = S.byId('materiales', p.material_id);
              items.push(nuevoRenglon({
                material_id: p.material_id,
                descripcion: m?.descripcion || m?.nombre || '',
                unidad: p.unidad || m?.unidad || 'Pieza',
                precio_unitario: Number(p.precio) || 0,
                costo_unitario: Number(m?.costo) || 0,
                descuento_pct: Number(p.descuento_pct) || 0,
                cantidad: Number(p.cantidad_minima) || 1,
              }));
            }
            d.close();
            pintarItems();
          },
        }),
      ],
    });
  }

  function pintarTotales() {
    const actual = { ...cot, ...(form?.read() || {}), items };
    const t = totalesCotizacion(actual);
    clear(contenedorTotales).appendChild(el('div.totals', {}, [
      el('div.totals__row', {}, [el('span', { text: 'Subtotal' }), el('span', { text: money(t.subtotalBruto, actual.moneda) })]),
      t.descuento ? el('div.totals__row', {}, [el('span', { text: `Descuento global ${num(actual.descuento_pct, 1)}%` }), el('span', { text: '- ' + money(t.descuento, actual.moneda) })]) : null,
      el('div.totals__row', {}, [el('span', { text: `IVA ${num(actual.iva_pct, 1)}%` }), el('span', { text: money(t.iva, actual.moneda) })]),
      el('div.totals__row.totals__row--grand', {}, [el('span', { text: 'Total' }), el('span', { text: money(t.total, actual.moneda) })]),
      t.costo > 0 ? el('div.totals__row', { style: { color: 'var(--ink-muted)', fontSize: '12.5px', marginTop: '6px' } }, [
        el('span', { text: 'Utilidad estimada' }),
        el('span', { text: `${money(t.utilidad, actual.moneda)} · ${t.margen == null ? '—' : pct(t.margen)}` }),
      ]) : null,
    ]));
  }

  /* ── Ensamblado ───────────────────────────────────────── */

  const cuerpo = el('div', {}, [
    contenedorForm,
    el('div.section', {}, [
      el('div.section__title', { text: 'Renglones' }),
      contenedorItems,
      contenedorTotales,
    ]),
  ]);

  const d = drawer({
    title: esNueva ? 'Nueva cotización' : `Cotización ${cot.folio || ''}`,
    subtitle: S.nombreEmpresa(cot.empresa_id) || 'Sin empresa',
    body: cuerpo,
    actions: [
      !esNueva ? el('button.btn', { text: '⎙ Imprimir', onclick: () => imprimirCotizacion({ ...cot, ...form.read(), items }) }) : null,
      el('div.spacer'),
      el('button.btn', { text: 'Cancelar', onclick: () => d.close() }),
      el('button.btn.btn--primary', { text: 'Guardar', onclick: guardar }),
    ].filter(Boolean),
  });

  pintarItems();

  async function guardar() {
    if (!form.validate()) return;
    const datos = { ...cot, ...form.read(), items };
    if (!datos.folio) datos.folio = folio(ajustes.prefijo_cotizacion || 'COT', S.list('cotizaciones').map(c => c.folio));
    try {
      const saved = await S.save('cotizaciones', datos);
      toast(esNueva ? `Cotización ${saved.folio} creada` : 'Cotización actualizada', 'good');
      d.close();
      onSaved?.(saved);
    } catch (err) {
      toast(`No se pudo guardar: ${err.message}`, 'error', 6000);
    }
  }

  return d;
}

/* ════════════════════════════════════════════════════════════
   Documento imprimible
   ════════════════════════════════════════════════════════════ */

export function imprimirCotizacion(cot) {
  const a = S.store.ajustes;
  const empresa = S.byId('empresas', cot.empresa_id);
  const contacto = S.byId('contactos', cot.contacto_id);
  const t = totalesCotizacion(cot);
  const M = (v) => money(v, cot.moneda || 'MXN');

  const filas = (cot.items || []).map((it, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>
        <strong>${esc(it.descripcion || S.nombreMaterial(it.material_id) || 'Concepto')}</strong>
        ${it.material_id && S.byId('materiales', it.material_id)?.sku ? `<div style="color:#777;font-size:11px">${esc(S.byId('materiales', it.material_id).sku)}</div>` : ''}
      </td>
      <td>${esc(it.unidad || '')}</td>
      <td style="text-align:right">${num(it.cantidad)}</td>
      <td style="text-align:right">${M(it.precio_unitario)}</td>
      <td style="text-align:right">${it.descuento_pct ? num(it.descuento_pct, 1) + '%' : '—'}</td>
      <td style="text-align:right">${M((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0) * (1 - (Number(it.descuento_pct) || 0) / 100))}</td>
    </tr>`).join('');

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(cot.folio || 'Cotización')}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:0;padding:38px 44px;font-size:12.5px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;gap:28px;border-bottom:2px solid #2a78d6;padding-bottom:18px;margin-bottom:22px}
  .logo{width:44px;height:44px;border-radius:10px;background:#2a78d6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin-bottom:8px}
  h1{font-size:20px;margin:0 0 2px}
  .muted{color:#666}
  .doc{text-align:right}
  .doc .folio{font-size:17px;font-weight:700;color:#2a78d6}
  .cols{display:flex;gap:36px;margin-bottom:22px}
  .col{flex:1}
  .lbl{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:700;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th{background:#f2f5f9;text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#555;padding:7px 8px;border-bottom:1px solid #dfe3e8}
  td{padding:8px;border-bottom:1px solid #eceff2;vertical-align:top}
  tfoot td{border:0;padding:4px 8px}
  .tot{margin-left:auto;width:290px;margin-top:14px}
  .tot div{display:flex;justify-content:space-between;padding:4px 0}
  .grand{border-top:2px solid #2a78d6;margin-top:6px;padding-top:8px!important;font-size:16px;font-weight:700}
  .notas{margin-top:26px;padding:14px 16px;background:#f7f8fa;border-radius:8px;white-space:pre-wrap}
  .firma{margin-top:44px;display:flex;gap:60px}
  .firma div{flex:1;border-top:1px solid #999;padding-top:6px;text-align:center;color:#666;font-size:11px}
  @media print{body{padding:0}}
</style></head><body>
  <div class="head">
    <div>
      <div class="logo">${esc((a.empresa_nombre || 'E')[0])}</div>
      <h1>${esc(a.empresa_nombre || 'Enlace')}</h1>
      <div class="muted">${[a.razon_social, a.rfc ? 'RFC: ' + a.rfc : '', a.direccion, a.telefono, a.email, a.sitio_web].filter(Boolean).map(esc).join('<br>')}</div>
    </div>
    <div class="doc">
      <div class="lbl">Cotización</div>
      <div class="folio">${esc(cot.folio || '—')}</div>
      <div class="muted" style="margin-top:6px">
        Fecha: ${fecha(cot.fecha)}<br>
        ${cot.vigencia ? 'Vigente hasta: ' + fecha(cot.vigencia) + '<br>' : ''}
        Moneda: ${esc(cot.moneda || 'MXN')}
      </div>
    </div>
  </div>

  <div class="cols">
    <div class="col">
      <div class="lbl">Cliente</div>
      <strong>${esc(empresa?.nombre || '—')}</strong><br>
      <span class="muted">${[empresa?.razon_social, empresa?.rfc ? 'RFC: ' + empresa.rfc : '', empresa?.direccion, [empresa?.ciudad, empresa?.estado].filter(Boolean).join(', ')].filter(Boolean).map(esc).join('<br>')}</span>
    </div>
    <div class="col">
      <div class="lbl">Atención</div>
      <strong>${esc(contacto?.nombre || '—')}</strong><br>
      <span class="muted">${[contacto?.puesto, contacto?.email, contacto?.movil || contacto?.telefono].filter(Boolean).map(esc).join('<br>')}</span>
    </div>
    <div class="col">
      <div class="lbl">Condiciones</div>
      <span class="muted">
        Pago: ${esc(cot.condiciones_pago || '—')}<br>
        Entrega: ${esc(cot.tiempo_entrega || '—')}<br>
        ${cot.referencia ? 'Ref.: ' + esc(cot.referencia) + '<br>' : ''}
        ${cot.responsable ? 'Atiende: ' + esc(cot.responsable) : ''}
      </span>
    </div>
  </div>

  <table>
    <thead><tr>
      <th style="width:28px;text-align:center">#</th><th>Concepto</th><th style="width:80px">Unidad</th>
      <th style="width:70px;text-align:right">Cant.</th><th style="width:95px;text-align:right">P. unitario</th>
      <th style="width:60px;text-align:right">Desc.</th><th style="width:100px;text-align:right">Importe</th>
    </tr></thead>
    <tbody>${filas || '<tr><td colspan="7" style="text-align:center;color:#999;padding:20px">Sin renglones</td></tr>'}</tbody>
  </table>

  <div class="tot">
    <div><span>Subtotal</span><span>${M(t.subtotalBruto)}</span></div>
    ${t.descuento ? `<div><span>Descuento ${num(cot.descuento_pct, 1)}%</span><span>- ${M(t.descuento)}</span></div>` : ''}
    <div><span>IVA ${num(cot.iva_pct, 1)}%</span><span>${M(t.iva)}</span></div>
    <div class="grand"><span>Total</span><span>${M(t.total)}</span></div>
  </div>

  ${cot.notas ? `<div class="notas"><div class="lbl">Notas y condiciones</div>${esc(cot.notas)}</div>` : ''}

  <div class="firma">
    <div>Elaboró — ${esc(cot.responsable || a.empresa_nombre || '')}</div>
    <div>Acepta el cliente</div>
  </div>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { toast('El navegador bloqueó la ventana emergente', 'error'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
