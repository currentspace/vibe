# Docker Development with HTTP/3 (Simulating Cloudflare)

This setup uses Caddy as a reverse proxy to simulate Cloudflare's edge behavior with HTTP/3 support.

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS/HTTP/3
       ▼
┌─────────────┐
│    Caddy    │ :443 (HTTP/3, HTTP/2, HTTP/1.1)
│ Reverse     │ 
│   Proxy     │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌───────────┐
│ Web  │ │ Signaling │
│:3000 │ │  :4000    │
└──────┘ └───────────┘
```

## Features

1. **HTTP/3 Support** - Full QUIC protocol support like Cloudflare
2. **Automatic HTTPS** - Uses your local mkcert certificates
3. **Protocol Fallback** - HTTP/3 → HTTP/2 → HTTP/1.1
4. **WebSocket Proxying** - Proper Socket.IO handling
5. **Security Headers** - Mimics Cloudflare's security headers
6. **Cache Headers** - Static asset caching like CDN
7. **Load Balancing Ready** - Can scale services

## Prerequisites

1. Docker and Docker Compose installed
2. mkcert certificates generated (run `pnpm check:https`)

## Quick Start

```bash
# Start everything with HTTP/3
pnpm dev:docker

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Access Points

- **Main App**: https://localhost:9443 (HTTP/3 enabled)
- **API**: https://localhost:9443/api/signaling/*
- **Socket.IO**: wss://localhost:9443/socket.io/
- **Caddy Admin**: http://localhost:2019
- **Metrics**: http://localhost:2019/metrics

## Verifying HTTP/3

1. Open Chrome DevTools → Network tab
2. Right-click columns → Enable "Protocol"
3. Look for "h3" in the Protocol column

You should see:
- `h3` - HTTP/3 (QUIC)
- `h2` - HTTP/2
- `http/1.1` - HTTP/1.1

## Configuration

### Caddy Configuration (Caddyfile)

The Caddyfile configures:
- HTTP/3 with `protocols h3 h2 h1`
- Security headers matching Cloudflare
- Proper WebSocket handling
- Static file caching
- Request routing

### Environment Variables

For Docker mode, update `.env.docker`:
```env
NEXT_PUBLIC_SIGNALING_URL=https://localhost/api/signaling
CLIENT_URL=https://localhost
```

## Monitoring

View Caddy metrics and configuration:
```bash
# Caddy admin API
curl http://localhost:2019/config/

# Prometheus metrics
curl http://localhost:2019/metrics
```

## Troubleshooting

### HTTP/3 Not Working

1. Check if your browser supports HTTP/3:
   - Chrome: chrome://flags/#enable-quic
   - Must be enabled

2. Check Caddy logs:
   ```bash
   docker-compose logs caddy
   ```

3. Verify UDP port 443 is open:
   ```bash
   netstat -an | grep 443
   ```

### Certificate Issues

Ensure certificates are in the `certs/` directory:
```bash
ls -la certs/
# Should show:
# localhost-key.pem
# localhost.pem
```

### WebSocket Issues

Check Socket.IO is connecting through the proxy:
- Should connect to `wss://localhost/socket.io/`
- Not directly to port 4000

## Production Similarity

This setup mimics production deployment behind Cloudflare:

1. **Protocol Negotiation** - Same as Cloudflare's edge
2. **Security Headers** - Matches Cloudflare defaults
3. **Caching Strategy** - Similar cache headers
4. **Path Routing** - `/api/*` pattern for microservices
5. **WebSocket Support** - Proper upgrade handling

## Differences from Production

1. **Geography** - No geo-routing or edge locations
2. **DDoS Protection** - No rate limiting (can add)
3. **WAF** - No Web Application Firewall
4. **Analytics** - No request analytics
5. **SSL** - Using local certificates

## Performance Testing

Test HTTP/3 performance:
```bash
# Install h3 testing tool
brew install curl --with-http3

# Test HTTP/3
curl --http3 https://localhost/health -v

# Compare protocols
curl --http1.1 https://localhost/health -w "%{time_total}\n" -o /dev/null -s
curl --http2 https://localhost/health -w "%{time_total}\n" -o /dev/null -s
curl --http3 https://localhost/health -w "%{time_total}\n" -o /dev/null -s
```

## Next Steps

1. Add rate limiting to match Cloudflare
2. Add caching rules for specific paths
3. Add health checks and auto-restart
4. Add multiple backend instances for load balancing