/* ============================================================
   Servidor estático mínimo — sin dependencias.
   Uso:  node serve.js  [puerto]
   Necesario porque el navegador no permite módulos ES abiertos
   directamente con file://
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const puerto = Number(process.argv[2]) || 5173;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.sql': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let rel = url === '/' ? '/index.html' : url;
  let destino = path.join(raiz, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));

  if (!destino.startsWith(raiz)) {
    res.writeHead(403).end('Prohibido');
    return;
  }

  fs.stat(destino, (err, stat) => {
    if (err || stat.isDirectory()) {
      // SPA: cualquier ruta desconocida devuelve index.html
      destino = path.join(raiz, 'index.html');
    }
    fs.readFile(destino, (err2, datos) => {
      if (err2) { res.writeHead(404).end('No encontrado'); return; }
      res.writeHead(200, {
        'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store, must-revalidate',
      });
      res.end(datos);
    });
  });
});

servidor.listen(puerto, () => {
  console.log(`\n  Enlace CRM corriendo en  http://localhost:${puerto}\n`);
  console.log('  Ctrl+C para detener.\n');
});
