import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';

const formatToHMS = (decimal) => {
    if (decimal === undefined || decimal === null || decimal === '' || isNaN(parseFloat(decimal))) return '00:00:00';
    const totalSeconds = Math.round(parseFloat(decimal) * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const VehicleRow = ({ v, idx, darkMode, focusDay, attendance, toggleCell, daysInMonth, timeLabel }) => {
    const focusData = attendance[v.id]?.[focusDay] || { status: 'A', mileage: null, ignition_time: null };

    return (
        <tr className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-indigo-50/20'} transition-all group`}>
            {/* STICKY LEFT CELLS */}
            <td className={`p-4 sticky left-0 z-10 font-bold text-center border-r border-b transition-colors ${darkMode ? 'bg-[#0a0f18] text-slate-700 border-white/5' : 'bg-white text-slate-300 border-slate-100'}`}>{idx + 1}</td>
            <td className={`p-4 sticky left-[2.5rem] z-10 border-r border-b transition-colors font-black ${darkMode ? 'bg-[#0a0f18] text-indigo-400 border-white/5' : 'bg-white text-indigo-600 border-slate-100'}`}>{v.vehicle_code}</td>
            <td className={`p-4 sticky left-[9.5rem] z-10 border-r border-b transition-colors ${darkMode ? 'bg-[#0a0f18] text-slate-500 border-white/5' : 'bg-white text-slate-500 border-slate-100'}`}>
                <span className="text-[9px] font-black uppercase">{v.type}</span>
            </td>

            {/* DATA COLUMNS (FOCUS DAY - STICKY) */}
            <td className={`p-4 text-center sticky left-[17.5rem] z-10 border-r border-b font-mono font-bold transition-colors ${darkMode ? 'bg-[#0a0f18] border-white/5 ' + (focusData.mileage ? 'text-slate-300' : 'text-slate-300 opacity-30') : 'bg-white border-slate-100 ' + (focusData.mileage ? 'text-slate-900' : 'text-slate-300 opacity-30')}`}>
                {timeLabel.includes('Work') ? '—' : (focusData.mileage || '0.00')}
            </td>
            <td className={`p-4 text-center sticky left-[22.5rem] z-10 border-r border-b font-mono shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] transition-colors ${darkMode ? 'bg-[#0a0f18] border-white/5 ' + (focusData.ignition_time ? 'text-slate-300' : 'text-slate-300 opacity-30') : 'bg-white border-slate-100 ' + (focusData.ignition_time ? 'text-slate-900' : 'text-slate-300 opacity-30')}`}>
                {formatToHMS(focusData.ignition_time)}
                <div className="text-[7px] opacity-40 font-bold uppercase mt-0.5 tracking-tighter">
                    {timeLabel.includes('Work') ? 'Working Hours' : 'Ig Time'}
                </div>
            </td>

            {/* MONTHLY GRID CELLS */}
            {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayData = attendance[v.id]?.[day] || { status: 'A' };
                const isFocus = day === focusDay;

                return (
                    <td key={i} className={`p-1 text-center border-l border-b border-transparent transition-all ${isFocus ? (darkMode ? 'bg-indigo-500/5' : 'bg-indigo-50/30') : ''}`}>
                        <motion.button
                            whileHover={{ scale: 1.15, zIndex: 10 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleCell(v.id, day)}
                            className={`w-7 h-7 rounded-lg text-[9px] font-black transition-all shadow-sm flex items-center justify-center ${dayData.status === 'P'
                                ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                                : darkMode ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-300 border border-rose-100 hover:border-rose-300'}`}
                        >
                            {dayData.status}
                        </motion.button>
                    </td>
                );
            })}
        </tr>
    );
};

const VehicleAttendance = ({ darkMode }) => {
    const [vehicles, setVehicles] = useState([]);
    const [attendance, setAttendance] = useState({}); // { vehicleId: { day: { status, mileage, igTime } } }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Date states
    const [month, setMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Focus day (for the detail columns like Mileage/Ignition)
    // Defaults to today if the month matches, else day 1
    const [focusDay, setFocusDay] = useState(() => {
        const now = new Date();
        return now.getDate();
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [statusModal, setStatusModal] = useState({ show: false, message: '', type: 'loading' });

    // Constants for lookup
    const STATUS_MAP = { 'Present': 'P', 'Absent': 'A' };
    const INV_STATUS_MAP = { 'P': 'Present', 'A': 'Absent' };

    const daysInMonth = useMemo(() => {
        const [year, monthNum] = month.split('-').map(Number);
        return new Date(year, monthNum, 0).getDate();
    }, [month]);

    const vehicleGroups = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const filtered = vehicles.filter(v =>
            v.vehicle_code?.toLowerCase().includes(q) ||
            v.reg_no?.toLowerCase().includes(q) ||
            v.reg_id?.toLowerCase().includes(q) ||
            v.owned_by?.toLowerCase().includes(q) ||
            v.type?.toLowerCase().includes(q)
        );

        const heavyMachinery = [];
        const standardFleet = [];

        filtered.forEach(v => {
            const type = (v.type || '').toLowerCase();
            if (type.includes('blade') || type.includes('loader')) {
                heavyMachinery.push(v);
            } else {
                standardFleet.push(v);
            }
        });

        return { heavyMachinery, standardFleet };
    }, [vehicles, searchQuery]);

    useEffect(() => {
        loadData();
    }, [month]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Load active vehicles
            const { data: vehData, error: vehError } = await supabase
                .from('vehicle_registrations')
                .select('*')
                .eq('status', 'Active')
                .order('sr', { ascending: true });

            if (vehError) throw vehError;
            setVehicles(vehData || []);

            // 2. Load attendance for the month
            const [year, monthNum] = month.split('-');
            const startDate = `${year}-${monthNum}-01`;
            const endDate = `${year}-${monthNum}-${daysInMonth}`;

            const { data: attData, error: attError } = await supabase
                .from('vehicle_attendance')
                .select('*')
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate);

            if (attError) throw attError;

            // 3. Map attendance data
            const attMap = {};
            attData?.forEach(record => {
                const day = parseInt(record.attendance_date.split('-')[2]);
                if (!attMap[record.vehicle_id]) attMap[record.vehicle_id] = {};
                attMap[record.vehicle_id][day] = {
                    status: STATUS_MAP[record.status] || 'A',
                    mileage: record.mileage,
                    ignition_time: record.ignition_time
                };
            });
            setAttendance(attMap);

        } catch (err) {
            console.error('Error loading vehicle attendance:', err);
            setStatusModal({ show: true, message: 'Failed to synchronize with fleet records', type: 'error' });
            setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 3000);
        } finally {
            setLoading(false);
        }
    };

    const toggleCell = (vehicleId, day) => {
        const currentData = attendance[vehicleId]?.[day] || { status: 'A' };
        const nextStatus = currentData.status === 'P' ? 'A' : 'P';

        setAttendance(prev => ({
            ...prev,
            [vehicleId]: {
                ...(prev[vehicleId] || {}),
                [day]: {
                    ...currentData,
                    status: nextStatus
                }
            }
        }));
    };

    const saveAttendance = async () => {
        try {
            setSaving(true);
            setStatusModal({ show: true, message: 'Storing monthly archives...', type: 'loading' });

            const upserts = [];
            const [year, monthNum] = month.split('-');

            Object.entries(attendance).forEach(([vId, days]) => {
                Object.entries(days).forEach(([day, data]) => {
                    const dateStr = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
                    upserts.push({
                        vehicle_id: parseInt(vId),
                        attendance_date: dateStr,
                        status: INV_STATUS_MAP[data.status] || 'Absent',
                        mileage: data.mileage || null,
                        ignition_time: data.ignition_time || null,
                        updated_at: new Date().toISOString()
                    });
                });
            });

            if (upserts.length === 0) {
                setStatusModal({ show: true, message: 'No modifications to commit', type: 'info' });
                setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 1500);
                return;
            }

            const chunkSize = 50;
            for (let i = 0; i < upserts.length; i += chunkSize) {
                const chunk = upserts.slice(i, i + chunkSize);
                const { error } = await supabase
                    .from('vehicle_attendance')
                    .upsert(chunk, { onConflict: 'vehicle_id,attendance_date' });
                if (error) throw error;
            }

            setStatusModal({ show: true, message: 'Monthly logs successfully archived', type: 'success' });
            setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 2000);
        } catch (err) {
            console.error('Save error:', err);
            setStatusModal({ show: true, message: 'Error updating database', type: 'error' });
            setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 3000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`backdrop-blur-xl border rounded-[2rem] overflow-hidden shadow-2xl relative transition-all duration-300 ${darkMode ? 'bg-white/[0.02] border-white/10 shadow-black/20' : 'bg-white/40 border-white/60 shadow-indigo-100/10'}`}>

            {/* Header Control Panel */}
            <div className={`p-8 border-b flex flex-col xl:flex-row justify-between items-center gap-6 ${darkMode ? 'border-white/10' : 'border-gray-100/50'}`}>
                {/* Search Field (Left Side) */}
                <div className="relative group w-full md:w-72">
                    <input
                        type="text"
                        placeholder="Filter by code, owner, reg..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`pl-10 pr-4 py-2.5 rounded-xl text-xs w-full transition-all border ${darkMode
                            ? 'bg-slate-900/40 border-white/10 text-white placeholder-slate-600 focus:border-indigo-500/50'
                            : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 shadow-sm'}`}
                    />
                    <svg className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Right Side Group (Month + Actions) */}
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-end">
                    {/* Month Selection */}
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Month:</span>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${darkMode
                                ? 'bg-slate-900 border-white/10 text-white'
                                : 'bg-white border-slate-200 text-slate-700 shadow-sm'}`}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={loadData}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${darkMode
                                ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            Sync
                        </button>
                        <button
                            onClick={saveAttendance}
                            disabled={saving || loading}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${saving
                                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:translate-y-0.5 shadow-blue-600/20'}`}
                        >
                            {saving ? 'Archiving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Interactive Table Environment */}
            <div className="p-8 flex-1 overflow-hidden flex flex-col min-h-[500px]">
                <div className={`rounded-2xl border flex-1 overflow-auto custom-scrollbar transition-all ${darkMode ? 'bg-[#0a0f18] border-white/5 shadow-inner' : 'bg-white border-slate-200 shadow-2xl shadow-indigo-100/10'}`}>
                    <div className="min-w-max">
                        <table className="w-full text-[11px] border-separate border-spacing-0">
                            <thead className="sticky top-0 z-40">
                                <tr className={`${darkMode ? 'bg-slate-900/90' : 'bg-slate-50/90'} backdrop-blur-md`}>
                                    {/* STICKY LEFT HEADERS */}
                                    <th className={`p-4 text-left sticky left-0 top-0 z-50 w-10 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>#</th>
                                    <th className={`p-4 text-left sticky left-[2.5rem] top-0 z-50 w-28 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>VEH-CODE</th>
                                    <th className={`p-4 text-left sticky left-[9.5rem] top-0 z-50 w-32 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>TYPE</th>

                                    {/* DYNAMIC STICKY HEADERS */}
                                    <th className={`p-4 text-center sticky left-[17.5rem] top-0 z-50 w-20 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>MILEAGE</th>
                                    <th className={`p-4 text-center sticky left-[22.5rem] top-0 z-50 w-24 font-black border-b border-r shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>IG TIME</th>

                                    {/* MONTHLY GRID HEADERS */}
                                    {Array.from({ length: daysInMonth }, (_, i) => (
                                        <th key={i}
                                            onClick={() => setFocusDay(i + 1)}
                                            className={`px-1 py-4 text-center w-9 cursor-pointer transition-all border-b border-l border-dashed ${i + 1 === focusDay
                                                ? (darkMode ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-indigo-50 text-indigo-600 border-indigo-200')
                                                : (darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500')}`}>
                                            {i + 1}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={daysInMonth + 5} className="p-32 text-center">
                                            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                                            <p className="font-bold text-[10px] uppercase tracking-widest opacity-40">Indexing Fleet Logs...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {/* HEAVY MACHINERY SECTION */}
                                        {vehicleGroups.heavyMachinery.length > 0 && (
                                            <>
                                                <tr className={`${darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50/70'}`}>
                                                    <td colSpan={daysInMonth + 5} className={`px-4 py-2 font-black text-[10px] uppercase tracking-[0.2em] border-b ${darkMode ? 'text-indigo-400 border-white/5' : 'text-indigo-700 border-slate-200'}`}>
                                                        Heavy Machinery (Work Hours Tracking)
                                                    </td>
                                                </tr>
                                                {vehicleGroups.heavyMachinery.map((v, idx) => (
                                                    <VehicleRow
                                                        key={v.id}
                                                        v={v}
                                                        idx={idx}
                                                        darkMode={darkMode}
                                                        focusDay={focusDay}
                                                        attendance={attendance}
                                                        toggleCell={toggleCell}
                                                        daysInMonth={daysInMonth}
                                                        timeLabel="Work Hrs"
                                                    />
                                                ))}
                                            </>
                                        )}

                                        {/* STANDARD FLEET SECTION */}
                                        {vehicleGroups.standardFleet.length > 0 && (
                                            <>
                                                <tr className={`${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50/70'}`}>
                                                    <td colSpan={daysInMonth + 5} className={`px-4 py-2 font-black text-[10px] uppercase tracking-[0.2em] border-b border-t ${darkMode ? 'text-emerald-400 border-white/5' : 'text-emerald-700 border-slate-200'}`}>
                                                        Standard Fleet (Ig Time Tracking)
                                                    </td>
                                                </tr>
                                                {vehicleGroups.standardFleet.map((v, idx) => (
                                                    <VehicleRow
                                                        key={v.id}
                                                        v={v}
                                                        idx={idx}
                                                        darkMode={darkMode}
                                                        focusDay={focusDay}
                                                        attendance={attendance}
                                                        toggleCell={toggleCell}
                                                        daysInMonth={daysInMonth}
                                                        timeLabel="Ig Time"
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legend & Help Footer */}
                <div className={`mt-6 p-6 rounded-2xl border flex flex-wrap items-center gap-8 ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-emerald-500 shadow-md shadow-emerald-500/20 font-black text-[8px] text-white flex items-center justify-center">P</div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md font-black text-[8px] flex items-center justify-center border ${darkMode ? 'bg-rose-500/20 text-rose-600 border-rose-500/30' : 'bg-rose-50 text-rose-300 border-rose-200'}`}>A</div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Absent</span>
                    </div>

                </div>
            </div>

            {/* Global Status Notification Portal */}
            <AnimatePresence>
                {statusModal.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className={`max-w-sm w-full p-10 rounded-[2.5rem] shadow-2xl border flex flex-col items-center text-center ${darkMode ? 'bg-slate-900 border-white/10 shadow-black' : 'bg-white border-slate-100'}`}
                        >
                            <div className="mb-6">
                                {statusModal.type === 'loading' && <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />}
                                {statusModal.type === 'success' && <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">✓</div>}
                                {statusModal.type === 'error' && <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 shadow-inner">✕</div>}
                            </div>
                            <h3 className={`text-lg font-black mb-2 uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{statusModal.type}</h3>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{statusModal.message}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VehicleAttendance;
