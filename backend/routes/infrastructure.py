from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import math

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])

class InfrastructureRequest(BaseModel):
    total_users: int = Field(..., ge=100, le=10000000, description="Total number of users")

class ServerRecommendation(BaseModel):
    name: str
    provider: str
    specs: str

class DbRecommendation(BaseModel):
    name: str
    tier: str
    cost: str

class CdnRecommendation(BaseModel):
    name: str
    reason: str

class UptimeComponent(BaseModel):
    component: str
    solution: str
    impact: str

class AffordableTip(BaseModel):
    tip: str
    savings: str
    priority: str

class InfrastructureResponse(BaseModel):
    users: Dict[str, int]
    compute: Dict[str, Any]
    database: Dict[str, Any]
    cdn: Dict[str, Any]
    monitoring: Dict[str, Any]
    backup: Dict[str, Any]
    total_cost: Dict[str, float]
    uptime_components: List[Dict[str, str]]
    affordable_tips: List[Dict[str, str]]

def calculate_server_cost(concurrent: int) -> int:
    """Calculate monthly server cost based on concurrent users"""
    if concurrent <= 100:
        return 20  # Shared hosting / small VPS
    if concurrent <= 500:
        return 50  # Medium VPS
    if concurrent <= 2000:
        return 150  # Large VPS or small dedicated
    if concurrent <= 10000:
        return 400  # Multiple servers
    return math.ceil(concurrent / 25)  # Scale horizontally

def calculate_db_cost(storage: int, connections: int) -> int:
    """Calculate monthly database cost"""
    if storage <= 5:
        return 0  # Free tier
    if storage <= 20:
        return 15  # Basic shared
    if storage <= 100:
        return 50  # Small dedicated
    return math.ceil(storage * 0.5) + math.ceil(connections * 0.1)

def calculate_cdn_cost(bandwidth_tb: int, storage_tb: int) -> int:
    """Calculate monthly CDN cost (Bunny.net pricing)"""
    storage_cost = storage_tb * 5  # ~$5/TB storage
    bandwidth_cost = bandwidth_tb * 10  # ~$10/TB bandwidth
    return math.ceil(storage_cost + bandwidth_cost)

def calculate_instances(concurrent: int) -> int:
    """Calculate recommended number of server instances"""
    if concurrent <= 500:
        return 1
    if concurrent <= 2000:
        return 2
    if concurrent <= 5000:
        return 3
    return math.ceil(concurrent / 2000)

def get_server_recommendation(concurrent: int) -> dict:
    """Get server recommendation based on concurrent users"""
    if concurrent <= 100:
        return {"name": "Shared VPS (2GB)", "provider": "Hetzner/DigitalOcean", "specs": "2 vCPU, 2GB RAM"}
    if concurrent <= 500:
        return {"name": "Small VPS (4GB)", "provider": "Hetzner Cloud", "specs": "2 vCPU, 4GB RAM"}
    if concurrent <= 2000:
        return {"name": "Medium VPS (8GB)", "provider": "Hetzner/Vultr", "specs": "4 vCPU, 8GB RAM"}
    return {"name": "Multiple VPS with Load Balancer", "provider": "Hetzner + Cloudflare LB", "specs": "4-8 vCPU, 8-16GB RAM each"}

def get_db_recommendation(users: int) -> dict:
    """Get database recommendation based on total users"""
    if users <= 5000:
        return {"name": "MongoDB Atlas Free/Shared", "tier": "M0-M2", "cost": "Free-$9/mo"}
    if users <= 50000:
        return {"name": "MongoDB Atlas M10", "tier": "M10", "cost": "$57/mo"}
    return {"name": "MongoDB Atlas M20+", "tier": "M20", "cost": "$140+/mo"}

def get_cdn_recommendation(users: int) -> dict:
    """Get CDN recommendation based on total users"""
    if users <= 10000:
        return {"name": "Bunny.net", "reason": "Cheapest CDN, $0.01/GB"}
    if users <= 100000:
        return {"name": "Bunny.net + Cloudflare", "reason": "Cost-effective combo"}
    return {"name": "Bunny.net Stream", "reason": "Built-in video optimization"}

def get_monitoring_recommendation(users: int) -> list:
    """Get monitoring tools recommendation"""
    if users <= 10000:
        return ["UptimeRobot (free)", "Sentry (free tier)", "Custom health checks"]
    return ["Better Uptime ($20/mo)", "Sentry Team", "Prometheus + Grafana"]

def get_backup_recommendation(users: int) -> str:
    """Get backup strategy recommendation"""
    if users <= 10000:
        return "Daily automated backups to S3/Backblaze B2"
    return "Hourly backups + cross-region replication"

