import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DatePicker({ name, value, onChange, placeholder, error, className = '', darkMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null)
  const [inputValue, setInputValue] = useState('')
  const calendarRef = useRef(null)
  const inputRef = useRef(null)

  // Update selected date and input value when value prop changes
  useEffect(() => {
    if (value) {
      // Accept either ISO (YYYY-MM-DD) or display format (DD/MM/YYYY)
      const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(value)
      const dmyMatch = /^\d{2}\/\d{2}\/\d{4}$/.test(value)

      let date = null
      if (isoMatch) {
        const parts = value.split('-')
        date = new Date(parts[0], parts[1] - 1, parts[2])
      } else if (dmyMatch) {
        const parts = value.split('/')
        date = new Date(parts[2], parts[1] - 1, parts[0])
      } else {
        const parsed = new Date(value)
        if (!isNaN(parsed.getTime())) date = parsed
      }

      if (date && !isNaN(date.getTime())) {
        setSelectedDate(date)
        const dd = String(date.getDate()).padStart(2, '0')
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const yyyy = date.getFullYear()
        setInputValue(`${dd}/${mm}/${yyyy}`)

        // Ensure calendar shows the correct month/year for the selected date
        setCurrentMonth(date.getMonth())
        setCurrentYear(date.getFullYear())
      } else {
        setSelectedDate(null)
        setInputValue(value)
      }
    } else {
      setSelectedDate(null)
      setInputValue('')
    }
  }, [value])

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target) &&
        inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const handleInputChange = (e) => {
    let val = e.target.value

    // Auto-format DD/MM/YYYY
    const digitsOnly = val.replace(/\D/g, '').slice(0, 8)
    let formatted = digitsOnly
    if (digitsOnly.length > 2 && digitsOnly.length <= 4) {
      formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`
    } else if (digitsOnly.length > 4) {
      formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`
    }

    setInputValue(formatted)

    let parsedDate = null
    if (formatted.length === 10) {
      const [d, m, y] = formatted.split('/')
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(y) && (date.getMonth() + 1) === parseInt(m) && date.getDate() === parseInt(d)) {
        parsedDate = date
      }
    }

    // Emit YYYY-MM-DD for consistency with WorkerManager's state
    const isoValue = parsedDate
      ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`
      : formatted

    onChange({
      target: {
        name,
        value: isoValue
      }
    })
  }

  const handleDateSelect = (day) => {
    const newDate = new Date(currentYear, currentMonth, day)
    setSelectedDate(newDate)
    const dd = String(newDate.getDate()).padStart(2, '0')
    const mm = String(newDate.getMonth() + 1).padStart(2, '0')
    const yyyy = newDate.getFullYear()

    const displayValue = `${dd}/${mm}/${yyyy}`
    const isoValue = `${yyyy}-${mm}-${dd}`

    setInputValue(displayValue)
    setIsOpen(false)

    onChange({
      target: {
        name,
        value: isoValue
      }
    })
  }

  const handlePrevMonth = (e) => {
    e.stopPropagation()
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = (e) => {
    e.stopPropagation()
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear

      const isToday = new Date().getDate() === day &&
        new Date().getMonth() === currentMonth &&
        new Date().getFullYear() === currentYear

      days.push(
        <motion.button
          key={day}
          type="button"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleDateSelect(day)}
          className={`h-9 w-9 rounded-xl text-xs font-bold transition-all ${isSelected
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            : isToday
              ? (darkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-100')
              : (darkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')
            }`}
        >
          {day}
        </motion.button>
      )
    }

    return days
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={inputValue}
          placeholder={placeholder || 'DD/MM/YYYY'}
          onChange={handleInputChange}
          autoComplete="new-password"
          readOnly
          onFocus={(e) => e.target.removeAttribute('readonly')}
          className={`w-full px-4 py-3 border rounded-xl text-sm transition-all duration-300 focus:outline-none focus:ring-4 pr-10 ${darkMode
            ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-blue-500/10'
            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500/50 focus:ring-blue-500/10 shadow-sm shadow-blue-500/5'
            } ${error ? 'border-rose-500/50 ring-4 ring-rose-500/10' : ''}`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div
              ref={calendarRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
              className={`absolute left-0 lg:left-auto lg:right-0 mt-3 z-50 w-[320px] rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${darkMode
                ? 'bg-slate-900/95 border-white/10 text-white shadow-black/40'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50'
                }`}
            >
              <div className="flex items-center justify-between mb-6">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className={`p-2 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-sm font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500">
                  {months[currentMonth]} {currentYear}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className={`p-2 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map(day => (
                  <div key={day} className={`h-9 w-9 flex items-center justify-center text-[10px] font-black uppercase tracking-tighter ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>

              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  handleDateSelect(today.getDate())
                  setCurrentMonth(today.getMonth())
                  setCurrentYear(today.getFullYear())
                }}
                className={`w-full mt-6 py-2.5 rounded-xl border text-xs font-bold transition-all ${darkMode
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
              >
                Today
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}