import { useState, useEffect } from 'react'
import DailyReporting from './Fleet/DailyReporting'
import MileageReport from './Fleet/MileageReport'

export default function Fleet({ darkMode }) {
  const [activeFleetTab, setActiveFleetTab] = useState('daily-reporting')

  return (
    <div className="p-4">
      <div className={`flex items-center space-x-2 mb-6 p-1 rounded-2xl border shadow-sm inline-flex transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/40 border-white/50'}`}>
        <button
          onClick={() => setActiveFleetTab('daily-reporting')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeFleetTab === 'daily-reporting'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
            : darkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-white/50'
            }`}
        >
          Daily Reporting
        </button>
        <button
          onClick={() => setActiveFleetTab('mileage-report')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeFleetTab === 'mileage-report'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
            : darkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-white/50'
            }`}
        >
          Mileage Report
        </button>
        <button
          onClick={() => {
            try { localStorage.setItem('openMileageReview', '1') } catch (e) { }
            setActiveFleetTab('mileage-report')
          }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border shadow-sm ${darkMode
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
            }`}
        >
          Review Transfer
        </button>
      </div>

      <div className={`rounded-2xl border shadow-lg p-6 transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/10 shadow-black/20 text-slate-200' : 'bg-white/40 backdrop-blur-xl border-white/60 shadow-emerald-500/5'}`}>
        {activeFleetTab === 'daily-reporting' && <DailyReporting darkMode={darkMode} />}
        {activeFleetTab === 'mileage-report' && <MileageReport darkMode={darkMode} />}
      </div>
    </div>
  )
}
