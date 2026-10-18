# Referencia visual

La especificación (§9.1) cita capturas de referencia en esta carpeta:

| Archivo | Qué muestra |
|---|---|
| `01-dashboard-dark-es.png` | Inicio, español, tema oscuro, 1280 px |
| `02-dashboard-light-en.png` | Inicio, inglés, tema claro, 1280 px |
| `03-hoy-mobile-dark-es.png` | «Hoy» en móvil (390 px), español, oscuro |
| `04-notes-editor-es-dark.png` | Editor de notas con autosave |

**Importante:** estas capturas **no son un diseño aparte**. Se generan desde la app
compilada con `npm run shots` (Playwright) y son la referencia que la app cumple. Las
copias que valida la §9.1 viven aquí; las del entregable (§12.3) viven en `docs/shots/`.

`mockup.css` documenta los tokens exactos (paleta y escala tipográfica) con los mismos
valores que `src/styles/tokens.css`, que es la única fuente de verdad: los componentes
nunca escriben un color.
