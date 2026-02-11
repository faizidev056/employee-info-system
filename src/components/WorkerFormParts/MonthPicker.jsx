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
        className="flex-1 px-3 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200 cursor-pointer hover:bg-white/80 shadow-sm shadow-blue-500/5 appearance-none"
      >
        {months.map((m, idx) => (
          <option key={m} value={idx} className="bg-white text-slate-900">
            {m}
          </option>
        ))}
      </select>

      {/* Year Dropdown */}
      <select
        value={currentYear}
        onChange={(e) => handleYearChange(parseInt(e.target.value))}
        className="px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200 cursor-pointer hover:bg-white/80 w-24 shadow-sm shadow-blue-500/5 appearance-none"
      >
        {yearRange.map((y) => (
          <option key={y} value={y} className="bg-white text-slate-900">
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
