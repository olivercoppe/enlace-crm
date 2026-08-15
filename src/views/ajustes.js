/* ============================================================
   Ajustes — perfil, equipo, sincronización y datos
   ============================================================ */

import { el, clear, chip, buildForm, toast, confirmar, dialog } from '../lib/ui.js';
import * as S from '../data/store.js';
import { MONEDAS, CONDICIONES_PAGO } from '../data/schema.js';
import { DATA_TABLES as TABLAS_DATOS } from '../data/tables.js';
import { cargarDemo } from '../data/demo.js';
import { exportarCSV } from './crud.js';
import { download, pickFile, num, fechaHora } from '../lib/utils.js';
import { navegar } from '../router.js';

export function renderAjustes(host) {
  clear(host);

  host.appendChild(el('div.view__head', {}, [
    el('div', {}, [
      el('h1.view__title', { text: 'Ajustes' }),
      el('div.view__sub', { text: 'Perfil de la empresa, equipo, sincronización y respaldo de datos.' }),
    ]),
  ]));

  const contenido = el('div.stack', { style: { gap: 'var(--sp-4)' } });
  host.appendChild(contenido);

  contenido.append(
    tarjetaPerfil(),
    tarjetaEquipo(),
    tarjetaSincronizacion(),
    tarjetaDatos(),
  );
}

/* ── Perfil de la empresa ────────────────────────────────── */

function tarjetaPerfil() {
  const a = S.store.ajustes;
  const campos = [
    { key: 'empresa_nombre', label: 'Nombre comercial', type: 'text', required: true },
    { key: 'razon_social', label: 'Razón social', type: 'text' },
    { key: 'rfc', label: 'RFC', type: 'text' },
    { key: 'telefono', label: 'Teléfono', type: 'tel' },
    { key: 'email', label: 'Correo', type: 'email' },
    { key: 'sitio_web', label: 'Sitio web', type: 'url' },
    { key: 'direccion', label: 'Dirección', type: 'text', full: true },
    { key: 'moneda_base', label: 'Moneda base', type: 'select', options: MONEDAS, required: true, group: 'Valores por omisión',
      help: 'Los totales del tablero se convierten a esta moneda.' },
    { key: 'tc_usd', label: 'Tipo de cambio USD → MXN', type: 'number', step: '0.01', min: 0 },
    { key: 'tc_eur', label: 'Tipo de cambio EUR → MXN', type: 'number', step: '0.01', min: 0 },
    { key: 'iva_pct', label: 'IVA (%)', type: 'number', step: '0.5', min: 0 },
    { key: 'prefijo_cotizacion', label: 'Prefijo de folio', type: 'text', help: 'Ej. COT → COT-2026-0001' },
    { key: 'condiciones_default', label: 'Condiciones de pago', type: 'select', options: CONDICIONES_PAGO },
    { key: 'vigencia_dias', label: 'Vigencia de cotización (días)', type: 'number', min: 1 },
    { key: 'notas_cotizacion', label: 'Notas al pie de las cotizaciones', type: 'textarea', full: true, rows: 3 },
  ];
  const form = buildForm(campos, a, S.ctx());

  return tarjeta('Perfil de la empresa', form.node, [
    el('button.btn.btn--primary', {
      text: 'Guardar perfil',
      onclick: async () => {
        if (!form.validate()) return;
        try { await S.saveAjustes(form.read()); toast('Perfil actualizado', 'good'); }
        catch (err) { toast(`No se pudo guardar: ${err.message}`, 'error', 6000); }
      },
    }),
  ]);
}

/* ── Equipo ──────────────────────────────────────────────── */

