import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const isWorkerManagerRoute = location.pathname === '/workers'
  const currentTab = isWorkerManagerRoute ? new URLSearchParams(location.search).get('tab') || 'dashboard' : null

  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      console.error('Sign out failed', err)
    } finally {
      setSigningOut(false)
      setUserMenuOpen(false)
    }
  }

  // Worker Manager internal tabs
  const workerManagerTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'registration', label: 'New Registration' },
    { id: 'workers', label: 'Employee Directory' },
    { id: 'hr', label: 'HR Records' },
    { id: 'terminated', label: 'Terminated' },
    { id: 'attendance', label: 'Attendance' }
  ]

  // Top-level navigation tabs
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      )
    },
    {
      id: 'workers',
      label: 'Worker Manager',
      path: '/workers?tab=dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      id: 'daily-report',
      label: 'Daily Report',
      path: '/daily-report',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ]

  return (
    <nav className="bg-[#FAFAFA]/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                EIS
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Employee Management</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {isWorkerManagerRoute ? (
              // Worker Manager internal tabs
              workerManagerTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigate(`/workers?tab=${tab.id}`)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === tab.id
                      ? 'text-white bg-slate-900 shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))
            ) : (
              // Top-level navigation
              navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 group ${
                    location.pathname === item.path
                      ? 'text-slate-900 bg-gray-100'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'
                  }`}
                >
                  <span className={location.pathname === item.path ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-2 py-1 rounded-md bg-white border border-gray-200 shadow-sm">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-600">Online</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center border border-gray-200">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-100 shadow-lg shadow-gray-200/50 p-1"
                  >
                    <div className="px-3 py-2 border-b border-gray-50 mb-1">
                      <p className="text-sm font-medium text-slate-900">Admin User</p>
                      <p className="text-xs text-slate-500">admin@eis.com</p>
                    </div>
                    <button className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-gray-50 rounded-md transition-colors">
                      Profile Settings
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-gray-50 rounded-md transition-colors">
                      System Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors mt-1"
                    >
                      {signingOut ? 'Signing out...' : 'Sign Out'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100 text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-100"
            >
              <div className="py-2 space-y-1">
                {isWorkerManagerRoute ? (
                  // Worker Manager internal tabs (mobile)
                  workerManagerTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        navigate(`/workers?tab=${tab.id}`)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        currentTab === tab.id
                          ? 'bg-gray-50 text-slate-900'
                          : 'text-slate-600 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))
                ) : (
                  // Top-level navigation (mobile)
                  navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.path)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        location.pathname === item.path
                          ? 'bg-gray-50 text-slate-900'
                          : 'text-slate-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={location.pathname === item.path ? 'text-slate-900' : 'text-slate-400'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}