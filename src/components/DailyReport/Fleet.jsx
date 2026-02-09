import { useState, useEffect } from 'react'
import DailyReporting from './Fleet/DailyReporting'
import MileageReport from './Fleet/MileageReport'

export default function Fleet() {
  const [activeFleetTab, setActiveFleetTab] = useState('daily-reporting')

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveFleetTab('daily-reporting')}
          className={`px-4 py-2 rounded-md text-sm ${
            activeFleetTab === 'daily-reporting'
              ? 'bg-slate-900 text-white'
              : 'bg-gray-50 text-slate-600'
          }`}
        >
          Daily Reporting
        </button>
        <button
          onClick={() => setActiveFleetTab('mileage-report')}
          className={`px-4 py-2 rounded-md text-sm ${
            activeFleetTab === 'mileage-report'
              ? 'bg-slate-900 text-white'
              : 'bg-gray-50 text-slate-600'
          }`}
        >
          Mileage Report
        </button>
        <button
          onClick={() => {
            // signal MileageReport to open the review modal and switch tab
            try { localStorage.setItem('openMileageReview', '1') } catch (e) {}
            setActiveFleetTab('mileage-report')
          }}
          className="px-3 py-1 rounded-md text-sm bg-amber-100 text-amber-800"
        >
          Review Transfer
        </button>
        {/* Future fleet tabs can be added here */}
      </div>
      
      {activeFleetTab === 'daily-reporting' && <DailyReporting />}
      {activeFleetTab === 'mileage-report' && <MileageReport />}
    </div>
  )
}
