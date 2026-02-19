import React from 'react'
import DatePicker from './DatePicker'
import { getAutocompleteToken } from '../../lib/utils'

export default function PersonalInfo({ formData, errors, onChange, darkMode }) {
  return (
    <div className="space-y-6">
      {/* Premium Section Header */}
      <div className={`flex items-center gap-3 pb-3 border-b transition-colors duration-300 ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${darkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'
          }`}>
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h3 className={`text-base font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Personal Information
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Full Name */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={onChange}
              placeholder="Enter full name"
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 ${darkMode
                ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
                } ${errors.fullName ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
            />
            {errors.fullName && (
              <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.fullName}
              </p>
            )}
          </div>
        </div>

        {/* Father's Name */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Father's Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <input
              type="text"
              id="fatherName"
              name="fatherName"
              value={formData.fatherName}
              onChange={onChange}
              placeholder="Enter father's name"
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 ${darkMode
                ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
                } ${errors.fatherName ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
            />
            {errors.fatherName && (
              <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.fatherName}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Date of Birth */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Date of Birth <span className="text-rose-500">*</span>
          </label>
          <DatePicker
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={onChange}
            placeholder="DD/MM/YYYY"
            error={errors.dateOfBirth}
            darkMode={darkMode}
          />
          {errors.dateOfBirth && (
            <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.dateOfBirth}
            </p>
          )}
        </div>

        {/* Religion */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Religion <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <select
              id="religion"
              name="religion"
              value={formData.religion}
              onChange={onChange}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 appearance-none cursor-pointer ${darkMode
                ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
                } ${errors.religion ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
            >
              <option value="" disabled>Select religion</option>
              <option value="Islam">Islam</option>
              <option value="Christian">Christian</option>
              <option value="Valmiki">Valmiki</option>
              <option value="Others">Others</option>
            </select>
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {errors.religion && (
              <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.religion}
              </p>
            )}
          </div>
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Phone Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={onChange}
              placeholder="+92 XXX XXXXXXX"
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 ${darkMode
                ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
                } ${errors.phoneNumber ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
            />
            {errors.phoneNumber && (
              <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.phoneNumber}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
