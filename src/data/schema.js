/* ============================================================
   Modelo de datos de Enlace CRM
   Cada recurso define sus campos (formulario), columnas (tabla),
   campos de búsqueda y filtros. Las vistas se generan desde aquí.
   ============================================================ */

/* ── Catálogos ───────────────────────────────────────────── */

export const MONEDAS = ['MXN', 'USD', 'EUR'];

export const UNIDADES = [
  'Pieza', 'Kilogramo', 'Tonelada', 'Gramo', 'Litro', 'Metro', 'Metro²', 'Metro³',
  'Caja', 'Paquete', 'Rollo', 'Tarima', 'Costal', 'Bulto', 'Servicio', 'Hora', 'Millar',
];

export const TIPOS_EMPRESA = ['Cliente', 'Proveedor', 'Cliente y Proveedor', 'Prospecto', 'Competencia'];

export const ESTATUS_EMPRESA = ['Activo', 'Prospecto', 'Pausado', 'Inactivo'];

export const CONDICIONES_PAGO = [
  'Contado', 'Anticipo 50%', 'Anticipo 100%', '8 días', '15 días', '30 días', '45 días', '60 días', '90 días',
];

export const ETAPAS = [
  { key: 'Prospección', prob: 10, color: 'var(--s1)' },
  { key: 'Calificación', prob: 25, color: 'var(--s2)' },
  { key: 'Cotización', prob: 50, color: 'var(--s3)' },
  { key: 'Negociación', prob: 75, color: 'var(--s4)' },
  { key: 'Ganada', prob: 100, color: 'var(--s6)' },
  { key: 'Perdida', prob: 0, color: 'var(--s8)' },
];
export const ETAPAS_KEYS = ETAPAS.map(e => e.key);
export const ETAPAS_ABIERTAS = ETAPAS_KEYS.filter(k => k !== 'Ganada' && k !== 'Perdida');

export const ESTATUS_COTIZACION = ['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida'];

export const TIPOS_ACTIVIDAD = ['Llamada', 'Correo', 'Reunión', 'Visita', 'WhatsApp', 'Tarea', 'Nota'];
export const ESTATUS_ACTIVIDAD = ['Pendiente', 'Completada', 'Cancelada'];
export const PRIORIDADES = ['Alta', 'Media', 'Baja'];

export const ROLES_CATALOGO = [
  { value: 'Venta', label: 'Venta — se lo vendemos a esta empresa' },
  { value: 'Compra', label: 'Compra — esta empresa nos lo vende' },
];

export const CATEGORIAS_SUGERIDAS = [
  'Acero', 'Aluminio', 'Cobre', 'Plástico', 'Madera', 'Vidrio', 'Químicos', 'Empaque',
  'Ferretería', 'Eléctrico', 'Herramienta', 'Refacciones', 'Papelería', 'Servicio', 'Otro',
];

/* Tipos de gasto del desglose de costo de producción. */
export const CATEGORIAS_COSTO = [
  'Materia prima', 'Insumos', 'Mano de obra', 'Maquinaria', 'Energía',
  'Empaque', 'Flete', 'Merma', 'Servicios externos', 'Otro',
];

/* Tablas persistidas (orden = orden de carga y de respaldo) */
export const TABLAS = ['empresas', 'contactos', 'materiales', 'catalogo', 'oportunidades', 'cotizaciones', 'actividades'];

/* ── Helpers de opciones dinámicas ───────────────────────── */

const optEmpresas = (ctx) =>
  (ctx.db?.empresas || [])
    .slice()
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'))
    .map(e => ({ value: e.id, label: e.nombre }));

const optContactos = (ctx, values) => {
  const all = ctx.db?.contactos || [];
  const filtrados = values?.empresa_id ? all.filter(c => c.empresa_id === values.empresa_id) : all;
  return filtrados
    .slice()
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'))
    .map(c => ({ value: c.id, label: c.nombre }));
};

const optMateriales = (ctx) =>
  (ctx.db?.materiales || [])
    .slice()
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'))
    .map(m => ({ value: m.id, label: m.sku ? `${m.sku} · ${m.nombre}` : m.nombre }));

