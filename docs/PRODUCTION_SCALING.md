# Kona Production Scaling Guide

## Current Architecture (10M+ Users Ready)

### Backend Infrastructure
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx/K8s)                │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  FastAPI Pod 1  │  │  FastAPI Pod 2  │  │  FastAPI Pod N  │
│  (Backend)      │  │  (Backend)      │  │  (Backend)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
         ┌────────────────────────────────────────┐
         │         Redis Cluster (Caching)        │
         │         - Series data (1hr TTL)        │
         │         - User sessions (5min TTL)     │
         │         - Leaderboards (1min TTL)      │
         └────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │      MongoDB Replica Set / Sharding    │
         │      - Primary (writes)                │
         │      - Secondary 1 (reads)             │
         │      - Secondary 2 (reads)             │
         └────────────────────────────────────────┘
```

## 1. Horizontal Scaling (Multiple Backend Instances)

### Kubernetes Deployment
```yaml
# kona-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kona-backend
spec:
  replicas: 3  # Scale to more replicas as needed
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
        image: kona/backend:latest
        ports:
        - containerPort: 8001
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
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
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: kona-secrets
              key: jwt-secret
        readinessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
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
  minReplicas: 3
  maxReplicas: 20
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
```

### Load Balancer Service
```yaml
# kona-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: kona-backend-lb
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8001
    protocol: TCP
  selector:
    app: kona-backend
```

## 2. MongoDB Replica Set Configuration

### Replica Set Setup (for High Availability)
```javascript
// Initialize replica set
rs.initiate({
  _id: "konaReplicaSet",
  members: [
    { _id: 0, host: "mongo-primary:27017", priority: 2 },
    { _id: 1, host: "mongo-secondary1:27017", priority: 1 },
    { _id: 2, host: "mongo-secondary2:27017", priority: 1 },
    { _id: 3, host: "mongo-arbiter:27017", arbiterOnly: true }
  ]
})
```

### Connection String for Replica Set
```
MONGO_URL=mongodb://mongo-primary:27017,mongo-secondary1:27017,mongo-secondary2:27017/kona?replicaSet=konaReplicaSet&readPreference=secondaryPreferred
```

### Sharding Configuration (for 50M+ users)
```javascript
// Enable sharding on database
sh.enableSharding("kona")

// Shard users collection by user_id (hashed for distribution)
sh.shardCollection("kona.users", { "id": "hashed" })

// Shard watch_history by user_id for query locality
sh.shardCollection("kona.watch_history", { "user_id": "hashed" })

// Shard notifications by user_id
sh.shardCollection("kona.notifications", { "user_id": "hashed" })
```

## 3. Redis Cluster Configuration

### Redis Cluster Setup (6 nodes minimum)
```yaml
# redis-cluster.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
    maxmemory 2gb
    maxmemory-policy allkeys-lru
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        - containerPort: 16379
        command: ["redis-server", "/conf/redis.conf"]
        volumeMounts:
        - name: config
          mountPath: /conf
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: config
        configMap:
          name: redis-cluster-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### Redis Connection String
```
REDIS_URL=redis://redis-cluster-0.redis-cluster:6379,redis-cluster-1.redis-cluster:6379,redis-cluster-2.redis-cluster:6379
```

## 4. CDN Configuration (Video/Static Content)

### Cloudflare Configuration
```json
{
  "zone_settings": {
    "cache_level": "aggressive",
    "browser_cache_ttl": 31536000,
    "always_use_https": "on",
    "min_tls_version": "1.2"
  },
  "page_rules": [
    {
      "pattern": "*.kona.com/videos/*",
      "actions": {
        "cache_level": "cache_everything",
        "edge_cache_ttl": 2592000,
        "browser_cache_ttl": 604800
      }
    },
    {
      "pattern": "*.kona.com/thumbnails/*",
      "actions": {
        "cache_level": "cache_everything",
        "edge_cache_ttl": 604800,
        "browser_cache_ttl": 86400,
        "polish": "lossy"
      }
    },
    {
      "pattern": "*.kona.com/api/*",
      "actions": {
        "cache_level": "bypass"
      }
    }
  ]
}
```

