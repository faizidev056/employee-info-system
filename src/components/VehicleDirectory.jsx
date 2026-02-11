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
        .order('created_at', { ascending: false })

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

  const filtered = vehicles.filter(v => {
    const q = searchQuery.toLowerCase()

    // Support both new `vehicle_registrations` and legacy `vehicles` fields
    const nameOrModel = (v.name || v.model || v.reg_no || '')
    const plateOrReg = (v.plate_number || v.reg_no || v.reg_id || '')
    const code = (v.code || v.vehicle_code || v.reg_id || '')

    const matchesSearch = !searchQuery || nameOrModel.toLowerCase().includes(q) || plateOrReg.toLowerCase().includes(q) || code.toLowerCase().includes(q)
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
          <div className="p-6 border-b border-white/40 bg-white/30 backdrop-blur-md">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, plate, or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm transition-all"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-700 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="">All Types</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Car">Car</option>
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/40 border-b border-white/50 text-xs backdrop-blur-sm">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider"># / SR</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Reg ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Reg No / Plate</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Make / Model</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((v, idx) => (
                  <motion.tr key={v.id || idx} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className="group hover:bg-white/40 bg-transparent transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center text-slate-700 font-semibold text-sm">{idx + 1}</div>
                        <div>
                          <div className="text-slate-900 text-sm font-medium truncate">{v.sr || v.id || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2"><div className="text-slate-900 text-sm font-mono font-semibold">{v.reg_id || v.vehicle_code || v.code || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-700 text-sm">{v.reg_no || v.plate_number || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-700 text-sm">{[v.make, v.model].filter(Boolean).join(' / ') || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-700 text-sm">{v.type || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-600 text-sm">{v.owned_by || v.assigned_driver || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-600 text-sm">{v.joining_date ? new Date(v.joining_date).toLocaleDateString() : '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-sm"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>{v.status || 'Unknown'}</span></div></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  )
}
