import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RegistrationForm from './VehicleRegistration/RegistrationForm';
import VehicleAttendance from './VehicleRegistration/VehicleAttendance';
import VehicleDirectory from './VehicleDirectory';
import VehicleRecords from './VehicleRecords';
import VehicleTerminated from './VehicleTerminated';

export default function VehicleRegistration() {
    const [activeTab, setActiveTab] = useState('registration');

    const tabs = [
        { id: 'registration', label: 'Registration Form', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { id: 'attendance', label: 'Attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
        { id: 'directory', label: 'Vehicle Directory', icon: 'M3 13l2-2m0 0l7-7 7 7M13 21V9' },
        { id: 'records', label: 'Vehicle Records', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { id: 'terminated', label: 'Terminated Vehicles', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857' },
        { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    ];

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white overflow-hidden font-sans text-slate-900 relative">
            {/* Animated Background Blobs */}
            <div className="fixed top-0 -left-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none z-0"></div>
            <div className="fixed top-40 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
            <div className="fixed -bottom-8 left-20 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 pointer-events-none z-0"></div>

            {/* Sidebar / Vertical Tabs */}
            <div className="w-64 bg-white/40 backdrop-blur-xl border-r border-white/60 flex-shrink-0 flex flex-col z-20 shadow-lg relative">
                <div className="p-6 border-b border-white/40">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Vehicle Manager
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Fleet Registration & Tracking</p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                                }`}
                        >
                            <svg className={`w-5 h-5 flex-shrink-0 transition-colors ${activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                            </svg>
                            <span className="font-medium text-sm relative z-10">{tab.label}</span>

                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl -z-0"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header Bar */}
                <div className="h-16 bg-white/40 backdrop-blur-xl border-b border-white/50 flex items-center justify-between px-8 z-10 sticky top-0 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                    </div>
                </div>

                {/* Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-0">
                    <div className="max-w-5xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'dashboard' && (
                                    <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-12 text-center shadow-lg">
                                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">Dashboard Coming Soon</h3>
                                        <p className="text-slate-500">Overview statistics will be displayed here.</p>
                                    </div>
                                )}
                                {activeTab === 'registration' && <RegistrationForm />}
                                {activeTab === 'attendance' && <VehicleAttendance />}
                                {activeTab === 'directory' && <VehicleDirectory />}
                                {activeTab === 'records' && <VehicleRecords />}
                                {activeTab === 'terminated' && <VehicleTerminated />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
