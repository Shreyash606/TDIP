import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from './Navbar'

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="text-xs tracking-widest text-muted uppercase mb-2">
            {isAdmin ? 'Admin Dashboard' : 'CPA Dashboard'}
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            {isAdmin ? 'Firm Overview' : 'What would you like to do?'}
          </h1>
          {isAdmin && (
            <p className="text-sm text-muted mt-2">
              Read-only view across all CPAs and client intakes.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!isAdmin && (
            <button
              onClick={() => navigate('/extraction')}
              className="group text-left border border-faint p-8 hover:border-ink transition-colors bg-paper"
            >
              <div className="text-xs tracking-widest text-muted uppercase mb-4">AI Extraction</div>
              <h2 className="text-lg font-semibold text-ink mb-3">W-2 Document Extraction</h2>
              <p className="text-sm text-muted leading-relaxed mb-6">
                Upload client W-2 PDFs. AI extracts every field automatically.
                Review, correct, and export to Drake Tax Software.
              </p>
              <div className="text-xs tracking-widest uppercase text-ink group-hover:tracking-[0.3em] transition-all">Open →</div>
            </button>
          )}

          <button
            onClick={() => navigate('/intake-dashboard')}
            className="group text-left border border-faint p-8 hover:border-ink transition-colors bg-paper"
          >
            <div className="text-xs tracking-widest text-muted uppercase mb-4">
              {isAdmin ? 'All Intakes' : 'Client Intake'}
            </div>
            <h2 className="text-lg font-semibold text-ink mb-3">
              {isAdmin ? 'Client Intake Submissions' : 'Client Intake Forms'}
            </h2>
            <p className="text-sm text-muted leading-relaxed mb-6">
              {isAdmin
                ? 'View all client intake forms across every CPA. See status, details, and documents.'
                : 'Create intake forms for clients. Fill in their tax info during the meeting and upload supporting documents.'}
            </p>
            <div className="text-xs tracking-widest uppercase text-ink group-hover:tracking-[0.3em] transition-all">Open →</div>
          </button>
        </div>
      </main>
    </div>
  )
}
