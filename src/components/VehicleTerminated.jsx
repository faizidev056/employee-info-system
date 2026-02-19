import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'

export default function VehicleTerminated({ darkMode = false, externalSearchQuery = '' }) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchQuery = externalSearchQuery

  useEffect(() => { loadTerminated() }, [])

  const loadTerminated = async () => {
    try {
      setLoading(true)

      // Fetch terminated vehicles from canonical table
      let { data, error } = await supabase
        .from('vehicle_registrations')
        .select('*')
        .eq('status', 'Terminated')
        .order('created_at', { ascending: false })

      if (error) {
        // fallback to legacy `vehicles` table
        console.warn('vehicle_registrations fetch error, falling back to vehicles:', error.message || error)
        const res = await supabase.from('vehicles').select('*').eq('status', 'Terminated').order('created_at', { ascending: false })
        data = res.data
        if (res.error) console.warn('vehicles fallback error:', res.error)
      }

      // If we have rows, try to attach latest termination timestamp from history
      if (data && data.length > 0) {
        const ids = data.map(d => d.id).filter(Boolean)
        if (ids.length > 0) {
          const { data: historyData } = await supabase
            .from('vehicle_status_history')
            .select('vehicle_id, new_status, changed_at')
            .in('vehicle_id', ids)
            .eq('new_status', 'Terminated')
            .order('changed_at', { ascending: false })

          const latestMap = {}
          if (historyData && historyData.length > 0) {
            for (const h of historyData) {
              if (!latestMap[h.vehicle_id]) latestMap[h.vehicle_id] = h.changed_at
            }
          }

          data = data.map(d => ({ ...d, termination_date: latestMap[d.id] ? latestMap[d.id].split('T')[0] : d.termination_date || null }))
        }
      }

      setVehicles(data || [])
    } catch (err) {
      console.error('Error loading terminated vehicles:', err)
      setError('Failed to load terminated vehicles')
    } finally {
      setLoading(false)
    }
  }

  const filtered = vehicles.filter(v => {
    const q = searchQuery.toLowerCase().trim()
    return !q ||
      (v.vehicle_code || '').toLowerCase().includes(q) ||
      (v.owned_by || '').toLowerCase().includes(q) ||
      (v.owner_cnic || '').toLowerCase().includes(q) ||
      (v.owner_contact || '').toLowerCase().includes(q) ||
      (v.reg_id || '').toLowerCase().includes(q) ||
      (v.reg_no || '').toLowerCase().includes(q) ||
      String(v.sr || '').toLowerCase().includes(q)
  })

  return (
    <div className="max-w-7xl mx-auto">

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Loading records...</p>
          </div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-12 text-center shadow-lg">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No Terminated Vehicles</h3>
          <p className="text-slate-500 mb-8">Inactive vehicles will appear here after termination.</p>
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl overflow-hidden shadow-lg">
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
                  <th className="px-2 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter">Joined Date</th>
                  <th className="px-2 py-3 text-left font-bold text-rose-600 uppercase tracking-tighter">Terminated On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((v, idx) => (
                  <motion.tr
                    key={v.id || idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group hover:bg-rose-50/30 transition-colors"
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
                        {v.owner_cnic || <span className="text-slate-300">—</span>}
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

                    {/* Joined Date */}
                    <td className="px-2 py-3 text-slate-600 whitespace-nowrap">
                      {v.joining_date
                        ? new Date(v.joining_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Terminated Date */}
                    <td className="px-2 py-3">
                      <div className="px-2 py-1 bg-rose-50 text-rose-700 rounded-md inline-block font-semibold whitespace-nowrap">
                        {v.termination_date
                          ? new Date(v.termination_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-rose-300">N/A</span>}
                      </div>
                    </td>
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
