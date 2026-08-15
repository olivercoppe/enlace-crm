/* ============================================================
   Adaptador Supabase — sincronización en tiempo real
   Requiere config.js con { supabaseUrl, supabaseAnonKey }.
   La seguridad vive en las políticas RLS (ver supabase/schema.sql).
   ============================================================ */

import { ALL_TABLES } from './tables.js';

const SDK_URL = 'https://esm.sh/@supabase/supabase-js@2.45.4';

export function createSupabaseAdapter({ url, anonKey }) {
  let client = null;
  let onChange = null;
  let channel = null;
  let onStatus = null;

  const emitStatus = (state, detail) => onStatus?.(state, detail);

  return {
    name: 'supabase',
    label: 'Nube (tiempo real)',
    realtime: true,

    get client() { return client; },

    async init() {
      const { createClient } = await import(/* @vite-ignore */ SDK_URL);
      client = createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
        realtime: { params: { eventsPerSecond: 8 } },
      });
      const { data } = await client.auth.getSession();
      return { ok: true, session: data?.session || null };
    },

    /* ── Sesión ── */
    async getSession() {
      const { data } = await client.auth.getSession();
      return data?.session || null;
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.session;
    },
    async signOut() {
      channel?.unsubscribe();
      channel = null;
      await client.auth.signOut();
    },
    onAuthChange(cb) {
      client.auth.onAuthStateChange((_evt, session) => cb(session));
    },

    /* ── Lectura ── */
    async loadAll() {
      const out = {};
      const results = await Promise.all(ALL_TABLES.map(async (t) => {
        const { data, error } = await client.from(t).select('*');
        if (error) throw new Error(`${t}: ${error.message}`);
        return [t, data || []];
      }));
      for (const [t, rows] of results) out[t] = rows;
      return out;
    },

    /* ── Escritura ── */
    async upsert(table, row) {
      const { data, error } = await client.from(table).upsert(row).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    async upsertMany(table, rows) {
      if (!rows.length) return [];
      const { data, error } = await client.from(table).upsert(rows).select();
      if (error) throw new Error(error.message);
      return data;
    },

    async remove(table, id) {
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },

    async removeMany(table, ids) {
      if (!ids.length) return;
      const { error } = await client.from(table).delete().in('id', ids);
      if (error) throw new Error(error.message);
    },

    async replaceAll(db) {
      for (const t of ALL_TABLES) {
        const { error: delErr } = await client.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delErr) throw new Error(`${t}: ${delErr.message}`);
        const rows = db[t] || [];
        if (rows.length) {
          const { error } = await client.from(t).insert(rows);
          if (error) throw new Error(`${t}: ${error.message}`);
        }
      }
    },

    /* ── Tiempo real ── */
    subscribeRealtime() {
      if (channel) return;
      channel = client.channel('enlace-crm-db');
      for (const table of ALL_TABLES) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          onChange?.({
            table,
            event: payload.eventType,
            row: payload.new && Object.keys(payload.new).length ? payload.new : null,
            oldId: payload.old?.id ?? null,
          });
        });
      }
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') emitStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') emitStatus('error', status);
        else emitStatus('syncing', status);
      });
    },

    onChange(cb) { onChange = cb; },
    onStatus(cb) { onStatus = cb; },

    destroy() { channel?.unsubscribe(); channel = null; },
  };
}
