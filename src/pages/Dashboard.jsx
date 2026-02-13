import React, { useEffect, useState } from 'react'
import SidebarDashboard from '../components/SidebarDashboard'
import { supabase } from '../supabaseClient'
import { ResponsiveContainer, RadialBarChart, RadialBar, Tooltip, Cell, PieChart, Pie } from 'recharts'

const RoundChart = ({ title, value, subtext, data, type = 'radial' }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-between h-[280px]">
      <h3 className="text-slate-200 font-medium text-lg w-full text-left z-10">{title}</h3>

      <div className="flex-1 w-full flex items-center justify-center relative translate-y-2">
        {type === 'radial' ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              barSize={15}
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                minAngle={15}
                background={{ fill: '#334155' }}
                clockWise
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }}
                itemStyle={{ color: '#f1f5f9' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-8">
          <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
          {subtext && <span className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">{subtext}</span>}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalHR: 0,
    activeHR: 0,
    totalSalary: 0,
    attendanceRate: 0,
    salaryByAttendanceData: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)

      // 1. Fetch Workers
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('id, status, salary')

      if (workersError) throw workersError

      const totalHR = workers.length
      const activeWorkers = workers.filter(w => w.status === 'Active')
      const activeHR = activeWorkers.length
      const totalSalary = activeWorkers.reduce((sum, w) => sum + (w.salary || 0), 0)

      // 2. Fetch Attendance for Current Month (approximated)
      const date = new Date()
      const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_monthly')
        .select('attendance_json')
        .eq('month', currentMonth)

      let totalPresent = 0
      let totalChecks = 0

      if (!attendanceError && attendanceData) {
        attendanceData.forEach(record => {
          const days = Object.values(record.attendance_json || {})
          totalPresent += days.filter(s => s === 'P').length
          totalChecks += days.length
        })
      }

      const attendanceRate = totalChecks > 0 ? (totalPresent / totalChecks) * 100 : 0

      // Prepare Chart Data
      const projectedPayout = totalSalary * (attendanceRate / 100 || 1) // default to 100% if no data
      const projectedLoss = totalSalary - projectedPayout

      setStats({
        totalHR,
        activeHR,
        totalSalary,
        attendanceRate,
        salaryByAttendanceData: [
          { name: 'Active', value: Math.round(projectedPayout), fill: '#3b82f6' }, // Blue
          { name: 'Loss', value: Math.round(projectedLoss), fill: '#1e293b' }  // Dark Slate
        ]
      })

    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // Chart Data formatters
  const totalHRData = [{ name: 'Total HR', value: 100, fill: '#6366f1' }] // Indigo

  const activeHRData = [
    { name: 'Active', value: stats.totalHR > 0 ? (stats.activeHR / stats.totalHR) * 100 : 0, fill: '#10b981' } // Emerald
  ]

  const totalSalaryData = [{ name: 'Budget', value: 100, fill: '#f43f5e' }] // Rose

  // Custom format large numbers
  const formatSalary = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex overflow-hidden font-sans">
      <SidebarDashboard />

      <main className="flex-1 h-screen overflow-y-auto relative p-6 md:p-8 custom-scrollbar">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[0%] left-[20%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[0%] right-[20%] w-[40%] h-[40%] bg-indigo-500/5 blur-[100px] rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Analytics Overview</h1>
              <p className="text-slate-400 mt-1 text-sm">Real-time insights and performance metrics</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-medium text-slate-300">System Operational</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg font-mono text-sm text-slate-300">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            {/* Total HR */}
            <RoundChart
              title="Total HR"
              value={stats.totalHR}
              subtext="+0%"
              data={totalHRData}
              type="radial"
            />

            {/* Active HR */}
            <RoundChart
              title="Active HR"
              value={stats.activeHR}
              subtext={`${stats.totalHR > 0 ? ((stats.activeHR / stats.totalHR) * 100).toFixed(1) : 0}% Active`}
              data={activeHRData}
              type="radial"
            />

            {/* Total Salary */}
            <RoundChart
              title="Total Salary"
              value={formatSalary(stats.totalSalary)}
              subtext="PKR"
              data={totalSalaryData}
              type="radial"
            />

            {/* Salary by Attendance */}
            <RoundChart
              title="Salary by Attendance"
              value={formatSalary(stats.totalSalary * (stats.attendanceRate > 0 ? stats.attendanceRate / 100 : 1))} // Projected
              subtext="Est. Payout"
              data={stats.salaryByAttendanceData.length > 0 ? stats.salaryByAttendanceData : [
                { name: 'Pending', value: 100, fill: '#64748b' }
              ]}
              type="pie"
            />

          </div>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 min-h-[300px] relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-lg font-medium text-slate-200">Salary by Attendance</h3>
                <span className="text-xs text-slate-400">Monthly</span>
              </div>

              {/* Line chart visualization placeholder using CSS/SVG since we focused on round charts above */}
              <div className="h-[200px] w-full flex items-end justify-between px-4 gap-2 relative z-10">
                {/* Simple CSS bar chart visualization for variety */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none">
                    <path d="M0,150 C200,140 400,160 800,130" stroke="#38bdf8" strokeWidth="3" fill="none" />
                    <path d="M0,150 C200,140 400,160 800,130 V200 H0 Z" fill="url(#grad1)" opacity="0.2" />
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Interactive Point */}
                  <div className="absolute top-[65%] left-[50%] bg-slate-800 border border-slate-600 p-2 rounded-lg shadow-xl text-center">
                    <div className="text-xs text-slate-400">Apr</div>
                    <div className="text-sm font-bold text-white">value : 4100</div>
                    <div className="absolute w-3 h-3 bg-slate-800 border-r border-b border-slate-600 -bottom-1.5 left-1/2 -translate-x-1/2 rotate-45"></div>
                  </div>
                  <div className="absolute top-[65%] left-[50%] w-3 h-3 bg-white border-2 border-sky-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(56,189,248,0.5)]"></div>
                  <div className="absolute top-[30%] left-[50%] h-[70%] w-px bg-white/10"></div>
                </div>

                {/* Axis labels */}
                <div className="absolute bottom-2 left-[20%] text-xs text-slate-500">Feb</div>
                <div className="absolute bottom-2 left-[35%] text-xs text-slate-500">Mar</div>
                <div className="absolute bottom-2 left-[50%] text-xs text-slate-300 font-bold">Apr</div>
                <div className="absolute bottom-2 left-[65%] text-xs text-slate-500">May</div>
                <div className="absolute bottom-2 left-[80%] text-xs text-slate-500">Jun</div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-sm text-slate-400 font-medium">Monthly Target</div>
                  <div className="text-4xl font-bold mt-2 text-white group-hover:scale-105 transition-transform duration-300 origin-left">78.5<span className="text-2xl text-blue-400">%</span></div>

                  <div className="mt-4 w-full bg-slate-700/30 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full w-[78.5%] shadow-[0_0_10px_rgba(79,70,229,0.3)]"></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    5% above last month
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                <div className="text-sm text-slate-400 mb-4 font-medium">Quick Actions</div>
                <div className="space-y-3">
                  <button className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    New Employee
                  </button>
                  <button className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Update Attendance
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
