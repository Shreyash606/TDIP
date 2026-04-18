import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import Navbar from './Navbar'
import CreateIntakeModal from './CreateIntakeModal'

const STATUS_LABEL = {
  in_progress: 'In Progress',
  complete: 'Complete',
  submitted: 'Client Submitted',
  under_review: 'Under Review',
  draft: 'Draft',
}

const STATUS_DOT = {
  in_progress: 'bg-blue-400',
  complete: 'bg-green-400',
  submitted: 'bg-purple-400',
  under_review: 'bg-yellow-400',
  draft: 'bg-gray-300',
}

export default function IntakeDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [intakes, setIntakes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    setLoading(true)
    api.listIntakes()
      .then(setIntakes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => navigate('/')}
              className="text-xs text-muted tracking-widest uppercase hover:text-ink transition-colors mb-2 block">
              ← Back
            </button>
            <div className="text-xs tracking-widest text-muted uppercase mb-1">
              {isAdmin ? 'Admin' : 'CPA'}
            </div>
            <h1 className="text-xl font-semibold text-ink">Client Intake Forms</h1>
          </div>
          {!isAdmin && (
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
              + New Intake
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-muted tracking-widest uppercase py-12 text-center">Loading...</div>
        ) : intakes.length === 0 ? (
          <div className="border border-faint p-12 text-center">
            <div className="text-sm text-muted mb-2">No intake forms yet.</div>
            {!isAdmin && <div className="text-xs text-muted">Click New Intake to create one for a client.</div>}
          </div>
        ) : (
          <div className="border border-faint divide-y divide-faint">
            <div className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} px-5 py-3 text-xs tracking-widest text-muted uppercase`}>
              <div className="col-span-2">Client</div>
              {isAdmin && <div>CPA</div>}
              <div>Tax Year</div>
              <div>Status</div>
            </div>
            {intakes.map((intake) => (
              <button
                key={intake.id}
                onClick={() => navigate(`/intake-dashboard/${intake.id}`)}
                className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} px-5 py-4 w-full text-left hover:bg-gray-50 transition-colors`}
              >
                <div className="col-span-2">
                  <div className="text-sm font-medium text-ink">{intake.client_name || 'Unknown Client'}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {intake.taxpayer_first_name
                      ? `${intake.taxpayer_first_name} ${intake.taxpayer_last_name || ''}`.trim()
                      : 'Not started'}
                  </div>
                </div>
                {isAdmin && (
                  <div className="text-xs text-muted self-center">{intake.cpa_name || '-'}</div>
                )}
                <div className="text-sm text-ink self-center">{intake.tax_year}</div>
                <div className="self-center">
                  <span className="flex items-center gap-2 text-xs text-ink">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[intake.status] || 'bg-gray-300'}`} />
                    {STATUS_LABEL[intake.status] || intake.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateIntakeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}
