#!/bin/bash

echo "Testing HTTPS connection to localhost:9443..."
echo ""

# Test with curl
echo "1. Testing with curl:"
curl -vk https://localhost:9443 2>&1 | grep -E "SSL connection|subject:|HTTP" | head -10
echo ""

# Test certificate directly
echo "2. Certificate details:"
echo | openssl s_client -connect localhost:9443 -servername localhost 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|DNS:|Not"
echo ""

# Test different protocols
echo "3. Testing HTTP/2:"
curl -I https://localhost:9443 -k --http2 2>&1 | grep HTTP
echo ""

echo "4. Testing HTTP/3:"
curl -I https://localhost:9443 -k --http3 2>&1 | grep HTTP
echo ""

# Test with wget
echo "5. Testing with wget:"
wget --no-check-certificate -qO- https://localhost:9443 2>&1 | grep -o '<title>.*</title>' | head -1
echo ""

echo "If all tests pass but browser fails, try:"
echo "  1. Clear browser cache/data for localhost"
echo "  2. Restart browser"
echo "  3. Try incognito/private mode"
echo "  4. Try a different browser"
echo "  5. Check if you have browser extensions blocking local HTTPS"