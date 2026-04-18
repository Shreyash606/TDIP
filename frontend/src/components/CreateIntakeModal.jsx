import { useEffect, useState } from 'react'
import { api } from '../services/api'

export default function CreateIntakeModal({ onClose, onCreated }) {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [taxYear, setTaxYear] = useState('2024')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  useEffect(() => {
    api.getClients()
      .then((list) => {
        setClients(list)
        if (list.length === 0) setShowNewClient(true)
      })
      .catch(() => setError('Failed to load clients'))
  }, [])

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return setError('Enter a client name')
    setCreatingClient(true)
    setError('')
    try {
      const client = await api.createClient({ name: newClientName.trim(), email: newClientEmail.trim() || undefined })
      setClients((prev) => [...prev, client])
      setClientId(String(client.id))
      setShowNewClient(false)
      setNewClientName('')
      setNewClientEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCreatingClient(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clientId) return setError('Select a client')
    setLoading(true)
    setError('')
    try {
      await api.createIntake(parseInt(clientId), taxYear)
      onCreated()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-paper border border-faint w-full max-w-sm p-8">
        <div className="text-xs tracking-widest text-muted uppercase mb-6">
          New Intake Form
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!showNewClient ? (
            <div className="field-group">
              <div className="flex items-center justify-between mb-1">
                <label className="field-label">Client</label>
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className="text-xs text-muted hover:text-ink underline"
                >
                  + New client
                </button>
              </div>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="field-input"
                required
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="border border-faint p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted tracking-widest uppercase">New Client</span>
                {clients.length > 0 && (
                  <button type="button" onClick={() => setShowNewClient(false)} className="text-xs text-muted hover:text-ink underline">
                    Cancel
                  </button>
                )}
              </div>
              <div className="field-group">
                <label className="field-label">Name</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="field-input"
                  placeholder="John Doe"
                />
              </div>
              <div className="field-group">
                <label className="field-label">Email (optional)</label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="field-input"
                  placeholder="john@email.com"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateClient}
                disabled={creatingClient}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {creatingClient ? 'Creating...' : 'Create Client →'}
              </button>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Tax Year</label>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="field-input"
            >
              {['2024', '2023', '2022', '2021'].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-xs text-red-600 border border-red-200 px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-xs tracking-widest uppercase border border-faint px-4 py-2.5 text-muted hover:text-ink hover:border-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !clientId}
              className="flex-1 btn-primary text-xs disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
