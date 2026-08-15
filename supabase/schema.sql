-- ============================================================
--  Enlace CRM — esquema de base de datos (Supabase / PostgreSQL)
--
--  Cómo usarlo:
--    1. Entra a tu proyecto en https://supabase.com
--    2. Abre  SQL Editor → New query
--    3. Pega TODO este archivo y presiona Run
--
--  Es idempotente: puedes volver a ejecutarlo sin romper nada.
-- ============================================================

-- ── Empresas ────────────────────────────────────────────────
create table if not exists public.empresas (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  razon_social      text,
  rfc               text,
  tipo              text,
  estatus           text,
  industria         text,
  sitio_web         text,
  telefono          text,
  email             text,
  direccion         text,
  ciudad            text,
  estado            text,
  cp                text,
  pais              text,
  moneda            text default 'MXN',
  condiciones_pago  text,
  limite_credito    numeric,
  descuento_pct     numeric,
  responsable       text,
  etiquetas         text[] default '{}',
  notas             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  created_by        text,
  updated_by        text
);

-- ── Contactos ───────────────────────────────────────────────
create table if not exists public.contactos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  empresa_id  uuid references public.empresas(id) on delete cascade,
  puesto      text,
  area        text,
  email       text,
  telefono    text,
  movil       text,
  extension   text,
  cumpleanos  date,
  principal   boolean default false,
  etiquetas   text[] default '{}',
  notas       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  created_by  text,
  updated_by  text
);

-- ── Materiales ──────────────────────────────────────────────
create table if not exists public.materiales (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  sku             text,
  categoria       text,
  marca           text,
  unidad          text,
  activo          boolean default true,
  descripcion     text,
  costo           numeric,
  precio_lista    numeric,
  moneda          text default 'MXN',
  iva_pct         numeric default 16,
  stock           numeric,
  stock_min       numeric,
  lead_time_dias  integer,
  ubicacion       text,
  etiquetas       text[] default '{}',
  notas           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  created_by      text,
  updated_by      text
);

-- ── Precios acordados por empresa (empresa ↔ material) ──────
create table if not exists public.catalogo (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid references public.empresas(id)  on delete cascade,
  material_id       uuid references public.materiales(id) on delete cascade,
  rol               text,              -- 'Venta' | 'Compra'
  precio            numeric,
  moneda            text default 'MXN',
  unidad            text,
  descuento_pct     numeric,
  cantidad_minima   numeric,
  lead_time_dias    integer,
  codigo_proveedor  text,
  vigencia          date,
  vigente           boolean default true,
  notas             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  created_by        text,
  updated_by        text
);

-- ── Oportunidades ───────────────────────────────────────────
create table if not exists public.oportunidades (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  empresa_id        uuid references public.empresas(id)  on delete cascade,
  contacto_id       uuid references public.contactos(id) on delete set null,
  etapa             text,
  valor             numeric,
  moneda            text default 'MXN',
  probabilidad      numeric,
  cierre_estimado   date,
  fuente            text,
  responsable       text,
  motivo_perdida    text,
  etiquetas         text[] default '{}',
  descripcion       text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  created_by        text,
  updated_by        text
);

-- ── Cotizaciones (los renglones viven en items jsonb) ───────
create table if not exists public.cotizaciones (
  id                uuid primary key default gen_random_uuid(),
  folio             text,
  empresa_id        uuid references public.empresas(id)      on delete cascade,
  contacto_id       uuid references public.contactos(id)     on delete set null,
  oportunidad_id    uuid references public.oportunidades(id) on delete set null,
  estatus           text,
  fecha             date,
  vigencia          date,
  referencia        text,
  moneda            text default 'MXN',
  tipo_cambio       numeric,
  iva_pct           numeric default 16,
  descuento_pct     numeric default 0,
  condiciones_pago  text,
  tiempo_entrega    text,
  responsable       text,
  notas             text,
  items             jsonb default '[]'::jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  created_by        text,
  updated_by        text
);

-- ── Actividades ─────────────────────────────────────────────
create table if not exists public.actividades (
  id              uuid primary key default gen_random_uuid(),
  asunto          text not null,
  tipo            text,
  estatus         text,
  prioridad       text,
  fecha           date,
  hora            text,
  empresa_id      uuid references public.empresas(id)      on delete cascade,
  contacto_id     uuid references public.contactos(id)     on delete set null,
  oportunidad_id  uuid references public.oportunidades(id) on delete cascade,
  responsable     text,
  detalle         text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  created_by      text,
  updated_by      text
);

-- ── Ajustes (un solo renglón: id = 'global') ────────────────
create table if not exists public.ajustes (
  id                   text primary key default 'global',
  empresa_nombre       text,
  razon_social         text,
  rfc                  text,
  direccion            text,
  telefono             text,
  email                text,
  sitio_web            text,
  moneda_base          text default 'MXN',
  tc_usd               numeric default 17.5,
  tc_eur               numeric default 19.5,
  iva_pct              numeric default 16,
  prefijo_cotizacion   text default 'COT',
  condiciones_default  text,
  vigencia_dias        integer default 15,
  equipo               text[] default '{}',
  notas_cotizacion     text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  created_by           text,
  updated_by           text
);

insert into public.ajustes (id, empresa_nombre)
values ('global', 'Enlace')
on conflict (id) do nothing;

-- ── Índices ─────────────────────────────────────────────────
create index if not exists idx_contactos_empresa     on public.contactos(empresa_id);
create index if not exists idx_catalogo_empresa      on public.catalogo(empresa_id);
create index if not exists idx_catalogo_material     on public.catalogo(material_id);
create index if not exists idx_oportunidades_empresa on public.oportunidades(empresa_id);
create index if not exists idx_cotizaciones_empresa  on public.cotizaciones(empresa_id);
create index if not exists idx_actividades_empresa   on public.actividades(empresa_id);
create index if not exists idx_actividades_fecha     on public.actividades(fecha);

-- ============================================================
--  Seguridad: solo usuarios con sesión iniciada pueden leer o
--  escribir. Crea las cuentas en Authentication → Users.
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array['empresas','contactos','materiales','catalogo',
                           'oportunidades','cotizaciones','actividades','ajustes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "acceso_equipo" on public.%I', t);
    execute format($f$
      create policy "acceso_equipo" on public.%I
        for all
        to authenticated
        using (true)
        with check (true)
    $f$, t);
  end loop;
end $$;

-- ============================================================
--  Tiempo real: publica los cambios a los clientes conectados
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array['empresas','contactos','materiales','catalogo',
                           'oportunidades','cotizaciones','actividades','ajustes']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;  -- ya estaba publicada
    end;
  end loop;
end $$;

-- Necesario para que los eventos DELETE incluyan la fila anterior.
alter table public.empresas      replica identity full;
alter table public.contactos     replica identity full;
alter table public.materiales    replica identity full;
alter table public.catalogo      replica identity full;
alter table public.oportunidades replica identity full;
alter table public.cotizaciones  replica identity full;
alter table public.actividades   replica identity full;
alter table public.ajustes       replica identity full;
