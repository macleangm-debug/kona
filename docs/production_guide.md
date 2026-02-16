# Kona Production Deployment Guide
## Scaling to 10M+ Users

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Cost Estimates by User Scale](#cost-estimates-by-user-scale)
4. [Deployment Checklist](#deployment-checklist)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Scaling Strategy](#scaling-strategy)
7. [Security Checklist](#security-checklist)
8. [Disaster Recovery](#disaster-recovery)

---

## Architecture Overview

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                        USERS                                 │
                                    │                    (10M+ globally)                           │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              CDN LAYER                                                   │
│                                   (Cloudflare / AWS CloudFront)                                         │
│  • Static assets (JS, CSS, images)    • Video thumbnail caching    • DDoS protection                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           LOAD BALANCER                                                  │
│                            (AWS ALB / GCP Load Balancer / Nginx)                                        │
│  • SSL termination    • Health checks    • Auto-scaling triggers    • Rate limiting                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                              │
                              ┌────────────────────────────────┴────────────────────────────────┐
                              ▼                                                                 ▼
┌──────────────────────────────────────────────────────┐    ┌──────────────────────────────────────────────────────┐
│              FRONTEND CLUSTER                         │    │               BACKEND CLUSTER                        │
│          (React App - Static/SSR)                     │    │             (FastAPI Application)                    │
│                                                       │    │                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │
│  │  Instance 1 │ │  Instance 2 │ │  Instance N │     │    │  │  Instance 1 │ │  Instance 2 │ │  Instance N │     │
│  │   (Vercel)  │ │   (Vercel)  │ │   (Vercel)  │     │    │  │ (K8s Pod)   │ │ (K8s Pod)   │ │ (K8s Pod)   │     │
│  └─────────────┘ └─────────────┘ └─────────────┘     │    │  └─────────────┘ └─────────────┘ └─────────────┘     │
│                                                       │    │                         │                             │
│  Recommended: Vercel / Netlify / S3+CloudFront       │    │  Features:                                            │
│                                                       │    │  • Rate Limiting (slowapi) ✅                        │
└──────────────────────────────────────────────────────┘    │  • Connection Pooling ✅                              │
                                                            │  • Async I/O ✅                                       │
                                                            └──────────────────────────────────────────────────────┘
                                                                              │
                              ┌────────────────────────────────────────────────┼────────────────────────────────────┐
                              ▼                                                ▼                                    ▼
┌──────────────────────────────────────────────────────┐    ┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│                   REDIS CLUSTER                       │    │      MONGODB CLUSTER              │    │      VIDEO STREAMING             │
│               (Caching Layer) ✅                      │    │    (Primary Database)             │    │       (Bunny.net)                │
│                                                       │    │                                   │    │                                  │
│  • Session storage                                    │    │  ┌─────────┐  ┌─────────┐        │    │  • Video hosting                 │
│  • API response caching                               │    │  │ Primary │──│Replica 1│        │    │  • HLS streaming                 │
│  • Leaderboard caching                                │    │  │  Node   │──│         │        │    │  • Global CDN                    │
│  • Rate limit counters                                │    │  └─────────┘  └─────────┘        │    │  • Adaptive bitrate              │
│                                                       │    │       │                          │    │                                  │
│  Recommended: Redis Cloud / AWS ElastiCache          │    │       ▼                          │    │  Already Integrated ✅           │
│  TTL: Series (1h), User (5m), Leaderboard (1m)       │    │  ┌─────────┐                     │    │                                  │
└──────────────────────────────────────────────────────┘    │  │Replica 2│                     │    └──────────────────────────────────┘
                                                            │  └─────────┘                     │
                                                            │                                   │
                                                            │  Recommended: MongoDB Atlas       │
                                                            │  Indexes: Optimized ✅            │
                                                            └──────────────────────────────────┘
```

---

## Infrastructure Requirements

### Tier Definitions

| Component | Startup (0-100K) | Growth (100K-1M) | Scale (1M-5M) | Enterprise (5M-10M+) |
|-----------|------------------|------------------|---------------|----------------------|
| **Backend Instances** | 2 pods (2 CPU, 4GB) | 5 pods (4 CPU, 8GB) | 15 pods (4 CPU, 16GB) | 30+ pods (8 CPU, 32GB) |
| **MongoDB** | M10 Shared | M30 Dedicated | M50 Cluster | M60+ Sharded |
| **Redis** | 1GB Basic | 5GB Standard | 15GB Premium | 50GB+ Cluster |
| **CDN Bandwidth** | 1 TB/month | 10 TB/month | 50 TB/month | 200+ TB/month |
| **Video CDN** | Basic | Standard | Professional | Enterprise |

---

## Cost Estimates by User Scale

### 💰 Startup Phase: 0 - 100,000 Users
**Target:** MVP validation, early adopters

| Service | Provider | Specification | Monthly Cost |
|---------|----------|---------------|--------------|
| **Backend Hosting** | Railway / Render | 2 instances, 2GB RAM | $50 |
| **Frontend Hosting** | Vercel | Pro Plan | $20 |
| **Database** | MongoDB Atlas | M10 (2GB RAM, 10GB Storage) | $57 |
| **Redis Cache** | Redis Cloud | 1GB Fixed | $7 |
| **CDN** | Cloudflare | Pro Plan (1TB) | $20 |
| **Video Hosting** | Bunny.net | 1TB storage, 5TB bandwidth | $50 |
| **Payments** | Stripe + Flutterwave | Transaction fees only | Variable |
| **Monitoring** | Datadog / New Relic | Basic | $0-25 |
| **Domain + SSL** | Cloudflare | Included | $0 |

| **TOTAL** | | | **$204 - $229/month** |

**Key Metrics at this tier:**
- ~3,000 DAU (Daily Active Users)
- ~50 requests/second peak
- ~500GB data transfer/month

---

### 📈 Growth Phase: 100,000 - 1,000,000 Users
**Target:** Product-market fit, scaling operations

| Service | Provider | Specification | Monthly Cost |
|---------|----------|---------------|--------------|
| **Backend Hosting** | AWS EKS / GCP GKE | 5 pods (4 CPU, 8GB each) | $400 |
| **Frontend Hosting** | Vercel | Enterprise | $150 |
| **Database** | MongoDB Atlas | M30 (8GB RAM, 100GB Storage) | $365 |
| **Redis Cache** | AWS ElastiCache | r6g.large (5GB) | $140 |
| **CDN** | Cloudflare | Business (10TB) | $200 |
| **Video Hosting** | Bunny.net | 5TB storage, 30TB bandwidth | $350 |
| **Load Balancer** | AWS ALB | With auto-scaling | $50 |
| **Monitoring** | Datadog | Pro (5 hosts) | $125 |
| **Logging** | AWS CloudWatch | Enhanced | $100 |
| **Backups** | Automated | Daily snapshots | $50 |

| **TOTAL** | | | **$1,930/month** |

**Key Metrics at this tier:**
- ~30,000 DAU
- ~500 requests/second peak
- ~5TB data transfer/month

---

### 🚀 Scale Phase: 1,000,000 - 5,000,000 Users
**Target:** Market leadership, multi-region expansion

| Service | Provider | Specification | Monthly Cost |
|---------|----------|---------------|--------------|
| **Backend Hosting** | AWS EKS | 15 pods (4 CPU, 16GB) + HPA | $1,800 |
| **Frontend Hosting** | Vercel + S3 | Enterprise + Global Edge | $500 |
| **Database** | MongoDB Atlas | M50 (32GB RAM, 500GB, 3 Replicas) | $1,460 |
| **Redis Cluster** | AWS ElastiCache | r6g.xlarge cluster (15GB) | $450 |
| **CDN** | Cloudflare | Enterprise (50TB) | $1,500 |
| **Video Hosting** | Bunny.net | 20TB storage, 150TB bandwidth | $1,800 |
| **Load Balancer** | AWS ALB | Multi-AZ with WAF | $300 |
| **API Gateway** | AWS API Gateway | Rate limiting + caching | $200 |
| **Monitoring** | Datadog | Enterprise (20 hosts) | $750 |
| **Logging** | ELK Stack / Loki | Self-hosted on K8s | $200 |
| **Security** | AWS Shield + WAF | Advanced DDoS protection | $500 |
| **Multi-Region** | Active-passive DR | Secondary region | $1,000 |

| **TOTAL** | | | **$10,460/month** |

**Key Metrics at this tier:**
- ~150,000 DAU
- ~2,500 requests/second peak
- ~25TB data transfer/month
- 99.9% uptime SLA required

---

### 🏢 Enterprise Phase: 5,000,000 - 10,000,000+ Users
**Target:** Global platform, maximum reliability

| Service | Provider | Specification | Monthly Cost |
|---------|----------|---------------|--------------|
| **Backend Hosting** | AWS EKS | 30+ pods (8 CPU, 32GB) + Spot | $5,000 |
| **Frontend Hosting** | Multi-CDN | Vercel + CloudFront + Fastly | $1,500 |
| **Database** | MongoDB Atlas | M60+ Sharded (128GB+, 1TB+) | $5,000 |
| **Redis Cluster** | AWS ElastiCache | r6g.2xlarge cluster (50GB+) | $1,200 |
| **CDN** | Cloudflare | Enterprise (200TB+) | $5,000 |
| **Video Hosting** | Bunny.net Enterprise | Custom + Multi-CDN | $8,000 |
| **Load Balancer** | AWS Global Accelerator | Global anycast | $1,000 |
| **API Gateway** | Kong / AWS | Enterprise features | $500 |
| **Monitoring** | Datadog | Enterprise (50+ hosts) | $2,500 |
| **APM** | New Relic / Dynatrace | Full stack | $1,500 |
| **Security** | AWS Shield Advanced | Enterprise DDoS | $3,000 |
| **Multi-Region** | Active-active | 3+ regions | $4,000 |
| **24/7 Support** | AWS Enterprise | TAM + Support | $1,500 |
| **Incident Management** | PagerDuty | Enterprise | $300 |

| **TOTAL** | | | **$40,000 - $50,000/month** |

**Key Metrics at this tier:**
- ~500,000+ DAU
- ~10,000+ requests/second peak
- ~100TB+ data transfer/month
- 99.99% uptime SLA required
- <100ms global latency

---

## Cost Projection Chart

```
Monthly Infrastructure Cost vs Users

$50,000 ┤                                                          ████
        │                                                    ██████████
$40,000 ┤                                               █████████████████
        │                                          ██████████████████████
$30,000 ┤                                     ███████████████████████████
        │                                ████████████████████████████████
$20,000 ┤                           █████████████████████████████████████
        │                      ██████████████████████████████████████████
$10,000 ┤                 ███████████████████████████████████████████████
        │           ████████████████████████████████████████████████████
$2,000  ┤    █████████████████████████████████████████████████████████████
        │████████████████████████████████████████████████████████████████
$200    ┤████
        └────┬────────┬────────┬────────┬────────┬────────┬────────┬────
           100K    500K      1M       2M       5M       7M      10M
                                   USERS

Key: ████ Infrastructure Cost
```

### Cost Per User (Monthly)

| User Count | Total Cost | Cost/User | Notes |
|------------|------------|-----------|-------|
| 100K | $230 | $0.0023 | Highly subsidized |
| 500K | $1,200 | $0.0024 | Economies of scale |
| 1M | $2,000 | $0.0020 | Optimal efficiency |
| 2M | $5,000 | $0.0025 | Scaling overhead |
| 5M | $12,000 | $0.0024 | Multi-region costs |
| 10M | $45,000 | $0.0045 | Enterprise reliability |

---

## Deployment Checklist

### Pre-Launch (Week -2)

- [ ] **Environment Variables**
  ```bash
  # Production .env
  MONGO_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/kona_prod
  REDIS_URL=redis://<host>:6379
  JWT_SECRET=<256-bit-random-string>
  STRIPE_SECRET_KEY=sk_live_xxx
  STRIPE_WEBHOOK_SECRET=whsec_xxx
  FLUTTERWAVE_SECRET_KEY=FLWSECK_xxx
  BUNNY_API_KEY=xxx
  BUNNY_LIBRARY_ID=xxx
  VAPID_PUBLIC_KEY=xxx
  VAPID_PRIVATE_KEY=xxx
  ```

- [ ] **Database Setup**
  - Create MongoDB Atlas cluster (M30 minimum for production)
  - Enable authentication and IP whitelisting
  - Configure backup schedule (every 6 hours)
  - Verify indexes are created (automatic on startup)

- [ ] **Redis Setup**
  - Deploy Redis cluster with persistence
  - Configure maxmemory-policy: `allkeys-lru`
  - Set up Redis Sentinel for high availability

- [ ] **SSL/TLS Certificates**
  - Configure SSL for API domain
  - Set up certificate auto-renewal (Let's Encrypt / AWS ACM)

### Launch Day (Day 0)

- [ ] **DNS Configuration**
  - Point domain to load balancer
  - Configure CDN (Cloudflare) in front
  - Set appropriate TTL (300 seconds)

- [ ] **Health Checks**
  ```bash
  # Verify all services
  curl https://api.kona.app/health
  # Expected: {"status":"healthy","cache":"connected","scaling":{"rate_limiting":"enabled",...}}
  ```

- [ ] **Monitoring Alerts**
  - CPU > 80% for 5 minutes
  - Memory > 85% for 5 minutes
  - API latency p95 > 500ms
  - Error rate > 1%
  - Database connections > 80%

- [ ] **Rollback Plan**
  - Document previous working version
  - Prepare rollback scripts
  - Test rollback procedure

### Post-Launch (Week +1)

- [ ] **Performance Baseline**
  - Record baseline metrics
  - Set up weekly performance reports
  - Configure auto-scaling thresholds

- [ ] **Security Audit**
  - Run OWASP ZAP scan
  - Review rate limiting effectiveness
  - Check for exposed secrets

---

## Monitoring & Alerts

### Key Metrics to Track

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           KONA DASHBOARD                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   REQUESTS/SEC  │  │   ERROR RATE    │  │   P95 LATENCY   │          │
│  │      2,450      │  │      0.12%      │  │      145ms      │          │
│  │   ▲ 12% today   │  │   ✓ Normal      │  │   ✓ Normal      │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   ACTIVE USERS  │  │   CACHE HIT     │  │   DB QUERIES    │          │
│  │     45,230      │  │      94.2%      │  │    1,200/sec    │          │
│  │   Peak: 52K     │  │   ✓ Optimal     │  │   ✓ Normal      │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API Latency (p95) | >300ms | >1000ms | Scale backend pods |
| Error Rate | >0.5% | >2% | Investigate logs |
| CPU Usage | >70% | >90% | Auto-scale triggered |
| Memory Usage | >75% | >90% | Check for leaks |
| DB Connections | >70% | >90% | Increase pool size |
| Cache Hit Rate | <85% | <70% | Review cache strategy |
| Disk Usage | >70% | >85% | Clean logs / expand |

### Recommended Monitoring Stack

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    
  alertmanager:
    image: prom/alertmanager
    ports:
      - "9093:9093"
```

---

## Scaling Strategy

### Horizontal Pod Autoscaling (HPA)

```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kona-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kona-backend
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Database Scaling Strategy

| User Count | MongoDB Strategy | Estimated Collections Size |
|------------|------------------|---------------------------|
| <500K | Single replica set | <50GB |
| 500K-2M | Replica set + Read replicas | 50-200GB |
| 2M-5M | Sharded cluster (2 shards) | 200-500GB |
| 5M+ | Sharded cluster (4+ shards) | 500GB+ |

### Sharding Key Recommendations

```javascript
// Shard by user_id for user-specific data
sh.shardCollection("kona.users", { "id": "hashed" })
sh.shardCollection("kona.notifications", { "user_id": "hashed" })
sh.shardCollection("kona.transactions", { "user_id": "hashed" })

// Shard by series_id for content data
sh.shardCollection("kona.episodes", { "series_id": "hashed" })
```

---

## Security Checklist

### Application Security

- [ ] **Authentication**
  - JWT tokens with short expiry (15 minutes)
  - Refresh token rotation
  - Secure password hashing (bcrypt, 12 rounds)

- [ ] **Rate Limiting** ✅ (Already Implemented)
  - Auth endpoints: 5/minute
  - API endpoints: 100/minute
  - Store endpoints: 20/minute

- [ ] **Input Validation**
  - Pydantic models for all inputs
  - SQL injection prevention (parameterized queries)
  - XSS prevention (sanitize outputs)

### Infrastructure Security

- [ ] **Network**
  - VPC with private subnets for databases
  - Security groups / firewall rules
  - No public database access

- [ ] **Secrets Management**
  - Use AWS Secrets Manager / HashiCorp Vault
  - Rotate secrets every 90 days
  - Never commit secrets to git

- [ ] **DDoS Protection**
  - Cloudflare DDoS protection
  - AWS Shield (for AWS deployments)
  - Rate limiting at edge

### Compliance

- [ ] **Data Privacy**
  - GDPR compliance (EU users)
  - Data retention policies
  - User data export/deletion API

- [ ] **Payment Security**
  - PCI DSS compliance (handled by Stripe/Flutterwave)
  - No card data stored locally
  - Webhook signature verification

---

## Disaster Recovery

### Backup Schedule

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| MongoDB | Every 6 hours | 30 days | Cross-region S3 |
| Redis (AOF) | Continuous | 7 days | Same region |
| User uploads | Real-time | Indefinite | Multi-region CDN |
| Logs | Daily archive | 90 days | Glacier |

### Recovery Time Objectives

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|----------|---------------------|-----------------|
| Pod failure | <1 minute | 0 |
| Zone failure | <5 minutes | 0 |
| Region failure | <1 hour | <6 hours |
| Database corruption | <2 hours | <6 hours |

### Failover Procedure

```
1. Detect failure (automated monitoring)
2. DNS failover to secondary region (Route 53 health checks)
3. Promote MongoDB secondary to primary
4. Warm Redis cache from database
5. Verify all services healthy
6. Update status page
7. Post-incident review
```

---

## Quick Reference Commands

### Health Checks
```bash
# Check all services
curl https://api.kona.app/health

# Check metrics
curl https://api.kona.app/api/metrics

# Check rate limiter status
curl -I https://api.kona.app/api/series
# Look for X-RateLimit-Remaining header
```

### Kubernetes Commands
```bash
# Scale backend manually
kubectl scale deployment kona-backend --replicas=10

# Check pod status
kubectl get pods -l app=kona-backend

# View logs
kubectl logs -f deployment/kona-backend

# Check HPA status
kubectl get hpa kona-backend-hpa
```

### Database Commands
```bash
# MongoDB Atlas - Check cluster status
mongosh "mongodb+srv://cluster.mongodb.net" --eval "db.adminCommand('ping')"

# Check index usage
mongosh --eval "db.users.aggregate([{$indexStats:{}}])"

# Check slow queries
mongosh --eval "db.system.profile.find().sort({millis:-1}).limit(5)"
```

---

## Support & Escalation

### Internal Contacts
- **Engineering Lead**: [Your Name]
- **DevOps**: [DevOps Lead]
- **On-Call**: PagerDuty rotation

### External Support
- **MongoDB Atlas**: https://support.mongodb.com
- **AWS Support**: AWS Console > Support Center
- **Cloudflare**: https://dash.cloudflare.com/support
- **Bunny.net**: https://support.bunny.net

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2025 | Kona Team | Initial production guide |

---

**Remember:** Start small, monitor everything, and scale based on real data. The infrastructure costs above are estimates - actual costs will vary based on traffic patterns, data growth, and geographic distribution.

🚀 **Good luck with your launch!**
