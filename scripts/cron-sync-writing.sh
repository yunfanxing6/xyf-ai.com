#!/usr/bin/env bash
# Local cron entry: twice daily Writing sync via Grok CLI (member accounts OK).
set -euo pipefail

ROOT="${XYF_SITE_ROOT:-$HOME/projects/xyf-ai.com}"
LOG_DIR="${XYF_SYNC_LOG_DIR:-$HOME/.logs}"
LOG="$LOG_DIR/xyf-writing-sync.log"
PROMPT="$ROOT/scripts/sync-writing.prompt.md"
LOCK_DIR="${XDG_RUNTIME_DIR:-/tmp}/xyf-writing-sync.lock"

mkdir -p "$LOG_DIR"

# Avoid overlapping runs
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[$(date -Iseconds)] skip: already running" >>"$LOG"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

export PATH="$HOME/.local/bin:$HOME/.grok/bin:$HOME/miniconda3/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Mainland proxy for X / xAI / GitHub
# Shadowrocket on this Mac listens on 1082 (not Clash default 10808)
export http_proxy="${http_proxy:-http://127.0.0.1:1082}"
export https_proxy="${https_proxy:-http://127.0.0.1:1082}"
export HTTP_PROXY="$http_proxy"
export HTTPS_PROXY="$https_proxy"
export ALL_PROXY="$https_proxy"
export all_proxy="$https_proxy"
export no_proxy="${no_proxy:-localhost,127.0.0.1,::1}"
export NO_PROXY="$no_proxy"

# Prefer currently active Grok CLI session (member). All swaps are member accounts.
# Optional pin: XYF_GROK_PROFILE=premium → grok-auth-profiles use "$XYF_GROK_PROFILE"
if [[ -n "${XYF_GROK_PROFILE:-}" ]] && command -v grok-auth-profiles >/dev/null 2>&1; then
  grok-auth-profiles use "$XYF_GROK_PROFILE" >>"$LOG" 2>&1 || true
fi

GROK_BIN="$(command -v grok || true)"
if [[ -z "$GROK_BIN" && -x "$HOME/.grok/downloads/grok-linux-x86_64" ]]; then
  GROK_BIN="$HOME/.grok/downloads/grok-linux-x86_64"
fi
if [[ -z "$GROK_BIN" ]]; then
  echo "[$(date -Iseconds)] ERROR: grok CLI not found" >>"$LOG"
  exit 1
fi

{
  echo "======== $(date -Iseconds) start ========"
  echo "grok=$GROK_BIN root=$ROOT"
  # Phase 1: deterministic data (works even if Grok is down)
  python3 "$ROOT/scripts/sync_writing.py" || echo "[warn] sync_writing.py failed: $?"
  # Phase 2: Grok CLI — discover / polish / feature art / deploy
  if [[ -f "$PROMPT" ]]; then
    "$GROK_BIN" -p "$(cat "$PROMPT")" \
      --cwd "$ROOT" \
      --yolo \
      --no-auto-update \
      --max-turns 40 \
      || echo "[warn] grok headless exit: $?"
  else
    echo "[error] missing prompt $PROMPT"
  fi
  echo "======== $(date -Iseconds) end ========"
} >>"$LOG" 2>&1
