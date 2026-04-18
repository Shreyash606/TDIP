import { useEffect, useState } from 'react'
import { api } from '../services/api'
import Navbar from './Navbar'

const DOC_CATEGORIES = [
  { value: 'w2', label: 'W-2 (from employer)' },
  { value: '1099_nec', label: '1099-NEC (freelance / self-employment)' },
  { value: '1099_misc', label: '1099-MISC (other income)' },
  { value: '1099_int', label: '1099-INT (bank interest)' },
  { value: '1099_div', label: '1099-DIV (dividends)' },
  { value: '1099_b', label: '1099-B (investment sales)' },
  { value: '1099_r', label: '1099-R (retirement / pension)' },
  { value: 'ssa_1099', label: 'SSA-1099 (Social Security)' },
  { value: 'k1', label: 'K-1 (partnership or S-corp)' },
  { value: '1098_mortgage', label: '1098 (mortgage interest)' },
  { value: '1095a', label: '1095-A (health insurance marketplace)' },
  { value: 'prior_year_return', label: 'Prior year tax return' },
  { value: 'bank_statement', label: 'Bank statement' },
  { value: 'property_docs', label: 'Property documents' },
  { value: 'other', label: 'Other' },
]

const INCOME_FIELDS = [
  ['W-2 wages from an employer', 'has_w2_income'],
  ['Freelance or self-employment income (1099-NEC)', 'has_1099_nec'],
  ['Other 1099-MISC income', 'has_1099_misc'],
  ['Interest from a bank account (1099-INT)', 'has_1099_int'],
  ['Dividends from investments (1099-DIV)', 'has_1099_div'],
  ['Stock or investment sales (1099-B)', 'has_1099_b'],
  ['Retirement or pension income (1099-R)', 'has_1099_r'],
  ['Social Security benefits (SSA-1099)', 'has_ssa_1099'],
  ['Partnership or S-corp income (K-1)', 'has_k1_income'],
  ['Rental property income', 'has_rental_income'],
  ['Gambling winnings', 'has_gambling_winnings'],
  ['Income from a foreign country', 'has_foreign_income'],
  ['Cryptocurrency transactions', 'has_crypto_transactions'],
]

