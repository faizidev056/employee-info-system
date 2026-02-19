import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'

export default function VehicleDirectory({ darkMode = false, externalSearchQuery = '', externalTypeFilter = '' }) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)

  // Search / type filter are driven by VehicleManager's header — read-only here
  const searchQuery = externalSearchQuery
  const typeFilter = externalTypeFilter

  useEffect(() => { loadVehicles() }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      let { data, error } = await supabase
        .from('vehicle_registrations')
        .select('*')
        .order('sr', { ascending: true })

      if (error) {
        console.warn('vehicle_registrations error, falling back:', error.message)
        const res = await supabase.from('vehicles').select('*').order('created_at', { ascending: false })
        data = res.data
        if (res.error) console.warn('vehicles fallback error:', res.error)
      }

      setVehicles(data || [])
    } catch (err) {
      console.error('Error loading vehicles:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = vehicles.filter(v => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q ||
      (v.vehicle_code || '').toLowerCase().includes(q) ||
      (v.owned_by || '').toLowerCase().includes(q) ||
      (v.owner_cnic || '').toLowerCase().includes(q) ||
      (v.owner_contact || '').toLowerCase().includes(q) ||
      (v.reg_id || '').toLowerCase().includes(q) ||
      (v.reg_no || '').toLowerCase().includes(q) ||
      String(v.sr || '').toLowerCase().includes(q)
    const matchesType = !typeFilter || (v.type || '') === typeFilter
    return matchesSearch && matchesType
  })

  const thCls = `px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400 bg-white/5' : 'text-slate-500 bg-slate-50'}`
  const tdCls = `px-3 py-3 text-[11px]`

  return (
    <div className="max-w-7xl mx-auto">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-10 w-10 border-2 border-emerald-500/20 border-t-emerald-500 mx-auto mb-4`} />
            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading vehicles…</p>
          </div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className={`border rounded-2xl p-16 text-center transition-colors ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>No Vehicles Registered</h3>
          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Add vehicles via the registration form to populate this directory.</p>
        </div>
      ) : (
        <div className={`border rounded-2xl overflow-hidden transition-colors ${darkMode ? 'bg-white/5 border-white/6' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-white/6' : 'border-slate-100'}`}>
                  <th className={thCls}>SR</th>
                  <th className={thCls}>Vehicle Code</th>
                  <th className={thCls}>Owner's Name</th>
                  <th className={thCls}>CNIC</th>
                  <th className={thCls}>Phone</th>
                  <th className={thCls}>Zakwan ID</th>
                  <th className={thCls}>Reg No</th>
                  <th className={thCls}>Joining Date</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                {filtered.map((v, idx) => (
                  <motion.tr
                    key={v.id || idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.015 }}
                    className={`transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                  >
                    <td className={tdCls}>
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-[10px] ${darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                        {v.sr || idx + 1}
                      </div>
                    </td>

                    <td className={tdCls}>
                      <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-100 text-slate-900'}`}>
                        {v.vehicle_code || '—'}
                      </span>
                    </td>

                    <td className={tdCls}>
                      <div className={`font-medium truncate max-w-[130px] ${darkMode ? 'text-slate-200' : 'text-slate-800'}`} title={v.owned_by || v.owned_by_type}>
                        {v.owned_by || v.owned_by_type || '—'}
                      </div>
                    </td>

                    <td className={`${tdCls} font-mono tracking-tighter ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {v.owner_cnic || <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>—</span>}
                    </td>

                    <td className={`${tdCls} ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {v.owner_contact || <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>—</span>}
                    </td>

                    <td className={`${tdCls} font-mono ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                      {v.reg_id || '—'}
                    </td>

                    <td className={`${tdCls} font-mono ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                      {v.reg_no || '—'}
                    </td>

                    <td className={`${tdCls} whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {v.joining_date
                        ? new Date(v.joining_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>—</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className={`text-center py-12 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                No vehicles match your search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
