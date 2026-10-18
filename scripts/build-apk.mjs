#!/usr/bin/env node
/**
 * Compila el APK de Mi Plan AWS (Android) sin cuentas ni tiendas.
 *
 *   node scripts/build-apk.mjs            # APK de release firmado
 *   node scripts/build-apk.mjs --debug    # APK de depuración (sin firma propia)
 *
 * Requisitos (una sola vez):
 *   · JDK 17–21  → se detecta JAVA_HOME o %LOCALAPPDATA%\Android\jdk21\jdk-*
 *   · Android SDK (platform-tools, platforms;android-35, build-tools;35.0.0)
 *     → se detecta ANDROID_HOME o %LOCALAPPDATA%\Android\Sdk
 *
 * El resultado se copia a `deliverables/` con la versión de package.json.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const debug = process.argv.includes('--debug');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const localAndroid = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android') : null;

function findJdk() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);
  if (localAndroid) {
    const dir = join(localAndroid, 'jdk21');
    if (existsSync(dir)) {
      for (const entry of readdirSync(dir)) candidates.push(join(dir, entry));
    }
  }
  if (process.platform === 'win32') candidates.push('C:\\Program Files\\Java\\jdk-21', 'C:\\Program Files\\Java\\jdk-17');
  candidates.push('/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home', '/usr/lib/jvm/java-21-openjdk-amd64');

  for (const home of candidates) {
    if (!home || !existsSync(home)) continue;
    const java = process.platform === 'win32' ? join(home, 'bin', 'java.exe') : join(home, 'bin', 'java');
    if (!existsSync(java)) continue;
    try {
      // `java -version` escribe en stderr: hay que leer los dos flujos.
      const result = spawnSync(java, ['-version'], { encoding: 'utf8' });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      const match = /version "(\d+)/.exec(output);
      const major = match ? Number(match[1]) : 0;
      if (major >= 17 && major <= 23) return { home, java, major };
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}

function findSdk() {
  const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT];
  if (localAndroid) candidates.push(join(localAndroid, 'Sdk'));
  candidates.push(join(process.env.HOME ?? '', 'Library', 'Android', 'sdk'), join(process.env.HOME ?? '', 'Android', 'Sdk'));
  for (const sdk of candidates) {
    if (!sdk || !existsSync(sdk)) continue;
    if (existsSync(join(sdk, 'platform-tools')) && existsSync(join(sdk, 'build-tools'))) return sdk;
  }
  return null;
}

const jdk = findJdk();
if (!jdk) {
  console.error(
    '\nNo encuentro un JDK 17–21.\n' +
      '  Windows: descarga Temurin 21 y descomprímelo en %LOCALAPPDATA%\\Android\\jdk21\\\n' +
      '           https://adoptium.net/temurin/releases/?version=21\n' +
      '  macOS:   brew install --cask temurin@21\n',
  );
  process.exit(1);
}

const sdk = findSdk();
if (!sdk) {
  console.error(
    '\nNo encuentro el Android SDK (platform-tools + build-tools).\n' +
      '  Descarga "Command line tools" de https://developer.android.com/studio#command-tools\n' +
      '  y descomprímelo en %LOCALAPPDATA%\\Android\\Sdk\\cmdline-tools\\latest\\.\n' +
      '  Después: sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"\n',
  );
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: jdk.home,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  PATH: `${join(jdk.home, 'bin')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`,
  // esbuild necesita un temporal escribible dentro del proyecto en algunos equipos.
  TEMP: join(root, '.tmp'),
  TMP: join(root, '.tmp'),
};

mkdirSync(join(root, '.tmp'), { recursive: true });

function run(command, args, cwd) {
  console.log(`\n▶ ${command} ${args.join(' ')}`);
  // En Windows npm/npx/gradlew son .cmd/.bat: hay que ejecutarlos con shell.
  if (process.platform === 'win32') {
    const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', shell: true });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} terminó con código ${result.status}`);
    return;
  }
  execFileSync(command, args, { cwd, env, stdio: 'inherit' });
}

console.log(`JDK ${jdk.major} en ${jdk.home}`);
console.log(`Android SDK en ${sdk}`);

// La versión del APK sale de package.json (una sola fuente de verdad).
const [major, minor, patch] = pkg.version.split('.').map((part) => Number(part));
const versionCode = major * 10000 + minor * 100 + patch;
writeFileSync(
  join(root, 'android', 'version.properties'),
  `versionName=${pkg.version}\nversionCode=${versionCode}\n`,
  'utf8',
);
console.log(`Versión del APK: ${pkg.version} (code ${versionCode})`);

run('npm', ['run', 'build'], root);
run('npx', ['cap', 'sync', 'android'], root);
run(
  process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
  debug ? ['assembleDebug', '--no-daemon'] : ['assembleRelease', '--no-daemon'],
  join(root, 'android'),
);

const variant = debug ? 'debug' : 'release';
const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', variant, debug ? 'app-debug.apk' : 'app-release.apk');
if (!existsSync(apk)) {
  console.error(`\nLa compilación terminó pero no encuentro ${apk}`);
  process.exit(1);
}

const outDir = join(root, 'deliverables');
mkdirSync(outDir, { recursive: true });
const target = join(outDir, `miplan-aws-${pkg.version}${debug ? '-debug' : ''}.apk`);
copyFileSync(apk, target);

const sizeMb = (readFileSync(target).length / (1024 * 1024)).toFixed(1);
console.log(`\n✓ APK listo: ${target} (${sizeMb} MB)`);
console.log('  Instálalo en el móvil por USB, por correo o desde el propio teléfono.');
console.log('  En Android: Ajustes → Permitir instalar apps desconocidas para la app con la que lo abras.\n');
