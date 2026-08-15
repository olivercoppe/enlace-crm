/* ============================================================
   Adaptador local — localStorage + BroadcastChannel
   Funciona sin conexión ni configuración. Sincroniza entre
   pestañas del mismo navegador, no entre equipos.
   ============================================================ */

import { ALL_TABLES } from './tables.js';

const PREFIX = 'enlace-crm:';

export function createLocalAdapter() {
  let channel = null;
  let onChange = null;

  const read = (table) => {
    try { return JSON.parse(localStorage.getItem(PREFIX + table) || '[]'); }
    catch { return []; }
  };
  const write = (table, rows) => {
    try {
      localStorage.setItem(PREFIX + table, JSON.stringify(rows));
      return true;
    } catch (err) {
      console.error('[local] no se pudo guardar', table, err);
      throw new Error('No hay espacio disponible en el almacenamiento del navegador.');
    }
  };
  const broadcast = (table) => channel?.postMessage({ table });

  return {
    name: 'local',
    label: 'Solo este equipo',
    realtime: false,

    async init() {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('enlace-crm');
        channel.onmessage = (ev) => {
          const table = ev.data?.table;
          if (table && onChange) onChange({ table, rows: read(table) });
        };
      }
      return { ok: true };
    },

    async loadAll() {
      return Object.fromEntries(ALL_TABLES.map(t => [t, read(t)]));
    },

    async upsert(table, row) {
      const rows = read(table);
      const i = rows.findIndex(r => r.id === row.id);
      if (i >= 0) rows[i] = row; else rows.push(row);
      write(table, rows);
      broadcast(table);
      return row;
    },

    async upsertMany(table, newRows) {
      const rows = read(table);
      for (const row of newRows) {
        const i = rows.findIndex(r => r.id === row.id);
        if (i >= 0) rows[i] = row; else rows.push(row);
      }
      write(table, rows);
      broadcast(table);
      return newRows;
    },

    async remove(table, id) {
      write(table, read(table).filter(r => r.id !== id));
      broadcast(table);
    },

    async removeMany(table, ids) {
      const set = new Set(ids);
      write(table, read(table).filter(r => !set.has(r.id)));
      broadcast(table);
    },

    async replaceAll(db) {
      for (const t of ALL_TABLES) write(t, db[t] || []);
      broadcast('*');
    },

    onChange(cb) { onChange = cb; },

    destroy() { channel?.close(); channel = null; },
  };
}
