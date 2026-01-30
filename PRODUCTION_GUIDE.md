# Kona Production Deployment Guide
## Scaling to 10M+ Users

---

## Table of Contents
1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Database Setup (MongoDB Atlas)](#2-database-setup-mongodb-atlas)
3. [Redis Cache Setup](#3-redis-cache-setup)
4. [Backend Deployment](#4-backend-deployment)
5. [Frontend Deployment](#5-frontend-deployment)
6. [CDN & Media Delivery](#6-cdn--media-delivery)
7. [Load Balancing](#7-load-balancing)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Security Checklist](#9-security-checklist)
10. [Cost Estimates](#10-cost-estimates)
11. [Launch Checklist](#11-launch-checklist)
12. [Scaling Playbook](#12-scaling-playbook)

---

## 1. Infrastructure Overview

### Architecture Diagram
```
                                    ┌─────────────────┐
                                    │   Cloudflare    │
                                    │      CDN        │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
            │   Frontend    │       │   Frontend    │       │   Frontend    │
            │   (Vercel)    │       │   (Vercel)    │       │   (Vercel)    │
            └───────────────┘       └───────────────┘       └───────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Load Balancer  │
                                    │   (AWS ALB)     │
                                    └────────┬────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            │                                │                                │
    ┌───────▼───────┐               ┌───────▼───────┐               ┌───────▼───────┐
    │   API Server  │               │   API Server  │               │   API Server  │
    │   (ECS/K8s)   │               │   (ECS/K8s)   │               │   (ECS/K8s)   │
    └───────┬───────┘               └───────┬───────┘               └───────┬───────┘
            │                                │                                │
            └────────────────────────────────┼────────────────────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
            │ MongoDB Atlas │       │ Redis Cluster │       │  Bunny.net    │
            │   (M50+)      │       │ (ElastiCache) │       │  (Video CDN)  │
            └───────────────┘       └───────────────┘       └───────────────┘
```

### Recommended Stack
| Component | Service | Tier |
|-----------|---------|------|
| Frontend | Vercel | Pro ($20/mo) |
| Backend | AWS ECS Fargate | 3-5 instances |
| Database | MongoDB Atlas | M50 Cluster |
| Cache | AWS ElastiCache Redis | r6g.large |
| CDN | Cloudflare | Pro ($20/mo) |
| Video | Bunny.net Stream | Pay-as-you-go |
| Monitoring | DataDog | Pro |
| DNS | Cloudflare | Included |

---

## 2. Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Create account and organization
3. Create new project: "Kona-Production"

### Step 2: Create Cluster
```
Cluster Tier: M50 (minimum for 10M users)
  - 16 GB RAM
  - 3-node replica set
  - Auto-scaling enabled

Region: Choose closest to your users
  - Africa: AWS Cape Town (af-south-1)
  - Global: AWS us-east-1 + replicas

Storage: 100GB NVMe SSD (auto-scaling)
```

### Step 3: Configure Network Access
```
IP Access List:
  - Add your server IPs
  - Or use VPC Peering for AWS

Connection String Format:
mongodb+srv://kona_user:<password>@cluster0.xxxxx.mongodb.net/kona_production?retryWrites=true&w=majority
```

### Step 4: Create Database User
```
Username: kona_production_user
Password: <generate-strong-password-32-chars>
Roles: readWrite on kona_production database
```

### Step 5: Enable Advanced Features
```yaml
# Atlas Configuration
auto_scaling:
  compute:
    enabled: true
    min_instance_size: M50
    max_instance_size: M80
  storage:
    enabled: true
    
backup:
  enabled: true
  frequency: continuous
  retention: 7_days
  
encryption:
  at_rest: true
  in_transit: true
```

### Recommended Indexes (Already in code)
The application automatically creates indexes on startup. Verify in Atlas:
- users: id, email, referral_code, weekly_watch
- series: id, genre, featured, views
- episodes: id, series_id
- notifications: user_id, created_at (TTL)

---

## 3. Redis Cache Setup

### Option A: AWS ElastiCache (Recommended)
```yaml
# ElastiCache Configuration
cluster_mode: enabled
node_type: cache.r6g.large
num_node_groups: 3
replicas_per_node_group: 2

# Total: 9 nodes (3 primary + 6 replicas)
# Memory: 13GB per node = 117GB total
```

### Option B: Redis Cloud
```
Plan: Pro 10GB
Region: Same as your servers
Features:
  - Auto-scaling
  - Multi-AZ
  - Backup enabled
```

### Environment Variable
```bash
REDIS_URL=redis://:<password>@your-redis-cluster.cache.amazonaws.com:6379
```

### Cache Strategy (Already Implemented)
```python
CACHE_TTL = {
    "series": 3600,        # 1 hour - content rarely changes
    "series_list": 1800,   # 30 min - lists update occasionally  
    "episodes": 3600,      # 1 hour
    "user_profile": 300,   # 5 min - balance changes
    "leaderboard": 60,     # 1 min - frequently updated
}
```

---

## 4. Backend Deployment

### Option A: AWS ECS Fargate (Recommended)

#### Step 1: Create ECR Repository
```bash
aws ecr create-repository --repository-name kona-backend
```

#### Step 2: Build & Push Docker Image
```dockerfile
# Dockerfile (create in /app/backend/)
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
```

```bash
# Build and push
docker build -t kona-backend .
docker tag kona-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/kona-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/kona-backend:latest
```

#### Step 3: Create ECS Task Definition
```json
{
  "family": "kona-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "kona-backend",
      "image": "<account-id>.dkr.ecr.<region>.amazonaws.com/kona-backend:latest",
      "portMappings": [
        {
          "containerPort": 8001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "MONGO_URL", "value": "mongodb+srv://..."},
        {"name": "DB_NAME", "value": "kona_production"},
        {"name": "REDIS_URL", "value": "redis://..."},
        {"name": "JWT_SECRET", "value": "<generate-256-bit-secret>"},
        {"name": "STRIPE_SECRET_KEY", "value": "sk_live_..."},
        {"name": "FLUTTERWAVE_SECRET_KEY", "value": "FLWSECK_..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/kona-backend",
          "awslogs-region": "<region>",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Step 4: Create ECS Service
```yaml
service:
  name: kona-backend-service
  cluster: kona-cluster
  task_definition: kona-backend
  desired_count: 3  # Start with 3, scale to 10+
  launch_type: FARGATE
  
  load_balancer:
    target_group_arn: <alb-target-group>
    container_name: kona-backend
    container_port: 8001
    
  auto_scaling:
    min_capacity: 3
    max_capacity: 20
    target_tracking:
      - metric: CPU
        target: 70
      - metric: Memory
        target: 80
```

### Option B: Kubernetes (GKE/EKS)
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kona-backend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: kona-backend
  template:
    metadata:
      labels:
        app: kona-backend
    spec:
      containers:
      - name: kona-backend
        image: gcr.io/kona-project/kona-backend:latest
        ports:
        - containerPort: 8001
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        env:
        - name: MONGO_URL
          valueFrom:
            secretKeyRef:
              name: kona-secrets
              key: mongo-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: kona-secrets
              key: redis-url
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kona-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kona-backend
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 5. Frontend Deployment

### Vercel Deployment (Recommended)

#### Step 1: Connect Repository
1. Go to https://vercel.com
2. Import Git repository
3. Set root directory: `frontend`

#### Step 2: Configure Environment Variables
```bash
REACT_APP_BACKEND_URL=https://api.kona.app
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
REACT_APP_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_...
```

#### Step 3: Configure Build Settings
```json
{
  "buildCommand": "yarn build",
  "outputDirectory": "build",
  "installCommand": "yarn install",
  "framework": "create-react-app"
}
```

#### Step 4: Custom Domain
```
Domain: kona.app
  - A Record: 76.76.21.21
  - CNAME: cname.vercel-dns.com
  
Subdomains:
  - www.kona.app -> kona.app (redirect)
  - api.kona.app -> ALB endpoint
```

---

## 6. CDN & Media Delivery

### Cloudflare Setup

#### Step 1: Add Domain
1. Add kona.app to Cloudflare
2. Update nameservers at registrar

#### Step 2: Configure SSL
```yaml
ssl_mode: full_strict
always_use_https: true
min_tls_version: "1.2"
```

#### Step 3: Caching Rules
```yaml
page_rules:
  - url: "kona.app/static/*"
    cache_level: cache_everything
    edge_cache_ttl: 31536000  # 1 year
    
  - url: "kona.app/api/*"
    cache_level: bypass
    
  - url: "*.kona.app/*.mp4"
    cache_level: cache_everything
    edge_cache_ttl: 86400  # 1 day
```

#### Step 4: Security Settings
```yaml
security_level: medium
challenge_passage: 30
browser_integrity_check: true
waf: enabled
bot_fight_mode: enabled
```

### Bunny.net Video CDN

#### Step 1: Create Stream Library
```
Library Name: kona-videos
Region: EU (Frankfurt) + US (LA) + AF (Johannesburg)
Transcoding: Enabled (1080p, 720p, 480p, 360p)
```

#### Step 2: Upload Videos
```bash
# Upload via API
curl -X POST "https://video.bunnycdn.com/library/{library_id}/videos" \
  -H "AccessKey: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Episode 1"}'
```

#### Step 3: Embed Player
```javascript
// In VideoPlayerPage.jsx
const videoUrl = `https://iframe.mediadelivery.net/embed/{library_id}/{video_id}`;
```

---

## 7. Load Balancing

### AWS Application Load Balancer

#### Step 1: Create Target Group
```yaml
target_group:
  name: kona-backend-tg
  protocol: HTTP
  port: 8001
  vpc_id: vpc-xxxxx
  health_check:
    path: /health
    interval: 30
    timeout: 5
    healthy_threshold: 2
    unhealthy_threshold: 3
```

#### Step 2: Create ALB
```yaml
load_balancer:
  name: kona-alb
  scheme: internet-facing
  type: application
  
  listeners:
    - port: 443
      protocol: HTTPS
      certificate: arn:aws:acm:...:certificate/xxxxx
      default_action:
        type: forward
        target_group: kona-backend-tg
        
    - port: 80
      protocol: HTTP
      default_action:
        type: redirect
        redirect:
          protocol: HTTPS
          port: "443"
          status_code: HTTP_301
```

#### Step 3: Configure WAF
```yaml
waf_rules:
  - AWSManagedRulesCommonRuleSet
  - AWSManagedRulesKnownBadInputsRuleSet
  - AWSManagedRulesSQLiRuleSet
  - rate_limit: 2000 requests/5 minutes per IP
```

---

## 8. Monitoring & Alerting

### DataDog Setup

#### Step 1: Install Agent
```yaml
# In ECS Task Definition
{
  "name": "datadog-agent",
  "image": "datadog/agent:latest",
  "environment": [
    {"name": "DD_API_KEY", "value": "<datadog-api-key>"},
    {"name": "DD_SITE", "value": "datadoghq.com"},
    {"name": "ECS_FARGATE", "value": "true"}
  ]
}
```

#### Step 2: Application Metrics
```python
# Add to server.py
from ddtrace import patch_all, tracer
patch_all()

tracer.configure(
    hostname='localhost',
    port=8126,
    service='kona-backend'
)
```

#### Step 3: Create Dashboards
```yaml
dashboards:
  - API Performance:
      - Request rate (per endpoint)
      - Response time (p50, p95, p99)
      - Error rate
      
  - Infrastructure:
      - CPU utilization
      - Memory usage
      - Container count
      
  - Business Metrics:
      - Active users
      - Coin purchases
      - Video plays
```

#### Step 4: Configure Alerts
```yaml
alerts:
  - name: High Error Rate
    query: sum(last_5m):sum:kona.errors{*} > 100
    severity: critical
    notify: ops-team@kona.app
    
  - name: High Response Time
    query: avg(last_5m):avg:kona.response_time{*} > 2000
    severity: warning
    notify: dev-team@kona.app
    
  - name: Low Cache Hit Rate
    query: avg(last_15m):avg:kona.cache.hit_rate{*} < 0.8
    severity: warning
    notify: dev-team@kona.app
    
  - name: Database Connections High
    query: max(last_5m):max:mongodb.connections.current{*} > 900
    severity: critical
    notify: ops-team@kona.app
```

### Uptime Monitoring (Pingdom/UptimeRobot)
```yaml
checks:
  - name: API Health
    url: https://api.kona.app/health
    interval: 1m
    
  - name: Frontend
    url: https://kona.app
    interval: 1m
    
  - name: Video CDN
    url: https://video.kona.app/test.mp4
    interval: 5m
```

---

## 9. Security Checklist

### Environment Variables (Never commit!)
```bash
# Production .env template
MONGO_URL=mongodb+srv://...
DB_NAME=kona_production
REDIS_URL=redis://...
JWT_SECRET=<256-bit-random-string>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_...
BUNNY_API_KEY=...
```

### Security Headers (Add to server.py)
```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["kona.app", "api.kona.app"])

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

### API Security
- [x] Rate limiting implemented
- [x] JWT token authentication
- [x] Input validation (Pydantic)
- [ ] API key rotation (quarterly)
- [ ] Penetration testing (before launch)

### Data Security
- [x] Passwords hashed (bcrypt)
- [x] MongoDB encryption at rest
- [x] TLS for all connections
- [ ] GDPR compliance (if EU users)
- [ ] Data retention policy

---

## 10. Cost Estimates

### Monthly Costs (10M MAU)

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| **MongoDB Atlas** | M50 (auto-scale to M80) | $500 - $1,500 |
| **AWS ECS Fargate** | 5-10 instances | $300 - $600 |
| **AWS ALB** | Application LB | $50 |
| **AWS ElastiCache** | r6g.large cluster | $400 |
| **Cloudflare** | Pro | $20 |
| **Vercel** | Pro | $20 |
| **Bunny.net** | Video streaming | $200 - $500 |
| **DataDog** | Pro (5 hosts) | $150 |
| **Domain + SSL** | Annual | $15/year |
| **Stripe** | 2.9% + $0.30 | Variable |
| **Flutterwave** | 1.4% | Variable |

### Total Infrastructure: ~$1,700 - $3,300/month

### Revenue Needed to Break Even
At $3,000/month infrastructure cost:
- If 1% of users purchase $5 coins: 100K × $5 = $500K gross
- After payment fees (~3%): $485K
- **Profit: ~$482K/month** ✓

---

## 11. Launch Checklist

### Pre-Launch (1 Week Before)

#### Infrastructure
- [ ] MongoDB Atlas cluster created and configured
- [ ] Redis cluster created
- [ ] ECS service deployed with 3+ instances
- [ ] ALB configured with SSL
- [ ] Cloudflare configured
- [ ] Custom domain pointing correctly

#### Testing
- [ ] Load testing completed (target: 10K concurrent users)
- [ ] Security audit completed
- [ ] Payment flow tested (Stripe + Flutterwave)
- [ ] Video playback tested across regions
- [ ] Mobile responsiveness verified

#### Monitoring
- [ ] DataDog dashboards created
- [ ] Alerts configured
- [ ] On-call schedule set up
- [ ] Runbook documented

### Launch Day

#### Morning
- [ ] Scale ECS to 5+ instances
- [ ] Enable CloudFlare "Under Attack Mode" (standby)
- [ ] Team on standby in Slack/Discord

#### Go Live
- [ ] DNS switch to production
- [ ] Monitor error rates (target: <0.1%)
- [ ] Monitor response times (target: <500ms p95)
- [ ] Monitor database connections

#### Post-Launch (First 24 Hours)
- [ ] Monitor user signups
- [ ] Check payment processing
- [ ] Review error logs
- [ ] Scale infrastructure if needed

---

## 12. Scaling Playbook

### Traffic Thresholds & Actions

| Concurrent Users | Action |
|------------------|--------|
| 0 - 5,000 | Normal operation (3 instances) |
| 5,000 - 10,000 | Scale to 5 instances |
| 10,000 - 25,000 | Scale to 10 instances, increase Redis |
| 25,000 - 50,000 | Scale to 20 instances, upgrade MongoDB |
| 50,000+ | Enable MongoDB sharding, add regions |

### Emergency Procedures

#### High Error Rate (>5%)
```bash
1. Check backend logs: aws logs tail /ecs/kona-backend
2. Check MongoDB status in Atlas console
3. Check Redis connection in ElastiCache
4. Scale up ECS instances if CPU > 80%
5. Enable Cloudflare "Under Attack Mode" if DDoS
```

#### Database Overload
```bash
1. Enable MongoDB Atlas auto-scaling
2. Review slow queries in Atlas Performance Advisor
3. Add read replicas if needed
4. Consider sharding for write-heavy collections
```

#### Payment Failures
```bash
1. Check Stripe Dashboard for errors
2. Check Flutterwave Dashboard
3. Verify webhook endpoints are responding
4. Check API logs for payment-related errors
```

---

## Quick Reference Commands

### Scale ECS Service
```bash
aws ecs update-service --cluster kona-cluster --service kona-backend-service --desired-count 10
```

### Check MongoDB Status
```bash
mongosh "mongodb+srv://cluster.xxxxx.mongodb.net/kona_production" --eval "db.serverStatus()"
```

### Clear Redis Cache
```bash
redis-cli -h your-redis.cache.amazonaws.com FLUSHDB
```

### View Logs
```bash
aws logs tail /ecs/kona-backend --follow
```

---

## Support Contacts

| Service | Contact |
|---------|---------|
| MongoDB Atlas | support.mongodb.com |
| AWS Support | aws.amazon.com/support |
| Stripe | support.stripe.com |
| Flutterwave | support@flutterwave.com |
| Cloudflare | support.cloudflare.com |

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** Kona Engineering Team

---

🚀 **You're ready to launch Kona to 10M+ users!**
