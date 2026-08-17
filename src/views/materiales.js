/* ============================================================
   Editor de materiales: ficha + desglose de costo de producción
   ============================================================ */

import { el, clear, buildForm, drawer, toast } from '../lib/ui.js';
import * as S from '../data/store.js';
import { RESOURCES, nuevoRegistro, totalesProduccion, CATEGORIAS_COSTO } from '../data/schema.js';
import { setEditor } from './registry.js';
import { money, num, uid, round2 } from '../lib/utils.js';

setEditor('materiales', abrirEditorMaterial);

export function abrirEditorMaterial(record = null, { prefill = {}, onSaved } = {}) {
  const R = RESOURCES.materiales;
  const esNuevo = !record?.id;

  const mat = esNuevo
    ? nuevoRegistro('materiales', { moneda: S.store.ajustes.moneda_base || 'MXN', ...prefill })
    : { ...record, costos_produccion: structuredClone(record.costos_produccion || []) };

  let conceptos = Array.isArray(mat.costos_produccion) ? mat.costos_produccion : [];

  const contenedorForm = el('div');
  const contenedorConceptos = el('div');
  const contenedorTotales = el('div');

  /* ── Ficha genérica ───────────────────────────────────── */

  const form = buildForm(R.fields, mat, S.ctx());
  contenedorForm.appendChild(form.node);

  const inputMoneda = form.node.querySelector('[id^="f-moneda-"]');
  inputMoneda?.addEventListener('change', () => { mat.moneda = form.get('moneda'); pintarConceptos(); });

  const monedaActual = () => form.get('moneda') || mat.moneda || 'MXN';

  /* ── Controles del lote ───────────────────────────────── */

  const inpUnidades = el('input', {
    type: 'number', min: '0', step: '0.01',
    value: mat.unidades_lote ?? 1,
    style: { width: '92px', textAlign: 'right' },
  });
  inpUnidades.addEventListener('input', pintarTotales);

  const chkUsar = el('input', { type: 'checkbox', style: { width: '16px', height: '16px', accentColor: 'var(--accent)' } });
  chkUsar.checked = mat.usar_costo_produccion !== false;
  chkUsar.addEventListener('change', pintarTotales);

  const estado = () => ({
    ...mat,
    costos_produccion: conceptos,
    unidades_lote: Number(inpUnidades.value) || 1,
  });

  /* ── Tabla de conceptos ───────────────────────────────── */

  function nuevoConcepto(extra = {}) {
    return { _id: uid(), concepto: '', categoria: 'Materia prima', cantidad: 1, unidad: '', costo_unitario: 0, ...extra };
  }

  function pintarConceptos() {
    clear(contenedorConceptos);
    const moneda = monedaActual();

    const tabla = el('table.lines');
    tabla.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', { text: '#', style: { width: '26px' } }),
      el('th', { text: 'En qué se gasta' }),
      el('th.num', { text: 'Cant.', style: { width: '74px' } }),
      el('th', { text: 'Unidad', style: { width: '86px' } }),
      el('th.num', { text: 'Costo unit.', style: { width: '104px' } }),
      el('th.num', { text: 'Importe', style: { width: '104px' } }),
      el('th', { style: { width: '32px' } }),
    ])]));

    const tbody = el('tbody');

    conceptos.forEach((c, i) => {
      const importe = () => (Number(c.cantidad) || 0) * (Number(c.costo_unitario) || 0);
      const celdaImporte = el('td.num', {
        text: money(importe(), moneda),
        style: { fontVariantNumeric: 'tabular-nums', paddingRight: '8px' },
      });
      const recalcular = () => { celdaImporte.textContent = money(importe(), moneda); pintarTotales(); };

      const selTipo = el('select', {}, CATEGORIAS_COSTO.map(t => el('option', { value: t, text: t })));
      selTipo.value = c.categoria || 'Materia prima';
      selTipo.addEventListener('change', () => { c.categoria = selTipo.value; pintarTotales(); });

      const inpConcepto = el('input', { value: c.concepto || '', placeholder: 'Ej. Resina epóxica, horas de torno, flete…' });
      inpConcepto.addEventListener('input', () => { c.concepto = inpConcepto.value; });

      const inpUnidad = el('input', { value: c.unidad || '', placeholder: 'kg, h, pza' });
      inpUnidad.addEventListener('input', () => { c.unidad = inpUnidad.value; });

      const mkNum = (campo, step) => {
        const inp = el('input', { type: 'number', step, min: '0', value: c[campo] ?? 0 });
        inp.addEventListener('input', () => { c[campo] = inp.value === '' ? 0 : Number(inp.value); recalcular(); });
        return el('td.num', {}, [inp]);
      };

      tbody.appendChild(el('tr', {}, [
        el('td', { text: String(i + 1), class: 'muted' }),
        el('td', {}, [selTipo, inpConcepto]),
        mkNum('cantidad', '0.01'),
        el('td', {}, [inpUnidad]),
        mkNum('costo_unitario', '0.01'),
        celdaImporte,
        el('td', {}, [el('button.icon-btn', {
          text: '✕', title: 'Quitar concepto',
          onclick: () => { conceptos.splice(i, 1); pintarConceptos(); },
        })]),
      ]));
    });

    if (!conceptos.length) {
      tbody.appendChild(el('tr', {}, [el('td', {
        colspan: '7', class: 'muted',
        text: 'Sin conceptos. Agrega todo lo que se gasta para producir este material.',
        style: { padding: '16px 8px', textAlign: 'center' },
      })]));
    }

    tabla.appendChild(tbody);
    contenedorConceptos.append(
      tabla,
      el('div.row', { style: { marginTop: '12px' } }, [
        el('button.btn.btn--sm', {
          html: '<span class="btn__plus">＋</span> Agregar concepto',
          onclick: () => { conceptos.push(nuevoConcepto()); pintarConceptos(); },
        }),
        conceptos.length ? el('button.btn.btn--sm', {
          text: '⧉ Duplicar el último',
          onclick: () => {
            const ultimo = conceptos[conceptos.length - 1];
            conceptos.push({ ...structuredClone(ultimo), _id: uid() });
            pintarConceptos();
          },
        }) : null,
      ].filter(Boolean)),
    );
    pintarTotales();
  }

  /* ── Totales del desglose ─────────────────────────────── */

  function pintarTotales() {
    const moneda = monedaActual();
    const t = totalesProduccion(estado());
    const hayConceptos = t.conceptos > 0;

    /* Refleja el costo calculado en el campo «Costo base» del formulario. */
    if (chkUsar.checked && hayConceptos) form.setValue('costo', round2(t.costoUnitario));

    clear(contenedorTotales).appendChild(el('div.totals', {}, [
      el('div.totals__row', {}, [
        el('span', { text: `Total del lote · ${t.conceptos} concepto(s)` }),
        el('span', { text: money(t.totalLote, moneda) }),
      ]),
      el('div.totals__row', { style: { alignItems: 'center' } }, [
        el('span', { text: 'Unidades por lote' }),
        inpUnidades,
      ]),
      el('div.totals__row.totals__row--grand', {}, [
        el('span', { text: 'Costo por unidad' }),
        el('span', { text: money(t.costoUnitario, moneda) }),
      ]),
      el('label', {
        style: {
          display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px',
          fontSize: '12.5px', color: 'var(--ink-2)', cursor: 'pointer',
        },
      }, [chkUsar, el('span', { text: 'Usar este costo por unidad como «Costo base»' })]),
      !hayConceptos
        ? el('div.muted', { style: { fontSize: '12px', marginTop: '4px' }, text: 'Sin conceptos, el costo base se queda como lo escribas arriba.' })
        : null,
      hayConceptos && t.porCategoria.length > 1
        ? el('div', { style: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' } }, [
            el('div.dl__k', { text: 'Reparto por tipo de gasto' }),
            ...t.porCategoria.map(({ categoria, monto }) => el('div.totals__row', {
              style: { fontSize: '12.5px', color: 'var(--ink-2)' },
            }, [
              el('span', { text: categoria }),
              el('span', { text: `${money(monto, moneda)} · ${num((monto / t.totalLote) * 100, 0)}%` }),
            ])),
          ])
        : null,
    ]));
  }

  /* ── Ensamblado ───────────────────────────────────────── */

  const cuerpo = el('div', {}, [
    contenedorForm,
    el('div.section', {}, [
      el('div.section__title', { text: 'Costo de producción' }),
      el('p.muted', {
        style: { fontSize: '12.5px', margin: '0 0 12px' },
        text: 'Anota cada gasto que implica producir este material. Si capturas el gasto de una sola pieza, deja las unidades por lote en 1.',
      }),
      contenedorConceptos,
      contenedorTotales,
    ]),
  ]);

  const d = drawer({
    title: esNuevo ? 'Nuevo material' : `Editar ${mat.nombre || 'material'}`,
    subtitle: [mat.sku, mat.categoria].filter(Boolean).join(' · ') || 'Catálogo',
    body: cuerpo,
    actions: [
      el('div.spacer'),
      el('button.btn', { text: 'Cancelar', onclick: () => d.close() }),
      el('button.btn.btn--primary', { text: 'Guardar', onclick: guardar }),
    ],
  });

  pintarConceptos();

  async function guardar() {
    if (!form.validate()) return;

    const limpios = conceptos
      .filter(c => (c.concepto || '').trim() !== '' || Number(c.costo_unitario) > 0)
      .map(c => ({
        _id: c._id || uid(),
        concepto: (c.concepto || '').trim(),
        categoria: c.categoria || 'Otro',
        cantidad: Number(c.cantidad) || 0,
        unidad: (c.unidad || '').trim(),
        costo_unitario: Number(c.costo_unitario) || 0,
      }));

    const datos = {
      ...mat,
      ...form.read(),
      costos_produccion: limpios,
      unidades_lote: Number(inpUnidades.value) > 0 ? Number(inpUnidades.value) : 1,
      usar_costo_produccion: chkUsar.checked,
    };

    const t = totalesProduccion(datos);
    if (chkUsar.checked && t.conceptos > 0) datos.costo = round2(t.costoUnitario);

    try {
      const saved = await S.save('materiales', datos);
      toast(esNuevo ? 'Material creado' : 'Cambios guardados', 'good');
      d.close();
      onSaved?.(saved);
    } catch (err) {
      toast(`No se pudo guardar: ${err.message}`, 'error', 6000);
    }
  }

  return d;
}
