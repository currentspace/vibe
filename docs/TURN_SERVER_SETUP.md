# TURN Server Setup Guide

## Option 1: Deploy Coturn on a VPS

### 1. Get a VPS (DigitalOcean, Linode, AWS EC2)
```bash
# Ubuntu 22.04 recommended
# Open ports: 3478 (TCP/UDP), 5349 (TCP/UDP), 49152-65535 (UDP)
```

### 2. Install Coturn
```bash
sudo apt-get update
sudo apt-get install coturn -y
```

### 3. Configure Coturn
```bash
sudo nano /etc/turnserver.conf
```

Add this configuration:
```ini
# Network settings
listening-port=3478
tls-listening-port=5349
external-ip=YOUR_SERVER_PUBLIC_IP

# Authentication
use-auth-secret
static-auth-secret=YOUR_LONG_RANDOM_SECRET

# Realm
realm=yourdomain.com

# Performance
total-quota=100
stale-nonce=600

# Logging
log-file=/var/log/turnserver.log
verbose

# Security
no-stun
no-loopback-peers
no-multicast-peers
```

### 4. Enable and start service
```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

### 5. Generate credentials in your app
```javascript
function generateTurnCredentials() {
  const username = Date.now() + ':webrtcuser'
  const secret = 'YOUR_LONG_RANDOM_SECRET'
  const credential = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64')
  
  return {
    urls: [
      'turn:yourdomain.com:3478',
      'turns:yourdomain.com:5349'
    ],
    username,
    credential
  }
}
```

## Option 2: Use Docker

```yaml
# docker-compose.yml
version: '3'
services:
  coturn:
    image: coturn/coturn:latest
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf
    restart: always
```

## Option 3: Deploy on Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coturn
spec:
  replicas: 1
  selector:
    matchLabels:
      app: coturn
  template:
    metadata:
      labels:
        app: coturn
    spec:
      containers:
      - name: coturn
        image: coturn/coturn:latest
        ports:
        - containerPort: 3478
          protocol: TCP
        - containerPort: 3478
          protocol: UDP
        env:
        - name: TURN_SECRET
          valueFrom:
            secretKeyRef:
              name: turn-secret
              key: secret
```

## Estimated Costs

- **VPS for Coturn**: $5-20/month (DigitalOcean/Linode)
- **Bandwidth**: ~$0.01-0.10/GB depending on provider
- **Typical usage**: 1-2GB per hour of video call

## Integration with your app

```javascript
// In your WebRTCContext or peer connection setup
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: generateUsername(),
    credential: generateCredential()
  }
]

const peerConnection = new RTCPeerConnection({ iceServers })
```