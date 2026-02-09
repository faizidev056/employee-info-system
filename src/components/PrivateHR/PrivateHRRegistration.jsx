import React, { useState, useRef } from 'react'
import DatePicker from '../WorkerFormParts/DatePicker'

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
    }
  }

  const submitAllowedRef = useRef(false)

  const validate = () => {
    const newErrors = {}
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name required'
    if (!formData.cnic.trim()) newErrors.cnic = 'CNIC required'
    if (!formData.designation.trim()) newErrors.designation = 'Designation required'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!submitAllowedRef.current) {
      console.warn('Submit prevented: not triggered by Register button')
      return
    }
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
        // Accept YYYY-MM-DD strictly
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
        address: formData.address || null
      }

      if (supabase && supabase.from) {
        const { error: insertError, data: insertData } = await supabase.from('private_hr').insert([payload]).select()
        if (insertError) {
          console.error('Insert error details:', insertError)
          throw insertError
        }
        console.log('Inserted private_hr row:', insertData)
      }

      setSuccess('Private HR record saved')
      setFormData({
        fullName: '', fatherName: '', dateOfBirth: '', religion: '', phoneNumber: '', cnic: '', cnicIssueDate: '', cnicExpiryDate: '', designation: '', employeeCode: '', salary: '', joiningDate: '', address: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to save')
    } finally {
      setLoading(false)
      submitAllowedRef.current = false
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <h2 className="text-2xl font-semibold mb-2">Private HR — Registration (Manual)</h2>
      <p className="text-slate-500 text-sm mb-4">Fill the form manually. All fields are editable.</p>

      {error && <div className="mb-3 p-3 bg-red-50 text-red-600 rounded">{error}</div>}
      {success && <div className="mb-3 p-3 bg-green-50 text-green-600 rounded">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Full Name</label>
            <input name="fullName" value={formData.fullName} onChange={handleChange} onKeyDown={handleKeyDown} className={`w-full px-3 py-2 border rounded ${errors.fullName ? 'border-red-500' : 'border-gray-200'}`} />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Father's Name</label>
            <input name="fatherName" value={formData.fatherName} onChange={handleChange} onKeyDown={handleKeyDown} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Date of Birth</label>
            <DatePicker name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Religion</label>
            <select name="religion" value={formData.religion} onChange={handleChange} onKeyDown={handleKeyDown} className="w-full px-3 py-2 border rounded">
              <option value="">Select</option>
              <option value="Islam">Islam</option>
              <option value="Christian">Christian</option>
              <option value="Valmiki">Valmiki</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Phone</label>
            <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} onKeyDown={handleKeyDown} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">CNIC</label>
            <input name="cnic" value={formData.cnic} onChange={handleChange} onKeyDown={handleKeyDown} className={`w-full px-3 py-2 border rounded ${errors.cnic ? 'border-red-500' : 'border-gray-200'}`} />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">CNIC Issue Date</label>
            <DatePicker name="cnicIssueDate" value={formData.cnicIssueDate} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">CNIC Expiry Date</label>
            <DatePicker name="cnicExpiryDate" value={formData.cnicExpiryDate} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Designation</label>
            <input name="designation" value={formData.designation} onChange={handleChange} onKeyDown={handleKeyDown} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Employee Code</label>
            <input name="employeeCode" value={formData.employeeCode} onChange={handleChange} onKeyDown={handleKeyDown} className="w-full px-3 py-2 border rounded font-mono" />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Salary</label>
            <input name="salary" value={formData.salary} onChange={handleChange} onKeyDown={handleKeyDown} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Joining Date</label>
          <DatePicker name="joiningDate" value={formData.joiningDate} onChange={handleChange} />
        </div>

        {/* UC/Ward, Attendance Point, and Vehicle Code removed */}

        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Address</h3>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
            placeholder="Enter complete address"
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="submit" onMouseDown={() => (submitAllowedRef.current = true)} disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded">{loading ? 'Saving...' : 'Register'}</button>
        </div>
      </form>
    </div>
  )
}
