import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../supabaseClient'

export default function PrivateHRRecords() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('private_hr')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRows(data || [])
    } catch (err) {
      console.error('Failed to load private_hr records', err)
      setError(err.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  const setStatus = async (id, status) => {
    try {
      setProcessingId(id)
      // Attempt to update `status` column if present
      const { error: updateErr } = await supabase
        .from('private_hr')
        .update({ status })
        .eq('id', id)

      if (updateErr) {
        // If update fails because column doesn't exist, try to upsert into notes as fallback
        console.warn('Update status failed, falling back to notes update', updateErr.message || updateErr)
        const note = `${status} via UI at ${new Date().toISOString()}`
        const { error: noteErr } = await supabase
          .from('private_hr')
          .update({ notes: note })
          .eq('id', id)

        if (noteErr) throw noteErr
      }

      // Optionally insert into status_history if table exists
      try {
        await supabase.from('status_history').insert([{ worker_id: id, new_status: status }])
      } catch (e) {
        // ignore non-fatal
      }

      // Refresh rows
      await load()
    } catch (err) {
      console.error('Failed to set status', err)
      setError(err.message || 'Failed to update status')
    } finally {
      setProcessingId(null)
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
            <h2 className="text-2xl font-bold text-slate-900">Private HR Records</h2>
            <p className="text-slate-500 text-sm">Manage activation and termination of Private HR records</p>
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
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No Records</h3>
          <p className="text-slate-500">No Private HR records to manage.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">{rows.length} record{rows.length !== 1 ? 's' : ''}</div>
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
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, idx) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.01 }} className="group hover:bg-gray-50 bg-white">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{r.full_name || '-'}</td>
                    <td className="px-3 py-2">{r.cnic || '-'}</td>
                    <td className="px-3 py-2">{r.designation || '-'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === 'Terminated' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>{r.status || 'Active'}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button disabled={processingId === r.id} onClick={() => setStatus(r.id, 'Active')} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">Activate</button>
                        <button disabled={processingId === r.id} onClick={() => setStatus(r.id, 'Terminated')} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">Terminate</button>
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
