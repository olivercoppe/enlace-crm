/* Tablas persistidas. `ajustes` es un singleton (un solo renglón id='global'). */
export const DATA_TABLES = ['empresas', 'contactos', 'materiales', 'catalogo', 'oportunidades', 'cotizaciones', 'actividades'];
export const ALL_TABLES = [...DATA_TABLES, 'ajustes'];

/* Campos que en Postgres son arreglos o JSON. */
export const ARRAY_FIELDS = new Set(['etiquetas']);
export const JSON_FIELDS = new Set(['items']);
