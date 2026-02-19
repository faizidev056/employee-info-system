import React from 'react'
import { getAutocompleteToken } from '../../lib/utils'

export default function LocationAssignment({ formData, errors, onChange, ucWardOptions, darkMode }) {
  const selectedUC = ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))

  return (
    <div className="space-y-6">
      {/* Premium Section Header */}
      <div className={`flex items-center gap-3 pb-3 border-b transition-colors duration-300 ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${darkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-100'
          }`}>
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className={`text-base font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Location & Assignment
          </h3>
          <p className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Area mapping and attendance hub</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* UC / Ward */}
        <div className="space-y-2">
          <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex items-center justify-between`}>
            UC / Ward <span className="text-rose-500 font-black ml-1">*</span>
          </label>
          <div className="relative group">
            <select
              id="ucWard"
              name="ucWard"
              value={formData.ucWard}
              onChange={onChange}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 appearance-none cursor-pointer ${darkMode
                ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
                } ${errors.ucWard ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
            >
              <option value="" disabled>Select UC/Ward</option>
              {ucWardOptions.map(uc => (
                <option key={uc.id} value={uc.id}>{uc.name}</option>
              ))}
            </select>
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {errors.ucWard && (
              <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.ucWard}
              </p>
            )}
          </div>
        </div>

        {/* Attendance Point */}
        {formData.ucWard && selectedUC?.attendancePoints.length > 1 && (
          <div className="space-y-2">
            <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Attendance Point <span className="text-rose-500">*</span>
            </label>
            <div className="relative group">
              <select
                id="attendancePoint"
                name="attendancePoint"
                value={formData.attendancePoint}
                onChange={onChange}
                className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 border focus:outline-none focus:ring-4 appearance-none cursor-pointer ${darkMode
                  ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
                  } ${errors.attendancePoint ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
              >
                <option value="" disabled>Select attendance point</option>
                {selectedUC.attendancePoints.map(point => (
                  <option key={point} value={point}>{point}</option>
                ))}
              </select>
              <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {errors.attendancePoint && (
                <p className="text-rose-500 text-xs mt-2 flex items-center gap-1.5 animate-pulse">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.attendancePoint}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info Card for Single Attendance Point */}
        {formData.ucWard && selectedUC?.attendancePoints.length === 1 && (
          <div className="space-y-2">
            <label className={`block text-sm font-bold tracking-wide transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Assigned Point
            </label>
            <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 transition-colors duration-300 ${darkMode ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-bold">{selectedUC.attendancePoints[0]}</span>
            </div>
          </div>
        )}
      </div>

      {formData.ucWard && (
        <div className={`p-4 rounded-2xl border flex items-start gap-4 transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100 shadow-inner'
          }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Assignment</h4>
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              {selectedUC.name} <span className="mx-2 text-slate-400 opacity-50">•</span>
              <span className="font-bold text-blue-500">{formData.attendancePoint || selectedUC.attendancePoints[0]}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
