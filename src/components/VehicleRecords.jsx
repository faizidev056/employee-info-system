import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'

const VEHICLE_TYPES = [
  'Tractor Trolley', 'Front end blade', 'Front end loader', 'Dumper truck',
  'Arm roller', 'Compactor', 'Mini tripper', 'Loader rickshaws',
  'Mechanical Washer', 'Mechanical sweeper', 'Drain cleaner',
  'Water bowser', 'Container Repair Vehicle', 'Other'
]

export default function VehicleRecords({ darkMode = false, externalSearchQuery = '', externalTypeFilter = '' }) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search / type filter driven by parent VehicleManager header
  const searchQuery = externalSearchQuery
  const typeFilter = externalTypeFilter
  // Status filter is local (not in the shared header)
  const [statusFilter, setStatusFilter] = useState('')

  // 3-dot dropdown (per row)
  const [activeDropdown, setActiveDropdown] = useState(null)

  // Edit modal
  const [editingVehicle, setEditingVehicle] = useState(null)
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
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q ||
      (v.vehicle_code || '').toLowerCase().includes(q) ||
      (v.reg_id || '').toLowerCase().includes(q) ||
      (v.reg_no || '').toLowerCase().includes(q) ||
      (v.owned_by || '').toLowerCase().includes(q) ||
      String(v.sr || '').toLowerCase().includes(q)
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

  // ── Status Update ─────────────────────────────────────────
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

      await supabase.from('vehicle_status_history').insert([{
        vehicle_id: vehicle.id,
        old_status: vehicle.status,
        new_status: newStatus,
        changed_at: new Date().toISOString()
      }]).then(({ error: he }) => { if (he) console.warn('History:', he) })

      await loadVehicles()
      flash('success', `Vehicle status updated to ${newStatus}`)
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

  const statusStyle = (s) => {
    if (darkMode) {
      return {
        Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25',
        Terminated: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/25',
        Inactive: 'bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700',
        Maintenance: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/25',
      }[s] || 'bg-slate-800 text-slate-500 border-white/5'
    }
    return {
      Active: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
      Terminated: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100',
      Inactive: 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100',
      Maintenance: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
    }[s] || 'bg-gray-50 text-gray-500 border-gray-200'
  }

  const fieldCls = `w-full px-4 py-2.5 rounded-xl border transition-all text-sm font-medium focus:ring-4 ${darkMode
    ? 'bg-white/5 border-white/10 text-white focus:border-emerald-500/50 focus:ring-emerald-500/10'
    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500/50 focus:ring-emerald-500/5'
    }`

  return (
    <div className="max-w-[1500px] mx-auto">

      {/* ── Toasts ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mb-4 p-3 border rounded-xl text-sm flex items-center gap-2 ${darkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />{error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mb-4 p-3 border rounded-xl text-sm flex items-center gap-2 ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />{success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status filter (search + type come from VehicleManager header) ── */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className={`px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${darkMode ? 'bg-slate-900/60 border-white/10 text-white focus:ring-emerald-500/30' : 'bg-white/80 border-emerald-100 text-slate-700 focus:ring-emerald-400/30'}`}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Terminated">Terminated</option>
          <option value="Inactive">Inactive</option>
          <option value="Maintenance">Maintenance</option>
        </select>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${darkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          {filtered.length} of {vehicles.length} vehicles
        </div>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-500 text-xs font-medium transition-colors">
            Clear Status
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {loading && !vehicles.length ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`border rounded-2xl p-16 text-center text-sm transition-colors ${darkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
          No vehicles found.
        </div>
      ) : (
        <div className={`border rounded-2xl overflow-hidden transition-colors ${darkMode ? 'bg-white/5 border-white/6' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full text-[10px]">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-white/6 bg-white/5' : 'border-slate-100 bg-slate-50'} text-left`}>
                  {['#', 'SR', 'Vehicle Code', 'Reg No', 'Type', 'Make / Model', 'Owner Name', 'CNIC', 'Phone', 'Zakwan ID', 'Joined'].map(h => (
                    <th key={h} className={`px-1.5 py-2.5 font-semibold text-[10px] uppercase tracking-tight whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{h}</th>
                  ))}
                  <th className={`px-1.5 py-2.5 font-semibold text-[10px] uppercase tracking-tight whitespace-nowrap text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                {filtered.map((v, idx) => (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.015 }}
                    className={`transition-colors group ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                  >
                    <td className={`px-1.5 py-2 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</td>

                    <td className="px-1.5 py-2 text-center">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center font-semibold mx-auto ${darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                        {v.sr || idx + 1}
                      </div>
                    </td>

                    <td className="px-1.5 py-2">
                      <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-100 text-slate-900'}`}>
                        {v.vehicle_code || '—'}
                      </span>
                    </td>

                    <td className={`px-1.5 py-2 font-mono ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>{v.reg_no || '—'}</td>
                    <td className={`px-1.5 py-2 ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>{v.type || '—'}</td>

                    <td className={`px-1.5 py-2 truncate max-w-[80px] ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                      {[v.make, v.model].filter(Boolean).join(' / ') || '—'}
                    </td>

                    <td className={`px-1.5 py-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                      <div className="truncate max-w-[100px]" title={v.owned_by || v.owned_by_type}>
                        {v.owned_by || v.owned_by_type || '—'}
                      </div>
                    </td>

                    <td className={`px-1.5 py-2 font-mono tracking-tighter ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {v.owner_cnic || <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>—</span>}
                    </td>

                    <td className={`px-1.5 py-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {v.owner_contact || <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>—</span>}
                    </td>

                    <td className={`px-1.5 py-2 font-mono ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>{v.reg_id || '—'}</td>
                    <td className={`px-1.5 py-2 whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{fmtDate(v.joining_date)}</td>

                    {/* Status + Actions */}
                    <td className="px-1.5 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative">
                          <motion.button
                            onClick={() => setActiveDropdown(activeDropdown === v.id ? null : v.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all duration-200 w-20 text-center ${statusStyle(v.status)}`}
                          >
                            {v.status || 'Active'}
                          </motion.button>

                          <AnimatePresence>
                            {activeDropdown === v.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className={`absolute right-0 mt-2 w-32 rounded-xl shadow-xl z-50 overflow-hidden text-left origin-top-right border ${darkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'
                                  }`}
                              >
                                {v.status === 'Terminated' ? (
                                  <button onClick={() => { handleStatusUpdate(v, 'Active'); setActiveDropdown(null); }} className={`w-full px-3 py-2 text-[10px] font-bold flex items-center gap-2 transition-colors border-b ${darkMode ? 'text-emerald-400 hover:bg-white/5 border-white/5' : 'text-emerald-600 hover:bg-emerald-50 border-slate-100'}`}>
                                    <span>✓</span> Reactivate
                                  </button>
                                ) : (
                                  <button onClick={() => handleTerminateClick(v)} className={`w-full px-3 py-2 text-[10px] font-bold flex items-center gap-2 transition-colors border-b ${darkMode ? 'text-rose-400 hover:bg-white/5 border-white/5' : 'text-rose-600 hover:bg-rose-50 border-slate-100'}`}>
                                    <span>✕</span> Terminate
                                  </button>
                                )}
                                <button onClick={() => handleViewHistory(v)} className={`w-full px-3 py-2 text-[10px] font-bold flex items-center gap-2 transition-colors ${darkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'}`}>
                                  <span>◷</span> History
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <motion.button
                          onClick={() => openEditModal(v)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                          title="Edit Vehicle"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editingVehicle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setEditingVehicle(null); setEditFormData({}) }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`border shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
            >
              {/* Modal Header */}
              <div className={`p-6 border-b transition-colors flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/90'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Edit Vehicle Profile</h2>
                    <p className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Update internal records for {editingVehicle?.vehicle_code || 'Vehicle'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setEditingVehicle(null); setEditFormData({}) }}
                  className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-6">
                  {/* General Details */}
                  {[
                    { key: 'reg_no', label: 'Registration Number' },
                    { key: 'make', label: 'Make' },
                    { key: 'model', label: 'Model' },
                    { key: 'year', label: 'Year', type: 'number' },
                    { key: 'joining_date', label: 'Joining Date', type: 'date' },
                    { key: 'owner_contact', label: 'Owner Phone' },
                    { key: 'owner_cnic', label: 'Owner CNIC' },
                  ].map(({ key, label, type }) => (
                    <div key={key} className="space-y-1.5">
                      <label className={`block text-[10px] font-bold uppercase tracking-widest pl-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {label}
                      </label>
                      <input
                        type={type || 'text'}
                        value={editFormData[key] || ''}
                        onChange={(e) => handleEditChange(key, e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${darkMode
                          ? 'bg-slate-800/50 border-white/10 text-white focus:border-emerald-500/50'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white shadow-sm'
                          }`}
                      />
                    </div>
                  ))}

                  {/* Vehicle Type Selection */}
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] font-bold uppercase tracking-widest pl-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Vehicle Type
                    </label>
                    <select
                      value={editFormData.type || ''}
                      onChange={(e) => handleEditChange('type', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none ${darkMode
                        ? 'bg-slate-800/50 border-white/10 text-white focus:border-emerald-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white shadow-sm'
                        }`}
                    >
                      <option value="">Select type</option>
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Ownership Type Selection */}
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] font-bold uppercase tracking-widest pl-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ownership Type
                    </label>
                    <select
                      value={editFormData.owned_by_type || ''}
                      onChange={(e) => handleEditChange('owned_by_type', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none ${darkMode
                        ? 'bg-slate-800/50 border-white/10 text-white focus:border-emerald-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white shadow-sm'
                        }`}
                    >
                      <option value="Contractor">Contractor</option>
                      <option value="Local Govt">Local Govt</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {editFormData.owned_by_type === 'Other' && (
                    <div className="space-y-1.5">
                      <label className={`block text-[10px] font-bold uppercase tracking-widest pl-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Owner's Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.owned_by || ''}
                        onChange={(e) => handleEditChange('owned_by', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${darkMode
                          ? 'bg-slate-800/50 border-white/10 text-white focus:border-emerald-500/50'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white shadow-sm'
                          }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`p-6 border-t transition-colors flex items-center justify-between sticky bottom-0 z-20 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/90'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[10px] ${darkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    ID
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Internal System Ref: {editingVehicle?.id ? String(editingVehicle.id).split('-')[0] : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setEditingVehicle(null); setEditFormData({}) }}
                    className={`px-6 py-2.5 rounded-xl transition-all font-bold text-sm ${darkMode
                      ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                      }`}
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Update Vehicle
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          TERMINATION MODAL
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {terminationModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTerminationModal({ open: false, vehicle: null })}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative max-w-md w-full p-8 rounded-[2rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border transition-all ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}
            >
              {/* Danger Glow Effect */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/20 blur-[80px] pointer-events-none opacity-50"></div>

              <div className="relative mb-8 flex flex-col items-center">
                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mb-6 rotate-12 group hover:rotate-0 transition-transform duration-500">
                  <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                <h2 className={`text-2xl font-black mb-2 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Decommission Vehicle?</h2>
                <p className={`text-sm text-center font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  This action will immediately revoke active status for this unit in the system records.
                </p>
              </div>

              {terminationModal.vehicle && (
                <div className={`mb-8 p-5 rounded-3xl border transition-colors flex items-center gap-4 ${darkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-sm'}`}>
                    V
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {terminationModal.vehicle?.vehicle_code}
                    </p>
                    <p className={`text-[10px] font-mono font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      REG ID: {terminationModal.vehicle?.reg_id}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    Active
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmTermination}
                  disabled={loading}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-[1.25rem] transition-all font-black text-sm shadow-xl shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Confirm Decommission
                    </>
                  )}
                </button>

                <button
                  onClick={() => setTerminationModal({ open: false, vehicle: null })}
                  className={`w-full py-4 rounded-[1.25rem] transition-all font-bold text-sm ${darkMode
                    ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                >
                  Keep Unit Active
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          HISTORY MODAL
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {historyModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryModal({ open: false, vehicle: null, history: [] })}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`border shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col transition-colors ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
            >
              {/* Modal Header */}
              <div className={`p-6 border-b transition-colors flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/90'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Lifecycle History</h2>
                    {historyModal.vehicle && (
                      <p className={`text-xs font-black uppercase tracking-widest mt-0.5 ${darkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>
                        {historyModal.vehicle?.vehicle_code} · <span className="opacity-50">{historyModal.vehicle?.reg_id}</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModal({ open: false, vehicle: null, history: [] })}
                  className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {historyModal.history && historyModal.history.length > 0 ? (
                  <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500/50 before:via-slate-500/20 before:to-transparent">
                    {historyModal.history.map((entry, idx) => (
                      <div key={idx} className="relative group">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[33px] top-1.5 w-6 h-6 rounded-full border-4 flex items-center justify-center transition-colors shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 group-hover:border-emerald-500/50' : 'bg-white border-slate-100 group-hover:border-emerald-400/50'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${entry.new_status === 'Active' ? 'bg-emerald-500' : entry.new_status === 'Terminated' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                        </div>

                        <div className={`p-4 rounded-2xl border transition-all ${darkMode
                          ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                          : 'bg-slate-50/50 border-slate-200/50 hover:bg-white hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-500/5'
                          }`}>
                          <div className="flex flex-col gap-1 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              Status Migration
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border border-slate-100 text-slate-500'}`}>
                                {entry.old_status}
                              </span>
                              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${entry.new_status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                                entry.new_status === 'Terminated' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                {entry.new_status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className={`text-[11px] font-medium transition-colors ${darkMode ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-700'}`}>
                              {new Date(entry.changed_at).toLocaleString('en-PK', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-50 text-slate-300'}`}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No lifecycle events recorded</p>
                  </div>
                )}
              </div>

              <div className={`p-4 border-t transition-colors flex items-center justify-center sticky bottom-0 z-20 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/90'}`}>
                <button
                  onClick={() => setHistoryModal({ open: false, vehicle: null, history: [] })}
                  className={`w-full py-2.5 rounded-xl transition-all font-bold text-sm ${darkMode
                    ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                >
                  Close Lifecycle Monitor
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