const optUsuarios = (ctx) => (ctx.usuarios || []).map(u => ({ value: u, label: u }));

/* ── Recursos ────────────────────────────────────────────── */

export const RESOURCES = {

  /* ---------------------------------------------------- Empresas */
  empresas: {
    key: 'empresas',
    label: 'Empresas',
    singular: 'Empresa',
    genero: 'f',
    icon: '⌂',
    titleField: 'nombre',
    search: ['nombre', 'razon_social', 'rfc', 'industria', 'ciudad', 'email', 'telefono', 'etiquetas'],
    defaults: { tipo: 'Cliente', estatus: 'Prospecto', moneda: 'MXN', condiciones_pago: '30 días', pais: 'México', etiquetas: [] },
    fields: [
      { key: 'nombre', label: 'Nombre comercial', type: 'text', required: true, group: 'Identificación', placeholder: 'Ej. Aceros del Norte' },
      { key: 'razon_social', label: 'Razón social', type: 'text' },
      { key: 'rfc', label: 'RFC / Tax ID', type: 'text', placeholder: 'AAA010101AAA' },
      { key: 'tipo', label: 'Relación', type: 'select', options: TIPOS_EMPRESA, required: true },
      { key: 'estatus', label: 'Estatus', type: 'select', options: ESTATUS_EMPRESA, required: true },
      { key: 'industria', label: 'Industria / giro', type: 'text', placeholder: 'Metalmecánica' },
      { key: 'sitio_web', label: 'Sitio web', type: 'url', placeholder: 'https://' },
      { key: 'telefono', label: 'Teléfono', type: 'tel', group: 'Contacto' },
      { key: 'email', label: 'Correo general', type: 'email' },
      { key: 'direccion', label: 'Dirección', type: 'text', full: true },
      { key: 'ciudad', label: 'Ciudad', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'text' },
      { key: 'cp', label: 'Código postal', type: 'text' },
      { key: 'pais', label: 'País', type: 'text' },
      { key: 'moneda', label: 'Moneda preferente', type: 'select', options: MONEDAS, group: 'Comercial', required: true },
      { key: 'condiciones_pago', label: 'Condiciones de pago', type: 'select', options: CONDICIONES_PAGO },
      { key: 'limite_credito', label: 'Límite de crédito', type: 'currency', min: 0 },
      { key: 'descuento_pct', label: 'Descuento pactado (%)', type: 'number', min: 0, step: '0.5' },
      { key: 'responsable', label: 'Responsable interno', type: 'select', options: optUsuarios, allowEmpty: true },
      { key: 'etiquetas', label: 'Etiquetas', type: 'tags', full: true },
      { key: 'notas', label: 'Notas', type: 'textarea', full: true, rows: 4 },
    ],
    columns: ['nombre', 'tipo', 'estatus', 'industria', 'ciudad', 'responsable'],
    filters: [
      { key: 'tipo', label: 'Relación', options: TIPOS_EMPRESA },
      { key: 'estatus', label: 'Estatus', options: ESTATUS_EMPRESA },
    ],
  },

  /* --------------------------------------------------- Contactos */
  contactos: {
    key: 'contactos',
    label: 'Contactos',
    singular: 'Contacto',
    genero: 'm',
    icon: '☺',
    titleField: 'nombre',
    search: ['nombre', 'puesto', 'email', 'telefono', 'movil', 'area'],
    defaults: { principal: false, etiquetas: [] },
    fields: [
      { key: 'nombre', label: 'Nombre completo', type: 'text', required: true, group: 'Identificación' },
      { key: 'empresa_id', label: 'Empresa', type: 'select', options: optEmpresas, required: true },
      { key: 'puesto', label: 'Puesto', type: 'text', placeholder: 'Gerente de compras' },
      { key: 'area', label: 'Área', type: 'text', placeholder: 'Compras / Ventas / Operaciones' },
      { key: 'email', label: 'Correo', type: 'email', group: 'Contacto' },
      { key: 'telefono', label: 'Teléfono fijo', type: 'tel' },
      { key: 'movil', label: 'Celular / WhatsApp', type: 'tel' },
      { key: 'extension', label: 'Extensión', type: 'text' },
      { key: 'cumpleanos', label: 'Cumpleaños', type: 'date' },
      { key: 'principal', label: 'Es el contacto principal de la empresa', type: 'checkbox', full: true },
      { key: 'etiquetas', label: 'Etiquetas', type: 'tags', full: true },
      { key: 'notas', label: 'Notas', type: 'textarea', full: true, rows: 3 },
    ],
    columns: ['nombre', 'puesto', 'empresa_id', 'email', 'movil', 'principal'],
    filters: [{ key: 'empresa_id', label: 'Empresa', options: optEmpresas, ref: 'empresas' }],
  },

  /* -------------------------------------------------- Materiales */
  materiales: {
    key: 'materiales',
    label: 'Materiales',
    singular: 'Material',
    genero: 'm',
    icon: '▣',
    titleField: 'nombre',
    search: ['nombre', 'sku', 'categoria', 'descripcion', 'marca', 'etiquetas'],
    defaults: {
      unidad: 'Pieza', moneda: 'MXN', activo: true, iva_pct: 16, etiquetas: [],
      costos_produccion: [], unidades_lote: 1, usar_costo_produccion: true,
    },
    fields: [
      { key: 'nombre', label: 'Nombre del material', type: 'text', required: true, group: 'Identificación' },
      { key: 'sku', label: 'SKU / Clave interna', type: 'text', placeholder: 'MAT-0001' },
      { key: 'categoria', label: 'Categoría', type: 'text', placeholder: 'Acero' },
      { key: 'marca', label: 'Marca / fabricante', type: 'text' },
      { key: 'unidad', label: 'Unidad de medida', type: 'select', options: UNIDADES, required: true },
      { key: 'activo', label: 'Activo en catálogo', type: 'checkbox' },
      { key: 'descripcion', label: 'Descripción / especificación', type: 'textarea', full: true, rows: 3 },
      { key: 'costo', label: 'Costo base', type: 'currency', min: 0, group: 'Precios',
        help: 'Lo que nos cuesta a nosotros. Si desglosas el costo de producción abajo, se calcula solo.' },
      { key: 'precio_lista', label: 'Precio de lista', type: 'currency', min: 0, help: 'Precio de venta sugerido.' },
      { key: 'moneda', label: 'Moneda', type: 'select', options: MONEDAS, required: true },
      { key: 'iva_pct', label: 'IVA (%)', type: 'number', min: 0, step: '0.5' },
      { key: 'stock', label: 'Existencia actual', type: 'number', min: 0, group: 'Inventario y logística' },
      { key: 'stock_min', label: 'Existencia mínima', type: 'number', min: 0, help: 'Aviso cuando se baje de este nivel.' },
      { key: 'lead_time_dias', label: 'Tiempo de entrega (días)', type: 'number', min: 0 },
      { key: 'ubicacion', label: 'Ubicación / almacén', type: 'text' },
      { key: 'etiquetas', label: 'Etiquetas', type: 'tags', full: true },
      { key: 'notas', label: 'Notas', type: 'textarea', full: true, rows: 3 },
    ],
    columns: ['nombre', 'sku', 'categoria', 'unidad', 'costo_produccion', 'costo', 'precio_lista', 'margen', 'stock'],
    filters: [{ key: 'categoria', label: 'Categoría', dynamic: true }],
  },

  /* ---------------------------------------------------- Catálogo */
  catalogo: {
    key: 'catalogo',
    label: 'Precios por empresa',
    singular: 'Precio',
    genero: 'm',
    icon: '⇄',
    titleField: null,
    search: ['codigo_proveedor', 'notas'],
    defaults: { rol: 'Venta', moneda: 'MXN', vigente: true },
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'select', options: optEmpresas, required: true, group: 'Vínculo' },
      { key: 'material_id', label: 'Material', type: 'select', options: optMateriales, required: true },
      { key: 'rol', label: 'Tipo de relación', type: 'select', options: ROLES_CATALOGO, required: true, allowEmpty: false,
        help: 'Define si le vendemos el material o si ellos nos lo suministran.' },
      { key: 'precio', label: 'Precio acordado', type: 'currency', min: 0, required: true, group: 'Condiciones' },
      { key: 'moneda', label: 'Moneda', type: 'select', options: MONEDAS, required: true },
      { key: 'unidad', label: 'Unidad (si difiere)', type: 'select', options: UNIDADES, allowEmpty: true },
      { key: 'descuento_pct', label: 'Descuento (%)', type: 'number', min: 0, step: '0.5' },
      { key: 'cantidad_minima', label: 'Cantidad mínima', type: 'number', min: 0 },
      { key: 'lead_time_dias', label: 'Tiempo de entrega (días)', type: 'number', min: 0 },
      { key: 'codigo_proveedor', label: 'Código de la contraparte', type: 'text', help: 'Cómo identifican ellos este material.' },
      { key: 'vigencia', label: 'Vigente hasta', type: 'date', group: 'Vigencia' },
      { key: 'vigente', label: 'Precio vigente', type: 'checkbox' },
      { key: 'notas', label: 'Notas', type: 'textarea', full: true, rows: 2 },
    ],
    columns: ['empresa_id', 'material_id', 'rol', 'precio', 'unidad', 'lead_time_dias', 'vigencia'],
    filters: [
      { key: 'rol', label: 'Tipo', options: ['Venta', 'Compra'] },
      { key: 'empresa_id', label: 'Empresa', options: optEmpresas, ref: 'empresas' },
    ],
  },

  /* ----------------------------------------------- Oportunidades */
  oportunidades: {
    key: 'oportunidades',
    label: 'Oportunidades',
    singular: 'Oportunidad',
    genero: 'f',
    icon: '◈',
    titleField: 'titulo',
    search: ['titulo', 'descripcion', 'etiquetas'],
    defaults: { etapa: 'Prospección', moneda: 'MXN', probabilidad: 10, etiquetas: [] },
    fields: [
      { key: 'titulo', label: 'Título de la oportunidad', type: 'text', required: true, group: 'General',
        placeholder: 'Suministro anual de lámina' },
      { key: 'empresa_id', label: 'Empresa', type: 'select', options: optEmpresas, required: true },
      { key: 'contacto_id', label: 'Contacto', type: 'select', options: optContactos },
      { key: 'etapa', label: 'Etapa', type: 'select', options: ETAPAS_KEYS, required: true, allowEmpty: false },
      { key: 'valor', label: 'Valor estimado', type: 'currency', min: 0, group: 'Valor y cierre' },
      { key: 'moneda', label: 'Moneda', type: 'select', options: MONEDAS, required: true },
      { key: 'probabilidad', label: 'Probabilidad (%)', type: 'number', min: 0, max: 100, step: '5' },
      { key: 'cierre_estimado', label: 'Cierre estimado', type: 'date' },
      { key: 'fuente', label: 'Origen', type: 'select', options: ['Referido', 'Prospección en frío', 'Sitio web', 'Feria / evento', 'Cliente recurrente', 'Licitación', 'Otro'] },
      { key: 'responsable', label: 'Responsable', type: 'select', options: optUsuarios },
      { key: 'motivo_perdida', label: 'Motivo de pérdida', type: 'text', full: true,
        when: (v) => v?.etapa === 'Perdida' },
      { key: 'etiquetas', label: 'Etiquetas', type: 'tags', full: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea', full: true, rows: 4 },
    ],
    columns: ['titulo', 'empresa_id', 'etapa', 'valor', 'probabilidad', 'cierre_estimado', 'responsable'],
    filters: [
      { key: 'etapa', label: 'Etapa', options: ETAPAS_KEYS },
      { key: 'responsable', label: 'Responsable', dynamic: true },
    ],
  },

  /* ------------------------------------------------ Cotizaciones */
  cotizaciones: {
    key: 'cotizaciones',
    label: 'Cotizaciones',
    singular: 'Cotización',
    genero: 'f',
    icon: '❏',
    titleField: 'folio',
    search: ['folio', 'referencia', 'notas'],
    defaults: { estatus: 'Borrador', moneda: 'MXN', iva_pct: 16, items: [], descuento_pct: 0 },
    fields: [
      { key: 'folio', label: 'Folio', type: 'text', readonly: true, group: 'Encabezado' },
      { key: 'empresa_id', label: 'Empresa', type: 'select', options: optEmpresas, required: true },
      { key: 'contacto_id', label: 'Contacto', type: 'select', options: optContactos },
      { key: 'estatus', label: 'Estatus', type: 'select', options: ESTATUS_COTIZACION, required: true, allowEmpty: false },
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'vigencia', label: 'Vigente hasta', type: 'date' },
      { key: 'oportunidad_id', label: 'Oportunidad ligada', type: 'select',
        options: (ctx) => (ctx.db?.oportunidades || []).map(o => ({ value: o.id, label: o.titulo })) },
      { key: 'referencia', label: 'Referencia / OC del cliente', type: 'text' },
      { key: 'moneda', label: 'Moneda', type: 'select', options: MONEDAS, required: true, group: 'Condiciones' },
      { key: 'tipo_cambio', label: 'Tipo de cambio', type: 'number', step: '0.0001', min: 0, help: 'Solo si la moneda no es la base.' },
      { key: 'iva_pct', label: 'IVA (%)', type: 'number', min: 0, step: '0.5' },
      { key: 'descuento_pct', label: 'Descuento global (%)', type: 'number', min: 0, step: '0.5' },
      { key: 'condiciones_pago', label: 'Condiciones de pago', type: 'select', options: CONDICIONES_PAGO },
      { key: 'tiempo_entrega', label: 'Tiempo de entrega', type: 'text', placeholder: '15 días hábiles' },
      { key: 'responsable', label: 'Responsable', type: 'select', options: optUsuarios },
      { key: 'notas', label: 'Notas y condiciones', type: 'textarea', full: true, rows: 4 },
    ],
    columns: ['folio', 'empresa_id', 'fecha', 'estatus', 'total', 'vigencia', 'responsable'],
    filters: [
      { key: 'estatus', label: 'Estatus', options: ESTATUS_COTIZACION },
      { key: 'empresa_id', label: 'Empresa', options: optEmpresas, ref: 'empresas' },
    ],
  },

  /* -------------------------------------------------- Actividades */
  actividades: {
    key: 'actividades',
    label: 'Actividades',
    singular: 'Actividad',
    genero: 'f',
    icon: '✓',
    titleField: 'asunto',
    search: ['asunto', 'detalle'],
    defaults: { tipo: 'Tarea', estatus: 'Pendiente', prioridad: 'Media' },
    fields: [
      { key: 'asunto', label: 'Asunto', type: 'text', required: true, group: 'General',
        placeholder: 'Dar seguimiento a la cotización' },
      { key: 'tipo', label: 'Tipo', type: 'select', options: TIPOS_ACTIVIDAD, required: true, allowEmpty: false },
      { key: 'estatus', label: 'Estatus', type: 'select', options: ESTATUS_ACTIVIDAD, required: true, allowEmpty: false },
      { key: 'prioridad', label: 'Prioridad', type: 'select', options: PRIORIDADES },
      { key: 'fecha', label: 'Fecha / vencimiento', type: 'date', required: true },
      { key: 'hora', label: 'Hora', type: 'text', placeholder: '10:30' },
      { key: 'empresa_id', label: 'Empresa', type: 'select', options: optEmpresas, group: 'Relacionado con' },
      { key: 'contacto_id', label: 'Contacto', type: 'select', options: optContactos },
      { key: 'oportunidad_id', label: 'Oportunidad', type: 'select',
        options: (ctx) => (ctx.db?.oportunidades || []).map(o => ({ value: o.id, label: o.titulo })) },
      { key: 'responsable', label: 'Responsable', type: 'select', options: optUsuarios },
      { key: 'detalle', label: 'Detalle', type: 'textarea', full: true, rows: 4 },
    ],
    columns: ['asunto', 'tipo', 'empresa_id', 'fecha', 'prioridad', 'estatus', 'responsable'],
    columnLabels: { tipo: 'Tipo' },
    filters: [
      { key: 'estatus', label: 'Estatus', options: ESTATUS_ACTIVIDAD },
      { key: 'tipo', label: 'Tipo', options: TIPOS_ACTIVIDAD },
    ],
  },
};

