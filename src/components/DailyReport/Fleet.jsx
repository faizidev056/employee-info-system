import { useState, useEffect } from 'react'
import DailyReporting from './Fleet/DailyReporting'
import MileageReport from './Fleet/MileageReport'

export default function Fleet() {
  const [activeFleetTab, setActiveFleetTab] = useState('daily-reporting')

  return (
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-6 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm inline-flex">
        <button
          onClick={() => setActiveFleetTab('daily-reporting')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeFleetTab === 'daily-reporting'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
              : 'text-slate-600 hover:bg-white/50'
            }`}
        >
          Daily Reporting
        </button>
        <button
          onClick={() => setActiveFleetTab('mileage-report')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeFleetTab === 'mileage-report'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
              : 'text-slate-600 hover:bg-white/50'
            }`}
        >
          Mileage Report
        </button>
        <button
          onClick={() => {
            try { localStorage.setItem('openMileageReview', '1') } catch (e) { }
            setActiveFleetTab('mileage-report')
          }}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors border border-amber-200 shadow-sm"
        >
          Review Transfer
        </button>
      </div>

      <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 shadow-lg shadow-emerald-500/5 p-6">
        {activeFleetTab === 'daily-reporting' && <DailyReporting />}
        {activeFleetTab === 'mileage-report' && <MileageReport />}
      </div>
    </div>
  )
}
