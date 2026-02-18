import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabaseClient'

export default function PrivateHRDirectory() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

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
    if (!query) return true
    const q = query.toLowerCase()
    return (
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.father_name || '').toLowerCase().includes(q) ||
      (r.cnic || '').includes(query) ||
      (r.phone_number || '').includes(query) ||
      (r.designation || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6 px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-blue-200/50 shadow-sm backdrop-blur-md">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Employee Directory</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Personnel management portal — Private Sector Records</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium text-sm shadow-sm"
          >
            <svg className={`w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-blue-500 text-[10px] font-bold">HR</div>
          </div>
          <p className="text-slate-400 font-medium animate-pulse">Syncing directory...</p>
        </div>
      ) : rows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-16 text-center shadow-2xl shadow-blue-900/5"
        >
          <div className="w-24 h-24 bg-gradient-to-tr from-slate-100 to-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-3">Directory Empty</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-10 text-lg">Your private workforce records will appear here. Start by registering employees.</p>
        </motion.div>
      ) : (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-900/5 border-b-4 border-b-blue-500/10">
          {/* Filtering Section inside the card */}
          <div className="p-8 border-b border-white/40 bg-white/40">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full max-w-xl group">
                <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-lg transition-opacity group-focus-within:opacity-100 opacity-0"></div>
                <div className="relative flex items-center">
                  <svg className="absolute left-4 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search name, father's name, CNIC or phone..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-white/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400/50 shadow-sm transition-all text-base"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-4 p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-50/50 border border-blue-100/50 rounded-xl">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  <span className="text-blue-700 text-sm font-bold tracking-tight">
                    {filtered.length} Employee{filtered.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