### AWS CloudFront Alternative
```yaml
# cloudfront-distribution.yaml
Distribution:
  Origins:
    - Id: KonaVideoOrigin
      DomainName: kona-videos.s3.amazonaws.com
      S3OriginConfig:
        OriginAccessIdentity: origin-access-identity/cloudfront/XXXXX
    - Id: KonaAPIOrigin
      DomainName: api.kona.com
      CustomOriginConfig:
        HTTPPort: 80
        HTTPSPort: 443
        OriginProtocolPolicy: https-only
  DefaultCacheBehavior:
    TargetOriginId: KonaAPIOrigin
    ViewerProtocolPolicy: redirect-to-https
    CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad  # CachingDisabled
  CacheBehaviors:
    - PathPattern: "/videos/*"
      TargetOriginId: KonaVideoOrigin
      ViewerProtocolPolicy: redirect-to-https
      CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6  # Managed-CachingOptimized
      ResponseHeadersPolicyId: 67f7725c-6f97-4210-82d7-5512b31e9d03
    - PathPattern: "/thumbnails/*"
      TargetOriginId: KonaVideoOrigin
      ViewerProtocolPolicy: redirect-to-https
      Compress: true
      CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
  PriceClass: PriceClass_All
  Enabled: true
```

## 5. Environment Variables (Production)

```bash
# Backend Environment
MONGO_URL=mongodb://mongo-primary:27017,mongo-secondary1:27017,mongo-secondary2:27017/kona?replicaSet=konaRS&readPreference=secondaryPreferred
DB_NAME=kona
REDIS_URL=redis://redis-cluster:6379
JWT_SECRET=<generate-strong-256bit-secret>
CORS_ORIGINS=https://kona.com,https://www.kona.com,https://app.kona.com

# Optional: External Services
BUNNY_API_KEY=<bunny-cdn-api-key>
BUNNY_STORAGE_ZONE=kona-videos
STRIPE_API_KEY=<stripe-api-key>
SENDGRID_API_KEY=<sendgrid-api-key>
```

## 6. Current Caching Strategy (Already Implemented)

### Cache TTL Settings (`/backend/services/cache.py`)
| Data Type | TTL | Reason |
|-----------|-----|--------|
| Series list | 30 min | Changes infrequently |
| Single series | 1 hour | Metadata rarely updates |
| Episodes | 1 hour | Content is static |
| User profile | 5 min | Balance changes on actions |
| Leaderboard | 1 min | Frequently updated |
| Notifications | 30 sec | Real-time important |

### Cache Invalidation Points
- On series update → invalidate series cache + list cache
- On user action (purchase, watch) → invalidate user cache
- On leaderboard update → invalidate leaderboard cache

## 7. Scaling Thresholds

| User Count | Recommended Setup |
|------------|-------------------|
| < 1M | Single MongoDB, Single Redis, 2-3 API pods |
| 1M - 10M | MongoDB Replica Set, Redis Cluster, 5-10 API pods |
| 10M - 50M | MongoDB Sharded + Replica, Redis Cluster, 10-20 API pods |
| 50M+ | Full sharding, multi-region CDN, 50+ API pods |

## 8. Monitoring & Alerts

### Key Metrics to Monitor
```yaml
alerts:
  - name: HighAPILatency
    condition: avg(api_response_time) > 500ms for 5min
    action: scale_up_pods
    
  - name: HighCacheMissRate
    condition: cache_miss_rate > 30% for 10min
    action: investigate_cache_keys
    
  - name: MongoSlowQueries
    condition: slow_query_count > 100/min
    action: review_indexes
    
  - name: HighMemoryUsage
    condition: pod_memory_usage > 85%
    action: scale_up_or_optimize
```

## Quick Start Commands

```bash
# Scale backend pods
kubectl scale deployment kona-backend --replicas=10

# Check pod status
kubectl get pods -l app=kona-backend

# View logs
kubectl logs -f deployment/kona-backend

# Check MongoDB replica status
mongosh --eval "rs.status()"

# Check Redis cluster status
redis-cli cluster info
```
