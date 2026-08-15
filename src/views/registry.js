/* Registro de editores y secciones a medida, para evitar dependencias circulares. */

const editores = new Map();
const secciones = new Map();

export const setEditor = (resource, fn) => editores.set(resource, fn);
export const getEditor = (resource) => editores.get(resource);

export const setSecciones = (resource, fn) => secciones.set(resource, fn);
export const getSecciones = (resource) => secciones.get(resource);
