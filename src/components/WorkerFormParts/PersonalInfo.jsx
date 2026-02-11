import React from 'react'
import DatePicker from './DatePicker'
import { getAutocompleteToken } from '../../lib/utils'

export default function PersonalInfo({ formData, errors, onChange }) {
  return (
    <div className="space-y-4">
      <h2 className="text-slate-900 text-lg font-semibold flex items-center gap-2 mb-4">
        <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </span>
        Personal Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={onChange}
            placeholder="Enter full name"
            autoComplete="new-password"
            readOnly
            onFocus={(e) => { e.target.removeAttribute('readonly'); e.target.setAttribute('data-focused', 'true') }}
            onBlur={(e) => { e.target.removeAttribute('data-focused') }}
            className={`w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm border ${errors.fullName ? 'border-red-500' : 'border-white/60'} rounded-xl text-slate-950 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm shadow-blue-500/5`}
          />
          {errors.fullName && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.fullName}</p>
          )}
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">
            Father's Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="fatherName"
            value={formData.fatherName}
            onChange={onChange}
            placeholder="Enter father's name"
            autoComplete="new-password"
            readOnly
            onFocus={(e) => { e.target.removeAttribute('readonly'); e.target.setAttribute('data-focused', 'true') }}
            onBlur={(e) => { e.target.removeAttribute('data-focused') }}
            className={`w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm border ${errors.fatherName ? 'border-red-500' : 'border-white/60'} rounded-xl text-slate-950 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm shadow-blue-500/5`}
          />
          {errors.fatherName && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.fatherName}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">
            Date of Birth <span className="text-red-400">*</span>
          </label>
          <DatePicker
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={onChange}
            placeholder="YYYY-MM-DD or select date"
            error={errors.dateOfBirth}
          />
          {errors.dateOfBirth && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.dateOfBirth}</p>
          )}
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">
            Religion <span className="text-red-400">*</span>
          </label>
          <select
            name="religion"
            value={formData.religion}
            onChange={onChange}
            autoComplete="off"
            className={`w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm border ${errors.religion ? 'border-red-500' : 'border-white/60'} rounded-xl text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm shadow-blue-500/5`}
          >
            <option value="" className="bg-white text-slate-900">Select religion</option>
            <option value="Islam" className="bg-white text-slate-900">Islam</option>
            <option value="Christian" className="bg-white text-slate-900">Christian</option>
            <option value="Valmiki" className="bg-white text-slate-900">Valmiki</option>
            <option value="Others" className="bg-white text-slate-900">Others</option>
          </select>
          {errors.religion && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.religion}</p>
          )}
        </div>

        <div>
          <label className="block text-slate-700 text-sm font-semibold mb-2">Phone Number <span className="text-red-400">*</span></label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={onChange}
            placeholder="+92 300 0000000"
            autoComplete={getAutocompleteToken()}
            onFocus={(e) => { e.target.setAttribute('data-focused', 'true') }}
            onBlur={(e) => { e.target.removeAttribute('data-focused') }}
            className={`w-full px-3 py-2.5 bg-white/50 backdrop-blur-sm border ${errors.phoneNumber ? 'border-red-500' : 'border-white/60'} rounded-xl text-slate-950 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm shadow-blue-500/5`}
          />
          {errors.phoneNumber && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.phoneNumber}</p>
          )}
        </div>
      </div>
    </div>
  )
}
