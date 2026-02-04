import React from 'react'
import DatePicker from './DatePicker'
import { getAutocompleteToken } from '../../lib/utils' 

export default function EmploymentDetails({ formData, errors, onChange }) {
  return (
    <div className="space-y-4 pt-6">
      <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-gray-800">Employment Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Designation <span className="text-red-400">*</span></label>
          <select
            name="designation"
            value={formData.designation}
            onChange={onChange}
            autoComplete={getAutocompleteToken()}
            className={`w-full px-3 py-2 bg-black border ${errors.designation ? 'border-red-600' : 'border-gray-700'} rounded-md text-white text-sm focus:outline-none focus:border-gray-500 transition-colors appearance-none cursor-pointer`}
          >
            <option value="" className="bg-gray-900">Select designation</option>
            <option value="Sanitary Supervisor" className="bg-gray-900">Sanitary Supervisor</option>
            <option value="Helper" className="bg-gray-900">Helper</option>
            <option value="Sanitary Worker" className="bg-gray-900">Sanitary Worker</option>
            <option value="Driver" className="bg-gray-900">Driver</option>
          </select>
          {errors.designation && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.designation}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">Employee Code
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">Auto-generated</span>
          </label>
          <input
            type="text"
            name="employeeCode"
            value={formData.employeeCode}
            readOnly
            placeholder="Select designation first"
            className="w-full px-3 py-2 bg-zinc-950 border border-gray-700 rounded-md text-gray-400 text-sm placeholder-gray-600 focus:outline-none cursor-not-allowed font-mono"
          />
          {errors.employeeCode && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.employeeCode}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">Salary (PKR)
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">Auto-filled</span>
          </label>
          <input
            type="text"
            name="salary"
            value={formData.salary}
            readOnly
            placeholder="Select designation first"
            className="w-full px-3 py-2 bg-zinc-950 border border-gray-700 rounded-md text-gray-400 text-sm placeholder-gray-600 focus:outline-none cursor-not-allowed"
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Joining Date <span className="text-red-400">*</span></label>
        <DatePicker
          name="joiningDate"
          value={formData.joiningDate}
          onChange={onChange}
          placeholder="YYYY-MM-DD or select date"
          error={errors.joiningDate}
        />
        {errors.joiningDate && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.joiningDate}</p>
        )}
      </div>
    </div>
  )
}
