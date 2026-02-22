import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import SidebarVehicle from './SidebarVehicle'
import RoundChart from './RoundChart'
import VehicleDirectory from './VehicleDirectory'
import VehicleRecords from './VehicleRecords'
import VehicleTerminated from './VehicleTerminated'
import RegistrationForm from './VehicleRegistration/RegistrationForm'
import VehicleAttendance from './VehicleRegistration/VehicleAttendance'

export default function VehicleManager() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
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

    // Directory filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState('')

    // Records filter state (separate)
    const [recordsSearchQuery, setRecordsSearchQuery] = useState('')
    const [recordsTypeFilter, setRecordsTypeFilter] = useState('')

    // Terminated filter state
    const [terminatedSearchQuery, setTerminatedSearchQuery] = useState('')

    const supabaseConfigured = Boolean(
        import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    const [searchParams, setSearchParams] = useSearchParams()

    // ── Sync active tab with ?tab= query param ─────
    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab && tab !== activeTab) {
            setActiveTab(tab)
            resetAllFilters()
        }
    }, [searchParams])

    // ── Load vehicles ──────────────────────────────
    useEffect(() => {
        loadVehicles()
    }, [])

    const loadVehicles = async () => {
        try {
            setLoading(true)
            let { data, error: fetchError } = await supabase
                .from('vehicle_registrations')
                .select('*')
                .order('sr', { ascending: true })

            if (fetchError) {
                console.warn('vehicle_registrations fetch error, falling back:', fetchError.message)
                const res = await supabase
                    .from('vehicles')
                    .select('*')
                    .order('created_at', { ascending: false })
                data = res.data
                if (res.error) console.warn('vehicles fallback error:', res.error)
            }

            setVehicles(data || [])
        } catch (err) {
            console.error('Error loading vehicles:', err)
            setError('Failed to load vehicles from database')
        } finally {
            setLoading(false)
        }
    }

    // ── Tab change ─────────────────────────────────
    const resetAllFilters = () => {
        setSearchQuery('')
        setTypeFilter('')
        setRecordsSearchQuery('')
        setRecordsTypeFilter('')
        setTerminatedSearchQuery('')
    }

    const handleTabChange = (tabId) => {
        setActiveTab(tabId)
        setSearchParams({ tab: tabId })
        resetAllFilters()
    }

    // ── Stats ──────────────────────────────────────
    const totalVehicles = useMemo(() => vehicles.length, [vehicles])
    const activeVehicles = useMemo(() => vehicles.filter(v => v.status === 'Active').length, [vehicles])
    const terminatedVehicles = useMemo(() => vehicles.filter(v => v.status === 'Terminated').length, [vehicles])

    // ── Filtered counts for badge ──────────────────
    const filteredDirectory = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        return vehicles.filter(v => {
            const matchesSearch = !q ||
                (v.vehicle_code || '').toLowerCase().includes(q) ||
                (v.owned_by || '').toLowerCase().includes(q) ||
                (v.owner_cnic || '').toLowerCase().includes(q) ||
                (v.reg_id || '').toLowerCase().includes(q) ||
                (v.reg_no || '').toLowerCase().includes(q) ||
                String(v.sr || '').toLowerCase().includes(q)
            const matchesType = !typeFilter || (v.type || '') === typeFilter
            return matchesSearch && matchesType
        })
    }, [vehicles, searchQuery, typeFilter])

    const filteredRecords = useMemo(() => {
        const q = recordsSearchQuery.toLowerCase().trim()
        return vehicles.filter(v => {
            const matchesSearch = !q ||
                (v.vehicle_code || '').toLowerCase().includes(q) ||
                (v.reg_id || '').toLowerCase().includes(q) ||
                (v.reg_no || '').toLowerCase().includes(q) ||
                (v.owned_by || '').toLowerCase().includes(q) ||
                String(v.sr || '').toLowerCase().includes(q)
            const matchesType = !recordsTypeFilter || v.type === recordsTypeFilter
            return matchesSearch && matchesType
        })
    }, [vehicles, recordsSearchQuery, recordsTypeFilter])

    const filteredTerminated = useMemo(() => {
        const q = terminatedSearchQuery.toLowerCase().trim()
        return vehicles.filter(v => {
            if (v.status !== 'Terminated') return false
            return !q ||
                (v.vehicle_code || '').toLowerCase().includes(q) ||
                (v.reg_id || '').toLowerCase().includes(q) ||
                (v.owned_by || '').toLowerCase().includes(q) ||
                String(v.sr || '').toLowerCase().includes(q)
        })
    }, [vehicles, terminatedSearchQuery])

    const currentFilterCount = () => {
        if (activeTab === 'directory') return filteredDirectory.length
        if (activeTab === 'records') return filteredRecords.length
        if (activeTab === 'terminated') return filteredTerminated.length
        return vehicles.length
    }

    const VEHICLE_TYPES = [
        'Tractor Trolley', 'Front end blade', 'Front end loader', 'Dumper truck',
        'Arm roller', 'Compactor', 'Mini tripper', 'Loader rickshaws',
        'Mechanical Washer', 'Mechanical sweeper', 'Drain cleaner',
        'Water bowser', 'Container Repair Vehicle', 'Other',
    ]

    const hasActiveFilters = () => {
        if (activeTab === 'directory') return !!(searchQuery || typeFilter)
        if (activeTab === 'records') return !!(recordsSearchQuery || recordsTypeFilter)
        if (activeTab === 'terminated') return !!terminatedSearchQuery
        return false
    }

    const clearCurrentFilters = () => {
        if (activeTab === 'directory') { setSearchQuery(''); setTypeFilter('') }
        else if (activeTab === 'records') { setRecordsSearchQuery(''); setRecordsTypeFilter('') }
        else if (activeTab === 'terminated') { setTerminatedSearchQuery('') }
    }

    // ── Page titles / subtitles ────────────────────
    const pageTitle = {
        dashboard: 'Fleet Overview',
        registration: 'New Registration',
        directory: 'Vehicle Directory',
        records: 'Vehicle Records',
        terminated: 'Terminated Vehicles',
        attendance: 'Vehicle Attendance',
    }

    const pageSubtitle = {
        dashboard: 'Real-time fleet insights and analytics',
        registration: 'Register a new vehicle into the fleet',
        directory: 'Browse registered vehicles — Read only',
        records: 'Edit vehicle data · Manage status · View history',
        terminated: 'History of decommissioned vehicles',
        attendance: 'Mark and track daily fleet attendance',
    }

    const searchPlaceholder = {
        directory: 'Search by code, owner, CNIC, Zakwan ID…',
        records: 'Search by code, owner, Zakwan ID, SR…',
        terminated: 'Search terminated vehicles…',
    }

    const getSearchValue = () => {
        if (activeTab === 'directory') return searchQuery
        if (activeTab === 'records') return recordsSearchQuery
        if (activeTab === 'terminated') return terminatedSearchQuery
        return ''
    }

    const setSearchValue = (val) => {
        if (activeTab === 'directory') setSearchQuery(val)
        else if (activeTab === 'records') setRecordsSearchQuery(val)
        else if (activeTab === 'terminated') setTerminatedSearchQuery(val)
    }

    const getTypeFilterValue = () => {
        if (activeTab === 'directory') return typeFilter
        if (activeTab === 'records') return recordsTypeFilter
        return ''
    }

    const setTypeFilterValue = (val) => {
        if (activeTab === 'directory') setTypeFilter(val)
        else if (activeTab === 'records') setRecordsTypeFilter(val)
    }

    const showTypeFilter = activeTab === 'directory' || activeTab === 'records'

    return (
        <div className={`flex h-full font-sans selection:bg-emerald-500/20 selection:text-emerald-300 overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#111827] text-slate-200' : 'bg-[#F8FAFC] text-slate-800'
            }`}>
            <SidebarVehicle activeTab={activeTab} onTabChange={handleTabChange} darkMode={darkMode} />

            <main className="flex-1 h-full overflow-y-auto relative custom-scrollbar scroll-smooth">
                {/* bg gradient overlay (dark only) */}
                {darkMode && (
                    <div className="fixed top-0 left-64 right-0 h-96 bg-gradient-to-b from-emerald-900/10 to-transparent pointer-events-none z-0" />
                )}

                <div className={`relative z-10 transition-all duration-300 ${activeTab === 'registration' ? 'p-4 md:p-6 pb-20' : 'p-6 md:p-8'
                    } max-w-[1600px] mx-auto min-h-full`}>

                    {/* ═══ Header (hidden on registration tab) ═══ */}
                    {activeTab !== 'registration' && (
                        <header className="mb-12">
                            {/* Row 1: Title + Theme Toggle */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="flex-1"
                                >
                                    <h1 className={`text-3xl font-semibold tracking-tight transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'
                                        }`}>
                                        {pageTitle[activeTab] || ''}
                                    </h1>
                                    <p className={`text-sm mt-1 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'
                                        }`}>
                                        {pageSubtitle[activeTab] || ''}
                                    </p>
                                </motion.div>

                                <div className="flex items-center gap-3">
                                    {/* Theme Toggle Removed as per request */}
                                </div>
                            </div>

                            {/* Row 2: Search + Type Filter — for directory / records / terminated tabs */}
                            {(activeTab === 'directory' || activeTab === 'records' || activeTab === 'terminated') && (
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    {/* Left: Search */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2, duration: 0.5 }}
                                        className="flex-1 flex items-center gap-3"
                                    >
                                        <div className="relative max-w-xl flex-1 group">
                                            <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/40 via-teal-500/40 to-emerald-500/40 rounded-xl blur-[2px] opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition duration-500" />
                                            <div className="relative">
                                                <svg className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}
                                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                                <input
                                                    type="text"
                                                    placeholder={searchPlaceholder[activeTab] || 'Search…'}
                                                    value={getSearchValue()}
                                                    onChange={(e) => setSearchValue(e.target.value)}
                                                    className={`w-full pl-10 pr-4 py-3 backdrop-blur-md border rounded-xl placeholder-slate-400 focus:outline-none transition-all text-sm shadow-sm ${darkMode
                                                        ? 'bg-slate-900/60 border-white/10 text-white focus:border-emerald-500/50'
                                                        : 'bg-white/80 border-emerald-100 text-slate-900 focus:border-emerald-400/50 shadow-emerald-500/5'
                                                        }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Clear filters button */}
                                        {hasActiveFilters() && (
                                            <motion.button
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                onClick={clearCurrentFilters}
                                                className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-500 transition-colors shadow-sm"
                                                title="Clear all filters"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </motion.button>
                                        )}
                                    </motion.div>

                                    {/* Right: Type Filter + Count Badge */}
                                    <div className="flex flex-col items-end gap-3">
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3, duration: 0.5 }}
                                            className="flex flex-wrap items-center justify-end gap-3"
                                        >
                                            {showTypeFilter && (
                                                <div className="relative group min-w-[180px]">
                                                    <select
                                                        value={getTypeFilterValue()}
                                                        onChange={(e) => setTypeFilterValue(e.target.value)}
                                                        className={`w-full pl-4 pr-10 py-3 backdrop-blur-md border rounded-xl text-sm transition-all cursor-pointer appearance-none shadow-sm ${darkMode
                                                            ? 'bg-slate-900/60 border-white/10 text-white focus:border-emerald-500/50'
                                                            : 'bg-white/80 border-emerald-100 text-slate-700 focus:border-emerald-400/50 shadow-emerald-500/5'
                                                            }`}
                                                    >
                                                        <option value="">All Types</option>
                                                        {VEHICLE_TYPES.map((t) => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </motion.div>

                                        {/* Count badge */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="flex items-center gap-2 px-3 py-1 bg-cyan-50/50 backdrop-blur-sm border border-cyan-100/60 rounded-lg shadow-sm"
                                        >
                                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                            <span className="text-cyan-700 text-[10px] font-bold uppercase tracking-wider">
                                                {currentFilterCount()} of {vehicles.length} vehicles
                                            </span>
                                        </motion.div>
                                    </div>
                                </div>
                            )}
                        </header>
                    )}

                    {/* ═══ Global Error / Success Toasts ═══ */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
                            >
                                <div className="w-2 h-2 rounded-full bg-red-500" />
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
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ════════════════════════════════════════
                        DASHBOARD TAB
                    ════════════════════════════════════════ */}
                    {activeTab === 'dashboard' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Stat cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <RoundChart
                                    title="Total Fleet"
                                    value={String(totalVehicles)}
                                    subtext="Vehicles"
                                    data={[{ name: 'Total', value: 100, fill: '#6366f1' }]}
                                    type="radial"
                                    darkMode={darkMode}
                                />
                                <RoundChart
                                    title="Active Fleet"
                                    value={String(activeVehicles)}
                                    subtext={`${totalVehicles > 0 ? ((activeVehicles / totalVehicles) * 100).toFixed(1) : 0}% Active`}
                                    data={[{ name: 'Active', value: totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0, fill: '#10b981' }]}
                                    type="radial"
                                    darkMode={darkMode}
                                />
                                <RoundChart
                                    title="Terminated"
                                    value={String(terminatedVehicles)}
                                    subtext="Decommissioned"
                                    data={[{ name: 'Terminated', value: totalVehicles > 0 ? (terminatedVehicles / totalVehicles) * 100 : 0, fill: '#f43f5e' }]}
                                    type="radial"
                                    darkMode={darkMode}
                                />
                                <RoundChart
                                    title="Fleet Health"
                                    value={totalVehicles > 0 ? `${((activeVehicles / totalVehicles) * 100).toFixed(0)}%` : '0%'}
                                    subtext="Operational Rate"
                                    data={
                                        activeVehicles > 0 || terminatedVehicles > 0
                                            ? [
                                                { name: 'Active', value: activeVehicles, fill: '#10b981' },
                                                { name: 'Terminated', value: terminatedVehicles, fill: '#1e293b' },
                                            ]
                                            : [{ name: 'Pending', value: 100, fill: '#64748b' }]
                                    }
                                    type="pie"
                                    darkMode={darkMode}
                                />
                            </div>

                            {/* Recent Activity Table */}
                            <section className="mt-2">
                                <div className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${darkMode
                                    ? 'bg-white/5 border-white/6'
                                    : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
                                    }`}>
                                    <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-white/6' : 'border-slate-100'
                                        }`}>
                                        <h3 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                            Recent Fleet Activities
                                        </h3>
                                        <motion.button
                                            onClick={() => handleTabChange('directory')}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className={`p-1.5 rounded-lg transition-all ${darkMode
                                                ? 'hover:bg-white/5 text-slate-400 hover:text-white'
                                                : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'
                                                }`}
                                            title="View Vehicle Directory"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </motion.button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className={`text-xs uppercase font-medium ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'
                                                }`}>
                                                <tr>
                                                    <th className="px-6 py-3 text-left">Vehicle Code</th>
                                                    <th className="px-6 py-3 text-left">Type</th>
                                                    <th className="px-6 py-3 text-left">Owner</th>
                                                    <th className="px-6 py-3 text-center">Status</th>
                                                    <th className="px-6 py-3 text-right">Registered</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-10 text-center">
                                                            <div className="flex justify-center">
                                                                <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : vehicles.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                            No vehicles registered yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    vehicles.slice(0, 6).map((v) => (
                                                        <tr key={v.id} className={`transition-colors border-b last:border-0 ${darkMode
                                                            ? 'hover:bg-white/5 border-white/5'
                                                            : 'hover:bg-slate-50 border-slate-100'
                                                            }`}>
                                                            <td className={`px-6 py-3 font-mono font-bold text-xs ${darkMode ? 'text-emerald-400' : 'text-slate-700'}`}>
                                                                {v.vehicle_code || '—'}
                                                            </td>
                                                            <td className={`px-6 py-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                {v.type || '—'}
                                                            </td>
                                                            <td className={`px-6 py-3 font-normal ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                                {v.owned_by || v.owned_by_type || '—'}
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                <span className={`inline-flex items-center justify-center w-20 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all ${v.status === 'Active'
                                                                    ? darkMode
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : v.status === 'Terminated'
                                                                        ? darkMode
                                                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                                        : darkMode
                                                                            ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                                                    }`}>
                                                                    {v.status || 'Unknown'}
                                                                </span>
                                                            </td>
                                                            <td className={`px-6 py-3 text-right font-mono text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                {v.joining_date
                                                                    ? new Date(v.joining_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: '2-digit' })
                                                                    : '—'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </motion.div>
                    )}

                    {/* ════════════════════════════════════════
                        REGISTRATION TAB
                    ════════════════════════════════════════ */}
                    {activeTab === 'registration' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="flex flex-col items-center px-4"
                        >
                            <div className="relative z-10 w-full max-w-7xl">
                                {/* Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${darkMode
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                            }`}>
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className={`text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                New Vehicle
                                            </h2>
                                            <p className={`text-sm mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Complete the fleet registration profile
                                            </p>
                                        </div>
                                    </div>

                                    {!supabaseConfigured && (
                                        <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                                                Database Offline
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Form card */}
                                <motion.div
                                    initial={{ scale: 0.98, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, duration: 0.4 }}
                                    className={`relative overflow-hidden rounded-[2rem] border transition-all duration-300 ${darkMode
                                        ? 'bg-slate-900/60 border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] backdrop-blur-2xl'
                                        : 'bg-white border-slate-200/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)]'
                                        }`}
                                >
                                    <RegistrationForm />
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* ════════════════════════════════════════
                        VEHICLE DIRECTORY TAB
                    ════════════════════════════════════════ */}
                    {activeTab === 'directory' && (
                        <motion.div
                            key="directory"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <VehicleDirectory
                                darkMode={darkMode}
                                externalSearchQuery={searchQuery}
                                externalTypeFilter={typeFilter}
                            />
                        </motion.div>
                    )}

                    {/* ════════════════════════════════════════
                        VEHICLE RECORDS TAB
                    ════════════════════════════════════════ */}
                    {activeTab === 'records' && (
                        <motion.div
                            key="records"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <VehicleRecords
                                darkMode={darkMode}
                                externalSearchQuery={recordsSearchQuery}
                                externalTypeFilter={recordsTypeFilter}
                            />
                        </motion.div>
                    )}

                    {/* ════════════════════════════════════════
                        TERMINATED TAB
                    ════════════════════════════════════════ */}
                    {activeTab === 'terminated' && (
                        <motion.div
                            key="terminated"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <VehicleTerminated
                                darkMode={darkMode}
                                externalSearchQuery={terminatedSearchQuery}
                            />
                        </motion.div>
                    )}

                    {/* ════════════════════════════════════════
                        ATTENDANCE TAB
                    ════════════════════════════════════════ */}
                    {activeTab === 'attendance' && (
                        <motion.div
                            key="attendance"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <VehicleAttendance darkMode={darkMode} />
                        </motion.div>
                    )}

                </div>
            </main>
        </div>
    )
}
