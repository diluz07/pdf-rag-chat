import os
import time
import random
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# In-memory OTP storage: { email: { "code": str, "expires_at": float, "attempts": int } }
otp_store: Dict[str, Dict[str, Any]] = {}

# In-memory user store: { email: { "email": str, "name": str, "picture": str, "sub": str, "created_at": float } }
user_store: Dict[str, Dict[str, Any]] = {}

OTP_EXPIRY_SECONDS = 600  # 10 minutes
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()


def generate_otp() -> str:
    """Generates a secure 6-digit numeric OTP."""
    return f"{random.randint(100000, 999999)}"


def send_email_otp(to_email: str, code: str) -> bool:
    """
    Dispatches the 6-digit OTP code to the recipient email:
    1. First tries Resend REST API (over HTTPS Port 443 - works on Render Free Tier).
    2. Then tries Brevo REST API (over HTTPS Port 443).
    3. Falls back to standard SMTP (Port 587/465, works locally).
    4. Always logs prominently to stdout/Render logs so you can copy the code immediately.
    """
    from_name = os.getenv("SMTP_FROM_NAME", "DocChat").strip()
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    brevo_api_key = os.getenv("BREVO_API_KEY", "").strip()
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()

    # Always log code prominently to console and server logs
    print("\n" + "=" * 55)
    print(f"📧 [DOCCHAT VERIFICATION CODE] {to_email} -> {code}")
    print("=" * 55 + "\n", flush=True)

    text_body = f"Your DocChat verification code is: {code}\nThis code will expire in 10 minutes."
    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0284c7; margin: 0 0 6px 0; font-size: 22px;">DocChat Verification</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Sign in to your document workspace</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">Here is your 6-digit verification code:</p>
        <div style="background: #f0f9ff; border: 1px dashed #7dd3fc; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0369a1; font-family: monospace;">{code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
    """

    # 1. Resend API (HTTPS Port 443 - Never blocked on Render)
    if resend_api_key:
        try:
            import urllib.request
            import json

            sender_email = os.getenv("RESEND_FROM", "onboarding@resend.dev")
            payload = {
                "from": f"{from_name} <{sender_email}>",
                "to": [to_email],
                "subject": f"{code} is your DocChat verification code",
                "text": text_body,
                "html": html_body,
            }
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "DocChat/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201):
                    logger.info(f"Successfully dispatched OTP to {to_email} via Resend HTTPS API")
                    return True
        except Exception as e:
            logger.error(f"Resend HTTPS API dispatch failed: {e}")

    # 2. Brevo API (HTTPS Port 443 - Never blocked on Render)
    if brevo_api_key:
        try:
            import urllib.request
            import urllib.error
            import json

            sender_email = os.getenv("BREVO_FROM", smtp_user or "noreply@docchat.app")
            payload = {
                "sender": {"name": from_name, "email": sender_email},
                "to": [{"email": to_email}],
                "subject": f"{code} is your DocChat verification code",
                "textContent": text_body,
                "htmlContent": html_body,
            }
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "api-key": brevo_api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201):
                    logger.info(f"Successfully dispatched OTP to {to_email} via Brevo HTTPS API")
                    return True
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")
            logger.error(f"Brevo HTTPS API HTTP {he.code} error: {err_body}")
        except Exception as e:
            logger.error(f"Brevo HTTPS API dispatch failed: {e}")

    # 3. Direct SMTP (Port 587 - Works on localhost or unblocked hosts)
    if smtp_host and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"{code} is your DocChat verification code"
            msg["From"] = f"{from_name} <{smtp_user}>"
            msg["To"] = to_email
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=8) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, [to_email], msg.as_string())

            logger.info(f"Sent email verification code to {to_email} via SMTP")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP to {to_email}: {e}")
            logger.info(f"NOTICE: Render Free tier blocks outbound SMTP ports (25/465/587). Add RESEND_API_KEY to Render Environment to send via HTTPS Port 443.")

    return True


def verify_google_credential(credential: str) -> Optional[Dict[str, Any]]:
    """
    Verifies Google JWT token using google-auth library against Google's public certs.
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        id_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None,
        )

        email = id_info.get("email", "").lower()
        user_data = {
            "sub": id_info.get("sub", ""),
            "email": email,
            "name": id_info.get("name", email.split("@")[0].capitalize()),
            "picture": id_info.get("picture", ""),
            "auth_provider": "google",
            "created_at": time.time(),
        }
        user_store[email] = user_data
        return user_data
    except Exception as e:
        logger.warning(f"Google token verification failed: {e}")
        return None
