# 🚀 Deployment Guide# 🚀 MetaVerse Production Deployment Guide



## Quick Deploy OptionsComplete guide for deploying the MetaVerse application using Docker in production.



### 1. Railway.app (Recommended - Easiest)## 📋 Table of Contents

- [Prerequisites](#prerequisites)

Railway provides the simplest deployment with automatic Docker support.- [Environment Configuration](#environment-configuration)

- [DNS & Domain Setup](#dns--domain-setup)

```bash- [SSL Certificate Setup](#ssl-certificate-setup)

# Install Railway CLI- [Building & Deployment](#building--deployment)

npm i -g @railway/cli- [Monitoring & Maintenance](#monitoring--maintenance)

- [Troubleshooting](#troubleshooting)

# Login

railway login---



# Initialize project## Prerequisites

railway init

### Required Software

# Deploy- **Docker** (version 20.10+)

railway up- **Docker Compose** (version 2.0+)

```- **Git**

- Linux server with at least:

**Configuration:**  - 2 CPU cores

- Railway will auto-detect your Docker setup  - 4GB RAM

- Add environment variables in Railway dashboard  - 20GB storage

- Railway provides automatic HTTPS  - Ubuntu 20.04+ or similar

- Estimated cost: $10-20/month

### Required Ports

**Environment Variables to Set:**The following ports must be open on your server:

```- `80` - HTTP (redirects to HTTPS)

MONGODB_URI=mongodb+srv://...- `443` - HTTPS

CLERK_SECRET_KEY=sk_live_...- `3000` - Backend API (internal, exposed via reverse proxy)

VITE_CLERK_PUBLISHABLE_KEY=pk_live_...- `40000-49999` - MediaSoup RTC (UDP/TCP for WebRTC connections)

SERVER_PUBLIC_IP=(will be provided by Railway)

CLIENT_URL=https://your-app.railway.app### Firewall Configuration

VITE_BACKEND_URL=https://your-app.railway.app```bash

MEDIASOUP_MIN_PORT=40000# Allow HTTP and HTTPS

MEDIASOUP_MAX_PORT=49999sudo ufw allow 80/tcp

```sudo ufw allow 443/tcp



---# Allow MediaSoup RTC ports (CRITICAL for audio/video)

sudo ufw allow 40000:49999/udp

### 2. Render.comsudo ufw allow 40000:49999/tcp



Render provides excellent Docker support with automatic builds.# Enable firewall

sudo ufw enable

**Steps:**```

1. Push your code to GitHub

2. Go to [Render Dashboard](https://dashboard.render.com)---

3. Create **New Web Service**

4. Connect your GitHub repo## Environment Configuration

5. Select **Docker** as environment

6. Add environment variables### Step 1: Copy Environment Template

7. Choose instance type (at least 4GB RAM)```bash

8. Deploy!cp .env.production .env

```

**Configuration:**

- Use `docker-compose.yml` or separate services### Step 2: Configure Environment Variables

- Enable automatic deploys from GitHub

- Estimated cost: $85/month (for 8GB instance)Edit the `.env` file and update all values:



---```env

# ===== MongoDB Configuration =====

### 3. Fly.io# Get MongoDB Atlas connection string or use local MongoDB

MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/metaverse?retryWrites=true&w=majority

Fly.io offers global edge deployment with Docker support.

# ===== Server Configuration =====

```bashPORT=3000

# Install Fly CLI

curl -L https://fly.io/install.sh | sh# CRITICAL: Set to your server's public IP address

# Get it with: curl -4 ifconfig.me

# LoginSERVER_PUBLIC_IP=YOUR.SERVER.PUBLIC.IP

fly auth login

# ===== Clerk Authentication =====

# Launch (auto-generates fly.toml)# Get production keys from: https://dashboard.clerk.com

fly launchCLERK_SECRET_KEY=sk_live_YOUR_CLERK_SECRET_KEY

VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_PUBLISHABLE_KEY

# Deploy

fly deploy# ===== URLs Configuration =====

```# Replace with your actual domain names

CLIENT_URL=https://metaverse.yourdomain.com

**Configuration:**VITE_BACKEND_URL=https://api.metaverse.yourdomain.com

- Fly will detect Docker setup

- Requires fly.toml configuration# ===== MediaSoup Configuration =====

- Supports multiple regionsMIN_PORT=40000

- Estimated cost: $20-30/monthMAX_PORT=49999

```

---

### Step 3: Get Your Server's Public IP

### 4. DigitalOcean App Platform```bash

curl -4 ifconfig.me

Simple deployment with Docker support.```

Copy this IP and set it as `SERVER_PUBLIC_IP` in `.env`

**Steps:**

1. Push code to GitHub### Step 4: Get Production Clerk Keys

2. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)

3. Create New App from GitHub repo1. Go to [Clerk Dashboard](https://dashboard.clerk.com)

4. Select Dockerfile deployment2. Select your application

5. Configure environment variables3. Navigate to **API Keys** section

6. Choose $48/month Professional plan (4GB RAM minimum)4. Copy the **Production** keys (starting with `pk_live_` and `sk_live_`)

7. Deploy!5. Update `.env` with these keys



---**⚠️ IMPORTANT:** Never use test keys in production!



## Pre-Deployment Checklist---



- [ ] MongoDB Atlas cluster created and accessible## DNS & Domain Setup

- [ ] Clerk production keys obtained from [dashboard.clerk.com](https://dashboard.clerk.com)

- [ ] `.env` file configured (don't commit this!)### Required DNS Records

- [ ] All environment variables added to deployment platform

- [ ] Docker memory allocation sufficient (8GB+ recommended)You need to set up DNS records for your domains:

- [ ] Port ranges enabled for MediaSoup (40000-49999 UDP/TCP)

#### Frontend Domain (e.g., metaverse.yourdomain.com)

---```

Type: A

## Post-DeploymentName: metaverse

Value: YOUR.SERVER.PUBLIC.IP

### Get Your Server Public IPTTL: 3600

```bash```

curl -4 ifconfig.me

```#### Backend API Domain (e.g., api.metaverse.yourdomain.com)

Set this as `SERVER_PUBLIC_IP` environment variable.```

Type: A

### Test Your DeploymentName: api.metaverse

1. Visit your client URLValue: YOUR.SERVER.PUBLIC.IP

2. Sign in with ClerkTTL: 3600

3. Create a space```

4. Test real-time multiplayer

5. Test video/audio calls### Verify DNS Propagation

```bash

---# Check frontend domain

nslookup metaverse.yourdomain.com

## Common Issues

# Check backend domain

### MediaSoup Connection Issuesnslookup api.metaverse.yourdomain.com

- Ensure UDP ports 40000-49999 are open```

- Set correct `SERVER_PUBLIC_IP` (your server's public IP)

- Check CORS settings include your frontend domainWait for DNS to propagate (can take 5-60 minutes).



### MongoDB Connection Failed---

- Verify MongoDB Atlas IP whitelist (allow all: `0.0.0.0/0`)

- Check connection string format## SSL Certificate Setup

- Ensure database user has correct permissions

### Option 1: Let's Encrypt (Recommended - Free)

### Client Can't Connect to Server

- Verify `VITE_BACKEND_URL` is correct#### Step 1: Install Certbot

- Check CORS settings in server```bash

- Ensure both containers are runningsudo apt update

sudo apt install certbot python3-certbot-nginx -y

---```



## Scaling Considerations#### Step 2: Generate Certificates

```bash

- **Horizontal Scaling**: Use load balancer for multiple server instances# For frontend domain

- **Redis**: Add Redis for shared state across instancessudo certbot certonly --nginx -d metaverse.yourdomain.com

- **CDN**: Use Cloudflare/CloudFront for static assets

- **Database**: Upgrade MongoDB Atlas tier as needed# For backend API domain

sudo certbot certonly --nginx -d api.metaverse.yourdomain.com

---```



## SupportFollow the prompts and provide your email address.



For deployment issues, check:#### Step 3: Update Nginx Configuration

- Server logs: `docker logs metaverse-server`Edit `nginx/reverse-proxy.conf` and update the SSL paths:

- Client logs: Browser DevTools Console```nginx

- Platform-specific logs in your deployment dashboardssl_certificate /etc/letsencrypt/live/metaverse.yourdomain.com/fullchain.pem;

ssl_certificate_key /etc/letsencrypt/live/metaverse.yourdomain.com/privkey.pem;
```

#### Step 4: Auto-Renewal
Certbot automatically sets up renewal. Verify with:
```bash
sudo certbot renew --dry-run
```

### Option 2: Custom SSL Certificates

If you have your own SSL certificates:
1. Place them in `/etc/ssl/certs/` on your server
2. Update `nginx/reverse-proxy.conf` with correct paths
3. Ensure certificates are readable by Nginx

---

## Building & Deployment

### Quick Deployment (Using Script)

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

Select option **1** (Build and start) for first-time deployment.

### Manual Deployment

#### Step 1: Build Images
```bash
docker-compose build --no-cache
```

This will:
- Build the server with MediaSoup C++ dependencies
- Build the client React app with Vite
- Configure Nginx for serving

#### Step 2: Start Services
```bash
docker-compose up -d
```

Services start in order:
1. MongoDB (with health check)
2. Server (waits for MongoDB)
3. Client (waits for Server)

#### Step 3: Verify Deployment
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Check health
docker-compose ps | grep healthy
```

All services should show `(healthy)` status.

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Server only
docker-compose logs -f server

# Client only
docker-compose logs -f client

# MongoDB only
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100
```

### Check Service Status

```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Disk usage
docker system df
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart server
docker-compose restart client
```

### Update Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup MongoDB Data

```bash
# Export all data
docker-compose exec mongodb mongodump --out /data/backup

# Copy to host
docker cp metaverse-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)
```

---

## Troubleshooting

### Issue: Containers Not Starting

```bash
# Check logs for errors
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E '80|443|3000'

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Issue: MediaSoup Connection Failed

**Symptoms:** Audio/video not working, WebRTC connection errors

**Solutions:**

1. **Verify SERVER_PUBLIC_IP is correct:**
```bash
# Check current IP
curl -4 ifconfig.me

# Update .env if needed
nano .env

# Restart server
docker-compose restart server
```

2. **Check firewall ports:**
```bash
# Verify UDP ports are open
sudo ufw status | grep 40000:49999

# Re-open if needed
sudo ufw allow 40000:49999/udp
sudo ufw allow 40000:49999/tcp
```

3. **Check MediaSoup logs:**
```bash
docker-compose logs server | grep -i mediasoup
```

### Issue: Player Movement Sync Not Working

**Symptoms:** Players not seeing each other's movements

**Solutions:**

1. **Check WebSocket connection:**
```bash
# In browser console (F12):
# Should see: "🔗 WebSocket connected"
```

2. **Check DataChannel:**
```bash
docker-compose logs server | grep -i datachannel
# Should see: "✅ DataProducer created"
```

3. **Verify room state:**
```bash
docker-compose logs server | grep "Room State"
# Should show connected players
```

### Issue: 502 Bad Gateway

**Symptoms:** Nginx returns 502 error

**Solutions:**

1. **Check server is running:**
```bash
docker-compose ps server
# Should show "healthy"
```

2. **Check server logs:**
```bash
docker-compose logs server | tail -50
```

3. **Verify port 3000 is accessible:**
```bash
docker-compose exec client curl http://server:3000/health
# Should return: {"status":"ok"}
```

### Issue: SSL Certificate Errors

**Solutions:**

1. **Renew certificates:**
```bash
sudo certbot renew
docker-compose restart
```

2. **Check certificate validity:**
```bash
sudo certbot certificates
```

3. **Verify Nginx config:**
```bash
docker-compose exec client nginx -t
```

### Issue: High CPU/Memory Usage

**Solutions:**

1. **Check resource usage:**
```bash
docker stats
```

2. **Limit container resources:**
Edit `docker-compose.yml` and add:
```yaml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

3. **Clean up Docker:**
```bash
docker system prune -af
docker volume prune
```

### Debug Mode

Enable verbose logging:

1. **Server debug logs:**
```bash
# Edit docker-compose.yml, add to server environment:
DEBUG=express:*,mediasoup:*
```

2. **Restart with logs:**
```bash
docker-compose restart server
docker-compose logs -f server
```

---

## Performance Optimization

### MongoDB Indexes

After deployment, create indexes for better performance:

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh

# Create indexes
use metaverse
db.users.createIndex({ "clerkId": 1 }, { unique: true })
db.spaces.createIndex({ "createdBy": 1 })
db.rooms.createIndex({ "spaceId": 1 })
```

### Nginx Caching

Already configured in `client/nginx.conf`:
- Static assets cached for 1 year
- HTML files cached for 1 hour
- Gzip compression enabled

### MediaSoup Worker Optimization

For high-traffic deployments, adjust in `server/src/mediasoup/setup.ts`:
```typescript
// Increase workers based on CPU cores
const numWorkers = os.cpus().length;
```

---

## Security Checklist

- [ ] Using production Clerk keys (not test keys)
- [ ] MongoDB connection uses authentication
- [ ] SSL certificates installed and valid
- [ ] Firewall configured (only required ports open)
- [ ] Environment variables not committed to Git
- [ ] Regular security updates: `docker-compose pull && docker-compose up -d`
- [ ] MongoDB backups scheduled
- [ ] Monitoring alerts configured

---

## Scaling Considerations

### Horizontal Scaling (Multiple Servers)

1. **Use external MongoDB cluster** (MongoDB Atlas recommended)
2. **Redis for session storage** (shared state across servers)
3. **Load balancer** (Nginx, HAProxy, or cloud provider)
4. **MediaSoup distributed setup** (separate media servers)

### Vertical Scaling (Single Server)

- Increase server resources (CPU, RAM)
- Optimize MediaSoup workers
- Use CDN for static assets
- Database query optimization

---

## Support & Resources

- **MediaSoup Documentation:** https://mediasoup.org/documentation/
- **Docker Documentation:** https://docs.docker.com/
- **Clerk Documentation:** https://clerk.com/docs
- **Let's Encrypt:** https://letsencrypt.org/

---

## Quick Reference Commands

```bash
# Deploy
./deploy.sh

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Update
git pull && docker-compose up -d --build

# Clean rebuild
docker-compose down -v && docker-compose build --no-cache && docker-compose up -d

# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup
```

---

**🎉 Your MetaVerse is now deployed! Visit your domain to access the application.**
