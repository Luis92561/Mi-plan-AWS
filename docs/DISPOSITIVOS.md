# Usar Mi Plan AWS en tus dispositivos (sin cuentas ni pagos)

La app es un sitio estático: **alguien tiene que servirla**. Ese «alguien» es un pequeño
servidor que corre en tu propio equipo (`scripts/serve.mjs`, sin dependencias ni red).
Tus datos **nunca salen del navegador** de cada dispositivo.

| Dispositivo | Cómo se usa | ¿Icono de app? | ¿Offline? |
|---|---|---|---|
| Windows | doble clic en `start-windows.cmd` → `http://localhost:7420` | ✅ Instalar (Chrome/Edge) | ✅ |
| Mac Intel | doble clic en `start-mac.command` → `http://localhost:7420` | ✅ Instalar (Chrome/Safari) | ✅ |
| iPhone 13 Pro Max | `http://<IP-del-PC>:7420` en Safari → «Añadir a pantalla de inicio» | ✅ | ⚠️ solo con HTTPS (ver §4) |
| Huawei Mate 10 Pro | `http://<IP-del-PC>:7420` en Chrome → «Añadir a pantalla de inicio» | ✅ | ⚠️ solo con HTTPS |

> **Cada dispositivo tiene sus propios datos** (IndexedDB). Se transportan con
> **Ajustes → Respaldo → Exportar JSON** e importándolos en el otro dispositivo. Es la
> forma de compartir estado sin cuentas ni servidor.

---

## 1. Windows

1. Instala **Node.js 20+** (una sola vez): <https://nodejs.org>.
2. Doble clic en `start-windows.cmd`. La primera vez instala dependencias y compila
   (2–3 minutos); después arranca en segundos.
3. Se abre `http://localhost:7420`. En Chrome o Edge, icono de instalar en la barra de
   direcciones → **«Instalar Mi Plan AWS»**. Queda como una app con su icono, y funciona
   sin conexión (en `localhost` el navegador sí permite el service worker).

Para usar la app en el móvil, arranca con la LAN expuesta:

```bat
node scripts\serve.mjs --lan --open
```

La consola imprime la dirección para el móvil, por ejemplo `http://192.168.1.42:7420`.

## 2. Mac con procesador Intel

1. Instala **Node.js 20+** (versión para Intel / x64): <https://nodejs.org>.
2. La primera vez, permite ejecutar el lanzador:
   ```bash
   chmod +x start-mac.command
   ```
3. Doble clic en `start-mac.command` (o `./start-mac.command` desde Terminal).
4. En Chrome o Safari: **Instalar app** / **Añadir al Dock**.

> Si macOS bloquea el archivo («no se puede abrir porque proviene de un desarrollador no
> identificado»): clic derecho → **Abrir** → **Abrir**.

## 3. Móviles por Wi-Fi (alternativa sin instalar nada)

Requisito: el equipo que sirve la app **encendido** y ambos en la **misma red Wi-Fi**.
Windows y macOS tienen que permitir la conexión entrante en el puerto **7420** (el
cortafuegos pregunta la primera vez: aceptar en redes privadas).

**iPhone 13 Pro Max**

1. Con el servidor corriendo con `--lan`, abre en **Safari** `http://<IP-del-PC>:7420`.
2. Botón **Compartir** → **Añadir a pantalla de inicio** → nombre «Mi Plan AWS» → Añadir.
3. Se abre a pantalla completa, sin barra de navegador.

**Huawei Mate 10 Pro**

1. Abre `http://<IP-del-PC>:7420` en **Chrome**.
2. Menú ⋮ → **Añadir a pantalla de inicio** (o «Instalar aplicación»).

**Qué funciona por HTTP en el móvil:** todo lo de la app (registrar sesiones, notas,
simulacros, exportar Markdown, `.ics`, respaldo JSON). **Qué no:** el service worker (sin
offline) y las notificaciones del navegador — la app lo detecta y te ofrece el `.ics` como
alternativa, nunca falla en silencio.

## 4. Android: APK propio (Huawei Mate 10 Pro)

La app también se empaqueta como **APK instalable**, sin cuentas ni tiendas. El archivo
está en [`deliverables/miplan-aws-1.2.0.apk`](../deliverables/miplan-aws-1.2.0.apk)
(4 MB, firmado con un keystore propio).

**Instalarlo en el Huawei**

1. Pasa el `.apk` al teléfono (cable USB, correo, Telegram/WhatsApp «guardar archivo»).
2. En el teléfono, abre el archivo con **Archivos**.
3. EMUI pedirá permiso: **Ajustes → Seguridad → Instalar apps desconocidas → Archivos**
   (o «Permitir desde esta fuente»), y vuelve a abrir el APK.
