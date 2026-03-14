import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PrivateHRRegistration from './PrivateHRRegistration'
import PrivateHRDirectory from './PrivateHRDirectory'
import PrivateHRRecords from './PrivateHRRecords'
import PrivateHRTerminated from './PrivateHRTerminated'
// PrivateHRAttendance import removed as per request to hide attendance
import SidebarDashboard from '../SidebarDashboard'
import MonthPicker from '../WorkerFormParts/MonthPicker'
import { supabase } from '../../supabaseClient'
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, PieChart, Pie } from 'recharts'

// ── CUSTOM DASHBOARD COMPONENTS ───────

const ModernStatCard = ({ label, value, trend, trendType, darkMode }) => (
  <div className={`p-6 flex flex-col justify-between transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'} border-r last:border-r-0`}>
    <span className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
    <div className="flex items-center gap-3">
      <span className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</span>
      {trend && (
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${trendType === 'up'
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-rose-500/10 text-rose-500'
          }`}>
          {trendType === 'up' ? '+' : '-'}{trend}%
        </div>
      )}
    </div>
  </div>
)

const CategoryMixItem = ({ label, count, total, color, darkMode }) => {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
  return (
    <div className="flex items-center justify-between group py-1.5 border-b last:border-0 border-slate-100/5 transition-all hover:translate-x-1">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full shadow-sm shadow-black/20" style={{ backgroundColor: color }} />
        <span className={`text-[11px] font-bold truncate max-w-[140px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-black tabular-nums ${darkMode ? 'text-white' : 'text-slate-900'}`}>{count}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
          {percentage}%
        </span>
      </div>
    </div>
  )
}

const CategoryTooltip = ({ active, payload, darkMode }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
          <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{data.name}</p>
        </div>
        <div className="flex items-end gap-2">
          <span className={`text-2xl font-black leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.value}</span>
          <span className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>Staff</span>
        </div>
      </div>
    )
  }
  return null
}

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

  const staffByDesignation = useMemo(() => {
    const activeStaff = workers.filter(w => w.status === 'Active' || !w.status)
    const counts = activeStaff.reduce((acc, w) => {
      const desig = w.designation || 'Support Staff'
      acc[desig] = (acc[desig] || 0) + 1
      return acc
    }, {})

    const colors = [
      '#8b5cf6', '#6366f1', '#ec4899', '#f43f5e', '#f59e0b',
      '#10b981', '#06b6d4', '#3b82f6', '#4f46e5'
    ]

    return Object.entries(counts)
      .map(([name, value], index) => ({
        name,
        value,
        fill: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
  }, [workers])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: (active) => <path d="M3 13h8V3H3v10zM13 21h8v-8h-8v8zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" /> },
    { id: 'registration', label: 'New Registration', icon: (active) => <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> },
    { id: 'directory', label: 'Staff Directory', icon: (active) => <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { id: 'hr', label: 'HR Records', icon: (active) => <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
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
                    {activeTab === 'terminated' && 'Terminated Files'}
                  </h1>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeTab === 'dashboard' && ''}
                    {activeTab === 'directory' && ''}
                    {activeTab === 'hr' && ''}
                    {activeTab === 'terminated' && ''}
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
              {/* ─── HIGHER LEVEL METRICS ─── */}
              <div className={`rounded-[2rem] border overflow-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/5'}`}>
                <ModernStatCard label="Total Workforce" value={stats.total} trend="2" trendType="up" darkMode={darkMode} />
                <ModernStatCard label="Active Personnel" value={stats.active} trend="1" trendType="up" darkMode={darkMode} />
                <ModernStatCard label="Monthly Payroll" value={formatSalary(stats.totalSalary)} trend="4.2" trendType="up" darkMode={darkMode} />
                <ModernStatCard label="Attrition Rate" value={`${stats.total > 0 ? ((stats.terminated / stats.total) * 100).toFixed(1) : 0}%`} trend="0.5" trendType="down" darkMode={darkMode} />
              </div>

              {/* ─── CORE INTELLIGENCE ─── */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className={`xl:col-span-12 p-8 rounded-[2rem] border transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl shadow-black/40' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/10'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Staff Intelligence</h3>
                      <p className={`text-[10px] font-bold mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Real-time composition by designation</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${darkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                        {stats.active} Active Members
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
                    {/* Pie Chart Section */}
                    <div className="md:col-span-5 relative h-[300px]">
                      <div className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={staffByDesignation}
                              innerRadius={85}
                              outerRadius={115}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {staffByDesignation.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                              ))}
                            </Pie>
                            <Tooltip content={<CategoryTooltip darkMode={darkMode} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                        <span className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.active}</span>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Personnel</span>
                      </div>
                    </div>

                    {/* Analysis List Section */}
                    <div className="md:col-span-7 flex flex-col h-full justify-center">
                      <div className={`rounded-2xl p-6 ${darkMode ? 'bg-white/5 border border-white/5' : 'bg-slate-50/50 border border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Role Composition</h4>
                        </div>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-3">
                          {staffByDesignation.map((item, i) => (
                            <CategoryMixItem
                              key={item.name}
                              label={item.name}
                              count={item.value}
                              total={stats.active}
                              color={item.fill}
                              darkMode={darkMode}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                            </svg>
                          </div>
                          <div>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Primary Strength</p>
                            <h5 className={`text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{staffByDesignation[0]?.name || 'N/A'}</h5>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('directory')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${darkMode ? 'hover:bg-white/5 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                        >
                          View All Staff
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT ACTIVITIES */}
              <section>
                <div className={`border rounded-[2rem] overflow-hidden transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/5'}`}>
                  <div className={`px-8 py-6 border-b border-transparent flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-purple-50'}`}>
                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recently Managed Employees</h3>
                    <button onClick={() => setActiveTab('directory')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'}`}>Full Directory</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className={`${darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                          <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Employee</th>
                          <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Designation</th>
                          <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Status</th>
                          <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Registered</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                        {workers.slice(0, 5).map(worker => (
                          <tr key={worker.id} className={`group transition-all ${darkMode ? 'hover:bg-white/5' : 'hover:bg-purple-50/30'}`}>
                            <td className={`px-8 py-4 font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>{worker.full_name}</td>
                            <td className={`px-8 py-4 text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{worker.designation}</td>
                            <td className="px-8 py-4">
                              <div className={`inline-flex items-center justify-center gap-2 w-24 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${(worker.status === 'Active' || !worker.status) ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                <span className={`w-1 h-1 rounded-full ${(worker.status === 'Active' || !worker.status) ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {worker.status || 'Active'}
                              </div>
                            </td>
                            <td className={`px-8 py-4 text-right text-[11px] font-bold tabular-nums ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(worker.created_at).toLocaleDateString()}</td>
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
            {activeTab === 'terminated' && <PrivateHRTerminated externalSearch={searchQuery} externalMonth={monthFilter} />}
          </div>

        </div>
      </main>
    </div>
  )
}
