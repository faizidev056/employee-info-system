import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import HRTab from './DailyReport/HRTab'
import Fleet from './DailyReport/Fleet'
import SidebarDashboard from './SidebarDashboard'

export default function DailyReport() {
  const [activeSubTab, setActiveSubTab] = useState('hr')
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

            </motion.div>

            {/* Theme Toggle Removed as per request */}
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
