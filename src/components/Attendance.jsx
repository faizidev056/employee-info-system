import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import MonthPicker from './WorkerFormParts/MonthPicker'

const STATUS_LABEL = {
  'P': 'Present',
  'A': 'Absent',
  'L': 'Leave'
}

const Attendance = ({ workers, darkMode }) => {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const activeWorkers = useMemo(() => workers.filter(w => w.status === 'Active'), [workers])
  const terminatedWorkers = useMemo(() => workers.filter(w => w.status === 'Terminated'), [workers])

  const filteredActiveWorkers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return activeWorkers
    return activeWorkers.filter(w =>
      w.full_name?.toLowerCase().includes(q) ||
      w.cnic?.includes(q) ||
      w.employee_code?.toLowerCase().includes(q)
    )
  }, [activeWorkers, searchQuery])

  const filteredTerminatedWorkers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return terminatedWorkers
    return terminatedWorkers.filter(w =>
      w.full_name?.toLowerCase().includes(q) ||
      w.cnic?.includes(q) ||
      w.employee_code?.toLowerCase().includes(q)
    )
  }, [terminatedWorkers, searchQuery])

  useEffect(() => {
    loadAttendance()
  }, [month])

  const loadAttendance = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('month_year', month)

      if (error) throw error

      const attendanceMap = {}
      data.forEach(record => {
        if (!attendanceMap[record.worker_id]) {
          attendanceMap[record.worker_id] = {}
        }
        attendanceMap[record.worker_id][record.day] = record.status
      })
      setAttendance(attendanceMap)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error loading attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleCell = (workerId, day) => {
    if (!isEditable()) return

    const currentStatus = (attendance[workerId] && attendance[workerId][day]) || 'A'
    const nextStatus = currentStatus === 'P' ? 'A' : currentStatus === 'A' ? 'L' : 'P'

    setAttendance(prev => ({
      ...prev,
      [workerId]: {
        ...(prev[workerId] || {}),
        [day]: nextStatus
      }
    }))
  }

  const isEditable = () => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return month === currentMonth
  }

  const daysInMonth = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number)
    return new Date(year, monthNum, 0).getDate()
  }, [month])

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  const saveMonth = async () => {
    try {
      setSaving(true)
      const records = []
      Object.entries(attendance).forEach(([workerId, days]) => {
        Object.entries(days).forEach(([day, status]) => {
          records.push({
            worker_id: workerId,
            day: parseInt(day),
            month_year: month,
            status
          })
        })
      })

      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'worker_id,day,month_year' })

      if (error) throw error
      await loadAttendance()
    } catch (err) {
      console.error('Save attendance error', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`backdrop-blur-xl border rounded-3xl overflow-hidden shadow-xl relative z-10 transition-colors ${darkMode ? 'bg-white/[0.02] border-white/10 shadow-black/20' : 'bg-white/40 border-white/60 shadow-indigo-100/10'}`}>
      {/* Integrated Filter Row - Standardized height/padding for alignment */}
      <div className={`p-6 border-b backdrop-blur-md transition-colors ${darkMode ? 'border-white/10' : 'border-white/40'}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <MonthPicker value={month} onChange={(e) => setMonth(e.target.value)} />

          <div className="max-w-md flex-1 group relative">
            {/* Glowing Border Wrapper */}
            <div className={`absolute -inset-[1px] bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-blue-500/40 rounded-xl blur-[2px] opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition duration-500`}></div>
            <div className="relative">
              <svg className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attendance..."
                className={`w-full pl-10 pr-4 py-2.5 backdrop-blur-md border rounded-xl placeholder-slate-400 focus:outline-none transition-all text-sm shadow-sm ${darkMode ? 'bg-slate-900/60 border-white/10 text-white focus:border-blue-500/50' : 'bg-white/80 border-blue-100 text-slate-900 focus:border-blue-400/50 shadow-blue-500/5'}`}
              />
            </div>
          </div>


          <div className="md:ml-auto flex items-center gap-3">
            {lastRefresh && (
              <div className="hidden lg:flex flex-col text-right mr-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Last updated</span>
                <span className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lastRefresh.toLocaleTimeString()}
                </span>
                {(() => {
                  const now = new Date()
                  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                  return month === curMonth ? (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] text-emerald-600 font-medium">Live</span>
                    </div>
                  ) : null
                })()}
              </div>
            )}
            <button
              className={`px-4 py-2 border rounded-lg transition-all text-sm font-medium shadow-sm active:translate-y-0.5 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white' : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
              onClick={() => loadAttendance()}
            >
              Reload
            </button>
            <button
              className={`px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:translate-y-0.5 ${!isEditable() || saving
                ? (darkMode ? 'bg-white/5 text-slate-600 cursor-not-allowed shadow-none' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none')
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'}`}
              disabled={!isEditable() || saving}
              onClick={saveMonth}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Saving...
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {activeWorkers.length > 0 && (
          <div className={`backdrop-blur-xl rounded-2xl border overflow-hidden shadow-lg transition-colors ${darkMode ? 'bg-white/5 border-white/10 shadow-black/20' : 'bg-white/40 border-white/50 shadow-blue-500/5'}`}>
            <div className={`px-4 py-3 border-b transition-colors ${darkMode ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-blue-50/30'}`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Active Employees
              </h3>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full table-fixed text-xs border-collapse">
                <thead>
                  <tr className={`${darkMode ? 'bg-white/5' : 'bg-gray-50/50'}`}>
                    <th className={`p-3 text-left sticky left-0 z-20 w-16 font-semibold border-b border-gray-100/50 backdrop-blur-md transition-colors ${darkMode ? 'bg-slate-900/90 text-slate-400' : 'bg-gray-50/90 text-slate-500'}`}>Sr No.</th>
                    <th className={`p-3 text-left sticky left-16 z-20 w-48 font-semibold border-b border-gray-100/50 backdrop-blur-md shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] transition-colors ${darkMode ? 'bg-slate-900/90 text-slate-400' : 'bg-gray-50/90 text-slate-500'}`}>Name</th>
                    <th className={`p-3 text-left w-28 font-medium border-b border-gray-100/50 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phone Number</th>
                    <th className={`p-3 text-left font-mono w-28 font-medium border-b border-gray-100/50 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>CNIC</th>
                    <th className={`p-3 text-left w-32 font-medium border-b border-gray-100/50 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Designation</th>
                    <th className={`p-3 text-left w-32 font-medium border-b border-gray-100/50 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>UC Ward</th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i} className={`p-1 text-center w-8 text-[10px] font-medium border-b border-gray-100/50 border-l border-dashed border-gray-200/50 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {filteredActiveWorkers.map((w, idx) => (
                    <tr key={w.id} className={`${darkMode ? 'hover:bg-white/5' : 'hover:bg-blue-50/30'} transition-colors`}>
                      <td className={`p-3 sticky left-0 z-10 font-bold border-r transition-colors ${darkMode ? 'bg-slate-900/95 text-slate-500 border-white/10' : 'bg-white text-slate-400 border-gray-100'}`}>{idx + 1}</td>
                      <td className={`p-3 sticky left-16 z-10 font-medium border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate transition-colors ${darkMode ? 'bg-slate-900/95 text-white border-white/10' : 'bg-white text-slate-900 border-gray-100'}`}>{w.full_name}</td>
                      <td className={`p-3 text-[11px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{w.phone_number}</td>
                      <td className={`p-3 font-mono text-[11px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{w.cnic || 'N/A'}</td>
                      <td className={`p-3 truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{w.designation}</td>
                      <td className={`p-3 truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{w.uc_ward_name}</td>
                      {Array.from({ length: daysInMonth }, (_, d) => {
                        const day = String(d + 1)
                        const status = (attendance[w.id] && attendance[w.id][day]) || 'A'
                        return (
                          <td key={d} className={`p-1 text-center border-l border-dashed border-gray-100 ${isEditable() ? 'cursor-pointer hover:bg-gray-100/10' : ''}`} onClick={() => toggleCell(w.id, day)} title={`${STATUS_LABEL[status]} - ${months[new Date(month).getMonth()]} ${day}`}>
                            <span className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-md transition-transform duration-200 ${status === 'P' ? 'bg-emerald-100 text-emerald-700' : status === 'L' ? 'bg-amber-100 text-amber-700' : (darkMode ? 'bg-white/5 text-slate-600' : 'bg-rose-50 text-rose-300')}`}>
                              {status === 'A' ? '' : status}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {terminatedWorkers.length > 0 && (
          <div className={`backdrop-blur-xl rounded-2xl border overflow-hidden mt-8 shadow-lg transition-colors ${darkMode ? 'bg-white/5 border-white/10 shadow-black/20' : 'bg-white/40 border-white/50 shadow-rose-500/5'}`}>
            <div className={`px-4 py-3 border-b transition-colors ${darkMode ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-rose-50/30'}`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Terminated Employees
              </h3>
            </div>
            <div className="overflow-auto max-h-[40vh]">
              <table className="w-full table-fixed text-xs border-collapse">
                <thead>
                  <tr className={`${darkMode ? 'bg-white/5' : 'bg-gray-50/50'}`}>
                    <th className={`p-3 text-left sticky left-0 z-20 w-16 font-semibold border-b border-gray-100/50 backdrop-blur-md transition-colors ${darkMode ? 'bg-slate-900/90 text-slate-400' : 'bg-gray-50/90 text-slate-500'}`}>Sr No.</th>
                    <th className={`p-3 text-left sticky left-16 z-20 w-48 font-semibold border-b border-gray-100/50 backdrop-blur-md shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] transition-colors ${darkMode ? 'bg-slate-900/90 text-slate-400' : 'bg-gray-50/90 text-slate-500'}`}>Name</th>
                    <th className={`p-3 text-left w-28 font-medium border-b border-gray-100/50 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phone Number</th>
                    <th className={`p-3 text-left font-mono w-28 font-medium border-b border-gray-100/50 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>CNIC</th>
                    <th className={`p-3 text-left w-32 font-medium border-b border-gray-100/50 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Designation</th>
                    <th className={`p-3 text-left w-32 font-medium border-b border-gray-100/50 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>UC Ward</th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i} className={`p-1 text-center w-8 text-[10px] font-medium border-b border-gray-100/50 border-l border-dashed border-gray-200/50 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {filteredTerminatedWorkers.map((w, idx) => (
                    <tr key={w.id} className={`${darkMode ? 'hover:bg-white/5' : 'hover:bg-rose-50/30'} transition-colors`}>
                      <td className={`p-3 sticky left-0 z-10 font-bold border-r transition-colors ${darkMode ? 'bg-slate-900/95 text-slate-500 border-white/10' : 'bg-white text-slate-400 border-gray-100'}`}>{idx + 1}</td>
                      <td className={`p-3 sticky left-16 z-10 font-medium border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate transition-colors ${darkMode ? 'bg-slate-900/95 text-slate-400 border-white/10' : 'bg-white text-slate-500 border-gray-100'}`}>{w.full_name}</td>
                      <td className={`p-3 text-[11px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{w.phone_number}</td>
                      <td className={`p-3 font-mono text-[11px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{w.cnic || 'N/A'}</td>
                      <td className={`p-3 truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{w.designation}</td>
                      <td className={`p-3 truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{w.uc_ward_name}</td>
                      {Array.from({ length: daysInMonth }, (_, d) => {
                        const day = String(d + 1)
                        const status = (attendance[w.id] && attendance[w.id][day]) || 'A'
                        return (
                          <td key={d} className={`p-1 text-center border-l border-dashed border-gray-100 ${isEditable() ? 'cursor-pointer hover:bg-gray-100/10' : ''}`} title={`${STATUS_LABEL[status]}`}>
                            <span className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-md opacity-70 ${status === 'P' ? 'bg-emerald-100 text-emerald-700' : status === 'L' ? 'bg-amber-100 text-amber-700' : (darkMode ? 'bg-white/5 text-slate-600' : 'bg-rose-50 text-rose-300')}`}>
                              {status === 'A' ? '' : status}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Attendance
