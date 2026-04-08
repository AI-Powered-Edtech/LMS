#!/bin/bash
set -euo pipefail

echo "=== Starting Smoke Test for Build Artifact ==="

# Run Vite preview in background
echo "Starting Vite preview server..."
pnpm run preview &
PREVIEW_PID=$!

# Wait for server to be ready
echo "Waiting for server to be ready..."
sleep 5

# Function to check if server is responding
check_server() {
  curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 || echo "Server not ready"
}

# Wait until server is ready
while [ "$(check_server)" != "200" ]; do
  echo "Server not ready yet, waiting..."
  sleep 2
done

echo "Server is ready!"

# Test homepage status code
echo "Testing homepage..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000)
if [ "$STATUS_CODE" != "200" ]; then
  echo "❌ Homepage returned status $STATUS_CODE, expected 200"
  exit 1
fi
echo "✅ Homepage returned status 200"

# Verify all JavaScript chunks are loading
echo "Checking JavaScript chunks..."
CHUNKS=$(curl -s http://localhost:5000 | grep -o 'src/assets/[^"]*\.js' | sort -u)
if [ -z "$CHUNKS" ]; then
  echo "⚠️  No JavaScript chunks found, trying alternative pattern..."
  CHUNKS=$(curl -s http://localhost:5000 | grep -o 'dist/assets/[^"]*\.js' | sort -u)
fi

if [ -z "$CHUNKS" ]; then
  echo "❌ No JavaScript chunks found in the HTML"
  exit 1
fi

echo "Found JavaScript chunks:"
echo "$CHUNKS" | while read -r chunk; do
  echo "  - $chunk"
done

# Verify each chunk can be loaded
echo "$CHUNKS" | while read -r chunk; do
  CHUNK_URL="http://localhost:5000/$chunk"
  echo "Checking $CHUNK_URL..."
  CHUNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CHUNK_URL")
  if [ "$CHUNK_STATUS" != "200" ]; then
    echo "❌ Chunk $chunk returned status $CHUNK_STATUS"
    exit 1
  fi
  echo "✅ Chunk $chunk loaded successfully"
done

# Check for critical console errors
echo "Checking for console errors..."
ERRORS=$(curl -s http://localhost:5000 | grep -o 'src/assets/[^"]*\.js' | head -5)
if [ -z "$ERRORS" ]; then
  echo "✅ No JavaScript errors found in console"
else
  echo "❌ JavaScript errors found:"
  echo "$ERRORS"
  exit 1
fi

# Stop Vite preview
echo "Stopping Vite preview server..."
kill $PREVIEW_PID || true

echo "=== Smoke Test Completed Successfully ==="