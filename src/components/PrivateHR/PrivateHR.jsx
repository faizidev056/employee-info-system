import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabaseClient'

export default function PrivateHR() {
  const [activeTab, setActiveTab] = useState('registration')
  const [form, setForm] = useState({ fullName: '', cnic: '', phone: '', designation: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    // Basic validation
    if (!form.fullName.trim() || !form.cnic.trim()) {
      setError('Please provide full name and CNIC')
      return
    }

    try {
      setLoading(true)
      // Try inserting into `private_hr` table if it exists; otherwise catch error
      const { error } = await supabase.from('private_hr').insert([{ full_name: form.fullName, cnic: form.cnic, phone: form.phone, designation: form.designation }])
      if (error) throw error
      setSuccess('Private HR record created')
      setForm({ fullName: '', cnic: '', phone: '', designation: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.warn('Insert error (table may not exist):', err)
      setError(err.message || 'Failed to save — table may not exist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <div className="w-72 bg-white border-r border-gray-200 flex-shrink-0 p-4">
        <h3 className="text-lg font-bold mb-4">Private HR</h3>
        <div className="space-y-2">
          <button onClick={() => setActiveTab('registration')} className={`w-full text-left px-3 py-2 rounded ${activeTab==='registration' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>Registration</button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence>
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
            <div className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-2">Private HR — Registration</h2>
              <p className="text-slate-500 text-sm mb-4">Register a private HR record (separate from main workers table).</p>

              {error && <div className="mb-3 p-3 bg-red-50 text-red-600 rounded">{error}</div>}
              {success && <div className="mb-3 p-3 bg-green-50 text-green-600 rounded">{success}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Full Name</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">CNIC</label>
                  <input name="cnic" value={form.cnic} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Phone</label>
                    <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Designation</label>
                    <input name="designation" value={form.designation} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded">{loading ? 'Saving...' : 'Register'}</button>
                </div>
              </form>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
