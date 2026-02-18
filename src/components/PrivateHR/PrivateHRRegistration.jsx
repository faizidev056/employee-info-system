import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PersonalInfo from '../WorkerFormParts/PersonalInfo'
import Identification from '../WorkerFormParts/Identification'
import AddressSection from '../WorkerFormParts/AddressSection'
import SubmitButton from '../WorkerFormParts/SubmitButton'
import DatePicker from '../WorkerFormParts/DatePicker'
import { getAutocompleteToken } from '../../lib/utils'

export default function PrivateHRRegistration({ supabase }) {
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
      className="flex items-center justify-center py-6"
    >
      <div className="relative z-10 w-full max-w-4xl">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative bg-white border border-gray-200 rounded-3xl p-8 md:p-12 shadow-2xl shadow-slate-900/5 overflow-hidden text-slate-900"
        >
          {/* Header */}
          <div className="relative z-10 mb-8 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 01-2 2h20a2 2 0 01-2-2V5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Private HR Registration
                </h1>
                <p className="text-slate-500 text-sm mt-1">Manual entry for private employee documentation</p>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2"
              >
                <span>⚠</span> {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm flex items-center gap-2"
              >
                <span>✓</span> {success}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-10" autoComplete={getAutocompleteToken()}>
            {/* Sections */}
            <PersonalInfo formData={formData} errors={errors} onChange={handleChange} />

            <Identification formData={formData} errors={errors} onChange={handleChange} />

            {/* Manual Employment Details (Customized to be editable) */}
            <div className="space-y-4 pt-6">
              <h2 className="text-slate-900 text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 border border-amber-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                Employment Info (Manual)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">Designation <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g. Accountant"
                    className={`w-full px-3 py-2.5 bg-white border ${errors.designation ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
                </div>

                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">Employee Code</label>
                  <input
                    type="text"
                    name="employeeCode"
                    value={formData.employeeCode}
                    onChange={handleChange}
                    placeholder="Enter code"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">Salary (PKR)</label>
                  <input
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="Amount"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-2">Joining Date <span className="text-red-400">*</span></label>
                <DatePicker
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                  error={errors.joiningDate}
                />
                {errors.joiningDate && <p className="text-red-500 text-xs mt-1">{errors.joiningDate}</p>}
              </div>
            </div>

            <AddressSection formData={formData} onChange={handleChange} />

            <div className="pt-8">
              <SubmitButton loading={loading} />
            </div>
          </form>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-slate-400 text-sm italic font-medium">
              Information is stored in the Private HR secure repository.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
