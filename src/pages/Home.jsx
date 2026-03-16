import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UsersIcon,
    DocumentChartBarIcon,
    TruckIcon,
    LockClosedIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showSplash, setShowSplash] = useState(true);
    const [hoveredId, setHoveredId] = useState(null);
    const [darkMode, setDarkMode] = useState(() =>
        document.documentElement.classList.contains('dark')
    );

    // Sync with global dark mode toggle
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

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
            color: 'emerald',
            icon: UsersIcon,
            path: '/workers?tab=dashboard',
            gradient: 'from-emerald-500 to-teal-500',
            glow: 'rgba(16, 185, 129, 0.5)'
        },
        {
            id: 'report',
            title: 'Daily Report',
            color: 'emerald',
            icon: DocumentChartBarIcon,
            path: '/daily-report',
            gradient: 'from-emerald-500 to-teal-500',
            glow: 'rgba(16, 185, 129, 0.5)'
        },
        {
            id: 'fleet',
            title: 'Vehicle Registration',
            color: 'emerald',
            icon: TruckIcon,
            path: '/vehicle-registration',
            gradient: 'from-emerald-500 to-teal-500',
            glow: 'rgba(16, 185, 129, 0.5)'
        },
        {
            id: 'private',
            title: 'Private HR',
            color: 'emerald',
            icon: LockClosedIcon,
            path: '/private-hr',
            gradient: 'from-emerald-500 to-teal-500',
            glow: 'rgba(16, 185, 129, 0.5)'
        }
    ];

    return (
        <div className={`relative h-full overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#0d1117]' : 'bg-[#F0FDF4]'}`}>
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
                                            <item.icon className={`w-12 h-12 md:w-14 md:h-14 text-${item.color}-400 drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]`} />
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
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Minimal Background Aesthetic */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Subtle Grain only for texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] brightness-0 contrast-100"></div>
            </div>

            {/* Main Content (Static Dashboard) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showSplash ? 0 : 1 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 h-full flex flex-col items-center justify-center px-4"
            >
                {/* Static Header resembling Marquee center */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? -20 : 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-16 flex flex-col items-center relative"
                >
                    {/* Reinvented Lamp Effect */}
                    <div className="reinvented-lamp-container animate-lamp-flicker">
                        <div className="lamp-atmospheric-glow"></div>
                        <div className="lamp-volume-glow"></div>
                        <div className="lamp-portal-beam"></div>
                        <div className="lamp-core-line"></div>
                    </div>

                    <h2 className={`font-bold tracking-[0.8em] uppercase text-[10px] mb-4 transition-colors duration-300 relative z-10 ${darkMode ? 'text-emerald-400/60' : 'text-emerald-800/40'}`}>
                        Tehsil Haroonabad
                    </h2>
                    <h1 className={`text-4xl md:text-7xl font-black mb-6 tracking-tighter uppercase italic transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Suthra <span className="text-emerald-500">Punjab</span>
                    </h1>
                    <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mx-auto"></div>
                </motion.div>

                {/* Aesthetic Icon Grid */}
                <div className="flex flex-wrap justify-center gap-12 md:gap-24 max-w-6xl mx-auto items-center">
                    {dashboardCards.map((card, i) => (
                        <div key={card.id} className="relative flex flex-col items-center">
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5 }}
                                layoutId={`icon-${card.id}`}
                                animate={{
                                    opacity: showSplash ? 0 : 1,
                                    scale: showSplash ? 0.5 : 1
                                }}
                                transition={{
                                    delay: 0.4 + (i * 0.1),
                                    type: "spring",
                                    stiffness: 150,
                                    damping: 15
                                }}
                                onMouseEnter={() => setHoveredId(card.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => navigate(card.path)}
                                className={`
                                    group relative w-32 h-32 md:w-40 md:h-40 
                                    rounded-full flex items-center justify-center 
                                    transition-all duration-300 ease-in-out
                                    ${darkMode ? 'bg-white/5' : 'bg-white/40'}
                                `}
                            >
                                {/* Persistent Orbital Ring Hover Effect */}
                                <div className="orbital-ring-base"></div>
                                <div className="orbital-ring-ghost"></div>

                                <card.icon className={`
                                    w-12 h-12 md:w-16 md:h-16 
                                    transition-all duration-500 dashboard-icon
                                    ${darkMode ? 'text-white/40' : 'text-slate-400'}
                                `} />

                                {/* Tooltip Revealed on Hover */}
                                <AnimatePresence>
                                    {hoveredId === card.id && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, filter: 'blur(10px)', scale: 0.9 }}
                                            animate={{ opacity: 1, y: -90, filter: 'blur(0px)', scale: 1 }}
                                            exit={{ opacity: 0, y: 0, filter: 'blur(10px)', scale: 0.9 }}
                                            className="absolute pointer-events-none whitespace-nowrap z-50 px-6 py-3 rounded-2xl bg-slate-900 border border-white/20 text-white font-bold text-xs tracking-[0.2em] uppercase shadow-2xl"
                                        >
                                            {card.title}
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-white/20 rotate-45"></div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            {/* Static Code Label */}
                            <span className={`mt-8 text-[10px] font-bold tracking-[0.5em] uppercase transition-colors duration-300 ${darkMode ? 'text-emerald-400/30' : 'text-emerald-900/30'}`}>
                                {card.id}
                            </span>
                        </div>
                    ))}
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