/* ── Etiquetas legibles de columnas ──────────────────────── */

export const COLUMN_LABELS = {
  nombre: 'Nombre', razon_social: 'Razón social', rfc: 'RFC', tipo: 'Relación', estatus: 'Estatus',
  industria: 'Industria', ciudad: 'Ciudad', responsable: 'Responsable', puesto: 'Puesto',
  empresa_id: 'Empresa', material_id: 'Material', email: 'Correo', movil: 'Celular',
  principal: 'Principal', sku: 'SKU', categoria: 'Categoría', unidad: 'Unidad', costo: 'Costo',
  precio_lista: 'Precio lista', margen: 'Margen', stock: 'Existencia', rol: 'Tipo', precio: 'Precio',
  lead_time_dias: 'Entrega', vigencia: 'Vigencia', titulo: 'Oportunidad', etapa: 'Etapa', valor: 'Valor',
  probabilidad: 'Prob.', cierre_estimado: 'Cierre', folio: 'Folio', fecha: 'Fecha', total: 'Total',
  asunto: 'Asunto', prioridad: 'Prioridad', telefono: 'Teléfono',
  costo_produccion: 'Costo prod.',
};

/** «Nueva empresa» / «Nuevo material» — concordancia de género. */
export const etiquetaNuevo = (R) =>
  `${R.genero === 'f' ? 'Nueva' : 'Nuevo'} ${R.singular.toLowerCase()}`;

