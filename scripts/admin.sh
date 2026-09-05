#!/usr/bin/env bash
# Start local site admin on fixed port 8790 (foreground).
# For login autostart use: ./scripts/install-admin-autostart.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Fixed endpoint — do not change casually (launchd pins the same values)
export XYF_ADMIN_HOST=127.0.0.1
export XYF_ADMIN_PORT=8790

# Shadowrocket on this Mac
export http_proxy="${http_proxy:-http://127.0.0.1:10808}"
export https_proxy="${https_proxy:-http://127.0.0.1:10808}"
export HTTP_PROXY="$http_proxy"
export HTTPS_PROXY="$https_proxy"
export ALL_PROXY="$https_proxy"
export all_proxy="$https_proxy"
export no_proxy="${no_proxy:-localhost,127.0.0.1,::1}"
export NO_PROXY="$no_proxy"

if lsof -tiTCP:8790 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port 8790 already in use — admin may already be running via launchd."
  echo "open  http://127.0.0.1:8790/"
  echo "or:   launchctl print gui/$(id -u)/com.xingyunfan.xyf-admin"
  exit 0
fi

cd "$ROOT"
echo "xyf 管理台（前台）→ http://127.0.0.1:8790/"
exec /usr/bin/python3 "$ROOT/admin/app.py"
