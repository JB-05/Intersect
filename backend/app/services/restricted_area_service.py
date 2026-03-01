from datetime import datetime, timezone
from uuid import UUID

from app.config import settings
from app.schemas.restricted_area import RestrictedAreaResponse
from app.services.patient_service import get_supabase

RESTRICTED_AREAS_BUCKET = "restricted-areas"


def _ensure_bucket(sb) -> None:
    try:
        sb.storage.create_bucket(RESTRICTED_AREAS_BUCKET, options={"public": True})
    except Exception as e:
        msg = str(e).lower()
        if "already exists" in msg or "duplicate" in msg or "409" in msg:
            return
        raise


def _serialize_dt(v) -> str:
    if v is None:
        return ""
    return v.isoformat() if hasattr(v, "isoformat") else str(v)


def list_restricted_areas(patient_id: UUID) -> list[RestrictedAreaResponse]:
    sb = get_supabase()
    res = (
        sb.table("patient_restricted_areas")
        .select("*")
        .eq("patient_id", str(patient_id))
        .order("created_at", desc=True)
        .execute()
    )
    out = []
    for r in res.data or []:
        out.append(
            RestrictedAreaResponse(
                id=r["id"],
                patient_id=r["patient_id"],
                name=r["name"],
                image_url=r.get("image_url"),
                camera_enabled=r.get("camera_enabled", True),
                audio_enabled=r.get("audio_enabled", True),
                created_at=_serialize_dt(r.get("created_at")),
                updated_at=_serialize_dt(r.get("updated_at")),
            )
        )
    return out


def create_restricted_area(patient_id: UUID, name: str, image_url: str | None = None) -> RestrictedAreaResponse:
    sb = get_supabase()
    name = (name or "").strip()
    if not name:
        raise ValueError("Name is required")
    payload = {
        "patient_id": str(patient_id),
        "name": name,
        "image_url": image_url,
        "camera_enabled": True,
        "audio_enabled": True,
    }
    res = sb.table("patient_restricted_areas").insert(payload).execute()
    if not res.data:
        raise ValueError("Failed to create restricted area")
    row = res.data[0]
    return RestrictedAreaResponse(
        id=row["id"],
        patient_id=row["patient_id"],
        name=row["name"],
        image_url=row.get("image_url"),
        camera_enabled=row.get("camera_enabled", True),
        audio_enabled=row.get("audio_enabled", True),
        created_at=_serialize_dt(row.get("created_at")),
        updated_at=_serialize_dt(row.get("updated_at")),
    )


def _upload_image(patient_id: UUID, area_id: UUID, image_bytes: bytes, content_type: str) -> str:
    sb = get_supabase()
    _ensure_bucket(sb)
    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    elif "webp" in content_type:
        ext = "webp"
    path = f"{patient_id}/{area_id}.{ext}"
    sb.storage.from_(RESTRICTED_AREAS_BUCKET).upload(path, image_bytes, {"content-type": content_type})
    base = (settings.supabase_url or "").rstrip("/")
    return f"{base}/storage/v1/object/public/{RESTRICTED_AREAS_BUCKET}/{path}"


def create_restricted_area_with_image(
    patient_id: UUID, name: str, image_bytes: bytes, content_type: str
) -> RestrictedAreaResponse:
    area = create_restricted_area(patient_id, name)
    try:
        photo_url = _upload_image(patient_id, UUID(area.id), image_bytes, content_type)
        sb = get_supabase()
        sb.table("patient_restricted_areas").update({
            "image_url": photo_url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", area.id).execute()
        return RestrictedAreaResponse(
            id=area.id,
            patient_id=area.patient_id,
            name=area.name,
            image_url=photo_url,
            camera_enabled=area.camera_enabled,
            audio_enabled=area.audio_enabled,
            created_at=area.created_at,
            updated_at=area.updated_at,
        )
    except Exception:
        return area


def update_restricted_area(
    patient_id: UUID,
    area_id: UUID,
    *,
    name: str | None = None,
    camera_enabled: bool | None = None,
    audio_enabled: bool | None = None,
    image_url: str | None = None,
) -> RestrictedAreaResponse | None:
    sb = get_supabase()
    payload = {}
    if name is not None:
        payload["name"] = (name or "").strip() or None
    if camera_enabled is not None:
        payload["camera_enabled"] = camera_enabled
    if audio_enabled is not None:
        payload["audio_enabled"] = audio_enabled
    if image_url is not None:
        payload["image_url"] = image_url
    if payload:
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    if not payload:
        row = (
            sb.table("patient_restricted_areas")
            .select("*")
            .eq("id", str(area_id))
            .eq("patient_id", str(patient_id))
            .execute()
        )
        if not row.data:
            return None
        r = row.data[0]
        return RestrictedAreaResponse(
            id=r["id"],
            patient_id=r["patient_id"],
            name=r["name"],
            image_url=r.get("image_url"),
            camera_enabled=r.get("camera_enabled", True),
            audio_enabled=r.get("audio_enabled", True),
            created_at=_serialize_dt(r.get("created_at")),
            updated_at=_serialize_dt(r.get("updated_at")),
        )
    res = (
        sb.table("patient_restricted_areas")
        .update(payload)
        .eq("id", str(area_id))
        .eq("patient_id", str(patient_id))
        .execute()
    )
    if not res.data:
        return None
    r = res.data[0]
    return RestrictedAreaResponse(
        id=r["id"],
        patient_id=r["patient_id"],
        name=r["name"],
        image_url=r.get("image_url"),
        camera_enabled=r.get("camera_enabled", True),
        audio_enabled=r.get("audio_enabled", True),
        created_at=_serialize_dt(r.get("created_at")),
        updated_at=_serialize_dt(r.get("updated_at")),
    )


def delete_restricted_area(patient_id: UUID, area_id: UUID) -> bool:
    sb = get_supabase()
    res = (
        sb.table("patient_restricted_areas")
        .delete()
        .eq("id", str(area_id))
        .eq("patient_id", str(patient_id))
        .execute()
    )
    return bool(res.data)
