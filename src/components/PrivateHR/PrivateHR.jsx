import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PrivateHRRegistration from './PrivateHRRegistration'
import PrivateHRDirectory from './PrivateHRDirectory'
import PrivateHRRecords from './PrivateHRRecords'
import PrivateHRTerminated from './PrivateHRTerminated'
import PrivateHRAttendance from './PrivateHRAttendance'
import SidebarDashboard from '../SidebarDashboard'
import RoundChart from '../RoundChart'
import MonthPicker from '../WorkerFormParts/MonthPicker'
import { supabase } from '../../supabaseClient'

export default function PrivateHR() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(false)
  // Sync with global theme from document element
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))

  // Load Private HR data
  useEffect(() => {
    loadWorkers()
  }, [])

  const loadWorkers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('private_hr')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkers(data || [])
    } catch (err) {
      console.error('Error loading private workers:', err)
      setError('Failed to sync with secure repository')
    } finally {
      setLoading(false)
    }
  }

  // Stats for Dashboard
  const stats = useMemo(() => {
    const total = workers.length
    const active = workers.filter(w => w.status === 'Active' || !w.status).length
    const terminated = workers.filter(w => w.status === 'Terminated').length
    const totalSalary = workers.reduce((acc, w) => acc + (w.salary || 0), 0)

    return { total, active, terminated, totalSalary }
  }, [workers])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: (active) => <path d="M3 13h8V3H3v10zM13 21h8v-8h-8v8zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" /> },
    { id: 'registration', label: 'New Registration', icon: (active) => <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> },
    { id: 'directory', label: 'Staff Directory', icon: (active) => <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { id: 'hr', label: 'HR Records', icon: (active) => <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { id: 'attendance', label: 'Attendance', icon: (active) => <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
    { id: 'terminated', label: 'Terminated', icon: (active) => <path d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /> },
  ]

  const formatSalary = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className={`flex h-full font-sans selection:bg-purple-500/20 selection:text-purple-300 overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#111827] text-slate-200' : 'bg-[#FDFCFE] text-slate-800'}`}>
      <SidebarDashboard
        activeTab={activeTab}
        onTabChange={setActiveTab}
        darkMode={darkMode}
        items={menuItems}
        title="PRIVATE"
        subtitle="Personnel HR"
      />

      <main className="flex-1 h-full overflow-y-auto relative custom-scrollbar scroll-smooth">
        {/* Background Gradients - Conditional */}
        {darkMode && (
          <div className="fixed top-0 left-64 right-0 h-96 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none z-0" />
        )}

        <div className={`relative z-10 transition-all duration-300 ${activeTab === 'registration' ? 'p-4 md:p-6 pb-20' : 'p-6 md:p-8'} max-w-[1600px] mx-auto min-h-full`}>

          {/* Header */}
          {activeTab !== 'registration' && (
            <header className="mb-12">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h1 className={`text-3xl font-semibold tracking-tight transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {activeTab === 'dashboard' && 'Private HR Overview'}
                    {activeTab === 'directory' && 'Staff Directory'}
                    {activeTab === 'hr' && 'HR Lifecycle Records'}
                    {activeTab === 'attendance' && 'Attendance Registry'}
                    {activeTab === 'terminated' && 'Terminated Files'}
                  </h1>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeTab === 'dashboard' && 'Insights from the private personnel repository'}
                    {activeTab === 'directory' && 'Quick access to all employee profiles'}
                    {activeTab === 'hr' && 'Manage status, history and documentation'}
                    {activeTab === 'attendance' && 'Track monthly attendance for private staff'}
                    {activeTab === 'terminated' && 'Historical records of former staff'}
                  </p>
                </motion.div>

                <div className="flex items-center gap-3">
                  {/* Theme Toggle Removed as per request */}
                </div>
              </div>

              {/* Row 2: Search and Filters (Simplified) */}
              {activeTab !== 'dashboard' && (
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="relative max-w-xl flex-1 group">
                      <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500/40 via-indigo-500/40 to-purple-500/40 rounded-xl blur-[2px] opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition duration-500"></div>
                      <div className="relative">
                        <svg className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search secure database..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`w-full pl-12 pr-4 py-3 backdrop-blur-md border rounded-xl placeholder-slate-400 focus:outline-none transition-all text-sm shadow-sm ${darkMode ? 'bg-slate-900/60 border-white/10 text-white focus:border-purple-500/50' : 'bg-white/80 border-purple-100 text-slate-900 focus:border-purple-400/50 shadow-purple-500/5'}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <MonthPicker
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                      />
                      <div className="flex items-center gap-2 px-3 py-1 bg-purple-50/50 backdrop-blur-sm border border-purple-100/60 rounded-lg shadow-sm">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                          SECURE ACCESS ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </header>
          )}

          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <RoundChart
                  title="Total Private HR"
                  value={stats.total.toLocaleString()}
                  subtext="Personnel Records"
                  data={[{ name: 'Total', value: 100, fill: '#8b5cf6' }]}
                  type="radial"
                  darkMode={darkMode}
                />
                <RoundChart
                  title="Active Status"
                  value={stats.active.toLocaleString()}
                  subtext={`${stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% Active`}
                  data={[{ name: 'Active', value: stats.total > 0 ? (stats.active / stats.total) * 100 : 0, fill: '#10b981' }]}
                  type="radial"
                  darkMode={darkMode}
                />
                <RoundChart
                  title="Budget Commitment"
                  value={formatSalary(stats.totalSalary)}
                  subtext="Monthly Payroll"
                  data={[{ name: 'Budget', value: 100, fill: '#f43f5e' }]}
                  type="radial"
                  darkMode={darkMode}
                />
                <RoundChart
                  title="Workforce Composition"
                  value={stats.terminated.toLocaleString()}
                  subtext="Inactive Records"
                  data={[
                    { name: 'Active', value: stats.active, fill: '#10b981' },
                    { name: 'Terminated', value: stats.terminated, fill: '#ef4444' }
                  ]}
                  type="pie"
                  darkMode={darkMode}
                />
              </div>

              {/* Recent Activity Mockup / Mini Table */}
              <section className="mt-8">
                <div className={`border rounded-[2rem] overflow-hidden transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-purple-100 shadow-xl shadow-purple-900/5'}`}>
                  <div className={`px-8 py-6 border-b flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-purple-50'}`}>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Recently Managed Employees</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className={`text-xs uppercase font-bold tracking-widest ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-purple-50/50 text-purple-600'}`}>
                        <tr>
                          <th className="px-8 py-4">Employee</th>
                          <th className="px-8 py-4">Designation</th>
                          <th className="px-8 py-4 text-center">Status</th>
                          <th className="px-8 py-4 text-right">Added On</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-purple-50'}`}>
                        {workers.slice(0, 5).map(worker => (
                          <tr key={worker.id} className={`transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-purple-50/30'}`}>
                            <td className="px-8 py-4 font-bold">{worker.full_name}</td>
                            <td className={`px-8 py-4 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{worker.designation}</td>
                            <td className="px-8 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${(worker.status === 'Active' || !worker.status)
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                }`}>
                                {worker.status || 'Active'}
                              </span>
                            </td>
                            <td className={`px-8 py-4 text-right font-mono text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {new Date(worker.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* Child Tabs */}
          <div className="mt-2">
            {activeTab === 'registration' && <PrivateHRRegistration supabase={supabase} />}
            {activeTab === 'directory' && <PrivateHRDirectory externalSearch={searchQuery} externalMonth={monthFilter} />}
            {activeTab === 'hr' && <PrivateHRRecords externalSearch={searchQuery} externalMonth={monthFilter} />}
            {activeTab === 'attendance' && <PrivateHRAttendance workers={workers} externalMonth={monthFilter} externalSearch={searchQuery} darkMode={darkMode} />}
            {activeTab === 'terminated' && <PrivateHRTerminated externalSearch={searchQuery} externalMonth={monthFilter} />}
          </div>

        </div>
      </main>
    </div>
  )
}
