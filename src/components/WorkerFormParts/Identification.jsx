import React from 'react'
import DatePicker from './DatePicker'
import { getAutocompleteToken } from '../../lib/utils'

export default function Identification({ formData, errors, onChange, darkMode }) {
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
    <div className="space-y-6">
      {/* Premium Section Header */}
      <div className={`flex items-center gap-3 pb-3 border-b transition-colors duration-300 ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${darkMode ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
          }`}>
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        </div>
        <div>
          <h3 className={`text-base font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Identification
          </h3>
          <p className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Official document details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CNIC Number */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            CNIC Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <input
              type="text"
              id="cnic"
              name="cnic"
              value={formData.cnic}
              onChange={handleCnicChange}
              placeholder="00000-0000000-0"
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 font-mono ${darkMode
                ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
                } ${errors.cnic ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
            />
            {errors.cnic && (
              <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.cnic}
              </p>
            )}
          </div>
        </div>

        {/* CNIC Issue Date */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            CNIC Issue Date
          </label>
          <DatePicker
            name="cnicIssueDate"
            value={formData.cnicIssueDate}
            onChange={onChange}
            placeholder="DD/MM/YYYY"
            darkMode={darkMode}
          />
        </div>

        {/* CNIC Expiry Date */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            CNIC Expiry Date
          </label>
          <DatePicker
            name="cnicExpiryDate"
            value={formData.cnicExpiryDate}
            onChange={onChange}
            placeholder="DD/MM/YYYY"
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  )
}
