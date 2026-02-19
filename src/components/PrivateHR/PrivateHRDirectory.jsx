import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabaseClient'

export default function PrivateHRDirectory({ externalSearch, externalMonth }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('private_hr').select('*').order('created_at', { ascending: false })
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
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const filtered = rows.filter(r => {
    const q = (externalSearch || '').toLowerCase().trim()
    if (!q) return true
    return (
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.father_name || '').toLowerCase().includes(q) ||
      (r.cnic || '').includes(q) ||
      (r.phone_number || '').includes(q) ||
      (r.designation || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {loading && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-purple-500 text-[10px] font-bold">HR</div>
          </div>
          <p className="text-slate-400 font-medium animate-pulse">Syncing directory...</p>
        </div>
      ) : rows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-16 text-center shadow-2xl shadow-purple-900/5"
        >
          <div className="w-24 h-24 bg-gradient-to-tr from-slate-100 to-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354l.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-3">Directory Empty</h3>
          <p className="text-slate-500 max-w-md mx-auto text-lg">Your private workforce records will appear here.</p>
        </motion.div>
      ) : (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-900/5 border-b-4 border-b-purple-500/10">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                  <th className="px-3 py-4 text-left w-12">Sr.</th>
                  <th className="px-3 py-4 text-left">Name / Father</th>
                  <th className="px-3 py-4 text-left">CNIC</th>
                  <th className="px-4 py-4 text-left">DOB / Age</th>
                  <th className="px-3 py-4 text-left">Phone</th>
                  <th className="px-3 py-4 text-left">Religion</th>
                  <th className="px-3 py-4 text-left">Designation</th>
                  <th className="px-3 py-4 text-left whitespace-nowrap">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 font-sans">
                <AnimatePresence mode="popLayout">
                  {filtered.map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-300"
                    >
                      <td className="px-3 py-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 font-bold text-[10px] border border-slate-100 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-400 transition-all duration-300">
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col min-w-[120px]">
                          <span className="text-slate-900 font-bold text-xs tracking-tight truncate max-w-[140px]">{r.full_name || 'Anonymous'}</span>
                          <span className="text-slate-400 text-[9px] font-medium uppercase tracking-wide truncate max-w-[140px]">{r.father_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-600 tracking-tight whitespace-nowrap">
                        {r.cnic || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col whitespace-nowrap">
                          <span className="text-slate-700 text-[11px] font-semibold">{r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString() : '—'}</span>
                          <span className="text-blue-500 text-[9px] font-bold">Age: {calculateAge(r.date_of_birth)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-[11px] font-medium whitespace-nowrap">
                        {r.phone_number || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest inline-block ${r.religion === 'Islam' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                          'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                          }`}>
                          {r.religion || 'Common'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-slate-900 font-bold text-[10px] bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-200/50 block truncate max-w-[100px] text-center group-hover:border-blue-200 transition-colors">
                          {r.designation || 'None'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-slate-700 text-[11px] font-bold">
                            {r.joining_date ? new Date(r.joining_date).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