function tarjetaEquipo() {
  const cuerpo = el('div.stack');

  const pintar = () => {
    clear(cuerpo);
    const equipo = S.store.ajustes.equipo || [];

    cuerpo.appendChild(el('div.field', {}, [
      el('label', { text: 'Yo soy' }),
      (() => {
        const sel = el('select', { onchange: (e) => { S.setUsuario(e.target.value); toast(`Trabajando como ${e.target.value || 'invitado'}`, 'good'); pintar(); } });
        sel.appendChild(el('option', { value: '', text: '— Sin identificar —' }));
        for (const u of equipo) sel.appendChild(el('option', { value: u, text: u }));
        sel.value = S.store.usuario || '';
        return sel;
      })(),
      el('div.help', { text: 'Se usa para marcar quién crea y edita cada registro. Cada socio lo elige en su propio equipo.' }),
    ]));

    cuerpo.appendChild(el('div.section__title', { text: `Integrantes (${equipo.length})` }));
    cuerpo.appendChild(el('div.mini-list', {}, equipo.map((u, i) => el('div.mini-row', {}, [
      el('div.mini-row__main', {}, [el('div.mini-row__title', { text: u })]),
      u === S.store.usuario ? chip('Tú', 'accent') : null,
      el('button.icon-btn', {
        text: '✕', title: 'Quitar',
        onclick: async () => {
          const next = equipo.filter((_, j) => j !== i);
          await S.saveAjustes({ equipo: next });
          pintar();
        },
      }),
    ]))));

    const nuevo = el('input', { placeholder: 'Nombre del integrante' });
    cuerpo.appendChild(el('div.row', {}, [
      el('div.field-inline', { style: { flex: '1' } }, [nuevo]),
      el('button.btn', {
        text: 'Agregar',
        onclick: async () => {
          const v = nuevo.value.trim();
          if (!v) return;
          if (equipo.includes(v)) { toast('Ese nombre ya existe', 'warn'); return; }
          await S.saveAjustes({ equipo: [...equipo, v] });
          nuevo.value = '';
          pintar();
        },
      }),
    ]));
  };

  pintar();
  return tarjeta('Equipo', cuerpo);
}

/* ── Sincronización ──────────────────────────────────────── */

function tarjetaSincronizacion() {
  const cfg = S.getConfig();
  const enNube = S.store.mode === 'supabase';

  const estado = el('div.row', { style: { marginBottom: '14px' } }, [
    chip(enNube ? 'Nube · tiempo real' : 'Local · solo este equipo', enNube ? 'good' : 'warning'),
    el('span.muted', {
      text: enNube
        ? 'Los cambios de ambos socios se reflejan al instante.'
        : 'Los datos viven en este navegador. Configura Supabase para trabajar en conjunto.',
      style: { fontSize: '13px' },
    }),
  ]);

  const cuerpo = el('div', {}, [estado]);

  if (enNube) {
    cuerpo.append(
      el('div.detail-grid', {}, [
        dl('Proyecto', cfg.supabaseUrl.replace('https://', '')),
        dl('Sesión', S.store.session?.user?.email || '—'),
        dl('Estado del canal', S.store.status),
      ]),
      el('div.row', { style: { marginTop: '16px' } }, [
        el('button.btn', {
          text: 'Recargar datos',
          onclick: async () => { await S.loadAll(); toast('Datos actualizados', 'good'); },
        }),
        el('button.btn.btn--danger', {
          text: 'Cerrar sesión',
          onclick: async () => {
            if (!await confirmar({ title: 'Cerrar sesión', message: 'Tendrás que volver a iniciar sesión para ver los datos compartidos.', ok: 'Cerrar sesión', danger: true })) return;
            await S.store.adapter.signOut();
            location.reload();
          },
        }),
      ]),
    );
  } else {
    cuerpo.append(
      el('p', {
        style: { color: 'var(--ink-2)', margin: '0 0 12px' },
        text: 'Para compartir el CRM con tu socio y recibir los cambios en tiempo real, crea un proyecto gratuito en Supabase, ejecuta el archivo supabase/schema.sql y pega tus credenciales en config.js:',
      }),
      el('div.code-block', {
        text: `window.ENLACE_CONFIG = {\n  supabaseUrl: "https://TU-PROYECTO.supabase.co",\n  supabaseAnonKey: "TU_ANON_KEY"\n};`,
      }),
      el('p', { style: { color: 'var(--ink-muted)', fontSize: '12.5px', marginTop: '10px' },
        text: 'El paso a paso completo está en el README del proyecto.' }),
    );
  }

  return tarjeta('Sincronización', cuerpo);
}

const dl = (k, v) => el('div.dl', {}, [el('div.dl__k', { text: k }), el('div.dl__v', { text: v || '—' })]);

/* ── Datos ───────────────────────────────────────────────── */

