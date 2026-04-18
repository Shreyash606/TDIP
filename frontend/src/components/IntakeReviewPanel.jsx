import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import Navbar from './Navbar'

const STATUS_OPTIONS_CPA = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
]
const STATUS_OPTIONS_ADMIN = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'under_review', label: 'Under Review' },
]

const DOC_CATEGORIES = [
  { value: 'w2', label: 'W-2' }, { value: '1099_nec', label: '1099-NEC' },
  { value: '1099_misc', label: '1099-MISC' }, { value: '1099_int', label: '1099-INT' },
  { value: '1099_div', label: '1099-DIV' }, { value: '1099_b', label: '1099-B' },
  { value: '1099_r', label: '1099-R' }, { value: 'ssa_1099', label: 'SSA-1099' },
  { value: 'k1', label: 'K-1' }, { value: '1098_mortgage', label: '1098 Mortgage' },
  { value: '1095a', label: '1095-A (ACA)' }, { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'prior_year_return', label: 'Prior Year Return' },
  { value: 'property_docs', label: 'Property Docs' }, { value: 'other', label: 'Other' },
]

const INCOME_FIELDS = [
  ['W-2 Wages', 'has_w2_income'], ['1099-NEC (self-employment)', 'has_1099_nec'],
  ['1099-MISC', 'has_1099_misc'], ['1099-INT (interest)', 'has_1099_int'],
  ['1099-DIV (dividends)', 'has_1099_div'], ['1099-B (investments)', 'has_1099_b'],
  ['1099-R (retirement)', 'has_1099_r'], ['SSA-1099 (Social Security)', 'has_ssa_1099'],
  ['K-1 (partnership/S-corp)', 'has_k1_income'], ['Rental income', 'has_rental_income'],
  ['Gambling winnings', 'has_gambling_winnings'], ['Foreign income', 'has_foreign_income'],
  ['Crypto transactions', 'has_crypto_transactions'],
]

function F({ label, children }) {
  return <div className="field-group"><label className="field-label">{label}</label>{children}</div>
}
function TI({ value, onChange, placeholder, type = 'text' }) {
  return <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field-input" />
}
function Check({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none py-0.5">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-gray-800 cursor-pointer flex-shrink-0"
      />
      <span className="text-sm text-ink">{label}</span>
    </label>
  )
}
function SensitiveField({ label, value, onChange, placeholder }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="relative">
        <input
          type={revealed ? 'text' : 'password'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="field-input pr-16"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink transition-colors"
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>
    </div>
  )
}
function MaskedSSNField({ label, value, onChange, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const digits = (value || '').replace(/\D/g, '')
  const masked = digits.length >= 4 ? `***-**-${digits.slice(-4)}` : ''

  const finish = () => {
    if (draft.trim()) onChange(draft.trim())
    setEditing(false)
    setDraft('')
  }

  if (editing) {
    return (
      <div className="field-group">
        <label className="field-label">{label}</label>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={finish}
          placeholder={placeholder || 'XXX-XX-XXXX'}
          className="field-input"
          autoFocus
          autoComplete="off"
        />
      </div>
    )
  }

  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={masked || '—'}
          readOnly
          className="field-input bg-gray-50 text-muted cursor-default"
        />
        <button type="button" onClick={() => setEditing(true)}
          className="text-xs text-muted hover:text-ink whitespace-nowrap border border-faint px-2 py-1 transition-colors">
          {value ? 'Update' : 'Enter'}
        </button>
      </div>
    </div>
  )
}
function Amt({ value, onChange }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
      <input type="number" min="0" step="0.01" value={value || ''} className="field-input pl-7"
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)} />
    </div>
  )
}
function Sec({ title, children }) {
  return (
    <div className="mb-7">
      <div className="text-xs tracking-widest text-muted uppercase mb-3 pb-1 border-b border-faint">{title}</div>
      {children}
    </div>
  )
}
function maskSSN(val) {
  if (!val) return null
  const digits = val.replace(/\D/g, '')
  if (digits.length >= 9) return `***-**-${digits.slice(-4)}`
  if (digits.length === 4) return `***-**-${digits}`
  return `***-**-${val.slice(-4)}`
}

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between py-2 border-b border-faint last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs text-ink font-medium text-right max-w-[60%]">{String(value)}</span>
    </div>
  )
}

