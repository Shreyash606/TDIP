import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-faint bg-paper sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-[0.2em] text-ink uppercase">
            SDT
          </span>
          <span className="text-muted text-xs">/</span>
          <span className="text-xs text-muted tracking-widest uppercase">
            Pipeline
          </span>
        </div>

        {/* User */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted tracking-wide">
            {user?.full_name}
          </span>
          {user?.role && (
            <span className="text-xs tracking-widest uppercase border border-faint px-2 py-0.5 text-muted">
              {user.role === 'cpa' ? 'CPA' : 'Client'}
            </span>
          )}
          <button
            onClick={logout}
            className="text-xs text-muted tracking-widest uppercase hover:text-ink transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}
