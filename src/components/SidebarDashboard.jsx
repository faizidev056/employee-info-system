import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function SidebarDashboard({ activeTab, onTabChange, className = '', darkMode = false }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const navigate = useNavigate()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: (active) => <path d="M3 13h8V3H3v10zM13 21h8v-8h-8v8zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" /> },
    { id: 'registration', label: 'New Registration', icon: (active) => <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> },
    { id: 'workers', label: 'Employee Directory', icon: (active) => <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { id: 'hr', label: 'HR Records', icon: (active) => <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { id: 'attendance', label: 'Attendance', icon: (active) => <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
    { id: 'terminated', label: 'Terminated', icon: (active) => <path d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /> },
  ]

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 256 : 80 }}
      transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
      className={`border-r min-h-screen p-4 hidden md:flex flex-col gap-6 transition-colors duration-300 group/sidebar relative z-30 shadow-sm hover:shadow-md will-change-[width] ${className} ${darkMode
        ? 'bg-[#111827] border-slate-800 hover:border-slate-700'
        : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
    >
      {/* Back to Dashboard Button */}
      <button
        onClick={() => navigate('/')}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap"
            >
              Back to Main
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <div
        className="flex items-center gap-3 px-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        </div>
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className={`text-sm font-bold tracking-wide transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>SUTHRA</div>
              <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Punjab HR</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onTabChange && onTabChange(item.id)
                    if (!isExpanded) setIsExpanded(true)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden ${isActive
                    ? 'text-white shadow-lg shadow-sky-500/5'
                    : darkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className={`absolute inset-0 border transition-all ${darkMode
                        ? 'bg-sky-500/10 border-sky-500/30 shadow-[0_0_15px_-3px_rgba(14,165,233,0.15)]'
                        : 'bg-gradient-to-r from-sky-500 to-indigo-600 border-transparent shadow-md'
                        }`}
                      initial={false}
                      transition={{ duration: 0.2 }}
                      style={{ borderRadius: '0.75rem' }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 flex-shrink-0 transition-colors duration-300 ${isActive
                        ? (darkMode ? 'text-sky-400' : 'text-white')
                        : (darkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={isActive ? "2" : "1.5"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {item.icon(isActive)}
                    </svg>
                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-1 mt-auto overflow-hidden">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className={`rounded-2xl p-4 border relative overflow-hidden group transition-all duration-300 cursor-pointer ${darkMode
            ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20'
            : 'bg-slate-50 border-slate-200'
            } ${!isExpanded ? 'p-2 flex justify-center' : ''}`}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all"></div>

          <div className="relative z-10 flex flex-col items-center">
            {isExpanded ? (
              <>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 w-full ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>System Status</div>
                <div className="flex items-center gap-2 w-full">
                  <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                  <span className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Online</span>
                </div>
              </>
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
