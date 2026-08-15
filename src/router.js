/* ============================================================
   Enrutador por hash — sin dependencias, compatible con
   GitHub Pages y cualquier hosting estático.
   ============================================================ */

const listeners = [];

export function rutaActual() {
  const hash = (location.hash || '#/').replace(/^#/, '');
  const [ruta, query] = hash.split('?');
  const partes = ruta.split('/').filter(Boolean);
  return {
    vista: partes[0] || 'inicio',
    id: partes[1] || null,
    params: new URLSearchParams(query || ''),
    hash,
  };
}

export function navegar(hash, { reemplazar = false } = {}) {
  const destino = hash.startsWith('#') ? hash : `#${hash}`;
  if (location.hash === destino) { emitir(); return; }
  if (reemplazar) history.replaceState(null, '', destino);
  else location.hash = destino;
}

export function onRuta(cb) {
  listeners.push(cb);
  return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); };
}

const emitir = () => { for (const cb of listeners) cb(rutaActual()); };

window.addEventListener('hashchange', emitir);

export const iniciarRouter = () => emitir();
