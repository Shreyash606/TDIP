import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import Navbar from './Navbar'
import UploadModal from './UploadModal'

const STATUS_BADGE = {
  pending: 'badge-pending',
  processing: 'badge-processing',
  review: 'badge-review',
  approved: 'badge-approved',
  exported: 'badge-exported',
}

function ConfidencePill({ score }) {
  if (score == null) return <span className="text-muted text-xs">—</span>
  const pct = Math.round(score * 100)
  const color = pct >= 90 ? 'text-ink' : pct >= 75 ? 'text-muted' : 'text-red-500'
  return <span className={`text-xs font-medium ${color}`}>{pct}%</span>
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [extracting, setExtracting] = useState({})
  const [exporting, setExporting] = useState({})
  const [filter, setFilter] = useState('all')
  const pollRef = useRef(null)

  const fetchDocs = useCallback(async () => {
    try {
      const data = await api.getDocuments()
      setDocs(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll while any doc is "processing"
  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  useEffect(() => {
    const hasProcessing = docs.some((d) => d.status === 'processing')
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(fetchDocs, 3000)
    } else if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [docs, fetchDocs])

  const handleExtract = async (doc) => {
    setExtracting((p) => ({ ...p, [doc.id]: true }))
    try {
      await api.extractDocument(doc.id)
      fetchDocs()
    } catch (err) {
      alert(err.message)
    } finally {
      setExtracting((p) => ({ ...p, [doc.id]: false }))
    }
  }

  const handleExport = async (doc) => {
    setExporting((p) => ({ ...p, [doc.id]: true }))
    try {
      await api.exportDrake(doc.id, doc.client_name, doc.tax_year)
      fetchDocs()
    } catch (err) {
      alert(err.message)
    } finally {
      setExporting((p) => ({ ...p, [doc.id]: false }))
    }
  }

  const handleUploadSuccess = (newDocId) => {
    setShowUpload(false)
    fetchDocs()
  }

  const filtered = filter === 'all' ? docs : docs.filter((d) => d.status === filter)

  // Stats
  const counts = docs.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1
    return acc
  }, {})
  const clientCount = [...new Set(docs.map((d) => d.client_id))].length

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold tracking-[0.15em] uppercase text-ink">
              Documents
            </h1>
            <p className="text-xs text-muted mt-1 tracking-wide">
              Tax season 2024 — AI-powered W-2 extraction
            </p>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            + UPLOAD
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-px bg-faint border border-faint mb-8">
          {[
            { label: 'Clients', value: clientCount },
            { label: 'Documents', value: docs.length },
            { label: 'Pending', value: (counts.pending || 0) + (counts.processing || 0) },
            { label: 'For Review', value: counts.review || 0 },
            { label: 'Approved', value: (counts.approved || 0) + (counts.exported || 0) },
          ].map((s) => (
            <div key={s.label} className="bg-paper px-5 py-4">
              <div className="text-2xl font-light text-ink">{s.value}</div>
              <div className="text-xs text-muted tracking-widest uppercase mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0 mb-4 border-b border-faint">
          {['all', 'pending', 'processing', 'review', 'approved', 'exported'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs tracking-widest uppercase transition-colors border-b-2 -mb-px
                ${filter === f
                  ? 'border-ink text-ink font-medium'
                  : 'border-transparent text-muted hover:text-ink'}`}
            >
              {f}
              {f !== 'all' && counts[f] ? (
                <span className="ml-1.5 text-muted">{counts[f]}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-xs text-muted tracking-widest py-16 text-center uppercase">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-muted tracking-wide py-16 text-center">
            No documents found.{' '}
            <button onClick={() => setShowUpload(true)} className="underline hover:text-ink">
              Upload one →
            </button>
          </div>
        ) : (
          <div className="border border-faint">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-faint bg-gray-50">
                  {['Client', 'File', 'Type', 'Year', 'Size', 'Status', 'Confidence', 'Uploaded', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs tracking-widest uppercase text-muted font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) => (
                  <tr
                    key={doc.id}
                    className={`border-b border-faint last:border-0 hover:bg-gray-50 transition-colors
                      ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-4 py-3 text-xs font-medium text-ink">{doc.client_name}</td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[180px] truncate" title={doc.filename}>
                      {doc.filename}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted uppercase tracking-wider">
                      {doc.document_type}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{doc.tax_year || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted">{formatBytes(doc.file_size)}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_BADGE[doc.status] || 'badge-pending'}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ConfidencePill score={doc.confidence_score} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDate(doc.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 items-center">
                        {doc.status === 'pending' && (
                          <button
                            onClick={() => handleExtract(doc)}
                            disabled={extracting[doc.id]}
                            className="text-xs text-ink hover:underline disabled:opacity-40 tracking-wide uppercase"
                          >
                            {extracting[doc.id] ? 'Starting...' : 'Extract'}
                          </button>
                        )}
                        {doc.status === 'processing' && (
                          <span className="text-xs text-muted tracking-wide animate-pulse">Processing...</span>
                        )}
                        {(doc.status === 'review' || doc.status === 'approved') && (
                          <button
                            onClick={() => navigate(`/review/${doc.id}`)}
                            className="text-xs text-ink hover:underline tracking-wide uppercase"
                          >
                            Review
                          </button>
                        )}
                        {(doc.status === 'approved' || doc.status === 'review') && (
                          <button
                            onClick={() => handleExport(doc)}
                            disabled={exporting[doc.id]}
                            className="text-xs text-muted hover:text-ink hover:underline disabled:opacity-40 tracking-wide uppercase"
                          >
                            {exporting[doc.id] ? 'Exporting...' : 'Export'}
                          </button>
                        )}
                        {doc.status === 'exported' && (
                          <>
                            <button
                              onClick={() => navigate(`/review/${doc.id}`)}
                              className="text-xs text-muted hover:text-ink hover:underline tracking-wide uppercase"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleExport(doc)}
                              disabled={exporting[doc.id]}
                              className="text-xs text-muted hover:text-ink hover:underline disabled:opacity-40 tracking-wide uppercase"
                            >
                              {exporting[doc.id] ? '...' : 'Re-export'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  )
}
