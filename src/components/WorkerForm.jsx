import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from './Navbar'

export default function WorkerForm() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
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
    salary: '',
    joiningDate: '',
    
    // Location & Assignment
    ucWard: '',
    
    // Conditional Field
    vehicleCode: '',
    
    // Other
    address: '',
  })

  const [errors, setErrors] = useState({})

  // Load workers from Supabase on component mount
  useEffect(() => {
    loadWorkers()
  }, [])

  // Function to load workers from Supabase
  const loadWorkers = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setWorkers(data || [])
    } catch (err) {
      console.error('Error loading workers:', err)
      setError('Failed to load workers from database')
    } finally {
      setLoading(false)
    }
  }

  // Designation to Salary mapping (all 40,000 PKR)
  const designationSalary = {
    'Sanitary Supervisor': '40,000',
    'Helper': '40,000',
    'Sanitary Worker': '40,000',
    'Driver': '40,000',
  }

  // Dummy UC/Ward data (embedded for now, will be dynamic later)
  const ucWardOptions = [
    { id: 1, name: 'UC-1 Model Town', attendancePoint: 'Model Town Community Center' },
    { id: 2, name: 'UC-2 Johar Town', attendancePoint: 'Johar Town Park Office' },
    { id: 3, name: 'UC-3 Gulberg', attendancePoint: 'Gulberg Main Office' },
    { id: 4, name: 'UC-4 DHA Phase 1', attendancePoint: 'DHA Phase 1 Gate' },
    { id: 5, name: 'UC-5 Cantt', attendancePoint: 'Cantt Station Office' },
    { id: 6, name: 'UC-6 Shadman', attendancePoint: 'Shadman Circle Office' },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      // Auto-fill salary when designation is selected
      if (name === 'designation' && value) {
        updated.salary = designationSalary[value] || ''
        // Clear vehicle code if designation changed from Driver
        if (value !== 'Driver') {
          updated.vehicleCode = ''
        }
      }
      
      return updated
    })

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
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
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required'
    
    // Identification
    if (!formData.cnic.trim()) newErrors.cnic = 'CNIC number is required'
    
    // Employment Details
    if (!formData.designation) newErrors.designation = 'Please select a designation'
    if (!formData.joiningDate) newErrors.joiningDate = 'Joining date is required'
    
    // Location & Assignment
    if (!formData.ucWard) newErrors.ucWard = 'Please select UC/Ward'
    
    // Conditional validation for Driver
    if (formData.designation === 'Driver' && !formData.vehicleCode.trim()) {
      newErrors.vehicleCode = 'Vehicle code is required for drivers'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

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
        salary: parseInt(formData.salary.replace(',', '')),
        joining_date: formData.joiningDate,
        uc_ward_id: parseInt(formData.ucWard),
        uc_ward_name: selectedUC?.name || '',
        attendance_point: selectedUC?.attendancePoint || '',
        vehicle_code: formData.vehicleCode || null,
        address: formData.address,
        status: 'Active'
      }

      // Insert into Supabase
      const { data, error: insertError } = await supabase
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
        salary: '',
        joiningDate: '',
        ucWard: '',
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

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Simulated Particles Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large glowing orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gray-400/5 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/3 rounded-full blur-3xl animate-drift"></div>
        
        {/* Small particle dots */}
        <div className="absolute top-10 left-1/4 w-2 h-2 bg-white/20 rounded-full blur-sm animate-pulse-glow"></div>
        <div className="absolute top-32 right-1/4 w-1.5 h-1.5 bg-white/15 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-white/25 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white/18 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-1/4 right-20 w-1.5 h-1.5 bg-white/22 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-2/3 left-20 w-1 h-1 bg-white/15 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute top-20 right-1/2 w-2 h-2 bg-white/20 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '3s'}}></div>
        <div className="absolute bottom-20 left-1/2 w-1.5 h-1.5 bg-white/18 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '3.5s'}}></div>
      </div>

      {/* Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} workers={workers} />

      {/* Main Content Area */}
      <div className="relative z-10 px-4 pb-8">
        {/* Error and Success Messages */}
        {error && (
          <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="max-w-4xl mx-auto mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400 text-sm">
            {success}
          </div>
        )}
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
              <p className="text-gray-400">Municipal Employee Management System</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-white">{workers.length}</span>
                </div>
                <h3 className="text-white font-semibold mb-1">Total Employees</h3>
                <p className="text-gray-400 text-sm">Active workforce</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-white">{workers.filter(w => w.status === 'Active').length}</span>
                </div>
                <h3 className="text-white font-semibold mb-1">Active Workers</h3>
                <p className="text-gray-400 text-sm">Currently employed</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-white">6</span>
                </div>
                <h3 className="text-white font-semibold mb-1">UC/Ward Areas</h3>
                <p className="text-gray-400 text-sm">Coverage zones</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-white">PKR {workers.reduce((sum, w) => sum + (w.salary || 0), 0).toLocaleString()}</span>
                </div>
                <h3 className="text-white font-semibold mb-1">Monthly Payroll</h3>
                <p className="text-gray-400 text-sm">Total expenses</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
              <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('registration')}
                  className="flex items-center gap-3 p-4 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl transition-all duration-200 text-left"
                >
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Register New Employee</p>
                    <p className="text-gray-400 text-sm">Add worker to system</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('workers')}
                  className="flex items-center gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-all duration-200 text-left"
                >
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">View Employee Directory</p>
                    <p className="text-gray-400 text-sm">Browse all workers</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('hr')}
                  className="flex items-center gap-3 p-4 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-all duration-200 text-left"
                >
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">HR Records</p>
                    <p className="text-gray-400 text-sm">Complete employee data</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            {workers.length > 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Recent Registrations</h3>
                <div className="space-y-3">
                  {workers.slice(0, 5).map((worker) => (
                    <div key={worker.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/5 rounded-lg flex items-center justify-center text-white font-bold border border-white/10">
                        {worker.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{worker.full_name}</p>
                        <p className="text-gray-400 text-sm">{worker.designation} • {worker.uc_ward_name}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                        {worker.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'registration' && (
          <div className="flex items-center justify-center p-4">
            {/* Registration Form */}
            <div className="relative z-10 w-full max-w-4xl">
              {/* Glow effect behind card */}
              <div className="absolute inset-0 bg-white/10 rounded-3xl blur-3xl"></div>
              
              {/* Glass card */}
              <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              Worker Registration
            </h1>
            <div className="h-1 w-24 bg-white mx-auto rounded-full shadow-lg shadow-white/50"></div>
            <p className="text-gray-400 mt-4 text-sm md:text-base">Fill in the details to register a new worker</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h2 className="text-white text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white shadow-lg shadow-white/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                Personal Information
              </h2>

              {/* Full Name & Father Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className={`w-full px-4 py-3 bg-white/5 border ${errors.fullName ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10`}
                  />
                  {errors.fullName && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <span>⚠</span> {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Father's Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    placeholder="Enter father's name"
                    className={`w-full px-4 py-3 bg-white/5 border ${errors.fatherName ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10`}
                  />
                  {errors.fatherName && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <span>⚠</span> {errors.fatherName}
                    </p>
                  )}
                </div>
              </div>

              {/* Date of Birth, Religion, Phone Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Date of Birth <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/5 border ${errors.dateOfBirth ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10`}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <span>⚠</span> {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Religion
                  </label>
                  <input
                    type="text"
                    name="religion"
                    value={formData.religion}
                    onChange={handleChange}
                    placeholder="Enter religion"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+92 300 0000000"
                    className={`w-full px-4 py-3 bg-white/5 border ${errors.phoneNumber ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10`}
                  />
                  {errors.phoneNumber && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <span>⚠</span> {errors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Identification Section */}
            <div className="space-y-4 pt-6">
              <h2 className="text-cyan-400 text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </span>
                Identification
              </h2>

              {/* CNIC Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    CNIC Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="cnic"
                    value={formData.cnic}
                    onChange={handleChange}
                    placeholder="00000-0000000-0"
                    className={`w-full px-4 py-3 bg-white/5 border ${errors.cnic ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10`}
                  />
                  {errors.cnic && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <span>⚠</span> {errors.cnic}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    CNIC Issue Date
                  </label>
                  <input
                    type="date"
                    name="cnicIssueDate"
                    value={formData.cnicIssueDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    CNIC Expiry Date
                  </label>
                  <input
                    type="date"
                    name="cnicExpiryDate"
                    value={formData.cnicExpiryDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10"
                  />
                </div>
              </div>
            </div>

            {/* Employment Details Section */}
            <div className="space-y-4 pt-6">
              <h2 className="text-cyan-400 text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                Employment Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Designation */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Designation <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/5 border ${errors.designation ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10 appearance-none cursor-pointer`}
                  >
                    <option value="" className="bg-gray-900">Select designation</option>
                    <option value="Sanitary Supervisor" className="bg-gray-900">Sanitary Supervisor</option>
                    <option value="Helper" className="bg-gray-900">Helper</option>
                    <option value="Sanitary Worker" className="bg-gray-900">Sanitary Worker</option>
                    <option value="Driver" className="bg-gray-900">Driver</option>
                  </select>
                  {errors.designation && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <span>⚠</span> {errors.designation}
                    </p>
                  )}
                </div>

                {/* Salary - Auto-filled */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                    Salary (PKR)
                    <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">Auto-filled</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="salary"
                      value={formData.salary}
                      readOnly
                      placeholder="Select designation first"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cyan-400 placeholder-gray-600 focus:outline-none cursor-not-allowed opacity-80 shadow-inner shadow-cyan-500/10"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 pointer-events-none"></div>
                  </div>
                </div>
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Joining Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${errors.joiningDate ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10`}
                />
                {errors.joiningDate && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <span>⚠</span> {errors.joiningDate}
                  </p>
                )}
              </div>
            </div>

            {/* Location & Assignment Section */}
            <div className="space-y-4 pt-6">
              <h2 className="text-cyan-400 text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                Location & Assignment
                <span className="text-xs text-gray-500 font-normal ml-2">(Maps to attendance point)</span>
              </h2>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  UC / Ward <span className="text-red-400">*</span>
                  <span className="text-xs text-blue-400 ml-2">(Will be dynamically connected)</span>
                </label>
                <select
                  name="ucWard"
                  value={formData.ucWard}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${errors.ucWard ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10 appearance-none cursor-pointer`}
                >
                  <option value="" className="bg-gray-900">Select UC/Ward</option>
                  {ucWardOptions.map(uc => (
                    <option key={uc.id} value={uc.id} className="bg-gray-900">
                      {uc.name} - {uc.attendancePoint}
                    </option>
                  ))}
                </select>
                {errors.ucWard && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <span>⚠</span> {errors.ucWard}
                  </p>
                )}
                {formData.ucWard && (
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-blue-300">
                      Attendance Point: <span className="font-semibold">{ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))?.attendancePoint}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Conditional Field - Vehicle Code (Only for Drivers) */}
            {formData.designation === 'Driver' && (
              <div className="space-y-4 pt-6 border-t border-white/10">
                <h2 className="text-cyan-400 text-lg font-semibold flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </span>
                  Vehicle Information
                </h2>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Vehicle Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleCode"
                    value={formData.vehicleCode}
                    onChange={handleChange}
                    placeholder="Enter vehicle code (e.g., VEH-2026-001)"
                    className={`w-full px-4 py-3 bg-white/5 border ${errors.vehicleCode ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10`}
                  />
                  {errors.vehicleCode && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <span>⚠</span> {errors.vehicleCode}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">Required for driver designation</p>
                </div>
              </div>
            )}

            {/* Address Section */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <h2 className="text-cyan-400 text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                Address
              </h2>

              {/* Address */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Complete Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Enter complete address"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/10 resize-none"
                ></textarea>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Registering...' : 'Register Worker'}
              </button>
            </div>
          </form>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-gray-500 text-sm">
              All fields marked with <span className="text-red-400">*</span> are required
            </p>
          </div>
            </div>
          </div>
          </div>
        )}

        {/* Workers Directory Tab */}
        {activeTab === 'workers' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Workers Directory</h2>
              <p className="text-gray-400">View and manage all registered workers</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading workers...</p>
                </div>
              </div>
            ) : workers.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Workers Registered Yet</h3>
                <p className="text-gray-400 mb-6">Start by registering your first worker</p>
                <button
                  onClick={() => setActiveTab('registration')}
                  className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-all duration-300"
                >
                  Register First Worker
                </button>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                {/* Search and Filters Bar */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search employees..."
                          className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm"
                        />
                      </div>
                      <select className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm">
                        <option value="" className="bg-gray-900">All Designations</option>
                        <option value="Sanitary Supervisor" className="bg-gray-900">Sanitary Supervisor</option>
                        <option value="Helper" className="bg-gray-900">Helper</option>
                        <option value="Sanitary Worker" className="bg-gray-900">Sanitary Worker</option>
                        <option value="Driver" className="bg-gray-900">Driver</option>
                      </select>
                    </div>
                    <div className="text-sm text-gray-400">
                      Showing {workers.length} employee{workers.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Designation</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">CNIC</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">DOB</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">UC/Ward</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Salary</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {workers.map((worker) => (
                        <tr key={worker.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/5 rounded-lg flex items-center justify-center text-white font-semibold text-sm border border-white/10 flex-shrink-0">
                                {worker.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-white font-medium truncate">{worker.full_name}</div>
                                <div className="text-gray-400 text-xs truncate">{worker.father_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-white text-sm">{worker.designation}</div>
                            {worker.vehicle_code && (
                              <div className="text-gray-400 text-xs">Vehicle: {worker.vehicle_code}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-300 text-sm font-mono">{worker.cnic}</div>
                            {worker.cnic_issue_date && (
                              <div className="text-gray-400 text-xs">Issued: {new Date(worker.cnic_issue_date).toLocaleDateString()}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-300 text-sm">{worker.phone_number}</div>
                            {worker.religion && (
                              <div className="text-gray-400 text-xs">{worker.religion}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-300 text-sm">
                              {worker.date_of_birth ? new Date(worker.date_of_birth).toLocaleDateString() : 'N/A'}
                            </div>
                            <div className="text-gray-400 text-xs">
                              Age: {worker.date_of_birth ? Math.floor((new Date() - new Date(worker.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-300 text-sm max-w-32 truncate">{worker.uc_ward_name}</div>
                            {worker.attendance_point && (
                              <div className="text-gray-400 text-xs max-w-32 truncate" title={worker.attendance_point}>
                                {worker.attendance_point}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-white text-sm font-semibold">PKR {worker.salary?.toLocaleString()}</div>
                            <div className="text-gray-400 text-xs">
                              Joined: {worker.joining_date ? new Date(worker.joining_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                              {worker.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-white/10" title="View Details">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button className="p-2 text-gray-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/10" title="Edit">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/10" title="Archive">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="bg-white/5 border-t border-white/10 px-6 py-4">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm">
                    <div>
                      <span className="text-gray-400">Total Workers:</span>
                      <span className="text-white font-semibold ml-2">{workers.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Active:</span>
                      <span className="text-green-400 font-semibold ml-2">{workers.filter(w => w.status === 'Active').length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Payroll:</span>
                      <span className="text-white font-semibold ml-2">
                        PKR {workers.reduce((sum, w) => sum + (w.salary || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Avg. Salary:</span>
                      <span className="text-white font-semibold ml-2">
                        PKR {workers.length > 0 ? Math.round(workers.reduce((sum, w) => sum + (w.salary || 0), 0) / workers.length).toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HR Records Tab */}
        {activeTab === 'hr' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">HR Records</h2>
              <p className="text-gray-400">Complete employee records and documentation</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading records...</p>
                </div>
              </div>
            ) : workers.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No HR Records Available</h3>
                <p className="text-gray-400 mb-6">Register workers to see their HR records here</p>
                <button
                  onClick={() => setActiveTab('registration')}
                  className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-all duration-300"
                >
                  Register Worker
                </button>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Designation</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">CNIC</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">UC/Ward</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Salary</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {workers.map((worker) => (
                        <tr key={worker.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/5 rounded-lg flex items-center justify-center text-white font-semibold text-sm border border-white/10">
                                {worker.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-white font-medium">{worker.full_name}</div>
                                <div className="text-gray-400 text-xs">{worker.father_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white text-sm">{worker.designation}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm font-mono">{worker.cnic}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">{worker.phone_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">{worker.uc_ward_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-white text-sm font-semibold">PKR {worker.salary?.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                              {worker.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-gray-400 hover:text-white transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="bg-white/5 border-t border-white/10 px-6 py-4">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <span className="text-gray-400">Total Workers:</span>
                      <span className="text-white font-semibold ml-2">{workers.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Active:</span>
                      <span className="text-green-400 font-semibold ml-2">{workers.filter(w => w.status === 'Active').length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Payroll:</span>
                      <span className="text-white font-semibold ml-2">
                        PKR {workers.reduce((sum, w) => sum + (w.salary || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
