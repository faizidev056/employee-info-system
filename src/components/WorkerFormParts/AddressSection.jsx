import React from 'react'
import { getAutocompleteToken } from '../../lib/utils'

export default function AddressSection({ formData, onChange }) {
  return (
    <div className="space-y-4 pt-6 border-t border-gray-100">
      <h2 className="text-slate-900 text-lg font-semibold flex items-center gap-2 mb-4">
        <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </span>
        Address
      </h2>

      <div>
        <label className="block text-slate-700 text-sm font-semibold mb-2">Complete Address</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={onChange}
          rows="3"
          placeholder="Enter complete address"
          autoComplete={getAutocompleteToken()}
          onFocus={(e) => { e.target.setAttribute('data-focused', 'true') }}
          onBlur={(e) => { e.target.removeAttribute('data-focused') }}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 resize-none shadow-sm"
        ></textarea>
      </div>
    </div>
  )
}
