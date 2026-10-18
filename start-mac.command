#!/bin/bash
# Mi Plan AWS — arranque local en macOS (doble clic; la primera vez hay que dar
# permiso con: chmod +x start-mac.command).
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Necesitas Node.js 20 o superior: https://nodejs.org"
  echo ""
  read -r -p "  Pulsa Enter para cerrar."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Instalando dependencias la primera vez..."
  npm install --no-audit --no-fund
fi

if [ ! -f dist/index.html ]; then
  echo "Compilando la app..."
  npm run build
fi

echo ""
echo "  Abriendo Mi Plan AWS en el navegador."
echo "  Deja esta ventana abierta mientras la uses."
echo ""
node scripts/serve.mjs --open
