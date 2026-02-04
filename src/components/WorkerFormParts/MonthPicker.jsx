import React from 'react'

export default function MonthPicker({ value, onChange }) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  
  // Parse the value (YYYY-MM format)
  const [year, month] = value ? value.split('-') : [new Date().getFullYear(), (new Date().getMonth() + 1).toString().padStart(2, '0')]
  const currentYear = parseInt(year) || new Date().getFullYear()
  const currentMonth = parseInt(month) - 1 || new Date().getMonth()
  
  // Get year range (current year ±5)
  const yearRange = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  
  const handleMonthChange = (newMonth) => {
    const monthStr = String(newMonth + 1).padStart(2, '0')
    onChange({ target: { value: `${currentYear}-${monthStr}` } })
  }
  
  const handleYearChange = (newYear) => {
    const monthStr = String(currentMonth + 1).padStart(2, '0')
    onChange({ target: { value: `${newYear}-${monthStr}` } })
  }
  
  return (
    <div className="flex gap-2">
      {/* Month Dropdown */}
      <select
        value={currentMonth}
        onChange={(e) => handleMonthChange(parseInt(e.target.value))}
        className="flex-1 px-3 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm transition-all duration-200 cursor-pointer hover:bg-slate-800/70 hover:border-slate-500/70"
      >
        {months.map((m, idx) => (
          <option key={m} value={idx} className="bg-slate-800 text-white">
            {m}
          </option>
        ))}
      </select>
      
      {/* Year Dropdown */}
      <select
        value={currentYear}
        onChange={(e) => handleYearChange(parseInt(e.target.value))}
        className="px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm transition-all duration-200 cursor-pointer hover:bg-slate-800/70 hover:border-slate-500/70 w-24"
      >
        {yearRange.map((y) => (
          <option key={y} value={y} className="bg-slate-800 text-white">
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
