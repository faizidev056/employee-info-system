import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabaseClient'

const STATUS_LABEL = {
    'P': 'Present',
    'A': 'Absent',
    'L': 'Leave'
}

export default function PrivateHRAttendance({ workers, externalMonth, externalSearch, darkMode }) {
    const month = externalMonth || new Date().toISOString().slice(0, 7)
    const searchQuery = externalSearch || ''
    const [attendance, setAttendance] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [statusModal, setStatusModal] = useState({ show: false, message: '', type: 'loading' })
    const [focusDay, setFocusDay] = useState(() => new Date().getDate())

    const activeWorkers = useMemo(() => workers.filter(w => w.status === 'Active' || !w.status), [workers])

    const filteredWorkers = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return activeWorkers
        return activeWorkers.filter(w =>
            w.full_name?.toLowerCase().includes(q) ||
            w.cnic?.includes(q) ||
            w.employee_code?.toLowerCase().includes(q)
        )
    }, [activeWorkers, searchQuery])

    useEffect(() => {
        loadAttendance()
    }, [month])

    const loadAttendance = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('private_attendance_monthly')
                .select('*')
                .eq('month', month)

            if (error) {
                // FALLBACK: If private_attendance_monthly doesn't exist yet, 
                // developers might still be using attendance_monthly despite the constraint risk
                console.warn('Private attendance table not found, trying fallback...', error.message)
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('attendance_monthly')
                    .select('*')
                    .eq('month', month)

                if (fallbackError) throw fallbackError

                const attendanceMap = {}
                fallbackData.forEach(record => {
                    attendanceMap[record.worker_id] = record.attendance_json || {}
                })
                setAttendance(attendanceMap)
                return
            }

            const attendanceMap = {}
            data.forEach(record => {
                attendanceMap[record.worker_id] = record.attendance_json || {}
            })
            setAttendance(attendanceMap)
        } catch (err) {
            console.error('Error loading attendance:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleCell = (workerId, day) => {
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

    const daysInMonth = useMemo(() => {
        const [year, monthNum] = month.split('-').map(Number)
        return new Date(year, monthNum, 0).getDate()
    }, [month])

    const saveAttendance = async () => {
        try {
            setSaving(true)
            setStatusModal({ show: true, message: 'Archiving Private Logs...', type: 'loading' })

            const upserts = Object.entries(attendance).map(([workerId, json]) => ({
                worker_id: parseInt(workerId),
                month: month,
                attendance_json: json,
                updated_at: new Date().toISOString()
            }))

            if (upserts.length === 0) {
                setStatusModal({ show: true, message: 'No modifications to commit', type: 'info' })
                setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 1500)
                return
            }

            // Attempt to save to the specific private table first
            const { error } = await supabase
                .from('private_attendance_monthly')
                .upsert(upserts, { onConflict: ['worker_id', 'month'] })

            if (error) {
                console.warn('Save to dedicated private table failed, trying fallback table...', error.message)
                // Fallback to shared table (might fail if foreign key constraint exists)
                const { error: fallbackError } = await supabase
                    .from('attendance_monthly')
                    .upsert(upserts, { onConflict: ['worker_id', 'month'] })

                if (fallbackError) throw fallbackError
            }

            setStatusModal({ show: true, message: 'Private attendance archived successfully', type: 'success' })
            setTimeout(() => setStatusModal({ show: false, message: '', type: 'loading' }), 2000)
        } catch (err) {
            console.error('Error saving attendance:', err)
            setStatusModal({ show: true, message: 'Database Write Failed: Check system logs', type: 'error' })
            setTimeout(() => setStatusModal({ show: false, message: '', type: 'loading' }), 3000)
        } finally {
            setSaving(false)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'P': return 'bg-emerald-500 text-white'
            case 'A': return 'bg-rose-500 text-white'
            case 'L': return 'bg-amber-500 text-white'
            default: return 'bg-slate-100 text-slate-400'
        }
    }

    return (
        <div className="space-y-6">
            <div className={`backdrop-blur-xl border rounded-[2rem] overflow-hidden shadow-2xl relative transition-all duration-300 ${darkMode ? 'bg-white/[0.02] border-white/10 shadow-black/20' : 'bg-white/40 border-white/60 shadow-indigo-100/10'}`}>
                <div className={`p-8 border-b flex justify-between items-center ${darkMode ? 'border-white/10' : 'border-gray-100/50'}`}>
                    <div>
                        <h3 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Private Attendance Grid</h3>
                        <p className={`text-xs font-semibold mt-0.5 opacity-60 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Interactive monthly presence tracking for secure personnel</p>
                    </div>
                    <button
                        onClick={saveAttendance}
                        disabled={saving || loading}
                        className={`px-8 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all ${saving
                            ? 'bg-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:translate-y-0.5 shadow-purple-600/20'}`}
                    >
                        {saving ? 'Archiving...' : 'Save Changes'}
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-hidden flex flex-col min-h-[500px]">
                    <div className={`rounded-2xl border flex-1 overflow-auto custom-scrollbar transition-all ${darkMode ? 'bg-[#0a0f18] border-white/5 shadow-inner' : 'bg-white border-slate-200 shadow-2xl shadow-indigo-100/10'}`}>
                        <div className="min-w-max">
                            <table className="w-full text-[11px] border-separate border-spacing-0">
                                <thead className="sticky top-0 z-40">
                                    <tr className={`${darkMode ? 'bg-slate-900/90' : 'bg-slate-50/90'} backdrop-blur-md`}>
                                        <th className={`p-4 text-left sticky left-0 top-0 z-50 w-10 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>#</th>
                                        <th className={`p-4 text-left sticky left-[2.5rem] top-0 z-50 w-44 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>EMPLOYEE NAME</th>
                                        <th className={`p-4 text-left sticky left-[13.5rem] top-0 z-50 w-32 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>DEPT</th>
                                        <th className={`p-4 text-left sticky left-[21.5rem] top-0 z-50 w-28 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>CODE</th>
                                        <th className={`p-4 text-left sticky left-[28.5rem] top-0 z-50 w-36 font-black border-b border-r shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>CNIC</th>
                                        {[...Array(daysInMonth)].map((_, i) => (
                                            <th key={i}
                                                onClick={() => setFocusDay(i + 1)}
                                                className={`px-1 py-4 text-center w-10 cursor-pointer transition-all border-b border-l border-dashed ${i + 1 === focusDay
                                                    ? (darkMode ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-indigo-50 text-indigo-600 border-indigo-200')
                                                    : (darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500')}`}>
                                                {i + 1}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={daysInMonth + 5} className="p-32 text-center">
                                                <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                                                <p className="font-bold text-[10px] uppercase tracking-widest opacity-40">Decrypting Logs...</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredWorkers.map((worker) => (
                                            <tr key={worker.id} className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-indigo-50/20'} transition-all group`}>
                                                <td className={`p-4 sticky left-0 z-10 border-r border-b transition-colors text-center font-bold opacity-30 ${darkMode ? 'bg-[#0a0f18] text-white border-white/5' : 'bg-white text-slate-900 border-slate-100'}`}>
                                                    {filteredWorkers.indexOf(worker) + 1}
                                                </td>
                                                <td className={`p-4 sticky left-[2.5rem] z-10 border-r border-b transition-colors ${darkMode ? 'bg-[#0a0f18] text-white border-white/5' : 'bg-white text-slate-900 border-slate-100'}`}>
                                                    <span className="text-xs font-black truncate block w-36">{worker.full_name}</span>
                                                </td>
                                                <td className={`p-4 sticky left-[13.5rem] z-10 border-r border-b transition-colors ${darkMode ? 'bg-[#0a0f18] text-indigo-400 border-white/5' : 'bg-white text-indigo-600 border-slate-100'}`}>
                                                    <span className="text-[9px] font-bold uppercase truncate block w-24 tracking-tighter">{worker.designation || 'Staff'}</span>
                                                </td>
                                                <td className={`p-4 sticky left-[21.5rem] z-10 border-r border-b transition-colors ${darkMode ? 'bg-[#0a0f18] text-slate-500 border-white/5' : 'bg-white text-slate-400 border-slate-100'}`}>
                                                    <span className="font-mono text-[10px] font-bold tracking-tighter truncate block w-20">{worker.employee_code || '-'}</span>
                                                </td>
                                                <td className={`p-4 sticky left-[28.5rem] z-10 border-r border-b transition-colors shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] ${darkMode ? 'bg-[#0a0f18] text-slate-400 border-white/5' : 'bg-white text-slate-500 border-slate-100'}`}>
                                                    <span className="font-mono text-[10px] truncate block w-28 uppercase">{worker.cnic || '-'}</span>
                                                </td>
                                                {[...Array(daysInMonth)].map((_, i) => {
                                                    const day = i + 1
                                                    const status = (attendance[worker.id] && attendance[worker.id][day]) || 'A'
                                                    const isFocus = day === focusDay
                                                    return (
                                                        <td key={i} className={`p-1 text-center border-l border-b border-transparent transition-all ${isFocus ? (darkMode ? 'bg-purple-500/5' : 'bg-indigo-50/30') : ''}`}>
                                                            <motion.button
                                                                whileHover={{ scale: 1.15, zIndex: 10 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => toggleCell(worker.id, day)}
                                                                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all shadow-sm flex items-center justify-center ${status === 'P'
                                                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                                                                    : status === 'L'
                                                                        ? 'bg-amber-500 text-white shadow-amber-500/30 ring-2 ring-amber-500/20'
                                                                        : darkMode ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-300 border border-rose-100 hover:border-rose-300'}`}
                                                            >
                                                                {status}
                                                            </motion.button>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            {filteredWorkers.length === 0 && !loading && (
                                <div className="py-24 text-center">
                                    <p className="font-bold text-[10px] uppercase tracking-[0.3em] opacity-20">No matching personnel records found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Legend & Help Footer */}
                    <div className={`mt-6 p-6 rounded-2xl border flex flex-wrap items-center gap-8 ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-md bg-emerald-500 shadow-md shadow-emerald-500/20 font-black text-[8px] text-white flex items-center justify-center">P</div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Present</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-md font-black text-[8px] flex items-center justify-center border ${darkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-300 border-rose-200'}`}>A</div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Absent</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-md bg-amber-500 shadow-md shadow-amber-500/20 font-black text-[8px] text-white flex items-center justify-center">L</div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Leave</span>
                        </div>

                    </div>
                </div>
            </div>

            {/* Global Status Notification Portal */}
            <AnimatePresence>
                {statusModal.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className={`max-w-sm w-full p-10 rounded-[2.5rem] shadow-2xl border flex flex-col items-center text-center ${darkMode ? 'bg-slate-900 border-white/10 shadow-black' : 'bg-white border-slate-100'}`}
                        >
                            <div className="mb-6">
                                {statusModal.type === 'loading' && <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />}
                                {statusModal.type === 'success' && <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-inner text-xl">✓</div>}
                                {statusModal.type === 'error' && <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 shadow-inner text-xl">✕</div>}
                                {statusModal.type === 'info' && <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 shadow-inner text-xl">i</div>}
                            </div>
                            <h3 className={`text-lg font-black mb-2 uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{statusModal.type}</h3>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{statusModal.message}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
