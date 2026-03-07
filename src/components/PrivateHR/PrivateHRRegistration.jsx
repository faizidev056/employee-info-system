import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PersonalInfo from '../WorkerFormParts/PersonalInfo'
import Identification from '../WorkerFormParts/Identification'
import AddressSection from '../WorkerFormParts/AddressSection'
import SubmitButton from '../WorkerFormParts/SubmitButton'
import DatePicker from '../WorkerFormParts/DatePicker'
import { getAutocompleteToken } from '../../lib/utils'

export default function PrivateHRRegistration({ supabase, darkMode }) {
  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    dateOfBirth: '',
    religion: '',
    phoneNumber: '',
    cnic: '',
    cnicIssueDate: '',
    cnicExpiryDate: '',
    designation: '',
    employeeCode: '',
    salary: '',
    joiningDate: '',
    address: ''
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name required'
    if (!formData.cnic.trim()) newErrors.cnic = 'CNIC required'
    if (!formData.designation.trim()) newErrors.designation = 'Designation required'
    if (!formData.joiningDate) newErrors.joiningDate = 'Joining date required'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const newErrors = validate()
    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)
      const normalizeDate = (val) => {
        if (!val) return null
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
        const d = new Date(val)
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
        return null
      }

      const salaryNum = formData.salary ? parseInt(String(formData.salary).replace(/,/g, '')) : null

      const payload = {
        full_name: formData.fullName,
        father_name: formData.fatherName,
        date_of_birth: normalizeDate(formData.dateOfBirth),
        religion: formData.religion,
        phone_number: formData.phoneNumber,
        cnic: formData.cnic,
        cnic_issue_date: normalizeDate(formData.cnicIssueDate),
        cnic_expiry_date: normalizeDate(formData.cnicExpiryDate),
        designation: formData.designation,
        employee_code: formData.employeeCode || null,
        salary: Number.isFinite(salaryNum) ? salaryNum : null,
        joining_date: normalizeDate(formData.joiningDate),
        address: formData.address || null,
        status: 'Active'
      }

      if (supabase && supabase.from) {
        const { error: insertError } = await supabase.from('private_hr').insert([payload])
        if (insertError) throw insertError
      }

      setSuccess('Private HR record saved successfully')
      setFormData({
        fullName: '', fatherName: '', dateOfBirth: '', religion: '', phoneNumber: '', cnic: '', cnicIssueDate: '', cnicExpiryDate: '', designation: '', employeeCode: '', salary: '', joiningDate: '', address: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center"
    >
      <div className="relative z-10 w-full max-w-4xl">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className={`relative border rounded-[2.5rem] p-8 md:p-12 shadow-2xl transition-all duration-300 overflow-hidden ${darkMode
              ? 'bg-slate-900/40 backdrop-blur-3xl border-white/10 text-white shadow-indigo-900/20'
              : 'bg-white border-purple-100 text-slate-900 shadow-purple-900/5'
            }`}
        >
          {/* Header */}
          <div className={`relative z-10 mb-10 pb-8 border-b transition-colors duration-300 ${darkMode ? 'border-white/10' : 'border-purple-50'}`}>
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${darkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-600'
                }`}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 01-2 2h20a2 2 0 01-2-2V5z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Personnel Registration
                </h1>

              </div>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-sm flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">!</span> {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-sm flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span> {success}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-12" autoComplete={getAutocompleteToken()}>
            <PersonalInfo formData={formData} errors={errors} onChange={handleChange} darkMode={darkMode} />
            <Identification formData={formData} errors={errors} onChange={handleChange} darkMode={darkMode} />

            {/* Employment Info */}
            <div className="space-y-6">
              <div className={`flex items-center gap-3 pb-3 border-b transition-colors duration-300 ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ${darkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600'
                  }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className={`text-base font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Employment Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className={`block text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Designation *</label>
                  <input type="text" name="designation" value={formData.designation} onChange={handleChange} className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 ${darkMode ? 'bg-white/5 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/10' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500/50 focus:ring-purple-500/10 shadow-sm shadow-purple-500/5'}`} placeholder="e.g. Supervisor" />
                  {errors.designation && <p className="text-rose-500 text-[10px] font-bold mt-1">{errors.designation}</p>}
                </div>
                <div className="space-y-2">
                  <label className={`block text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Employee Code</label>
                  <input type="text" name="employeeCode" value={formData.employeeCode} onChange={handleChange} className={`w-full px-4 py-3 rounded-xl text-sm font-mono transition-all duration-300 border focus:outline-none focus:ring-4 ${darkMode ? 'bg-white/5 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/10' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500/50 focus:ring-purple-500/10 shadow-sm shadow-purple-500/5'}`} placeholder="CODE-001" />
                </div>
                <div className="space-y-2">
                  <label className={`block text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Salary (PKR)</label>
                  <input type="text" name="salary" value={formData.salary} onChange={handleChange} className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 ${darkMode ? 'bg-white/5 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/10' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500/50 focus:ring-purple-500/10 shadow-sm shadow-purple-500/5'}`} placeholder="Amount" />
                </div>
              </div>

              <div className="space-y-2">
                <label className={`block text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Joining Date *</label>
                <DatePicker name="joiningDate" value={formData.joiningDate} onChange={handleChange} darkMode={darkMode} error={errors.joiningDate} />
              </div>
            </div>

            <AddressSection formData={formData} onChange={handleChange} darkMode={darkMode} />

            <div className="pt-8">
              <SubmitButton loading={loading} darkMode={darkMode} />
            </div>
          </form>

          <div className={`mt-12 pt-8 border-t text-center transition-colors duration-300 ${darkMode ? 'border-white/5' : 'border-purple-50'}`}>
            <p className={`text-xs italic font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Locked Record: Encrypted and stored in the HR secure repository.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
