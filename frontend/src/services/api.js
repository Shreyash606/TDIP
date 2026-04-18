const BASE = (import.meta.env.VITE_API_URL || 'https://courageous-beauty-production-6d0f.up.railway.app') + '/api'

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
  register: async (fullName, email, password, role = 'cpa') => {
    const res = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password, role }),
    })
    return res.json()
  },

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
    const res = await request('/clients/', { headers: headers() })
    return res.json()
  },

  createClient: async (data) => {
    const res = await request('/clients/', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    })
    return res.json()
  },

  // Documents
  getDocuments: async () => {
    const res = await request('/documents/', { headers: headers() })
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

  // Intake (client portal)
  createIntake: async (clientId, taxYear = '2024') => {
    const res = await request('/intake/', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ client_id: clientId, tax_year: taxYear }),
    })
    return res.json()
  },

  listIntakes: async () => {
    const res = await request('/intake/', { headers: headers() })
    return res.json()
  },

  getMyIntake: async () => {
    const res = await request('/intake/my', { headers: headers() })
    return res.json()
  },

  getIntake: async (id) => {
    const res = await request(`/intake/${id}`, { headers: headers() })
    return res.json()
  },

  updateIntake: async (id, data, action = null) => {
    const url = action ? `/intake/${id}?action=${action}` : `/intake/${id}`
    const res = await request(url, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    })
    return res.json()
  },

  reviewIntake: async (id, status, cpaNotes = null) => {
    const res = await request(`/intake/${id}/review`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ status, cpa_notes: cpaNotes }),
    })
    return res.json()
  },

  assignClientToIntake: async (intakeId) => {
    const res = await request(`/intake/${intakeId}/assign`, {
      method: 'POST',
      headers: headers(),
    })
    return res.json()
  },

  uploadIntakeDocument: async (intakeId, file, category = 'other') => {
    const form = new FormData()
    form.append('file', file)
    form.append('category', category)
    const res = await fetch(`${BASE}/intake/${intakeId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },

  deleteIntakeDocument: async (intakeId, docId) => {
    await request(`/intake/${intakeId}/documents/${docId}`, {
      method: 'DELETE',
      headers: headers(),
    })
  },

  getIntakeDocumentUrl: (intakeId, docId) =>
    `${BASE}/intake/${intakeId}/documents/${docId}/file`,

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
