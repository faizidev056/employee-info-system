import React from 'react'

export default function AddressSection({ formData, onChange }) {
  return (
    <div className="space-y-4 pt-6 border-t border-white/10">
      <h2 className="text-cyan-400 text-lg font-semibold flex items-center gap-2 mb-4">
        <span className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </span>
        Address
      </h2>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Complete Address</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={onChange}
          rows="3"
          placeholder="Enter complete address"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10 resize-none"
        ></textarea>
      </div>
    </div>
  )
}