export default function IntakeReviewPanel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const token = localStorage.getItem('token')

  const [intake, setIntake] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [pendingUpload, setPendingUpload] = useState({ file: null, category: 'other' })
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getIntake(id)
      .then((data) => { setIntake(data); setForm(data); setStatus(data.status); setNotes(data.cpa_notes || '') })
      .catch(() => setError('Failed to load intake'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (field) => (val) => setForm((p) => ({ ...p, [field]: val }))

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      // Strip DB metadata — only send editable fields
      const {
        id: _id, client_id, client_user_id, cpa_id, client_name, cpa_name,
        documents, created_at, updated_at, submitted_at, reviewed_at,
        dependents_json, real_estate_json, status: _status, cpa_notes,
        ...payload
      } = form
      const updated = await api.updateIntake(id, payload)
      setIntake(updated); setForm(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleSaveStatus = async () => {
    setSavingStatus(true); setError('')
    try {
      const updated = await api.reviewIntake(id, status, notes || null)
      setIntake(updated); setForm(updated)
    } catch (err) { setError(err.message) }
    finally { setSavingStatus(false) }
  }

  const handleUpload = async () => {
    if (!pendingUpload.file) return
    setUploadingDoc(true); setError('')
    try {
      await api.uploadIntakeDocument(id, pendingUpload.file, pendingUpload.category)
      setPendingUpload({ file: null, category: 'other' })
      const updated = await api.getIntake(id)
      setIntake(updated); setForm(updated)
    } catch (err) { setError(err.message) }
    finally { setUploadingDoc(false) }
  }

  const handleDeleteDoc = async (docId) => {
    try {
      await api.deleteIntakeDocument(id, docId)
      const updated = await api.getIntake(id)
      setIntake(updated); setForm(updated)
    } catch (err) { setError(err.message) }
  }

  if (loading) return <div className="min-h-screen bg-paper"><Navbar /><div className="flex items-center justify-center py-32 text-xs text-muted tracking-widest uppercase">Loading...</div></div>
  if (!intake) return <div className="min-h-screen bg-paper"><Navbar /><div className="flex items-center justify-center py-32 text-sm text-muted">{error || 'Not found'}</div></div>

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <button onClick={() => navigate('/intake-dashboard')}
          className="text-xs text-muted tracking-widest uppercase hover:text-ink transition-colors mb-6 block">
          ← Back
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs tracking-widest text-muted uppercase mb-1">
              {isAdmin ? 'Admin View' : 'CPA — Client Intake'}
            </div>
            <h1 className="text-xl font-semibold text-ink">{intake.client_name} — {intake.tax_year}</h1>
            <div className="text-xs text-muted mt-1">
              {isAdmin && intake.cpa_name && <span>CPA: {intake.cpa_name} · </span>}
              Status: <span className="text-ink font-medium">{status}</span>
            </div>
          </div>
          {!isAdmin && (
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-xs text-green-600 tracking-wide">Saved</span>
              )}
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
                {saving ? 'Saving...' : 'Save →'}
              </button>
            </div>
          )}
        </div>

        {error && <div className="text-xs text-red-600 border border-red-200 px-3 py-2 mb-4">{error}</div>}

        <div className="grid grid-cols-3 gap-6">
          {/* Main form */}
          <div className="col-span-2 border border-faint p-6">
            {isAdmin ? <ReadView intake={intake} /> : <EditView form={form} set={set} />}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">
            {/* Status panel */}
            <div className="border border-faint p-5">
              <div className="text-xs tracking-widest text-muted uppercase mb-4">Status</div>
              <div className="field-group mb-4">
                <label className="field-label">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input"
                  disabled={isAdmin}>
                  {(isAdmin ? STATUS_OPTIONS_ADMIN : STATUS_OPTIONS_CPA).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="field-group mb-4">
                <label className="field-label">{isAdmin ? 'Notes' : 'Internal notes'}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="field-input h-24 resize-none text-sm" placeholder="Notes..."
                  readOnly={isAdmin} />
              </div>
              {!isAdmin && (
                <button onClick={handleSaveStatus} disabled={savingStatus}
                  className="btn-primary text-xs w-full disabled:opacity-50">
                  {savingStatus ? 'Saving...' : 'Update Status →'}
                </button>
              )}
            </div>

            {/* Documents */}
            <div className="border border-faint p-5">
              <div className="text-xs tracking-widest text-muted uppercase mb-4">
                Documents ({(intake.documents || []).length})
              </div>

              {!isAdmin && (
                <div className="mb-4 flex flex-col gap-2">
                  <select value={pendingUpload.category}
                    onChange={(e) => setPendingUpload((p) => ({ ...p, category: e.target.value }))}
                    className="field-input text-xs">
                    {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setPendingUpload((p) => ({ ...p, file: e.target.files[0] || null }))}
                    className="text-xs text-muted" />
                  <button onClick={handleUpload} disabled={!pendingUpload.file || uploadingDoc}
                    className="btn-primary text-xs disabled:opacity-50">
                    {uploadingDoc ? 'Uploading...' : 'Upload →'}
                  </button>
                </div>
              )}

              {(intake.documents || []).length === 0 ? (
                <div className="text-xs text-muted">No documents yet.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {intake.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between border border-faint px-3 py-2">
                      <a href={`${api.getIntakeDocumentUrl(intake.id, doc.id)}?token=${encodeURIComponent(token)}`}
                        target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                        <div className="text-xs text-ink truncate">{doc.filename}</div>
                        <div className="text-xs text-muted">{DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}</div>
                      </a>
                      {!isAdmin && (
                        <button onClick={() => handleDeleteDoc(doc.id)}
                          className="text-xs text-muted hover:text-red-500 ml-2 flex-shrink-0">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── CPA editable form ─────────────────────────────────────────────────────────
function EditView({ form, set }) {
  const addDependent = () => set('dependents')([...(form.dependents || []), { name: '', dob: '', relationship: '', ssn_last4: '' }])
  const updateDep = (i, k, v) => { const d = [...(form.dependents || [])]; d[i] = { ...d[i], [k]: v }; set('dependents')(d) }
  const removeDep = (i) => { const d = [...(form.dependents || [])]; d.splice(i, 1); set('dependents')(d) }

  return (
    <div className="flex flex-col gap-1">
      <Sec title="Personal Information">
        <div className="grid grid-cols-2 gap-4">
          <F label="First Name"><TI value={form.taxpayer_first_name} onChange={set('taxpayer_first_name')} placeholder="Jane" /></F>
          <F label="Last Name"><TI value={form.taxpayer_last_name} onChange={set('taxpayer_last_name')} placeholder="Smith" /></F>
          <MaskedSSNField label="SSN" value={form.taxpayer_ssn_last4} onChange={set('taxpayer_ssn_last4')} />
          <F label="Date of Birth"><TI value={form.taxpayer_dob} onChange={set('taxpayer_dob')} placeholder="MM/DD/YYYY" /></F>
          <F label="Occupation"><TI value={form.taxpayer_occupation} onChange={set('taxpayer_occupation')} /></F>
          <F label="Phone"><TI value={form.taxpayer_phone} onChange={set('taxpayer_phone')} type="tel" /></F>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="col-span-3"><F label="Street Address"><TI value={form.taxpayer_address_street} onChange={set('taxpayer_address_street')} /></F></div>
          <F label="City"><TI value={form.taxpayer_address_city} onChange={set('taxpayer_address_city')} /></F>
          <F label="State"><TI value={form.taxpayer_address_state} onChange={set('taxpayer_address_state')} /></F>
          <F label="ZIP"><TI value={form.taxpayer_address_zip} onChange={set('taxpayer_address_zip')} /></F>
        </div>
      </Sec>

      <Sec title="Filing Status">
        <F label="Filing Status">
          <select value={form.filing_status || ''} onChange={(e) => set('filing_status')(e.target.value)} className="field-input">
            <option value="">Select...</option>
            <option value="single">Single</option>
            <option value="married_filing_jointly">Married Filing Jointly</option>
            <option value="married_filing_separately">Married Filing Separately</option>
            <option value="head_of_household">Head of Household</option>
            <option value="qualifying_widow">Qualifying Widow(er)</option>
          </select>
        </F>
        <div className="mt-3"><Check label="Has spouse" value={!!form.has_spouse} onChange={set('has_spouse')} /></div>
        {form.has_spouse && (
          <div className="grid grid-cols-2 gap-3 mt-4 pl-4 border-l-2 border-faint">
            <F label="Spouse First Name"><TI value={form.spouse_first_name} onChange={set('spouse_first_name')} /></F>
            <F label="Spouse Last Name"><TI value={form.spouse_last_name} onChange={set('spouse_last_name')} /></F>
            <MaskedSSNField label="Spouse SSN" value={form.spouse_ssn_last4} onChange={set('spouse_ssn_last4')} />
            <F label="Spouse DOB"><TI value={form.spouse_dob} onChange={set('spouse_dob')} placeholder="MM/DD/YYYY" /></F>
            <F label="Spouse Occupation"><TI value={form.spouse_occupation} onChange={set('spouse_occupation')} /></F>
          </div>
        )}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted tracking-widest uppercase">Dependents</span>
            <button type="button" onClick={addDependent} className="text-xs border border-faint px-3 py-1 hover:border-ink text-muted hover:text-ink transition-colors">+ Add</button>
          </div>
          {(form.dependents || []).map((dep, i) => (
            <div key={i} className="border border-faint p-3 mb-2 grid grid-cols-2 gap-3 relative">
              <button type="button" onClick={() => removeDep(i)} className="absolute top-2 right-2 text-xs text-muted hover:text-red-500">✕</button>
              <F label="Name"><input className="field-input" value={dep.name || ''} onChange={(e) => updateDep(i, 'name', e.target.value)} /></F>
              <F label="Relationship"><input className="field-input" value={dep.relationship || ''} onChange={(e) => updateDep(i, 'relationship', e.target.value)} placeholder="Child / Parent" /></F>
              <F label="DOB"><input className="field-input" value={dep.dob || ''} onChange={(e) => updateDep(i, 'dob', e.target.value)} placeholder="MM/DD/YYYY" /></F>
              <F label="SSN (last 4)"><input className="field-input" value={dep.ssn_last4 || ''} onChange={(e) => updateDep(i, 'ssn_last4', e.target.value)} /></F>
            </div>
          ))}
        </div>
      </Sec>

      <Sec title="Income Sources">
        <div className="grid grid-cols-2 gap-y-2">
          {INCOME_FIELDS.map(([label, field]) => (
            <Check key={field} label={label} value={!!form[field]} onChange={set(field)} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <Check label="Alimony received (pre-2019 divorce)" value={!!form.has_alimony_received} onChange={set('has_alimony_received')} />
          {form.has_alimony_received && <div className="ml-12"><F label="Amount"><Amt value={form.alimony_received_amount} onChange={set('alimony_received_amount')} /></F></div>}
        </div>
        <div className="mt-3">
          <F label="Other income description">
            <textarea value={form.other_income_description || ''} onChange={(e) => set('other_income_description')(e.target.value)} className="field-input h-16 resize-none" placeholder="Describe..." />
          </F>
        </div>
      </Sec>

      <Sec title="Deductions">
        <F label="Deduction Preference">
          <select value={form.deduction_preference || 'standard'} onChange={(e) => set('deduction_preference')(e.target.value)} className="field-input">
            <option value="standard">Standard</option>
            <option value="itemized">Itemized</option>
            <option value="unsure">Not Sure (CPA will advise)</option>
          </select>
        </F>
        <div className="flex flex-col gap-3 mt-4">
          {[
            ['has_medical_expenses', 'Medical expenses', 'medical_expenses_amount'],
            ['has_charitable_contributions', 'Charitable contributions (cash)', 'charitable_cash_amount'],
            ['has_student_loan_interest', 'Student loan interest', 'student_loan_interest_amount'],
            ['has_educator_expenses', 'Educator expenses (teachers)', 'educator_expenses_amount'],
            ['has_child_care_expenses', 'Child / dependent care expenses', 'child_care_amount'],
            ['has_tuition_expenses', 'Tuition expenses', 'tuition_amount'],
          ].map(([tog, lbl, amt]) => (
            <div key={tog}>
              <Check label={lbl} value={!!form[tog]} onChange={set(tog)} />
              {form[tog] && <div className="ml-12 mt-2"><F label="Amount"><Amt value={form[amt]} onChange={set(amt)} /></F></div>}
            </div>
          ))}
          <Check label="Home office" value={!!form.has_home_office} onChange={set('has_home_office')} />
          {form.has_home_office && <div className="ml-12"><F label="Square footage"><input type="number" className="field-input" value={form.home_office_sqft || ''} onChange={(e) => set('home_office_sqft')(e.target.value ? parseInt(e.target.value) : null)} /></F></div>}
          <Check label="Business vehicle use" value={!!form.has_vehicle_use} onChange={set('has_vehicle_use')} />
          {form.has_vehicle_use && <div className="ml-12"><F label="Business miles driven"><input type="number" className="field-input" value={form.vehicle_business_miles || ''} onChange={(e) => set('vehicle_business_miles')(e.target.value ? parseFloat(e.target.value) : null)} /></F></div>}
          <Check label="Energy-efficient home improvements" value={!!form.has_energy_credits} onChange={set('has_energy_credits')} />
        </div>
      </Sec>

      <Sec title="IRC §7216 Client Consent">
        <div className={`p-3 border rounded text-xs ${form.consent_obtained ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
          <Check
            label="Client has provided consent for this firm to collect, store, and use their tax information for the purpose of preparing their return, in accordance with IRC §7216."
            value={!!form.consent_obtained}
            onChange={set('consent_obtained')}
          />
          {form.consent_obtained_at && (
            <div className="mt-1 ml-6 text-muted">
              Logged: {new Date(form.consent_obtained_at).toLocaleString()}
            </div>
          )}
          {!form.consent_obtained && (
            <div className="mt-1 ml-6 text-amber-700">Consent must be confirmed before this intake can be marked complete.</div>
          )}
        </div>
      </Sec>

      <Sec title="Other Information">
        <div className="flex flex-col gap-3">
          <Check label="ACA Marketplace insurance (has 1095-A)" value={!!form.had_aca_marketplace_insurance} onChange={set('had_aca_marketplace_insurance')} />
          <Check label="Made estimated tax payments" value={!!form.made_estimated_tax_payments} onChange={set('made_estimated_tax_payments')} />
          {form.made_estimated_tax_payments && <div className="ml-12"><F label="Total payments"><Amt value={form.estimated_payments_amount} onChange={set('estimated_payments_amount')} /></F></div>}
          <Check label="Foreign bank or financial accounts" value={!!form.has_foreign_accounts} onChange={set('has_foreign_accounts')} />
          <Check label="Received IRS notice or letter" value={!!form.received_irs_notice} onChange={set('received_irs_notice')} />
          {form.received_irs_notice && <div className="ml-12"><F label="Describe the notice"><textarea className="field-input h-16 resize-none" value={form.irs_notice_description || ''} onChange={(e) => set('irs_notice_description')(e.target.value)} /></F></div>}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <F label="Prior Year AGI"><Amt value={form.prior_year_agi} onChange={set('prior_year_agi')} /></F>
          <F label="Bank Account Type">
            <select value={form.bank_account_type || 'checking'} onChange={(e) => set('bank_account_type')(e.target.value)} className="field-input">
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </F>
          <SensitiveField label="Routing Number" value={form.bank_routing_number} onChange={set('bank_routing_number')} placeholder="9-digit routing number" />
          <SensitiveField label="Account Number" value={form.bank_account_number} onChange={set('bank_account_number')} placeholder="Account number" />
        </div>
        <div className="mt-4">
          <F label="Notes">
            <textarea value={form.additional_notes || ''} onChange={(e) => set('additional_notes')(e.target.value)} className="field-input h-20 resize-none" placeholder="Any other notes about this client..." />
          </F>
        </div>
      </Sec>
    </div>
  )
}

// ── Admin read-only view ───────────────────────────────────────────────────────
function ReadView({ intake }) {
  const fmt$ = (v) => v ? `$${Number(v).toLocaleString()}` : null
  const yes = 'Yes'
  return (
    <>
      <Sec title="Personal Information">
        <Row label="Name" value={`${intake.taxpayer_first_name || ''} ${intake.taxpayer_last_name || ''}`.trim() || '-'} />
        <Row label="SSN" value={intake.taxpayer_ssn_last4} />
        <Row label="Date of Birth" value={intake.taxpayer_dob} />
        <Row label="Occupation" value={intake.taxpayer_occupation} />
        <Row label="Phone" value={intake.taxpayer_phone} />
        <Row label="Address" value={[intake.taxpayer_address_street, intake.taxpayer_address_city, intake.taxpayer_address_state, intake.taxpayer_address_zip].filter(Boolean).join(', ')} />
      </Sec>
      <Sec title="Filing Status & Family">
        <Row label="Filing Status" value={intake.filing_status?.replace(/_/g, ' ')} />
        {intake.has_spouse && <>
          <Row label="Spouse" value={`${intake.spouse_first_name || ''} ${intake.spouse_last_name || ''}`.trim()} />
          <Row label="Spouse SSN" value={intake.spouse_ssn_last4} />
          <Row label="Spouse Occupation" value={intake.spouse_occupation} />
        </>}
        <Row label="Dependents" value={(intake.dependents || []).length || null} />
        {(intake.dependents || []).map((d, i) => <Row key={i} label={`Dependent ${i + 1}`} value={`${d.name} (${d.relationship})`} />)}
      </Sec>
      <Sec title="Income Sources">
        {INCOME_FIELDS.filter(([, f]) => intake[f]).map(([lbl, f]) => <Row key={f} label={lbl} value={yes} />)}
        {intake.has_alimony_received && <Row label="Alimony received" value={fmt$(intake.alimony_received_amount) || yes} />}
        {intake.other_income_description && <Row label="Other income" value={intake.other_income_description} />}
      </Sec>
      <Sec title="Deductions">
        <Row label="Preference" value={intake.deduction_preference} />
        {intake.has_medical_expenses && <Row label="Medical expenses" value={fmt$(intake.medical_expenses_amount) || yes} />}
        {intake.has_charitable_contributions && <Row label="Charitable (cash)" value={fmt$(intake.charitable_cash_amount) || yes} />}
        {intake.has_student_loan_interest && <Row label="Student loan interest" value={fmt$(intake.student_loan_interest_amount) || yes} />}
        {intake.has_educator_expenses && <Row label="Educator expenses" value={fmt$(intake.educator_expenses_amount) || yes} />}
        {intake.has_home_office && <Row label="Home office" value={intake.home_office_sqft ? `${intake.home_office_sqft} sqft` : yes} />}
        {intake.has_vehicle_use && <Row label="Business miles" value={intake.vehicle_business_miles ? Number(intake.vehicle_business_miles).toLocaleString() : yes} />}
        {intake.has_child_care_expenses && <Row label="Child care" value={fmt$(intake.child_care_amount) || yes} />}
        {intake.has_energy_credits && <Row label="Energy credits" value={yes} />}
      </Sec>
      <Sec title="IRC §7216 Consent">
        <Row label="Consent obtained" value={intake.consent_obtained ? 'Yes' : 'No'} />
        {intake.consent_obtained_at && <Row label="Consent recorded" value={new Date(intake.consent_obtained_at).toLocaleString()} />}
      </Sec>
      <Sec title="Other Information">
        {intake.had_aca_marketplace_insurance && <Row label="ACA insurance" value={yes} />}
        {intake.made_estimated_tax_payments && <Row label="Estimated payments" value={fmt$(intake.estimated_payments_amount) || yes} />}
        {intake.has_foreign_accounts && <Row label="Foreign accounts" value={yes} />}
        {intake.received_irs_notice && <Row label="IRS notice" value={intake.irs_notice_description || yes} />}
        {intake.prior_year_agi && <Row label="Prior year AGI" value={fmt$(intake.prior_year_agi)} />}
        {intake.bank_routing_number && <Row label="Routing number" value="On file (restricted)" />}
        {intake.bank_account_number && <Row label="Account number" value="On file (restricted)" />}
        {intake.bank_account_type && <Row label="Account type" value={intake.bank_account_type} />}
        {intake.additional_notes && <Row label="Notes" value={intake.additional_notes} />}
      </Sec>
    </>
  )
}
