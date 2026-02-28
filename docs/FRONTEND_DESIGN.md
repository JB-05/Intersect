# Frontend Design — Cognitive Stability Monitoring System

**Version:** 0.1 (Draft)  
**Stack:** Vite, React 18, TypeScript, Supabase Auth, React Router

---

## 1. Design Principles

- **Calm, trustworthy** — Caregivers are under stress; reduce cognitive load
- **Clear hierarchy** — Stability level and alerts visible at a glance
- **Accessible** — WCAG 2.1 AA target; large touch targets, readable contrast
- **Mobile-first** — Caregivers often check on the go

---

## 2. Information Architecture

```
/                     → Landing / login
/login                → Sign in
/signup               → Register caregiver
/dashboard            → Patient list, quick alerts (redirect if unauthenticated)
/patients              → Patient list
/patients/:id          → Patient overview (stability, alerts)
/patients/:id/medications
/patients/:id/appointments
/patients/:id/surveys
/patients/:id/contacts → Known faces
/patients/:id/events   → Camera & location events
/patients/:id/settings
/profile               → Caregiver profile
```

---

## 3. Page Layouts

### 3.1 App Shell

- **Header:** Logo, nav (Dashboard, Patients), user menu (profile, logout)
- **Sidebar** (desktop): Patient list or nav tree
- **Main:** Page content
- **Alert banner** (global): Unacknowledged Level 2/3 alerts

### 3.2 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | &lt; 640px | Full-width, drawer nav |
| Tablet | 640–1024px | Collapsible sidebar |
| Desktop | &gt; 1024px | Fixed sidebar |

---

## 4. Screen Designs

### 4.1 Login / Signup

- **Login:** Email, password, "Forgot password", link to signup
- **Signup:** Email, password, full name; optional "I'm a caregiver" copy
- **Layout:** Centered card on neutral background; minimal distractions
- **Auth:** Supabase `signInWithPassword` / `signUp`; redirect to `/dashboard`

### 4.2 Dashboard

- **Patient cards** (list or grid): Name, photo/avatar, stability badge (green / yellow / red)
- **Recent alerts** (top 5): Level, title, patient, time; link to patient detail
- **Quick actions:** "Add patient", "Submit weekly survey" (if due)
- **Summary stats:** Total patients, unacknowledged alerts, adherence this week

### 4.3 Patient Overview (`/patients/:id`)

- **Header:** Patient name, stability level badge, "Pause monitoring" toggle
- **Stability card:** Current level, domain breakdown (meds, appointments, survey, camera, geofence)
- **Alerts:** List of recent alerts with acknowledge/resolve
- **Quick links:** Medications, Appointments, Survey, Events, Contacts, Settings

### 4.4 Medications (`/patients/:id/medications`)

- **List:** Medication name, dosage, frequency, next due, 14-day adherence %
- **Actions:** Add, edit, delete; log taken/missed/delayed
- **Add modal:** Name, dosage, frequency (select), times (multi-time picker), notes

### 4.5 Appointments (`/patients/:id/appointments`)

- **List:** Title, date/time, location, status (scheduled/completed/missed/cancelled)
- **Calendar view** (optional)
- **Add/edit:** Title, datetime, location, notes
- **Status:** Mark completed, missed, cancelled

### 4.6 Weekly Survey (`/patients/:id/surveys`)

- **Form:** Confusion increased? (Yes/No), Safety concern increased? (Yes/No), Stress level (1–5 scale with labels)
- **Week selector:** Default current week; show if already submitted
- **History:** List of past surveys with trends

### 4.7 Known Contacts / Faces (`/patients/:id/contacts`)

- **List:** Name, relationship, thumbnail (if stored), actions (edit, delete)
- **Add:** Upload image (camera or file), name, relationship

### 4.8 Events (`/patients/:id/events`)

- **Tabs or filters:** Camera events (recognized/unknown/inactivity), Location
- **Timeline:** Date, event type, details (confidence, duration, distance)
- **Map** (optional): Last known location, home marker

