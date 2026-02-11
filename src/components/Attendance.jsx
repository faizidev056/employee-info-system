import React, { useEffect, useMemo, useState, useCallback } from 'react'
import MonthPicker from './WorkerFormParts/MonthPicker'
import { supabase } from '../supabaseClient'

// Attendance status options
const STATUS_ORDER = ['P', 'A', 'L'] // Present, Absent, Leave
const STATUS_LABEL = { P: 'Present', A: 'Absent', L: 'Leave' }

export default function Attendance({ workers }) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  // showActive / showTerminated toggles so both groups can be visible at once
  const [showActive, setShowActive] = useState(true)
  const [showTerminated, setShowTerminated] = useState(true)
  const [attendance, setAttendance] = useState({}) // { worker_id: { '1': 'P', '2': 'A', ... } }
  const [_loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const daysInMonth = useMemo(() => {
    const [year, mon] = month.split('-').map(Number)
    return new Date(year, mon, 0).getDate()
  }, [month])

  const activeWorkers = useMemo(() => workers.filter(w => w.status === 'Active'), [workers])
  const terminatedWorkers = useMemo(() => workers.filter(w => w.status === 'Terminated'), [workers])

  const filteredActiveWorkers = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim()
    if (!q) return activeWorkers
    return activeWorkers.filter(w => (w.full_name || '').toLowerCase().includes(q) || (w.cnic || '').toLowerCase().includes(q) || (w.employee_code || '').toLowerCase().includes(q))
  }, [activeWorkers, searchQuery])

  const filteredTerminatedWorkers = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim()
    if (!q) return terminatedWorkers
    return terminatedWorkers.filter(w => (w.full_name || '').toLowerCase().includes(q) || (w.cnic || '').toLowerCase().includes(q) || (w.employee_code || '').toLowerCase().includes(q))
  }, [terminatedWorkers, searchQuery])

  // fetch attendance rows for the month from DB
  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('attendance_monthly').select('*').eq('month', month)

      if (error) throw error

      const rows = {};
      (data || []).forEach(r => {
        rows[r.worker_id] = r.attendance_json || {}
      })

      setAttendance(rows)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Load attendance error', err)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  // Auto-refresh attendance data every 30 seconds when viewing current month
  useEffect(() => {
    const now = new Date()
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Only auto-refresh if we're viewing the current month
    if (month !== curMonth) return

    const intervalId = setInterval(() => {
      loadAttendance()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(intervalId)
  }, [month, loadAttendance])

  // cycle status for a cell (only editable if month === current month)
  const isEditable = () => {
    const now = new Date()
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return month === curMonth
  }

  const toggleCell = (workerId, day) => {
    if (!isEditable()) return
    setAttendance(prev => {
      const worker = { ...(prev[workerId] || {}) }
      const cur = worker[day] || 'A'
      const idx = STATUS_ORDER.indexOf(cur)
      const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
      worker[day] = next
      return { ...prev, [workerId]: worker }
    })
  }

  const saveMonth = async () => {
    setSaving(true)
    try {
      // Upsert each visible worker record (active + terminated depending on toggles)
      const toSave = [...(showActive ? activeWorkers : []), ...(showTerminated ? terminatedWorkers : [])]
      for (const w of toSave) {
        const payload = {
          worker_id: w.id,
          month,
          attendance_json: attendance[w.id] || {}
        }
        const { error } = await supabase
          .from('attendance_monthly')
          .upsert(payload, { onConflict: ['worker_id', 'month'] })
        if (error) throw error
      }
      // reload
      await loadAttendance()
    } catch (err) {
      console.error('Save attendance error', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-xl shadow-indigo-100/10 relative z-10">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <MonthPicker value={month} onChange={(e) => setMonth(e.target.value)} />

        <div className="flex items-center gap-4 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-100">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showActive}
              onChange={(e) => setShowActive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500/40 border-gray-300"
            />
            <span className="ml-1 text-slate-700 font-medium">Active</span>
          </label>
          <div className="w-px h-4 bg-gray-300"></div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTerminated}
              onChange={(e) => setShowTerminated(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500/40 border-gray-300"
            />
            <span className="ml-1 text-slate-700 font-medium">Terminated</span>
          </label>
        </div>

        <div className="md:ml-4 flex-1">
          <div className="relative max-w-sm">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, CNIC, code..."
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white/50 text-slate-900 text-sm w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="md:ml-auto flex items-center gap-3">
          {lastRefresh && (
            <div className="hidden lg:flex flex-col text-right mr-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Last updated</span>
              <span className="text-xs text-slate-600 font-mono">
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
            className="px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-lg hover:bg-gray-50 hover:text-slate-900 transition-all text-sm font-medium shadow-sm active:translate-y-0.5"
            onClick={() => loadAttendance()}
          >
            Reload
          </button>
          <button
            className={`px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:translate-y-0.5 ${!isEditable() || saving
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
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

      {(showActive || showTerminated) ? (
        <div className="space-y-6">
          {showActive && (
            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/50 overflow-hidden shadow-lg shadow-blue-500/5">
              <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/30">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active Employees
                </h3>
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full table-fixed text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="p-3 text-left sticky left-0 z-20 w-10 text-slate-500 font-semibold border-b border-gray-100/50 bg-gray-50/90 backdrop-blur-md">#</th>
                      <th className="p-3 text-left sticky left-10 z-20 w-40 text-slate-500 font-semibold border-b border-gray-100/50 bg-gray-50/90 backdrop-blur-md shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">Employee</th>
                      <th className="p-3 text-left font-mono w-28 text-slate-500 font-medium border-b border-gray-100/50">CNIC</th>
                      <th className="p-3 text-left w-20 text-slate-500 font-medium border-b border-gray-100/50">Code</th>
                      <th className="p-3 text-left hidden sm:table-cell w-32 text-slate-500 font-medium border-b border-gray-100/50">Designation</th>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="p-1 text-center w-8 text-[10px] text-slate-400 font-medium border-b border-gray-100/50 border-l border-dashed border-gray-200/50">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredActiveWorkers.map((w, idx) => (
                      <tr key={w.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 sticky left-0 bg-white z-10 font-bold text-slate-400 border-r border-gray-100">{idx + 1}</td>
                        <td className="p-3 sticky left-10 bg-white z-10 font-medium text-slate-900 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate">{w.full_name}</td>
                        <td className="p-3 font-mono text-slate-600 text-[11px] truncate">{w.cnic || 'N/A'}</td>
                        <td className="p-3 font-mono text-slate-600 font-semibold text-[11px]">{w.employee_code}</td>
                        <td className="p-3 hidden sm:table-cell text-slate-600 truncate">{w.designation}</td>
                        {Array.from({ length: daysInMonth }, (_, d) => {
                          const day = String(d + 1)
                          const status = (attendance[w.id] && attendance[w.id][day]) || 'A'
                          return (
                            <td key={d} className={`p-1 text-center border-l border-dashed border-gray-100 ${isEditable() ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={() => toggleCell(w.id, day)} title={`${STATUS_LABEL[status]} - ${months[new Date(month).getMonth()]} ${day}`}>
                              <span className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-md transition-transform duration-200 ${status === 'P' ? 'bg-emerald-100 text-emerald-700' : status === 'L' ? 'bg-amber-100 text-amber-700' : 'bg-rose-50 text-rose-300'}`}>
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

          {showTerminated && (
            <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/50 overflow-hidden mt-8 shadow-lg shadow-rose-500/5">
              <div className="px-4 py-3 border-b border-gray-100 bg-rose-50/30">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Terminated Employees
                </h3>
              </div>
              <div className="overflow-auto max-h-[40vh]">
                <table className="w-full table-fixed text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="p-3 text-left sticky left-0 z-20 w-10 text-slate-500 font-semibold border-b border-gray-100/50 bg-gray-50/90 backdrop-blur-md">#</th>
                      <th className="p-3 text-left sticky left-10 z-20 w-40 text-slate-500 font-semibold border-b border-gray-100/50 bg-gray-50/90 backdrop-blur-md shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">Employee</th>
                      <th className="p-3 text-left font-mono w-28 text-slate-500 font-medium border-b border-gray-100/50">CNIC</th>
                      <th className="p-3 text-left w-20 text-slate-500 font-medium border-b border-gray-100/50">Code</th>
                      <th className="p-3 text-left hidden sm:table-cell w-32 text-slate-500 font-medium border-b border-gray-100/50">Designation</th>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="p-1 text-center w-8 text-[10px] text-slate-400 font-medium border-b border-gray-100/50 border-l border-dashed border-gray-200/50">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTerminatedWorkers.map((w, idx) => (
                      <tr key={w.id} className="hover:bg-rose-50/30 transition-colors bg-white/50">
                        <td className="p-3 sticky left-0 bg-white z-10 font-bold text-slate-400 border-r border-gray-100">{idx + 1}</td>
                        <td className="p-3 sticky left-10 bg-white z-10 font-medium text-slate-500 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate">{w.full_name}</td>
                        <td className="p-3 font-mono text-slate-500 text-[11px] truncate">{w.cnic || 'N/A'}</td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">{w.employee_code}</td>
                        <td className="p-3 hidden sm:table-cell text-slate-500 truncate">{w.designation}</td>
                        {Array.from({ length: daysInMonth }, (_, d) => {
                          const day = String(d + 1)
                          const status = (attendance[w.id] && attendance[w.id][day]) || 'A'
                          return (
                            <td key={d} className={`p-1 text-center border-l border-dashed border-gray-100 ${isEditable() ? 'cursor-pointer hover:bg-gray-100' : ''}`} title={`${STATUS_LABEL[status]}`}>
                              <span className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-md opacity-70 ${status === 'P' ? 'bg-emerald-100 text-emerald-700' : status === 'L' ? 'bg-amber-100 text-amber-700' : 'bg-rose-50 text-rose-300'}`}>
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
      ) : (
        <p className="text-slate-400">No groups selected. Use the toggles to show Active or Terminated employees.</p>
      )}

    </div>
  )
}
