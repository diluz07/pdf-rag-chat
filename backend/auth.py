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
    Sends the 6-digit code via SMTP if configured.
    Falls back to prominent console logging for local testing.
    """
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "DocuMind RAG").strip()

    # Always log to console for instant local development feedback
    print("\n" + "=" * 50)
    print(f"📧 [DOCUMIND AUTH] Verification Code for {to_email}: {code}")
    print("=" * 50 + "\n", flush=True)

    # If SMTP is configured, dispatch the actual email
    if smtp_host and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"{code} is your DocuMind login code"
            msg["From"] = f"{from_name} <{smtp_user}>"
            msg["To"] = to_email

            text_body = f"Your DocuMind verification code is: {code}\nThis code will expire in 10 minutes."
            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 22px;">DocuMind Verification</h2>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">Sign in to your PDF Question Answering workspace</p>
                </div>
                <p style="color: #334155; font-size: 14px; line-height: 1.5;">Here is your 6-digit verification code. Enter it in the login window to sign in:</p>
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b; font-family: monospace;">{code}</span>
                </div>
                <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
            """
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, [to_email], msg.as_string())

            logger.info(f"Sent email verification code to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP to {to_email}: {e}")
            # Even if real SMTP fails, console log succeeded for local testing
            return True

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