### 4.9 Patient Settings (`/patients/:id/settings`)

- **Profile:** Name, DOB, notes
- **Home location:** Lat/long or map picker, geofence radius
- **Monitoring config:** Stream URL, inactivity threshold, TTS toggle
- **Baseline:** Baseline start date
- **Danger zone:** Remove patient (soft delete)

### 4.10 Profile (`/profile`)

- **Editable:** Full name
- **Read-only:** Email (from Supabase Auth)

### 4.11 Teleconsult Summary

- **Modal or page:** Generated summary text, domains snapshot
- **Actions:** Copy, download PDF (future), share

---

## 5. Component Library

### 5.1 Suggested Stack

- **UI primitives:** Tailwind CSS or similar
- **Components:** Shadcn/UI, Radix, or custom
- **Forms:** React Hook Form + Zod
- **Data fetching:** TanStack Query (React Query)
- **State:** React Context for auth; optional Zustand for UI state

### 5.2 Core Components

| Component | Purpose |
|-----------|---------|
| `Layout` | App shell, sidebar, header |
| `AuthGuard` | Redirect unauthenticated users |
| `PatientGuard` | Check caregiver has access to patient |
| `StabilityBadge` | Color-coded level indicator |
| `AlertCard` | Alert with level, title, time, actions |
| `DataTable` | Sortable, paginated tables |
| `Modal` | Add/edit forms |
| `ConfirmDialog` | Delete, destructive actions |

---

## 6. Color & Typography

### 6.1 Stability Levels

| Level | Color | Usage |
|-------|-------|-------|
| Stable / Informational | Green (#22c55e) | Good state |
| Attention Required | Amber (#f59e0b) | Level 2 |
| Teleconsult Recommended | Red (#ef4444) | Level 3 |

### 6.2 Typography

- **Headings:** Sans-serif, medium weight
- **Body:** 16px base, 1.5 line-height
- **Labels:** 14px, subtle color
- **Monospace:** For IDs, timestamps when needed

---

## 7. API Integration

- **Base URL:** `import.meta.env.VITE_API_URL` (e.g. `http://localhost:8000`)
- **Auth header:** `Authorization: Bearer ${supabase.session.access_token}` on each request
- **Error handling:** 401 → redirect to login; 403 → show "Access denied"; 4xx/5xx → toast or inline message
- **TanStack Query:** Cache patients, medications, etc.; invalidate on mutation

---

## 8. Routing & Guards

```tsx
// Protected routes
<Route element={<AuthGuard />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/patients" element={<PatientList />} />
  <Route path="/patients/:id/*" element={<PatientGuard><PatientLayout /></PatientGuard>} />
  <Route path="/profile" element={<Profile />} />
</Route>

// Public
<Route path="/" element={<Landing />} />
<Route path="/login" element={<Login />} />
<Route path="/signup" element={<Signup />} />
```

---

## 9. File Structure

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── ui/           # Button, Input, Modal, etc.
│   ├── auth/
│   │   ├── AuthGuard.tsx
│   │   └── LoginForm.tsx
│   ├── patients/
│   │   ├── PatientCard.tsx
│   │   ├── StabilityBadge.tsx
│   │   └── AlertCard.tsx
│   └── ...
├── pages/
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Dashboard.tsx
│   ├── PatientList.tsx
│   └── patients/
│       ├── PatientOverview.tsx
│       ├── Medications.tsx
│       ├── Appointments.tsx
│       ├── Surveys.tsx
│       ├── Contacts.tsx
│       ├── Events.tsx
│       └── Settings.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── usePatient.ts
│   └── useApi.ts
├── lib/
│   ├── supabase.ts
│   └── api.ts
├── types/
│   └── index.ts
└── App.tsx
```

---

## 10. Open Questions

- [ ] Dark mode support?
- [ ] i18n for multiple languages?
- [ ] Push notifications (PWA)?
- [ ] Offline support for survey draft?
