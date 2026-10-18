#!/usr/bin/env node
/**
 * Servidor estático sin dependencias para Mi Plan AWS.
 *
 *   node scripts/serve.mjs                 # localhost:7420 (contexto seguro: PWA instalable)
 *   node scripts/serve.mjs --host lan      # además expone la LAN (para el móvil)
 *   node scripts/serve.mjs --https         # HTTPS con certificado propio (offline en el móvil)
 *
 * Sin instalaciones, sin cuentas y sin red: sirve `dist/` tal cual.
 */
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? (args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : true) : fallback;
};

const port = Number(flag('port', 7420));
const distDir = resolve(root, String(flag('dist', 'dist')));
const openBrowser = flag('open', false) !== false && args.includes('--open');
const useHttps = args.includes('--https');
const useLan = args.includes('--lan') || flag('host', 'localhost') === 'lan';
const host = useLan ? '0.0.0.0' : '127.0.0.1';
const certPath = flag('cert', join(root, '.certs', 'cert.pem'));
const keyPath = flag('key', join(root, '.certs', 'key.pem'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ics': 'text/calendar; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`No encuentro ${join(distDir, 'index.html')}. Ejecuta primero: npm run build`);
  process.exit(1);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

function requestHandler(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const requested = decodeURIComponent(url.pathname);
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(distDir, safe);

  if (!filePath.startsWith(distDir)) {
    send(res, 403, 'Prohibido');
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // SPA: cualquier ruta desconocida devuelve index.html.
    filePath = join(distDir, 'index.html');
  }

  const ext = extname(filePath);
  const name = filePath.split(/[/\\]/).pop() ?? '';
  const immutable = filePath.includes(`${'/'}assets${'/'}`);
  const headers = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-store',
    'Service-Worker-Allowed': '/',
    'X-Content-Type-Options': 'nosniff',
  };
  if (ext === '.html' || name === 'sw.js' || name === 'registerSW.js' || ext === '.webmanifest') {
    headers['Cache-Control'] = 'no-store';
  }

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

let server;
if (useHttps) {
  if (!existsSync(certPath) || !existsSync(keyPath)) {
    console.error(
      `Faltan el certificado y la clave.\n  ${certPath}\n  ${keyPath}\nGenera uno con: npm run cert:lan`,
    );
    process.exit(1);
  }
  server = createHttpsServer(
    { cert: readFileSync(certPath), key: readFileSync(keyPath) },
    requestHandler,
  );
} else {
  server = createHttpServer(requestHandler);
}

server.listen(port, host, () => {
  const scheme = useHttps ? 'https' : 'http';
  const local = `${scheme}://localhost:${port}`;
  console.log(`\nMi Plan AWS sirviéndose desde ${distDir}`);
  console.log(`  Este equipo : ${local}`);

  if (useLan) {
    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
      .map((entry) => entry.address);
    for (const address of addresses) {
      console.log(`  Móvil (misma Wi-Fi): ${scheme}://${address}:${port}`);
    }
    if (!useHttps) {
      console.log(
        '\n  Nota: por HTTP el móvil puede usar la app y añadirla a la pantalla de inicio,\n' +
          '  pero el service worker (offline) requiere HTTPS. Usa --https con un certificado\n' +
          '  propio si quieres offline en el teléfono.',
      );
    }
  }

  console.log('\n  Ctrl+C para detener.\n');

  if (openBrowser) {
    const command =
      process.platform === 'win32' ? `start "" "${local}"` : process.platform === 'darwin' ? `open "${local}"` : `xdg-open "${local}"`;
    exec(command);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const scheme = useHttps ? 'https' : 'http';
    const local = `${scheme}://localhost:${port}`;
    // Doble clic dos veces: la app ya está en marcha, solo hay que abrirla.
    console.log(`\nMi Plan AWS ya está en marcha en ${local}`);
    console.log('Abriendo el navegador. Puedes cerrar esta ventana.\n');
    if (openBrowser) {
      const command =
        process.platform === 'win32'
          ? `start "" "${local}"`
          : process.platform === 'darwin'
            ? `open "${local}"`
            : `xdg-open "${local}"`;
      exec(command);
    }
    process.exit(0);
  }
  console.error(error.message);
  process.exit(1);
});
