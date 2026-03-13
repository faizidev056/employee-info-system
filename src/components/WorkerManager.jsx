import { useState, useEffect, useMemo } from 'react'
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
import { getAutocompleteToken } from '../lib/utils'
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, PieChart, Pie } from 'recharts'

// ── CUSTOM DASHBOARD COMPONENTS ───────

const ModernStatCard = ({ label, value, trend, trendType, darkMode }) => (
    <div className={`p-6 flex flex-col justify-between transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'} border-r last:border-r-0`}>
        <span className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
        <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</span>
            {trend && (
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${trendType === 'up'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-rose-500/10 text-rose-500'
                    }`}>
                    {trendType === 'up' ? '+' : '-'}{trend}%
                </div>
            )}
        </div>
    </div>
)

const CategoryMixItem = ({ label, count, total, color, darkMode }) => {
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
    return (
        <div className="flex items-center justify-between group py-1.5 border-b last:border-0 border-slate-100/5 transition-all hover:translate-x-1">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shadow-sm shadow-black/20" style={{ backgroundColor: color }} />
                <span className={`text-[11px] font-bold truncate max-w-[140px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black tabular-nums ${darkMode ? 'text-white' : 'text-slate-900'}`}>{count}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                    {percentage}%
                </span>
            </div>
        </div>
    )
}

const CategoryTooltip = ({ active, payload, darkMode }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        return (
            <div className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
                    <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{data.name}</p>
                </div>
                <div className="flex items-end gap-2">
                    <span className={`text-2xl font-black leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.value}</span>
                    <span className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Staff</span>
                </div>
            </div>
        )
    }
    return null
}

