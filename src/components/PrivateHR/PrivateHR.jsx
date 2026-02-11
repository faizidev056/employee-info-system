import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PrivateHRRegistration from './PrivateHRRegistration'
import PrivateHRDirectory from './PrivateHRDirectory'
import PrivateHRRecords from './PrivateHRRecords'
import PrivateHRTerminated from './PrivateHRTerminated'
import { supabase } from '../../supabaseClient'

export default function PrivateHR() {
  const [activeTab, setActiveTab] = useState('registration')

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white overflow-hidden font-sans text-slate-900 relative">
      {/* Animated Background Blobs */}
      <div className="fixed top-0 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none z-0"></div>
      <div className="fixed top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
      <div className="fixed -bottom-8 left-20 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 pointer-events-none z-0"></div>

      <div className="w-72 bg-white/40 backdrop-blur-xl border-r border-white/60 flex-shrink-0 p-4 shadow-lg relative z-20">
        <div className="p-2 mb-4">
          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Private HR</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Personnel Management</p>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('registration')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'registration' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/30' : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'}`}
          >
            Registration
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'directory' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/30' : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'}`}
          >
            Employee Directory
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'records' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/30' : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'}`}
          >
            HR Records
          </button>
          <button
            onClick={() => setActiveTab('terminated')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'terminated' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/30' : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'}`}
          >
            Terminated
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto relative z-10">
        <AnimatePresence>
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
            <div className="max-w-3xl mx-auto">
              {activeTab === 'registration' && <PrivateHRRegistration supabase={supabase} />}
              {activeTab === 'directory' && <PrivateHRDirectory />}
              {activeTab === 'records' && <PrivateHRRecords />}
              {activeTab === 'terminated' && <PrivateHRTerminated />}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
