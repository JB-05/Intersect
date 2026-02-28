from fastapi import Request

from app.config import settings
from app.core.security import get_bearer_token, verify_supabase_token


async def get_current_caregiver_id(request: Request) -> str:
    """Extract and validate Supabase JWT, return caregiver (user) id."""
    token = get_bearer_token(request)
    if not token:
        from fastapi import HTTPException
        from fastapi import status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided. Sign in and include Authorization: Bearer <token>",
        )
    payload = verify_supabase_token(token)
    user_id = payload.get("sub")
    if not user_id:
        from fastapi import HTTPException
        from fastapi import status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    return user_id


def require_internal_api_key(request: Request) -> bool:
    """Validate internal API secret for /internal/* endpoints."""
    key = request.headers.get("X-API-Key") or request.headers.get("Authorization", "").replace("Internal ", "")
    if key != settings.internal_api_secret:
        from fastapi import HTTPException
        from fastapi import status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )
    return True
