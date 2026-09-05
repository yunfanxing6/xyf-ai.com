#!/usr/bin/env bash
# Remove login autostart for xyf admin.
set -euo pipefail

LABEL="com.xingyunfan.xyf-admin"
DEST="${HOME}/Library/LaunchAgents/${LABEL}.plist"

if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
fi
launchctl unload "$DEST" 2>/dev/null || true
rm -f "$DEST"
echo "removed ${LABEL}"
