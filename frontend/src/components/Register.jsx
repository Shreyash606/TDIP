import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('cpa')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 8) return setError('Password must be at least 8 characters')

    setLoading(true)
    try {
      await api.register(fullName, email, password, role)
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="text-2xl font-semibold tracking-[0.3em] text-ink uppercase mb-1">
          SDT
        </div>
        <div className="text-xs text-muted tracking-[0.25em] uppercase">
          Tax Document Intelligence
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm border border-faint p-8">
        <div className="text-xs tracking-widest text-muted uppercase mb-8">
          Create Account
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="field-group">
            <label className="field-label">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="field-input"
              required
              autoFocus
            />
          </div>

          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@sdt.com"
              className="field-input"
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="field-input"
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="field-input"
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Account Type</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="field-input">
              <option value="cpa">CPA / Tax Professional</option>
              <option value="admin">Firm Leadership (Admin)</option>
            </select>
          </div>

          {error && (
            <div className="text-xs text-red-600 tracking-wide border border-red-200 px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2 disabled:opacity-50"
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
          </button>
        </form>
      </div>

      {/* Link to login */}
      <div className="mt-6 text-xs text-muted tracking-wide text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-ink underline hover:no-underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}
