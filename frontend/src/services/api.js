const BASE = 'http://localhost:5001/api'

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
})

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res
}

export const api = {
  // Auth
  login: async (email, password) => {
    const body = new URLSearchParams({ username: email, password })
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) throw new Error('Incorrect email or password')
    return res.json()
  },

  getMe: async () => {
    const res = await request('/auth/me', { headers: headers() })
    return res.json()
  },

  // Clients
  getClients: async () => {
    const res = await request('/clients', { headers: headers() })
    return res.json()
  },

  createClient: async (data) => {
    const res = await request('/clients', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    })
    return res.json()
  },

  // Documents
  getDocuments: async () => {
    const res = await request('/documents', { headers: headers() })
    return res.json()
  },

  getDocument: async (id) => {
    const res = await request(`/documents/${id}`, { headers: headers() })
    return res.json()
  },

  uploadDocument: async (formData) => {
    const res = await fetch(`${BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },

  extractDocument: async (id) => {
    const res = await request(`/documents/${id}/extract`, {
      method: 'POST',
      headers: headers(),
    })
    return res.json()
  },

  updateDocument: async (id, extracted_data) => {
    const res = await request(`/documents/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ extracted_data }),
    })
    return res.json()
  },

  approveDocument: async (id) => {
    const res = await request(`/documents/${id}/approve`, {
      method: 'POST',
      headers: headers(),
    })
    return res.json()
  },

  getDocumentFileUrl: (id) => `${BASE}/documents/${id}/file`,

  exportDrake: async (documentId, clientName, taxYear) => {
    const res = await fetch(`${BASE}/export/drake/${documentId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Export failed')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `w2_${(clientName || 'export').toLowerCase().replace(/\s+/g, '_')}_${taxYear || '2024'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}
