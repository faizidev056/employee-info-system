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

  // 3-dot dropdown (per row)
  const [activeDropdown, setActiveDropdown] = useState(null)

  // Edit modal
  const [editingVehicle, setEditingVehicle] = useState(null)   // full vehicle object
  const [editFormData, setEditFormData] = useState({})

  // Termination modal
  const [terminationModal, setTerminationModal] = useState({ open: false, vehicle: null })

  // History modal
  const [historyModal, setHistoryModal] = useState({ open: false, vehicle: null, history: [] })

  const tableRef = useRef(null)

  useEffect(() => { loadVehicles() }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Data ───────────────────────────────────────────────────
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

  const flash = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
    else { setError(msg); setTimeout(() => setError(''), 4000) }
  }

  // ── Filtering ──────────────────────────────────────────────
  const filtered = vehicles.filter(v => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery ||
      (v.vehicle_code || '').toLowerCase().includes(q) ||
      (v.reg_id || '').toLowerCase().includes(q) ||
      (v.reg_no || '').toLowerCase().includes(q) ||
      (v.owned_by || '').toLowerCase().includes(q) ||
      (v.sr || '').toString().toLowerCase().includes(q)
    const matchesType = !typeFilter || v.type === typeFilter
    const matchesStatus = !statusFilter || v.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  // ── Edit Modal ─────────────────────────────────────────────
  const openEditModal = (v) => {
    setEditingVehicle(v)
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
    })
    setActiveDropdown(null)
  }

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveEdit = async () => {
    if (!editingVehicle) return
    try {
      setLoading(true)
      const { error } = await supabase
        .from('vehicle_registrations')
        .update(editFormData)
        .eq('id', editingVehicle.id)
      if (error) throw error
      setEditingVehicle(null)
      setEditFormData({})
      await loadVehicles()
      flash('success', 'Vehicle updated successfully!')
    } catch (err) {
      console.error(err)
      flash('error', 'Failed to save changes: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Status Update (shared) ─────────────────────────────────
  const handleStatusUpdate = async (vehicle, newStatus) => {
    try {
      setLoading(true)
      const payload = { status: newStatus }
      if (newStatus === 'Terminated') payload.termination_date = new Date().toISOString().split('T')[0]
      if (newStatus === 'Active') payload.termination_date = null

      const { error } = await supabase
        .from('vehicle_registrations')
        .update(payload)
        .eq('id', vehicle.id)
      if (error) throw error

      // Log history (graceful)
      await supabase.from('vehicle_status_history').insert([{
        vehicle_id: vehicle.id,
        old_status: vehicle.status,
        new_status: newStatus,
        changed_at: new Date().toISOString()
      }]).then(({ error: he }) => { if (he) console.warn('History:', he) })

      await loadVehicles()
      flash('success', `Vehicle status updated to ${newStatus}`)

      // Auto-open history after status change
      await openHistory(vehicle.id)
    } catch (err) {
      console.error(err)
      flash('error', 'Failed to update status: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Terminate ──────────────────────────────────────────────
  const handleTerminateClick = (v) => {
    setTerminationModal({ open: true, vehicle: v })
    setActiveDropdown(null)
  }

  const confirmTermination = async () => {
    const v = terminationModal.vehicle
    if (!v) return
    setTerminationModal({ open: false, vehicle: null })
    await handleStatusUpdate(v, 'Terminated')
  }

  // ── History ────────────────────────────────────────────────
  const openHistory = async (vehicleId) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_status_history')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('changed_at', { ascending: false })
      if (error) throw error
      const v = vehicles.find(x => x.id === vehicleId)
      setHistoryModal({ open: true, vehicle: v, history: data || [] })
    } catch (err) {
      console.error(err)
      flash('error', 'Failed to load history')
    }
  }

  const handleViewHistory = async (v) => {
    setActiveDropdown(null)
    await openHistory(v.id)
  }

  // ── Helpers ────────────────────────────────────────────────
  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: '2-digit' })
    : '—'

  const statusStyle = (s) => ({
    Active: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
    Terminated: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100',
    Inactive: 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100',
    Maintenance: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
  }[s] || 'bg-gray-50 text-gray-500 border-gray-200')

  const fieldCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors'

  return (
    <div className="max-w-[1500px] mx-auto">

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
            <p className="text-slate-500 text-sm">Edit vehicle data · Manage status · View history</p>
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
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by SR, vehicle code, Zakwan ID, reg no, owner..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all">
              <option value="">All Types</option>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-white/50 border border-white/60 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all">
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Terminated">Terminated</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
            </select>
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
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/50 bg-white/40 backdrop-blur-sm text-left">
                  {['#', 'SR', 'Vehicle Code', 'Reg No', 'Type', 'Make / Model', "Owner Name", 'CNIC', 'Phone', 'Zakwan ID', 'Joined'].map(h => (
                    <th key={h} className="px-1.5 py-2 font-semibold text-slate-500 uppercase tracking-tight whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-1.5 py-2 font-semibold text-slate-500 uppercase tracking-tight whitespace-nowrap text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {filtered.map((v, idx) => (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.015 }}
                    className="hover:bg-white/50 transition-colors group"
                  >
                    <td className="px-1.5 py-2 text-slate-400 font-medium">{idx + 1}</td>

                    <td className="px-1.5 py-2 text-center">
                      <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center font-semibold text-slate-700 mx-auto">
                        {v.sr || idx + 1}
                      </div>
                    </td>

                    <td className="px-1.5 py-2">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {v.vehicle_code || '—'}
                      </span>
                    </td>

                    <td className="px-1.5 py-2 font-mono text-slate-700">{v.reg_no || '—'}</td>

                    <td className="px-1.5 py-2 text-slate-700">{v.type || '—'}</td>

                    <td className="px-1.5 py-2 text-slate-700 truncate max-w-[80px]">
                      {[v.make, v.model].filter(Boolean).join(' / ') || '—'}
                    </td>

                    <td className="px-1.5 py-2 font-medium text-slate-800">
                      <div className="truncate max-w-[100px]" title={v.owned_by || v.owned_by_type}>
                        {v.owned_by || v.owned_by_type || '—'}
                      </div>
                    </td>

                    <td className="px-1.5 py-2 font-mono text-slate-600 tracking-tighter">
                      {v.owner_cnic || <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-1.5 py-2 text-slate-600">
                      {v.owner_contact || <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-1.5 py-2 font-mono text-slate-700">{v.reg_id || '—'}</td>

                    <td className="px-1.5 py-2 text-slate-600 whitespace-nowrap">{fmtDate(v.joining_date)}</td>

                    {/* ── Status + Edit button cell (Centered) ── */}
                    <td className="px-1.5 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="relative">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveDropdown(activeDropdown === `status-${v.id}` ? null : `status-${v.id}`)
                            }}
                            className={`w-16 py-0.5 text-[9px] font-bold rounded-full border transition-all ${statusStyle(v.status)}`}
                          >
                            {v.status || 'Unknown'}
                          </motion.button>

                          <AnimatePresence>
                            {activeDropdown === `status-${v.id}` && (
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="absolute left-1/2 -translate-x-1/2 mt-1 z-50 w-40 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden origin-top"
                              >
                                {v.status !== 'Terminated' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleTerminateClick(v) }}
                                    className="block w-full text-left px-4 py-2.5 text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
                                  >
                                    Terminate
                                  </button>
                                )}
                                {v.status === 'Terminated' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); handleStatusUpdate(v, 'Active') }}
                                    className="block w-full text-left px-4 py-2.5 text-emerald-600 hover:bg-emerald-50 transition-colors text-sm font-medium"
                                  >
                                    Activate
                                  </button>
                                )}
                                {v.status === 'Inactive' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); handleStatusUpdate(v, 'Active') }}
                                    className="block w-full text-left px-4 py-2.5 text-emerald-600 hover:bg-emerald-50 transition-colors text-sm font-medium"
                                  >
                                    Activate
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleViewHistory(v) }}
                                  className="block w-full text-left px-4 py-2.5 text-purple-600 hover:bg-purple-50 transition-colors text-sm font-medium border-t border-gray-100"
                                >
                                  History
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openEditModal(v)}
                          title="Edit vehicle"
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1 flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          EDIT MODAL (full overlay, grid of fields)
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editingVehicle && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setEditingVehicle(null); setEditFormData({}) }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Vehicle</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {editingVehicle.vehicle_code} · {editingVehicle.reg_id}
                  </p>
                </div>
                <button
                  onClick={() => { setEditingVehicle(null); setEditFormData({}) }}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                  {/* Reg No */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Reg No</label>
                    <input type="text" value={editFormData.reg_no} onChange={e => handleEditChange('reg_no', e.target.value)} className={fieldCls} />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Vehicle Type</label>
                    <select value={editFormData.type} onChange={e => handleEditChange('type', e.target.value)} className={fieldCls}>
                      <option value="">Select type</option>
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Make */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Make</label>
                    <input type="text" value={editFormData.make} onChange={e => handleEditChange('make', e.target.value)} className={fieldCls} />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Model</label>
                    <input type="text" value={editFormData.model} onChange={e => handleEditChange('model', e.target.value)} className={fieldCls} />
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Year</label>
                    <input type="number" value={editFormData.year} onChange={e => handleEditChange('year', e.target.value)} className={fieldCls} />
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Joining Date</label>
                    <input type="date" value={editFormData.joining_date} onChange={e => handleEditChange('joining_date', e.target.value)} className={fieldCls} />
                  </div>

                  {/* Owned By Type */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Ownership Type</label>
                    <select value={editFormData.owned_by_type} onChange={e => handleEditChange('owned_by_type', e.target.value)} className={fieldCls}>
                      <option value="Contractor">Contractor</option>
                      <option value="Local Govt">Local Govt</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Owner Name (only if Other) */}
                  {editFormData.owned_by_type === 'Other' && (
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Owner's Name</label>
                      <input type="text" value={editFormData.owned_by} onChange={e => handleEditChange('owned_by', e.target.value)} className={fieldCls} />
                    </div>
                  )}

                  {/* CNIC */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Owner CNIC</label>
                    <input type="text" value={editFormData.owner_cnic} onChange={e => handleEditChange('owner_cnic', e.target.value)} placeholder="XXXXX-XXXXXXX-X" className={`${fieldCls} font-mono`} />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Owner Phone</label>
                    <input type="text" value={editFormData.owner_contact} onChange={e => handleEditChange('owner_contact', e.target.value)} className={fieldCls} />
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white/95 backdrop-blur">
                <button
                  onClick={() => { setEditingVehicle(null); setEditFormData({}) }}
                  className="px-4 py-2 bg-white text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-900/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          TERMINATION CONFIRMATION MODAL (dark gradient)
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {terminationModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTerminationModal({ open: false, vehicle: null })}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white text-center mb-3">Terminate Vehicle?</h2>
              {terminationModal.vehicle && (
                <p className="text-gray-300 text-center mb-4 text-sm">
                  <span className="font-semibold">Code:</span> {terminationModal.vehicle.vehicle_code} &nbsp;|&nbsp;
                  <span className="font-semibold">ID:</span> <span className="font-mono">{terminationModal.vehicle.reg_id}</span>
                </p>
              )}
              <p className="text-gray-400 text-center mb-6 text-sm">
                This will mark the vehicle as "Terminated" and log the change to history.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setTerminationModal({ open: false, vehicle: null })}
                  className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-500/30 rounded-lg transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTermination}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all font-medium disabled:opacity-50"
                >
                  {loading ? 'Terminating...' : 'Terminate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          HISTORY MODAL (dark gradient)
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {historyModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryModal({ open: false, vehicle: null, history: [] })}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 p-6 border-b border-white/10 bg-slate-900/90 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Status History</h2>
                    {historyModal.vehicle && (
                      <p className="text-gray-400 text-xs font-mono mt-0.5">
                        {historyModal.vehicle.vehicle_code} · {historyModal.vehicle.reg_id}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setHistoryModal({ open: false, vehicle: null, history: [] })}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {historyModal.history.length === 0 ? (
                  <p className="text-center text-gray-400">No status changes recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {historyModal.history.map((entry, idx) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-400">Status Changed</p>
                        </div>
                        <p className="text-white font-medium">
                          {entry.old_status || '—'} →{' '}
                          <span className={
                            entry.new_status === 'Active' ? 'text-green-400' :
                              entry.new_status === 'Terminated' ? 'text-red-400' :
                                'text-yellow-400'
                          }>
                            {entry.new_status}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.changed_at ? new Date(entry.changed_at).toLocaleString('en-PK') : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
