/* ============================================================
   Enlace CRM — arranque, navegación y capa de sesión
   ============================================================ */

import { el, clear, qs, toast, closeAll, dialog } from './lib/ui.js';
import * as S from './data/store.js';
import { RESOURCES } from './data/schema.js';
import { rutaActual, navegar, onRuta, iniciarRouter } from './router.js';
import { renderLista, abrirFormulario, abrirDetalle, buscar } from './views/crud.js';
import { renderDashboard } from './views/dashboard.js';
import { renderPipeline } from './views/pipeline.js';
import { renderAjustes } from './views/ajustes.js';
import { debounce, initials, norm, ls, truncate, money } from './lib/utils.js';
import './views/secciones.js';
import './views/cotizaciones.js';
import './views/materiales.js';

/* ── Mapa de navegación ──────────────────────────────────── */

const NAV = [
  { grupo: null, items: [{ ruta: 'inicio', label: 'Inicio', icono: '◱' }] },
  {
    grupo: 'Comercial',
    items: [
      { ruta: 'empresas', label: 'Empresas', icono: '⌂', tabla: 'empresas' },
      { ruta: 'contactos', label: 'Contactos', icono: '☺', tabla: 'contactos' },
      { ruta: 'embudo', label: 'Embudo', icono: '◈', tabla: 'oportunidades' },
      { ruta: 'cotizaciones', label: 'Cotizaciones', icono: '❏', tabla: 'cotizaciones' },
      { ruta: 'actividades', label: 'Agenda', icono: '✓', tabla: 'actividades' },
    ],
  },
  {
    grupo: 'Catálogo',
    items: [
      { ruta: 'materiales', label: 'Materiales', icono: '▣', tabla: 'materiales' },
      { ruta: 'precios', label: 'Precios por empresa', icono: '⇄', tabla: 'catalogo' },
    ],
  },
  { grupo: null, items: [{ ruta: 'ajustes', label: 'Ajustes', icono: '⚙' }] },
];

/* Rutas que son listas genéricas */
const LISTAS = {
  empresas: { recurso: 'empresas', subtitulo: 'Clientes, proveedores y prospectos con sus datos comerciales.' },
  contactos: { recurso: 'contactos', subtitulo: 'Personas de contacto por empresa.' },
  materiales: { recurso: 'materiales', subtitulo: 'Catálogo maestro con costos, precios de lista y márgenes.' },
  precios: { recurso: 'catalogo', subtitulo: 'Precios acordados por empresa: lo que vendemos y lo que compramos.' },
  cotizaciones: { recurso: 'cotizaciones', subtitulo: 'Documentos con renglones, totales e impresión.' },
  actividades: { recurso: 'actividades', subtitulo: 'Llamadas, correos, visitas y tareas del equipo.' },
};

let desmontarVista = null;

/* ════════════════════════════════════════════════════════════
   Arranque
   ════════════════════════════════════════════════════════════ */

async function arrancar() {
  aplicarTema(ls.get('enlace-crm:tema', 'auto'));

  let resultado;
  try {
    resultado = await S.init();
  } catch (err) {
    console.error(err);
    mostrarErrorFatal(err);
    return;
  }

  if (resultado.needsLogin) {
    document.getElementById('boot').hidden = true;
    mostrarLogin();
    return;
  }

  iniciarApp();
}

function iniciarApp() {
  document.getElementById('boot').hidden = true;
  document.getElementById('app').hidden = false;

  construirNav();
  conectarTopbar();
  conectarAtajos();
  actualizarBadgeSync();
  actualizarUsuario();

  S.on('status', actualizarBadgeSync);

  /* Cualquier cambio —propio o del socio— repinta la vista abierta. */
  const repintarDiferido = debounce(repintarVistaActual, 60);
  S.on('change', ({ table }) => {
    actualizarContadores();
    if (table === 'usuario') { actualizarUsuario(); return; }
    repintarDiferido();
  });

  onRuta(render);
  iniciarRouter();

  if (!S.list('empresas').length && !S.list('materiales').length) sugerirPrimerPaso();
}

/* ════════════════════════════════════════════════════════════
   Sesión (solo en modo nube)
   ════════════════════════════════════════════════════════════ */

