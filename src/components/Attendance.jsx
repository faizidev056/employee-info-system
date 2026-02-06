import React, { useEffect, useMemo, useState, useCallback } from 'react'
import MonthPicker from './WorkerFormParts/MonthPicker'
import { supabase } from '../supabaseClient'

// Attendance status options
const STATUS_ORDER = ['P', 'A', 'L'] // Present, Absent, Leave
const STATUS_LABEL = { P: 'Present', A: 'Absent', L: 'Leave' }

export default function Attendance({ workers }) {
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

  const daysInMonth = useMemo(() => {
    const [year, mon] = month.split('-').map(Number)
    return new Date(year, mon, 0).getDate()
  }, [month])

  const activeWorkers = useMemo(() => workers.filter(w => w.status === 'Active'), [workers])
  const terminatedWorkers = useMemo(() => workers.filter(w => w.status === 'Terminated'), [workers])

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
    } catch (err) {
      console.error('Load attendance error', err)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

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
      const toSave = [ ...(showActive ? activeWorkers : []), ...(showTerminated ? terminatedWorkers : []) ]
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
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <MonthPicker value={month} onChange={(e) => setMonth(e.target.value)} />

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showActive} onChange={(e) => setShowActive(e.target.checked)} />
            <span className="ml-1">Active</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showTerminated} onChange={(e) => setShowTerminated(e.target.checked)} />
            <span className="ml-1">Terminated</span>
          </label>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded" onClick={() => loadAttendance()}>Reload</button>
          <button className="px-3 py-2 bg-cyan-500/20 text-cyan-300 rounded" disabled={!isEditable() || saving} onClick={saveMonth}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {(showActive || showTerminated) ? (
        <div className="space-y-6">
          {showActive && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Active Employees</h3>
              <div className="overflow-auto">
                <table className="w-full table-fixed text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left sticky left-0 bg-white/5">#</th>
                      <th className="p-2 text-left sticky left-12 bg-white/5">Employee</th>
                      <th className="p-2 text-left font-mono">CNIC</th>
                      <th className="p-2 text-left">Code</th>
                      <th className="p-2 text-left hidden sm:table-cell">Designation</th>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="p-1 text-center w-6 text-[11px]">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeWorkers.map((w, idx) => (
                      <tr key={w.id} className="border-t border-white/5">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2 truncate max-w-[160px]">{w.full_name}</td>
                        <td className="p-2 font-mono truncate">{w.cnic || 'N/A'}</td>
                        <td className="p-2 font-mono">{w.employee_code}</td>
                        <td className="p-2 hidden sm:table-cell truncate">{w.designation}</td>
                        {Array.from({ length: daysInMonth }, (_, d) => {
                          const day = String(d + 1)
                          const status = (attendance[w.id] && attendance[w.id][day]) || 'A'
                          return (
                            <td key={d} className={`p-1 text-center cursor-pointer ${isEditable() ? 'hover:bg-white/5' : ''}`} onClick={() => toggleCell(w.id, day)} title={STATUS_LABEL[status]}>
                              <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] rounded ${status === 'P' ? 'bg-green-500/25 text-green-400' : status === 'L' ? 'bg-yellow-500/25 text-yellow-400' : 'bg-red-500/25 text-red-400'}`}>{status}</span>
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
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Terminated Employees</h3>
              <div className="overflow-auto">
                <table className="w-full table-fixed text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left sticky left-0 bg-white/5">#</th>
                      <th className="p-2 text-left sticky left-12 bg-white/5">Employee</th>
                      <th className="p-2 text-left font-mono">CNIC</th>
                      <th className="p-2 text-left">Code</th>
                      <th className="p-2 text-left hidden sm:table-cell">Designation</th>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="p-1 text-center w-6 text-[11px]">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {terminatedWorkers.map((w, idx) => (
                      <tr key={w.id} className="border-t border-white/5">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2 truncate max-w-[160px]">{w.full_name}</td>
                        <td className="p-2 font-mono truncate">{w.cnic || 'N/A'}</td>
                        <td className="p-2 font-mono">{w.employee_code}</td>
                        <td className="p-2 hidden sm:table-cell truncate">{w.designation}</td>
                        {Array.from({ length: daysInMonth }, (_, d) => {
                          const day = String(d + 1)
                          const status = (attendance[w.id] && attendance[w.id][day]) || 'A'
                          return (
                            <td key={d} className={`p-1 text-center ${isEditable() ? 'hover:bg-white/5' : ''}`} title={STATUS_LABEL[status]}>
                              <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] rounded ${status === 'P' ? 'bg-green-500/25 text-green-400' : status === 'L' ? 'bg-yellow-500/25 text-yellow-400' : 'bg-red-500/25 text-red-400'}`}>{status}</span>
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
