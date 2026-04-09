import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

export default function UploadModal({ onClose, onSuccess }) {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [docType, setDocType] = useState('w2')
  const [taxYear, setTaxYear] = useState('2024')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {})
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type === 'application/pdf') setFile(f)
    else setError('Only PDF files are supported')
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!file) return setError('Please select a PDF file')

    let selectedClientId = clientId

    if (showNewClient) {
      if (!newClientName.trim()) return setError('Enter a client name')
      try {
        const created = await api.createClient({ name: newClientName.trim() })
        selectedClientId = created.id
      } catch (err) {
        return setError('Failed to create client: ' + err.message)
      }
    }

    if (!selectedClientId) return setError('Please select a client')

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('client_id', selectedClientId)
      formData.append('document_type', docType)
      formData.append('tax_year', taxYear)
      const result = await api.uploadDocument(formData)
      onSuccess(result.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-paper border border-faint w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-faint">
          <span className="text-xs tracking-widest uppercase text-ink">Upload Document</span>
          <button onClick={onClose} className="text-muted hover:text-ink text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-5">
          {/* Client */}
          <div className="field-group">
            <label className="field-label">Client</label>
            {!showNewClient ? (
              <div className="flex gap-2 items-center">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="field-input flex-1"
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className="text-xs text-muted hover:text-ink tracking-wide whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client full name"
                  className="field-input flex-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewClient(false)}
                  className="text-xs text-muted hover:text-ink tracking-wide"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Doc type + Tax year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="field-group">
              <label className="field-label">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="field-input"
              >
                <option value="w2">W-2</option>
                <option value="1099">1099</option>
                <option value="k1">K-1</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Tax Year</label>
              <select
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                className="field-input"
              >
                {[2024, 2023, 2022, 2021].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            className={`border border-dashed cursor-pointer transition-colors py-10 flex flex-col items-center gap-2
              ${dragging ? 'border-ink bg-gray-50' : 'border-faint hover:border-ink'}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <>
                <div className="text-sm text-ink">{file.name}</div>
                <div className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB — click to change</div>
              </>
            ) : (
              <>
                <div className="text-2xl text-muted">↑</div>
                <div className="text-xs text-muted tracking-wide">Drop PDF here or click to browse</div>
              </>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 border border-red-200 px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="btn-primary disabled:opacity-50">
              {uploading ? 'UPLOADING...' : 'UPLOAD →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
