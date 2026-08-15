# Enlace CRM

CRM para **Enlace**: organiza empresas (clientes, proveedores y prospectos), los
materiales que les vendes o que te suministran, los **precios acordados con cada
una**, los contactos, el embudo de ventas, las cotizaciones y el seguimiento
diario — todo en una sola página web que se gestiona con **Git Bash** y se puede
compartir con tu socio **con actualizaciones en tiempo real**.

No necesita compilar nada: es HTML, CSS y JavaScript puro.

---

## 1. Contenido

| Sección | Para qué sirve |
|---|---|
| **Inicio** | Indicadores del negocio, embudo por etapa, pendientes, alertas y actividad del equipo. |
| **Empresas** | Ficha completa: datos fiscales, comerciales, crédito, condiciones de pago, etiquetas. Desde ahí ves sus contactos, sus materiales y precios, oportunidades, cotizaciones y actividades. |
| **Contactos** | Personas por empresa, con puesto, área, correo, celular y contacto principal. |
| **Materiales** | Catálogo maestro: SKU, categoría, unidad, **costo**, **precio de lista**, **margen calculado**, IVA, existencias, mínimos, tiempo de entrega y ubicación. |
| **Precios por empresa** | El corazón del CRM: vincula **empresa ↔ material** con su precio acordado, moneda, descuento, cantidad mínima, tiempo de entrega, código de la contraparte y vigencia. Distingue si **se lo vendemos** o si **nos lo suministran**. |
| **Embudo** | Tablero Kanban de oportunidades; se arrastra la tarjeta para cambiar de etapa. |
| **Cotizaciones** | Documento con renglones, precios traídos automáticamente del acuerdo con esa empresa, descuentos, IVA, totales, **utilidad estimada** e impresión / PDF. |
| **Agenda** | Llamadas, correos, visitas, WhatsApp y tareas, con prioridad, responsable y avisos de vencimiento. |
| **Ajustes** | Perfil de tu empresa, equipo, tipos de cambio, sincronización y respaldos. |

Extras: buscador global (`Ctrl+K`), creación rápida (`Ctrl+N`), tema claro/oscuro,
importación y exportación en CSV, respaldo completo en JSON, y diseño adaptado a
celular.

---

## 2. Abrirlo en tu computadora

Los navegadores no permiten abrir el archivo con doble clic (`file://`), así que
se levanta un servidor local. En **Git Bash**, dentro de la carpeta del proyecto:

```bash
node serve.js
```

Y abre <http://localhost:5173>.

Si no tienes Node instalado, cualquiera de estas también sirve:

```bash
python -m http.server 5173
```

La primera vez te ofrece cargar **datos de ejemplo** para que veas el CRM lleno.
Puedes borrarlos después desde *Ajustes → Datos*.

---

## 3. Subirlo a Git (Git Bash)

```bash
cd "/c/Users/olive/OneDrive/Desktop/CRM"
git init -b main
git add .
git commit -m "Primera versión del CRM de Enlace"
```

Crea el repositorio en GitHub (**privado**) y enlázalo:

```bash
git remote add origin https://github.com/TU-USUARIO/enlace-crm.git
git push -u origin main
```

### Publicarlo en línea

En GitHub: **Settings → Pages → Source: GitHub Actions**. El flujo de trabajo ya
está incluido en `.github/workflows/deploy.yml`, así que cada `git push` deja el
CRM actualizado en `https://TU-USUARIO.github.io/enlace-crm/`.

### Trabajo diario en equipo

```bash
git pull            # traer lo que subió tu socio
# ...cambios...
git add .
git commit -m "Descripción del cambio"
git push
```

> **Importante:** Git sincroniza el *código* del CRM. Los **datos** (empresas,
> precios, cotizaciones) se sincronizan por Supabase, que es el siguiente paso.

---

## 4. Tiempo real con tu socio (Supabase)

Sin esto, cada quien vería sus propios datos en su navegador. Con esto, ambos ven
lo mismo y los cambios aparecen **al instante**, sin recargar.

**Es gratis** en el plan inicial de Supabase y toma unos 10 minutos.

### Paso 1 — Crear el proyecto

1. Entra a <https://supabase.com> y crea una cuenta.
2. **New project**. Ponle nombre (`enlace-crm`), elige región cercana y guarda la
   contraseña de la base de datos.

### Paso 2 — Crear las tablas

1. En el menú lateral: **SQL Editor → New query**.
2. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este proyecto,
   copia **todo** su contenido, pégalo y presiona **Run**.
3. Debe terminar con «Success». Ese script crea las tablas, la seguridad y activa
   el tiempo real. Se puede volver a ejecutar sin problema.

### Paso 3 — Crear las cuentas

**Authentication → Users → Add user → Create new user**. Crea una para ti y otra
para tu socio, cada quien con su correo y contraseña. Marca *Auto Confirm User*.

> Las contraseñas las escribe cada persona; no se guardan en el repositorio.

### Paso 4 — Conectar el CRM

