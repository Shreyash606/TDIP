import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
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
          Sign In
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@sdt.com"
              className="field-input"
              required
              autoFocus
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field-input"
              required
            />
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
            {loading ? 'SIGNING IN...' : 'SIGN IN →'}
          </button>
        </form>
      </div>

      {/* Demo hint */}
      <div className="mt-6 text-xs text-muted tracking-wide text-center">
        demo: nick@sdt.com / password
      </div>
    </div>
  )
}
