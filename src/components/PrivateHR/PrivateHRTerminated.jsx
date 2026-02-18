import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabaseClient'

export default function PrivateHRTerminated() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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

  const calculateAge = (dob) => {
    if (!dob) return 'N/A'
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  }

  const handleReactivate = async (id) => {
    try {
      setLoading(true)

      // Try with termination_date first
      const { error: updateError } = await supabase
        .from('private_hr')
        .update({ status: 'Active', termination_date: null })
        .eq('id', id)

      if (updateError) {
        if (updateError.message?.includes('termination_date') || updateError.code === 'PGRST204') {
          const { error: retryError } = await supabase
            .from('private_hr')
            .update({ status: 'Active' })
            .eq('id', id)
          if (retryError) throw retryError
        } else {
          throw updateError
        }
      }

      // Log history
      try {
        await supabase.from('status_history').insert([{
          record_id: id,
          old_status: 'Terminated',
          new_status: 'Active',
          table_source: 'private_hr',
          changed_at: new Date().toISOString()
        }])
      } catch (e) { }

      setSuccess('Personnel reactivated successfully')
      setRows(prev => prev.filter(r => r.id !== id))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Reactivation failed')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(r =>
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.cnic || '').includes(searchQuery) ||
      (r.designation || '').toLowerCase().includes(q)
    )
  }, [rows, searchQuery])

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm">
            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Terminated Personnel</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Closed files — Historical data & Reactivation</p>
          </div>
        </div>

        <div className="bg-red-50/50 border border-red-100 px-6 py-3 rounded-2xl">
          <p className="text-[10px] uppercase font-bold text-red-400 tracking-widest text-center">Inactive Total</p>
          <p className="text-2xl font-black text-red-600 text-center">{rows.length}</p>
        </div>
      </div>

      <AnimatePresence>
        {(error || success) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-xl text-sm font-medium mb-4 ${error ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
            {error || success}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-2xl shadow-red-900/5">
        <div className="p-6 border-b border-white/40 bg-white/40 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full max-w-md">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter by name, CNIC, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-400/50 transition-all shadow-sm"
            />
          </div>
          <button onClick={load} className="text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors flex items-center gap-2">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh List
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                <th className="px-3 py-4 text-left w-12">Sr.</th>
                <th className="px-3 py-4 text-left">Recipient</th>
                <th className="px-3 py-4 text-left">CNIC</th>
                <th className="px-3 py-4 text-left">DOB / Age</th>
                <th className="px-3 py-4 text-left">Phone</th>
                <th className="px-3 py-4 text-left">Religion</th>
                <th className="px-3 py-4 text-left">Role</th>
                <th className="px-3 py-4 text-left">Joined</th>
                <th className="px-3 py-4 text-left">Termination</th>
                <th className="px-3 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              <AnimatePresence mode="popLayout">
                {filteredRows.map((r, idx) => (
                  <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="group hover:bg-red-50/30 transition-colors">
                    <td className="px-3 py-4 text-[10px] font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col max-w-[120px]">
                        <span className="text-slate-900 font-bold text-xs truncate">{r.full_name}</span>
                        <span className="text-slate-400 text-[9px] truncate uppercase">{r.father_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 font-mono text-[10px] text-slate-600">{r.cnic}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col text-[10px]">
                        <span className="text-slate-700 font-semibold">{r.date_of_birth}</span>
                        <span className="text-red-500 font-bold">Age: {calculateAge(r.date_of_birth)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-[10px] text-slate-600">{r.phone_number}</td>
                    <td className="px-3 py-4 text-[10px] text-slate-600">{r.religion}</td>
                    <td className="px-3 py-4">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{r.designation}</span>
                    </td>
                    <td className="px-3 py-4 text-[10px] text-slate-600 font-medium">{r.joining_date || '-'}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col">
                        <span className="text-red-600 font-bold text-[10px]">{r.termination_date || 'N/A'}</span>
                        <span className="text-slate-400 text-[9px] uppercase">{r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'Manual'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <button
                        onClick={() => handleReactivate(r.id)}
                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 active:scale-95 whitespace-nowrap"
                      >
                        Reactivate
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredRows.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">No records matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
