import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import MonthPicker from './WorkerFormParts/MonthPicker'

const STATUS_LABEL = {
  'P': 'Present',
  'A': 'Absent',
  'L': 'Leave'
}

const Attendance = ({ workers, darkMode, externalSearchQuery, externalMonth }) => {
  const month = externalMonth;
  const searchQuery = externalSearchQuery;
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [statusModal, setStatusModal] = useState({ show: false, message: '', type: 'loading' }) // type: loading, success, error, info

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
      setStatusModal({ show: true, message: 'Reloading attendance data...', type: 'loading' })
      const { data, error } = await supabase
        .from('attendance_monthly')
        .select('*')
        .eq('month', month)

      if (error) throw error

      const attendanceMap = {}
      data.forEach(record => {
        attendanceMap[record.worker_id] = record.attendance_json || {}
      })
      setAttendance(attendanceMap)
      setLastRefresh(new Date())

      setStatusModal({ show: true, message: 'Data reloaded successfully', type: 'success' })
      setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 1500)
    } catch (err) {
      console.error('Error loading attendance:', err)
      setStatusModal({ show: true, message: 'Failed to reload data', type: 'error' })
      setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 3000)
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
      setStatusModal({ show: true, message: 'Saving attendance changes...', type: 'loading' })

      const upserts = Object.entries(attendance).map(([workerId, json]) => ({
        worker_id: parseInt(workerId),
        month: month,
        attendance_json: json,
        updated_at: new Date().toISOString()
      }))

      if (upserts.length === 0) {
        setStatusModal({ show: true, message: 'No changes to save', type: 'info' })
        setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 1500)
        return
      }

      const { error } = await supabase
        .from('attendance_monthly')
        .upsert(upserts, { onConflict: ['worker_id', 'month'] })

      if (error) throw error
      await loadAttendance()
      setStatusModal({ show: true, message: 'Attendance saved and updated', type: 'success' })
      setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 2000)
    } catch (err) {
      console.error('Save attendance error', err)
      setStatusModal({ show: true, message: 'Error saving attendance', type: 'error' })
      setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`backdrop-blur-xl border rounded-3xl overflow-hidden shadow-xl relative z-10 transition-colors ${darkMode ? 'bg-white/[0.02] border-white/10 shadow-black/20' : 'bg-white/40 border-white/60 shadow-indigo-100/10'}`}>
      <div className={`p-4 border-b transition-colors flex items-center justify-between ${darkMode ? 'border-white/10' : 'border-white/40'}`}>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Last updated</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lastRefresh.toLocaleTimeString()}
                </span>
                {(() => {
                  const now = new Date()
                  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                  return month === curMonth ? (
                    <div className="flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] text-emerald-600 font-medium font-sans">Live</span>
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            className={`px-4 py-2 border rounded-lg transition-all text-sm font-medium shadow-sm active:translate-y-0.5 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white' : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
            onClick={() => loadAttendance()}
          >
            Reload
          </button>
          <button
            className={`px-6 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all active:translate-y-0.5 ${!isEditable() || saving
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

      <div className="p-4 flex-1 overflow-hidden flex flex-col">
        <div className={`rounded-2xl border shadow-xl flex-1 overflow-auto custom-scrollbar transition-colors ${darkMode ? 'bg-slate-900 border-white/10 shadow-black/40' : 'bg-white border-slate-200 shadow-indigo-100/20'
          }`}>
          <div className="min-w-max">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-40">
                <tr className={`${darkMode ? 'bg-slate-900/90' : 'bg-slate-50/90'} backdrop-blur-md`}>
                  {/* Fixed Header Columns */}
                  <th className={`p-3 text-left sticky left-0 top-0 z-50 w-[45px] min-w-[45px] font-semibold border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>#</th>
                  <th className={`p-3 text-left sticky left-[45px] top-0 z-50 w-[170px] min-w-[170px] font-semibold border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>Employee Name</th>
                  <th className={`p-3 text-left sticky left-[215px] top-0 z-50 w-[110px] min-w-[110px] font-semibold border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>Phone</th>
                  <th className={`p-3 text-left sticky left-[325px] top-0 z-50 w-[120px] min-w-[120px] font-semibold border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>CNIC</th>
                  <th className={`p-3 text-left sticky left-[445px] top-0 z-50 w-[130px] min-w-[130px] font-semibold border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>Designation</th>
                  <th className={`p-3 text-left sticky left-[575px] top-0 z-50 w-[120px] min-w-[120px] font-semibold border-b border-r shadow-[6px_0_12px_-4px_rgba(0,0,0,0.15)] transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>UC/Ward</th>

                  {/* Scrollable Day Columns */}
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={i} className={`p-1.5 text-center w-8 min-w-[32px] text-[11px] font-semibold border-b border-l border-dashed transition-colors ${darkMode ? 'bg-slate-900 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'}`}>
                {/* Active Workers Rows */}
                {filteredActiveWorkers.map((w, idx) => (
                  <tr key={w.id} className={`${darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-blue-50/20'} transition-all group`}>
                    <td className={`p-3 sticky left-0 z-10 font-medium border-r border-b transition-colors ${darkMode ? 'bg-slate-900 text-slate-500 border-white/5' : 'bg-white text-slate-400 border-slate-100'}`}>{idx + 1}</td>
                    <td className={`p-3 sticky left-[45px] z-10 font-medium border-r border-b transition-colors truncate ${darkMode ? 'bg-slate-900 text-white border-white/5' : 'bg-white text-slate-900 border-slate-100'}`} title={w.full_name}>{w.full_name}</td>
                    <td className={`p-3 sticky left-[215px] z-10 text-[10px] border-r border-b transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-400 border-white/5' : 'bg-white text-slate-600 border-slate-100'}`}>{w.phone_number}</td>
                    <td className={`p-3 sticky left-[325px] z-10 font-mono text-[10px] border-r border-b transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-400 border-white/5' : 'bg-white text-slate-600 border-slate-100'}`}>{w.cnic || 'N/A'}</td>
                    <td className={`p-3 sticky left-[445px] z-10 text-[10px] border-r border-b transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-400 border-white/5' : 'bg-white text-slate-600 border-slate-100'}`}>{w.designation}</td>
                    <td className={`p-3 sticky left-[575px] z-10 text-[10px] border-r border-b shadow-[6px_0_12px_-4px_rgba(0,0,0,0.15)] transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-400 border-white/5' : 'bg-white text-slate-600 border-slate-100'}`}>{w.uc_ward_name}</td>

                    {Array.from({ length: daysInMonth }, (_, d) => {
                      const day = String(d + 1)
                      const status = (attendance[w.id] && attendance[w.id][day]) || 'A'
                      return (
                        <td key={d} className={`p-1 text-center transition-colors border-l border-b border-white/[0.03] ${isEditable() ? 'cursor-pointer hover:bg-emerald-500/5' : ''}`} onClick={() => toggleCell(w.id, day)}>
                          <motion.div
                            whileHover={isEditable() ? { scale: 1.15 } : {}}
                            whileTap={isEditable() ? { scale: 0.9 } : {}}
                            className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-semibold rounded-lg transition-all shadow-sm ${status === 'P'
                              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                              : status === 'L'
                                ? 'bg-amber-400 text-white shadow-amber-500/20'
                                : (darkMode ? 'bg-rose-500/20 text-rose-500 border border-rose-500/20' : 'bg-rose-50 text-rose-600 border border-rose-100')
                              }`}
                          >
                            {status === 'P' ? 'P' : status === 'L' ? 'L' : 'A'}
                          </motion.div>
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Terminated Divider */}
                {filteredTerminatedWorkers.length > 0 && (
                  <tr className="relative">
                    <td colSpan={6} className={`p-0 sticky left-0 z-20 h-16 transition-colors ${darkMode ? 'bg-rose-950/20' : 'bg-rose-50/50'}`}>
                      <div className="flex items-center justify-center w-full h-full text-[11px] font-semibold uppercase tracking-[0.5em] text-center border-y relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/10 to-transparent animate-pulse`}></div>
                        <span className={`relative z-10 ${darkMode ? 'text-rose-500/40' : 'text-rose-400/70'}`}>Terminated Personnel Directory</span>
                      </div>
                    </td>
                    <td colSpan={daysInMonth || 31} className={`border-y ${darkMode ? 'bg-rose-950/10 border-white/5' : 'bg-rose-50/30 border-slate-100'}`}></td>
                  </tr>
                )}

                {/* Terminated Workers Rows */}
                {filteredTerminatedWorkers.map((w, idx) => (
                  <tr key={w.id} className={`${darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-rose-50/10'} transition-all opacity-60 hover:opacity-100 group`}>
                    <td className={`p-3 sticky left-0 z-10 font-medium border-r border-b transition-colors ${darkMode ? 'bg-slate-900 text-slate-600 border-white/5' : 'bg-white text-slate-400 border-slate-100'}`}>{idx + 1}</td>
                    <td className={`p-3 sticky left-[45px] z-10 font-medium border-r border-b transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-500 border-white/5' : 'bg-white text-slate-500 border-slate-100'}`} title={w.full_name}>
                      <div className="flex flex-col">
                        <span className="truncate text-[11px] leading-tight font-semibold">{w.full_name}</span>
                        <span className="text-[7px] text-rose-500/50 font-semibold uppercase tracking-tighter">Terminated</span>
                      </div>
                    </td>
                    <td className={`p-3 sticky left-[215px] z-10 text-[10px] border-r border-b transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-600 border-white/5' : 'bg-white text-slate-500 border-slate-100'}`}>{w.phone_number}</td>
                    <td className={`p-3 sticky left-[325px] z-10 font-mono text-[10px] border-r border-b transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-600 font-medium' : 'bg-white text-slate-500 border-slate-100'}`}>{w.cnic || 'N/A'}</td>
                    <td className={`p-3 sticky left-[445px] z-10 text-[10px] border-r border-b transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-600 border-white/5' : 'bg-white text-slate-500 border-slate-100'}`}>{w.designation}</td>
                    <td className={`p-3 sticky left-[575px] z-10 text-[10px] border-r border-b shadow-[6px_0_12px_-4px_rgba(0,0,0,0.15)] transition-colors truncate ${darkMode ? 'bg-slate-900 text-slate-600 border-white/5' : 'bg-white text-slate-500 border-slate-100'}`}>{w.uc_ward_name}</td>

                    {Array.from({ length: daysInMonth }, (_, d) => {
                      const day = String(d + 1)
                      const status = (attendance[w.id] && attendance[w.id][day]) || 'A'
                      return (
                        <td key={d} className="p-1 text-center border-l border-b border-white/[0.03]">
                          <div className={`inline-flex items-center justify-center w-6 h-6 text-[9px] font-semibold rounded-lg ${status === 'P' ? 'bg-slate-400 text-white' :
                            status === 'L' ? 'bg-slate-300 text-white' :
                              (darkMode ? 'bg-rose-500/10 text-rose-500/40' : 'bg-rose-50 text-rose-300')
                            }`}>
                            {status === 'P' ? 'P' : status === 'L' ? 'L' : 'A'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {filteredActiveWorkers.length === 0 && filteredTerminatedWorkers.length === 0 && (
                  <tr>
                    <td colSpan={6 + (daysInMonth || 31)} className="p-12 text-center text-slate-400 font-medium italic">
                      No matching records found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Status Notification Modal */}
      <AnimatePresence>
        {statusModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`max-w-sm w-full p-6 rounded-3xl shadow-2xl border flex flex-col items-center text-center transition-colors ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'
                }`}
            >
              <div className="mb-4">
                {statusModal.type === 'loading' && (
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}
                {statusModal.type === 'success' && (
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {statusModal.type === 'error' && (
                  <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {statusModal.type === 'info' && (
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>

              <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {statusModal.type === 'loading' ? 'Processing' :
                  statusModal.type === 'success' ? 'Success' :
                    statusModal.type === 'error' ? 'Error' : 'Notification'}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {statusModal.message}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Attendance
