# API Design — Cognitive Stability Monitoring System

**Version:** 0.1 (Draft)  
**Base URL:** `/api/v1`  
**Authentication:** Bearer JWT (Supabase-issued)

---

## 1. Authentication (Supabase Auth)

**Demo approach:** Auth is handled by **Supabase Auth** on the frontend. The API validates the Supabase JWT and does not implement its own signup/login.

| Method | Endpoint | Description |
|--------|----------|-------------|
| — | Frontend: `supabase.auth.signUp()` | Register new caregiver |
| — | Frontend: `supabase.auth.signInWithPassword()` | Login, returns Supabase session |
| — | Frontend: `supabase.auth.getSession()` / auto refresh | Token refresh handled by Supabase client |
| — | Frontend: `supabase.auth.signOut()` | Logout |

**Optional proxy endpoints** (if frontend cannot use Supabase client directly):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Proxy to Supabase Auth signUp; create `caregivers` profile |
| POST | `/auth/login` | Proxy to Supabase Auth signIn; return session |
| GET | `/auth/me` | Return current user + caregiver profile |

**API request:** All protected endpoints require `Authorization: Bearer <supabase_access_token>`.

---

## 2. Caregivers & Patients

### Caregivers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/caregivers/me` | Get current caregiver profile |
| PATCH | `/caregivers/me` | Update caregiver profile |

### Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients` | List patients for caregiver |
| POST | `/patients` | Create patient |
| GET | `/patients/{id}` | Get patient profile |
| PATCH | `/patients/{id}` | Update patient (primary caregiver only) |
| DELETE | `/patients/{id}` | Remove patient (soft delete) |
| GET | `/patients/{id}/stability` | Get stability dashboard data |

### Patient Profile Schema

```
POST /api/v1/patients
{
  "full_name": "John Doe",
  "date_of_birth": "1945-03-15",
  "home_latitude": 37.7749,
  "home_longitude": -122.4194,
  "baseline_start_date": "2025-01-01",
  "notes": "Optional notes"
}
```

---

## 3. Known Faces (Contacts)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/{id}/known-faces` | List known contacts/faces |
| POST | `/patients/{id}/known-faces` | Add known face (upload image, backend extracts embedding) |
| DELETE | `/patients/{id}/known-faces/{face_id}` | Remove known face |
| PATCH | `/patients/{id}/known-faces/{face_id}` | Update name/relationship |

### Add Known Face

```
POST /api/v1/patients/{id}/known-faces
Content-Type: multipart/form-data
- image: file (JPEG/PNG)
- name: string (e.g. "Dr. Smith")
- relationship: string (e.g. "Doctor", "Family")
```

---

## 4. Medications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/{id}/medications` | List medications |
| POST | `/patients/{id}/medications` | Add medication |
| PATCH | `/patients/{id}/medications/{med_id}` | Edit medication |
| DELETE | `/patients/{id}/medications/{med_id}` | Remove medication |
| GET | `/patients/{id}/medications/{med_id}/logs` | Get medication logs (pagination) |
| POST | `/patients/{id}/medications/{med_id}/logs` | Log taken/missed/delayed |
| GET | `/patients/{id}/medications/adherence` | Get 14-day rolling adherence summary |

### Medication Schema

```
POST /api/v1/patients/{id}/medications
{
  "name": "Donepezil",
  "dosage": "10mg",
  "frequency": "daily",  // daily, twice_daily, weekly, etc.
  "times": ["08:00", "20:00"],
  "notes": "Take with food"
}

POST /api/v1/patients/{id}/medications/{med_id}/logs
{
  "status": "taken" | "missed" | "delayed",
  "scheduled_at": "2025-02-28T08:00:00Z",
  "actual_at": "2025-02-28T08:15:00Z"  // optional, for taken/delayed
}
```

---

## 5. Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/{id}/appointments` | List appointments (filter by date range) |
| POST | `/patients/{id}/appointments` | Add appointment |
| PATCH | `/patients/{id}/appointments/{apt_id}` | Edit appointment |
| DELETE | `/patients/{id}/appointments/{apt_id}` | Cancel appointment |
| POST | `/patients/{id}/appointments/{apt_id}/status` | Mark completed/missed |

### Appointment Schema

```
POST /api/v1/patients/{id}/appointments
{
  "title": "Neurologist Visit",
  "scheduled_at": "2025-03-15T10:00:00Z",
  "location": "Clinic A",
  "notes": "Annual checkup"
}

POST /api/v1/patients/{id}/appointments/{apt_id}/status
{
  "status": "completed" | "missed" | "cancelled"
}
```

