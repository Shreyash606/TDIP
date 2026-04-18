import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'

const FIELDS = [
  {
    section: 'Employer',
    fields: [
      { key: 'employer_name',    label: 'Employer Name',    type: 'text',   col: 2 },
      { key: 'employer_ein',     label: 'EIN',              type: 'text',   col: 1 },
      { key: 'employer_address', label: 'Employer Address', type: 'text',   col: 1 },
    ],
  },
  {
    section: 'Employee',
    fields: [
      { key: 'employee_name',      label: 'Employee Name',   type: 'text', col: 1 },
      { key: 'employee_ssn_last4', label: 'SSN (Last 4)',    type: 'text', col: 1 },
      { key: 'employee_address',   label: 'Employee Address', type: 'text', col: 2 },
      { key: 'tax_year',           label: 'Tax Year',        type: 'text', col: 1 },
    ],
  },
  {
    section: 'Wages & Federal Taxes',
    fields: [
      { key: 'box1_wages',                 label: 'Box 1 — Wages, Tips',         type: 'number', col: 1 },
      { key: 'box2_federal_income_tax',    label: 'Box 2 — Federal Income Tax',  type: 'number', col: 1 },
      { key: 'box3_ss_wages',              label: 'Box 3 — Social Security Wages', type: 'number', col: 1 },
      { key: 'box4_ss_tax_withheld',       label: 'Box 4 — SS Tax Withheld',     type: 'number', col: 1 },
      { key: 'box5_medicare_wages',        label: 'Box 5 — Medicare Wages',      type: 'number', col: 1 },
      { key: 'box6_medicare_tax_withheld', label: 'Box 6 — Medicare Tax',        type: 'number', col: 1 },
    ],
  },
  {
    section: 'Box 12 & Other',
    fields: [
      { key: 'box12a_code',   label: 'Box 12a Code',   type: 'text',   col: 1 },
      { key: 'box12a_amount', label: 'Box 12a Amount', type: 'number', col: 1 },
      { key: 'box12b_code',   label: 'Box 12b Code',   type: 'text',   col: 1 },
      { key: 'box12b_amount', label: 'Box 12b Amount', type: 'number', col: 1 },
      { key: 'box14_other',   label: 'Box 14 Other',   type: 'text',   col: 2 },
    ],
  },
  {
    section: 'Box 13 — Checkboxes',
    fields: [
      { key: 'box13_statutory_employee',   label: 'Statutory Employee',     type: 'checkbox', col: 1 },
      { key: 'box13_retirement_plan',      label: 'Retirement Plan',        type: 'checkbox', col: 1 },
      { key: 'box13_third_party_sick_pay', label: 'Third-Party Sick Pay',   type: 'checkbox', col: 1 },
    ],
  },
  {
    section: 'State & Local',
    fields: [
      { key: 'box15_state',              label: 'Box 15 State',          type: 'text',   col: 1 },
      { key: 'box15_employer_state_id',  label: 'Box 15 State ID',       type: 'text',   col: 1 },
      { key: 'box16_state_wages',        label: 'Box 16 State Wages',    type: 'number', col: 1 },
      { key: 'box17_state_income_tax',   label: 'Box 17 State Tax',      type: 'number', col: 1 },
      { key: 'box18_local_wages',        label: 'Box 18 Local Wages',    type: 'number', col: 1 },
      { key: 'box19_local_tax',          label: 'Box 19 Local Tax',      type: 'number', col: 1 },
      { key: 'box20_locality_name',      label: 'Box 20 Locality',       type: 'text',   col: 1 },
    ],
  },
]

