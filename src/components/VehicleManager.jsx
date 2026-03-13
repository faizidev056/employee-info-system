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

import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, PieChart, Pie } from 'recharts'

// ── CUSTOM DASHBOARD COMPONENTS (REFERENCING PROVIDED UI) ───────

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
    const percentage = ((count / total) * 100).toFixed(1)
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
                    <span className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Units</span>
                </div>
            </div>
        )
    }
    return null
}

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

    // new registrations metric for dashboard
    const newRegistrationsThisMonth = useMemo(() => {
        const now = new Date()
        return vehicles.filter(v => {
            if (!v.joining_date) return false
            const d = new Date(v.joining_date)
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        }).length
    }, [vehicles])

    // deployed vehicles grouped by type (active only) - enhanced for chart
    const deployedByType = useMemo(() => {
        const activeVehs = vehicles.filter(v => v.status === 'Active')
        const counts = activeVehs.reduce((acc, v) => {
            const type = v.type || 'Unclassified'
            acc[type] = (acc[type] || 0) + 1
            return acc
        }, {})

        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
            '#10b981', '#06b6d4', '#3b82f6', '#4f46e5', '#7c3aed'
        ]

        return Object.entries(counts)
            .map(([type, count], index) => ({
                name: type,
                value: count,
                fill: colors[index % colors.length]
            }))
            .sort((a, b) => b.value - a.value)
    }, [vehicles])

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
        dashboard: '',
        registration: 'Register a new vehicle into the fleet',
        directory: '',
        records: '',
        terminated: '',
        attendance: '',
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
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                            className="space-y-8"
                        >
                            {/* ─── OVERVIEW HEADER ─── */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h2 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Overview</h2>
                                <div className="flex items-center gap-3">
                                    <div className={`flex p-1 rounded-xl items-center ${darkMode ? 'bg-slate-900 border border-white/5' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
                                        {['Weekly', 'Monthly', 'Yearly'].map(tab => (
                                            <button
                                                key={tab}
                                                className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${tab === 'Weekly'
                                                    ? (darkMode ? 'bg-slate-800 text-white shadow-lg shadow-black/20' : 'bg-slate-50 text-slate-900 shadow-sm')
                                                    : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                                                    }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                    <button className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[11px] font-bold transition-all ${darkMode ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white' : 'bg-white border-slate-200/60 text-slate-600 hover:text-slate-900 shadow-sm hover:shadow-md'}`}>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                                        Filter
                                    </button>
                                </div>
                            </div>

                            {/* ─── TOP STAT ROW ─── */}
                            <div className={`rounded-2xl border overflow-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl shadow-black/40' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/10'}`}>
                                <ModernStatCard
                                    label="Total Fleet"
                                    value={totalVehicles}
                                    trend="2.5"
                                    trendType="up"
                                    darkMode={darkMode}
                                />
                                <ModernStatCard
                                    label="Active Units"
                                    value={activeVehicles}
                                    trend="9.5"
                                    trendType="up"
                                    darkMode={darkMode}
                                />
                                <ModernStatCard
                                    label="Terminated"
                                    value={terminatedVehicles}
                                    trend="1.6"
                                    trendType="down"
                                    darkMode={darkMode}
                                />
                                <ModernStatCard
                                    label="New Registrations"
                                    value={newRegistrationsThisMonth}
                                    darkMode={darkMode}
                                />
                            </div>

                            {/* ─── MAIN CONTENT ─── */}
                            <div className="space-y-8">
                                <div className={`rounded-3xl border overflow-hidden transition-all duration-500 flex flex-col ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/10'}`}>
                                    <div className="p-6 pb-2 flex items-center justify-between">
                                        <div>
                                            <h3 className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Fleet Intelligence</h3>
                                            <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Active Deployment Mix</p>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-2 ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                            <span className="text-[9px] font-black uppercase tracking-tighter">Live: {activeVehicles} Units</span>
                                        </div>
                                    </div>

                                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                        {/* Graph Section */}
                                        <div className="md:col-span-5 relative flex items-center justify-center">
                                            <div className="h-[220px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={deployedByType}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={85}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                            stroke="none"
                                                            animationBegin={0}
                                                            animationDuration={1200}
                                                        >
                                                            {deployedByType.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CategoryTooltip darkMode={darkMode} />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                                                <span className={`text-xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{deployedByType[0]?.value || 0}</span>
                                                <span className={`text-[8px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{deployedByType[0]?.name.split(' ')[0] || 'Top'}</span>
                                            </div>
                                        </div>

                                        {/* Analysis Section */}
                                        <div className="md:col-span-7 flex flex-col h-full justify-center">
                                            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-white/5 border border-white/5' : 'bg-slate-50/50 border border-slate-100'}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className={`text-[9px] font-black uppercase tracking-[0.15em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Composition Analysis</h4>
                                                </div>
                                                <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                                                    {deployedByType.map((item, i) => (
                                                        <CategoryMixItem
                                                            key={item.name}
                                                            label={item.name}
                                                            count={item.value}
                                                            total={activeVehicles}
                                                            color={item.fill}
                                                            darkMode={darkMode}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between px-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                                    </div>
                                                    <div>
                                                        <p className={`text-[8px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Primary Category</p>
                                                        <h5 className={`text-[11px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{deployedByType[0]?.name || 'N/A'}</h5>
                                                    </div>
                                                </div>
                                                <button onClick={() => setActiveTab('directory')} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BREAKDOWN CHART */}
                                <div className={`p-8 rounded-2xl border transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl shadow-black/40' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/10'}`}>
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className={`text-sm font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Fleet Breakdown</h3>
                                        <button className={`${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-6 mb-10 overflow-x-auto no-scrollbar">
                                        {['Heavy', 'Transport', 'Logistics', 'Backup'].map((label, i) => (
                                            <div key={label} className="flex items-center gap-2 flex-shrink-0">
                                                <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-indigo-600' : i === 1 ? 'bg-indigo-400' : i === 2 ? 'bg-sky-400' : 'bg-indigo-100'}`} />
                                                <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={[
                                                { name: 'Mon', h: 12000, t: 8000, l: 5000, b: 2000 },
                                                { name: 'Tue', h: 10000, t: 7000, l: 4000, b: 1500 },
                                                { name: 'Wed', h: 15000, t: 9000, l: 6000, b: 3000 },
                                                { name: 'Thu', h: 11000, t: 8500, l: 5500, b: 2500 },
                                                { name: 'Fri', h: 14000, t: 10000, l: 7000, b: 3500 },
                                                { name: 'Sat', h: 9000, t: 6000, l: 3000, b: 1000 },
                                                { name: 'Sun', h: 13000, t: 9500, l: 6500, b: 2800 },
                                            ]}>
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: darkMode ? '#475569' : '#94a3b8' }} dy={10} />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{
                                                        backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                        fontSize: '11px',
                                                        fontWeight: '700'
                                                    }}
                                                />
                                                <Bar dataKey="h" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} barSize={40} />
                                                <Bar dataKey="t" stackId="a" fill="#6366f1" />
                                                <Bar dataKey="l" stackId="a" fill="#38bdf8" />
                                                <Bar dataKey="b" stackId="a" fill={darkMode ? '#1e293b' : '#f1f5f9'} radius={[8, 8, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* PRESERVED: RECENT ACTIVITIES */}
                            <section>
                                <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl' : 'bg-white border-slate-200/60 shadow-xl shadow-slate-200/5'}`}>
                                    <div className="px-8 py-6 border-b border-transparent flex items-center justify-between">
                                        <h3 className={`text-sm font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent Fleet Activities</h3>
                                        <button onClick={() => handleTabChange('directory')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'}`}>Full Log</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                                            <thead>
                                                <tr className={`${darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                                                    <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Vehicle Code</th>
                                                    <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Type</th>
                                                    <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Status</th>
                                                    <th className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Registered</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                                                {vehicles.slice(0, 5).map(v => (
                                                    <tr key={v.id} className={`group transition-all ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50/80'}`}>
                                                        <td className={`px-8 py-4 font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>{v.vehicle_code}</td>
                                                        <td className={`px-8 py-4 text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{v.type}</td>
                                                        <td className="px-8 py-4">
                                                            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${v.status === 'Active' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                                                <span className={`w-1 h-1 rounded-full ${v.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                {v.status}
                                                            </div>
                                                        </td>
                                                        <td className={`px-8 py-4 text-right text-[11px] font-bold tabular-nums ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{v.joining_date ? new Date(v.joining_date).toLocaleDateString() : '—'}</td>
                                                    </tr>
                                                ))}
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

                                        </div>
                                    </div>


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
