import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function SidebarVehicle({ activeTab, onTabChange, className = '', darkMode = false }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const navigate = useNavigate()

    const menuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: () => <path d="M3 13h8V3H3v10zM13 21h8v-8h-8v8zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" />,
            iconType: 'fill',
        },
        {
            id: 'registration',
            label: 'New Registration',
            icon: () => <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
            iconType: 'stroke',
        },
        {
            id: 'directory',
            label: 'Vehicle Directory',
            icon: () => <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
            iconType: 'stroke',
        },
        {
            id: 'records',
            label: 'Vehicle Records',
            icon: () => <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
            iconType: 'stroke',
        },
        {
            id: 'terminated',
            label: 'Terminated',
            icon: () => <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
            iconType: 'stroke',
        },
        {
            id: 'attendance',
            label: 'Attendance',
            icon: () => <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
            iconType: 'stroke',
        },
    ]

    return (
        <motion.aside
            initial={false}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            animate={{ width: isExpanded ? 256 : 80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`border-r h-full p-4 hidden md:flex flex-col gap-6 transition-colors duration-300 relative z-30 shadow-sm hover:shadow-md will-change-[width] ${className} ${darkMode
                ? 'bg-[#111827] border-slate-800 hover:border-slate-700'
                : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
        >
            {/* Back to Dashboard Button */}
            <button
                onClick={() => navigate('/')}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${darkMode
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
            >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <AnimatePresence mode="wait">
                    {isExpanded && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="whitespace-nowrap"
                        >
                            Back to Main
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Branding */}
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 3h15v13H1z" />
                        <path d="M16 8h4l3 3v5h-7V8z" />
                        <circle cx="5.5" cy="18.5" r="2.5" />
                        <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                </div>
                <AnimatePresence mode="wait">
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                        >
                            <div className={`text-sm font-bold tracking-wide transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                VEHICLE
                            </div>
                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Manager</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Nav */}
            <nav className="flex-1">
                <ul className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => onTabChange && onTabChange(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden ${isActive
                                        ? 'text-white shadow-lg shadow-emerald-500/5'
                                        : darkMode
                                            ? 'text-slate-400 hover:text-white hover:bg-white/5'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="vehicleActiveTab"
                                            className={`absolute inset-0 border transition-all ${darkMode
                                                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]'
                                                : 'bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent shadow-md'
                                                }`}
                                            initial={false}
                                            transition={{ duration: 0.2 }}
                                            style={{ borderRadius: '0.75rem' }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-3">
                                        <svg
                                            className={`w-5 h-5 flex-shrink-0 transition-colors duration-300 ${isActive
                                                ? darkMode ? 'text-emerald-400' : 'text-white'
                                                : darkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'
                                                }`}
                                            viewBox="0 0 24 24"
                                            fill={item.iconType === 'fill' ? 'currentColor' : 'none'}
                                            stroke={item.iconType === 'stroke' ? 'currentColor' : 'none'}
                                            strokeWidth={item.iconType === 'stroke' ? (isActive ? '2' : '1.5') : undefined}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            {item.icon(isActive)}
                                        </svg>
                                        <AnimatePresence mode="wait">
                                            {isExpanded && (
                                                <motion.span
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="whitespace-nowrap"
                                                >
                                                    {item.label}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            <div className="px-1 mt-auto overflow-hidden" />
        </motion.aside>
    )
}