export default function ReviewPanel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [form, setForm] = useState({})
  const [pdfUrl, setPdfUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [error, setError] = useState('')
  const [pdfError, setPdfError] = useState(false)

  useEffect(() => {
    api.getDocument(id).then((data) => {
      setDoc(data)
      setForm(data.extracted_data || {})
    }).catch(() => setError('Document not found'))

    // Pass token as query param so the iframe loads the PDF directly
    const token = localStorage.getItem('token')
    setPdfUrl(`${api.getDocumentFileUrl(id)}?token=${encodeURIComponent(token)}`)
  }, [id])

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaveMsg('')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await api.updateDocument(id, form)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      await api.updateDocument(id, form)
      await api.approveDocument(id)
      navigate('/extraction')
    } catch (err) {
      setError(err.message)
    } finally {
      setApproving(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted">
        {error} —{' '}
        <button onClick={() => navigate('/extraction')} className="underline ml-1">back</button>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-muted tracking-widest uppercase">
        Loading...
      </div>
    )
  }

  const confidence = doc.confidence_score != null ? Math.round(doc.confidence_score * 100) : null

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-faint bg-paper z-40 flex-shrink-0">
        <div className="h-12 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/extraction')}
              className="text-xs text-muted hover:text-ink tracking-wide uppercase"
            >
              ← Back
            </button>
            <span className="text-muted text-xs">/</span>
            <span className="text-xs text-ink font-medium tracking-wide">{doc.client_name}</span>
            <span className="text-muted text-xs">/</span>
            <span className="text-xs text-muted max-w-[200px] truncate">{doc.filename}</span>
          </div>

          <div className="flex items-center gap-4">
            {confidence != null && (
              <div className="text-xs text-muted tracking-wide">
                Confidence:{' '}
                <span className={`font-medium ${confidence >= 90 ? 'text-ink' : confidence >= 75 ? 'text-muted' : 'text-red-500'}`}>
                  {confidence}%
                </span>
              </div>
            )}
            {doc.status === 'review' && (
              <span className="badge-review">{doc.status}</span>
            )}
            {doc.status === 'approved' && (
              <span className="badge-approved">{doc.status}</span>
            )}
          </div>
        </div>
      </header>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: PDF viewer */}
        <div className="w-1/2 border-r border-faint flex flex-col bg-gray-50 overflow-hidden">
          <div className="px-4 py-2 border-b border-faint flex-shrink-0">
            <span className="text-xs text-muted tracking-widest uppercase">Original Document</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {pdfError ? (
              <div className="h-full flex items-center justify-center flex-col gap-2 text-muted">
                <div className="text-3xl">📄</div>
                <div className="text-xs tracking-wide">PDF not available</div>
                <div className="text-xs text-muted/70">Upload a real PDF to view it here</div>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="W-2 Document"
                onError={() => setPdfError(true)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted tracking-widest uppercase">
                Loading PDF...
              </div>
            )}
          </div>
        </div>

        {/* Right: Extracted data form */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="px-6 py-2 border-b border-faint flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-muted tracking-widest uppercase">Extracted Data</span>
            <div className="flex items-center gap-3">
              {saveMsg && <span className="text-xs text-muted tracking-wide">{saveMsg}</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs text-muted hover:text-ink tracking-wide uppercase disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {FIELDS.map(({ section, fields }) => (
              <div key={section} className="mb-6">
                <div className="section-label">{section}</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {fields.map(({ key, label, type, col }) => (
                    <div key={key} className={`field-group ${col === 2 ? 'col-span-2' : ''}`}>
                      <label className="field-label">{label}</label>
                      {type === 'checkbox' ? (
                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!form[key]}
                            onChange={(e) => handleChange(key, e.target.checked)}
                            className="accent-ink w-4 h-4"
                          />
                          <span className="text-xs text-muted">
                            {form[key] ? 'Yes' : 'No'}
                          </span>
                        </label>
                      ) : type === 'number' ? (
                        <div className="relative">
                          <span className="absolute left-0 top-1 text-xs text-muted pointer-events-none">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={form[key] ?? ''}
                            onChange={(e) => handleChange(key, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            className="field-input pl-4"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={form[key] ?? ''}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className="field-input"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Notes */}
            {form.extraction_notes && (
              <div className="mt-2 p-3 bg-gray-50 border border-faint text-xs text-muted">
                <span className="text-xs tracking-widest uppercase text-muted/70 block mb-1">Notes</span>
                {form.extraction_notes}
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="border-t border-faint px-6 py-4 flex items-center justify-between flex-shrink-0 bg-paper">
            <button
              onClick={() => navigate('/extraction')}
              className="btn-ghost text-xs"
            >
              ← Dashboard
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>

              {doc.status !== 'approved' ? (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="btn-primary text-xs disabled:opacity-40"
                >
                  {approving ? 'APPROVING...' : 'APPROVE →'}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted">
                  <span>✓</span> <span className="tracking-wide uppercase">Approved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
