import React from 'react'
import { getAutocompleteToken } from '../../lib/utils'

export default function AddressSection({ formData, onChange, darkMode }) {
  return (
    <div className="space-y-6">
      {/* Premium Section Header */}
      <div className={`flex items-center gap-3 pb-3 border-b transition-colors duration-300 ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${darkMode ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
          }`}>
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <h3 className={`text-base font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Permanent Address
          </h3>
          <p className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Residential contact info</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Complete Address
        </label>
        <div className="relative group">
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={onChange}
            rows="3"
            placeholder="Enter full street, city and house details..."
            autoComplete="new-password"
            readOnly
            onFocus={(e) => e.target.removeAttribute('readonly')}
            className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 resize-none ${darkMode
              ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-blue-500/10'
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
              }`}
          ></textarea>
          <div className={`absolute right-4 bottom-4 pointer-events-none transition-colors duration-300 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
