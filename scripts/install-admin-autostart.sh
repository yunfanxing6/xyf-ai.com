#!/usr/bin/env bash
# Install / refresh launchd agent: fixed port 8790, start at login.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.xingyunfan.xyf-admin"
SRC="$ROOT/scripts/${LABEL}.plist"
DEST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="${HOME}/.logs"
PORT=8790

mkdir -p "$LOG_DIR" "${HOME}/Library/LaunchAgents"

if [[ ! -f "$SRC" ]]; then
  echo "missing plist: $SRC" >&2
  exit 1
fi

# Stop any ad-hoc process holding the fixed port
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${PIDS}" ]]; then
    echo "stopping process(es) on :${PORT}: ${PIDS}"
    # shellcheck disable=SC2086
    kill ${PIDS} 2>/dev/null || true
    sleep 0.5
  fi
fi

# Unload old agent if present
if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
fi
# legacy unload (older macOS)
launchctl unload "$DEST" 2>/dev/null || true

cp "$SRC" "$DEST"
# Ensure paths in plist match this machine's repo (already absolute for this user)
plutil -lint "$DEST" >/dev/null

launchctl bootstrap "gui/$(id -u)" "$DEST"
launchctl enable "gui/$(id -u)/${LABEL}" 2>/dev/null || true
# kickstart in case bootstrap didn't immediately run
launchctl kickstart -k "gui/$(id -u)/${LABEL}" 2>/dev/null || true

sleep 0.8
if curl -sf "http://127.0.0.1:${PORT}/api/status" >/dev/null 2>&1; then
  echo "OK  管理台已固定并自启 → http://127.0.0.1:${PORT}/"
  echo "    launchd: ${LABEL}"
  echo "    plist:   ${DEST}"
else
  echo "WARN  launchd 已安装，但 :${PORT} 尚未响应。查看："
  echo "  tail -50 ${LOG_DIR}/xyf-admin.launchd.err.log"
  echo "  launchctl print gui/$(id -u)/${LABEL}"
  exit 1
fi
