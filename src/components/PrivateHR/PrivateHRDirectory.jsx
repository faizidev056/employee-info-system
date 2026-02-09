import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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

  const filtered = rows.filter(r => {
    if (!query) return true
    const q = query.toLowerCase()
    return (r.full_name || '').toLowerCase().includes(q) || (r.cnic || '').includes(query)
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
            <h2 className="text-2xl font-bold text-slate-900">Employee Directory</h2>
            <p className="text-slate-500 text-sm">Private HR directory — read only</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading records...</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13l2-2m0 0l7-7 7 7M13 21V9" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No Records</h3>
          <p className="text-slate-500 mb-8">There are no Private HR records yet. Use the registration form to add records.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name or CNIC..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none text-sm shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {(query) && (
                    <button onClick={() => setQuery('')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-600 text-xs font-medium">Clear Filters</button>
                  )}
                  <button onClick={load} className="px-3 py-2 bg-slate-900 text-white rounded">Reload</button>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 border border-cyan-100 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                  <span className="text-cyan-700 text-xs font-semibold">{filtered.length} of {rows.length} record{rows.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">CNIC</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Designation</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r, idx) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className="group hover:bg-gray-50 bg-white">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center text-slate-700 font-semibold text-sm">{idx + 1}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2"><div className="text-slate-900 text-sm font-medium truncate">{r.full_name || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-700 text-sm">{r.cnic || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-700 text-sm">{r.designation || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-600 text-sm">{r.phone_number || '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-slate-600 text-sm">{r.joining_date ? new Date(r.joining_date).toLocaleDateString() : '-'}</div></td>
                    <td className="px-3 py-2"><div className="text-sm">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</div></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* JSON preview removed per UI consistency request */}

    </div>
  )
}
