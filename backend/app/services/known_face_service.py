from uuid import UUID

from app.config import settings
from app.schemas.known_face import KnownFaceCreate, KnownFaceResponse
from app.services.patient_service import get_supabase


KNOWN_FACES_BUCKET = "known-faces"


def list_known_faces(patient_id: UUID) -> list[KnownFaceResponse]:
    sb = get_supabase()
    res = sb.table("known_faces").select("id, patient_id, name, relationship, photo_url, created_at").eq("patient_id", str(patient_id)).order("created_at", desc=True).execute()
    out = []
    for r in res.data or []:
        created = r.get("created_at")
        if hasattr(created, "isoformat"):
            created = created.isoformat()
        out.append(KnownFaceResponse(
            id=r["id"], patient_id=r["patient_id"], name=r["name"],
            relationship=r.get("relationship"), photo_url=r.get("photo_url"),
            created_at=created or "",
        ))
    return out


def create_known_face(patient_id: UUID, data: KnownFaceCreate, photo_url: str | None = None) -> KnownFaceResponse:
    sb = get_supabase()
    name = (data.name or "").strip()
    if not name:
        raise ValueError("Name is required")
    payload = {
        "patient_id": str(patient_id),
        "name": name,
        "relationship": (data.relationship or "").strip() or None,
        "photo_url": photo_url,
    }
    res = sb.table("known_faces").insert(payload).execute()
    if not res.data:
        raise ValueError("Failed to create known face")
    row = res.data[0]
    created = row.get("created_at")
    if hasattr(created, "isoformat"):
        created = created.isoformat()
    return KnownFaceResponse(
        id=row["id"], patient_id=row["patient_id"], name=row["name"],
        relationship=row.get("relationship"), photo_url=row.get("photo_url"),
        created_at=created or "",
    )


def _upload_face_photo(patient_id: UUID, face_id: UUID, photo_bytes: bytes, content_type: str) -> str:
    """Upload photo to Supabase Storage known-faces bucket; return public URL."""
    sb = get_supabase()
    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    elif "webp" in content_type:
        ext = "webp"
    path = f"{patient_id}/{face_id}.{ext}"
    sb.storage.from_(KNOWN_FACES_BUCKET).upload(path, photo_bytes, {"content-type": content_type})
    base = (settings.supabase_url or "").rstrip("/")
    return f"{base}/storage/v1/object/public/{KNOWN_FACES_BUCKET}/{path}"


def create_known_face_with_photo(
    patient_id: UUID,
    name: str,
    relationship: str | None,
    photo_bytes: bytes,
    content_type: str,
    embedding: list[float] | None = None,
) -> KnownFaceResponse:
    """Create known face row then upload photo to Storage and set photo_url. Optionally store embedding for recognition."""
    data = KnownFaceCreate(name=name, relationship=relationship or None)
    face = create_known_face(patient_id, data)
    sb = get_supabase()
    try:
        photo_url = _upload_face_photo(patient_id, UUID(face.id), photo_bytes, content_type)
        payload = {"photo_url": photo_url}
        if embedding and len(embedding) == 128:
            payload["embedding"] = [round(x, 6) for x in embedding[:128]]
        sb.table("known_faces").update(payload).eq("id", face.id).execute()
        face = KnownFaceResponse(
            id=face.id, patient_id=face.patient_id, name=face.name,
            relationship=face.relationship, photo_url=photo_url, created_at=face.created_at,
        )
    except Exception:
        pass
    return face


def _l2_distance(a: list[float], b: list[float]) -> float:
    """Euclidean distance between two 128-d vectors."""
    if len(a) != 128 or len(b) != 128:
        return float("inf")
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


# Match threshold: below this L2 distance we consider it the same person (face-api.js / dlib use ~0.6).
RECOGNITION_THRESHOLD = 0.6


def recognize_face(patient_id: UUID, embedding: list[float]) -> dict | None:
    """Find the closest known face for this patient. Returns { name, relationship } or None."""
    if not embedding or len(embedding) != 128:
        return None
    sb = get_supabase()
    res = sb.table("known_faces").select("id, name, relationship, embedding").eq("patient_id", str(patient_id)).not_.is_("embedding", "null").execute()
    best = None
    best_dist = RECOGNITION_THRESHOLD
    for r in res.data or []:
        row_emb = r.get("embedding")
        if row_emb is None:
            continue
        if isinstance(row_emb, str):
            row_emb = [float(x.strip()) for x in row_emb.strip("[]").split(",") if x.strip()]
        if len(row_emb) != 128:
            continue
        d = _l2_distance(embedding, row_emb)
        if d < best_dist:
            best_dist = d
            best = {"name": r["name"], "relationship": r.get("relationship") or ""}
    return best


def delete_known_face(patient_id: UUID, face_id: UUID) -> bool:
    sb = get_supabase()
    res = sb.table("known_faces").delete().eq("id", str(face_id)).eq("patient_id", str(patient_id)).execute()
    return bool(res.data)
