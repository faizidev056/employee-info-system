import React from 'react'
import DatePicker from './DatePicker'

export default function Identification({ formData, errors, onChange }) {
  return (
    <div className="space-y-4 pt-6">
      <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-gray-800">Identification</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">CNIC Number <span className="text-red-400">*</span></label>
          <input
            type="text"
            name="cnic"
            value={formData.cnic}
            onChange={onChange}
            placeholder="00000-0000000-0"
            className={`w-full px-3 py-2 bg-black border ${errors.cnic ? 'border-red-600' : 'border-gray-700'} rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors`}
          />
          {errors.cnic && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.cnic}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">CNIC Issue Date</label>
          <DatePicker
            name="cnicIssueDate"
            value={formData.cnicIssueDate}
            onChange={onChange}
            placeholder="Select issue date"
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">CNIC Expiry Date</label>
          <DatePicker
            name="cnicExpiryDate"
            value={formData.cnicExpiryDate}
            onChange={onChange}
            placeholder="Select expiry date"
          />
        </div>
      </div>
    </div>
  )
}
