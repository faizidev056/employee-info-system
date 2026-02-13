import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
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
  const [user, setUser] = useState({ name: 'Admin User', email: 'admin@eis.com', avatar_url: null })

  // Live clock for navbar
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  useEffect(() => {
    let mounted = true
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted) return
        if (user) {
          const name = user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Admin User')
          setUser({ name, email: user.email || 'admin@eis.com', avatar_url: user.user_metadata?.avatar_url || null })
        }
      } catch {
        // ignore
      }
    }
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      if (u && mounted) {
        const name = u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : 'Admin User')
        setUser({ name, email: u.email || 'admin@eis.com', avatar_url: u.user_metadata?.avatar_url || null })
      }
      if (!u && mounted) setUser({ name: 'Admin User', email: 'admin@eis.com', avatar_url: null })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

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
      setMobileMenuOpen(false)
    }
  }

  // Suthra Punjab HR internal tabs
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
      label: 'Suthra Punjab HR',
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
    },
    {
      id: 'vehicle-registration',
      label: 'Vehicle Reg.',
      path: '/vehicle-registration',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 10-4 0 2 2 0 004 0z" />
        </svg>
      )
    }
  ]

  return (
    <nav className="bg-white/70 backdrop-blur-2xl border-b border-white/60 sticky top-0 z-50 shadow-lg shadow-indigo-100/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => { navigate('/'); setMobileMenuOpen(false); setUserMenuOpen(false); }}
              className="flex items-center focus:outline-none"
              aria-label="Go to dashboard"
              title="Go to dashboard"
            >
              <div className="h-12 w-[120px] md:w-[160px] flex items-center justify-start cursor-pointer">
                <img
                  src="/Zakwan-Builders-Logo-300x147.png"
                  alt="Zakwan Builders logo"
                  className="h-8 md:h-10 w-auto object-contain"
                  loading="lazy"
                  role="img"
                  aria-hidden="false"
                />
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {isWorkerManagerRoute ? (
              // Suthra Punjab HR internal tabs
              workerManagerTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigate(`/workers?tab=${tab.id}`)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${currentTab === tab.id
                    ? 'text-white bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md shadow-blue-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm'
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
                  className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 group ${location.pathname === item.path
                    ? 'text-white bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md shadow-blue-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm'
                    }`}
                >
                  <span className={location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-white/90 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/60 shadow-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
              <span className="text-xs font-semibold text-slate-700">Online</span>
            </div>

            <div className="text-xs font-mono text-slate-600 px-2" aria-live="polite">{timeString}</div>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                title={`${user.name} — ${user.email}`}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-xl hover:bg-white/60 transition-all hover:shadow-sm"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-md overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
                      {(() => {
                        const parts = (user.name || '').split(' ').filter(Boolean)
                        return (parts.length === 0 ? 'AU' : (parts.length === 1 ? parts[0].slice(0, 2) : (parts[0][0] + parts[1][0]))).toUpperCase()
                      })()}
                    </div>
                  )}
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-2xl shadow-indigo-100/20 p-2 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/50 mb-1">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50/80 rounded-xl transition-all mt-1 flex items-center space-x-2 group"
                    >
                      {signingOut ? (
                        <svg className="w-4 h-4 text-red-600 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                          <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                        </svg>
                      )}
                      <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl hover:bg-white/60 text-slate-600 hover:text-slate-900 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/40 bg-white/40 backdrop-blur-xl rounded-b-2xl -mx-4 px-4">
              <div className="py-2 space-y-1">
                {isWorkerManagerRoute ? (
                  // Suthra Punjab HR internal tabs (mobile)
                  workerManagerTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        navigate(`/workers?tab=${tab.id}`)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${currentTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-white/60'
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
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${location.pathname === item.path
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-white/60'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={location.pathname === item.path ? 'text-white' : 'text-slate-400'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-white/90 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Mobile user block */}
              <div className="border-t border-white/40 px-4 py-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-md overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
                          {(() => {
                            const parts = (user.name || '').split(' ').filter(Boolean)
                            return (parts.length === 0 ? 'AU' : (parts.length === 1 ? parts[0].slice(0, 2) : (parts[0][0] + parts[1][0]))).toUpperCase()
                          })()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{timeString}</div>
                    </div>
                  </div>
                  <div>
                    <button onClick={handleSignOut} disabled={signingOut} className="px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      {signingOut ? (
                        <svg className="w-4 h-4 text-red-600 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                          <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      ) : (
                        'Sign Out'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}