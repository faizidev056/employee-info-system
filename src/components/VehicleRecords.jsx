import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'

const VEHICLE_TYPES = [
  'Tractor Trolley', 'Front end blade', 'Front end loader', 'Dumper truck',
  'Arm roller', 'Compactor', 'Mini tripper', 'Loader rickshaws',
  'Mechanical Washer', 'Mechanical sweeper', 'Drain cleaner',
  'Water bowser', 'Container Repair Vehicle', 'Other'
]

export default function VehicleRecords() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Inline editing
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  // 3-dot dropdown
  const [activeDropdown, setActiveDropdown] = useState(null)
  const dropdownRef = useRef(null)

  // Termination modal
  const [terminationModal, setTerminationModal] = useState({ open: false, vehicle: null })

  // History modal
  const [historyModal, setHistoryModal] = useState({ open: false, vehicle: null, history: [] })

  useEffect(() => { loadVehicles() }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('vehicle_registrations')
        .select('*')
        .order('sr', { ascending: true })
      if (error) throw error
      setVehicles(data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load vehicle records')
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const showError = (msg) => {
    setError(msg)
    setTimeout(() => setError(''), 4000)
  }

  // ── Filtering ──────────────────────────────────────────────
  const filtered = vehicles.filter(v => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery ||
      (v.vehicle_code || '').toLowerCase().includes(q) ||
      (v.reg_id || '').toLowerCase().includes(q) ||
      (v.reg_no || '').toLowerCase().includes(q) ||
      (v.owned_by || '').toLowerCase().includes(q) ||
      (v.sr || '').toLowerCase().includes(q)
    const matchesType = !typeFilter || v.type === typeFilter
    const matchesStatus = !statusFilter || v.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  // ── Edit ───────────────────────────────────────────────────
  const handleEdit = (v) => {
    setEditingId(v.id)
    setEditFormData({
      reg_no: v.reg_no || '',
      type: v.type || '',
      make: v.make || '',
      model: v.model || '',
      year: v.year || '',
      owned_by_type: v.owned_by_type || 'Contractor',
      owned_by: v.owned_by || '',
      owner_contact: v.owner_contact || '',
      owner_cnic: v.owner_cnic || '',
      joining_date: v.joining_date || '',
      status: v.status || 'Active',
    })
    setActiveDropdown(null)
  }

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveEdit = async (id) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('vehicle_registrations')
        .update(editFormData)
        .eq('id', id)
      if (error) throw error
      setEditingId(null)
      setEditFormData({})
      await loadVehicles()
      showSuccess('Vehicle updated successfully!')
    } catch (err) {
      console.error(err)
      showError('Failed to save changes: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditFormData({})
  }

  // ── Terminate ──────────────────────────────────────────────
  const handleTerminateClick = (v) => {
    setTerminationModal({ open: true, vehicle: v })
    setActiveDropdown(null)
  }

  const confirmTermination = async () => {
    const v = terminationModal.vehicle
    if (!v) return
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('vehicle_registrations')
        .update({ status: 'Terminated', termination_date: today })
        .eq('id', v.id)
      if (error) throw error

      // Log to history (graceful if table doesn't exist yet)
      await supabase.from('vehicle_status_history').insert([{
        vehicle_id: v.id,
        old_status: v.status,
        new_status: 'Terminated',
        changed_at: new Date().toISOString()
      }]).then(({ error: he }) => { if (he) console.warn('History insert:', he) })

      setTerminationModal({ open: false, vehicle: null })
      await loadVehicles()
      showSuccess('Vehicle terminated.')
    } catch (err) {
      console.error(err)
      showError('Failed to terminate vehicle: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Reactivate ─────────────────────────────────────────────
  const handleReactivate = async (v) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('vehicle_registrations')
        .update({ status: 'Active', termination_date: null })
        .eq('id', v.id)
      if (error) throw error

      await supabase.from('vehicle_status_history').insert([{
        vehicle_id: v.id,
        old_status: v.status,
        new_status: 'Active',
        changed_at: new Date().toISOString()
      }]).then(({ error: he }) => { if (he) console.warn('History insert:', he) })

      setActiveDropdown(null)
      await loadVehicles()
      showSuccess('Vehicle reactivated.')
    } catch (err) {
      console.error(err)
      showError('Failed to reactivate: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── History ────────────────────────────────────────────────
  const handleViewHistory = async (v) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_status_history')
        .select('*')
        .eq('vehicle_id', v.id)
        .order('changed_at', { ascending: false })
      if (error) throw error
      setHistoryModal({ open: true, vehicle: v, history: data || [] })
    } catch (err) {
      console.error(err)
      showError('Failed to load history')
    }
    setActiveDropdown(null)
  }

  // ── Helpers ────────────────────────────────────────────────
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const StatusBadge = ({ status }) => {
    const styles = {
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Terminated: 'bg-red-50 text-red-600 border-red-200',
      Inactive: 'bg-amber-50 text-amber-700 border-amber-200',
      Maintenance: 'bg-blue-50 text-blue-700 border-blue-200',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
        {status || 'Unknown'}
      </span>
    )
  }

  const inputCls = 'w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 bg-white'

  return (
    <div className="max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vehicle Records</h2>
            <p className="text-slate-500 text-sm">Edit vehicle data and manage status</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-xl text-purple-700 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editable Records
        </div>
      </div>

      {/* Toasts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />{error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />{success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl overflow-hidden shadow-lg">

        {/* Toolbar */}
        <div className="p-4 border-b border-white/40 bg-white/30 backdrop-blur-md">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by SR, vehicle code, Zakwan ID, reg no, owner..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>

            {/* Type filter */}
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all">
              <option value="">All Types</option>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all">
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Terminated">Terminated</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
            </select>

            {/* Count */}
            <div className="px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg text-purple-700 text-xs font-semibold whitespace-nowrap">
              {filtered.length} of {vehicles.length}
            </div>

            {(searchQuery || typeFilter || statusFilter) && (
              <button onClick={() => { setSearchQuery(''); setTypeFilter(''); setStatusFilter('') }}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-600 text-xs font-medium transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading && !vehicles.length ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No vehicles found.</div>
        ) : (
          <div className="overflow-x-auto" ref={dropdownRef}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/50 bg-white/40 backdrop-blur-sm text-left">
                  {['#', 'SR', 'Vehicle Code', 'Reg No', 'Type', 'Make / Model', 'Owner\'s Name', 'CNIC', 'Phone', 'Zakwan ID', 'Joining Date', 'Status', ''].map(h => (
                    <th key={h} className="px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {filtered.map((v, idx) => (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.015 }}
                    className={`hover:bg-white/50 transition-colors ${v.status === 'Terminated' ? 'opacity-70' : ''}`}
                  >
                    {/* Row # */}
                    <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>

                    {/* SR */}
                    <td className="px-3 py-2.5">
                      <div className="w-7 h-7 bg-slate-100 rounded-md flex items-center justify-center font-semibold text-slate-700">
                        {v.sr || idx + 1}
                      </div>
                    </td>

                    {/* Vehicle Code */}
                    <td className="px-3 py-2.5">
                      <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {v.vehicle_code || '—'}
                      </span>
                    </td>

                    {/* Reg No */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id
                        ? <input value={editFormData.reg_no} onChange={e => handleEditChange('reg_no', e.target.value)} className={inputCls} />
                        : <div className="text-slate-700 font-mono">{v.reg_no || '—'}</div>}
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id
                        ? <select value={editFormData.type} onChange={e => handleEditChange('type', e.target.value)} className={inputCls}>
                          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        : <div className="text-slate-700">{v.type || '—'}</div>}
                    </td>

                    {/* Make / Model */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id
                        ? <div className="flex gap-1">
                          <input value={editFormData.make} onChange={e => handleEditChange('make', e.target.value)} placeholder="Make" className={inputCls} />
                          <input value={editFormData.model} onChange={e => handleEditChange('model', e.target.value)} placeholder="Model" className={inputCls} />
                        </div>
                        : <div className="text-slate-700">{[v.make, v.model].filter(Boolean).join(' / ') || '—'}</div>}
                    </td>

                    {/* Owner's Name */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id
                        ? <div className="flex flex-col gap-1">
                          <select value={editFormData.owned_by_type} onChange={e => handleEditChange('owned_by_type', e.target.value)} className={inputCls}>
                            <option value="Contractor">Contractor</option>
                            <option value="Local Govt">Local Govt</option>
                            <option value="Other">Other</option>
                          </select>
                          {editFormData.owned_by_type === 'Other' &&
                            <input value={editFormData.owned_by} onChange={e => handleEditChange('owned_by', e.target.value)} placeholder="Owner name" className={inputCls} />}
                        </div>
                        : <div className="text-slate-800 font-medium">{v.owned_by || v.owned_by_type || '—'}</div>}
                    </td>

                    {/* CNIC */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id
                        ? <input value={editFormData.owner_cnic} onChange={e => handleEditChange('owner_cnic', e.target.value)} placeholder="CNIC" className={inputCls} />
                        : <div className="text-slate-600 font-mono tracking-wide">{v.owner_cnic || <span className="text-slate-300">—</span>}</div>}
                    </td>

                    {/* Phone */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id
                        ? <input value={editFormData.owner_contact} onChange={e => handleEditChange('owner_contact', e.target.value)} placeholder="Phone" className={inputCls} />
                        : <div className="text-slate-600">{v.owner_contact || <span className="text-slate-300">—</span>}</div>}
                    </td>

                    {/* Zakwan ID */}
                    <td className="px-3 py-2.5">
                      <div className="text-slate-700 font-mono">{v.reg_id || '—'}</div>
                    </td>

                    {/* Joining Date */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id
                        ? <input type="date" value={editFormData.joining_date} onChange={e => handleEditChange('joining_date', e.target.value)} className={inputCls} />
                        : <div className="text-slate-600 whitespace-nowrap">{fmtDate(v.joining_date)}</div>}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id
                        ? <select value={editFormData.status} onChange={e => handleEditChange('status', e.target.value)} className={inputCls}>
                          <option>Active</option>
                          <option>Inactive</option>
                          <option>Maintenance</option>
                          <option>Terminated</option>
                        </select>
                        : <StatusBadge status={v.status} />}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      {editingId === v.id ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSaveEdit(v.id)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors">
                            Save
                          </button>
                          <button onClick={handleCancelEdit}
                            className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === v.id ? null : v.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {/* 3-dot icon */}
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>

                          <AnimatePresence>
                            {activeDropdown === v.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.1 }}
                                className="absolute right-0 top-8 z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                              >
                                <button onClick={() => handleEdit(v)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>

                                <button onClick={() => handleViewHistory(v)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  View History
                                </button>

                                <div className="border-t border-slate-100" />

                                {v.status === 'Terminated' ? (
                                  <button onClick={() => handleReactivate(v)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Reactivate
                                  </button>
                                ) : (
                                  <button onClick={() => handleTerminateClick(v)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    Terminate
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Termination Confirmation Modal ── */}
      <AnimatePresence>
        {terminationModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Terminate Vehicle?</h3>
                  <p className="text-sm text-slate-500">This will mark the vehicle as Terminated.</p>
                </div>
              </div>

              {terminationModal.vehicle && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle Code</span>
                    <span className="font-mono font-semibold text-slate-800">{terminationModal.vehicle.vehicle_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Zakwan ID</span>
                    <span className="font-mono text-slate-700">{terminationModal.vehicle.reg_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type</span>
                    <span className="text-slate-700">{terminationModal.vehicle.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Owner</span>
                    <span className="text-slate-700">{terminationModal.vehicle.owned_by || terminationModal.vehicle.owned_by_type || '—'}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setTerminationModal({ open: false, vehicle: null })}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button onClick={confirmTermination} disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                  {loading ? 'Terminating...' : 'Yes, Terminate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── History Modal ── */}
      <AnimatePresence>
        {historyModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Status History</h3>
                  {historyModal.vehicle && (
                    <p className="text-sm text-slate-500 font-mono">{historyModal.vehicle.vehicle_code} · {historyModal.vehicle.reg_id}</p>
                  )}
                </div>
                <button onClick={() => setHistoryModal({ open: false, vehicle: null, history: [] })}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {historyModal.history.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No status history recorded yet.</div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {historyModal.history.map((h, i) => (
                    <div key={h.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${h.new_status === 'Active' ? 'bg-emerald-500' : h.new_status === 'Terminated' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{h.new_status}</div>
                          <div className="text-xs text-slate-400">{h.changed_at ? new Date(h.changed_at).toLocaleString('en-PK') : '—'}</div>
                        </div>
                      </div>
                      {h.old_status && (
                        <div className="text-xs text-slate-400">from <span className="font-medium text-slate-600">{h.old_status}</span></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
