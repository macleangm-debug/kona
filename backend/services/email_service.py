"""
Email Service using Resend for transactional emails
Handles: Verification emails, password reset, notifications
"""
import os
import asyncio
import logging
import resend
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
APP_NAME = "Kona"
APP_URL = os.environ.get("APP_FRONTEND_URL", "https://streamkona.com")


def generate_verification_token() -> str:
    """Generate a secure 6-digit verification code"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def generate_secure_token() -> str:
    """Generate a secure token for email links"""
    return secrets.token_urlsafe(32)


async def send_email(to: str, subject: str, html_content: str) -> dict:
    """
    Send an email using Resend API (non-blocking)
    """
    if not resend.api_key:
        logger.error("RESEND_API_KEY not configured")
        return {"success": False, "error": "Email service not configured"}
    
    params = {
        "from": f"{APP_NAME} <{SENDER_EMAIL}>",
        "to": [to],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent successfully to {to}")
        return {"success": True, "email_id": email.get("id")}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send email to {to}: {error_msg}")
        
        # Check for Resend test mode restriction
        if "only send testing emails to your own email" in error_msg:
            return {
                "success": False, 
                "error": "Email service in test mode. Please verify your domain at resend.com/domains for production use.",
                "test_mode": True
            }
        
        return {"success": False, "error": error_msg}


async def send_verification_email(to: str, code: str, name: str = "there") -> dict:
    """Send email verification code"""
    subject = f"Verify your email - {APP_NAME}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
                                <h1 style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: bold;">KONA</h1>
                                <p style="margin: 8px 0 0; color: #a0a0a0; font-size: 14px;">African Stories, Globally Told</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 22px;">Hi {name}!</h2>
                                <p style="margin: 0 0 24px; color: #d0d0d0; font-size: 16px; line-height: 1.6;">
                                    Please use the code below to verify your email address:
                                </p>
                                
                                <!-- Verification Code Box -->
                                <div style="background: rgba(139, 92, 246, 0.1); border: 2px solid #8b5cf6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                                    <span style="font-size: 36px; font-weight: bold; color: #8b5cf6; letter-spacing: 8px; font-family: monospace;">{code}</span>
                                </div>
                                
                                <p style="margin: 24px 0 0; color: #a0a0a0; font-size: 14px;">
                                    This code expires in <strong style="color: #ffffff;">15 minutes</strong>.
                                </p>
                                <p style="margin: 12px 0 0; color: #a0a0a0; font-size: 14px;">
                                    Verify your email to unlock all features and earn <strong style="color: #fbbf24;">5 bonus coins!</strong>
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 40px; background: rgba(0,0,0,0.3); text-align: center;">
                                <p style="margin: 0; color: #666; font-size: 12px;">
                                    If you didn't request this code, please ignore this email.
                                </p>
                                <p style="margin: 8px 0 0; color: #666; font-size: 12px;">
                                    &copy; 2026 Kona. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return await send_email(to, subject, html_content)


async def send_password_reset_email(to: str, reset_token: str, name: str = "there") -> dict:
    """Send password reset email with secure link"""
    subject = f"Reset your password - {APP_NAME}"
    reset_link = f"{APP_URL}/reset-password?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
                                <h1 style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: bold;">KONA</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 22px;">Reset Your Password</h2>
                                <p style="margin: 0 0 24px; color: #d0d0d0; font-size: 16px; line-height: 1.6;">
                                    Hi {name}, we received a request to reset your password. Click the button below to create a new password:
                                </p>
                                
                                <!-- Reset Button -->
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="{reset_link}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                        Reset Password
                                    </a>
                                </div>
                                
                                <p style="margin: 24px 0 0; color: #a0a0a0; font-size: 14px;">
                                    This link expires in <strong style="color: #ffffff;">1 hour</strong>.
                                </p>
                                <p style="margin: 16px 0 0; color: #666; font-size: 12px; word-break: break-all;">
                                    Or copy this link: {reset_link}
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 40px; background: rgba(0,0,0,0.3); text-align: center;">
                                <p style="margin: 0; color: #666; font-size: 12px;">
                                    If you didn't request this, please ignore this email. Your password won't change.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return await send_email(to, subject, html_content)


async def send_welcome_email(to: str, name: str = "there") -> dict:
    """Send welcome email after successful verification"""
    subject = f"Welcome to {APP_NAME}! Your account is verified"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
                                <h1 style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: bold;">KONA</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px; text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                                <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 24px;">Welcome to Kona, {name}!</h2>
                                <p style="margin: 0 0 24px; color: #d0d0d0; font-size: 16px; line-height: 1.6;">
                                    Your account is now fully verified. You've earned <strong style="color: #fbbf24;">5 bonus coins</strong> as a thank you!
                                </p>
                                
                                <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
                                    <p style="margin: 0; color: #22c55e; font-size: 14px;">
                                        ✓ Full access to all content<br>
                                        ✓ Claim referral rewards<br>
                                        ✓ Request payouts<br>
                                        ✓ Secure your account
                                    </p>
                                </div>
                                
                                <a href="{APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 16px;">
                                    Start Watching
                                </a>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 40px; background: rgba(0,0,0,0.3); text-align: center;">
                                <p style="margin: 0; color: #666; font-size: 12px;">
                                    &copy; 2026 Kona. African Stories, Globally Told.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return await send_email(to, subject, html_content)


async def send_campaign_alert_email(to: str, company_name: str, alert_message: str) -> dict:
    """Send campaign performance alert to advertiser"""
    subject = f"Campaign Alert - {APP_NAME} Business"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
                                <h1 style="margin: 0; color: #8b5cf6; font-size: 24px;">KONA Business</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">Hi {company_name}!</h2>
                                <div style="background: rgba(139, 92, 246, 0.1); border-left: 4px solid #8b5cf6; padding: 16px; margin: 20px 0;">
                                    <p style="margin: 0; color: #d0d0d0; font-size: 16px;">{alert_message}</p>
                                </div>
                                <a href="{APP_URL}/business/dashboard" style="display: inline-block; background: #8b5cf6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 16px;">
                                    View Dashboard
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return await send_email(to, subject, html_content)


async def send_payout_notification_email(to: str, creator_name: str, amount: float, status: str) -> dict:
    """Send payout status notification to creator"""
    subject = f"Payout {status.title()} - {APP_NAME}"
    
    status_color = "#22c55e" if status == "completed" else "#f59e0b" if status == "processing" else "#ef4444"
    status_icon = "✓" if status == "completed" else "⏳" if status == "processing" else "✗"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
                                <h1 style="margin: 0; color: #8b5cf6; font-size: 24px;">KONA Creators</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px; text-align: center;">
                                <div style="font-size: 48px; color: {status_color}; margin-bottom: 16px;">{status_icon}</div>
                                <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 22px;">Payout {status.title()}</h2>
                                <p style="margin: 0 0 24px; color: #d0d0d0; font-size: 16px;">
                                    Hi {creator_name}, your payout of <strong style="color: #fbbf24;">${amount:.2f}</strong> has been {status}.
                                </p>
                                <a href="{APP_URL}/creator/dashboard" style="display: inline-block; background: #8b5cf6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                                    View Details
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return await send_email(to, subject, html_content)
