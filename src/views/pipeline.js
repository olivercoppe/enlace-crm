/* ============================================================
   Embudo de ventas — tablero Kanban con arrastre entre etapas
   ============================================================ */

import { el, clear, toast, emptyState } from '../lib/ui.js';
import * as S from '../data/store.js';
import { ETAPAS } from '../data/schema.js';
import { abrirFormulario, abrirDetalle, buscar } from './crud.js';
import { money, moneyShort, fecha, sum, sortBy, diasHasta, num } from '../lib/utils.js';

const ui = { q: '', responsable: '' };

export function renderPipeline(host) {
  clear(host);

  const head = el('div.view__head', {}, [
    el('div', {}, [
      el('h1.view__title', { text: 'Embudo de ventas' }),
      el('div.view__sub', { text: 'Arrastra una tarjeta para cambiarla de etapa.' }),
    ]),
    el('div.view__tools', {}, [
      el('div.field-inline', {}, [el('input', {
        type: 'search', placeholder: 'Buscar oportunidad…', value: ui.q,
        oninput: (e) => { ui.q = e.target.value; pintar(); },
      })]),
      el('div.field-inline', {}, [(() => {
        const sel = el('select', { onchange: (e) => { ui.responsable = e.target.value; pintar(); } });
        sel.appendChild(el('option', { value: '', text: 'Todos · Responsable' }));
        for (const u of S.equipo()) sel.appendChild(el('option', { value: u, text: u }));
        sel.value = ui.responsable;
        return sel;
      })()]),
      el('button.btn.btn--primary', {
        html: '<span class="btn__plus">＋</span> Nueva oportunidad',
        onclick: () => abrirFormulario('oportunidades', null, { onSaved: pintar }),
      }),
    ]),
  ]);

  const resumen = el('div.kpis');
  const tablero = el('div.kanban');
  host.append(head, resumen, tablero);

  function datos() {
    let rows = S.list('oportunidades');
    if (ui.responsable) rows = rows.filter(o => o.responsable === ui.responsable);
    return buscar('oportunidades', rows, ui.q);
  }

  function pintar() {
    const rows = datos();
    const abiertas = rows.filter(o => !['Ganada', 'Perdida'].includes(o.etapa));
    const ganadas = rows.filter(o => o.etapa === 'Ganada');
    const perdidas = rows.filter(o => o.etapa === 'Perdida');
    const BASE = S.monedaBase();
    const M = (v) => money(v, BASE);
    const ponderado = S.sumaBase(abiertas, o => (Number(o.valor) || 0) * ((Number(o.probabilidad) || 0) / 100));
    const cerradas = ganadas.length + perdidas.length;

    clear(resumen).append(
      kpi('Pipeline abierto', M(S.sumaBase(abiertas, 'valor')), `${abiertas.length} oportunidad(es)`),
      kpi('Valor ponderado', M(ponderado), 'Ajustado por probabilidad'),
      kpi('Ganado', M(S.sumaBase(ganadas, 'valor')), `${ganadas.length} cerrada(s)`),
      kpi('Tasa de cierre', cerradas ? `${Math.round((ganadas.length / cerradas) * 100)}%` : '—', `${ganadas.length} de ${cerradas}`),
    );

    clear(tablero);
    for (const etapa of ETAPAS) {
      const enEtapa = sortBy(rows.filter(o => o.etapa === etapa.key), 'cierre_estimado');
      const col = el('div.kcol', { dataset: { etapa: etapa.key } });

      col.appendChild(el('div.kcol__head', {}, [
        el('div.kcol__dot', { style: { background: etapa.color } }),
        el('div.kcol__name', { text: etapa.key }),
        el('div.kcol__n', { text: String(enEtapa.length) }),
      ]));
      col.appendChild(el('div.kcol__sum', { text: M(S.sumaBase(enEtapa, 'valor')) }));

      const body = el('div.kcol__body');
      for (const op of enEtapa) body.appendChild(tarjeta(op));
      if (!enEtapa.length) body.appendChild(el('div.muted', { text: 'Sin oportunidades', style: { fontSize: '12px', textAlign: 'center', padding: '14px 0' } }));
      col.appendChild(body);

      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-over'));
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('is-over');
        const id = e.dataTransfer.getData('text/plain');
        const op = S.byId('oportunidades', id);
        if (!op || op.etapa === etapa.key) return;
        try {
          await S.save('oportunidades', { ...op, etapa: etapa.key, probabilidad: etapa.prob });
          toast(`«${op.titulo}» → ${etapa.key}`, 'good', 2400);
        } catch (err) {
          toast(`No se pudo mover: ${err.message}`, 'error');
        }
        pintar();
      });

      tablero.appendChild(col);
    }

    if (!rows.length) {
      clear(tablero).appendChild(emptyState({
        icon: '◈',
        title: 'Aún no hay oportunidades',
        text: 'Registra un negocio en curso para darle seguimiento por etapas.',
        action: el('button.btn.btn--primary', { text: 'Crear oportunidad', onclick: () => abrirFormulario('oportunidades', null, { onSaved: pintar }) }),
      }));
    }
  }

  function tarjeta(op) {
    const dias = diasHasta(op.cierre_estimado);
    const atrasada = dias != null && dias < 0 && !['Ganada', 'Perdida'].includes(op.etapa);

    const card = el('div.kcard', { draggable: 'true', onclick: () => abrirDetalle('oportunidades', op.id) }, [
      el('div.kcard__title', { text: op.titulo }),
      el('div.kcard__co', { text: S.nombreEmpresa(op.empresa_id) || 'Sin empresa' }),
      el('div.kcard__foot', {}, [
        el('span.kcard__val', { text: moneyShort(op.valor, op.moneda || 'MXN') }),
        op.probabilidad != null ? el('span.muted', { text: `· ${num(op.probabilidad, 0)}%` }) : null,
        op.cierre_estimado
          ? el('span', { class: atrasada ? 'chip chip--serious' : 'kcard__date', text: fecha(op.cierre_estimado) })
          : null,
      ]),
    ]);

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', op.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
    return card;
  }

  pintar();
  return { pintar };
}

function kpi(label, value, foot) {
  return el('div.kpi', {}, [
    el('div.kpi__label', { text: label }),
    el('div.kpi__value', { text: value }),
    foot ? el('div.kpi__foot', { text: foot }) : null,
  ]);
}
