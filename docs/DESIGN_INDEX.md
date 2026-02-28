# Design Index — Cognitive Stability Monitoring System

This folder contains the **design documents** for the product. Implementation should begin only after these are finalized and approved.

**Platform:** Supabase is used for demo ease (hosted Postgres, Auth, optional Realtime).

---

## Documents

| Document | Purpose |
|----------|---------|
| [API_DESIGN.md](./API_DESIGN.md) | REST API endpoints, request/response schemas, Supabase Auth |
| [DB_SCHEMA.md](./DB_SCHEMA.md) | Supabase (PostgreSQL) tables, RLS, pgvector |
| [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) | Project structure, Supabase integration, deployment |
| [FRONTEND_DESIGN.md](./FRONTEND_DESIGN.md) | Web UI layouts, screens, components, routing |

---

## Design Consistency Check

### API ↔ DB Mapping

| API Resource | Primary DB Table(s) |
|--------------|---------------------|
| `/auth/*` | caregivers, refresh_tokens |
| `/patients` | patients, patient_caregiver_map |
| `/patients/{id}/known-faces` | known_faces |
| `/patients/{id}/medications` | medications, medication_logs |
| `/patients/{id}/appointments` | appointments |
| `/patients/{id}/surveys` | caregiver_surveys |
| `/patients/{id}/camera-events` | camera_events |
| `/patients/{id}/location-history` | location_logs |
| `/patients/{id}/alerts` | alerts |
| `/patients/{id}/stability` | Derived from multiple tables |

### API ↔ Architecture Components

| API Area | Backend Module |
|----------|----------------|
| Auth | `api/v1/auth.py`, `services/auth_service.py`, `core/security.py` |
| Patients | `api/v1/patients.py`, `services/patient_service.py` |
| Stability | `api/v1/stability.py`, `services/stability_engine.py` |
| Internal | `api/v1/internal.py` (called by worker, device) |

---

## Finalization Checklist

Before implementation:

- [ ] **API Design**
  - [ ] All endpoints needed for caregiver web app covered
  - [ ] Pagination, filtering, error formats agreed
  - [ ] Internal API auth mechanism decided
  - [ ] Open questions resolved (see API_DESIGN.md §12)

- [ ] **DB Schema**
  - [ ] All PRD entities represented
  - [ ] pgvector vs BYTEA for face embeddings decided
  - [ ] Indexes sufficient for expected query patterns
  - [x] Schema managed via Supabase SQL Editor

- [ ] **Backend Architecture**
  - [ ] Project structure approved
  - [ ] Stability engine rules (baseline, thresholds) defined in detail
  - [ ] Face embedding model chosen
  - [ ] Camera worker tech choices (stream lib, face lib) confirmed

- [ ] **Cross-cutting**
  - [ ] Naming consistency (camelCase API vs snake_case DB)
  - [ ] UUID vs auto-increment IDs confirmed (UUID chosen)
  - [ ] Soft delete strategy for patients/caregivers confirmed

---

## Change Log

| Date | Document | Change |
|------|----------|--------|
| 2025-02-28 | All | Initial draft |
