# Kona - Disaster Recovery Plan

## Overview

This document outlines Kona's disaster recovery procedures to ensure business continuity and minimize downtime in case of system failures, security breaches, or other emergencies.

---

## 1. Recovery Objectives

### Recovery Time Objective (RTO)
Maximum acceptable downtime before service restoration.

| Service Level | RTO |
|---------------|-----|
| Critical (Payments, Auth) | 15 minutes |
| High (Video Streaming) | 1 hour |
| Medium (Search, Recommendations) | 4 hours |
| Low (Analytics, Reports) | 24 hours |

### Recovery Point Objective (RPO)
Maximum acceptable data loss in time.

| Data Type | RPO |
|-----------|-----|
| User Data | 0 (real-time replication) |
| Transaction Data | 0 (real-time replication) |
| Watch History | 1 hour |
| Analytics | 24 hours |

---

## 2. Backup Strategy

### Database Backups

**MongoDB:**
- **Continuous:** Real-time replication to secondary nodes
- **Hourly:** Automated snapshots to cloud storage
- **Daily:** Full backup to geo-redundant storage
- **Weekly:** Offline backup to separate region

**Backup Locations:**
| Backup Type | Primary Location | Secondary Location |
|-------------|------------------|-------------------|
| Real-time | AWS eu-west-1 | AWS us-east-1 |
| Snapshots | S3 eu-west-1 | S3 us-west-2 |
| Weekly | Azure Blob Storage | GCP Cloud Storage |

### Application Backups

- **Code:** Git repository with multiple remotes (GitHub, GitLab)
- **Configuration:** Encrypted backup in AWS Secrets Manager
- **Containers:** Docker images in multiple registries
- **Infrastructure:** Terraform state in versioned S3 bucket

### Media Backups

- **Video Files:** Bunny.net CDN with origin storage redundancy
- **Thumbnails:** S3 with cross-region replication
- **User Uploads:** Immediate replication to backup region

---

## 3. Disaster Scenarios & Response

### Scenario 1: Database Failure

**Symptoms:**
- API errors (500 responses)
- Authentication failures
- Data not loading

**Response Procedure:**

1. **Detection (0-5 min)**
   - Automated alerts from monitoring
   - PagerDuty notification to on-call engineer

2. **Assessment (5-10 min)**
   ```bash
   # Check MongoDB status
   mongosh --eval "rs.status()"
   
   # Check connection pool
   kubectl logs -l app=backend | grep "MongoDB"
   ```

3. **Failover (10-15 min)**
   ```bash
   # Promote secondary to primary
   mongosh --eval "rs.stepDown()"
   
   # Verify new primary
   mongosh --eval "rs.isMaster()"
   ```

4. **Verification (15-20 min)**
   - Run health check endpoints
   - Verify data integrity
   - Test critical flows (auth, payments)

5. **Post-Incident**
   - Restore failed node
   - Document root cause
   - Update runbook if needed

---

### Scenario 2: Complete Region Failure

**Symptoms:**
- All services unavailable
- CDN returning errors
- DNS not resolving

**Response Procedure:**

1. **Detection (0-5 min)**
   - Multi-region health checks fail
   - Cloud provider status page confirms outage

2. **DNS Failover (5-15 min)**
   ```bash
   # Update Route53 to backup region
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123456 \
     --change-batch file://failover-records.json
   
   # Verify DNS propagation
   dig api.kona.app
   ```

3. **Database Activation (15-30 min)**
   ```bash
   # Promote backup cluster
   mongosh backup-cluster --eval "rs.reconfig(newConfig)"
   
   # Update connection strings
   kubectl set env deployment/backend MONGO_URL=$BACKUP_URL
   ```

4. **Service Verification (30-45 min)**
   - Deploy to backup Kubernetes cluster
   - Verify all services healthy
   - Test end-to-end flows

5. **Communication**
   - Status page update
   - Social media notification
   - Email to affected users

---

### Scenario 3: Security Breach

**Symptoms:**
- Unusual API activity
- Unauthorized data access
- User reports of account compromise

**Response Procedure:**

1. **Immediate Actions (0-15 min)**
   ```bash
   # Revoke all JWT tokens
   redis-cli FLUSHDB
   
   # Enable maintenance mode
   kubectl scale deployment/frontend --replicas=0
   
   # Block suspicious IPs
   aws waf update-ip-set --ip-set-id xxx --updates file://block-ips.json
   ```

2. **Investigation (15-60 min)**
   - Review access logs
   - Identify compromised accounts
   - Assess data exposure

3. **Containment**
   - Reset affected user passwords
   - Rotate API keys and secrets
   - Patch vulnerability

