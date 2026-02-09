import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'

export default function VehicleTerminated() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-rose-600">Terminated Vehicles</h2>
          <p className="text-slate-500 text-sm">Read-only listing of terminated vehicles for auditing and reporting</p>
        </div>
        <div className="px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs font-semibold">{vehicles.filter(v => v.status === 'Terminated').length} terminated</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading terminated vehicles...</p>
          </div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No Terminated Vehicles</h3>
          <p className="text-slate-500 mb-8 text-lg">Vehicles terminated will appear here for audits and reports.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Reg ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Reg No</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Terminated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map((v, i) => (
                  <motion.tr key={v.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="transition-colors hover:bg-gray-50 bg-white">
                    <td className="px-3 py-2"><span className="text-slate-400">{i + 1}</span></td>
                    <td className="px-3 py-2"><div className="text-slate-900 font-mono">{v.reg_id || v.vehicle_code || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-700">{v.reg_no || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-700">{v.type || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-700">{v.owned_by || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-600">{v.joining_date ? new Date(v.joining_date).toLocaleDateString() : '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-600">{v.termination_date ? new Date(v.termination_date).toLocaleDateString() : '-'}</div></td>
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
