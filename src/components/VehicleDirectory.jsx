import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'

export default function VehicleDirectory() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)

      // Prefer the canonical `vehicle_registrations` table
      let { data, error } = await supabase
        .from('vehicle_registrations')
        .select('*')
        .order('sr', { ascending: true })

      if (error) {
        // Fallback to legacy `vehicles` table if present
        console.warn('vehicle_registrations load error, falling back to vehicles:', error.message || error)
        const res = await supabase.from('vehicles').select('*').order('created_at', { ascending: false })
        data = res.data
        if (res.error) console.warn('vehicles fallback error:', res.error)
      }

      setVehicles(data || [])
    } catch (err) {
      console.error('Error loading vehicles:', err)
      setError('Failed to load vehicles')
    } finally {
      setLoading(false)
    }
  }

  const VEHICLE_TYPES = [
    'Tractor Trolley', 'Front end blade', 'Front end loader', 'Dumper truck',
    'Arm roller', 'Compactor', 'Mini tripper', 'Loader rickshaws',
    'Mechanical Washer', 'Mechanical sweeper', 'Drain cleaner',
    'Water bowser', 'Container Repair Vehicle', 'Other'
  ]

  const filtered = vehicles.filter(v => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery ||
      (v.vehicle_code || '').toLowerCase().includes(q) ||
      (v.owned_by || '').toLowerCase().includes(q) ||
      (v.owner_cnic || '').toLowerCase().includes(q) ||
      (v.owner_contact || '').toLowerCase().includes(q) ||
      (v.reg_id || '').toLowerCase().includes(q) ||
      (v.reg_no || '').toLowerCase().includes(q) ||
      (v.sr || '').toLowerCase().includes(q)
    const matchesType = !typeFilter || (v.type || '') === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13l2-2m0 0l7-7 7 7M13 21V9" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vehicle Directory</h2>
            <p className="text-slate-500 text-sm">Browse registered vehicles — Read only</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading vehicles...</p>
          </div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-12 text-center shadow-lg">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13l2-2m0 0l7-7 7 7M13 21V9" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No Vehicles Registered</h3>
          <p className="text-slate-500 mb-8">Add vehicles via the registration form to populate this directory.</p>
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl overflow-hidden shadow-lg">
          {/* Toolbar */}
          <div className="p-6 border-b border-white/40 bg-white/30 backdrop-blur-md">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by vehicle code, owner, CNIC, Zakwan ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm transition-all"
                  />
                </div>

                {/* Type filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-700 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="">All Types</option>
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 border border-cyan-100 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                  <span className="text-cyan-700 text-xs font-semibold">{filtered.length} of {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</span>
                </div>
                {(searchQuery || typeFilter) && (
                  <button onClick={() => { setSearchQuery(''); setTypeFilter('') }} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-600 text-xs font-medium">Clear Filters</button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-white/40 border-b border-white/50 backdrop-blur-sm">
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">SR</th>
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">Vehicle Code</th>
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">Owner's Name</th>
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">CNIC</th>
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">Phone</th>
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">Zakwan ID</th>
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">Reg No</th>
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">Joining Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((v, idx) => (
                  <motion.tr
                    key={v.id || idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group hover:bg-white/40 bg-transparent transition-colors"
                  >
                    {/* SR */}
                    <td className="px-2 py-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-md flex items-center justify-center text-slate-700 font-bold text-[11px]">
                        {v.sr || idx + 1}
                      </div>
                    </td>

                    {/* Vehicle Code */}
                    <td className="px-2 py-3">
                      <span className="font-mono font-bold text-[11px] text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {v.vehicle_code || '—'}
                      </span>
                    </td>

                    {/* Owner's Name */}
                    <td className="px-2 py-3">
                      <div className="text-slate-800 font-semibold truncate max-w-[120px]" title={v.owned_by || v.owned_by_type}>
                        {v.owned_by || v.owned_by_type || '—'}
                      </div>
                    </td>

                    {/* CNIC */}
                    <td className="px-2 py-3">
                      <div className="text-slate-600 font-mono tracking-tighter">
                        {v.owner_cnic || <span className="text-slate-300 font-sans">—</span>}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-2 py-3">
                      <div className="text-slate-600 whitespace-nowrap">
                        {v.owner_contact || <span className="text-slate-300">—</span>}
                      </div>
                    </td>

                    {/* Zakwan ID */}
                    <td className="px-2 py-3 font-mono text-slate-700">
                      {v.reg_id || '—'}
                    </td>

                    {/* Reg No */}
                    <td className="px-2 py-3 font-mono text-slate-700">
                      {v.reg_no || '—'}
                    </td>

                    {/* Joining Date */}
                    <td className="px-2 py-3 text-slate-600 whitespace-nowrap">
                      {v.joining_date
                        ? new Date(v.joining_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                No vehicles match your search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
