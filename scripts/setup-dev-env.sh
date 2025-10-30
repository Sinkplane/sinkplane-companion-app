#!/bin/bash

# Get the local IP address (preferring en0, falling back to en1)
LOCAL_IP=$(ifconfig en0 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')

# If en0 didn't work, try en1
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP=$(ifconfig en1 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')
fi

# If still no IP, error out
if [ -z "$LOCAL_IP" ]; then
  echo "❌ Error: Could not determine local IP address"
  exit 1
fi

# Update .env file
ENV_FILE="$(dirname "$0")/../.env"

# Create or update .env with the local IP
cat > "$ENV_FILE" << EOF
# TV Domain Configuration (Development - Simulator)
# For local simulator testing with Apple TV
# Use your machine's local IP for cross-simulator communication
EXPO_PUBLIC_TV_DOMAIN=$LOCAL_IP
EXPO_PUBLIC_TV_PORT=9999

# Connection Mode: 'discovery' (scan for TVs via Zeroconf) or 'autoconnect' (auto-connect to TV domain)
EXPO_PUBLIC_CONNECTION_MODE=autoconnect

# Auto-connect retry interval in milliseconds (default: 30000 = 30 seconds)
EXPO_PUBLIC_RETRY_INTERVAL=30000
EOF

echo "✅ Updated .env with local IP: $LOCAL_IP"
echo "📝 .env location: $ENV_FILE"
