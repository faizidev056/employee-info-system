import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HRTab from './DailyReport/HRTab'
import Fleet from './DailyReport/Fleet'

export default function DailyReport() {
  const [activeSubTab, setActiveSubTab] = useState('hr')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white relative overflow-hidden text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Animated Background Blobs */}
      <div className="fixed top-0 -left-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none z-0"></div>
      <div className="fixed top-40 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
      <div className="fixed -bottom-8 left-20 w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Report</h1>
            <p className="text-slate-500 text-sm mt-1">Manage daily HR logs and fleet operations</p>
          </div>

          <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-white/60 shadow-sm">
            <button
              onClick={() => setActiveSubTab('hr')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${activeSubTab === 'hr'
                  ? 'text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
            >
              {activeSubTab === 'hr' && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                HR Reports
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('fleet')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${activeSubTab === 'fleet'
                  ? 'text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
            >
              {activeSubTab === 'fleet' && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Fleet Operations
              </span>
            </button>
          </div>
        </div>

        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 p-6 shadow-xl shadow-indigo-100/10 min-h-[600px]"
        >
          {activeSubTab === 'hr' ? (
            <HRTab />
          ) : (
            <Fleet />
          )}
        </motion.div>
      </div>
    </div>
  )
}
