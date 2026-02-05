import React from 'react'
import { getAutocompleteToken } from '../../lib/utils'

export default function VehicleInfo({ formData, errors, onChange }) {
  return (
    <div className="space-y-4 pt-6 border-t border-gray-100">
      <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-gray-100">Vehicle Information</h2>

      <div>
        <label className="block text-slate-700 text-sm font-semibold mb-2">Vehicle Code <span className="text-red-400">*</span></label>
        <input
          type="text"
          name="vehicleCode"
          value={formData.vehicleCode}
          onChange={onChange}
          placeholder="Enter vehicle code (e.g., VEH-2026-001)"
          autoComplete={getAutocompleteToken()}
          onFocus={(e) => { e.target.setAttribute('data-focused', 'true') }}
          onBlur={(e) => { e.target.removeAttribute('data-focused') }}
          className={`w-full px-4 py-3 bg-white border ${errors.vehicleCode ? 'border-red-500' : 'border-gray-300'} rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm`}
        />
        {errors.vehicleCode && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.vehicleCode}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">Required for driver designation</p>
      </div>
    </div>
  )
}