function mostrarLogin() {
  const host = document.body;
  const caja = el('div', {
    style: {
      position: 'fixed', inset: '0', display: 'grid', placeItems: 'center',
      background: 'var(--plane)', zIndex: '95', padding: '20px',
    },
  });

  const email = el('input', { type: 'email', placeholder: 'tucorreo@empresa.com', autocomplete: 'username' });
  const pass = el('input', { type: 'password', placeholder: 'Tu contraseña', autocomplete: 'current-password' });
  const mensaje = el('div', { style: { fontSize: '12.5px', color: 'var(--critical)', minHeight: '18px' } });
  const boton = el('button.btn.btn--primary', { text: 'Entrar', style: { width: '100%', justifyContent: 'center', height: '40px' } });

  const form = el('form', { style: { display: 'grid', gap: '14px' }, onsubmit: (e) => { e.preventDefault(); entrar(); } }, [
    el('div.field', {}, [el('label', { text: 'Correo' }), email]),
    el('div.field', {}, [el('label', { text: 'Contraseña' }), pass]),
    mensaje,
    boton,
  ]);

  caja.appendChild(el('div.card', { style: { width: 'min(400px, 100%)', padding: '30px' } }, [
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' } }, [
      el('div.brand__mark', { text: 'E', style: { width: '38px', height: '38px', fontSize: '19px' } }),
      el('div', {}, [
        el('div', { text: 'Enlace CRM', style: { fontWeight: '650', fontSize: '17px' } }),
        el('div.muted', { text: 'Inicia sesión para ver los datos compartidos', style: { fontSize: '12.5px' } }),
      ]),
    ]),
    form,
    el('div.muted', {
      style: { fontSize: '12px', marginTop: '18px', lineHeight: '1.5' },
      text: 'Las cuentas se crean desde el panel de Supabase (Authentication → Users). Cada socio usa la suya.',
    }),
  ]));

  host.appendChild(caja);
  setTimeout(() => email.focus(), 80);

  async function entrar() {
    mensaje.textContent = '';
    boton.disabled = true;
    boton.textContent = 'Entrando…';
    try {
      await S.store.adapter.signIn(email.value.trim(), pass.value);
      await S.loadAll();
      caja.remove();
      iniciarApp();
    } catch (err) {
      mensaje.textContent = err.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : (err.message || 'No se pudo iniciar sesión.');
      boton.disabled = false;
      boton.textContent = 'Entrar';
    }
  }
}

function mostrarErrorFatal(err) {
  const boot = document.getElementById('boot');
  clear(boot).append(
    el('div.boot__mark', { text: '!', style: { background: 'var(--critical)', animation: 'none' } }),
    el('div', { text: 'No se pudo iniciar el CRM', style: { fontWeight: '600' } }),
    el('div.boot__text', { text: err.message || String(err), style: { maxWidth: '440px', textAlign: 'center' } }),
    el('button.btn', { text: 'Reintentar', onclick: () => location.reload() }),
  );
}

/* ════════════════════════════════════════════════════════════
   Navegación
   ════════════════════════════════════════════════════════════ */

function construirNav() {
  const nav = clear(document.getElementById('nav'));
  for (const seccion of NAV) {
    if (seccion.grupo) nav.appendChild(el('div.nav__group', { text: seccion.grupo }));
    for (const item of seccion.items) {
      nav.appendChild(el('a.nav__item', {
        href: `#/${item.ruta === 'inicio' ? '' : item.ruta}`,
        dataset: { ruta: item.ruta, tabla: item.tabla || '' },
        onclick: () => cerrarNavMovil(),
      }, [
        el('span.nav__ico', { text: item.icono }),
        el('span', { text: item.label }),
        item.tabla ? el('span.nav__count', { text: '0' }) : null,
      ]));
    }
  }
  actualizarContadores();
}

function actualizarContadores() {
  for (const a of document.querySelectorAll('.nav__item[data-tabla]')) {
    const tabla = a.dataset.tabla;
    if (!tabla) continue;
    const badge = a.querySelector('.nav__count');
    if (badge) badge.textContent = String(S.list(tabla).length);
  }
}

function marcarActivo(vista) {
  for (const a of document.querySelectorAll('.nav__item')) {
    a.classList.toggle('is-active', a.dataset.ruta === vista);
  }
}

/* ════════════════════════════════════════════════════════════
   Render de vistas
   ════════════════════════════════════════════════════════════ */

let vistaAnterior = null;
let controlVista = null;