def get_uptime_components(users: int) -> list:
    """Get uptime architecture components"""
    return [
        {
            "component": "Load Balancer / Reverse Proxy",
            "solution": "Cloudflare (free)" if users <= 10000 else "Cloudflare Pro ($20/mo)",
            "impact": "Route traffic, DDoS protection"
        },
        {
            "component": "Multi-zone Deployment",
            "solution": "Single region, 2 availability zones" if users <= 50000 else "Multi-region active-passive",
            "impact": "Survive zone failures"
        },
        {
            "component": "Health Checks",
            "solution": "UptimeRobot + Custom endpoints",
            "impact": "Detect issues in <1 min"
        },
        {
            "component": "Auto-restart",
            "solution": "PM2 / Supervisor / Docker restart",
            "impact": "Recover from crashes"
        },
        {
            "component": "Database Replica",
            "solution": "MongoDB Atlas built-in" if users <= 10000 else "Read replicas",
            "impact": "DB failover"
        },
        {
            "component": "CDN Redundancy",
            "solution": "Bunny.net multi-PoP",
            "impact": "Global content availability"
        }
    ]

def get_affordable_tips(users: int) -> list:
    """Get cost-saving tips"""
    tips = [
        {"tip": "Use Hetzner over AWS/GCP", "savings": "60-70% cheaper for same specs", "priority": "HIGH"},
        {"tip": "Bunny.net for video CDN", "savings": "10x cheaper than CloudFront", "priority": "HIGH"},
        {"tip": "MongoDB Atlas free tier to start", "savings": "Free for up to 5GB", "priority": "HIGH"},
        {"tip": "Cloudflare free for DNS + CDN", "savings": "Free SSL, DDoS protection", "priority": "HIGH"},
        {"tip": "Use spot/preemptible instances for non-critical", "savings": "50-80% off", "priority": "MEDIUM"}
    ]
    if users > 10000:
        tips.append({"tip": "Reserved instances for predictable workloads", "savings": "30-40% off", "priority": "MEDIUM"})
    if users > 50000:
        tips.append({"tip": "Negotiate enterprise deals with providers", "savings": "Custom pricing", "priority": "HIGH"})
    return tips

@router.post("/calculate", response_model=InfrastructureResponse)
async def calculate_infrastructure(request: InfrastructureRequest):
    """
    Calculate infrastructure requirements for 99% uptime based on user count.
    Returns affordable hosting recommendations optimized for cost-effectiveness.
    """
    total_users = request.total_users
    
    # Calculate derived metrics
    concurrent_users = math.ceil(total_users * 0.1)  # 10% concurrent at peak
    requests_per_second = math.ceil(concurrent_users * 0.5)  # 0.5 requests/user/sec
    video_streams = math.ceil(concurrent_users * 0.3)  # 30% actively streaming
    bandwidth_gbps = (video_streams * 3) / 1000  # 3 Mbps per stream average
    
    # Database sizing
    db_storage_gb = math.ceil(total_users * 0.01)  # ~10MB per user data
    db_connections = min(math.ceil(concurrent_users / 10), 500)
    
    # CDN & Storage
    video_storage_tb = max(1, math.ceil(total_users / 10000))  # 1TB per 10k users (content library)
    cdn_bandwidth_tb = max(1, math.ceil(bandwidth_gbps * 3600 * 24 * 30 / 8 / 1000))  # Monthly
    
    # Calculate costs
    server_cost = calculate_server_cost(concurrent_users)
    db_cost = calculate_db_cost(db_storage_gb, db_connections)
    cdn_cost = calculate_cdn_cost(cdn_bandwidth_tb, video_storage_tb)
    monitoring_cost = 20 if total_users <= 10000 else 50
    backup_cost = max(5, math.ceil(db_storage_gb * 0.05))
    
    total_monthly_cost = server_cost + db_cost + cdn_cost + monitoring_cost + backup_cost
    cost_per_user = total_monthly_cost / total_users if total_users > 0 else 0
    
    return {
        "users": {
            "total": total_users,
            "concurrent": concurrent_users,
            "streaming": video_streams
        },
        "compute": {
            "requests_per_second": requests_per_second,
            "recommended_instances": calculate_instances(concurrent_users),
            "server_type": get_server_recommendation(concurrent_users),
            "cost": server_cost
        },
        "database": {
            "storage_gb": db_storage_gb,
            "connections": db_connections,
            "type": get_db_recommendation(total_users),
            "cost": db_cost
        },
        "cdn": {
            "storage_tb": video_storage_tb,
            "bandwidth_tb": cdn_bandwidth_tb,
            "provider": get_cdn_recommendation(total_users),
            "cost": cdn_cost
        },
        "monitoring": {
            "tools": get_monitoring_recommendation(total_users),
            "cost": monitoring_cost
        },
        "backup": {
            "strategy": get_backup_recommendation(total_users),
            "cost": backup_cost
        },
        "total_cost": {
            "monthly": total_monthly_cost,
            "yearly": total_monthly_cost * 12,
            "per_user": round(cost_per_user, 4)
        },
        "uptime_components": get_uptime_components(total_users),
        "affordable_tips": get_affordable_tips(total_users)
    }
