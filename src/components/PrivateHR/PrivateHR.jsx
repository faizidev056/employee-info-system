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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <div className="w-72 bg-white border-r border-gray-200 flex-shrink-0 p-4">
        <h3 className="text-lg font-bold mb-4">Private HR</h3>
        <div className="space-y-2">
          <button onClick={() => setActiveTab('registration')} className={`w-full text-left px-3 py-2 rounded ${activeTab==='registration' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>Registration</button>
          <button onClick={() => setActiveTab('directory')} className={`w-full text-left px-3 py-2 rounded ${activeTab==='directory' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>Employee Directory</button>
          <button onClick={() => setActiveTab('records')} className={`w-full text-left px-3 py-2 rounded ${activeTab==='records' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>PrivateHR Records</button>
          <button onClick={() => setActiveTab('terminated')} className={`w-full text-left px-3 py-2 rounded ${activeTab==='terminated' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>Terminated</button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
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
