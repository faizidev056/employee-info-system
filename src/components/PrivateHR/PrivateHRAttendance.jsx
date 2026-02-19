import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabaseClient'

const STATUS_LABEL = {
    'P': 'Present',
    'A': 'Absent',
    'L': 'Leave'
}

export default function PrivateHRAttendance({ workers, externalMonth, externalSearch }) {
    const month = externalMonth || new Date().toISOString().slice(0, 7)
    const searchQuery = externalSearch || ''
    const [attendance, setAttendance] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [statusModal, setStatusModal] = useState({ show: false, message: '', type: 'loading' })

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
                .from('attendance_monthly')
                .select('*')
                .eq('month', month)

            if (error) throw error

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
            setStatusModal({ show: true, message: 'Saving attendance data...', type: 'loading' })

            const upserts = Object.entries(attendance).map(([workerId, json]) => ({
                worker_id: parseInt(workerId),
                month: month,
                attendance_json: json
            }))

            for (const item of upserts) {
                const { error } = await supabase
                    .from('attendance_monthly')
                    .upsert(item, { onConflict: ['worker_id', 'month'] })

                if (error) throw error
            }

            setStatusModal({ show: true, message: 'Attendance saved successfully', type: 'success' })
            setTimeout(() => setStatusModal({ show: false, message: '', type: 'loading' }), 2000)
        } catch (err) {
            console.error('Error saving attendance:', err)
            setStatusModal({ show: true, message: 'Failed to save attendance', type: 'error' })
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
            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-900/5">
                <div className="p-6 border-b border-white/40 bg-white/40 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Attendance Sheet</h3>
                        <p className="text-xs text-slate-500">Tap cells to toggle status (P/A/L)</p>
                    </div>
                    <button
                        onClick={saveAttendance}
                        disabled={saving || loading}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 w-48 border-r">Employee Name</th>
                                {[...Array(daysInMonth)].map((_, i) => (
                                    <th key={i} className="px-2 py-4 text-center text-[10px] font-bold text-slate-500 border-r min-w-[40px]">{i + 1}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                            {filteredWorkers.map((worker) => (
                                <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{worker.full_name}</span>
                                            <span className="text-[9px] text-slate-400 font-medium uppercase">{worker.employee_code || worker.cnic?.slice(-4)}</span>
                                        </div>
                                    </td>
                                    {[...Array(daysInMonth)].map((_, i) => {
                                        const day = i + 1
                                        const status = (attendance[worker.id] && attendance[worker.id][day]) || 'A'
                                        return (
                                            <td key={i} className="p-1 border-r text-center">
                                                <button
                                                    onClick={() => toggleCell(worker.id, day)}
                                                    className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${getStatusColor(status)} hover:scale-110 active:scale-95 shadow-sm`}
                                                >
                                                    {status}
                                                </button>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredWorkers.length === 0 && (
                        <div className="py-20 text-center text-slate-400 font-medium italic">No active employees found to display.</div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 px-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500"></div>
                    <span className="text-xs font-bold text-slate-600">P - Present</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-rose-500"></div>
                    <span className="text-xs font-bold text-slate-600">A - Absent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-500"></div>
                    <span className="text-xs font-bold text-slate-600">L - Leave</span>
                </div>
            </div>

            {/* Status Modal */}
            <AnimatePresence>
                {statusModal.show && (
                    <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setStatusModal({ ...statusModal, show: false })} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center">
                            {statusModal.type === 'loading' && <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />}
                            {statusModal.type === 'success' && <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">✓</div>}
                            {statusModal.type === 'error' && <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">✕</div>}
                            <p className="text-slate-900 font-bold">{statusModal.message}</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
