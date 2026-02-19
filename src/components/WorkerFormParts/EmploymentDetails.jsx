import React from 'react'
import DatePicker from './DatePicker'
import { getAutocompleteToken } from '../../lib/utils'

export default function EmploymentDetails({ formData, errors, onChange, darkMode }) {
  return (
    <div className="space-y-6">
      {/* Premium Section Header */}
      <div className={`flex items-center gap-3 pb-3 border-b transition-colors duration-300 ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${darkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
          </svg>
        </div>
        <div>
          <h3 className={`text-base font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Employment Details
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Designation */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Designation <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <select
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={onChange}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 appearance-none cursor-pointer ${darkMode
                ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
                } ${errors.designation ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
            >
              <option value="" disabled>Select role</option>
              <option value="Sanitary Supervisor">Sanitary Supervisor</option>
              <option value="Helper">Helper</option>
              <option value="Sanitary Worker">Sanitary Worker</option>
              <option value="Driver">Driver</option>
            </select>
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {errors.designation && (
              <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.designation}
              </p>
            )}
          </div>
        </div>

        {/* Employee Code */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex items-center justify-between`}>
            Employee Code
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${darkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>Auto</span>
          </label>
          <input
            type="text"
            name="employeeCode"
            value={formData.employeeCode}
            readOnly
            placeholder="Pending designation..."
            className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border font-mono cursor-not-allowed ${darkMode
              ? 'bg-white/5 border-white/10 text-slate-400 placeholder-slate-600'
              : 'bg-slate-100 border-slate-200 text-slate-500 placeholder-slate-400 shadow-inner'
              }`}
          />
        </div>

        {/* Salary */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex items-center justify-between`}>
            Monthly Salary (PKR)
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${darkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>Fixed</span>
          </label>
          <input
            type="text"
            name="salary"
            value={formData.salary}
            readOnly
            placeholder="Pending designation..."
            className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border font-bold cursor-not-allowed ${darkMode
              ? 'bg-white/5 border-white/10 text-slate-400 placeholder-slate-600'
              : 'bg-slate-100 border-slate-200 text-slate-500 placeholder-slate-400 shadow-inner'
              }`}
          />
        </div>
      </div>

      {/* Joining Date */}
      <div className="space-y-2">
        <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Joining Date <span className="text-rose-500">*</span>
        </label>
        <div className="max-w-md">
          <DatePicker
            name="joiningDate"
            value={formData.joiningDate}
            onChange={onChange}
            placeholder="DD/MM/YYYY"
            error={errors.joiningDate}
            darkMode={darkMode}
          />
          {errors.joiningDate && (
            <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.joiningDate}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
