import React, { useState, useRef, useEffect } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { getAutocompleteToken } from '../../lib/utils' 

export default function DatePicker({ name, value, onChange, placeholder, error, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null)
  const [inputValue, setInputValue] = useState(value || '')
  const calendarRef = useRef(null)
  const inputRef = useRef(null)

  // Update selected date and input value when value prop changes
  useEffect(() => {
    if (value) {
      const dateParts = value.split('-')
      if (dateParts.length === 3) {
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
        if (!isNaN(date.getTime())) {
          setSelectedDate(date)
          setInputValue(value)
        }
      } else {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          setSelectedDate(date)
          const formattedDate = date.toISOString().split('T')[0]
          setInputValue(formattedDate)
        }
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
    const inputVal = e.target.value
    setInputValue(inputVal)
    
    let parsedDate = null
    if (inputVal.trim()) {
      // Try to parse as YYYY-MM-DD first
      const dateParts = inputVal.split('-')
      if (dateParts.length === 3 && dateParts[0].length === 4 && dateParts[1].length <= 2 && dateParts[2].length <= 2) {
        const year = parseInt(dateParts[0])
        const month = parseInt(dateParts[1]) - 1
        const day = parseInt(dateParts[2])
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          parsedDate = new Date(year, month, day)
          if (isNaN(parsedDate.getTime())) {
            parsedDate = null
          }
        }
      } else if (inputVal.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        // Try other common formats
        parsedDate = new Date(inputVal)
        if (isNaN(parsedDate.getTime())) {
          parsedDate = null
        }
      }
    }
    setSelectedDate(parsedDate)
    
    // Create synthetic event with the formatted date value
    const syntheticEvent = {
      target: {
        name,
        value: parsedDate ? parsedDate.toISOString().split('T')[0] : inputVal
      }
    }
    onChange(syntheticEvent)
  }

  const handleDateSelect = (day) => {
    const newDate = new Date(currentYear, currentMonth, day)
    setSelectedDate(newDate)
    setInputValue(newDate.toISOString().split('T')[0])
    setIsOpen(false)

    // Create synthetic event for onChange
    const event = {
      target: {
        name,
        value: newDate.toISOString().split('T')[0]
      }
    }
    onChange(event)
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
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

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>)
    }

    // Days of the month
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
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleDateSelect(day)}
          className={`h-9 w-9 rounded-lg text-sm font-semibold transition-all ${
            isSelected
              ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
              : isToday
              ? 'bg-slate-700/50 text-cyan-400 border border-cyan-500/50 font-bold'
              : 'text-slate-300 hover:bg-slate-700/50 hover:text-white hover:border border-slate-700/30'
          }`}
        >
          {day}
        </motion.button>
      )
    }

    return days
  }

  const formatDisplayDate = (date) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onClick={() => setIsOpen(false)}
          autoComplete="new-password"
          readOnly
          onFocus={(e) => { e.target.removeAttribute('readonly'); setIsOpen(false) }}
          className={`w-full px-3 py-2 bg-black border ${error ? 'border-red-600' : 'border-gray-700'} rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors pr-10 ${className}`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={calendarRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 w-80 bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl shadow-slate-900/50 p-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-700/30">
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-slate-700/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>

              <h3 className="text-white font-semibold text-base bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {months[currentMonth]} {currentYear}
              </h3>

              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                onClick={handleNextMonth}
                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-slate-700/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {daysOfWeek.map(day => (
                <div key={day} className="h-8 w-8 flex items-center justify-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {renderCalendar()}
            </div>

            {/* Today button */}
            <div className="mt-5 pt-4 border-t border-slate-700/30">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const today = new Date()
                  handleDateSelect(today.getDate())
                  setCurrentMonth(today.getMonth())
                  setCurrentYear(today.getFullYear())
                }}
                className="w-full py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-400 text-sm font-medium rounded-lg transition-colors border border-cyan-500/30 hover:border-cyan-500/50"
              >
                Today
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}