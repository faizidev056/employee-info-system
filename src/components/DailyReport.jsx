import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import HRTab from './DailyReport/HRTab'
import Fleet from './DailyReport/Fleet'
import SidebarDashboard from './SidebarDashboard'

export default function DailyReport() {
  const [activeSubTab, setActiveSubTab] = useState('hr')
  const [darkMode, setDarkMode] = useState(false) // Local dark mode for this module

  // Menu items for the sidebar
  const menuItems = [
    {
      id: 'hr',
      label: 'HR Reports',
      icon: (active) => <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    },
    {
      id: 'fleet',
      label: 'Fleet Operations',
      icon: (active) => <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    }
  ]

  return (
    <div className={`flex h-full font-sans selection:bg-indigo-500/20 selection:text-indigo-300 overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#111827] text-slate-200' : 'bg-[#FDFCFE] text-slate-800'}`}>
      <SidebarDashboard
        activeTab={activeSubTab}
        onTabChange={setActiveSubTab}
        darkMode={darkMode}
        items={menuItems}
        title="DAILY"
        subtitle="Operations Report"
      />

      <main className="flex-1 h-full overflow-y-auto relative custom-scrollbar scroll-smooth">
        {/* Background Gradients */}
        {darkMode && (
          <div className="fixed top-0 left-64 right-0 h-96 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none z-0" />
        )}

        <div className="relative z-10 p-6 md:p-8 max-w-[1600px] mx-auto min-h-full">

          {/* Header */}
          <header className="mb-8 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className={`text-3xl font-semibold tracking-tight transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {activeSubTab === 'hr' ? 'HR Daily Reports' : 'Fleet Operations'}
              </h1>
              <p className={`text-sm mt-1 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {activeSubTab === 'hr' ? 'Manage daily attendance logs and staff reporting' : 'Track vehicle mileage and daily fleet metrics'}
              </p>
            </motion.div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition-all duration-300 ${darkMode
                ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                }`}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </header>

          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-3xl border shadow-xl transition-all duration-300 min-h-[600px] ${darkMode ? 'bg-white/5 border-white/5 shadow-black/20' : 'bg-white/80 backdrop-blur-xl border-white/60 shadow-indigo-100/10'}`}
          >
            {activeSubTab === 'hr' ? (
              <div className="p-1">
                <HRTab darkMode={darkMode} />
              </div>
            ) : (
              <div className="p-1">
                <Fleet darkMode={darkMode} />
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