---

## 6. Caregiver Surveys (Weekly)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/{id}/surveys` | List surveys (recent) |
| POST | `/patients/{id}/surveys` | Submit weekly survey |
| GET | `/patients/{id}/surveys/trends` | Get stress/confusion trends |

### Survey Schema

```
POST /api/v1/patients/{id}/surveys
{
  "confusion_increased": true,
  "safety_concern_increased": false,
  "stress_level": 4,  // 1-5
  "week_ending": "2025-02-28"  // optional, defaults to current week
}
```

---

## 7. Camera Events (Internal + Caregiver View)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/{id}/camera-events` | List events (paginated, filtered by type/date) |
| POST | `/internal/camera-events` | **Internal only** — Camera worker posts events |
| POST | `/patients/{id}/monitoring/pause` | Pause monitoring (privacy) |
| POST | `/patients/{id}/monitoring/resume` | Resume monitoring |

### Event Types

- `recognized_person` — Known face seen
- `unknown_person` — Unknown face detected
- `inactivity` — Sustained minimal movement

### Camera Event Payload (Internal)

```
POST /internal/camera-events  (API key or internal auth)
{
  "patient_id": "uuid",
  "event_type": "unknown_person" | "recognized_person" | "inactivity",
  "detected_at": "2025-02-28T14:30:00Z",
  "confidence": 0.92,  // for recognized_person
  "known_face_id": "uuid",  // if recognized_person
  "duration_seconds": 300  // for inactivity
}
```

---

## 8. Location / Geofence

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/internal/location` | **Internal only** — Patient device submits GPS |
| GET | `/patients/{id}/location-history` | Get recent location logs (caregiver) |
| GET | `/patients/{id}/geofence-status` | Current distance from home, last breach |

### Location Payload (Internal)

```
POST /internal/location
{
  "patient_id": "uuid",
  "device_id": "string",
  "latitude": 37.77,
  "longitude": -122.42,
  "recorded_at": "2025-02-28T14:30:00Z"
}
```

---

## 9. Alerts & Stability

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/{id}/alerts` | List alerts (filter by level, resolved) |
| PATCH | `/patients/{id}/alerts/{alert_id}` | Mark alert acknowledged/resolved |
| GET | `/patients/{id}/stability` | Stability dashboard (deviation scores, trends) |
| GET | `/patients/{id}/teleconsult-summary` | Generate teleconsult recommendation summary |
| POST | `/patients/{id}/teleconsult-summary` | Generate & persist summary (for export/share) |

### Stability Response

```
GET /patients/{id}/stability
{
  "patient_id": "uuid",
  "current_level": "informational" | "attention_required" | "teleconsult_recommended",
  "domains": {
    "medication_adherence": { "score": 0.85, "trend": "declining", "contributes": true },
    "appointments": { "score": 0.9, "trend": "stable", "contributes": false },
    "caregiver_survey": { "score": 0.4, "trend": "declining", "contributes": true },
    "camera_events": { "anomaly_count": 12, "trend": "elevated", "contributes": true },
    "geofence": { "breach_count": 0, "contributes": false }
  },
  "last_calculated_at": "2025-02-28T15:00:00Z"
}
```

---

## 10. Patient–Caregiver Mapping (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/{id}/caregivers` | List caregivers for patient |
| POST | `/patients/{id}/caregivers` | Link caregiver to patient |
| DELETE | `/patients/{id}/caregivers/{cg_id}` | Unlink caregiver |
| PATCH | `/patients/{id}/caregivers/{cg_id}` | Set primary caregiver |

---

## 11. Common Patterns

### Pagination

```
?page=1&page_size=20
Response: { "items": [...], "total": 100, "page": 1, "page_size": 20 }
```

### Filtering (Events, Appointments)

```
?from=2025-02-01&to=2025-02-28
?event_type=unknown_person
```

### Error Response

```
{
  "detail": "Human-readable message",
  "code": "VALIDATION_ERROR",
  "errors": [{ "field": "email", "message": "Invalid format" }]
}
```

### HTTP Status Codes

- 200 OK, 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 422 Unprocessable Entity
- 500 Internal Server Error

---

## 12. Open Questions / TBD

- [ ] Rate limiting strategy
- [ ] WebSocket for real-time alert push (or polling only for MVP)
- [ ] Exact TTS trigger API (worker → backend or worker-local?)
- [ ] Device registration flow for patient GPS device
