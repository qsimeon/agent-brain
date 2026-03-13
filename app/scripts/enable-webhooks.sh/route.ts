import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const script = `#!/usr/bin/env bash
#
# Agent Brain — Enable OpenClaw Inbound Webhooks
# Download: curl ${baseUrl}/scripts/enable-webhooks.sh | bash
#
# This script:
#   1. Generates a secure hook token
#   2. Enables webhooks in your OpenClaw config
#   3. Restarts the gateway
#   4. Prints the token you need for registration
#
# Requirements: bash, openssl, python3
# Full troubleshooting: ${baseUrl}/setup/openclaw

set -euo pipefail

echo "=== Agent Brain — Webhook Setup ==="
echo ""

# 1. Generate a hook token
HOOK_TOKEN=\$(openssl rand -hex 32)
echo "Generated hook token: \$HOOK_TOKEN"

# 2. Find config file
CONFIG_FILE="\$HOME/.openclaw/openclaw.json"
if [ ! -f "\$CONFIG_FILE" ]; then
  CONFIG_FILE="/home/openclaw/.openclaw/openclaw.json"
fi
if [ ! -f "\$CONFIG_FILE" ]; then
  echo "ERROR: Could not find openclaw.json at \$HOME/.openclaw/ or /home/openclaw/.openclaw/"
  echo "See: ${baseUrl}/setup/openclaw"
  exit 1
fi
echo "Config file: \$CONFIG_FILE"

# 3. Enable webhooks
python3 -c "
import json
with open('\$CONFIG_FILE', 'r') as f:
    config = json.load(f)
if 'hooks' not in config:
    config['hooks'] = {}
config['hooks']['enabled'] = True
config['hooks']['token'] = '\$HOOK_TOKEN'
with open('\$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)
print('Updated config: hooks.enabled=true, hooks.token set')
"

# 4. Restart gateway
systemctl restart openclaw 2>/dev/null || openclaw gateway restart 2>/dev/null || echo "NOTE: Could not auto-restart. Restart your gateway manually."

# 5. Print token
echo ""
echo "========================================"
echo "  HOOK_TOKEN: \$HOOK_TOKEN"
echo "========================================"
echo ""
echo "Use this token in your registration:"
echo '  "webhookConfig": {'
echo '    "type": "openclaw",'
echo '    "gatewayUrl": "http://YOUR_IP:18789",'
echo "    \\"hookToken\\": \\"\$HOOK_TOKEN\\""
echo '  }'
echo ""
echo "Verify: curl -X POST http://\$(hostname -I | awk '{print \$1}'):18789/hooks/wake -H 'Authorization: Bearer \$HOOK_TOKEN' -H 'Content-Type: application/json' -d '{\"text\":\"test\",\"mode\":\"now\"}'"
`;

  return new NextResponse(script, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
