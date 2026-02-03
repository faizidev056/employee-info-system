import { useState, useEffect } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import Navbar from './Navbar'
import PersonalInfo from './WorkerFormParts/PersonalInfo'
import Identification from './WorkerFormParts/Identification'
import EmploymentDetails from './WorkerFormParts/EmploymentDetails'
import LocationAssignment from './WorkerFormParts/LocationAssignment'
import VehicleInfo from './WorkerFormParts/VehicleInfo'
import AddressSection from './WorkerFormParts/AddressSection'
import SubmitButton from './WorkerFormParts/SubmitButton'

export default function WorkerManager() {
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
  
  // HR Records editing state
  const [editingWorkerId, setEditingWorkerId] = useState(null)
  const [editFormData, setEditFormData] = useState({})

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
  
  // Handle edit worker in HR tab
  const handleEditWorker = (worker) => {
    setEditingWorkerId(worker.id)
    setEditFormData({
      full_name: worker.full_name,
      father_name: worker.father_name,
      date_of_birth: worker.date_of_birth,
      religion: worker.religion || '',
      phone_number: worker.phone_number,
      cnic: worker.cnic,
      designation: worker.designation,
      salary: worker.salary,
      uc_ward_name: worker.uc_ward_name,
      status: worker.status,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Enhanced Background with Multiple Layers */}
      <div className="absolute inset-0">
        {/* Primary gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>

        {/* Animated mesh gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 animate-pulse"></div>

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl animate-float-slower"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/6 rounded-full blur-3xl animate-float"></div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>

        {/* Animated particles */}
        <div className="absolute top-20 left-20 w-1 h-1 bg-cyan-400/60 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-purple-400/60 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-1/3 w-1 h-1 bg-blue-400/60 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-cyan-400/60 rounded-full animate-ping" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} workers={workers} />

      {/* Main Content Area */}
      <div className="relative z-10 px-4 pb-8 pt-4">
        {/* Error and Success Messages */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400 text-sm"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto p-4 md:p-8"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-8 pb-4 border-b border-gray-800"
            >
              <h2 className="text-3xl font-semibold text-white mb-1.5">
                Dashboard
              </h2>
              <p className="text-gray-500 text-sm">Municipal Employee Management System</p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                {
                  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
                  gradient: 'from-cyan-500/20 to-blue-500/20',
                  borderColor: 'border-cyan-500/30',
                  shadowColor: 'shadow-cyan-500/20',
                  iconColor: 'text-cyan-400',
                  value: workers.length,
                  title: 'Total Employees',
                  subtitle: 'Active workforce',
                  delay: 0.1
                },
                {
                  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                  gradient: 'from-green-500/20 to-emerald-500/20',
                  borderColor: 'border-green-500/30',
                  shadowColor: 'shadow-green-500/20',
                  iconColor: 'text-green-400',
                  value: workers.filter(w => w.status === 'Active').length,
                  title: 'Active Workers',
                  subtitle: 'Currently employed',
                  delay: 0.2
                },
                {
                  icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
                  gradient: 'from-blue-500/20 to-indigo-500/20',
                  borderColor: 'border-blue-500/30',
                  shadowColor: 'shadow-blue-500/20',
                  iconColor: 'text-blue-400',
                  value: 6,
                  title: 'UC/Ward Areas',
                  subtitle: 'Coverage zones',
                  delay: 0.3
                },
                {
                  icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                  gradient: 'from-yellow-500/20 to-orange-500/20',
                  borderColor: 'border-yellow-500/30',
                  shadowColor: 'shadow-yellow-500/20',
                  iconColor: 'text-yellow-400',
                  value: `PKR ${workers.reduce((sum, w) => sum + (w.salary || 0), 0).toLocaleString()}`,
                  title: 'Monthly Payroll',
                  subtitle: 'Total expenses',
                  delay: 0.4
                }
              ].map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: card.delay, duration: 0.5, type: "spring", bounce: 0.4 }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: `0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 0 20px ${card.shadowColor.split('-')[1]}-500/20`
                  }}
                  className={`bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border ${card.borderColor} rounded-2xl p-6 shadow-xl ${card.shadowColor} hover:shadow-2xl transition-all duration-300 cursor-default group`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-br ${card.gradient} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                      <svg className={`w-6 h-6 ${card.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                      </svg>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 bg-gradient-to-r ${card.gradient.split(' ')[1]} rounded-full animate-pulse`}></div>
                      <span className="text-xs text-slate-400 font-medium">Live</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white mb-1 group-hover:scale-105 transition-transform duration-300">{card.value}</p>
                    <p className="text-slate-300 font-semibold text-sm mb-1">{card.title}</p>
                    <p className="text-slate-500 text-xs">{card.subtitle}</p>
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-xl shadow-slate-900/50"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                  <p className="text-slate-400 text-sm">Common tasks and shortcuts</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('registration')}
                  className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-700/50 hover:from-cyan-500/10 hover:to-blue-500/10 border border-slate-600/50 hover:border-cyan-500/30 rounded-xl p-4 transition-all duration-300 text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm mb-1">Register New Employee</p>
                      <p className="text-slate-400 text-xs">Add worker to system</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('workers')}
                  className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-700/50 hover:from-blue-500/10 hover:to-indigo-500/10 border border-slate-600/50 hover:border-blue-500/30 rounded-xl p-4 transition-all duration-300 text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm mb-1">View Employee Directory</p>
                      <p className="text-slate-400 text-xs">Browse all workers</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('hr')}
                  className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-700/50 hover:from-purple-500/10 hover:to-pink-500/10 border border-slate-600/50 hover:border-purple-500/30 rounded-xl p-4 transition-all duration-300 text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm mb-1">HR Records</p>
                      <p className="text-slate-400 text-xs">Complete employee data</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <AnimatePresence>
              {workers.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl shadow-slate-900/50"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Recent Registrations</h3>
                      <p className="text-slate-400 text-sm">Latest employee additions</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {workers.slice(0, 5).map((worker, index) => (
                      <motion.div 
                        key={worker.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="group relative overflow-hidden flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 hover:from-slate-700/50 hover:to-slate-600/50 border border-slate-600/30 hover:border-slate-500/50 rounded-xl transition-all duration-300 cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm border border-cyan-400/30 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                            {worker.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm group-hover:text-cyan-300 transition-colors">{worker.full_name}</p>
                            <p className="text-slate-400 text-xs">{worker.designation} • {worker.uc_ward_name}</p>
                          </div>
                        </div>
                        <div className="relative z-10 flex items-center gap-2">
                          <span className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30 shadow-lg shadow-green-500/10">
                            {worker.status}
                          </span>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        
        {activeTab === 'registration' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center p-4"
          >
            {/* Registration Form */}
            <div className="relative z-10 w-full max-w-4xl">
              {/* Enhanced card with gradient background */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 md:p-12 shadow-2xl shadow-slate-900/50 overflow-hidden"
              >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-50"></div>
                
                {/* Header */}
                <div className="relative z-10 mb-8 pb-6 border-b border-slate-700/50">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        Worker Registration
                      </h1>
                      <p className="text-slate-400 text-sm mt-1">Fill in the details to register a new worker</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-slate-400">All systems operational</span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
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
                <div className="relative z-10 mt-8 pt-6 border-t border-slate-700/50 text-center">
                  <p className="text-slate-500 text-sm">
                    All fields marked with <span className="text-red-400 font-semibold">*</span> are required
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Employee Directory</h2>
                  <p className="text-slate-400">View and manage all registered workers - Read Only</p>
                </div>
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-xl shadow-lg shadow-blue-500/10"
              >
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-blue-400 text-sm font-medium">View Only</span>
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
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 text-center shadow-2xl shadow-slate-900/50"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-slate-700/50 to-slate-600/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-600/30">
                  <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No Workers Registered Yet</h3>
                <p className="text-slate-400 mb-8 text-lg">Start by registering your first employee to populate the directory</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('registration')}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-lg shadow-cyan-500/25"
                >
                  Register First Employee
                </motion.button>
              </motion.div>
            ) : (
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/50">
                {/* Search and Filters Bar */}
                <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search employees..."
                          className="pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm transition-all duration-200"
                        />
                      </div>
                      <select className="px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm transition-all duration-200">
                        <option value="" className="bg-slate-800">All Designations</option>
                        <option value="Sanitary Supervisor" className="bg-slate-800">Sanitary Supervisor</option>
                        <option value="Helper" className="bg-slate-800">Helper</option>
                        <option value="Sanitary Worker" className="bg-slate-800">Sanitary Worker</option>
                        <option value="Driver" className="bg-slate-800">Driver</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      <span className="text-cyan-400 text-sm font-medium">
                        {workers.length} employee{workers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 border-b border-slate-600/50">
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Designation</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">CNIC</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">DOB</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">UC/Ward</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Salary</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {workers.map((worker, index) => (
                        <motion.tr 
                          key={worker.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ 
                            backgroundColor: 'rgba(6, 182, 212, 0.05)',
                            scale: 1.01,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                          }}
                          className="group transition-all duration-200 hover:bg-slate-800/30"
                        >
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
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-white/10" 
                                title="View Details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </motion.button>
                              <span className="text-xs text-gray-500 italic ml-2">Read-only</span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 border-t border-slate-600/50 px-6 py-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-slate-400 text-xs font-medium mb-1">Total Workers</p>
                      <p className="text-2xl font-bold text-white">{workers.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs font-medium mb-1">Active</p>
                      <p className="text-2xl font-bold text-green-400">{workers.filter(w => w.status === 'Active').length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs font-medium mb-1">Total Payroll</p>
                      <p className="text-2xl font-bold text-cyan-400">
                        PKR {(workers.reduce((sum, w) => sum + (w.salary || 0), 0) / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs font-medium mb-1">Avg. Salary</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        PKR {workers.length > 0 ? (Math.round(workers.reduce((sum, w) => sum + (w.salary || 0), 0) / workers.length) / 1000).toFixed(0) : '0'}K
                      </p>
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
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">HR Records</h2>
                  <p className="text-slate-400">Complete employee records and documentation - Customizable</p>
                </div>
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl shadow-lg shadow-purple-500/10"
              >
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-purple-400 text-sm font-medium">Editable Records</span>
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
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 text-center shadow-2xl shadow-slate-900/50"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-slate-700/50 to-slate-600/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-600/30">
                  <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No HR Records Available</h3>
                <p className="text-slate-400 mb-8 text-lg">Register employees to access their complete HR documentation here</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('registration')}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-purple-500/25"
                >
                  Register Employee
                </motion.button>
              </motion.div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Father's Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">CNIC</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Designation</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">UC/Ward</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Salary</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {workers.map((worker, index) => (
                        editingWorkerId === worker.id ? (
                          // Edit Mode Row
                          <motion.tr 
                            key={worker.id}
                            initial={{ backgroundColor: 'rgba(6, 182, 212, 0)' }}
                            animate={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }}
                            transition={{ duration: 0.3 }}
                          >
                            <td colSpan="9" className="px-6 py-6">
                              <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">Editing Employee Record</h3>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveEdit(worker.id)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-all duration-200 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all duration-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Full Name */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">Full Name</label>
                                  <input
                                    type="text"
                                    value={editFormData.full_name || ''}
                                    onChange={(e) => handleEditChange(e, 'full_name')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                </div>
                                
                                {/* Father's Name */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">Father's Name</label>
                                  <input
                                    type="text"
                                    value={editFormData.father_name || ''}
                                    onChange={(e) => handleEditChange(e, 'father_name')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                </div>
                                
                                {/* CNIC */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">CNIC</label>
                                  <input
                                    type="text"
                                    value={editFormData.cnic || ''}
                                    onChange={(e) => handleEditChange(e, 'cnic')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                </div>
                                
                                {/* Phone Number */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">Phone Number</label>
                                  <input
                                    type="text"
                                    value={editFormData.phone_number || ''}
                                    onChange={(e) => handleEditChange(e, 'phone_number')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                </div>
                                
                                {/* Designation */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">Designation</label>
                                  <select
                                    value={editFormData.designation || ''}
                                    onChange={(e) => handleEditChange(e, 'designation')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  >
                                    <option value="Sanitary Supervisor" className="bg-gray-900">Sanitary Supervisor</option>
                                    <option value="Helper" className="bg-gray-900">Helper</option>
                                    <option value="Sanitary Worker" className="bg-gray-900">Sanitary Worker</option>
                                    <option value="Driver" className="bg-gray-900">Driver</option>
                                  </select>
                                </div>
                                
                                {/* UC/Ward */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">UC/Ward</label>
                                  <input
                                    type="text"
                                    value={editFormData.uc_ward_name || ''}
                                    onChange={(e) => handleEditChange(e, 'uc_ward_name')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                </div>
                                
                                {/* Salary */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">Salary (PKR)</label>
                                  <input
                                    type="number"
                                    value={editFormData.salary || ''}
                                    onChange={(e) => handleEditChange(e, 'salary')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                </div>
                                
                                {/* Status */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">Status</label>
                                  <select
                                    value={editFormData.status || 'Active'}
                                    onChange={(e) => handleEditChange(e, 'status')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  >
                                    <option value="Active" className="bg-gray-900">Active</option>
                                    <option value="Inactive" className="bg-gray-900">Inactive</option>
                                    <option value="On Leave" className="bg-gray-900">On Leave</option>
                                    <option value="Terminated" className="bg-gray-900">Terminated</option>
                                  </select>
                                </div>
                                
                                {/* Religion */}
                                <div>
                                  <label className="block text-gray-400 text-xs mb-2">Religion</label>
                                  <input
                                    type="text"
                                    value={editFormData.religion || ''}
                                    onChange={(e) => handleEditChange(e, 'religion')}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                </div>
                                
                                {/* Address */}
                                <div className="md:col-span-2 lg:col-span-3">
                                  <label className="block text-gray-400 text-xs mb-2">Address</label>
                                  <textarea
                                    value={editFormData.address || ''}
                                    onChange={(e) => handleEditChange(e, 'address')}
                                    rows="2"
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                                  />
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        ) : (
                          // View Mode Row
                          <motion.tr 
                            key={worker.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                            className="transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/5 rounded-lg flex items-center justify-center text-white font-bold text-sm border border-white/10">
                                  {worker.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{worker.full_name}</p>
                                  <p className="text-gray-400 text-xs">
                                    {worker.date_of_birth ? new Date(worker.date_of_birth).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm">{worker.father_name}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm font-mono">{worker.cnic}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm">{worker.phone_number}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm">{worker.designation}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm">{worker.uc_ward_name}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-white text-sm font-medium">PKR {worker.salary?.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                worker.status === 'Active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                worker.status === 'Inactive' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                                worker.status === 'On Leave' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {worker.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <motion.button
                                onClick={() => handleEditWorker(worker)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </motion.button>
                            </td>
                          </motion.tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Summary Stats */}
                <div className="bg-white/5 border-t border-white/10 px-6 py-4">
                  <h3 className="text-white font-semibold mb-4 text-sm">Summary Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Total Workers</p>
                      <p className="text-white text-xl font-bold">{workers.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Active</p>
                      <p className="text-green-400 text-xl font-bold">{workers.filter(w => w.status === 'Active').length}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Total Payroll</p>
                      <p className="text-white text-xl font-bold">
                        PKR {(workers.reduce((sum, w) => sum + (w.salary || 0), 0) / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Avg. Salary</p>
                      <p className="text-white text-xl font-bold">
                        PKR {workers.length > 0 ? (Math.round(workers.reduce((sum, w) => sum + (w.salary || 0), 0) / workers.length) / 1000).toFixed(0) : '0'}K
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}