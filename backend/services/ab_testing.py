"""
A/B Testing Service for Pricing Styles
Enables testing different pricing strategies to optimize conversions
"""
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from services.database import db


class ABTestingService:
    """
    A/B Testing Service for pricing experiments
    
    Features:
    - Create tests with multiple variants
    - Consistent user assignment (same user always sees same variant)
    - Conversion tracking
    - Statistical analysis
    """
    
    async def create_test(
        self,
        test_name: str,
        description: str,
        variants: List[Dict[str, Any]],
        target_tier: str = "all",
        traffic_percentage: int = 100
    ) -> Dict[str, Any]:
        """
        Create a new A/B test
        
        Args:
            test_name: Unique name for the test
            description: What we're testing
            variants: List of variants, each with:
                - name: Variant name (e.g., "Control", "Value Pricing")
                - pricing_style: "value", "premium", or "exact"
                - weight: Traffic allocation (e.g., 50 for 50%)
            target_tier: Which tier to test ("all", "basic", "premium", "vip")
            traffic_percentage: % of users to include in test (rest see default)
        
        Example:
            variants = [
                {"name": "Control", "pricing_style": "value", "weight": 50},
                {"name": "Premium Style", "pricing_style": "premium", "weight": 50}
            ]
        """
        
        # Validate weights sum to 100
        total_weight = sum(v.get("weight", 0) for v in variants)
        if total_weight != 100:
            raise ValueError(f"Variant weights must sum to 100, got {total_weight}")
        
        # Check for existing active test
        existing = await db.ab_tests.find_one({
            "status": "active",
            "target_tier": target_tier
        })
        if existing:
            raise ValueError(f"An active test already exists for tier '{target_tier}'. End it first.")
        
        test_id = f"test_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        
        test = {
            "id": test_id,
            "name": test_name,
            "description": description,
            "variants": variants,
            "target_tier": target_tier,
            "traffic_percentage": traffic_percentage,
            "status": "active",
            "metrics": {
                "impressions": {v["name"]: 0 for v in variants},
                "conversions": {v["name"]: 0 for v in variants},
                "revenue_usd": {v["name"]: 0.0 for v in variants}
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "ended_at": None,
            "winner": None
        }
        
        await db.ab_tests.insert_one(test)
        del test["_id"]
        
        return test
    
    async def get_active_test(self, target_tier: str = "all") -> Optional[Dict[str, Any]]:
        """Get active test for a tier"""
        
        # First check for tier-specific test
        test = await db.ab_tests.find_one(
            {"status": "active", "target_tier": target_tier},
            {"_id": 0}
        )
        
        # If no tier-specific test, check for "all" tier test
        if not test and target_tier != "all":
            test = await db.ab_tests.find_one(
                {"status": "active", "target_tier": "all"},
                {"_id": 0}
            )
        
        return test
    
    async def get_user_variant(
        self, 
        user_id: str, 
        tier: str = "all"
    ) -> Optional[Dict[str, Any]]:
        """
        Get the variant assigned to a user for a specific tier
        Uses consistent hashing so user always sees the same variant
        
        Returns:
            {
                "test_id": "test_xxx",
                "variant_name": "Control",
                "pricing_style": "value",
                "is_in_test": True
            }
            or None if no active test
        """
        
        test = await self.get_active_test(tier)
        if not test:
            return None
        
        # Check if user is in test traffic
        user_hash = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        in_test = (user_hash % 100) < test["traffic_percentage"]
        
        if not in_test:
            return {
                "test_id": test["id"],
                "variant_name": None,
                "pricing_style": None,
                "is_in_test": False
            }
        
        # Assign user to variant based on hash
        variant_hash = user_hash % 100
        cumulative_weight = 0
        
        for variant in test["variants"]:
            cumulative_weight += variant["weight"]
            if variant_hash < cumulative_weight:
                return {
                    "test_id": test["id"],
                    "variant_name": variant["name"],
                    "pricing_style": variant["pricing_style"],
                    "is_in_test": True
                }
        
        # Fallback to first variant
        return {
            "test_id": test["id"],
            "variant_name": test["variants"][0]["name"],
            "pricing_style": test["variants"][0]["pricing_style"],
            "is_in_test": True
        }
    
    async def record_impression(
        self, 
        test_id: str, 
        variant_name: str,
        user_id: str
    ):
        """Record that a user saw a pricing variant"""
        
        # Check if already recorded for this user/test combo
        existing = await db.ab_test_impressions.find_one({
            "test_id": test_id,
            "user_id": user_id
        })
        
        if not existing:
            # Record impression
            await db.ab_test_impressions.insert_one({
                "test_id": test_id,
                "user_id": user_id,
                "variant_name": variant_name,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Update test metrics
            await db.ab_tests.update_one(
                {"id": test_id},
                {"$inc": {f"metrics.impressions.{variant_name}": 1}}
            )
    
    async def record_conversion(
        self,
        test_id: str,
        variant_name: str,
        user_id: str,
        tier: str,
        amount_usd: float
    ):
        """Record a subscription conversion"""
        
        # Check if already converted
        existing = await db.ab_test_conversions.find_one({
            "test_id": test_id,
            "user_id": user_id
        })
        
        if not existing:
            # Record conversion
            await db.ab_test_conversions.insert_one({
                "test_id": test_id,
                "user_id": user_id,
                "variant_name": variant_name,
                "tier": tier,
                "amount_usd": amount_usd,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Update test metrics
            await db.ab_tests.update_one(
                {"id": test_id},
                {
                    "$inc": {
                        f"metrics.conversions.{variant_name}": 1,
                        f"metrics.revenue_usd.{variant_name}": amount_usd
                    }
                }
            )
    
    async def get_test_results(self, test_id: str) -> Dict[str, Any]:
        """Get detailed results for a test"""
        
        test = await db.ab_tests.find_one({"id": test_id}, {"_id": 0})
        if not test:
            return None
        
        results = {
            "test": test,
            "variants": []
        }
        
        for variant in test["variants"]:
            name = variant["name"]
            impressions = test["metrics"]["impressions"].get(name, 0)
            conversions = test["metrics"]["conversions"].get(name, 0)
            revenue = test["metrics"]["revenue_usd"].get(name, 0)
            
            conversion_rate = (conversions / impressions * 100) if impressions > 0 else 0
            avg_revenue = revenue / conversions if conversions > 0 else 0
            
            results["variants"].append({
                "name": name,
                "pricing_style": variant["pricing_style"],
                "weight": variant["weight"],
                "impressions": impressions,
                "conversions": conversions,
                "conversion_rate": round(conversion_rate, 2),
                "revenue_usd": round(revenue, 2),
                "avg_revenue_per_conversion": round(avg_revenue, 2)
            })
        
        # Calculate statistical significance (simple z-test)
        if len(results["variants"]) == 2:
            v1, v2 = results["variants"]
            if v1["impressions"] > 30 and v2["impressions"] > 30:
                # Calculate z-score
                p1 = v1["conversions"] / v1["impressions"] if v1["impressions"] > 0 else 0
                p2 = v2["conversions"] / v2["impressions"] if v2["impressions"] > 0 else 0
                n1, n2 = v1["impressions"], v2["impressions"]
                
                p_pooled = (v1["conversions"] + v2["conversions"]) / (n1 + n2) if (n1 + n2) > 0 else 0
                
                if p_pooled > 0 and p_pooled < 1:
                    se = (p_pooled * (1 - p_pooled) * (1/n1 + 1/n2)) ** 0.5
                    if se > 0:
                        z_score = abs(p1 - p2) / se
                        
                        # Determine significance
                        if z_score > 2.576:
                            significance = "99% confident"
                        elif z_score > 1.96:
                            significance = "95% confident"
                        elif z_score > 1.645:
                            significance = "90% confident"
                        else:
                            significance = "Not yet significant"
                        
                        results["statistical_analysis"] = {
                            "z_score": round(z_score, 3),
                            "significance": significance,
                            "recommendation": self._get_recommendation(v1, v2, z_score)
                        }
        
        return results
    
    def _get_recommendation(self, v1: Dict, v2: Dict, z_score: float) -> str:
        """Generate recommendation based on results"""
        
        if z_score < 1.645:
            return "Continue testing - results not yet statistically significant"
        
        winner = v1 if v1["conversion_rate"] > v2["conversion_rate"] else v2
        loser = v2 if winner == v1 else v1
        
        lift = ((winner["conversion_rate"] - loser["conversion_rate"]) / loser["conversion_rate"] * 100) if loser["conversion_rate"] > 0 else 0
        
        return f"'{winner['name']}' outperforms '{loser['name']}' by {lift:.1f}%. Consider declaring winner."
    
    async def end_test(
        self, 
        test_id: str, 
        winner: Optional[str] = None
    ) -> Dict[str, Any]:
        """End a test and optionally declare a winner"""
        
        result = await db.ab_tests.find_one_and_update(
            {"id": test_id},
            {
                "$set": {
                    "status": "ended",
                    "ended_at": datetime.now(timezone.utc).isoformat(),
                    "winner": winner
                }
            },
            return_document=True
        )
        
        if result and "_id" in result:
            del result["_id"]
        
        return result
    
    async def apply_winner(self, test_id: str) -> Dict[str, Any]:
        """Apply the winning variant as the new default"""
        
        test = await db.ab_tests.find_one({"id": test_id}, {"_id": 0})
        if not test:
            raise ValueError("Test not found")
        
        if test["status"] != "ended" or not test.get("winner"):
            raise ValueError("Test must be ended with a declared winner")
        
        # Find winning variant
        winner_variant = next(
            (v for v in test["variants"] if v["name"] == test["winner"]),
            None
        )
        
        if not winner_variant:
            raise ValueError("Winner variant not found")
        
        # Apply to tier pricing style
        target_tier = test["target_tier"]
        pricing_style = winner_variant["pricing_style"]
        
        if target_tier == "all":
            # Apply to all paid tiers
            for tier in ["basic", "premium", "vip"]:
                await db.system_config.update_one(
                    {"type": "tier_pricing_styles"},
                    {"$set": {f"styles.{tier}": pricing_style}},
                    upsert=True
                )
        else:
            await db.system_config.update_one(
                {"type": "tier_pricing_styles"},
                {"$set": {f"styles.{target_tier}": pricing_style}},
                upsert=True
            )
        
        return {
            "status": "applied",
            "winning_variant": winner_variant,
            "applied_to": target_tier,
            "pricing_style": pricing_style
        }
    
    async def get_all_tests(
        self, 
        status: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get all tests, optionally filtered by status"""
        
        query = {}
        if status:
            query["status"] = status
        
        tests = await db.ab_tests.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return tests


# Global instance
ab_testing_service = ABTestingService()
