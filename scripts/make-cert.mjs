/**
 * Genera un certificado y una clave para servir Mi Plan AWS por HTTPS en la LAN.
 * Así el móvil puede instalar la PWA y funcionar sin conexión.
 *
 *   node scripts/make-cert.mjs [ip-de-la-lan]
 *
 * Requiere `openssl` en el PATH (macOS lo trae; en Windows viene con Git for
 * Windows: "C:\Program Files\Git\usr\bin\openssl.exe").
 * Escribe `.certs/cert.pem` y `.certs/key.pem`, que `serve.mjs --https` usa.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, '.certs');
const sanIp = process.argv[2];

const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
  .map((entry) => entry.address);

const ips = sanIp ? [sanIp, ...lanAddresses.filter((address) => address !== sanIp)] : lanAddresses;
if (ips.length === 0) {
  console.error('No encontré ninguna IP de LAN. Pasa la IP a mano: node scripts/make-cert.mjs 192.168.1.42');
  process.exit(1);
}

const san = ['DNS:localhost', 'IP:127.0.0.1', ...ips.map((ip) => `IP:${ip}`)].join(',');
mkdirSync(dir, { recursive: true });

const configPath = join(dir, 'openssl.cnf');
writeFileSync(
  configPath,
  `[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = miplan-aws.local
[v3]
subjectAltName = ${san}
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
`,
  'utf8',
);

const certPath = join(dir, 'cert.pem');
const keyPath = join(dir, 'key.pem');

try {
  execFileSync(
    process.env.OPENSSL_PATH ?? 'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyPath,
      '-out',
      certPath,
      '-days',
      '825',
      '-config',
      configPath,
    ],
    { stdio: 'inherit' },
  );
} catch (error) {
  console.error('No pude ejecutar openssl:', error.message);
  console.error('En Windows usa la ruta de Git:');
  console.error('  $env:OPENSSL_PATH="C:\\Program Files\\Git\\usr\\bin\\openssl.exe"; npm run cert:lan');
  process.exit(1);
}

if (!existsSync(certPath)) process.exit(1);

console.log(`\nCertificado creado: ${certPath}`);
console.log(`Clave:              ${keyPath}`);
console.log(`Válido para:        ${san}`);
console.log(`Días:               825\n`);
console.log('Siguiente paso:  npm run serve:lan:https');
console.log('En el móvil, la primera vez verás un aviso de certificado:');
console.log('  · iPhone: "Mostrar detalles" → "Visitar este sitio web" (o instala el .pem y actívalo en');
console.log('    Ajustes → General → Información → Ajustes de confianza de certificados).');
console.log('  · Android/Chrome: "Avanzado" → "Continuar".');
console.log('Con el certificado aceptado, la app ya funciona sin conexión en el móvil.\n');
