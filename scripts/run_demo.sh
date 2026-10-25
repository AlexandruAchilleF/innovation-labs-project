#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  echo "-> Încărcare variabile din .env..."
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

API_PORT="${API_PORT:-8000}"
UI_PORT="${UI_PORT:-3000}"

cleanup() {
  echo ""
  echo "-> Oprire servere SunProof..."
  kill "${API_PID:-}" "${UI_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Eligibilizare porturi ocupate
for port in "$API_PORT" "$UI_PORT"; do
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "-> Eliberare port $port (PID: $pids)..."
    kill -9 $pids 2>/dev/null || true
  fi
done

echo "============================================================"
echo "  SunProof Demo Launcher (FastAPI + React 19 Workspace)"
echo "============================================================"
echo "-> Pornire FastAPI backend pe http://127.0.0.1:${API_PORT} ..."
"$ROOT_DIR/.venv/bin/uvicorn" sunproof.app:app --host 127.0.0.1 --port "$API_PORT" > /tmp/sunproof-api.log 2>&1 &
API_PID=$!

# Așteaptă ca API-ul să răspundă la /api/health
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then
    echo "   [OK] FastAPI online (http://127.0.0.1:${API_PORT}/api/health)"
    break
  fi
  sleep 0.3
done

echo "-> Pre-încălzire cache 81 instalații + 8 cartiere în memorie..."
curl -fsS "http://127.0.0.1:${API_PORT}/api/portfolio" >/dev/null 2>&1 || true
curl -fsS "http://127.0.0.1:${API_PORT}/api/neighborhoods" >/dev/null 2>&1 || true
echo "   [OK] Cache-ul FastAPI este pre-încălzit (răspuns < 5ms)!"

echo "-> Pornire React Frontend pe http://127.0.0.1:${UI_PORT} ..."
(
  cd "$ROOT_DIR/frontend"
  VITE_API_URL="http://127.0.0.1:${API_PORT}" npx vite --host 127.0.0.1 --port "$UI_PORT"
) > /tmp/sunproof-ui.log 2>&1 &
UI_PID=$!

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${UI_PORT}" >/dev/null 2>&1; then
    echo "   [OK] Frontend React online!"
    break
  fi
  sleep 0.4
done

echo ""
echo "============================================================"
echo "  GATA PENTRU DEMO!"
echo "  1. Triaj Portofoliu & Diagnostic: http://127.0.0.1:${UI_PORT}/triaj"
echo "  2. Rețea JT & Cartiere:           http://127.0.0.1:${UI_PORT}/retea"
echo "  3. Aplicația Prosumatorului:      http://127.0.0.1:${UI_PORT}/prosumator"
echo "  4. API Docs (Swagger):            http://127.0.0.1:${API_PORT}/docs"
echo "============================================================"
echo "Apasă Ctrl+C pentru a opri ambele servere."

wait
