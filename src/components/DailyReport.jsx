import { useState } from 'react'
import HRTab from './DailyReport/HRTab'
import Fleet from './DailyReport/Fleet'

export default function DailyReport() {
  const [activeSubTab, setActiveSubTab] = useState('hr')

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Daily Report</h1>
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 rounded-lg bg-gray-50 text-sm text-slate-600">Reports Hub</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex space-x-2 mb-4">
          <button onClick={() => setActiveSubTab('hr')} className={`px-4 py-2 rounded-md ${activeSubTab === 'hr' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-600'}`}>HR</button>
          <button onClick={() => setActiveSubTab('fleet')} className={`px-4 py-2 rounded-md ${activeSubTab === 'fleet' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-600'}`}>Fleet</button>
        </div>

        {activeSubTab === 'hr' ? (
          <HRTab />
        ) : (
          <Fleet />
        )}
      </div>
    </div>
  )
}
