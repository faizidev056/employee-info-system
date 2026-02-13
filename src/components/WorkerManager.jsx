import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import PersonalInfo from './WorkerFormParts/PersonalInfo'
import Identification from './WorkerFormParts/Identification'
import EmploymentDetails from './WorkerFormParts/EmploymentDetails'
import LocationAssignment from './WorkerFormParts/LocationAssignment'
import VehicleInfo from './WorkerFormParts/VehicleInfo'
import AddressSection from './WorkerFormParts/AddressSection'
import SubmitButton from './WorkerFormParts/SubmitButton'
import MonthPicker from './WorkerFormParts/MonthPicker'
import Attendance from './Attendance'
import SidebarDashboard from './SidebarDashboard'
import StatCard from './StatCard'
import ChartCard from './ChartCard'
import RoundChart from './RoundChart'
import { getAutocompleteToken } from '../lib/utils'

export default function WorkerManager() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Dark mode state: default false (White) as requested
  const [darkMode, setDarkMode] = useState(false)

  const [salaryTrend, setSalaryTrend] = useState([])
  const [dashStats, setDashStats] = useState({
    attendanceRate: 0,
    salaryByAttendanceData: []
  })

  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    fatherName: '',
    dateOfBirth: '',
    religion: '',
    phoneNumber: '',

    // Identification
    cnic: '',
    cnicIssueDate: '',
    cnicExpiryDate: '',

    // Employment Details
    designation: '',
    employeeCode: '',
    salary: '',
    joiningDate: '',

    // Location & Assignment
    ucWard: '',
    attendancePoint: '',

    // Conditional Field
    vehicleCode: '',

    // Other
    address: '',
  })

  const [errors, setErrors] = useState({})

  // Directory filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [designationFilter, setDesignationFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

  // HR Records editing state
  const [editingWorkerId, setEditingWorkerId] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  // Status management state
  const [terminationModal, setTerminationModal] = useState({ open: false, workerId: null, worker: null })
  const [historyModal, setHistoryModal] = useState({ open: false, workerId: null, history: [] })

  // Load workers from Supabase on component mount
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    loadWorkers()
  }, [])

  // Sync active tab with ?tab= query parameter (used by global Navbar)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  // Function to load workers from Supabase
  const loadWorkers = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const workersData = data || []

      // For terminated workers that don't have a termination_date stored, try to recover it
      const missingTerminationIds = workersData
        .filter(w => w.status === 'Terminated' && !w.termination_date)
        .map(w => w.id)

      if (missingTerminationIds.length > 0) {
        const { data: historyData, error: historyError } = await supabase
          .from('status_history')
          .select('worker_id, new_status, changed_at')
          .in('worker_id', missingTerminationIds)
          .eq('new_status', 'Terminated')
          .order('changed_at', { ascending: false })

        if (!historyError && historyData && historyData.length > 0) {
          // Map worker_id -> latest termination changed_at (ISO)
          const latestMap = {}
          for (const entry of historyData) {
            if (!latestMap[entry.worker_id]) {
              latestMap[entry.worker_id] = entry.changed_at
            }
          }

          // Attach termination_date (YYYY-MM-DD) to workers where missing
          for (let i = 0; i < workersData.length; i++) {
            const w = workersData[i]
            if (w.status === 'Terminated' && !w.termination_date && latestMap[w.id]) {
              workersData[i] = { ...w, termination_date: latestMap[w.id].split('T')[0] }
            }
          }
        }
      }

      setWorkers(workersData)
    } catch (err) {
      console.error('Error loading workers:', err)
      setError('Failed to load workers from database')
    } finally {
      setLoading(false)
    }
  }

  // Filter workers based on search query, designation, and month (Employee Directory)
  const filteredWorkers = workers.filter(worker => {
    // Search filter (by name or CNIC)
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      worker.full_name?.toLowerCase().includes(searchLower) ||
      worker.cnic?.includes(searchQuery)

    // Designation filter
    const matchesDesignation =
      !designationFilter ||
      worker.designation === designationFilter

    // Month filter (by joining date) - only show active employees who joined in that month
    const matchesMonth = () => {
      if (!monthFilter) return true
      const joiningDate = new Date(worker.joining_date)
      const [year, month] = monthFilter.split('-')
      return (
        joiningDate.getFullYear() === parseInt(year) &&
        joiningDate.getMonth() + 1 === parseInt(month) &&
        worker.status === 'Active'
      )
    }

    return matchesSearch && matchesDesignation && matchesMonth()
  })

  // HR Records filters (separate from directory)
  const [hrSearchQuery, setHrSearchQuery] = useState('')
  const [hrDesignationFilter, setHrDesignationFilter] = useState('')
  const [hrMonthFilter, setHrMonthFilter] = useState('')

  const hrFilteredWorkers = workers.filter(worker => {
    const searchLower = hrSearchQuery.toLowerCase()
    const matchesSearch =
      !hrSearchQuery ||
      worker.full_name?.toLowerCase().includes(searchLower) ||
      worker.cnic?.includes(hrSearchQuery)

    const matchesDesignation =
      !hrDesignationFilter ||
      worker.designation === hrDesignationFilter

    const matchesMonth = () => {
      if (!hrMonthFilter) return true
      const joiningDate = new Date(worker.joining_date)
      const [year, month] = hrMonthFilter.split('-')
      return (
        joiningDate.getFullYear() === parseInt(year) &&
        joiningDate.getMonth() + 1 === parseInt(month)
      )
    }

    return matchesSearch && matchesDesignation && matchesMonth()
  })

  // Designation to Code and Salary mapping
  const designationSalary = {
    'Sanitary Supervisor': '40,000',
    'Helper': '40,000',
    'Sanitary Worker': '40,000',
    'Driver': '40,000',
  }

  const designationCodeMap = {
    'Sanitary Supervisor': 'SS',
    'Helper': 'H',
    'Sanitary Worker': 'SW',
    'Driver': 'D',
  }

  // Function to generate next employee code for a designation
  const generateEmployeeCode = async (designation) => {
    if (!designation) return ''

    try {
      const codePrefix = designationCodeMap[designation]
      if (!codePrefix) return ''

      // Fetch all codes for this designation to find the next serial number
      const { data, error } = await supabase
        .from('workers')
        .select('employee_code')
        .like('employee_code', `ZKB/${codePrefix}/%`)
        .order('employee_code', { ascending: false })
        .limit(1)

      if (error) throw error

      let nextSerial = 1
      if (data && data.length > 0) {
        const lastCode = data[0].employee_code
        const serialMatch = lastCode.match(/(\d+)$/)
        if (serialMatch) {
          nextSerial = parseInt(serialMatch[1]) + 1
        }
      }

      const serialStr = String(nextSerial).padStart(3, '0')
      return `ZKB/${codePrefix}/${serialStr}`
    } catch (err) {
      console.error('Error generating employee code:', err)
      return ''
    }
  }

  // Dummy UC/Ward data (embedded for now, will be dynamic later)
  const ucWardOptions = [
    { id: 1, name: 'UC-1 Model Town', attendancePoints: ['Model Town Community Center', 'Model Town Park'] },
    { id: 2, name: 'UC-2 Johar Town', attendancePoints: ['Johar Town Park Office'] },
    { id: 3, name: 'UC-3 Gulberg', attendancePoints: ['Gulberg Main Office', 'Gulberg Market', 'Gulberg Park'] },
    { id: 4, name: 'UC-4 DHA Phase 1', attendancePoints: ['DHA Phase 1 Gate'] },
    { id: 5, name: 'UC-5 Cantt', attendancePoints: ['Cantt Station Office', 'Cantt Hospital'] },
    { id: 6, name: 'UC-6 Shadman', attendancePoints: ['Shadman Circle Office'] },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData(prev => {
      const updated = { ...prev, [name]: value }

      // Auto-fill salary and generate employee code when designation is selected
      if (name === 'designation' && value) {
        updated.salary = designationSalary[value] || ''
        // Generate employee code for selected designation
        generateEmployeeCode(value).then(code => {
          setFormData(prev => ({ ...prev, employeeCode: code }))
        })
        // Clear vehicle code if designation changed from Driver
        if (value !== 'Driver') {
          updated.vehicleCode = ''
        }
      }

      // Clear attendance point when UC/Ward changes
      if (name === 'ucWard') {
        updated.attendancePoint = ''
      }

      return updated
    })

    // Clear error for this field when valid input is provided
    if (errors[name]) {
      // Check if the new value would pass validation
      let shouldClearError = false

      if (name === 'dateOfBirth' && value) {
        const birthDate = new Date(value)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        shouldClearError = age >= 18
      } else if (name === 'cnic') {
        // CNIC format validation: XXXXX-XXXXXXX-X
        const cnicRegex = /^\d{5}-\d{7}-\d{1}$/
        shouldClearError = value && cnicRegex.test(value)
      } else if (typeof value === 'string' && value.trim()) {
        shouldClearError = true
      } else if (value) {
        shouldClearError = true
      }

      if (shouldClearError) {
        setErrors(prev => ({ ...prev, [name]: '' }))
      }
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Personal Information
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!formData.fatherName.trim()) newErrors.fatherName = "Father's name is required"
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required'
    } else {
      // Check if worker is at least 18 years old
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      if (age < 18) {
        newErrors.dateOfBirth = 'Worker must be at least 18 years old to be eligible'
      }
    }
    if (!formData.religion) newErrors.religion = 'Religion is required'
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required'

    // Identification
    if (!formData.cnic.trim()) {
      newErrors.cnic = 'CNIC number is required'
    } else {
      // Validate CNIC format: XXXXX-XXXXXXX-X
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/
      if (!cnicRegex.test(formData.cnic)) {
        newErrors.cnic = 'CNIC must follow format XXXXX-XXXXXXX-X'
      }
    }

    // Employment Details
    if (!formData.designation) newErrors.designation = 'Please select a designation'
    if (!formData.employeeCode) newErrors.employeeCode = 'Employee code not generated. Please reselect designation'
    if (!formData.joiningDate) newErrors.joiningDate = 'Joining date is required'

    // Location & Assignment
    if (!formData.ucWard) newErrors.ucWard = 'Please select UC/Ward'
    const selectedUC = ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))
    if (selectedUC && selectedUC.attendancePoints.length > 1 && !formData.attendancePoint) {
      newErrors.attendancePoint = 'Please select an attendance point'
    }

    // Conditional validation for Driver
    if (formData.designation === 'Driver' && !formData.vehicleCode.trim()) {
      newErrors.vehicleCode = 'Vehicle code is required for drivers'
    }

    setErrors(newErrors)
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors }
  }

  // Quick DB connectivity test
  const checkDb = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error } = await supabase.from('workers').select('id').limit(1)
      if (error) throw error
      setSuccess(`DB reachable — found ${data?.length || 0} row(s)`)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      console.error('DB check error:', err)
      setError(err.message || 'DB check failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    console.log('Form submitted with data:', formData)

    const validation = validateForm()
    console.log('Validation result:', validation)

    if (!validation.isValid) {
      console.log('Validation failed. Errors:', validation.errors)
      // Scroll to first error field
      const firstErrorField = Object.keys(validation.errors)[0]
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`)
        console.log('Scrolling to field:', firstErrorField, 'Element found:', !!element)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
      }
      return
    }

    console.log('Validation passed, submitting to database...')

    try {
      setLoading(true)
      setError('')

      // Get attendance point for selected UC/Ward
      const selectedUC = ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))

      // Create worker object for Supabase
      const newWorker = {
        full_name: formData.fullName,
        father_name: formData.fatherName,
        date_of_birth: formData.dateOfBirth,
        religion: formData.religion,
        phone_number: formData.phoneNumber,
        cnic: formData.cnic,
        cnic_issue_date: formData.cnicIssueDate || null,
        cnic_expiry_date: formData.cnicExpiryDate || null,
        designation: formData.designation,
        employee_code: formData.employeeCode,
        salary: parseInt(formData.salary.replace(',', '')),
        joining_date: formData.joiningDate,
        uc_ward_id: parseInt(formData.ucWard),
        uc_ward_name: selectedUC?.name || '',
        attendance_point: formData.attendancePoint || selectedUC?.attendancePoints[0] || '',
        vehicle_code: formData.vehicleCode || null,
        address: formData.address,
        status: 'Active'
      }

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('workers')
        .insert([newWorker])
        .select()

      if (insertError) throw insertError

      setSuccess('Worker registered successfully!')

      // Reset form
      setFormData({
        fullName: '',
        fatherName: '',
        dateOfBirth: '',
        religion: '',
        phoneNumber: '',
        cnic: '',
        cnicIssueDate: '',
        cnicExpiryDate: '',
        designation: '',
        employeeCode: '',
        salary: '',
        joiningDate: '',
        ucWard: '',
        attendancePoint: '',
        vehicleCode: '',
        address: '',
      })
      setErrors({})

      // Reload workers list
      await loadWorkers()

      // Switch to workers list tab after successful registration
      setActiveTab('workers')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error registering worker:', err)
      setError(err.message || 'Failed to register worker')
    } finally {
      setLoading(false)
    }
  }

  // Handle edit worker in HR tab
  const handleEditWorker = (worker) => {
    setEditingWorkerId(worker.id)
    setEditFormData({
      full_name: worker.full_name,
      father_name: worker.father_name,
      date_of_birth: worker.date_of_birth || '',
      religion: worker.religion || '',
      phone_number: worker.phone_number,
      cnic: worker.cnic,
      cnic_issue_date: worker.cnic_issue_date || '',
      cnic_expiry_date: worker.cnic_expiry_date || '',
      designation: worker.designation,
      salary: worker.salary,
      uc_ward_name: worker.uc_ward_name,
      address: worker.address || ''
    })
  }

  // Handle save edited worker
  const handleSaveEdit = async (workerId) => {
    try {
      setLoading(true)
      setError('')

      const { error: updateError } = await supabase
        .from('workers')
        .update(editFormData)
        .eq('id', workerId)

      if (updateError) throw updateError

      setSuccess('Worker details updated successfully!')
      setEditingWorkerId(null)
      setEditFormData({})

      // Reload workers
      await loadWorkers()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error updating worker:', err)
      setError(err.message || 'Failed to update worker')
    } finally {
      setLoading(false)
    }
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingWorkerId(null)
    setEditFormData({})
  }

  // Handle edit form change
  const handleEditChange = (e, field) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  // Handle status update
  const handleStatusUpdate = async (workerId, newStatus) => {
    try {
      setLoading(true)

      // Prepare update payload: set termination_date when terminating, clear when reactivating
      const updatePayload = { status: newStatus }
      if (newStatus === 'Terminated') {
        // Use UTC date in YYYY-MM-DD
        updatePayload.termination_date = new Date().toISOString().split('T')[0]
      } else if (newStatus === 'Active') {
        updatePayload.termination_date = null
      }

      // Update status (and termination date if applicable) in database
      const { error: updateError } = await supabase
        .from('workers')
        .update(updatePayload)
        .eq('id', workerId)

      if (updateError) throw updateError

      // Add to status history
      const { error: historyError } = await supabase
        .from('status_history')
        .insert({
          worker_id: workerId,
          old_status: workers.find(w => w.id === workerId)?.status,
          new_status: newStatus,
          changed_at: new Date().toISOString()
        })

      if (historyError) console.error('History error:', historyError)

      setSuccess(`Employee status updated to ${newStatus}`)
      await loadWorkers()

      // Ensure termination_date present in UI even if DB doesn't persist the column yet
      if (newStatus === 'Terminated') {
        const dateStr = updatePayload.termination_date
        setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, termination_date: dateStr, status: newStatus } : w))
      } else if (newStatus === 'Active') {
        setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, termination_date: null, status: newStatus } : w))
      }

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error updating status:', err)
      setError(err.message || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  // Handle terminate employee
  const handleTerminateClick = (workerId) => {
    const worker = workers.find(w => w.id === workerId)
    setTerminationModal({ open: true, workerId, worker })
  }

  // Confirm termination
  const confirmTermination = async () => {
    if (!terminationModal.workerId) return

    await handleStatusUpdate(terminationModal.workerId, 'Terminated')
    setTerminationModal({ open: false, workerId: null, worker: null })
  }

  // View employee history
  const handleViewHistory = async (workerId) => {
    try {
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('worker_id', workerId)
        .order('changed_at', { ascending: false })

      if (error) throw error

      setHistoryModal({
        open: true,
        workerId,
        history: data || []
      })
    } catch (err) {
      console.error('Error loading history:', err)
      setError('Failed to load status history')
    }
  }

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      // 1. Fetch Workers for salary aggregation
      const { data: workerStats, error: wError } = await supabase
        .from('workers')
        .select('salary, status')

      if (wError) throw wError

      const totalSal = workerStats
        .filter(w => w.status === 'Active')
        .reduce((acc, w) => acc + (w.salary || 0), 0)

      // 2. Fetch Attendance for Current Month
      const date = new Date()
      const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const { data: attendanceData, error: aError } = await supabase
        .from('attendance_monthly')
        .select('attendance_json')
        .eq('month', currentMonth)

      let totalPresent = 0
      let totalChecks = 0

      if (!aError && attendanceData) {
        attendanceData.forEach(record => {
          const days = Object.values(record.attendance_json || {})
          totalPresent += days.filter(s => s === 'P').length
          totalChecks += days.length
        })
      }

      const rate = totalChecks > 0 ? (totalPresent / totalChecks) * 100 : 0
      const projectedPayout = totalSal * (rate / 100 || 1)
      const projectedLoss = totalSal - projectedPayout

      setDashStats({
        attendanceRate: rate,
        salaryByAttendanceData: [
          { name: 'Active', value: Math.round(projectedPayout), fill: '#3b82f6' },
          { name: 'Loss', value: Math.round(projectedLoss), fill: '#1e293b' }
        ]
      })

    } catch (err) {
      console.error('Analytics error:', err)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])


  // Calculate stats for dashboard
  const totalEmployees = workers.length
  const activeEmployees = workers.filter(w => w.status === 'Active').length
  const totalSalary = workers.reduce((acc, w) => acc + (w.status === 'Active' ? (w.salary || 0) : 0), 0)

  const formatSalary = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num
  }


  return (
    <div className={`flex h-screen font-sans selection:bg-sky-500/20 selection:text-sky-300 overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-[#F8FAFC] text-slate-800'
      }`}>
      <SidebarDashboard activeTab={activeTab} onTabChange={handleTabChange} darkMode={darkMode} />


      <main className="flex-1 h-screen overflow-y-auto relative custom-scrollbar">
        {/* Background Gradients - Conditional */}
        {darkMode && (
          <div className="fixed top-0 left-64 right-0 h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none z-0" />
        )}

        <div className="relative z-10 p-6 md:p-8 max-w-[1600px] mx-auto min-h-full">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {activeTab === 'dashboard' && 'Analytics Overview'}
                {activeTab === 'registration' && 'Worker Registration'}
                {activeTab === 'workers' && 'Employee Directory'}
                {activeTab === 'hr' && 'HR Records'}
                {activeTab === 'terminated' && 'Terminated Employees'}
                {activeTab === 'attendance' && 'Attendance Management'}
              </h1>
              <p className={`text-sm mt-1 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {activeTab === 'dashboard' && 'Real-time insights and performance metrics'}
                {activeTab === 'registration' && 'Add new employees to the system'}
                {activeTab === 'workers' && 'Manage and view all worker profiles'}
                {activeTab === 'hr' && 'Comprehensive employee records and actions'}
                {activeTab === 'terminated' && 'History of former employees'}
                {activeTab === 'attendance' && 'Track and manage daily attendance'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-xl border transition-all duration-300 ${darkMode
                  ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                  }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <div className={`hidden md:flex px-4 py-2 border rounded-xl items-center gap-3 transition-colors duration-300 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>System Operational</span>
              </div>
              <div className={`px-4 py-2 border rounded-xl flex items-center gap-2 text-sm font-mono transition-colors duration-300 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
                }`}>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </header>

          {/* Error and Success Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dashboard Tab Content */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <RoundChart
                  title="Total HR"
                  value={Number(totalEmployees).toLocaleString()}
                  subtext="Employees"
                  data={[{ name: 'Total HR', value: 100, fill: '#6366f1' }]}
                  type="radial"
                  darkMode={darkMode}
                />

                <RoundChart
                  title="Active HR"
                  value={Number(activeEmployees).toLocaleString()}
                  subtext={`${totalEmployees > 0 ? ((activeEmployees / totalEmployees) * 100).toFixed(1) : 0}% Active`}
                  data={[{ name: 'Active', value: totalEmployees > 0 ? (activeEmployees / totalEmployees) * 100 : 0, fill: '#10b981' }]}
                  type="radial"
                  darkMode={darkMode}
                />

                <RoundChart
                  title="Total Salary"
                  value={formatSalary(totalSalary)}
                  subtext="PKR Monthly"
                  data={[{ name: 'Budget', value: 100, fill: '#f43f5e' }]}
                  type="radial"
                  darkMode={darkMode}
                />

                <RoundChart
                  title="Salary by Attendance"
                  value={formatSalary(totalSalary * (dashStats.attendanceRate > 0 ? dashStats.attendanceRate / 100 : 1))}
                  subtext="Est. Payout"
                  data={dashStats.salaryByAttendanceData.length > 0 ? dashStats.salaryByAttendanceData : [{ name: 'Pending', value: 100, fill: '#64748b' }]}
                  type="pie"
                  darkMode={darkMode}
                />
              </div>

              <section className="mt-2">
                <div className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-white/5 border-white/6' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
                  }`}>
                  <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-white/6' : 'border-slate-100'
                    }`}>
                    <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Recent Registrations</h3>
                    <button onClick={() => handleTabChange('workers')} className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className={`text-xs uppercase font-medium ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'
                        }`}>
                        <tr>
                          <th className="px-6 py-3">Employee</th>
                          <th className="px-6 py-3">Role</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                        {workers.slice(0, 5).map(worker => (
                          <tr key={worker.id} className={`transition-colors border-b last:border-0 ${darkMode ? 'hover:bg-white/5 border-white/5' : 'hover:bg-slate-50 border-slate-100'
                            }`}>
                            <td className={`px-6 py-3 font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{worker.full_name}</td>
                            <td className={`px-6 py-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{worker.designation}</td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${worker.status === 'Active'
                                ? (darkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                                : (darkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200')
                                }`}>
                                {worker.status}
                              </span>
                            </td>
                            <td className={`px-6 py-3 text-right font-mono text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {new Date(worker.created_at || worker.joining_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* Registration Tab */}
          {activeTab === 'registration' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
            >
              {/* Registration Form */}
              <div className="relative z-10 w-full max-w-4xl">
                {/* Enhanced card with clean white background (kept light for form usability) */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="relative bg-white border border-gray-200 rounded-3xl p-8 md:p-12 shadow-2xl shadow-slate-900/5 overflow-hidden text-slate-900"
                >

                  {/* Header */}
                  <div className="relative z-10 mb-8 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center border border-cyan-100">
                        <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                          Worker Registration
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Fill in the details to register a new worker</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-slate-500">All systems operational</span>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-medium text-slate-900">Registration Form</h2>
                      <button
                        type="button"
                        onClick={checkDb}
                        className="text-xs bg-gray-50 hover:bg-gray-100 text-slate-600 px-3 py-1 rounded-md border border-gray-200 transition-colors"
                      >Test DB</button>
                      {!supabaseConfigured && (
                        <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</p>
                      )}
                    </div>
                    <div>{error && <p className="text-red-500 text-sm bg-red-50 px-2 py-1 rounded border border-red-100">{error}</p>}</div>
                  </div>

                  <form onSubmit={handleSubmit} className="relative z-10 space-y-8" autoComplete={getAutocompleteToken()} spellCheck="false" autoCapitalize="off">
                    {/* Anti-autofill hidden fields to reduce browser suggestions */}
                    <input type="text" name="__no_autofill_username" autoComplete={getAutocompleteToken()} style={{ display: 'none' }} aria-hidden="true" />
                    <input type="password" name="__no_autofill_password" autoComplete={getAutocompleteToken()} style={{ display: 'none' }} aria-hidden="true" />
                    {/* Subcomponents */}
                    <PersonalInfo formData={formData} errors={errors} onChange={handleChange} />
                    <Identification formData={formData} errors={errors} onChange={handleChange} />
                    <EmploymentDetails formData={formData} errors={errors} onChange={handleChange} />
                    <LocationAssignment formData={formData} errors={errors} onChange={handleChange} ucWardOptions={ucWardOptions} />

                    {formData.designation === 'Driver' && (
                      <VehicleInfo formData={formData} errors={errors} onChange={handleChange} />
                    )}

                    <AddressSection formData={formData} onChange={handleChange} />

                    <SubmitButton loading={loading} />
                  </form>

                  {/* Footer Note */}
                  <div className="relative z-10 mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-slate-400 text-sm">
                      All fields marked with <span className="text-red-500 font-semibold">*</span> are required
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Workers Directory Tab */}
          {activeTab === 'workers' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-8 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Employee Directory</h2>
                    <p className="text-slate-500 text-sm">View and manage all registered workers - Read Only</p>
                  </div>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 backdrop-blur-sm border border-blue-100/60 rounded-xl shadow-sm"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-blue-700 text-sm font-medium">View Only</span>
                </motion.div>
              </motion.div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading workers...</p>
                  </div>
                </div>
              ) : workers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm shadow-slate-200/50"
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">No Workers Registered Yet</h3>
                  <p className="text-slate-500 mb-8 text-lg">Start by registering your first employee to populate the directory</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTabChange('registration')}
                    className="px-8 py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/20"
                  >
                    Register First Employee
                  </motion.button>
                </motion.div>
              ) : (
                <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden shadow-xl shadow-indigo-100/10 relative z-10">
                  {/* Search and Filters Bar */}
                  <div className="p-6 border-b border-white/40 bg-white/30 backdrop-blur-md">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search by name or CNIC..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm shadow-blue-500/5"
                          />
                        </div>

                        {/* Designation Filter */}
                        <select
                          value={designationFilter}
                          onChange={(e) => setDesignationFilter(e.target.value)}
                          className="px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer shadow-sm shadow-blue-500/5 appearance-none"
                        >
                          <option value="">All Designations</option>
                          <option value="Sanitary Supervisor">Sanitary Supervisor</option>
                          <option value="Helper">Helper</option>
                          <option value="Sanitary Worker">Sanitary Worker</option>
                          <option value="Driver">Driver</option>
                        </select>

                        {/* Month Filter */}
                        <div className="flex-1 sm:flex-initial">
                          <MonthPicker
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Filter Summary and Count */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 border border-cyan-100 rounded-lg">
                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                          <span className="text-cyan-700 text-xs font-semibold">
                            {filteredWorkers.length} of {workers.length} employee{workers.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {(searchQuery || designationFilter || monthFilter) && (
                          <button
                            onClick={() => {
                              setSearchQuery('')
                              setDesignationFilter('')
                              setMonthFilter('')
                            }}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-600 text-xs font-medium transition-colors"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white/40 border-b border-white/50 text-xs backdrop-blur-sm">
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider w-12">Sr.</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider w-48">Employee</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider w-36">CNIC</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider w-28">Code</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider w-32">Designation</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider w-28">Phone</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell w-24">Religion</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell w-24">DOB</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider w-28">Joined</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell w-28">Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredWorkers.length === 0 ? (
                          <tr>
                            <td colSpan="12" className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center justify-center gap-3">
                                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="text-slate-500 font-medium">No employees found matching your filters</p>
                                <p className="text-slate-400 text-sm">Try adjusting your search criteria</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredWorkers.map((worker, index) => (
                            <motion.tr
                              key={worker.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ backgroundColor: '#F9FAFB' }}
                              className="group transition-colors duration-200 hover:bg-white/40 bg-transparent border-b border-gray-100/50"
                            >
                              <td className="px-3 py-2 text-slate-500 text-xs font-mono">
                                {String(index + 1).padStart(2, '0')}
                              </td>
                              <td className="px-3 py-2">
                                <div className="min-w-0">
                                  <div className="text-slate-900 text-sm font-medium truncate">{worker.full_name}</div>
                                  <div className="text-slate-500 text-xs truncate">{worker.father_name}</div>
                                </div>
                              </td>

                              {/* CNIC */}
                              <td className="px-3 py-2">
                                <p className="text-slate-900 text-sm font-mono truncate">{worker.cnic || 'N/A'}</p>
                              </td>

                              {/* Employee Code */}
                              <td className="px-3 py-2">
                                <p className="text-slate-900 text-sm font-mono font-semibold truncate">{worker.employee_code || 'N/A'}</p>
                              </td>

                              <td className="px-3 py-2">
                                <div className="text-slate-900 text-sm">{worker.designation}</div>
                                {worker.vehicle_code && (
                                  <div className="text-slate-500 text-xs truncate">Vehicle: {worker.vehicle_code}</div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-slate-600 text-sm truncate">{worker.phone_number}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-slate-600 text-sm">{worker.religion || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-slate-600 text-sm">
                                  {worker.date_of_birth ? new Date(worker.date_of_birth).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  Age: {worker.date_of_birth ? Math.floor((new Date() - new Date(worker.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-slate-900 text-sm font-semibold">
                                  {worker.joining_date ? new Date(worker.joining_date).toLocaleDateString() : 'N/A'}
                                </div>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-slate-900 text-sm font-semibold">{worker.salary?.toLocaleString()}</div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Stats */}
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-slate-500 text-xs font-medium mb-1 uppercase tracking-wide">Total Workers</p>
                        <p className="text-2xl font-bold text-slate-900">{workers.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-xs font-medium mb-1 uppercase tracking-wide">Active</p>
                        <p className="text-2xl font-bold text-emerald-600">{filteredWorkers.filter(w => w.status === 'Active').length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-xs font-medium mb-1 uppercase tracking-wide">{monthFilter ? 'Filtered' : 'Total'} Payroll</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(filteredWorkers.reduce((sum, w) => sum + (w.salary || 0), 0) / 1000).toFixed(0)}K
                        </p>
                        {monthFilter && (
                          <p className="text-slate-400 text-xs mt-1">({filteredWorkers.length} employee{filteredWorkers.length !== 1 ? 's' : ''})</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* HR Records Tab */}
          {activeTab === 'hr' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-8 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">HR Records</h2>
                    <p className="text-slate-500 text-sm">Complete employee records and documentation - Customizable</p>
                  </div>
                </div>

                {/* HR Filters (refreshed styling to blend with UI) */}
                <div className="p-4 border-b border-white/40 bg-white/30 backdrop-blur-md rounded-2xl w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* Search input */}
                    <div className="flex-1 min-w-0">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search by name or CNIC..."
                          value={hrSearchQuery}
                          onChange={(e) => setHrSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm shadow-blue-500/5"
                        />
                      </div>
                    </div>

                    {/* Controls: Designation, Month/Year, Count, Clear */}
                    <div className="flex items-center gap-3">
                      <select
                        value={hrDesignationFilter}
                        onChange={(e) => setHrDesignationFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer shadow-sm shadow-blue-500/5 min-w-[170px] appearance-none"
                      >
                        <option value="">All Designations</option>
                        <option value="Sanitary Supervisor">Sanitary Supervisor</option>
                        <option value="Helper">Helper</option>
                        <option value="Sanitary Worker">Sanitary Worker</option>
                        <option value="Driver">Driver</option>
                      </select>

                      <MonthPicker
                        value={hrMonthFilter}
                        onChange={(e) => setHrMonthFilter(e.target.value)}
                      />

                      <div className="px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg text-purple-700 text-xs font-semibold">
                        {hrFilteredWorkers.length} of {workers.length}
                      </div>

                      {(hrSearchQuery || hrDesignationFilter || hrMonthFilter) && (
                        <button
                          onClick={() => { setHrSearchQuery(''); setHrDesignationFilter(''); setHrMonthFilter('') }}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-600 text-xs font-medium transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50/50 backdrop-blur-sm border border-purple-100/60 rounded-xl shadow-sm"
                >
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-purple-700 text-sm font-medium">Editable Records</span>
                </motion.div>

              </motion.div>



              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading records...</p>
                  </div>
                </div>
              ) : workers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm shadow-slate-200/50"
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">No HR Records Available</h3>
                  <p className="text-slate-500 mb-8 text-lg">Register employees to access their complete HR documentation here</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTabChange('registration')}
                    className="px-8 py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all duration-300 shadow-lg shadow-purple-200"
                  >
                    Register Employee
                  </motion.button>
                </motion.div>
              ) : (
                <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden shadow-xl shadow-purple-100/10 relative z-10">
                  {/* Table */}
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/50 bg-white/40 backdrop-blur-sm">
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-40">Employee</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-28">CNIC</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-20">DOB</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-24">Phone</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-24">Designation</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-20">Code</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-32">CNIC Dates</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-20">Joined</th>
                          <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wider w-28">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {hrFilteredWorkers.map((worker, index) => (
                          <motion.tr
                            key={worker.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            whileHover={{ backgroundColor: '#F9FAFB' }}
                            className="transition-colors hover:bg-white/40 bg-transparent group border-b border-gray-100/50"
                          >
                            {/* SR */}
                            <td className="px-3 py-2">
                              <span className="text-slate-400 font-medium">{index + 1}</span>
                            </td>

                            {/* Employee (Name + Father's Name) */}
                            <td className="px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-slate-900 font-medium truncate" title={worker.full_name}>{worker.full_name}</p>
                                <p className="text-slate-400 text-[10px] truncate" title={worker.father_name}>{worker.father_name}</p>
                              </div>
                            </td>

                            {/* CNIC */}
                            <td className="px-3 py-2">
                              <p className="text-slate-600 font-mono truncate">{worker.cnic || '-'}</p>
                            </td>

                            {/* DOB */}
                            <td className="px-3 py-2">
                              <p className="text-slate-600 truncate">{worker.date_of_birth ? new Date(worker.date_of_birth).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}</p>
                            </td>

                            {/* Phone */}
                            <td className="px-3 py-2">
                              <p className="text-slate-600 truncate">{worker.phone_number}</p>
                            </td>

                            {/* Designation */}
                            <td className="px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-slate-700 font-medium truncate" title={worker.designation}>{worker.designation}</p>
                                {worker.vehicle_code && (
                                  <p className="text-slate-400 text-[10px] truncate" title={worker.vehicle_code}>{worker.vehicle_code}</p>
                                )}
                              </div>
                            </td>

                            {/* Employee Code */}
                            <td className="px-3 py-2">
                              <p className="text-slate-900 font-mono font-semibold truncate">{worker.employee_code || '-'}</p>
                            </td>

                            {/* CNIC Issue & Expiry Dates */}
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0.5">
                                <p className="text-slate-500 text-[10px] truncate leading-tight">
                                  <span className="text-slate-400 mr-1">Iss:</span>
                                  {worker.cnic_issue_date ? new Date(worker.cnic_issue_date).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}
                                </p>
                                <p className="text-slate-500 text-[10px] truncate leading-tight">
                                  <span className="text-slate-400 mr-1">Exp:</span>
                                  {worker.cnic_expiry_date ? new Date(worker.cnic_expiry_date).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}
                                </p>
                              </div>
                            </td>

                            {/* Joining Date */}
                            <td className="px-3 py-2">
                              <p className="text-slate-900 font-medium truncate">{worker.joining_date ? new Date(worker.joining_date).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}</p>
                            </td>

                            {/* Status with Actions Dropdown and History */}
                            <td className="px-3 py-2 text-center w-28">
                              <div className="flex items-center justify-center gap-2">
                                {/* Status Button with Dropdown */}
                                <div className="relative group">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 border ${worker.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' :
                                      worker.status === 'Inactive' ? 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100' :
                                        worker.status === 'On Leave' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' :
                                          'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                      }`}
                                  >
                                    {worker.status}
                                  </motion.button>

                                  {/* Dropdown Menu */}
                                  <div className="absolute right-0 mt-1 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[140px] overflow-hidden text-left">
                                    {worker.status === 'Active' && (
                                      <button
                                        onClick={() => handleTerminateClick(worker.id)}
                                        className="block w-full text-left px-4 py-2.5 text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
                                      >
                                        Terminate
                                      </button>
                                    )}
                                    {worker.status === 'Terminated' && (
                                      <button
                                        onClick={() => handleStatusUpdate(worker.id, 'Active')}
                                        className="block w-full text-left px-4 py-2.5 text-emerald-600 hover:bg-emerald-50 transition-colors text-sm font-medium"
                                      >
                                        Reactivate
                                      </button>
                                    )}
                                    {worker.status === 'Inactive' && (
                                      <button
                                        onClick={() => handleStatusUpdate(worker.id, 'Active')}
                                        className="block w-full text-left px-4 py-2.5 text-emerald-600 hover:bg-emerald-50 transition-colors text-sm font-medium"
                                      >
                                        Activate
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleViewHistory(worker.id)}
                                      className="block w-full text-left px-4 py-2.5 text-purple-600 hover:bg-purple-50 transition-colors text-sm font-medium border-t border-gray-100"
                                    >
                                      History
                                    </button>
                                  </div>
                                </div>

                                {/* Three Dots Menu for Edit */}
                                <motion.button
                                  onClick={() => handleEditWorker(worker)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                                  title="Edit employee"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                  </svg>
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Stats */}
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                    <h3 className="text-slate-900 font-semibold mb-4 text-sm">Summary Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-slate-500 text-xs mb-1 uppercase tracking-wide">Total Workers</p>
                        <p className="text-slate-900 text-xl font-bold">{workers.length}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1 uppercase tracking-wide">Active</p>
                        <p className="text-emerald-600 text-xl font-bold">{workers.filter(w => w.status === 'Active').length}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1 uppercase tracking-wide">Total Payroll</p>
                        <p className="text-blue-600 text-xl font-bold">
                          {(workers.reduce((sum, w) => sum + (w.salary || 0), 0) / 1000).toFixed(0)}K
                        </p>
                      </div>

                    </div>
                  </div >
                </div >
              )
              }
            </motion.div >
          )}

          {/* Terminated Employees Tab */}
          {activeTab === 'terminated' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="max-w-7xl mx-auto">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-rose-600 tracking-tight">Terminated Employees</h2>
                  <p className="text-slate-500 text-sm">Read-only listing of terminated employees for auditing and reporting</p>
                </div>
                <div className="px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs font-semibold">
                  {workers.filter(w => w.status === 'Terminated').length} terminated
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden shadow-xl shadow-rose-100/10 relative z-10">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-40">Employee</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-20">CNIC</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-16">Code</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-24">Designation</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-24">Phone</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-16 hidden sm:table-cell">Religion</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-20">DOB</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-20">Joined</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-24">Terminated</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider w-24 hidden md:table-cell">UC / Ward</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {workers.filter(w => w.status === 'Terminated').map((worker, idx) => (
                        <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2">
                            <span className="text-slate-400 font-medium">{idx + 1}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-slate-900 font-medium truncate" title={worker.full_name}>{worker.full_name}</p>
                              <p className="text-slate-400 text-[10px] truncate" title={worker.father_name}>{worker.father_name}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-slate-600 font-mono truncate">{worker.cnic}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-slate-900 font-semibold font-mono truncate">{worker.employee_code}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-slate-700 truncate" title={worker.designation}>{worker.designation}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-slate-600 truncate">{worker.phone_number}</p>
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            <p className="text-slate-600 truncate">{worker.religion || '-'}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-slate-600 truncate">{worker.date_of_birth ? new Date(worker.date_of_birth).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-slate-600 truncate">{worker.joining_date ? new Date(worker.joining_date).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-rose-600 font-medium truncate">{worker.termination_date ? new Date(worker.termination_date).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : 'Unknown'}</p>
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell">
                            <p className="text-slate-600 truncate">{worker.uc_ward_name || '-'}</p>
                          </td>
                        </tr>
                      ))}
                      {workers.filter(w => w.status === 'Terminated').length === 0 && (
                        <tr>
                          <td className="px-6 py-12 text-center text-slate-400 font-medium" colSpan={11}>
                            No terminated employees found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Attendance Tab */}
          {
            activeTab === 'attendance' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="max-w-7xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overall Attendance</h2>
                  <p className="text-slate-500 text-sm mt-1">Monthly attendance sheets — click a cell to toggle (P/A/L) for the current month. Past months are read-only.</p>
                </div>

                <div>
                  <Attendance workers={workers} />
                </div>
              </motion.div>
            )
          }

          {/* Edit Modal */}
          <AnimatePresence>
            {editingWorkerId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCancelEdit}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                >
                  {/* Modal Header */}
                  <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-100 bg-white/95 backdrop-blur z-10">
                    <h2 className="text-xl font-bold text-slate-900">Edit Employee Record</h2>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Full Name */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          value={editFormData.full_name || ''}
                          onChange={(e) => handleEditChange(e, 'full_name')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Father's Name */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Father's Name</label>
                        <input
                          type="text"
                          value={editFormData.father_name || ''}
                          onChange={(e) => handleEditChange(e, 'father_name')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Date of Birth</label>
                        <input
                          type="date"
                          value={editFormData.date_of_birth || ''}
                          onChange={(e) => handleEditChange(e, 'date_of_birth')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* CNIC */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">CNIC</label>
                        <input
                          type="text"
                          value={editFormData.cnic || ''}
                          onChange={(e) => handleEditChange(e, 'cnic')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* CNIC Issue Date */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">CNIC Issue Date</label>
                        <input
                          type="date"
                          value={editFormData.cnic_issue_date || ''}
                          onChange={(e) => handleEditChange(e, 'cnic_issue_date')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* CNIC Expiry Date */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">CNIC Expiry Date</label>
                        <input
                          type="date"
                          value={editFormData.cnic_expiry_date || ''}
                          onChange={(e) => handleEditChange(e, 'cnic_expiry_date')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Phone Number</label>
                        <input
                          type="text"
                          value={editFormData.phone_number || ''}
                          onChange={(e) => handleEditChange(e, 'phone_number')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Designation */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Designation</label>
                        <select
                          value={editFormData.designation || ''}
                          onChange={(e) => handleEditChange(e, 'designation')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="">Select Designation</option>
                          <option value="Sanitary Supervisor">Sanitary Supervisor</option>
                          <option value="Helper">Helper</option>
                          <option value="Sanitary Worker">Sanitary Worker</option>
                          <option value="Driver">Driver</option>
                        </select>
                      </div>

                      {/* UC/Ward */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">UC/Ward</label>
                        <input
                          type="text"
                          value={editFormData.uc_ward_name || ''}
                          onChange={(e) => handleEditChange(e, 'uc_ward_name')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Salary */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Salary (PKR)</label>
                        <input
                          type="number"
                          value={editFormData.salary || ''}
                          onChange={(e) => handleEditChange(e, 'salary')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Religion */}
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Religion</label>
                        <input
                          type="text"
                          value={editFormData.religion || ''}
                          onChange={(e) => handleEditChange(e, 'religion')}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      {/* Address */}
                      <div className="lg:col-span-3">
                        <label className="block text-slate-700 text-xs font-semibold mb-2 uppercase tracking-wider">Address</label>
                        <textarea
                          value={editFormData.address || ''}
                          onChange={(e) => handleEditChange(e, 'address')}
                          rows="3"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-white/95 backdrop-blur">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-white text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm shadow-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const currentWorker = workers.find(w => w.id === editingWorkerId)
                        if (currentWorker) handleSaveEdit(currentWorker.id)
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 font-medium text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-900/20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Termination Confirmation Modal */}
          <AnimatePresence>
            {terminationModal.open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setTerminationModal({ open: false, workerId: null })}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6"
                >
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0a9 9 0 110-18 9 9 0 010 18z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white text-center mb-4">Terminate Employee?</h2>
                  {terminationModal.worker && (
                    <p className="text-gray-300 text-center mb-6 text-sm"><span className="font-semibold">Name:</span> {terminationModal.worker.full_name} | <span className="font-semibold">CNIC:</span> <span className="font-mono">{terminationModal.worker.cnic}</span></p>
                  )}
                  <p className="text-gray-400 text-center mb-6 text-sm">Are you sure you want to terminate this employee? This action will update their status to "Terminated".</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setTerminationModal({ open: false, workerId: null, worker: null })}
                      className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-500/30 rounded-lg transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmTermination}
                      disabled={loading}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all duration-200 font-medium disabled:opacity-50"
                    >
                      Terminate
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status History Modal */}
          <AnimatePresence>
            {historyModal.open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setHistoryModal({ open: false, workerId: null, history: [] })}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
                >
                  <div className="sticky top-0 p-6 border-b border-white/10 bg-slate-900/90 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white">Status History</h2>
                      <button
                        onClick={() => setHistoryModal({ open: false, workerId: null, history: [] })}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {historyModal.history && historyModal.history.length > 0 ? (
                      <div className="space-y-4">
                        {historyModal.history.map((entry, idx) => (
                          <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm text-gray-400">Status Changed</p>
                                <p className="text-white font-medium">
                                  {entry.old_status} → <span className={`${entry.new_status === 'Active' ? 'text-green-400' :
                                    entry.new_status === 'Terminated' ? 'text-red-400' :
                                      'text-yellow-400'
                                    }`}>{entry.new_status}</span>
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(entry.changed_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400">No status changes recorded yet</p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