/** Registro vacío con los valores por defecto del recurso. */
export function nuevoRegistro(resourceKey, extra = {}) {
  const r = RESOURCES[resourceKey];
  const base = {};
  for (const f of r.fields) base[f.key] = f.type === 'checkbox' ? false : (f.type === 'tags' ? [] : null);
  return { ...base, ...structuredClone(r.defaults || {}), ...extra };
}

/**
 * Desglose de costo de producción de un material.
 * Cada concepto es cantidad × costo unitario; el total del lote se divide
 * entre las unidades que salen del lote para obtener el costo por unidad.
 */
export function totalesProduccion(material) {
  const conceptos = Array.isArray(material?.costos_produccion) ? material.costos_produccion : [];
  const importe = (c) => (Number(c?.cantidad) || 0) * (Number(c?.costo_unitario) || 0);

  const totalLote = conceptos.reduce((acc, c) => acc + importe(c), 0);
  const unidades = Number(material?.unidades_lote) > 0 ? Number(material.unidades_lote) : 1;

  const agrupado = new Map();
  for (const c of conceptos) {
    const k = c?.categoria || 'Otro';
    agrupado.set(k, (agrupado.get(k) || 0) + importe(c));
  }

  return {
    conceptos: conceptos.length,
    totalLote,
    unidades,
    costoUnitario: totalLote / unidades,
    porCategoria: [...agrupado.entries()]
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto),
    importe,
  };
}

