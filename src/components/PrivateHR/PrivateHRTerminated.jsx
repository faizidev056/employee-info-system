import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../supabaseClient'

export default function PrivateHRTerminated() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('private_hr')
        .select('*')
        .eq('status', 'Terminated')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRows(data || [])
    } catch (err) {
      console.error('Failed to load terminated private_hr records', err)
      setError(err.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c2.21 0 4-1.79 4-4S14.21 3 12 3 8 4.79 8 7s1.79 4 4 4zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Terminated — Private HR</h2>
            <p className="text-slate-500 text-sm">List of terminated private HR records</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading records...</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No Terminated Records</h3>
          <p className="text-slate-500">No terminated Private HR records found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">{rows.length} terminated record{rows.length !== 1 ? 's' : ''}</div>
              <div>
                <button onClick={load} className="px-3 py-1.5 bg-slate-900 text-white rounded">Reload</button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">CNIC</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-left">Terminated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, idx) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.01 }} className="group hover:bg-gray-50 bg-white">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{r.full_name || '-'}</td>
                    <td className="px-3 py-2">{r.cnic || '-'}</td>
                    <td className="px-3 py-2">{r.designation || '-'}</td>
                    <td className="px-3 py-2">{r.updated_at ? new Date(r.updated_at).toLocaleString() : (r.created_at ? new Date(r.created_at).toLocaleString() : '-')}</td>
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
