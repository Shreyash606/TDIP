import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './components/Dashboard'
import Home from './components/Home'
import Login from './components/Login'
import Register from './components/Register'
import ReviewPanel from './components/ReviewPanel'
import IntakeDashboard from './components/IntakeDashboard'
import IntakeReviewPanel from './components/IntakeReviewPanel'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-muted text-sm tracking-widest">LOADING...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const loading = !user && localStorage.getItem('token')

  if (loading) return null

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/extraction" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/review/:id" element={<ProtectedRoute><ReviewPanel /></ProtectedRoute>} />
      <Route path="/intake-dashboard" element={<ProtectedRoute><IntakeDashboard /></ProtectedRoute>} />
      <Route path="/intake-dashboard/:id" element={<ProtectedRoute><IntakeReviewPanel /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
