"""
Payout Automation Service
Automatically triggers payouts when creator balances reach configured thresholds
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum

from services import db
from services.payouts import payout_service, PayoutMethod, PayoutStatus


class AutoPayoutStatus(str, Enum):
    ENABLED = "enabled"
    DISABLED = "disabled"
    PAUSED = "paused"


class PayoutAutomationService:
    """
    Automated payout service that monitors creator balances
    and triggers payouts when thresholds are reached.
    """
    
    # Default thresholds
    DEFAULT_THRESHOLD_COINS = 5000  # Default: auto-payout at 5000 coins ($50)
    MIN_THRESHOLD_COINS = 1000     # Minimum threshold: 1000 coins ($10)
    MAX_THRESHOLD_COINS = 100000   # Maximum threshold: 100,000 coins ($1000)
    
    # Auto-payout check interval
    CHECK_INTERVAL_SECONDS = 3600  # Check every hour
    
    def __init__(self):
        self._running = False
        self._task = None
    
    async def get_creator_auto_payout_settings(self, creator_id: str) -> Dict[str, Any]:
        """Get auto-payout settings for a creator"""
        settings = await db.auto_payout_settings.find_one(
            {"creator_id": creator_id},
            {"_id": 0}
        )
        
        if not settings:
            # Return default settings
            return {
                "creator_id": creator_id,
                "status": AutoPayoutStatus.DISABLED.value,
                "threshold_coins": self.DEFAULT_THRESHOLD_COINS,
                "payout_method": None,
                "payout_details": None,
                "last_auto_payout": None,
                "total_auto_payouts": 0
            }
        
        return settings
    
    async def update_auto_payout_settings(
        self,
        creator_id: str,
        status: Optional[str] = None,
        threshold_coins: Optional[int] = None,
        payout_method: Optional[str] = None,
        payout_details: Optional[Dict[str, Any]] = None,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update auto-payout settings for a creator"""
        
        # Validate threshold
        if threshold_coins is not None:
            if threshold_coins < self.MIN_THRESHOLD_COINS:
                raise ValueError(f"Minimum threshold is {self.MIN_THRESHOLD_COINS} coins")
            if threshold_coins > self.MAX_THRESHOLD_COINS:
                raise ValueError(f"Maximum threshold is {self.MAX_THRESHOLD_COINS} coins")
        
        # Get current settings
        current = await self.get_creator_auto_payout_settings(creator_id)
        
        # Build update
        update = {
            "creator_id": creator_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if status is not None:
            update["status"] = status
        if threshold_coins is not None:
            update["threshold_coins"] = threshold_coins
        if payout_method is not None:
            update["payout_method"] = payout_method
        if payout_details is not None:
            update["payout_details"] = payout_details
        if country_code is not None:
            update["country_code"] = country_code
        
        # Upsert settings
        await db.auto_payout_settings.update_one(
            {"creator_id": creator_id},
            {"$set": update},
            upsert=True
        )
        
        return await self.get_creator_auto_payout_settings(creator_id)
    
    async def check_and_trigger_auto_payouts(self) -> Dict[str, Any]:
        """
        Check all creators with auto-payout enabled and trigger payouts
        for those who have reached their threshold.
        """
        results = {
            "checked": 0,
            "triggered": 0,
            "failed": 0,
            "skipped": 0,
            "details": []
        }
        
        # Get all enabled auto-payout settings
        enabled_settings = await db.auto_payout_settings.find(
            {"status": AutoPayoutStatus.ENABLED.value},
            {"_id": 0}
        ).to_list(None)
        
        for settings in enabled_settings:
            results["checked"] += 1
            creator_id = settings["creator_id"]
            
            try:
                # Get creator's current balance
                creator = await db.creators.find_one(
                    {"id": creator_id},
                    {"_id": 0, "pending_payout": 1, "status": 1, "user_id": 1}
                )
                
                if not creator:
                    results["skipped"] += 1
                    results["details"].append({
                        "creator_id": creator_id,
                        "status": "skipped",
                        "reason": "Creator not found"
                    })
                    continue
                
                if creator.get("status") != "approved":
                    results["skipped"] += 1
                    results["details"].append({
                        "creator_id": creator_id,
                        "status": "skipped",
                        "reason": "Creator not approved"
                    })
                    continue
                
                balance = creator.get("pending_payout", 0)
                threshold = settings.get("threshold_coins", self.DEFAULT_THRESHOLD_COINS)
                
                # Check if threshold is reached
                if balance < threshold:
                    results["skipped"] += 1
                    results["details"].append({
                        "creator_id": creator_id,
                        "status": "skipped",
                        "reason": f"Balance ({balance}) below threshold ({threshold})"
                    })
                    continue
                
                # Validate payout details are configured
                payout_method = settings.get("payout_method")
                payout_details = settings.get("payout_details")
                country_code = settings.get("country_code")
                
                if not payout_method or not payout_details or not country_code:
                    results["skipped"] += 1
                    results["details"].append({
                        "creator_id": creator_id,
                        "status": "skipped",
                        "reason": "Payout details not configured"
                    })
                    continue
                
                # Trigger payout
                payout_result = await self._trigger_auto_payout(
                    creator_id=creator_id,
                    user_id=creator["user_id"],
                    coins=balance,
                    country_code=country_code,
                    method=PayoutMethod(payout_method),
                    recipient_details=payout_details
                )
                
                if payout_result["success"]:
                    results["triggered"] += 1
                    results["details"].append({
                        "creator_id": creator_id,
                        "status": "triggered",
                        "payout_id": payout_result["payout_id"],
                        "coins": balance
                    })
                    
                    # Update last auto-payout timestamp
                    await db.auto_payout_settings.update_one(
                        {"creator_id": creator_id},
                        {
                            "$set": {"last_auto_payout": datetime.now(timezone.utc).isoformat()},
                            "$inc": {"total_auto_payouts": 1}
                        }
                    )
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "creator_id": creator_id,
                        "status": "failed",
                        "error": payout_result.get("error")
                    })
            
            except Exception as e:
                results["failed"] += 1
                results["details"].append({
                    "creator_id": creator_id,
                    "status": "error",
                    "error": str(e)
                })
        
        return results
    
    async def _trigger_auto_payout(
        self,
        creator_id: str,
        user_id: str,
        coins: int,
        country_code: str,
        method: PayoutMethod,
        recipient_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Trigger an automatic payout for a creator"""
        import uuid
        
        try:
            # Create payout via payout service
            result = await payout_service.create_payout(
                creator_id=creator_id,
                coins=coins,
                country_code=country_code,
                method=method,
                recipient_details=recipient_details
            )
            
            # Generate payout ID
            payout_id = f"auto_payout_{uuid.uuid4().hex[:12]}"
            
            # Save payout record
            payout_record = {
                "id": payout_id,
                "creator_id": creator_id,
                "user_id": user_id,
                "coins": coins,
                "local_amount": result["local_amount"],
                "currency": result["currency"],
                "method": method.value,
                "provider": result["provider"],
                "recipient_details": recipient_details,
                "reference": result["reference"],
                "status": PayoutStatus.PROCESSING.value,
                "provider_response": result["result"],
                "auto_triggered": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": None
            }
            
            await db.payouts.insert_one(payout_record)
            
            # Deduct from creator's pending payout
            await db.creators.update_one(
                {"id": creator_id},
                {"$inc": {"pending_payout": -coins}}
            )
            
            # Send notification to creator
            from routes.notifications import create_notification, send_email_notification
            await create_notification(
                user_id=user_id,
                notification_type="payout_processed",
                title="Auto-Payout Triggered!",
                message=f"Your automatic payout of {coins} coins has been initiated.",
                action_url=f"/creator/payouts/{payout_id}",
                metadata={"payout_id": payout_id, "amount": coins}
            )
            
            await send_email_notification(
                user_id, "payout_processed",
                "Auto-Payout Triggered!",
                f"Your automatic payout of {coins} coins ({result['currency']} {result['local_amount']}) has been initiated. Expected completion: 2-5 minutes for mobile money, 24-48 hours for bank transfer.",
                {"payout_id": payout_id, "amount": coins, "local_amount": result['local_amount']}
            )
            
            return {
                "success": True,
                "payout_id": payout_id,
                "coins": coins,
                "local_amount": result["local_amount"],
                "currency": result["currency"]
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def start_background_checker(self):
        """Start the background task that checks for auto-payouts"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._background_check_loop())
        print(f"[AutoPayout] Background checker started (interval: {self.CHECK_INTERVAL_SECONDS}s)")
    
    async def stop_background_checker(self):
        """Stop the background checker"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("[AutoPayout] Background checker stopped")
    
    async def _background_check_loop(self):
        """Background loop that periodically checks for auto-payouts"""
        while self._running:
            try:
                print(f"[AutoPayout] Running auto-payout check at {datetime.now(timezone.utc).isoformat()}")
                results = await self.check_and_trigger_auto_payouts()
                print(f"[AutoPayout] Check complete: {results['checked']} checked, {results['triggered']} triggered, {results['failed']} failed")
            except Exception as e:
                print(f"[AutoPayout] Error in background check: {e}")
            
            # Wait for next check interval
            await asyncio.sleep(self.CHECK_INTERVAL_SECONDS)
    
    async def get_auto_payout_stats(self) -> Dict[str, Any]:
        """Get statistics about auto-payouts"""
        
        total_enabled = await db.auto_payout_settings.count_documents(
            {"status": AutoPayoutStatus.ENABLED.value}
        )
        
        total_disabled = await db.auto_payout_settings.count_documents(
            {"status": AutoPayoutStatus.DISABLED.value}
        )
        
        total_auto_payouts = await db.payouts.count_documents(
            {"auto_triggered": True}
        )
        
        # Get total value of auto-payouts
        pipeline = [
            {"$match": {"auto_triggered": True}},
            {"$group": {"_id": None, "total_coins": {"$sum": "$coins"}}}
        ]
        result = await db.payouts.aggregate(pipeline).to_list(1)
        total_coins_auto_paid = result[0]["total_coins"] if result else 0
        
        return {
            "creators_with_auto_payout_enabled": total_enabled,
            "creators_with_auto_payout_disabled": total_disabled,
            "total_auto_payouts_triggered": total_auto_payouts,
            "total_coins_auto_paid": total_coins_auto_paid,
            "background_checker_running": self._running,
            "check_interval_seconds": self.CHECK_INTERVAL_SECONDS
        }


# Service instance
payout_automation = PayoutAutomationService()