**Project Settings → API** y copia dos valores. Pégalos en `config.js`:

```js
window.ENLACE_CONFIG = {
  supabaseUrl: 'https://xxxxxxxxxxxx.supabase.co',   // Project URL
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIs...',        // anon public
};
```

Guarda y sube el cambio:

```bash
git add config.js
git commit -m "Conectar el CRM con Supabase"
git push
```

Al recargar aparecerá la pantalla de inicio de sesión y, ya dentro, la etiqueta
**«En vivo»** en la esquina inferior izquierda.

> **¿Es seguro publicar la llave `anon`?** Sí: está diseñada para ir en el
> navegador. Quien la tenga no puede leer nada sin iniciar sesión, porque las
> políticas RLS del `schema.sql` exigen una sesión válida. Aun así, mantén el
> repositorio en privado.

---

## 5. Cómo se usa día a día

**Para registrar lo que te vende un proveedor**
Empresas → abre el proveedor → *Nos suministra* → **＋ Precio de compra** →
elige el material, el precio, la moneda, el tiempo de entrega y hasta cuándo es
vigente. El CRM avisa cuando un precio caduca.

**Para registrar lo que le vendes a un cliente**
Empresas → abre el cliente → *Le vendemos* → **＋ Precio de venta**. Ese precio
es el que la cotización usará automáticamente para esa empresa.

**Para cotizar**
Cotizaciones → **＋ Nueva cotización** → elige la empresa → *Agregar renglón*
(o **⊞ Desde catálogo de la empresa** para traer varios de golpe). El precio se
llena solo con el acuerdo de esa empresa; si no existe, usa el precio de lista.
Abajo ves subtotal, IVA, total y **utilidad estimada**. El botón **⎙ Imprimir**
genera el documento membretado listo para PDF o correo.

**Para dar seguimiento**
Arrastra las tarjetas en el Embudo y registra actividades desde cualquier ficha.
Lo atrasado aparece en rojo en el tablero de Inicio.

**Cargar tu información actual**
Cada lista tiene **↑ Importar** para subir un CSV. Descarga primero un
**↓ CSV** de esa misma lista para ver los nombres de columna esperados. Las
empresas y materiales se reconocen por nombre; si no existen, se crean solos.

---

## 6. Respaldos

*Ajustes → Datos → **↓ Exportar respaldo (JSON)*** guarda absolutamente todo en
un archivo. Se restaura desde la misma pantalla, combinando o reemplazando.

Conviene hacerlo antes de una importación grande o de borrar algo.

---

## 7. Estructura del proyecto

```
CRM/
├── index.html                 Estructura de la página
├── config.js                  Credenciales de Supabase (vacío = modo local)
├── serve.js                   Servidor local sin dependencias
├── assets/css/styles.css      Sistema de diseño (tokens, claro/oscuro)
├── supabase/schema.sql        Tablas, seguridad y tiempo real
├── src/
│   ├── app.js                 Arranque, navegación, buscador, sesión
│   ├── router.js              Rutas por # (compatible con GitHub Pages)
│   ├── lib/
│   │   ├── utils.js           Formatos, fechas, dinero, CSV
│   │   └── ui.js              Modales, formularios, tablas, avisos
│   ├── data/
│   │   ├── schema.js          Modelo de datos: campos, columnas, catálogos
│   │   ├── store.js           Estado central, guardado, monedas
│   │   ├── local.js           Modo local (navegador)
│   │   ├── supabase.js        Modo nube con tiempo real
│   │   └── demo.js            Datos de ejemplo
│   └── views/
│       ├── crud.js            Motor de listas, formularios y fichas
│       ├── secciones.js       Bloques relacionados de cada ficha
│       ├── cotizaciones.js    Editor de renglones e impresión
│       ├── pipeline.js        Tablero Kanban
│       ├── dashboard.js       Indicadores del inicio
│       └── ajustes.js         Configuración y respaldos
└── .github/workflows/deploy.yml   Publicación automática
```

Para agregar un campo nuevo a cualquier sección basta con añadirlo al arreglo
`fields` del recurso en `src/data/schema.js` (y la columna equivalente en
`supabase/schema.sql` si usas la nube): el formulario, la ficha, la tabla, el CSV
y la búsqueda se actualizan solos.

---

## 8. Preguntas frecuentes

**¿Los totales mezclan monedas?**
No. Cada registro guarda su moneda y el tablero convierte todo a la moneda base
usando los tipos de cambio de *Ajustes → Perfil → Valores por omisión*.
Actualízalos cuando cambien.

**¿Puedo usarlo sin internet?**
En modo local, sí. En modo nube necesitas conexión para sincronizar.

**¿Se puede usar desde el celular?**
Sí, la interfaz se adapta. Agrega la dirección a la pantalla de inicio.

**¿Qué pasa si los dos editamos el mismo registro a la vez?**
Gana el último en guardar, y el otro ve el cambio al instante. Cada ficha muestra
quién hizo la última edición y cuándo.
