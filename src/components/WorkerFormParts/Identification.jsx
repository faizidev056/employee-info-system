import React from 'react'
import DatePicker from './DatePicker'
import { getAutocompleteToken } from '../../lib/utils'

export default function Identification({ formData, errors, onChange }) {
  const formatCnic = (value) => {
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '')

    // Limit to 13 digits maximum
    const limited = digitsOnly.slice(0, 13)

    // Format as XXXXX-XXXXXXX-X
    if (limited.length <= 5) {
      return limited
    } else if (limited.length <= 12) {
      return `${limited.slice(0, 5)}-${limited.slice(5)}`
    } else {
      return `${limited.slice(0, 5)}-${limited.slice(5, 12)}-${limited.slice(12)}`
    }
  }

  const handleCnicChange = (e) => {
    const value = e.target.value
    const formatted = formatCnic(value)

    // Create a synthetic event with the formatted value
    const syntheticEvent = {
      target: {
        name: 'cnic',
        value: formatted
      }
    }

    // Call the parent onChange with formatted value
    onChange(syntheticEvent)
  }

  return (
    <div className="space-y-4 pt-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-gray-100">Identification</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">CNIC Number <span className="text-red-400">*</span></label>
          <input
            type="text"
            name="cnic"
            value={formData.cnic}
            onChange={handleCnicChange}
            placeholder="00000-0000000-0"
            autoComplete={getAutocompleteToken()}
            readOnly
            onFocus={(e) => { e.target.removeAttribute('readonly'); e.target.setAttribute('data-focused', 'true') }}
            onBlur={(e) => { e.target.removeAttribute('data-focused') }}
            className={`w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm border ${errors.cnic ? 'border-red-500' : 'border-white/60'} rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono shadow-sm shadow-blue-500/5`}
          />
          {errors.cnic && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.cnic}</p>
          )}
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">CNIC Issue Date</label>
          <DatePicker
            name="cnicIssueDate"
            value={formData.cnicIssueDate}
            onChange={onChange}
            placeholder="YYYY-MM-DD or select date"
          />
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">CNIC Expiry Date</label>
          <DatePicker
            name="cnicExpiryDate"
            value={formData.cnicExpiryDate}
            onChange={onChange}
            placeholder="YYYY-MM-DD or select date"
          />
        </div>
      </div>
    </div>
  )
}