4. **Recovery**
   - Restore from clean backup if needed
   - Re-enable services gradually
   - Monitor for continued attack

5. **Notification**
   - Legal team notification
   - User breach notification (if required)
   - Regulatory reporting (GDPR if applicable)

---

### Scenario 4: CDN/Video Delivery Failure

**Symptoms:**
- Videos not loading
- Slow content delivery
- 404 errors on media

**Response Procedure:**

1. **Detection**
   - CDN health check failures
   - Increased error rates

2. **Immediate Mitigation**
   ```bash
   # Fallback to backup CDN
   kubectl set env deployment/backend CDN_URL=$BACKUP_CDN
   
   # Clear CDN cache
   bunny-cli purge --all
   ```

3. **Origin Verification**
   - Check storage availability
   - Verify video transcoding
   - Test direct origin access

4. **Resolution**
   - Switch CDN providers if prolonged
   - Increase origin capacity
   - Update DNS TTL for faster failover

---

## 4. Communication Plan

### Internal Communication

| Severity | Notification Method | Recipients |
|----------|--------------------|-----------| 
| Critical | PagerDuty + Phone | On-call + CTO + CEO |
| High | Slack #incidents | Engineering team |
| Medium | Slack #ops | Operations team |
| Low | Email | Relevant team |

### External Communication

**Status Page Updates:**
- URL: status.kona.app
- Update frequency: Every 15 minutes during incident
- Template: "We are currently experiencing [issue]. Expected resolution: [time]. Updates will be posted every [15 minutes]."

**Social Media:**
- Twitter: @KonaSupport
- Response template available in runbook

**User Email (for extended outages > 1 hour):**
```
Subject: Kona Service Update

We're currently experiencing technical difficulties affecting [service].
Our team is working to resolve this as quickly as possible.

Expected resolution: [time]
Compensation: [if applicable]

Thank you for your patience.
```

---

## 5. Recovery Runbooks

### Database Recovery Runbook

```bash
# 1. Identify latest backup
aws s3 ls s3://kona-backups/mongodb/ --recursive | tail -5

# 2. Download backup
aws s3 cp s3://kona-backups/mongodb/latest.archive ./

# 3. Restore to new cluster
mongorestore --archive=latest.archive --nsInclude="kona.*"

# 4. Verify data integrity
mongosh --eval "db.users.countDocuments({})"
mongosh --eval "db.series.countDocuments({})"

# 5. Update application config
kubectl set env deployment/backend MONGO_URL=new-connection-string
```

### Kubernetes Cluster Recovery

```bash
# 1. Create new cluster in backup region
terraform apply -target=module.eks_backup

# 2. Deploy applications
kubectl apply -f ./k8s/

# 3. Restore secrets
aws secretsmanager get-secret-value --secret-id kona/prod | \
  kubectl create secret generic app-secrets --from-literal=...

# 4. Verify deployments
kubectl get pods -A
kubectl logs -l app=backend --tail=50
```

---

## 6. Testing Schedule

### Backup Verification
- **Weekly:** Verify backup completion
- **Monthly:** Restore backup to test environment
- **Quarterly:** Full disaster recovery drill

### Failover Testing
- **Monthly:** Database failover test (off-hours)
- **Quarterly:** Region failover test
- **Annually:** Complete DR simulation

### Drill Schedule

| Month | Test Type | Scope |
|-------|-----------|-------|
| January | DB Failover | Production |
| April | Region Failover | Staging |
| July | Security Breach | Tabletop |
| October | Full DR | Production |

---

## 7. Contact Information

### On-Call Rotation
- Primary: Check PagerDuty schedule
- Escalation: CTO → CEO

### Vendor Contacts

| Vendor | Contact | SLA |
|--------|---------|-----|
| AWS Support | Enterprise support portal | 15 min response |
| MongoDB Atlas | atlas-support@mongodb.com | 1 hour response |
| Bunny.net | support@bunny.net | 4 hour response |
| Cloudflare | Enterprise dashboard | 24/7 support |

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| CTO | [Name] | +XXX | cto@kona.app |
| DevOps Lead | [Name] | +XXX | devops@kona.app |
| Security Lead | [Name] | +XXX | security@kona.app |

---

## 8. Post-Incident Review

### Required Documentation
- Incident timeline
- Root cause analysis
- Impact assessment (users affected, revenue lost)
- Remediation steps taken
- Prevention measures

### Review Meeting
- Schedule within 48 hours of incident resolution
- Attendees: Engineering, Product, Leadership
- Output: Updated runbooks, action items

---

*Document Owner: DevOps Team*
*Last Updated: January 2026*
*Next Review: April 2026*
