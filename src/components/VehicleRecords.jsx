import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'
import MonthPicker from './WorkerFormParts/MonthPicker'

export default function VehicleRecords() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  const [historyModal, setHistoryModal] = useState({ open: false, vehicleId: null, history: [] })

  useEffect(() => { loadVehicles() }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('vehicle_registrations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setVehicles(data || [])
    } catch (err) {
      console.error('Error loading vehicle records:', err)
      setError('Failed to load vehicle records')
    } finally {
      setLoading(false)
    }
  }

  const filtered = vehicles.filter(v => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || (v.reg_id || '').toLowerCase().includes(q) || (v.reg_no || '').toLowerCase().includes(q) || (v.vehicle_code || '').toLowerCase().includes(q)
    const matchesType = !typeFilter || (v.type || '') === typeFilter

    const matchesMonth = () => {
      if (!monthFilter) return true
      const joiningDate = v.joining_date ? new Date(v.joining_date) : null
      if (!joiningDate) return false
      const [year, month] = monthFilter.split('-')
      return joiningDate.getFullYear() === parseInt(year) && joiningDate.getMonth() + 1 === parseInt(month)
    }

    return matchesSearch && matchesType && matchesMonth()
  })

  const handleEdit = (vehicle) => {
    setEditingId(vehicle.id)
    setEditFormData({
      reg_no: vehicle.reg_no || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || '',
      owned_by: vehicle.owned_by || '',
      status: vehicle.status || 'Active'
    })
  }

  const handleEditChange = (e, field) => {
    setEditFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSaveEdit = async (id) => {
    try {
      setLoading(true)
      const { error } = await supabase.from('vehicle_registrations').update(editFormData).eq('id', id)
      if (error) throw error
      setEditingId(null)
      setEditFormData({})
      await loadVehicles()
    } catch (err) {
      console.error('Error saving vehicle edit:', err)
      setError('Failed to save changes')
    } finally { setLoading(false) }
  }

  const handleStatusUpdate = async (vehicleId, newStatus) => {
    try {
      setLoading(true)
      const old = vehicles.find(v => v.id === vehicleId)
      const { error } = await supabase.from('vehicle_registrations').update({ status: newStatus }).eq('id', vehicleId)
      if (error) throw error

      // Insert history record (migration should create this table)
      const { error: histErr } = await supabase.from('vehicle_status_history').insert([{ vehicle_id: vehicleId, old_status: old?.status || null, new_status: newStatus, changed_at: new Date().toISOString() }])
      if (histErr) console.warn('History insert warning:', histErr)

      await loadVehicles()
      setTimeout(() => setError(''), 2000)
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status')
    } finally { setLoading(false) }
  }

  const handleViewHistory = async (vehicleId) => {
    try {
      const { data, error } = await supabase.from('vehicle_status_history').select('*').eq('vehicle_id', vehicleId).order('changed_at', { ascending: false })
      if (error) throw error
      setHistoryModal({ open: true, vehicleId, history: data || [] })
    } catch (err) {
      console.error('Error loading vehicle history:', err)
      setError('Failed to load history')
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vehicle Records</h2>
            <p className="text-slate-500 text-sm">Editable vehicle records and status history</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-xl shadow-sm">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-purple-700 text-sm font-medium">Editable Records</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-slate-900 placeholder-slate-400 text-sm" placeholder="Search by reg id or reg no..." />
              </div>
            </div>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-slate-700 text-sm">
              <option value="">All Types</option>
              <option value="Truck">Truck</option>
              <option value="Van">Van</option>
              <option value="Car">Car</option>
            </select>

            <MonthPicker value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />

            <div className="px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg text-purple-700 text-xs font-semibold">{filtered.length} of {vehicles.length}</div>
            {(searchQuery || typeFilter || monthFilter) && (<button onClick={() => { setSearchQuery(''); setTypeFilter(''); setMonthFilter('') }} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-600 text-xs font-medium">Clear</button>)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Reg ID</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Reg No</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Make/Model</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v, idx) => (
                <motion.tr key={v.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className="hover:bg-gray-50 bg-white">
                  <td className="px-3 py-2"><span className="text-slate-400">{idx + 1}</span></td>
                  <td className="px-3 py-2"><div className="text-slate-900 font-mono">{v.reg_id || v.vehicle_code || '-'}</div></td>
                  <td className="px-3 py-2">
                    {editingId === v.id ? (
                      <input value={editFormData.reg_no} onChange={(e) => handleEditChange(e, 'reg_no')} className="w-full px-2 py-1 border rounded text-sm" />
                    ) : (
                      <div className="text-slate-700 truncate">{v.reg_no || '-'}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === v.id ? (
                      <div className="flex gap-2">
                        <input value={editFormData.make} onChange={(e) => handleEditChange(e, 'make')} className="w-1/2 px-2 py-1 border rounded text-sm" />
                        <input value={editFormData.model} onChange={(e) => handleEditChange(e, 'model')} className="w-1/2 px-2 py-1 border rounded text-sm" />
                      </div>
                    ) : (
                      <div className="text-slate-700">{[v.make, v.model].filter(Boolean).join(' / ') || '-'}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{editingId === v.id ? <input value={editFormData.year} onChange={(e) => handleEditChange(e, 'year')} className="w-20 px-2 py-1 border rounded text-sm" /> : <div className="text-slate-700">{v.type || '-'}</div>}</td>
                  <td className="px-3 py-2">{editingId === v.id ? <input value={editFormData.owned_by} onChange={(e) => handleEditChange(e, 'owned_by')} className="w-full px-2 py-1 border rounded text-sm" /> : <div className="text-slate-700">{v.owned_by || '-'}</div>}</td>
                  <td className="px-3 py-2"><div className="text-slate-600">{v.joining_date ? new Date(v.joining_date).toLocaleDateString() : '-'}</div></td>
                  <td className="px-3 py-2 text-center">
                    {editingId === v.id ? (
                      <select value={editFormData.status} onChange={(e) => handleEditChange(e, 'status')} className="px-2 py-1 text-sm border rounded">
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>Maintenance</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>{v.status || 'Unknown'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === v.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(v.id)} className="px-3 py-1 bg-purple-600 text-white rounded text-xs">Save</button>
                          <button onClick={() => { setEditingId(null); setEditFormData({}) }} className="px-3 py-1 bg-gray-50 border rounded text-xs">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(v)} className="px-2 py-1 bg-gray-50 border rounded text-xs">Edit</button>
                          <button onClick={() => handleStatusUpdate(v.id, v.status === 'Active' ? 'Inactive' : 'Active')} className="px-2 py-1 bg-gray-50 border rounded text-xs">Toggle Status</button>
                          <button onClick={() => handleViewHistory(v.id)} className="px-2 py-1 bg-gray-50 border rounded text-xs">History</button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {historyModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-11/12 md:w-1/2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Status History</h3>
              <button onClick={() => setHistoryModal({ open: false, vehicleId: null, history: [] })} className="text-slate-500">Close</button>
            </div>
            <div className="space-y-2">
              {historyModal.history.length === 0 ? (
                <p className="text-slate-500">No history available.</p>
              ) : (
                historyModal.history.map(h => (
                  <div key={h.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="text-slate-700 font-medium">{h.new_status}</div>
                      <div className="text-slate-400 text-xs">Changed at: {h.changed_at ? new Date(h.changed_at).toLocaleString() : '-'}</div>
                    </div>
                    <div className="text-slate-400 text-xs">Old: {h.old_status || '-'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
