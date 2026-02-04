import React from 'react'
import { getAutocompleteToken } from '../../lib/utils' 

export default function LocationAssignment({ formData, errors, onChange, ucWardOptions }) {
  return (
    <div className="space-y-4 pt-6">
      <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-gray-800">Location & Assignment
        <span className="text-xs text-gray-500 font-normal ml-2">(Maps to attendance point)</span>
      </h2>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">UC / Ward <span className="text-red-400">*</span>
          <span className="text-xs text-gray-500 ml-2">(Will be dynamically connected)</span>
        </label>
        <select
          name="ucWard"
          value={formData.ucWard}
          onChange={onChange}
          autoComplete={getAutocompleteToken()}
          className={`w-full px-3 py-2 bg-black border ${errors.ucWard ? 'border-red-600' : 'border-gray-700'} rounded-md text-white text-sm focus:outline-none focus:border-gray-500 transition-colors appearance-none cursor-pointer`}
        >
          <option value="" className="bg-gray-900">Select UC/Ward</option>
          {ucWardOptions.map(uc => (
            <option key={uc.id} value={uc.id} className="bg-gray-900">{uc.name}</option>
          ))}
        </select>
        {errors.ucWard && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.ucWard}</p>
        )}

        {formData.ucWard && ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))?.attendancePoints.length > 1 && (
          <div className="mt-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">Attendance Point <span className="text-red-400">*</span></label>
            <select
              name="attendancePoint"
              value={formData.attendancePoint}
              onChange={onChange}
              autoComplete={getAutocompleteToken()}
              className={`w-full px-3 py-2 bg-black border ${errors.attendancePoint ? 'border-red-600' : 'border-gray-700'} rounded-md text-white text-sm focus:outline-none focus:border-gray-500 transition-colors appearance-none cursor-pointer`}
            >
              <option value="" className="bg-gray-900">Select attendance point</option>
              {ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))?.attendancePoints.map(point => (
                <option key={point} value={point} className="bg-gray-900">{point}</option>
              ))}
            </select>
            {errors.attendancePoint && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors.attendancePoint}</p>
            )}
          </div>
        )}

        {formData.ucWard && (
          <div className="mt-2 p-3 bg-white/5 border border-gray-800 rounded-md flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-400">Attendance Point: <span className="font-semibold text-white">
              {formData.attendancePoint || (ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))?.attendancePoints.length === 1 ? ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))?.attendancePoints[0] : 'Please select')}
            </span></span>
          </div>
        )}
      </div>
    </div>
  )
}
