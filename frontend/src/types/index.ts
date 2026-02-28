export type StabilityLevel = 'informational' | 'attention_required' | 'teleconsult_recommended'
export type AlertLevel = StabilityLevel

export interface Patient {
  id: string
  full_name: string
  date_of_birth?: string
  address?: string
  home_latitude?: number
  home_longitude?: number
  geofence_radius_km?: number
  severity?: 'mild' | 'moderate' | 'severe'
  personal_history?: string
  diagnosis_type?: string
  diagnosis_date?: string
  diagnosing_physician?: string
  diagnosis_stage?: string
  diagnosis_symptoms?: string
  diagnosis_treatment_plan?: string
  mmse_score_at_diagnosis?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  primary_care_physician?: string
  baseline_start_date: string
  baseline_notes?: string
  notes?: string
  monitoring_paused: boolean
  created_at: string
}

export interface Alert {
  id: string
  patient_id: string
  level: AlertLevel
  title: string
  message?: string
  domain?: string
  acknowledged_at?: string
  resolved_at?: string
  created_at: string
}

export interface Stability {
  patient_id: string
  current_level: StabilityLevel
  domains: Record<string, { score?: number; trend?: string; contributes?: boolean; anomaly_count?: number; breach_count?: number }>
  last_calculated_at: string
}

export interface Medication {
  id: string
  patient_id: string
  name: string
  dosage?: string
  frequency: string
  times?: string[]
  notes?: string
  is_active: boolean
}

export interface Appointment {
  id: string
  patient_id: string
  title: string
  scheduled_at: string
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled'
  location?: string
  notes?: string
}

export interface CaregiverSurvey {
  id: string
  patient_id: string
  week_ending: string
  confusion_increased: boolean
  safety_concern_increased: boolean
  stress_level: number
  created_at: string
}

export interface KnownFace {
  id: string
  patient_id: string
  name: string
  relationship?: string
  created_at: string
}

export interface Caregiver {
  id: string
  full_name: string
  email?: string
}
