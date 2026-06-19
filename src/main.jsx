import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ProtectedLayout from './components/ProtectedLayout.jsx'
import App from './App.jsx'
import AIPossible from './pages/AIPossible.jsx'
import AIExchange from './pages/AIExchange.jsx'
import SurveyDetail from './pages/SurveyDetail.jsx'
import SurveyViewDetails from './pages/SurveyViewDetails.jsx'
import CreateSurvey from './pages/CreateSurvey.jsx'
import LocalLoginPage from './pages/LocalLoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

/**
 * Renders AdminPage only for users with isAdmin=true.
 * ProtectedLayout above us already guarantees authentication,
 * so we only need to check the role here.
 */
function AdminRoute() {
  const { isAdmin, loading } = useAuth()
  if (loading) return null
  return isAdmin ? <AdminPage /> : <Navigate to="/" replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/login" element={<LocalLoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<App />} />
            <Route path="/ai-possible" element={<AIPossible />} />
            <Route path="/ai-exchange" element={<AIExchange />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/ai-exchange/survey/:id" element={<SurveyDetail />} />
            <Route path="/ai-exchange/survey/:id/details" element={<SurveyViewDetails />} />
            <Route path="/ai-exchange/create-survey" element={<CreateSurvey />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
