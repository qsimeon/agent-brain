#!/usr/bin/env bash
# setup-droplet.sh — Configure /home/openclaw as root's home directory
# Run this on your DigitalOcean droplet as root.
set -euo pipefail

OPENCLAW_HOME="/home/openclaw"

echo "=== OpenClaw Droplet Setup ==="
echo "Making ${OPENCLAW_HOME} your home directory..."
echo ""

# 1. Ensure the directory exists
if [ ! -d "$OPENCLAW_HOME" ]; then
  echo "Creating ${OPENCLAW_HOME}..."
  mkdir -p "$OPENCLAW_HOME"
fi

# 2. Copy shell config files from /root if they exist and aren't already in OPENCLAW_HOME
for rc in .bashrc .profile .bash_aliases .bash_logout; do
  if [ -f "/root/${rc}" ] && [ ! -f "${OPENCLAW_HOME}/${rc}" ]; then
    echo "Copying /root/${rc} -> ${OPENCLAW_HOME}/${rc}"
    cp "/root/${rc}" "${OPENCLAW_HOME}/${rc}"
  fi
done

# 3. Append workspace-specific config to .bashrc if not already present
MARKER="# --- openclaw workspace ---"
if ! grep -qF "$MARKER" "${OPENCLAW_HOME}/.bashrc" 2>/dev/null; then
  cat >> "${OPENCLAW_HOME}/.bashrc" <<'BASHRC'

# --- openclaw workspace ---
export OPENCLAW_HOME="/home/openclaw"

# Helpful aliases
alias ll='ls -alF'
alias brain-status='cat ~/brain-status.md 2>/dev/null || echo "No brain-status.md found"'
BASHRC
  echo "Added openclaw workspace config to .bashrc"
fi

# 4. Change root's home directory to /home/openclaw
current_home=$(getent passwd root | cut -d: -f6)
if [ "$current_home" != "$OPENCLAW_HOME" ]; then
  echo "Changing root home: ${current_home} -> ${OPENCLAW_HOME}"
  usermod -d "$OPENCLAW_HOME" root
else
  echo "Root home is already ${OPENCLAW_HOME}"
fi

# 5. Set ownership
chown -R root:root "$OPENCLAW_HOME"

echo ""
echo "=== Done ==="
echo "Log out and back in (or run: exec bash -l) for changes to take effect."
echo "~ will now resolve to ${OPENCLAW_HOME}"