/** Margen porcentual de un material. */
export function margenPct(material) {
  const costo = Number(material?.costo);
  const precio = Number(material?.precio_lista);
  if (!isFinite(costo) || !isFinite(precio) || precio <= 0) return null;
  return ((precio - costo) / precio) * 100;
}

/** Totales de una cotización a partir de sus renglones. */
export function totalesCotizacion(cot) {
  const items = cot?.items || [];
  const subtotalBruto = items.reduce((acc, it) => {
    const cant = Number(it.cantidad) || 0;
    const pu = Number(it.precio_unitario) || 0;
    const desc = Number(it.descuento_pct) || 0;
    return acc + cant * pu * (1 - desc / 100);
  }, 0);
  const descGlobal = subtotalBruto * ((Number(cot?.descuento_pct) || 0) / 100);
  const subtotal = subtotalBruto - descGlobal;
  const iva = subtotal * ((Number(cot?.iva_pct) || 0) / 100);
  const costo = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.costo_unitario) || 0), 0);
  return {
    subtotalBruto,
    descuento: descGlobal,
    subtotal,
    iva,
    total: subtotal + iva,
    costo,
    utilidad: subtotal - costo,
    margen: subtotal > 0 ? ((subtotal - costo) / subtotal) * 100 : null,
  };
}