function tarjetaDatos() {
  const totales = TABLAS_DATOS.map(t => `${S.list(t).length} ${t}`).join(' · ');

  const cuerpo = el('div.stack', {}, [
    el('div.muted', { text: totales, style: { fontSize: '12.5px' } }),

    el('div.section__title', { text: 'Respaldo completo' }),
    el('div.row', {}, [
      el('button.btn', {
        text: '↓ Exportar respaldo (JSON)',
        onclick: () => {
          download(`enlace-crm-respaldo-${new Date().toISOString().slice(0, 10)}.json`, S.exportarJSON(), 'application/json');
          toast('Respaldo descargado', 'good');
        },
      }),
      el('button.btn', { text: '↑ Restaurar respaldo', onclick: restaurar }),
      el('button.btn', {
        text: '↓ Exportar todo a CSV',
        onclick: () => {
          for (const t of TABLAS_DATOS) if (S.list(t).length) exportarCSV(t, S.list(t));
        },
      }),
    ]),

    el('div.section__title', { text: 'Datos de ejemplo' }),
    el('div.row', {}, [
      el('button.btn', {
        text: 'Cargar datos de ejemplo',
        onclick: async () => {
          if (!await confirmar({ title: 'Cargar ejemplo', message: 'Se agregarán empresas, materiales, precios y cotizaciones de muestra. No se borra nada de lo que ya tienes.', ok: 'Cargar' })) return;
          try {
            const r = await cargarDemo();
            toast(`Ejemplo cargado: ${r.empresas} empresas, ${r.materiales} materiales`, 'good', 5000);
            navegar('#/');
          } catch (err) { toast(`Error: ${err.message}`, 'error', 6000); }
        },
      }),
      el('button.btn.btn--danger', { text: 'Borrar todos los datos', onclick: borrarTodo }),
    ]),
  ]);

  return tarjeta('Datos', cuerpo);
}

async function restaurar() {
  const archivo = await pickFile('.json');
  if (!archivo) return;

  let previo;
  try { previo = JSON.parse(archivo.text); }
  catch { toast('El archivo no es un JSON válido', 'error'); return; }

  const conteos = TABLAS_DATOS.map(t => `${(previo[t] || []).length} ${t}`).join(' · ');

  const d = dialog({
    title: 'Restaurar respaldo',
    body: el('div.stack', {}, [
      el('div.callout', { text: `Respaldo del ${previo._exported_at ? fechaHora(previo._exported_at) : 'origen desconocido'}.` }),
      el('div.muted', { text: conteos, style: { fontSize: '12.5px' } }),
      el('div.callout.callout--warn', { text: 'Reemplazar borra todo lo que hay actualmente. Combinar conserva lo existente y agrega o actualiza los registros del archivo.' }),
    ]),
    actions: [
      el('div.spacer', { style: { flex: '1' } }),
      el('button.btn', { text: 'Cancelar', onclick: () => d.close() }),
      el('button.btn', { text: 'Combinar', onclick: () => ejecutar(false) }),
      el('button.btn.btn--danger', { text: 'Reemplazar todo', onclick: () => ejecutar(true) }),
    ],
  });

  async function ejecutar(reemplazar) {
    d.close();
    try {
      await S.importarJSON(archivo.text, { reemplazar });
      toast('Respaldo restaurado', 'good');
      navegar('#/');
    } catch (err) { toast(`Error al restaurar: ${err.message}`, 'error', 7000); }
  }
}

async function borrarTodo() {
  const ok = await confirmar({
    title: 'Borrar todos los datos',
    message: 'Se eliminarán empresas, contactos, materiales, precios, oportunidades, cotizaciones y actividades. Descarga un respaldo antes de continuar.',
    ok: 'Borrar todo',
    danger: true,
  });
  if (!ok) return;

  try {
    for (const t of TABLAS_DATOS) {
      const ids = S.list(t).map(r => r.id);
      if (!ids.length) continue;
      await S.store.adapter.removeMany(t, ids);
      S.store.db[t] = [];
    }
    await S.loadAll();
    toast('Todos los datos fueron eliminados', 'good');
    navegar('#/');
  } catch (err) { toast(`Error: ${err.message}`, 'error', 6000); }
}

/* ── Pieza ───────────────────────────────────────────────── */

function tarjeta(titulo, cuerpo, acciones) {
  return el('div.card', {}, [
    el('div.card__head', {}, [el('div.card__title', { text: titulo })]),
    el('div.card__body', {}, [cuerpo]),
    acciones ? el('div.drawer__foot', {}, [el('div.spacer'), ...acciones]) : null,
  ]);
}
