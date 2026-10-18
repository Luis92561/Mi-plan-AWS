# Publicar una versión

Checklist para sacar una versión de **Mi Plan AWS**. El proyecto es estático: el
«despliegue» es publicar `dist/` en cualquier hosting (S3 + CloudFront, Netlify, Vercel,
Nginx, GitHub Pages) o servir localmente con `npm run preview`.

## 1. Antes de etiquetar

```bash
npm run verify        # lint + tipos + tests + build
npm run test:e2e      # 16 pruebas de navegador
npm run test:pwa      # opcional: offline real contra `vite preview`
```

Requisitos del repositorio (los mismos que ejecuta el CI de `.github/workflows/ci.yml`):

- `npm run lint` sin errores ni warnings.
- `npx tsc --noEmit -p tsconfig.json` limpio (strict).
- `npm test` verde (296 tests).
- `npm run build` sin errores; inicial ≤250 KB gzip.
- Lighthouse móvil ≥90 en Performance, Accessibility y Best Practices
  (ver [`LIGHTHOUSE.md`](LIGHTHOUSE.md) para el comando exacto).

## 2. Versión y changelog

1. Sube `version` en `package.json` (SemVer).
2. Añade la entrada en [`CHANGELOG.md`](../CHANGELOG.md).
3. Revisa `docs/DECISIONES.md` si cambió algún supuesto o criterio de la §11.3.

## 3. Publicar el build

```bash
npm run build
# dist/ contiene index.html, assets/, theme-init.js, sw.js, manifest.webmanifest, icons/
```

- **Con PWA y offline**: el sitio debe servirse por **HTTPS** (o `localhost`) para que el
  service worker se registre; `http://` en una IP no funciona.
- `base: './'` permite subirlo a un subdirectorio (por ejemplo `…/miplan-aws/`).
- Si usas S3 + CloudFront: invalida `/index.html` y `/sw.js` en cada publicación.
- Los datos del usuario viven en su navegador: una nueva versión **no** los toca, pero
  un cambio de `schemaVersion` de Dexie sí debe probarse con un respaldo real
  (`Ajustes → Exportar JSON`, borrar, importar).

## 4. Etiquetar

```bash
git tag -a v1.1.0 -m "Mi Plan AWS 1.1.0"
git push origin main --tags
```

El CI adjunta como artefactos `dist/` y las capturas de `docs/shots/`, de modo que la
versión publicada queda verificada por el mismo pipeline que la construyó.

## 5. Después de publicar

- Comprobar en la URL pública: tema sin destello al recargar, idioma persistente,
  offline tras la primera visita (DevTools → Network → Offline → recargar).
- Recordar que `mockups/` y `docs/shots/` son referencias visuales, no parte del bundle.
