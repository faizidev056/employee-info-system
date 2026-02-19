import React from 'react'
import { getAutocompleteToken } from '../../lib/utils'

export default function VehicleInfo({ formData, errors, onChange, darkMode }) {
  return (
    <div className="space-y-6">
      {/* Premium Section Header */}
      <div className={`flex items-center gap-3 pb-3 border-b transition-colors duration-300 ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${darkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-100'
          }`}>
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        </div>
        <div>
          <h3 className={`text-base font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Vehicle Information
          </h3>
          <p className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assigned transport details</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Vehicle Code <span className="text-rose-500">*</span>
        </label>
        <div className="relative group max-w-md">
          <input
            type="text"
            name="vehicleCode"
            value={formData.vehicleCode}
            onChange={onChange}
            placeholder="e.g., VEH-2026-001"
            autoComplete="new-password"
            readOnly
            onFocus={(e) => e.target.removeAttribute('readonly')}
            className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 font-mono ${darkMode
              ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-blue-500/10'
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
              } ${errors.vehicleCode ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          {errors.vehicleCode && (
            <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.vehicleCode}
            </p>
          )}
        </div>
        <p className={`text-[10px] font-medium italic mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Registration code of the heavy machinery or light vehicle assigned.
        </p>
      </div>
    </div>
  )
}
