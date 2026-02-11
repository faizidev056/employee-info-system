import React from 'react'
import DatePicker from './DatePicker'
import { getAutocompleteToken } from '../../lib/utils'

export default function EmploymentDetails({ formData, errors, onChange }) {
  return (
    <div className="space-y-4 pt-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-gray-100">Employment Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">Designation <span className="text-red-400">*</span></label>
          <select
            name="designation"
            value={formData.designation}
            onChange={onChange}
            autoComplete={getAutocompleteToken()}
            className={`w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm border ${errors.designation ? 'border-red-500' : 'border-white/60'} rounded-xl text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm shadow-blue-500/5`}
          >
            <option value="" className="bg-white text-slate-900">Select designation</option>
            <option value="Sanitary Supervisor" className="bg-white text-slate-900">Sanitary Supervisor</option>
            <option value="Helper" className="bg-white text-slate-900">Helper</option>
            <option value="Sanitary Worker" className="bg-white text-slate-900">Sanitary Worker</option>
            <option value="Driver" className="bg-white text-slate-900">Driver</option>
          </select>
          {errors.designation && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.designation}</p>
          )}
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2 flex items-center gap-2">Employee Code
            <span className="text-xs text-slate-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">Auto-generated</span>
          </label>
          <input
            type="text"
            name="employeeCode"
            value={formData.employeeCode}
            readOnly
            placeholder="Select designation first"
            className="w-full px-3 py-2.5 bg-gray-50/50 backdrop-blur-sm border border-gray-200/60 rounded-xl text-slate-500 text-sm placeholder-slate-400 focus:outline-none cursor-not-allowed font-mono shadow-sm"
          />
          {errors.employeeCode && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.employeeCode}</p>
          )}
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2 flex items-center gap-2">Salary (PKR)
            <span className="text-xs text-slate-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">Auto-filled</span>
          </label>
          <input
            type="text"
            name="salary"
            value={formData.salary}
            readOnly
            placeholder="Select designation first"
            className="w-full px-3 py-2.5 bg-gray-50/50 backdrop-blur-sm border border-gray-200/60 rounded-xl text-slate-500 text-sm placeholder-slate-400 focus:outline-none cursor-not-allowed shadow-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-slate-700 text-sm font-semibold mb-2">Joining Date <span className="text-red-400">*</span></label>
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
