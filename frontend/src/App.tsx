import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Layout } from '@/components/layout/Layout'
import { PatientLayout } from '@/components/layout/PatientLayout'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { Dashboard } from '@/pages/Dashboard'
import { PatientList } from '@/pages/PatientList'
import { PatientNew } from '@/pages/PatientNew'
import { Profile } from '@/pages/Profile'
import { PatientOverview } from '@/pages/patients/PatientOverview'
import { Medications } from '@/pages/patients/Medications'
import { Appointments } from '@/pages/patients/Appointments'
import { Surveys } from '@/pages/patients/Surveys'
import { KnownFaces } from '@/pages/patients/KnownFaces'
import { Events } from '@/pages/patients/Events'
import { Settings } from '@/pages/patients/Settings'
import { VoiceAssistant } from '@/pages/patients/VoiceAssistant'
import { FaceRecognition } from '@/pages/patients/FaceRecognition'
import { RestrictedAreas } from '@/pages/patients/RestrictedAreas'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients" element={<PatientList />} />
              <Route path="/patients/new" element={<PatientNew />} />
              <Route path="/patients/:id" element={<PatientLayout />}>
                <Route index element={<PatientOverview />} />
                <Route path="medications" element={<Medications />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="surveys" element={<Surveys />} />
                <Route path="contacts" element={<Navigate to="known-faces" replace />} />
                <Route path="known-faces" element={<KnownFaces />} />
                <Route path="events" element={<Events />} />
                <Route path="voice" element={<VoiceAssistant />} />
                <Route path="face-recognition" element={<FaceRecognition />} />
                <Route path="restricted-areas" element={<RestrictedAreas />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
