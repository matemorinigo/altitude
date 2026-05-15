#!/usr/bin/env bash
set -e

SUPABASE="./node_modules/.bin/supabase"
ENV_FILE=".env.local"

# ── helpers ──────────────────────────────────────────────────────────────────
info()  { echo -e "\033[1;34m[dev]\033[0m $*"; }
ok()    { echo -e "\033[1;32m[dev]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[dev]\033[0m $*"; }
die()   { echo -e "\033[1;31m[dev]\033[0m $*" >&2; exit 1; }

# ── preflight ────────────────────────────────────────────────────────────────
command -v docker &>/dev/null || die "Docker no encontrado. Instala Docker Desktop o Engine."
docker info &>/dev/null      || die "Docker no está corriendo. Inicialo y volvé a ejecutar este script."
command -v node &>/dev/null  || die "Node.js no encontrado."

# ── supabase local ───────────────────────────────────────────────────────────
info "Iniciando Supabase local..."

if $SUPABASE status 2>/dev/null | grep -qE "Project URL|API URL"; then
  ok "Supabase ya está corriendo."
else
  $SUPABASE start
fi

# Leer las URLs que devuelve supabase status
STATUS=$($SUPABASE status 2>/dev/null)

LOCAL_URL=$(echo "$STATUS" | grep -E "Project URL|API URL" | awk -F'│' '{print $3}' | tr -d ' ' | head -1)
ANON_KEY=$(echo "$STATUS"  | grep -E "Publishable|anon key"   | awk -F'│' '{print $3}' | tr -d ' ' | head -1)

[[ -z "$LOCAL_URL" || -z "$ANON_KEY" ]] && die "No se pudo obtener URL/key del Supabase local."

# ── .env.local ───────────────────────────────────────────────────────────────
info "Actualizando $ENV_FILE con credenciales locales..."

cat > "$ENV_FILE" <<EOF
VITE_SUPABASE_URL=$LOCAL_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
EOF

ok "  URL  → $LOCAL_URL"
ok "  KEY  → ${ANON_KEY:0:20}..."

# ── migraciones ───────────────────────────────────────────────────────────────
info "Aplicando migraciones pendientes (db push)..."
$SUPABASE db push --local
ok "Migraciones aplicadas."
warn "  Para reset completo (borra datos): ./node_modules/.bin/supabase db reset"

# ── app ──────────────────────────────────────────────────────────────────────
info "Levantando la app (Ctrl+C para detener)..."
echo ""
npm run dev