function render(ruta = rutaActual()) {
  const host = document.getElementById('view');
  const vista = ruta.vista === '' ? 'inicio' : ruta.vista;
  closeAll();
  marcarActivo(vista);

  const mismaVista = vistaAnterior === vista;
  vistaAnterior = vista;

  if (!mismaVista || !controlVista) {
    desmontarVista?.();
    desmontarVista = null;
    controlVista = null;
    clear(host);
    host.scrollTop = 0;

    if (vista === 'inicio') renderDashboard(host);
    else if (vista === 'embudo') controlVista = renderPipeline(host);
    else if (vista === 'ajustes') renderAjustes(host);
    else if (LISTAS[vista]) {
      const def = LISTAS[vista];
      controlVista = renderLista(def.recurso, host, { subtitulo: def.subtitulo, titulo: def.titulo });
    } else {
      clear(host).appendChild(el('div.empty', {}, [
        el('div.empty__ico', { text: '⚑' }),
        el('div.empty__title', { text: 'Página no encontrada' }),
        el('button.btn.btn--primary', { text: 'Ir al inicio', onclick: () => navegar('#/') }),
      ]));
    }
  }

  /* Detalle profundo: #/empresas/ID */
  if (ruta.id && LISTAS[vista]) {
    abrirDetalle(LISTAS[vista].recurso, ruta.id);
    history.replaceState(null, '', `#/${vista}`);
  }
}

function repintarVistaActual() {
  const ruta = rutaActual();
  if (controlVista?.pintar) { controlVista.pintar(); return; }
  if (ruta.vista === 'inicio' || ruta.vista === '') renderDashboard(document.getElementById('view'));
}

/* ════════════════════════════════════════════════════════════
   Topbar: buscador global, tema, usuario
   ════════════════════════════════════════════════════════════ */

function conectarTopbar() {
  document.addEventListener('click', (e) => {
    const accion = e.target.closest('[data-action]')?.dataset.action;
    if (accion === 'toggle-sidebar') alternarNavMovil();
    if (accion === 'toggle-theme') alternarTema();
    if (accion === 'quick-add') menuCrear();
  });

  document.getElementById('user-chip').addEventListener('click', () => navegar('#/ajustes'));

  const input = document.getElementById('global-search');
  const panel = document.getElementById('search-results');

  const ejecutar = debounce(() => {
    const q = input.value.trim();
    if (q.length < 2) { panel.hidden = true; return; }
    pintarResultados(panel, q);
  }, 160);

  input.addEventListener('input', ejecutar);
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) ejecutar(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; panel.hidden = true; input.blur(); }
    if (e.key === 'Enter') {
      const primero = panel.querySelector('.search__hit');
      if (primero) primero.click();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) panel.hidden = true;
  });
}

const RECURSOS_BUSCABLES = ['empresas', 'contactos', 'materiales', 'oportunidades', 'cotizaciones', 'actividades'];

function pintarResultados(panel, q) {
  clear(panel);
  let total = 0;

  for (const key of RECURSOS_BUSCABLES) {
    const R = RESOURCES[key];
    const hits = buscar(key, S.list(key), q).slice(0, 5);
    if (!hits.length) continue;
    total += hits.length;

    panel.appendChild(el('div.search__group', { text: R.label }));
    for (const row of hits) {
      const titulo = row[R.titleField] || '(sin nombre)';
      const sub = {
        empresas: [row.tipo, row.ciudad].filter(Boolean).join(' · '),
        contactos: [row.puesto, S.nombreEmpresa(row.empresa_id)].filter(Boolean).join(' · '),
        materiales: [row.sku, row.categoria].filter(Boolean).join(' · '),
        oportunidades: S.nombreEmpresa(row.empresa_id),
        cotizaciones: S.nombreEmpresa(row.empresa_id),
        actividades: [row.tipo, S.nombreEmpresa(row.empresa_id)].filter(Boolean).join(' · '),
      }[key];

      panel.appendChild(el('div.search__hit', {
        onclick: () => {
          panel.hidden = true;
          document.getElementById('global-search').value = '';
          abrirDetalle(key, row.id);
        },
      }, [
        el('span', { text: R.icon, style: { opacity: '.5', width: '16px' } }),
        el('div', { style: { minWidth: '0' } }, [
          el('b', { text: truncate(titulo, 46) }),
          sub ? el('div.cell-sub', { text: truncate(sub, 46) }) : null,
        ]),
      ]));
    }
  }

  if (!total) {
    panel.appendChild(el('div.empty', { style: { padding: '24px 12px' } }, [
      el('div.empty__title', { text: 'Sin resultados' }),
      el('div.empty__text', { text: `Nada coincide con «${truncate(q, 30)}».` }),
    ]));
  }
  panel.hidden = false;
}

function menuCrear() {
  const opciones = [
    ['empresas', 'Empresa'], ['contactos', 'Contacto'], ['materiales', 'Material'],
    ['catalogo', 'Precio por empresa'], ['oportunidades', 'Oportunidad'],
    ['cotizaciones', 'Cotización'], ['actividades', 'Actividad'],
  ];
  const d = dialog({
    title: 'Crear registro',
    body: el('div.mini-list', {}, opciones.map(([key, label]) => el('div.mini-row', {
      style: { cursor: 'pointer' },
      onclick: () => { d.close(); abrirFormulario(key, null, { onSaved: repintarVistaActual }); },
    }, [
      el('span', { text: RESOURCES[key].icon, style: { opacity: '.55', width: '18px' } }),
      el('div.mini-row__main', {}, [el('div.mini-row__title', { text: label })]),
    ]))),
  });
}