export default function WorkerManager() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeDropdown, setActiveDropdown] = useState(null)
  // Sync with global theme from document element
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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

  // Terminated filter state
  const [terminatedSearchQuery, setTerminatedSearchQuery] = useState('')
  const [terminatedDesignationFilter, setTerminatedDesignationFilter] = useState('')
  const [terminatedMonthFilter, setTerminatedMonthFilter] = useState('')

  // Attendance filter state
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('')
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })




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
      // Also reset filters when tab changes via URL
      setSearchQuery('')
      setDesignationFilter('')
      setMonthFilter('')
      setTerminatedSearchQuery('')
      setTerminatedDesignationFilter('')
      setTerminatedMonthFilter('')
      setAttendanceSearchQuery('')
      setHrSearchQuery('')
      setHrDesignationFilter('')
      setHrMonthFilter('')
    }
  }, [searchParams])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
    // Reset all search and filter states when switching tabs
    setSearchQuery('')
    setDesignationFilter('')
    setMonthFilter('')
    setTerminatedSearchQuery('')
    setTerminatedDesignationFilter('')
    setTerminatedMonthFilter('')
    setAttendanceSearchQuery('')
    setHrSearchQuery('')
    setHrDesignationFilter('')
    setHrMonthFilter('')
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

  // Terminated employees filter logic
  const terminatedFilteredWorkers = useMemo(() => {
    const q = (terminatedSearchQuery || '').toLowerCase().trim()

    return workers.filter(w => {
      if (w.status !== 'Terminated') return false

      const matchesSearch = !q ||
        (w.full_name || '').toLowerCase().includes(q) ||
        (w.cnic || '').includes(q) ||
        (w.employee_code || '').toLowerCase().includes(q)

      const matchesDesignation = !terminatedDesignationFilter || w.designation === terminatedDesignationFilter

      const matchesMonth = () => {
        if (!terminatedMonthFilter) return true
        if (!w.termination_date) return false
        const termDate = new Date(w.termination_date)
        const [year, month] = terminatedMonthFilter.split('-')
        return (
          termDate.getFullYear() === parseInt(year) &&
          termDate.getMonth() + 1 === parseInt(month)
        )
      }

      return matchesSearch && matchesDesignation && matchesMonth()
    })
  }, [workers, terminatedSearchQuery, terminatedDesignationFilter, terminatedMonthFilter])


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


  const handleSubmit = async (e) => {
    e.preventDefault()

    console.log('Form submitted with data:', formData)

    const validation = validateForm()
    console.log('Validation result:', validation)

    if (!validation.isValid) {
      console.log('Validation failed. Errors:', validation.errors)

      // Define preferred order of fields for scrolling
      const fieldOrder = [
        'fullName', 'fatherName', 'dateOfBirth', 'religion', 'phoneNumber',
        'cnic', 'cnicIssueDate', 'cnicExpiryDate',
        'designation', 'joiningDate',
        'ucWard', 'attendancePoint',
        'vehicleCode', 'address'
      ]

      // Use requestAnimationFrame to ensure error messages are rendered and layout is updated
      requestAnimationFrame(() => {
        // Find the first field in our preferred order that has an error
        const firstErrorField = fieldOrder.find(field => validation.errors[field]) || Object.keys(validation.errors)[0]

        if (firstErrorField) {
          // Try to find by name or id
          const element = document.querySelector(`[name="${firstErrorField}"]`) || document.getElementById(firstErrorField)

          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })

            // Add a vibrant highlight effect
            element.classList.add('ring-rose-500/40', 'ring-offset-2', 'ring-4')
            setTimeout(() => {
              element.classList.remove('ring-rose-500/40', 'ring-offset-2', 'ring-4')
            }, 3000)

            // Focus after the scroll starts
            setTimeout(() => element.focus(), 600)
          }
        }
      })
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
  const totalEmployees = useMemo(() => workers.length, [workers])
  const activeEmployees = useMemo(() => workers.filter(w => w.status === 'Active').length, [workers])
  const totalSalary = useMemo(() => workers.reduce((acc, w) => acc + (w.status === 'Active' ? (w.salary || 0) : 0), 0), [workers])

  const staffByDesignation = useMemo(() => {
    const activeStaff = workers.filter(w => w.status === 'Active')
    const counts = activeStaff.reduce((acc, w) => {
      const desig = w.designation || 'General Staff'
      acc[desig] = (acc[desig] || 0) + 1
      return acc
    }, {})
    
    const colors = [
      '#06b6d4', '#0891b2', '#0e7490', '#22d3ee', '#67e8f9', 
      '#3b82f6', '#4f46e5', '#8b5cf6', '#6366f1'
    ]

    return Object.entries(counts)
      .map(([name, value], index) => ({ 
        name, 
        value, 
        fill: colors[index % colors.length] 
      }))
      .sort((a, b) => b.value - a.value)
  }, [workers])

  const formatSalary = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num
  }


  return (
    <div className={`flex h-full font-sans selection:bg-sky-500/20 selection:text-sky-300 overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#111827] text-slate-200' : 'bg-[#F8FAFC] text-slate-800'
      }`}>
      <SidebarDashboard activeTab={activeTab} onTabChange={handleTabChange} darkMode={darkMode} />


      <main className="flex-1 h-full overflow-y-auto relative custom-scrollbar scroll-smooth">
        {/* Background Gradients - Conditional */}
        {darkMode && (
          <div className="fixed top-0 left-64 right-0 h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none z-0" />
        )}

        <div className={`relative z-10 transition-all duration-300 ${activeTab === 'registration' ? 'p-4 md:p-6 pb-20' : 'p-6 md:p-8'} max-w-[1600px] mx-auto min-h-full`}>
          {/* Header */}
          {activeTab !== 'registration' && (
            <header className="mb-12">
              {/* Row 1: Title and Theme Toggle */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex-1"
                >
                  <h1 className={`text-3xl font-semibold tracking-tight transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {activeTab === 'dashboard' && 'Analytics Overview'}
                    {activeTab === 'workers' && 'Staff Registry'}
                    {activeTab === 'hr' && 'HR Records'}
                    {activeTab === 'terminated' && 'Terminated Employees'}
                    {activeTab === 'attendance' && 'Overall Attendance'}
                  </h1>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeTab === 'dashboard' && ''}
                    {activeTab === 'workers' && ''}
                    {activeTab === 'hr' && ''}
                    {activeTab === 'terminated' && ''}
                    {activeTab === 'attendance' && ''}
                  </p>
                </motion.div>

                <div className="flex items-center gap-3">
                  {/* Theme Toggle Removed as per request */}
                </div>
              </div>

              {/* Row 2: Search and Filters */}
              {(activeTab === 'workers' || activeTab === 'hr' || activeTab === 'attendance' || activeTab === 'terminated') && (
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  {/* Left Column: Search */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex-1 flex items-center gap-3"
                  >
                    <div className="relative max-w-xl flex-1 group">
                      <div className={`absolute -inset-[1px] bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-blue-500/40 rounded-xl blur-[2px] opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition duration-500`}></div>
                      <div className="relative">
                        <svg className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder={activeTab === 'workers' ? "Search directory..." : activeTab === 'hr' ? "Search records..." : activeTab === 'terminated' ? "Search terminated..." : "Search attendance..."}
                          value={activeTab === 'workers' ? searchQuery : activeTab === 'hr' ? hrSearchQuery : activeTab === 'terminated' ? terminatedSearchQuery : attendanceSearchQuery}
                          onChange={(e) => {
                            if (activeTab === 'workers') setSearchQuery(e.target.value)
                            else if (activeTab === 'hr') setHrSearchQuery(e.target.value)
                            else if (activeTab === 'terminated') setTerminatedSearchQuery(e.target.value)
                            else setAttendanceSearchQuery(e.target.value)
                          }}
                          className={`w-full pl-10 pr-4 py-3 backdrop-blur-md border rounded-xl placeholder-slate-400 focus:outline-none transition-all text-sm shadow-sm ${darkMode ? 'bg-slate-900/60 border-white/10 text-white focus:border-blue-500/50' : 'bg-white/80 border-blue-100 text-slate-900 focus:border-blue-400/50 shadow-blue-500/5'}`}
                        />
                      </div>
                    </div>

                    {((activeTab === 'workers' && (searchQuery || designationFilter || monthFilter)) ||
                      (activeTab === 'hr' && (hrSearchQuery || hrDesignationFilter || hrMonthFilter)) ||
                      (activeTab === 'terminated' && (terminatedSearchQuery || terminatedDesignationFilter || terminatedMonthFilter)) ||
                      (activeTab === 'attendance' && (attendanceSearchQuery))) && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          onClick={() => {
                            if (activeTab === 'workers') {
                              setSearchQuery('')
                              setDesignationFilter('')
                              setMonthFilter('')
                            } else if (activeTab === 'hr') {
                              setHrSearchQuery('')
                              setHrDesignationFilter('')
                              setHrMonthFilter('')
                            } else if (activeTab === 'terminated') {
                              setTerminatedSearchQuery('')
                              setTerminatedDesignationFilter('')
                              setTerminatedMonthFilter('')
                            } else {
                              setAttendanceSearchQuery('')
                            }
                          }}
                          className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-500 transition-colors shadow-sm"
                          title="Clear all filters"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </motion.button>
                      )}
                  </motion.div>

                  {/* Right Column: Filters & Badge */}
                  <div className="flex flex-col items-end gap-3">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="flex flex-wrap items-center justify-end gap-3"
                    >
                      {activeTab !== 'attendance' && (
                        <div className="relative group min-w-[180px]">
                          <select
                            value={activeTab === 'workers' ? designationFilter : activeTab === 'hr' ? hrDesignationFilter : terminatedDesignationFilter}
                            onChange={(e) => {
                              if (activeTab === 'workers') setDesignationFilter(e.target.value)
                              else if (activeTab === 'hr') setHrDesignationFilter(e.target.value)
                              else setTerminatedDesignationFilter(e.target.value)
                            }}
                            className={`w-full pl-4 pr-10 py-3 backdrop-blur-md border rounded-xl text-sm transition-all cursor-pointer appearance-none shadow-sm ${darkMode
                              ? 'bg-slate-900/60 border-white/10 text-white focus:border-blue-500/50'
                              : 'bg-white/80 border-blue-100 text-slate-700 focus:border-blue-400/50 shadow-blue-500/5'}`}
                          >
                            <option value="">All Designations</option>
                            <option value="Sanitary Supervisor">Sanitary Supervisor</option>
                            <option value="Helper">Helper</option>
                            <option value="Sanitary Worker">Sanitary Worker</option>
                            <option value="Driver">Driver</option>
                          </select>
                          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}

                      <div className="min-w-[200px]">
                        <MonthPicker
                          value={activeTab === 'workers' ? monthFilter : activeTab === 'hr' ? hrMonthFilter : activeTab === 'terminated' ? terminatedMonthFilter : attendanceMonth}
                          onChange={(e) => {
                            if (activeTab === 'workers') setMonthFilter(e.target.value)
                            else if (activeTab === 'hr') setHrMonthFilter(e.target.value)
                            else if (activeTab === 'terminated') setTerminatedMonthFilter(e.target.value)
                            else setAttendanceMonth(e.target.value)
                          }}
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-2 px-3 py-1 bg-cyan-50/50 backdrop-blur-sm border border-cyan-100/60 rounded-lg shadow-sm"
                    >
                      <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                      <span className="text-cyan-700 text-[10px] font-bold uppercase tracking-wider">
                        {activeTab === 'workers' ? filteredWorkers.length : activeTab === 'hr' ? hrFilteredWorkers.length : activeTab === 'terminated' ? terminatedFilteredWorkers.length : workers.length} of {workers.length} employees
                      </span>
                    </motion.div>
                  </div>
                </div>
              )}
            </header>
          )}

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
              className="space-y-6"
            >
              {/* ─── HIGHER LEVEL METRICS ─── */}
              <div className={`rounded-[2rem] border overflow-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/5'}`}>
                <ModernStatCard label="Total Workforce" value={totalEmployees} trend="1.5" trendType="up" darkMode={darkMode} />
                <ModernStatCard label="Active Personnel" value={activeEmployees} trend="2.1" trendType="up" darkMode={darkMode} />
                <ModernStatCard label="Current Payroll" value={formatSalary(totalSalary)} trend="1.2" trendType="up" darkMode={darkMode} />
                <ModernStatCard label="Avg. Attendance" value={`${dashStats.attendanceRate.toFixed(1)}%`} trend="0.8" trendType="up" darkMode={darkMode} />
              </div>

              {/* ─── CORE INTELLIGENCE ─── */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className={`xl:col-span-12 p-8 rounded-[2rem] border transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl shadow-black/40' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/10'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Staff Composition</h3>
                      <p className={`text-[10px] font-bold mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Real-time workforce distribution</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${darkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                        {activeEmployees} Active Employees
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
                    {/* Pie Chart Section */}
                    <div className="md:col-span-5 relative h-[300px]">
                      <div className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={staffByDesignation}
                              innerRadius={85}
                              outerRadius={115}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {staffByDesignation.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                              ))}
                            </Pie>
                            <Tooltip content={<CategoryTooltip darkMode={darkMode} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                        <span className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeEmployees}</span>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Staff</span>
                      </div>
                    </div>

                    {/* Analysis List Section */}
                    <div className="md:col-span-7 flex flex-col h-full justify-center">
                      <div className={`rounded-2xl p-6 ${darkMode ? 'bg-white/5 border border-white/5' : 'bg-slate-50/50 border border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Role Breakdown</h4>
                        </div>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-3">
                          {staffByDesignation.map((item, i) => (
                            <CategoryMixItem
                              key={item.name}
                              label={item.name}
                              count={item.value}
                              total={activeEmployees}
                              color={item.fill}
                              darkMode={darkMode}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                            </svg>
                          </div>
                          <div>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Top Designation</p>
                            <h5 className={`text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{staffByDesignation[0]?.name || 'N/A'}</h5>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveTab('workers')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${darkMode ? 'hover:bg-white/5 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                        >
                          View Registry
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT ACTIVITIES */}
              <section>
                <div className={`border rounded-[2rem] overflow-hidden transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/5'}`}>
                  <div className={`px-8 py-6 border-b border-transparent flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-slate-50'}`}>
                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recently Active Staff</h3>
                    <button onClick={() => setActiveTab('workers')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'}`}>Full Log</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className={`${darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                          <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Employee</th>
                          <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Designation</th>
                          <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Status</th>
                          <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Registered</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                        {workers.slice(0, 5).map(worker => (
                          <tr key={worker.id} className={`group transition-all ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50/80'}`}>
                            <td className={`px-8 py-4 font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>{worker.full_name}</td>
                            <td className={`px-8 py-4 text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{worker.designation}</td>
                            <td className="px-8 py-4">
                              <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${worker.status === 'Active' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                <span className={`w-1 h-1 rounded-full ${worker.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {worker.status}
                              </div>
                            </td>
                            <td className={`px-8 py-4 text-right text-[11px] font-bold tabular-nums ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(worker.created_at || worker.joining_date).toLocaleDateString()}</td>
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center px-4"
            >
              <div className="relative z-10 w-full max-w-7xl">
                {/* Header Section - Moved Outside */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${darkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-100 text-cyan-600'}`}>
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className={`text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>New Employee</h2>

                    </div>
                  </div>


                </div>

                {/* Form Card */}
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className={`relative overflow-hidden rounded-[2rem] border transition-all duration-300 ${darkMode
                    ? 'bg-slate-900/60 border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] backdrop-blur-2xl'
                    : 'bg-white border-slate-200/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)]'
                    }`}
                >
                  <div className="p-6 md:p-10">
                    {/* Error Alert */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500"
                        >
                          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm font-bold">{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Main Form */}
                    <form onSubmit={handleSubmit} className="space-y-10" autoComplete="new-password">
                      {/* Anti-autofill hidden fields to distract browser suggestions */}
                      <input type="text" name="__no_autofill_email" autoComplete="new-password" style={{ display: 'none' }} aria-hidden="true" />
                      <input type="password" name="__no_autofill_password" autoComplete="new-password" style={{ display: 'none' }} aria-hidden="true" />
                      <PersonalInfo formData={formData} errors={errors} onChange={handleChange} darkMode={darkMode} />
                      <Identification formData={formData} errors={errors} onChange={handleChange} darkMode={darkMode} />
                      <EmploymentDetails formData={formData} errors={errors} onChange={handleChange} darkMode={darkMode} />
                      <LocationAssignment formData={formData} errors={errors} onChange={handleChange} ucWardOptions={ucWardOptions} darkMode={darkMode} />

                      {formData.designation === 'Driver' && (
                        <VehicleInfo formData={formData} errors={errors} onChange={handleChange} darkMode={darkMode} />
                      )}

                      <AddressSection formData={formData} onChange={handleChange} darkMode={darkMode} />

                      <div className="pt-4">
                        <SubmitButton loading={loading} darkMode={darkMode} />
                      </div>
                    </form>
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
                  <h3 className="text-2xl font-semibold text-slate-900 mb-2">No Workers Registered Yet</h3>
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
                <div className={`backdrop-blur-xl border rounded-3xl overflow-hidden shadow-xl relative z-10 transition-colors ${darkMode ? 'bg-white/[0.02] border-white/10 shadow-black/20' : 'bg-white/40 border-white/60 shadow-indigo-100/10'}`}>


                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b text-xs backdrop-blur-sm transition-colors ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/40 border-white/50'}`}>
                          <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider w-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sr.</th>
                          <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider w-48 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Name / Father Name</th>
                          <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider w-36 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>CNIC</th>
                          <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider hidden sm:table-cell w-32 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>DOB / Age</th>
                          <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider w-28 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phone</th>
                          <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider hidden sm:table-cell w-24 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Religion</th>
                          <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider w-32 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Designation</th>
                          <th className={`px-4 py-3 text-left font-medium uppercase tracking-wider w-28 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Joined</th>
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
                              whileHover={{ backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(249, 250, 251, 1)' }}
                              className={`group transition-colors duration-200 bg-transparent border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100/50 hover:bg-white/40'}`}
                            >
                              <td className="px-3 py-2 text-slate-500 text-xs font-mono">
                                {String(index + 1).padStart(2, '0')}
                              </td>
                              <td className="px-3 py-2">
                                <div className="min-w-0">
                                  <div className={`text-sm font-normal truncate ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{worker.full_name}</div>
                                  <div className={`text-xs truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{worker.father_name}</div>
                                </div>
                              </td>

                              <td className="px-3 py-2">
                                <p className={`text-sm font-mono truncate ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>{worker.cnic || 'N/A'}</p>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-slate-600 text-sm">
                                  {worker.date_of_birth ? new Date(worker.date_of_birth).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  Age: {worker.date_of_birth ? Math.floor((new Date() - new Date(worker.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : 'N/A'}
                                </div>
                              </td>

                              <td className="px-3 py-2">
                                <div className="text-slate-600 text-sm truncate">{worker.phone_number}</div>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-slate-600 text-sm">{worker.religion || 'N/A'}</div>
                              </td>

                              <td className="px-3 py-2">
                                <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>{worker.designation}</div>
                                {worker.vehicle_code && (
                                  <div className="text-slate-500 text-xs truncate">Vehicle: {worker.vehicle_code}</div>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                                  {worker.joining_date ? new Date(worker.joining_date).toLocaleDateString() : 'N/A'}
                                </div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
                className="mb-8 flex flex-col gap-6"
              >
                {/* Summary Statistics */}
                <div className={`p-6 rounded-3xl border transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/60 shadow-sm'}`}>
                  <h3 className={`text-sm font-medium mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Summary Statistics</h3>
                  <div className="flex flex-wrap gap-12 md:gap-24">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Total Workers</p>
                      <h4 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalEmployees}</h4>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Active</p>
                      <h4 className={`text-2xl font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`}>{activeEmployees}</h4>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Total Payroll</p>
                      <h4 className={`text-2xl font-semibold ${darkMode ? 'text-sky-500' : 'text-sky-600'}`}>{formatSalary(totalSalary)}</h4>
                    </div>
                  </div>
                </div>

                {/* HR Table Card */}
                <div className={`backdrop-blur-xl border rounded-3xl overflow-hidden shadow-xl relative z-10 transition-colors ${darkMode ? 'bg-white/[0.02] border-white/10 shadow-black/20' : 'bg-white/40 border-white/60 shadow-purple-100/10'}`}>




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
                        className={`px-8 py-4 font-medium rounded-xl transition-all duration-300 shadow-lg ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200'}`}
                      >
                        Register Employee
                      </motion.button>
                    </motion.div>
                  ) : (
                    <div className="overflow-x-auto">

                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/50 bg-white/40 backdrop-blur-sm">
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-8">#</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-36">Employee</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-24">CNIC</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-16">DOB</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-20">Phone</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-16">Religion</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-24">Designation</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-16">Code</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-28">CNIC Dates</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500 uppercase tracking-wider w-16">Joined</th>
                            <th className="px-2 py-2 text-center font-medium text-slate-500 uppercase tracking-wider w-28">Status</th>
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
                              <td className="px-2 py-2">
                                <span className="text-slate-400 font-medium">{index + 1}</span>
                              </td>

                              <td className="px-2 py-2">
                                <div className="min-w-0">
                                  <p className="text-slate-900 font-normal truncate" title={worker.full_name}>{worker.full_name}</p>
                                  <p className="text-slate-400 text-[10px] truncate" title={worker.father_name}>{worker.father_name}</p>
                                </div>
                              </td>

                              <td className="px-2 py-2">
                                <p className="text-slate-600 font-mono text-[11px] truncate">{worker.cnic || '-'}</p>
                              </td>

                              <td className="px-2 py-2">
                                <p className="text-slate-600 text-[11px] truncate">{worker.date_of_birth ? new Date(worker.date_of_birth).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}</p>
                              </td>

                              <td className="px-2 py-2">
                                <p className="text-slate-600 text-[11px] truncate">{worker.phone_number}</p>
                              </td>

                              <td className="px-2 py-2">
                                <p className="text-slate-600 text-[11px] truncate">{worker.religion || '-'}</p>
                              </td>

                              <td className="px-2 py-2">
                                <div className="min-w-0">
                                  <p className="text-slate-700 text-[11px] font-normal truncate" title={worker.designation}>{worker.designation}</p>
                                  {worker.vehicle_code && (
                                    <p className="text-slate-400 text-[10px] truncate" title={worker.vehicle_code}>{worker.vehicle_code}</p>
                                  )}
                                </div>
                              </td>

                              <td className="px-2 py-2">
                                <p className="text-slate-900 font-mono text-[11px] font-medium truncate">{worker.employee_code || '-'}</p>
                              </td>

                              <td className="px-2 py-2">
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

                              <td className="px-2 py-2">
                                <p className="text-slate-900 text-[11px] font-normal truncate">{worker.joining_date ? new Date(worker.joining_date).toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-'}</p>
                              </td>

                              <td className="px-2 py-2 text-center w-28">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="relative">
                                    <motion.button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdown(activeDropdown === worker.id ? null : worker.id);
                                      }}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      className={`w-20 py-1 text-[10px] font-semibold rounded-full transition-all duration-200 border text-center flex items-center justify-center ${worker.status === 'Active' ? (darkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100') :
                                        worker.status === 'Inactive' ? (darkMode ? 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100') :
                                          worker.status === 'On Leave' ? (darkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100') :
                                            (darkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100')
                                        }`}
                                    >
                                      {worker.status}
                                    </motion.button>

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                      {activeDropdown === worker.id && (
                                        <motion.div
                                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                          transition={{ duration: 0.1 }}
                                          className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[140px] overflow-hidden text-left origin-top-right"
                                        >
                                          {worker.status === 'Active' && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleTerminateClick(worker.id); setActiveDropdown(null); }}
                                              className="block w-full text-left px-4 py-2.5 text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
                                            >
                                              Terminate
                                            </button>
                                          )}
                                          {worker.status === 'Terminated' && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(worker.id, 'Active'); setActiveDropdown(null); }}
                                              className="block w-full text-left px-4 py-2.5 text-emerald-600 hover:bg-emerald-50 transition-colors text-sm font-medium"
                                            >
                                              Reactivate
                                            </button>
                                          )}
                                          {worker.status === 'Inactive' && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(worker.id, 'Active'); setActiveDropdown(null); }}
                                              className="block w-full text-left px-4 py-2.5 text-emerald-600 hover:bg-emerald-50 transition-colors text-sm font-medium"
                                            >
                                              Activate
                                            </button>
                                          )}
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleViewHistory(worker.id); setActiveDropdown(null); }}
                                            className="block w-full text-left px-4 py-2.5 text-purple-600 hover:bg-purple-50 transition-colors text-sm font-medium border-t border-gray-100"
                                          >
                                            History
                                          </button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
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
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}



          {/* Terminated Employees Tab */}
          {activeTab === 'terminated' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="max-w-7xl mx-auto">


              <div className={`backdrop-blur-xl border rounded-3xl overflow-hidden shadow-xl relative z-10 transition-colors ${darkMode ? 'bg-white/[0.02] border-white/10 shadow-black/20' : 'bg-white/40 border-white/60 shadow-rose-100/10'}`}>
                {/* Search Bar removed as it's now in the header */}

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead>
                      <tr className={`${darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'} backdrop-blur-md`}>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-12 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>Sr.</th>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-40 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>Name / Father Name</th>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-32 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>CNIC</th>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-28 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>DOB / Age</th>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-32 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>Phone</th>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-24 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'} hidden sm:table-cell`}>Religion</th>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-36 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>Designation</th>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-28 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>Joining Date</th>
                        <th className={`px-4 py-3 text-left font-semibold uppercase tracking-wider w-28 border-b transition-colors ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>Terminated Date</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y transition-colors ${darkMode ? 'divide-white/5 bg-slate-900/40' : 'divide-slate-100 bg-white/40'}`}>
                      {terminatedFilteredWorkers.map((worker, idx) => (
                        <tr key={worker.id} className={`group transition-all ${darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-3">
                            <span className={`font-mono text-[11px] font-semibold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                              <p className={`font-semibold truncate text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`} title={worker.full_name}>{worker.full_name}</p>
                              <p className={`text-[10px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} title={worker.father_name}>{worker.father_name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className={`font-mono text-[11px] truncate font-normal ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{worker.cnic}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`truncate text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {worker.date_of_birth ? new Date(worker.date_of_birth).toLocaleDateString() : '-'}
                            </div>
                            <div className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              Age: {worker.date_of_birth ? Math.floor((new Date() - new Date(worker.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className={`font-normal truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{worker.phone_number}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className={`truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{worker.religion || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className={`font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`} title={worker.designation}>{worker.designation}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className={`font-normal truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{worker.joining_date ? new Date(worker.joining_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className={`font-semibold truncate text-rose-500`}>{worker.termination_date ? new Date(worker.termination_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}</p>
                          </td>
                        </tr>
                      ))}
                      {terminatedFilteredWorkers.length === 0 && (
                        <tr>
                          <td className={`px-6 py-20 text-center font-medium italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} colSpan={9}>
                            No matching terminated records found for this period
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


                <div>
                  <Attendance
                    workers={workers}
                    darkMode={darkMode}
                    externalSearchQuery={attendanceSearchQuery}
                    externalMonth={attendanceMonth}
                    onExternalMonthChange={setAttendanceMonth}
                  />
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
                  className={`border shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
                >
                  {/* Modal Header */}
                  <div className={`p-6 border-b transition-colors flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/90'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Edit Employee</h2>
                        <p className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Update internal records for {editFormData.full_name || 'Personnel'}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelEdit}
                      className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-6">
                      {/* Form Field Helper */}
                      {Object.entries({
                        full_name: 'Full Name',
                        father_name: "Father's Name",
                        date_of_birth: 'Date of Birth',
                        cnic: 'CNIC Number',
                        cnic_issue_date: 'CNIC Issue Date',
                        cnic_expiry_date: 'CNIC Expiry Date',
                        phone_number: 'Phone Number',
                        uc_ward_name: 'UC / Ward',
                        salary: 'Salary (PKR)',
                        religion: 'Religion'
                      }).map(([key, label]) => (
                        <div key={key} className="space-y-1.5">
                          <label className={`block text-[10px] font-bold uppercase tracking-widest pl-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {label}
                          </label>
                          <input
                            type={key.includes('date') ? 'date' : key === 'salary' ? 'number' : 'text'}
                            value={editFormData[key] || ''}
                            onChange={(e) => handleEditChange(e, key)}
                            className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${darkMode
                              ? 'bg-slate-800/50 border-white/10 text-white focus:border-blue-500/50'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:bg-white shadow-sm'
                              }`}
                          />
                        </div>
                      ))}

                      {/* Designation Special Handling */}
                      <div className="space-y-1.5">
                        <label className={`block text-[10px] font-bold uppercase tracking-widest pl-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Designation
                        </label>
                        <select
                          value={editFormData.designation || ''}
                          onChange={(e) => handleEditChange(e, 'designation')}
                          className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none ${darkMode
                            ? 'bg-slate-800/50 border-white/10 text-white focus:border-blue-500/50'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:bg-white shadow-sm'
                            }`}
                        >
                          <option value="">Select Designation</option>
                          <option value="Sanitary Supervisor">Sanitary Supervisor</option>
                          <option value="Helper">Helper</option>
                          <option value="Sanitary Worker">Sanitary Worker</option>
                          <option value="Driver">Driver</option>
                        </select>
                      </div>

                      {/* Address Full Width */}
                      <div className="lg:col-span-3 space-y-1.5">
                        <label className={`block text-[10px] font-bold uppercase tracking-widest pl-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Current Address
                        </label>
                        <textarea
                          value={editFormData.address || ''}
                          onChange={(e) => handleEditChange(e, 'address')}
                          rows="3"
                          className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${darkMode
                            ? 'bg-slate-800/50 border-white/10 text-white focus:border-blue-500/50'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:bg-white shadow-sm'
                            }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className={`p-6 border-t transition-colors flex items-center justify-end gap-3 sticky bottom-0 z-20 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/90'}`}>
                    <button
                      onClick={handleCancelEdit}
                      className={`px-6 py-2.5 rounded-xl transition-all font-bold text-sm ${darkMode
                        ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                        }`}
                    >
                      Discard Changes
                    </button>
                    <button
                      onClick={() => {
                        const currentWorker = workers.find(w => w.id === editingWorkerId)
                        if (currentWorker) handleSaveEdit(currentWorker.id)
                      }}
                      disabled={loading}
                      className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Update Personnel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {terminationModal.open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setTerminationModal({ open: false, workerId: null, worker: null })}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 40 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.85, opacity: 0, y: 40 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`relative max-w-md w-full p-8 rounded-[2rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border transition-all ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'
                    }`}
                >
                  {/* Danger Glow Effect */}
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/20 blur-[80px] pointer-events-none opacity-50"></div>

                  <div className="relative mb-8 flex flex-col items-center">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mb-6 rotate-12 group hover:rotate-0 transition-transform duration-500">
                      <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>

                    <h2 className={`text-2xl font-black mb-2 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Terminate Personnel?</h2>
                    <p className={`text-sm text-center font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      This action will immediately revoke active status for this employee in the system.
                    </p>
                  </div>

                  {terminationModal.worker && (
                    <div className={`mb-8 p-5 rounded-3xl border transition-colors flex items-center gap-4 ${darkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100'
                      }`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-sm'
                        }`}>
                        {terminationModal.worker.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {terminationModal.worker.full_name}
                        </p>
                        <p className={`text-[10px] font-mono font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          CNIC: {terminationModal.worker.cnic}
                        </p>
                      </div>
                      <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        Active
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={confirmTermination}
                      disabled={loading}
                      className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-[1.25rem] transition-all font-black text-sm shadow-xl shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                          </svg>
                          Confirm Termination
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setTerminationModal({ open: false, workerId: null, worker: null })}
                      className={`w-full py-4 rounded-[1.25rem] transition-all font-bold text-sm ${darkMode
                        ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                    >
                      Keep Employee Active
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
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 20, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`border shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col transition-colors ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
                >
                  {/* Modal Header */}
                  <div className={`p-6 border-b transition-colors flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/90'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Status History</h2>
                        <p className={`text-xs transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tracking lifecycle changes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setHistoryModal({ open: false, workerId: null, history: [] })}
                      className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {historyModal.history && historyModal.history.length > 0 ? (
                      <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500/50 before:via-slate-500/20 before:to-transparent">
                        {historyModal.history.map((entry, idx) => (
                          <div key={idx} className="relative group">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[33px] top-1.5 w-6 h-6 rounded-full border-4 flex items-center justify-center transition-colors shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 group-hover:border-blue-500/50' : 'bg-white border-slate-100 group-hover:border-blue-400/50'
                              }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${entry.new_status === 'Active' ? 'bg-emerald-500' :
                                entry.new_status === 'Terminated' ? 'bg-rose-500' : 'bg-amber-500'
                                }`}></div>
                            </div>

                            <div className={`p-4 rounded-2xl border transition-all ${darkMode
                              ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                              : 'bg-slate-50/50 border-slate-200/50 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5'
                              }`}>
                              <div className="flex flex-col gap-1 mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  Lifecycle Event
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border border-slate-100 text-slate-500'}`}>
                                    {entry.old_status}
                                  </span>
                                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${entry.new_status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                                    entry.new_status === 'Terminated' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                    {entry.new_status}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className={`text-[11px] font-medium transition-colors ${darkMode ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                  {new Date(entry.changed_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-50 text-slate-300'}`}>
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No status changes recorded yet</p>
                      </div>
                    )}
                  </div>

                  <div className={`p-4 border-t transition-colors flex items-center justify-center sticky bottom-0 z-20 backdrop-blur-xl ${darkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/90'}`}>
                    <button
                      onClick={() => setHistoryModal({ open: false, workerId: null, history: [] })}
                      className={`w-full py-2.5 rounded-xl transition-all font-bold text-sm ${darkMode
                        ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                    >
                      Close Lifecycle History
                    </button>
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
