import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showSplash, setShowSplash] = useState(true);

    // Reset splash whenever the location key changes (navigating to dashboard)
    useEffect(() => {
        setShowSplash(true);
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 3200);
        return () => clearTimeout(timer);
    }, [location.key]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const dashboardCards = [
        {
            id: 'hr',
            title: 'Suthra Punjab HR',
            color: 'blue',
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
            path: '/workers?tab=dashboard',
            label: 'Open Suthra Punjab HR'
        },
        {
            id: 'report',
            title: 'Daily Report',
            color: 'emerald',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            path: '/daily-report',
            label: 'View Reports'
        },
        {
            id: 'fleet',
            title: 'Vehicle Registration',
            color: 'indigo',
            icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
            path: '/vehicle-registration',
            label: 'Manage Fleet'
        },
        {
            id: 'private',
            title: 'Private HR',
            color: 'rose',
            icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
            path: '/private-hr',
            label: 'Access Private'
        }
    ];

    return (
        <div className="relative h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
            <AnimatePresence>
                {showSplash && (
                    <motion.div
                        key="splash"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                        className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
                    >
                        {/* Decorative Background */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-[120px] animate-pulse"></div>
                            <div className="absolute bottom-0 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                        </motion.div>

                        {/* Background Text Marquee */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 overflow-hidden">
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: '-100%' }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="whitespace-nowrap flex"
                            >
                                <h2 className="text-[25vh] font-black text-transparent stroke-text uppercase tracking-tighter px-4">
                                    Suthra Punjab • Suthra Punjab • Suthra Punjab • Suthra Punjab
                                </h2>
                            </motion.div>
                        </div>

                        {/* Central Content Reveal */}
                        <div className="relative flex flex-col items-center justify-center z-20">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
                                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className="relative z-10 text-center"
                            >
                                <h1 className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 uppercase tracking-tighter drop-shadow-[0_0_60px_rgba(16,185,129,0.4)]">
                                    Suthra Punjab
                                </h1>
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-emerald-400 font-bold tracking-[1.2em] uppercase text-[10px] md:text-xs mt-8 opacity-80"
                                >
                                    Government of Punjab
                                </motion.p>
                            </motion.div>

                            {/* Phase 2: Staggered Icon Reveal - Optimized Positioning */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {dashboardCards.map((item, i) => {
                                    // Use explicit directional offsets
                                    const directionX = i % 2 === 0 ? -1 : 1;
                                    const directionY = i < 2 ? -1 : 1;

                                    // Increased spacing to avoid text overlap
                                    const offsetX = directionX * (window.innerWidth < 1024 ? 180 : 380);
                                    const offsetY = directionY * (window.innerWidth < 1024 ? 120 : 200);

                                    return (
                                        <motion.div
                                            key={item.id}
                                            layoutId={`icon-${item.id}`}
                                            initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                                            animate={{
                                                scale: 1.3, // Slightly larger during marquee for "bold" impact
                                                opacity: 1,
                                                x: offsetX,
                                                y: offsetY
                                            }}
                                            transition={{
                                                delay: 1.2 + (i * 0.1),
                                                type: "spring",
                                                stiffness: 70,
                                                damping: 14
                                            }}
                                            className="absolute w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-slate-800/90 border-2 border-white/30 flex items-center justify-center backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.6)] z-50"
                                            style={{
                                                boxShadow: `0 0 50px -5px var(--glow-color)`,
                                                '--glow-color': item.color === 'blue' ? 'rgba(59, 130, 246, 0.6)' :
                                                    item.color === 'emerald' ? 'rgba(16, 185, 129, 0.6)' :
                                                        item.color === 'indigo' ? 'rgba(99, 102, 241, 0.6)' :
                                                            'rgba(244, 63, 94, 0.6)'
                                            }}
                                        >
                                            <svg className={`w-12 h-12 md:w-14 md:h-14 text-${item.color}-400 drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                            </svg>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="absolute bottom-12 z-30">
                            <div className="px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-emerald-400 text-[10px] font-bold tracking-[0.5em] uppercase">Zakwan Builders • PITB Secure System</span>
                            </div>
                        </motion.div>

                        <style>{`
                            .stroke-text {
                                -webkit-text-stroke: 2px rgba(16, 185, 129, 0.15);
                            }
                            .border-gradient {
                                border-image: linear-gradient(to bottom right, rgba(255,255,255,0.3), rgba(255,255,255,0.05)) 1;
                            }
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backround Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-40 -right-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showSplash ? 0 : 1 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 container mx-auto px-4 py-12"
            >

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? -20 : 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">
                        Suthra <span className="text-emerald-600">Punjab</span>
                    </h1>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">
                        Unified Employee Information & Fleet Management System
                    </p>
                    <div className="h-1.5 w-32 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto mt-6 rounded-full"></div>
                </motion.div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                    {dashboardCards.map((card, i) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{
                                opacity: showSplash ? 0 : 1,
                                y: showSplash ? 50 : 0,
                                scale: showSplash ? 0.9 : 1
                            }}
                            transition={{ delay: 0.4 + (i * 0.1), type: "spring", stiffness: 100 }}
                            className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full transform hover:-translate-y-1"
                        >
                            <div className={`h-2 bg-gradient-to-r ${card.color === 'blue' ? 'from-blue-400 to-blue-600' :
                                card.color === 'emerald' ? 'from-emerald-400 to-emerald-600' :
                                    card.color === 'indigo' ? 'from-indigo-400 to-indigo-600' :
                                        'from-rose-400 to-rose-600'
                                }`}></div>
                            <div className="p-8 flex flex-col flex-grow">
                                <motion.div
                                    layoutId={`icon-${card.id}`}
                                    className={`w-14 h-14 bg-${card.color}-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                                >
                                    <svg className={`w-8 h-8 text-${card.color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                                    </svg>
                                </motion.div>
                                <h2 className={`text-xl font-bold text-gray-900 mb-3 group-hover:text-${card.color}-600 transition-colors`}>{card.title}</h2>
                                <div className="flex-grow" />
                                <button
                                    onClick={() => navigate(card.path)}
                                    className={`w-full py-3 px-4 bg-white border-2 border-${card.color}-100 text-${card.color}-600 font-semibold rounded-xl hover:bg-${card.color}-50 hover:border-${card.color}-200 transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-md`}
                                >
                                    <span>{card.label}</span>
                                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Sign Out Section */}
                <div className="mt-16 text-center">
                    <button
                        onClick={handleSignOut}
                        className="px-8 py-3 text-sm font-semibold text-slate-500 hover:text-red-600 bg-white/50 hover:bg-white rounded-full border border-gray-200 hover:border-red-200 transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2 mx-auto"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                    <p className="mt-4 text-xs text-gray-400">Logged in via Secure Session</p>
                </div>
            </motion.div>

            <style>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
};

export default Home;
