import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabaseClient'
import DatePicker from '../WorkerFormParts/DatePicker'

export default function PrivateHRRecords({ externalSearch, externalMonth }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal States
  const [editingRow, setEditingRow] = useState(null)
  const [terminationModal, setTerminationModal] = useState({ open: false, row: null })
  const [historyModal, setHistoryModal] = useState({ open: false, recordId: null, history: [] })
  const [activeDropdown, setActiveDropdown] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('private_hr')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRows(data || [])
    } catch (err) {
      console.error('Failed to load private_hr records', err)
      setError(err.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (dob) => {
    if (!dob) return 'N/A'
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  }

  const filteredRows = useMemo(() => {
    const q = (externalSearch || '').toLowerCase().trim()
    if (!q) return rows
    return rows.filter(r =>
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.cnic || '').includes(q) ||
      (r.designation || '').toLowerCase().includes(q)
    )
  }, [rows, externalSearch])

  const stats = useMemo(() => {
    const total = rows.length
    const active = rows.filter(r => r.status === 'Active' || !r.status).length
    const terminated = rows.filter(r => r.status === 'Terminated').length
    return { total, active, terminated }
  }, [rows])

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      setLoading(true)
      const oldRow = rows.find(r => r.id === id)
      const oldStatus = oldRow?.status || 'Active'

      const updatePayload = { status: newStatus }
      if (newStatus === 'Terminated') {
        updatePayload.termination_date = new Date().toISOString().split('T')[0]
      } else if (newStatus === 'Active') {
        updatePayload.termination_date = null
      }

      const { error: updateError } = await supabase
        .from('private_hr')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        if (updateError.message?.includes('termination_date') || updateError.code === 'PGRST204') {
          const { error: retryError } = await supabase
            .from('private_hr')
            .update({ status: newStatus })
            .eq('id', id)
          if (retryError) throw retryError
        } else {
          throw updateError
        }
      }

      try {
        await supabase.from('status_history').insert([{
          record_id: id,
          old_status: oldStatus,
          new_status: newStatus,
          table_source: 'private_hr',
          changed_at: new Date().toISOString()
        }])
      } catch (e) { }

      setSuccess(`Employee status updated to ${newStatus}`)
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...updatePayload } : r))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setLoading(false)
      setActiveDropdown(null)
      setTerminationModal({ open: false, row: null })
    }
  }

  const confirmTermination = async () => {
    if (!terminationModal.row) return
    await handleStatusUpdate(terminationModal.row.id, 'Terminated')
  }

  const handleSaveEdit = async () => {
    if (!editingRow) return
    try {
      setLoading(true)
      const { id, created_at, ...updateData } = editingRow
      const { error } = await supabase
        .from('private_hr')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      setSuccess('Record updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setEditingRow(null)
      await load()
    } catch (err) {
      setError(err.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleViewHistory = async (id) => {
    try {
      setActiveDropdown(null)
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('record_id', id)
        .eq('table_source', 'private_hr')
        .order('changed_at', { ascending: false })

      setHistoryModal({ open: true, recordId: id, history: data || [] })
    } catch (err) {
      setError('Could not load history')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Board */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-3xl flex items-center justify-around shadow-sm max-w-2xl mx-auto">
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total File</p>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="w-px h-10 bg-slate-200"></div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">Active</p>
          <p className="text-2xl font-black text-emerald-500">{stats.active}</p>
        </div>
        <div className="w-px h-10 bg-slate-200"></div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-rose-400 tracking-widest">Terminated</p>
          <p className="text-2xl font-black text-rose-500">{stats.terminated}</p>
        </div>
      </div>

      <AnimatePresence>
        {(error || success) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-xl text-sm font-medium mb-4 ${error ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
            {error || success}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-900/5">
        <div className="p-6 border-b border-white/40 bg-white/40 flex justify-end">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Records
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                <th className="px-3 py-4 text-left w-12">Sr.</th>
                <th className="px-3 py-4 text-left">Recipient</th>
                <th className="px-3 py-4 text-left">CNIC</th>
                <th className="px-3 py-4 text-left">DOB / Age</th>
                <th className="px-3 py-4 text-left">Religion</th>
                <th className="px-3 py-4 text-left">Role</th>
                <th className="px-3 py-4 text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 font-sans">
              <AnimatePresence mode="popLayout">
                {filteredRows.map((r, idx) => (
                  <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3 text-[10px] font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col max-w-[150px]">
                        <span className="text-slate-900 font-bold text-xs truncate">{r.full_name}</span>
                        <span className="text-slate-400 text-[9px] truncate uppercase">{r.father_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[10px] text-slate-600">{r.cnic}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col text-[10px]">
                        <span className="text-slate-700 font-semibold">{r.date_of_birth}</span>
                        <span className="text-blue-500 font-bold">Age: {calculateAge(r.date_of_birth)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-slate-600">{r.religion}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{r.designation}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative">
                          <motion.button
                            onClick={() => setActiveDropdown(activeDropdown === r.id ? null : r.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all duration-200 w-20 text-center ${r.status === 'Terminated' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                              }`}
                          >
                            {r.status || 'Active'}
                          </motion.button>

                          <AnimatePresence>
                            {activeDropdown === r.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-left origin-top-right"
                              >
                                {r.status === 'Terminated' ? (
                                  <button onClick={() => handleStatusUpdate(r.id, 'Active')} className="w-full px-3 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-colors border-b">
                                    <span>✓</span> Reactivate
                                  </button>
                                ) : (
                                  <button onClick={() => setTerminationModal({ open: true, row: r })} className="w-full px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-b">
                                    <span>✕</span> Terminate
                                  </button>
                                )}
                                <button onClick={() => handleViewHistory(r.id)} className="w-full px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                  <span>◷</span> History
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <motion.button
                          onClick={() => setEditingRow(r)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Edit Profile"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredRows.length === 0 && <div className="py-20 text-center text-slate-400 font-medium">No records matching your search.</div>}
        </div>
      </div>

      {/* Manual Edit Modal */}
      <AnimatePresence>
        {editingRow && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Modify Profile</h3>
                <button onClick={() => setEditingRow(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors font-bold text-slate-400">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                  <input type="text" value={editingRow.full_name} onChange={e => setEditingRow({ ...editingRow, full_name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Father's Name</label>
                  <input type="text" value={editingRow.father_name} onChange={e => setEditingRow({ ...editingRow, father_name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CNIC</label>
                  <input type="text" value={editingRow.cnic} onChange={e => setEditingRow({ ...editingRow, cnic: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation</label>
                  <input type="text" value={editingRow.designation} onChange={e => setEditingRow({ ...editingRow, designation: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</label>
                  <input type="text" value={editingRow.phone_number} onChange={e => setEditingRow({ ...editingRow, phone_number: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Joining Date</label>
                  <DatePicker value={editingRow.joining_date} onChange={e => setEditingRow({ ...editingRow, joining_date: e.target.value })} />
                </div>
              </div>
              <div className="mt-10 flex gap-4">
                <button onClick={handleSaveEdit} disabled={loading} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all">{loading ? 'Saving...' : 'Save Changes'}</button>
                <button onClick={() => setEditingRow(null)} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-all">Discard</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Termination Modal */}
      <AnimatePresence>
        {terminationModal.open && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⚠</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Execute Termination?</h3>
              <p className="text-slate-500 mb-8 font-medium">This will marked <span className="text-slate-900 font-bold">{terminationModal.row.full_name}</span> as Terminated. Historical data remains for 1 year.</p>
              <div className="flex gap-4">
                <button onClick={confirmTermination} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-900/10">Confirm</button>
                <button onClick={() => setTerminationModal({ open: false, row: null })} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Go Back</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History/Logs Modal */}
      <AnimatePresence>
        {historyModal.open && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="bg-slate-900 text-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-white/10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold tracking-tight">Incident Log / History</h3>
                <button onClick={() => setHistoryModal({ open: false, recordId: null, history: [] })} className="text-slate-500 hover:text-white font-bold transition-colors">✕</button>
              </div>
              <div className="space-y-4">
                {historyModal.history.length > 0 ? historyModal.history.map((h, i) => (
                  <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <p className="text-xs font-bold text-emerald-400 mb-1">Status Shifted</p>
                    <p className="text-sm font-medium">
                      {h.old_status || 'N/A'} → <span className="font-bold text-white uppercase">{h.new_status}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2">{new Date(h.changed_at).toLocaleString()}</p>
                  </div>
                )) : <div className="text-center py-10 text-slate-500">No shift history found for this record.</div>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
