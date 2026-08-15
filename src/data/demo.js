/* ============================================================
   Datos de ejemplo — para ver el CRM funcionando desde el
   primer minuto. Se pueden borrar desde Ajustes.
   ============================================================ */

import { uid, todayISO, addDays } from '../lib/utils.js';
import { nuevoRegistro } from './schema.js';
import * as S from './store.js';

export async function cargarDemo() {
  const hoy = todayISO();
  const id = () => uid();

  const eAcero = id(), eConst = id(), eEmpaq = id(), ePlast = id(), eLogis = id();
  const mLamina = id(), mTubo = id(), mSoldadura = id(), mPolietileno = id(), mCaja = id(), mPintura = id();
  const oAnual = id(), oNave = id(), oEmpaque = id(), oRefacc = id();

  const empresas = [
    { id: eAcero, nombre: 'Aceros del Norte', razon_social: 'Aceros del Norte S.A. de C.V.', rfc: 'ADN050212J41', tipo: 'Proveedor', estatus: 'Activo', industria: 'Siderurgia', ciudad: 'Monterrey', estado: 'Nuevo León', pais: 'México', telefono: '81 8123 4500', email: 'ventas@acerosdelnorte.mx', moneda: 'MXN', condiciones_pago: '30 días', etiquetas: ['Metales', 'Proveedor clave'], notas: 'Mejores precios en lámina rolada. Entrega en 5 días hábiles.' },
    { id: eConst, nombre: 'Constructora Vértice', razon_social: 'Constructora Vértice S. de R.L.', rfc: 'CVE110930TR2', tipo: 'Cliente', estatus: 'Activo', industria: 'Construcción', ciudad: 'Guadalajara', estado: 'Jalisco', pais: 'México', telefono: '33 3641 2200', email: 'compras@vertice.com.mx', moneda: 'MXN', condiciones_pago: '45 días', limite_credito: 500000, descuento_pct: 5, etiquetas: ['Cliente A', 'Obra pública'] },
    { id: eEmpaq, nombre: 'Empaques Modernos', tipo: 'Cliente y Proveedor', estatus: 'Activo', industria: 'Empaque', ciudad: 'Querétaro', estado: 'Querétaro', pais: 'México', telefono: '442 210 8890', email: 'contacto@empaquesmodernos.mx', moneda: 'MXN', condiciones_pago: '30 días', etiquetas: ['Recurrente'] },
    { id: ePlast, nombre: 'Plásticos Industriales GT', tipo: 'Proveedor', estatus: 'Activo', industria: 'Petroquímica', ciudad: 'Toluca', estado: 'Estado de México', pais: 'México', moneda: 'USD', condiciones_pago: 'Contado', etiquetas: ['Importación'] },
    { id: eLogis, nombre: 'Grupo Logístico Peninsular', tipo: 'Prospecto', estatus: 'Prospecto', industria: 'Logística', ciudad: 'Mérida', estado: 'Yucatán', pais: 'México', moneda: 'MXN', condiciones_pago: '30 días', etiquetas: ['Prospecto caliente'] },
  ].map(e => ({ ...nuevoRegistro('empresas'), ...e }));

  const contactos = [
    { empresa_id: eAcero, nombre: 'Ricardo Elizondo', puesto: 'Gerente de ventas', area: 'Ventas', email: 'relizondo@acerosdelnorte.mx', movil: '81 1234 5678', principal: true },
    { empresa_id: eConst, nombre: 'Mariana Ortiz', puesto: 'Jefa de compras', area: 'Compras', email: 'mortiz@vertice.com.mx', movil: '33 1198 4477', principal: true },
    { empresa_id: eConst, nombre: 'Luis Barrera', puesto: 'Superintendente de obra', area: 'Operaciones', email: 'lbarrera@vertice.com.mx', movil: '33 2255 9010' },
    { empresa_id: eEmpaq, nombre: 'Paola Sandoval', puesto: 'Directora comercial', area: 'Dirección', email: 'psandoval@empaquesmodernos.mx', movil: '442 118 3300', principal: true },
    { empresa_id: eLogis, nombre: 'Carlos Uc', puesto: 'Coordinador de abasto', email: 'carlos.uc@glpeninsular.mx', movil: '999 421 7788', principal: true },
  ].map(c => ({ ...nuevoRegistro('contactos'), ...c }));

  const materiales = [
    { id: mLamina, nombre: 'Lámina rolada en frío cal. 20', sku: 'MAT-0001', categoria: 'Acero', marca: 'Ternium', unidad: 'Tonelada', costo: 21500, precio_lista: 26800, moneda: 'MXN', iva_pct: 16, stock: 12, stock_min: 5, lead_time_dias: 5, ubicacion: 'Almacén A', descripcion: 'Lámina CR calibre 20, 1.22 × 2.44 m.', etiquetas: ['Alta rotación'] },
    { id: mTubo, nombre: 'Tubo estructural OC 2"', sku: 'MAT-0002', categoria: 'Acero', unidad: 'Pieza', costo: 480, precio_lista: 645, moneda: 'MXN', iva_pct: 16, stock: 140, stock_min: 60, lead_time_dias: 7, ubicacion: 'Patio' },
    { id: mSoldadura, nombre: 'Electrodo 6013 3/32"', sku: 'MAT-0003', categoria: 'Ferretería', marca: 'Infra', unidad: 'Kilogramo', costo: 62, precio_lista: 89, moneda: 'MXN', iva_pct: 16, stock: 38, stock_min: 40, lead_time_dias: 2 },
    { id: mPolietileno, nombre: 'Polietileno de alta densidad', sku: 'MAT-0004', categoria: 'Plástico', unidad: 'Kilogramo', costo: 1.45, precio_lista: 1.98, moneda: 'USD', iva_pct: 16, stock: 4200, stock_min: 1500, lead_time_dias: 21, descripcion: 'Resina HDPE grado inyección.' },
    { id: mCaja, nombre: 'Caja corrugada 40×30×25', sku: 'MAT-0005', categoria: 'Empaque', unidad: 'Millar', costo: 8900, precio_lista: 11500, moneda: 'MXN', iva_pct: 16, stock: 6, stock_min: 3, lead_time_dias: 10 },
    { id: mPintura, nombre: 'Primario anticorrosivo rojo', sku: 'MAT-0006', categoria: 'Químicos', marca: 'Comex', unidad: 'Litro', costo: 118, precio_lista: 124, moneda: 'MXN', iva_pct: 16, stock: 210, stock_min: 50, lead_time_dias: 3 },
  ].map(m => ({ ...nuevoRegistro('materiales'), ...m }));

  const catalogo = [
    { empresa_id: eAcero, material_id: mLamina, rol: 'Compra', precio: 21500, moneda: 'MXN', unidad: 'Tonelada', lead_time_dias: 5, cantidad_minima: 3, codigo_proveedor: 'LR-CAL20', vigencia: addDays(hoy, 45), vigente: true },
    { empresa_id: eAcero, material_id: mTubo, rol: 'Compra', precio: 480, moneda: 'MXN', unidad: 'Pieza', lead_time_dias: 7, cantidad_minima: 50, vigencia: addDays(hoy, 45), vigente: true },
    { empresa_id: ePlast, material_id: mPolietileno, rol: 'Compra', precio: 1.45, moneda: 'USD', unidad: 'Kilogramo', lead_time_dias: 21, cantidad_minima: 1000, vigencia: addDays(hoy, -10), vigente: true, notas: 'Precio sujeto a tipo de cambio.' },
    { empresa_id: eEmpaq, material_id: mCaja, rol: 'Compra', precio: 8900, moneda: 'MXN', unidad: 'Millar', lead_time_dias: 10, vigencia: addDays(hoy, 60), vigente: true },

    { empresa_id: eConst, material_id: mLamina, rol: 'Venta', precio: 25400, moneda: 'MXN', unidad: 'Tonelada', descuento_pct: 5, lead_time_dias: 8, cantidad_minima: 2, vigencia: addDays(hoy, 30), vigente: true },
    { empresa_id: eConst, material_id: mTubo, rol: 'Venta', precio: 612, moneda: 'MXN', unidad: 'Pieza', descuento_pct: 5, lead_time_dias: 8, cantidad_minima: 100, vigencia: addDays(hoy, 30), vigente: true },
    { empresa_id: eConst, material_id: mPintura, rol: 'Venta', precio: 139, moneda: 'MXN', unidad: 'Litro', lead_time_dias: 4, vigente: true },
    { empresa_id: eEmpaq, material_id: mPolietileno, rol: 'Venta', precio: 2.15, moneda: 'USD', unidad: 'Kilogramo', lead_time_dias: 25, cantidad_minima: 500, vigente: true },
    { empresa_id: eLogis, material_id: mCaja, rol: 'Venta', precio: 11900, moneda: 'MXN', unidad: 'Millar', lead_time_dias: 12, vigente: true },
  ].map(c => ({ ...nuevoRegistro('catalogo'), ...c }));

  const oportunidades = [
    { id: oAnual, titulo: 'Suministro anual de lámina', empresa_id: eConst, contacto_id: contactos[1].id, etapa: 'Negociación', valor: 1850000, moneda: 'MXN', probabilidad: 75, cierre_estimado: addDays(hoy, 18), fuente: 'Cliente recurrente', responsable: 'Socio 1', descripcion: 'Contrato marco a 12 meses con entregas mensuales.' },
    { id: oNave, titulo: 'Estructura para nave industrial', empresa_id: eConst, contacto_id: contactos[2].id, etapa: 'Cotización', valor: 640000, moneda: 'MXN', probabilidad: 50, cierre_estimado: addDays(hoy, 9), fuente: 'Referido', responsable: 'Socio 2' },
    { id: oEmpaque, titulo: 'Resina HDPE trimestre 3', empresa_id: eEmpaq, contacto_id: contactos[3].id, etapa: 'Calificación', valor: 42000, moneda: 'USD', probabilidad: 25, cierre_estimado: addDays(hoy, 32), fuente: 'Cliente recurrente', responsable: 'Socio 1' },
    { id: oRefacc, titulo: 'Empaque para centro de distribución', empresa_id: eLogis, contacto_id: contactos[4].id, etapa: 'Prospección', valor: 380000, moneda: 'MXN', probabilidad: 10, cierre_estimado: addDays(hoy, 60), fuente: 'Feria / evento', responsable: 'Socio 2' },
    { titulo: 'Lote de tubería para remodelación', empresa_id: eConst, etapa: 'Ganada', valor: 214000, moneda: 'MXN', probabilidad: 100, cierre_estimado: addDays(hoy, -12), responsable: 'Socio 1' },
    { titulo: 'Pintura anticorrosiva planta 2', empresa_id: eEmpaq, etapa: 'Perdida', valor: 96000, moneda: 'MXN', probabilidad: 0, cierre_estimado: addDays(hoy, -25), motivo_perdida: 'Precio 12% arriba del competidor', responsable: 'Socio 2' },
  ].map(o => ({ ...nuevoRegistro('oportunidades'), ...o }));

  const year = new Date().getFullYear();
  const cotizaciones = [
    {
      folio: `COT-${year}-0001`, empresa_id: eConst, contacto_id: contactos[1].id, oportunidad_id: oNave,
      estatus: 'Enviada', fecha: addDays(hoy, -6), vigencia: addDays(hoy, 4), moneda: 'MXN', iva_pct: 16,
      descuento_pct: 0, condiciones_pago: '45 días', tiempo_entrega: '10 días hábiles', responsable: 'Socio 2',
      referencia: 'OC-8841',
      items: [
        { _id: uid(), material_id: mLamina, descripcion: 'Lámina rolada en frío cal. 20', unidad: 'Tonelada', cantidad: 14, precio_unitario: 25400, costo_unitario: 21500, descuento_pct: 5 },
        { _id: uid(), material_id: mTubo, descripcion: 'Tubo estructural OC 2"', unidad: 'Pieza', cantidad: 320, precio_unitario: 612, costo_unitario: 480, descuento_pct: 5 },
        { _id: uid(), material_id: null, descripcion: 'Maniobras y flete a obra', unidad: 'Servicio', cantidad: 1, precio_unitario: 18500, costo_unitario: 12000, descuento_pct: 0 },
      ],
      notas: 'Precios sujetos a cambio sin previo aviso. Entrega en obra, zona metropolitana de Guadalajara.',
    },
    {
      folio: `COT-${year}-0002`, empresa_id: eLogis, contacto_id: contactos[4].id, oportunidad_id: oRefacc,
      estatus: 'Borrador', fecha: hoy, vigencia: addDays(hoy, 15), moneda: 'MXN', iva_pct: 16,
      descuento_pct: 3, condiciones_pago: '30 días', tiempo_entrega: '12 días hábiles', responsable: 'Socio 2',
      items: [
        { _id: uid(), material_id: mCaja, descripcion: 'Caja corrugada 40×30×25', unidad: 'Millar', cantidad: 24, precio_unitario: 11900, costo_unitario: 8900, descuento_pct: 0 },
      ],
    },
    {
      folio: `COT-${year}-0003`, empresa_id: eConst, contacto_id: contactos[1].id, oportunidad_id: oAnual,
      estatus: 'Aprobada', fecha: addDays(hoy, -20), vigencia: addDays(hoy, -5), moneda: 'MXN', iva_pct: 16,
      condiciones_pago: '45 días', tiempo_entrega: 'Entregas mensuales', responsable: 'Socio 1',
      items: [
        { _id: uid(), material_id: mTubo, descripcion: 'Tubo estructural OC 2"', unidad: 'Pieza', cantidad: 350, precio_unitario: 612, costo_unitario: 480, descuento_pct: 0 },
      ],
    },
  ].map(c => ({ ...nuevoRegistro('cotizaciones'), ...c }));

  const actividades = [
    { asunto: 'Llamar a Mariana por la revisión de precios', tipo: 'Llamada', estatus: 'Pendiente', prioridad: 'Alta', fecha: addDays(hoy, -2), empresa_id: eConst, contacto_id: contactos[1].id, oportunidad_id: oAnual, responsable: 'Socio 1', detalle: 'Confirmar el ajuste del 5% para el contrato anual.' },
    { asunto: 'Enviar cotización de la nave industrial', tipo: 'Correo', estatus: 'Completada', prioridad: 'Alta', fecha: addDays(hoy, -6), empresa_id: eConst, oportunidad_id: oNave, responsable: 'Socio 2' },
    { asunto: 'Visita técnica al centro de distribución', tipo: 'Visita', estatus: 'Pendiente', prioridad: 'Media', fecha: addDays(hoy, 3), empresa_id: eLogis, contacto_id: contactos[4].id, oportunidad_id: oRefacc, responsable: 'Socio 2', hora: '11:00' },
    { asunto: 'Renegociar precio de resina HDPE', tipo: 'Reunión', estatus: 'Pendiente', prioridad: 'Alta', fecha: hoy, empresa_id: ePlast, responsable: 'Socio 1', detalle: 'El precio vigente ya venció; pedir nueva lista.' },
    { asunto: 'Cotizar electrodos con proveedor alterno', tipo: 'Tarea', estatus: 'Pendiente', prioridad: 'Baja', fecha: addDays(hoy, 7), responsable: 'Socio 1' },
    { asunto: 'Seguimiento a Empaques Modernos', tipo: 'WhatsApp', estatus: 'Completada', prioridad: 'Media', fecha: addDays(hoy, -11), empresa_id: eEmpaq, contacto_id: contactos[3].id, responsable: 'Socio 1' },
  ].map(a => ({ ...nuevoRegistro('actividades'), ...a }));

  await S.saveMany('empresas', empresas);
  await S.saveMany('contactos', contactos);
  await S.saveMany('materiales', materiales);
  await S.saveMany('catalogo', catalogo);
  await S.saveMany('oportunidades', oportunidades);
  await S.saveMany('cotizaciones', cotizaciones);
  await S.saveMany('actividades', actividades);

  return {
    empresas: empresas.length, contactos: contactos.length, materiales: materiales.length,
    catalogo: catalogo.length, oportunidades: oportunidades.length,
    cotizaciones: cotizaciones.length, actividades: actividades.length,
  };
}
