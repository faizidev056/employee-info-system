import { useState } from 'react'

export default function WorkerForm() {
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
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
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

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validateForm()) {
      console.log('Form submitted:', formData)
      
      // Get attendance point for selected UC/Ward
      const selectedUC = ucWardOptions.find(uc => uc.id === parseInt(formData.ucWard))
      console.log('Assigned Attendance Point:', selectedUC?.attendancePoint)
      
      alert('Worker registered successfully!')
      
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
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center p-4">
      {/* Simulated Particles Background - Using Tailwind Only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large glowing orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl animate-drift"></div>
        
        {/* Small particle dots */}
        <div className="absolute top-10 left-1/4 w-2 h-2 bg-cyan-400/40 rounded-full blur-sm animate-pulse-glow"></div>
        <div className="absolute top-32 right-1/4 w-1.5 h-1.5 bg-blue-300/50 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-cyan-300/60 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-blue-400/40 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-1/4 right-20 w-1.5 h-1.5 bg-cyan-400/50 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-2/3 left-20 w-1 h-1 bg-blue-300/40 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute top-20 right-1/2 w-2 h-2 bg-cyan-500/30 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '3s'}}></div>
        <div className="absolute bottom-20 left-1/2 w-1.5 h-1.5 bg-blue-400/50 rounded-full blur-sm animate-pulse-glow" style={{animationDelay: '3.5s'}}></div>
      </div>

      {/* Main Form Card - Glassmorphism */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Glow effect behind card */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl"></div>
        
        {/* Glass card */}
        <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              Worker Registration
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 mx-auto rounded-full shadow-lg shadow-cyan-500/50"></div>
            <p className="text-gray-400 mt-4 text-sm md:text-base">Fill in the details to register a new worker</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h2 className="text-cyan-400 text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
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
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-black"
              >
                Register Worker
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
  )
}
