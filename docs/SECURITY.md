# Seguridad y privacidad

## Modelo de amenaza (10 líneas)

1. **Dispositivo compartido**: cualquiera con acceso al perfil del navegador puede abrir
   la app y leer los datos. Mitigación: frase de paso opcional (PBKDF2-SHA256 310 000
   iteraciones + AES-GCM 256) para el **respaldo exportado**; los datos vivos quedan en
   IndexedDB del perfil (no hay cifrado en reposo del navegador).
2. **Extensión maliciosa del navegador**: puede leer IndexedDB y el portapapeles. No se
   puede mitigar desde la app; se documenta.
3. **Pérdida de disco**: sin respaldo no hay recuperación. Mitigación: exportar JSON.
4. **Vault de Obsidian sincronizado a la nube por mi cuenta**: al exportar se avisa que
   el contenido sale del dispositivo por decisión del usuario.
5. **`.ics` con títulos de temas**: contiene información personal; se avisa antes de
   exportar y se exige una casilla de confirmación.
6. **Import de un JSON ajeno**: se valida con zod (límite 20 MB, esquema tipado) y se
   rechaza con mensaje; nunca se ejecuta nada del archivo.
7. **Markdown con HTML**: `react-markdown` + `remark-gfm` **sin** `rehype-raw`; el HTML
   crudo no se renderiza y el export solo emite Markdown/GFM.
8. **Dependencias**: sin analítica ni telemetría; cero `fetch` en runtime; fuentes
   self-hosted en woff2; sin CDNs.
9. **Cadena de suministro**: el lockfile está versionado; no hay scripts de instalación
   de terceros ejecutados en build (`npm install --ignore-scripts` funciona).
10. **Pérdida de la frase de paso**: no hay recuperación por diseño (no se guarda).

## Medidas implementadas

| Área | Medida | Dónde |
|---|---|---|
| CSP | `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'` | `index.html` |
| Sin red en runtime | Regla de oro: cero `fetch`; los enlaces externos son `target="_blank" rel="noopener"` | Todo `src/` |
| Tema sin flash y sin inline | `public/theme-init.js` (archivo propio, no inline) | `index.html`, `src/app/prefs.tsx` |
| Sanitización de Markdown | Sin `rehype-raw`; se descarta HTML crudo | `src/features/notes/components/MarkdownPreview.tsx`, `src/domain/obsidian.ts` |
| Validación de respaldos | zod por tabla + `schemaVersion` + límite de tamaño | `src/data/schemas.ts` |
| Cifrado del respaldo | PBKDF2-SHA256 310 000 iteraciones, sal de 16 B, iv de 12 B, AES-GCM 256; la frase nunca se guarda | `src/features/settings/backupCrypto.ts` |
| Copiar y exportar | 100 % local (portapapeles, `.zip` y `.ics` en memoria, sin endpoint) | `src/lib/clipboard.ts`, `src/features/export`, `src/domain/ics.ts` |
| Cuota | `QuotaExceededError` manejado con mensaje claro y sugerencia de exportar | `src/lib/i18n/es/shared.ts` (`common.quotaError`) |
| Acciones destructivas | Doble confirmación escribiendo `BORRAR`; borrado de ítems y notas con diálogo | `src/features/settings/components/DangerSection.tsx` |

## Lo que la app no hace

- No hay cuentas, login, roles ni invitaciones.
- No hay backend, base de datos remota ni sincronización.
- No hay telemetría, analytics ni informes de errores a terceros.
- No se lee ni se escribe el vault de Obsidian del usuario.
- No se incluyen preguntas reales de examen ni material filtrado.

## Recomendaciones de uso

1. Activa la frase de paso si el equipo se comparte y guarda el `.json.enc` fuera del
   disco (nunca junto a la frase).
2. Exporta el JSON al menos una vez al mes (Ajustes → Respaldo).
3. Revisa el navegador antes de instalar extensiones con permiso de lectura de datos de
   sitios.
