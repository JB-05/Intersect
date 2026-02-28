from fastapi import HTTPException, Request, status
from supabase import create_client

from app.config import settings


def verify_supabase_token(token: str) -> dict:
    """Validate token via Supabase Auth API - no manual JWT crypto needed."""
    try:
        sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
        res = sb.auth.get_user(token)
        if res is None or res.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return {"sub": str(res.user.id), "email": res.user.email}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from e


def get_bearer_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header."""
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth[7:].strip()
    return None
