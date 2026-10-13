#!/usr/bin/env bash
# Prepares a private CareerOS inference server, with no secrets sent to ChatGPT.
set -euo pipefail
umask 077
cd "$(dirname "$0")"
if [[ -e .env ]]; then
  echo "Existing .env detected. Refusing to overwrite existing credentials."
  exit 1
fi
for bin in docker openssl; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing $bin. Install it on your own server first."
    exit 1
  fi
done
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required."
  exit 1
fi
echo "CareerOS private Ollama host setup"
echo "Before starting: use a DNS hostname pointing to this server and review current Ollama and Caddy versions."
read -r -p "Your model hostname (e.g. llm.yourdomain.com): " domain
if [[ ! "$domain" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ ]] || [[ "$domain" != *.* ]]; then
  echo "Enter a valid public DNS hostname (not a full URL)."
  exit 1
fi
read -r -p "Reviewed Ollama Docker tag (e.g. 0.x.y): " ollama_version
read -r -p "Reviewed Caddy Docker tag (requires Caddy >= 2.10, e.g. 2.x.y): " caddy_version
if [[ ! "$ollama_version" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{1,70}$ ]] || [[ ! "$caddy_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Provide concrete, reviewed image tags. Do not use latest."
  exit 1
fi
caddy_major="${caddy_version%%.*}"
caddy_rest="${caddy_version#*.}"
caddy_minor="${caddy_rest%%.*}"
if (( 10#$caddy_major < 2 || (10#$caddy_major == 2 && 10#$caddy_minor < 10) )); then
  echo "Caddy must be at least 2.10 for the request-size security limit."
  exit 1
fi
token="$(openssl rand -hex 32)"
printf 'OLLAMA_VERSION=%s\nCADDY_VERSION=%s\nMODEL_DOMAIN=%s\nINFERENCE_BEARER_TOKEN=%s\n' \
  "$ollama_version" "$caddy_version" "$domain" "$token" > .env
chmod 600 .env
unset token
docker compose -f compose.yaml config --quiet
echo "Configuration prepared at infra/ollama/.env (permissions 600)."
echo "The random gateway token was saved locally and was NOT displayed."
echo ""
echo "NEXT (on this server):"
echo "  docker compose -f compose.yaml -f compose.gpu.yaml up -d"
echo "  docker compose -f compose.yaml exec ollama ollama pull qwen3:8b"
echo "  python3 check-gateway.py"
echo "For CPU-only Docker, start with compose.yaml without compose.gpu.yaml."
echo "Do not publicly open port 11434. Allow HTTPS ports 80/443, configure DNS, and use the private token in Vercel's server-only environment."