4. Instalar → abrir. La app arranca con fondo oscuro, sin barra de navegador y funciona
   **sin conexión** desde el primer momento (los archivos van dentro del APK).

**Qué cambia respecto al navegador**

| Aspecto | Navegador/PWA | APK |
|---|---|---|
| Datos | IndexedDB de ese navegador | IndexedDB **de la app** (espacio propio) |
| Offline | tras la primera carga | desde el primer arranque |
| Exportar respaldo / `.ics` / vault | descarga normal | **hoja de compartir** de Android (guardar en Archivos, enviar por correo…) |
| Actualizar | recargar | instalar el APK nuevo encima |

> **Antes de desinstalar, exporta tu respaldo**: Android borra los datos de la app al
> desinstalarla. El respaldo JSON (que sale por la hoja de compartir) es la red de
> seguridad.

**Volver a compilarlo** (necesita JDK 21 y Android SDK 35; ya quedaron instalados en
`%LOCALAPPDATA%\Android\`):

```powershell
npm run apk          # APK de release firmado → deliverables/miplan-aws-<versión>.apk
npm run apk:debug    # APK de depuración (para inspeccionar con chrome://inspect)
```

- La clave de firma vive en `android/keystore/miplan-release.jks` y sus credenciales en
  `android/keystore.properties` (ambos **fuera de git**). **Guárdalos**: si los pierdes no
  podrás actualizar el APK sin desinstalar (y perder los datos).
- `npm run android:sync` reempaqueta solo la parte web.

## 5. Opcional: offline de verdad en el móvil (HTTPS con certificado propio)

El service worker exige contexto seguro. Para tenerlo en el teléfono, sirve por HTTPS con
un certificado tuyo:

```bash
npm run cert:lan                  # crea .certs/cert.pem y .certs/key.pem (necesita openssl)
npm run serve:lan:https           # https://<IP>:7420
```

- **macOS**: `openssl` ya viene instalado.
- **Windows**: viene con Git for Windows; si no lo encuentra:
  ```powershell
  $env:OPENSSL_PATH="C:\Program Files\Git\usr\bin\openssl.exe"; npm run cert:lan
  ```

La primera visita dará un aviso de certificado no reconocido:

- **iPhone**: «Mostrar detalles» → «Visitar este sitio web». Para que no vuelva a salir,
  instala el certificado (Ajustes → General → VPN y gestión de dispositivos → instalar el
  perfil → Ajustes → General → Información → Ajustes de confianza de certificados →
  activarlo). Después, Safari ya registra el service worker y la app funciona sin red.
- **Huawei/Chrome**: «Avanzado» → «Continuar».

> El certificado incluye las IPs de tu LAN en el momento de generarlo. Si el router te
> cambia la IP, vuelve a ejecutar `npm run cert:lan`.

## 6. Mover tus datos entre dispositivos

1. En el dispositivo de origen: **Ajustes → Respaldo → Exportar JSON**
   (`miplan-aws-YYYY-MM-DD.json`).
2. Pásalo al otro dispositivo: AirDrop / WhatsApp a ti mismo / cable / unidad de red.
3. En el destino: **Ajustes → Respaldo → Importar JSON** → *reemplazar* o *fusionar por id*.

Importar dos veces el mismo archivo no duplica nada (`merge` por id). Si activas la frase
de paso, el respaldo se descarga cifrado (`.json.enc`) y se importa descifrándolo en la app.

## 7. Lo que no se puede sin pagar

- **Instalar la PWA desde un archivo** (`file://`): el service worker necesita HTTPS o
  `localhost`, y en el móvil no hay `localhost`.
- **App nativa en iPhone** sin cuenta de desarrollador de Apple (99 $/año) o sin Xcode con
  re-firma cada 7 días.
- **Sincronización automática** entre dispositivos: eso exige servidor (fase 3.1, fuera del
  MVP). El transporte soportado hoy es el respaldo JSON.

## 8. Si algo no abre

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Necesitas Node.js` | Node no instalado o versión vieja | Instala Node 20+ y vuelve a abrir el lanzador |
| `No encuentro dist/index.html` | Falta compilar | `npm install` y `npm run build` (o usa el lanzador) |
| `El puerto 7420 está ocupado` | Otra instancia abierta | `node scripts/serve.mjs --port 7421` |
| El móvil no conecta | Red distinta, cortafuegos o IP cambiada | Misma Wi-Fi, aceptar el firewall en red privada, revisar la IP que imprime la consola |
| La página carga en blanco en el móvil | Mezcla `http`/`https` en la barra | Escribe la dirección completa que imprime la consola |