function F({ label, children }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}
function TI({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} className="field-input" />
  )
}
function Check({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none py-0.5">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-gray-800 cursor-pointer flex-shrink-0" />
      <span className="text-sm text-ink">{label}</span>
    </label>
  )
}
function Sec({ title, subtitle, children }) {
  return (
    <div className="mb-8">
      <div className="border-b border-faint pb-2 mb-4">
        <div className="text-xs tracking-widest text-muted uppercase">{title}</div>
        {subtitle && <div className="text-xs text-muted mt-1">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}
function MaskedSSNField({ label, value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const digits = (value || '').replace(/\D/g, '')
  const masked = digits.length >= 4 ? `***-**-${digits.slice(-4)}` : ''
  const finish = () => {
    if (draft.trim()) onChange(draft.trim())
    setEditing(false); setDraft('')
  }
  if (editing) return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={finish} placeholder="XXX-XX-XXXX" className="field-input" autoFocus autoComplete="off" />
    </div>
  )
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="flex items-center gap-2">
        <input type="text" value={masked || '—'} readOnly className="field-input bg-gray-50 text-muted cursor-default" />
        <button type="button" onClick={() => setEditing(true)}
          className="text-xs text-muted hover:text-ink whitespace-nowrap border border-faint px-2 py-1">
          {value ? 'Update' : 'Enter'}
        </button>
      </div>
    </div>
  )
}
function SensitiveField({ label, value, onChange, placeholder }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="relative">
        <input type={revealed ? 'text' : 'password'} value={value || ''}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="field-input pr-16" autoComplete="off" />
        <button type="button" onClick={() => setRevealed(r => !r)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink">
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>
    </div>
  )
}

export default function ClientIntakeForm() {
  const token = localStorage.getItem('token')
  const [intake, setIntake] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [pendingUpload, setPendingUpload] = useState({ file: null, category: 'w2' })

  useEffect(() => {
    api.getMyIntake()
      .then(data => { setIntake(data); setForm(data) })
      .catch(() => setError('Failed to load your form. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  const set = (field) => (val) => setForm(p => ({ ...p, [field]: val }))

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const {
        id: _id, client_id, client_user_id, cpa_id, client_name, cpa_name,
        documents, created_at, updated_at, submitted_at, reviewed_at,
        dependents_json, real_estate_json, status: _s, cpa_notes,
        ...payload
      } = form
      const updated = await api.updateMyIntake(payload)
      setIntake(updated)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleSubmit = async () => {
    if (!window.confirm('Submit your information to your CPA? You will not be able to make changes after this.')) return
    setSubmitting(true); setError('')
    try {
      const updated = await api.submitMyIntake()
      setIntake(updated); setForm(updated)
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  const refreshDocs = async () => {
    const updated = await api.getMyIntake()
    setIntake(updated)
    setForm(prev => ({ ...prev, documents: updated.documents }))
  }

  const handleUpload = async () => {
    if (!pendingUpload.file) return
    setUploadingDoc(true); setError('')
    try {
      await api.uploadMyDocument(pendingUpload.file, pendingUpload.category)
      setPendingUpload({ file: null, category: 'w2' })
      await refreshDocs()
    } catch (err) { setError(err.message) }
    finally { setUploadingDoc(false) }
  }

  const handleDeleteDoc = async (docId) => {
    try {
      await api.deleteMyDocument(docId)
      await refreshDocs()
    } catch (err) { setError(err.message) }
  }

  const addDependent = () => set('dependents')([...(form.dependents || []), { name: '', dob: '', relationship: '', ssn_last4: '' }])
  const updateDep = (i, k, v) => { const d = [...(form.dependents || [])]; d[i] = { ...d[i], [k]: v }; set('dependents')(d) }
  const removeDep = (i) => { const d = [...(form.dependents || [])]; d.splice(i, 1); set('dependents')(d) }

  if (loading) return (
    <div className="min-h-screen bg-paper"><Navbar />
      <div className="flex items-center justify-center py-32 text-xs text-muted tracking-widest uppercase">Loading your form...</div>
    </div>
  )

  if (!intake) return (
    <div className="min-h-screen bg-paper"><Navbar />
      <div className="flex items-center justify-center py-32 text-sm text-red-600">{error || 'Could not load your form.'}</div>
    </div>
  )

  const isSubmitted = intake.status === 'submitted'

  if (isSubmitted) return (
    <div className="min-h-screen bg-paper"><Navbar />
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-xl font-semibold text-ink mb-2">Submitted Successfully</h1>
        <p className="text-sm text-muted mb-6">
          Your tax information has been sent to your CPA. They will review everything and be in touch if they need anything else.
        </p>
        <div className="border border-faint p-5 text-left text-xs text-muted space-y-1">
          <div>Submitted: {intake.submitted_at ? new Date(intake.submitted_at).toLocaleString() : '—'}</div>
          <div>Tax year: {intake.tax_year}</div>
          <div>Documents uploaded: {(intake.documents || []).length}</div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-xs tracking-widest text-muted uppercase mb-1">Tax Year {form.tax_year}</div>
            <h1 className="text-xl font-semibold text-ink">My Tax Information</h1>
            <p className="text-xs text-muted mt-1 max-w-md">
              Fill in your details and upload your documents. Save as you go. When everything is ready, click Submit to send it to your CPA.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {saved && <span className="text-xs text-green-600 tracking-wide">Saved</span>}
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Save →'}
            </button>
          </div>
        </div>

        {error && <div className="text-xs text-red-600 border border-red-200 px-3 py-2 mb-5">{error}</div>}

        {/* Personal Information */}
        <Sec title="Your Information">
          <div className="grid grid-cols-2 gap-4">
            <F label="First Name"><TI value={form.taxpayer_first_name} onChange={set('taxpayer_first_name')} placeholder="Jane" /></F>
            <F label="Last Name"><TI value={form.taxpayer_last_name} onChange={set('taxpayer_last_name')} placeholder="Smith" /></F>
            <MaskedSSNField label="Social Security Number" value={form.taxpayer_ssn_last4} onChange={set('taxpayer_ssn_last4')} />
            <F label="Date of Birth"><TI value={form.taxpayer_dob} onChange={set('taxpayer_dob')} placeholder="MM/DD/YYYY" /></F>
            <F label="Occupation"><TI value={form.taxpayer_occupation} onChange={set('taxpayer_occupation')} placeholder="e.g. Teacher, Engineer" /></F>
            <F label="Phone Number"><TI value={form.taxpayer_phone} onChange={set('taxpayer_phone')} type="tel" placeholder="(555) 000-0000" /></F>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="col-span-3"><F label="Street Address"><TI value={form.taxpayer_address_street} onChange={set('taxpayer_address_street')} /></F></div>
            <F label="City"><TI value={form.taxpayer_address_city} onChange={set('taxpayer_address_city')} /></F>
            <F label="State"><TI value={form.taxpayer_address_state} onChange={set('taxpayer_address_state')} placeholder="NY" /></F>
            <F label="ZIP"><TI value={form.taxpayer_address_zip} onChange={set('taxpayer_address_zip')} /></F>
          </div>
        </Sec>

        {/* Filing Status */}
        <Sec title="Filing Status">
          <F label="How do you file?">
            <select value={form.filing_status || ''} onChange={(e) => set('filing_status')(e.target.value)} className="field-input">
              <option value="">Select...</option>
              <option value="single">Single</option>
              <option value="married_filing_jointly">Married — Filing Together</option>
              <option value="married_filing_separately">Married — Filing Separately</option>
              <option value="head_of_household">Head of Household</option>
              <option value="qualifying_widow">Qualifying Widow(er)</option>
            </select>
          </F>
          <div className="mt-3"><Check label="I have a spouse" value={!!form.has_spouse} onChange={set('has_spouse')} /></div>
          {form.has_spouse && (
            <div className="grid grid-cols-2 gap-3 mt-4 pl-4 border-l-2 border-faint">
              <F label="Spouse First Name"><TI value={form.spouse_first_name} onChange={set('spouse_first_name')} /></F>
              <F label="Spouse Last Name"><TI value={form.spouse_last_name} onChange={set('spouse_last_name')} /></F>
              <MaskedSSNField label="Spouse SSN" value={form.spouse_ssn_last4} onChange={set('spouse_ssn_last4')} />
              <F label="Spouse Date of Birth"><TI value={form.spouse_dob} onChange={set('spouse_dob')} placeholder="MM/DD/YYYY" /></F>
              <F label="Spouse Occupation"><TI value={form.spouse_occupation} onChange={set('spouse_occupation')} /></F>
            </div>
          )}

          {/* Dependents */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted tracking-widest uppercase">Dependents (children, parents, etc.)</span>
              <button type="button" onClick={addDependent}
                className="text-xs border border-faint px-3 py-1 hover:border-ink text-muted hover:text-ink transition-colors">+ Add</button>
            </div>
            {(form.dependents || []).map((dep, i) => (
              <div key={i} className="border border-faint p-3 mb-2 grid grid-cols-2 gap-3 relative">
                <button type="button" onClick={() => removeDep(i)} className="absolute top-2 right-2 text-xs text-muted hover:text-red-500">✕</button>
                <F label="Name"><input className="field-input" value={dep.name || ''} onChange={(e) => updateDep(i, 'name', e.target.value)} /></F>
                <F label="Relationship"><input className="field-input" value={dep.relationship || ''} onChange={(e) => updateDep(i, 'relationship', e.target.value)} placeholder="Child / Parent" /></F>
                <F label="Date of Birth"><input className="field-input" value={dep.dob || ''} onChange={(e) => updateDep(i, 'dob', e.target.value)} placeholder="MM/DD/YYYY" /></F>
                <F label="SSN (last 4)"><input className="field-input" value={dep.ssn_last4 || ''} onChange={(e) => updateDep(i, 'ssn_last4', e.target.value)} /></F>
              </div>
            ))}
          </div>
        </Sec>

        {/* Income Sources */}
        <Sec title="Income Sources" subtitle="Check everything that applies to you this year.">
          <div className="grid grid-cols-1 gap-y-2">
            {INCOME_FIELDS.map(([label, field]) => (
              <Check key={field} label={label} value={!!form[field]} onChange={set(field)} />
            ))}
          </div>
          <div className="mt-4">
            <F label="Anything else? Describe any other income.">
              <textarea value={form.other_income_description || ''} onChange={(e) => set('other_income_description')(e.target.value)}
                className="field-input h-16 resize-none" placeholder="e.g. sold furniture, received a gift, lawsuit settlement..." />
            </F>
          </div>
        </Sec>

        {/* Documents */}
        <Sec title="Upload Your Documents" subtitle="Upload any tax documents you have received. W-2s, 1099s, prior year return, etc.">
          <div className="mb-4 flex flex-col gap-2 border border-faint p-4">
            <F label="Document type">
              <select value={pendingUpload.category}
                onChange={(e) => setPendingUpload(p => ({ ...p, category: e.target.value }))}
                className="field-input text-sm">
                {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </F>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setPendingUpload(p => ({ ...p, file: e.target.files[0] || null }))}
              className="text-xs text-muted" />
            <button onClick={handleUpload} disabled={!pendingUpload.file || uploadingDoc}
              className="btn-primary text-xs disabled:opacity-50 mt-1">
              {uploadingDoc ? 'Uploading...' : 'Upload Document →'}
            </button>
          </div>

          {(intake.documents || []).length === 0 ? (
            <div className="text-xs text-muted">No documents uploaded yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {intake.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between border border-faint px-3 py-2">
                  <a href={`${api.getMyDocumentUrl(doc.id)}?token=${encodeURIComponent(token)}`}
                    target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                    <div className="text-xs text-ink truncate">{doc.filename}</div>
                    <div className="text-xs text-muted">{DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}</div>
                  </a>
                  <button onClick={() => handleDeleteDoc(doc.id)} className="text-xs text-muted hover:text-red-500 ml-2">✕</button>
                </div>
              ))}
            </div>
          )}
        </Sec>

        {/* Other Info */}
        <Sec title="A Few More Questions">
          <div className="flex flex-col gap-3">
            <Check label="I had health insurance through the Marketplace (have a 1095-A)" value={!!form.had_aca_marketplace_insurance} onChange={set('had_aca_marketplace_insurance')} />
            <Check label="I made estimated quarterly tax payments during the year" value={!!form.made_estimated_tax_payments} onChange={set('made_estimated_tax_payments')} />
            {form.made_estimated_tax_payments && (
              <div className="ml-6">
                <F label="Total amount paid">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                    <input type="number" min="0" step="0.01" className="field-input pl-7"
                      value={form.estimated_payments_amount || ''}
                      onChange={(e) => set('estimated_payments_amount')(e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                </F>
              </div>
            )}
            <Check label="I have foreign bank accounts or financial accounts" value={!!form.has_foreign_accounts} onChange={set('has_foreign_accounts')} />
            <Check label="I received a letter or notice from the IRS this year" value={!!form.received_irs_notice} onChange={set('received_irs_notice')} />
            {form.received_irs_notice && (
              <div className="ml-6"><F label="Describe the notice">
                <textarea className="field-input h-16 resize-none" value={form.irs_notice_description || ''}
                  onChange={(e) => set('irs_notice_description')(e.target.value)} />
              </F></div>
            )}
          </div>
        </Sec>

        {/* Bank Info */}
        <Sec title="Bank Information for Direct Deposit" subtitle="Where should your refund be deposited?">
          <div className="grid grid-cols-2 gap-4">
            <F label="Account Type">
              <select value={form.bank_account_type || 'checking'} onChange={(e) => set('bank_account_type')(e.target.value)} className="field-input">
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </F>
            <div />
            <SensitiveField label="Routing Number" value={form.bank_routing_number} onChange={set('bank_routing_number')} placeholder="9-digit routing number" />
            <SensitiveField label="Account Number" value={form.bank_account_number} onChange={set('bank_account_number')} placeholder="Account number" />
          </div>
        </Sec>

        {/* Notes */}
        <Sec title="Anything Else?">
          <F label="Notes for your CPA">
            <textarea value={form.additional_notes || ''} onChange={(e) => set('additional_notes')(e.target.value)}
              className="field-input h-20 resize-none" placeholder="Anything your CPA should know — life changes, questions, concerns..." />
          </F>
        </Sec>

        {/* Submit */}
        <div className="border-t border-faint pt-6 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink">Ready to submit?</div>
              <div className="text-xs text-muted mt-0.5">Make sure everything is filled in and your documents are uploaded. You cannot make changes after submitting.</div>
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              className="ml-6 flex-shrink-0 bg-ink text-paper text-xs tracking-widest uppercase px-5 py-3 hover:bg-gray-800 transition-colors disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit to CPA →'}
            </button>
          </div>
        </div>

      </main>
    </div>
  )
}