/* ── Tema ────────────────────────────────────────────────── */

function aplicarTema(tema) {
  if (tema === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', tema);
  ls.set('enlace-crm:tema', tema);
}

function alternarTema() {
  const actual = ls.get('enlace-crm:tema', 'auto');
  const siguiente = actual === 'auto' ? 'light' : actual === 'light' ? 'dark' : 'auto';
  aplicarTema(siguiente);
  toast(`Tema: ${{ auto: 'automático', light: 'claro', dark: 'oscuro' }[siguiente]}`, 'info', 1800);
}

/* ── Estado de sincronización y usuario ──────────────────── */

function actualizarBadgeSync() {
  const badge = document.getElementById('sync-badge');
  if (!badge) return;
  const etiqueta = badge.querySelector('.sync__label');
  const mapa = {
    live: ['is-live', 'En vivo'],
    syncing: ['is-syncing', 'Conectando…'],
    error: ['is-error', 'Sin conexión'],
    local: ['', 'Solo este equipo'],
  };
  const [clase, texto] = mapa[S.store.status] || mapa.local;
  badge.className = `sync ${clase}`.trim();
  etiqueta.textContent = texto;
  badge.title = S.store.mode === 'supabase'
    ? `Sincronización en la nube — ${texto}${S.store.statusDetail ? ` (${S.store.statusDetail})` : ''}`
    : 'Los datos se guardan solo en este navegador.';
}

function actualizarUsuario() {
  const nombre = S.store.usuario || S.store.session?.user?.email || '';
  document.getElementById('user-avatar').textContent = nombre ? initials(nombre) : '?';
  document.getElementById('user-name').textContent = nombre || 'Invitado';
}

/* ── Navegación móvil ────────────────────────────────────── */

function alternarNavMovil() {
  const app = document.getElementById('app');
  const abierto = app.classList.toggle('is-nav-open');
  qs('.scrim').hidden = !abierto;
}
function cerrarNavMovil() {
  document.getElementById('app').classList.remove('is-nav-open');
  qs('.scrim').hidden = true;
}

/* ── Atajos de teclado ───────────────────────────────────── */

function conectarAtajos() {
  document.addEventListener('keydown', (e) => {
    const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('global-search').focus();
      document.getElementById('global-search').select();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !enCampo) {
      e.preventDefault();
      menuCrear();
      return;
    }
    if (e.key === '/' && !enCampo) {
      e.preventDefault();
      document.getElementById('global-search').focus();
    }
  });
}

/* ── Primer arranque ─────────────────────────────────────── */

function sugerirPrimerPaso() {
  if (ls.get('enlace-crm:bienvenida')) return;
  ls.set('enlace-crm:bienvenida', true);

  const d = dialog({
    title: 'Bienvenido a Enlace CRM',
    body: el('div.stack', {}, [
      el('p', { style: { margin: '0', color: 'var(--ink-2)' }, text: 'Aquí organizas empresas, los materiales que les vendes o que te suministran, los precios acordados y todo el seguimiento comercial.' }),
      el('div.callout', { text: S.store.mode === 'supabase'
        ? 'Estás conectado a la nube: los cambios que hagas se verán al instante en el equipo de tu socio.'
        : 'Ahora mismo los datos se guardan solo en este navegador. En Ajustes → Sincronización te explico cómo compartirlo con tu socio en tiempo real.' }),
      el('p', { style: { margin: '0', color: 'var(--ink-2)' }, text: '¿Quieres empezar con datos de ejemplo para ver cómo funciona? Puedes borrarlos cuando quieras desde Ajustes.' }),
    ]),
    actions: [
      el('div.spacer', { style: { flex: '1' } }),
      el('button.btn', { text: 'Empezar de cero', onclick: () => d.close() }),
      el('button.btn.btn--primary', {
        text: 'Cargar ejemplo',
        onclick: async () => {
          d.close();
          const { cargarDemo } = await import('./data/demo.js');
          try {
            await cargarDemo();
            toast('Datos de ejemplo cargados', 'good');
            navegar('#/');
            render();
          } catch (err) { toast(`Error: ${err.message}`, 'error', 6000); }
        },
      }),
    ],
  });
}

/* ── Inicio ──────────────────────────────────────────────── */

arrancar();
