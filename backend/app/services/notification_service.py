"""Build notification list for caregiver: alerts, upcoming appointments, medicine reminders (from current patient data)."""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.services.patient_service import get_supabase, list_patients_for_caregiver


def _serialize_dt(v) -> str:
    if v is None:
        return ""
    return v.isoformat() if hasattr(v, "isoformat") else str(v)


def list_notifications_for_caregiver(caregiver_id: str, patient_id: UUID | None = None) -> list[dict]:
    """
    Return notifications for the caregiver. If patient_id is set, only for that patient.
    Each item: id, type, title, message, patient_id, patient_name, link, read, created_at.
    """
    patients = list_patients_for_caregiver(caregiver_id)
    if not patients:
        return []
    patient_ids = [str(p.id) for p in patients]
    names_by_id = {str(p.id): p.full_name for p in patients}

    if patient_id:
        pid_str = str(patient_id)
        if pid_str not in patient_ids:
            return []
        patient_ids = [pid_str]
        names_by_id = {pid_str: next((p.full_name for p in patients if str(p.id) == pid_str), "Patient")}

    out: list[dict] = []
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    next_24h = now + timedelta(hours=24)

    # 1) Unresolved alerts (attention_required / teleconsult count as higher priority)
    alerts_res = (
        sb.table("alerts")
        .select("id, patient_id, level, title, message, created_at")
        .in_("patient_id", patient_ids)
        .is_("resolved_at", "null")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    for r in alerts_res.data or []:
        pid = str(r["patient_id"])
        level = r.get("level") or "informational"
        ntype = "emergency" if level == "teleconsult_recommended" else "stability_alert"
        out.append({
            "id": f"alert-{r['id']}",
            "type": ntype,
            "title": r.get("title") or "Alert",
            "message": r.get("message"),
            "patient_id": pid,
            "patient_name": names_by_id.get(pid),
            "link": f"/patients/{pid}",
            "read": False,
            "created_at": _serialize_dt(r.get("created_at")),
        })

    # 2) Upcoming appointments (scheduled, in next 24h)
    for pid in patient_ids:
        appt_res = (
            sb.table("appointments")
            .select("id, title, scheduled_at, location")
            .eq("patient_id", pid)
            .eq("status", "scheduled")
            .gte("scheduled_at", now.isoformat())
            .lte("scheduled_at", next_24h.isoformat())
            .order("scheduled_at")
            .limit(10)
            .execute()
        )
        for a in appt_res.data or []:
            at = a.get("scheduled_at")
            at_str = at[:16].replace("T", " ") if isinstance(at, str) and len(at) >= 16 else str(at)
            loc = a.get("location") or ""
            msg = f"{a.get('title')} — {at_str}"
            if loc:
                msg += f" ({loc})"
            out.append({
                "id": f"appt-{a['id']}",
                "type": "appointment_reminder",
                "title": "Appointment soon",
                "message": msg,
                "patient_id": pid,
                "patient_name": names_by_id.get(pid),
                "link": f"/patients/{pid}/appointments",
                "read": False,
                "created_at": _serialize_dt(a.get("scheduled_at")),
            })

    # 3) Medication reminder: patients with active medications (simple "check medications" for today)
    meds_res = (
        sb.table("medications")
        .select("patient_id")
        .eq("is_active", True)
        .in_("patient_id", patient_ids)
        .execute()
    )
    seen_med_patient = set()
    for m in meds_res.data or []:
        pid = m["patient_id"]
        if pid in seen_med_patient:
            continue
        seen_med_patient.add(pid)
        out.append({
            "id": f"med-reminder-{pid}",
            "type": "medicine_reminder",
            "title": "Medicine reminder",
            "message": f"Check today's medications for {names_by_id.get(pid, 'Patient')}",
            "patient_id": pid,
            "patient_name": names_by_id.get(pid),
            "link": f"/patients/{pid}/medications",
            "read": False,
            "created_at": now.isoformat(),
        })

    # Sort by created_at descending (newest first)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out[:50]
