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

const EditableAttendanceCell = ({ vehicleId, day, dayData, onUpdate, darkMode, trackingMode }) => {
    const [isEditing, setIsEditing] = useState(false);

    const getInitialValue = () => {
        if (trackingMode === 'hours') {
            return (dayData.ignition_time != null && dayData.ignition_time !== '')
                ? formatToHMS(dayData.ignition_time)
                : '00:00:00';
        }
        return dayData.mileage ?? '';
    };

    const [value, setValue] = useState(getInitialValue());

    useEffect(() => {
        setValue(getInitialValue());
    }, [dayData.ignition_time, dayData.mileage, trackingMode]);

    const handleSave = () => {
        setIsEditing(false);

        let currentHours = dayData.ignition_time ?? null;
        let currentMileage = dayData.mileage ?? null;

        if (trackingMode === 'hours') {
            const strVal = String(value).trim();
            if (strVal === '' || strVal === '00:00:00') {
                currentHours = null;
            } else if (strVal.includes(':')) {
                const parts = strVal.split(':');
                const h = parseInt(parts[0] || '0', 10);
                const m = parseInt(parts[1] || '0', 10);
                const s = parseInt(parts[2] || '0', 10);
                currentHours = Math.round((h + (m / 60) + (s / 3600)) * 3600) / 3600;
            } else {
                currentHours = parseFloat(strVal);
                if (isNaN(currentHours)) currentHours = null;
            }
        } else {
            currentMileage = value === '' ? null : value;
        }

        if (currentHours !== (dayData.ignition_time ?? null) || currentMileage !== (dayData.mileage ?? null)) {
            onUpdate(vehicleId, day, currentHours, currentMileage);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    const handleBlur = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            handleSave();
        }
    };

    if (isEditing) {
        return (
            <div
                className="w-14 h-12 mx-auto flex flex-col justify-center items-center relative z-20"
                onBlur={handleBlur}
            >
                <input
                    type={trackingMode === 'hours' ? 'text' : 'number'}
                    step="any"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={trackingMode === 'hours' ? "00:00:00" : "Mil"}
                    autoFocus
                    className={`w-[50px] text-center ${trackingMode === 'hours' ? 'text-[9px]' : 'text-[11px]'} font-bold rounded shadow-sm py-[6px] px-0 outline-none border focus:border-indigo-500 ${darkMode ? 'bg-slate-800 text-white border-slate-600 focus:bg-slate-700' : 'bg-white text-indigo-900 border-slate-300 focus:bg-indigo-50'}`}
                />
            </div>
        );
    }

    const hasData = value !== null && value !== '';

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsEditing(true)}
            className={`w-14 h-12 mx-auto rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border ${hasData
                ? (darkMode
                    ? (trackingMode === 'hours' ? 'bg-indigo-500/20 border-indigo-500/40 hover:border-indigo-400 shadow-[0_2px_10px_-2px_rgba(99,102,241,0.2)]' : 'bg-emerald-500/20 border-emerald-500/40 hover:border-emerald-400 shadow-[0_2px_10px_-2px_rgba(16,185,129,0.2)]')
                    : (trackingMode === 'hours' ? 'bg-gradient-to-b from-indigo-50/50 to-indigo-100/50 border-indigo-200/80 hover:border-indigo-400 hover:shadow-md hover:-translate-y-[1px] shadow-sm' : 'bg-gradient-to-b from-emerald-50/50 to-emerald-100/50 border-emerald-200/80 hover:border-emerald-400 hover:shadow-md hover:-translate-y-[1px] shadow-sm'))
                : (darkMode ? 'bg-slate-800/40 border-white/5 hover:border-white/20' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-sm')} shadow-sm`}
        >
            <div className={`flex items-baseline gap-[1px] ${hasData ? (trackingMode === 'hours' ? (darkMode ? 'text-indigo-200' : 'text-indigo-700') : (darkMode ? 'text-emerald-300' : 'text-emerald-700')) : (darkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                <span className={`${trackingMode === 'hours' ? 'text-[9px]' : 'text-[13px]'} font-black leading-none tracking-tighter`}>
                    {trackingMode === 'hours' ? formatToHMS(value) : (value !== '' && value !== null ? value : '0')}
                </span>
                {trackingMode === 'mileage' && <span className="text-[9px] font-bold opacity-70">m</span>}
            </div>
        </motion.div>
    );
};

const VehicleRow = ({ v, idx, darkMode, focusDay, attendance, updateCellData, daysInMonth, timeLabel, onOpenUsageModal }) => {
    const focusData = attendance[v.id]?.[focusDay] || { status: 'A', mileage: null, ignition_time: null };
    const trackingMode = timeLabel.includes('Work') ? 'hours' : 'mileage';

    return (
        <tr className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-indigo-50/20'} transition-all group`}>
            {/* STICKY LEFT CELLS */}
            <td className={`p-4 sticky left-0 z-10 font-bold text-center border-r border-b transition-colors ${darkMode ? 'bg-[#0a0f18] text-slate-700 border-white/5' : 'bg-white text-slate-300 border-slate-100'}`}>{idx + 1}</td>
            <td className={`p-4 sticky left-[2.5rem] z-10 border-r border-b transition-colors font-black ${darkMode ? 'bg-[#0a0f18] text-indigo-400 border-white/5' : 'bg-white text-indigo-600 border-slate-100'}`}>{v.vehicle_code}</td>
            <td className={`p-4 sticky left-[9.5rem] z-10 border-r border-b shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] transition-colors ${darkMode ? 'bg-[#0a0f18] text-slate-500 border-white/5' : 'bg-white text-slate-500 border-slate-100'}`}>
                <span className="text-[9px] font-black uppercase">{v.type}</span>
            </td>

            {/* MONTHLY GRID CELLS */}
            {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayData = attendance[v.id]?.[day] || { status: 'A' };
                const isFocus = day === focusDay;

                return (
                    <td key={i} className={`p-1 text-center border-l border-b border-transparent transition-all ${isFocus ? (darkMode ? 'bg-indigo-500/5' : 'bg-indigo-50/30') : ''}`}>
                        <EditableAttendanceCell
                            vehicleId={v.id}
                            day={day}
                            dayData={dayData}
                            onUpdate={updateCellData}
                            darkMode={darkMode}
                            trackingMode={trackingMode}
                        />
                    </td>
                );
            })}

            {/* TOTALS COLUMN */}
            <td className={`p-4 sticky right-0 z-10 border-l border-b shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)] transition-colors ${darkMode ? 'bg-[#0a0f18] border-white/5' : 'bg-white border-slate-100'}`}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onOpenUsageModal(v, trackingMode)}
                    className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all ${darkMode
                        ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 hover:shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-300 hover:shadow-sm'
                        }`}
                    title={`View Total ${trackingMode === 'hours' ? 'Operating Hours' : 'Mileage'}`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </motion.button>
            </td>
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
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'summary'
    const [statusModal, setStatusModal] = useState({ show: false, message: '', type: 'loading' });
    const [usageModal, setUsageModal] = useState({ show: false, vehicle: null, total: 0, trackingMode: 'hours' });

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
            // FRONT END LOADER and FRONT END BLADE follow working hours.
            // LOADER RICKSHAWS do NOT follow working hours.
            if ((type.includes('blade') || type.includes('loader')) && !type.includes('rickshaw')) {
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

    const updateCellData = (vehicleId, day, hours, mileage) => {
        setAttendance(prev => {
            const currentData = prev[vehicleId]?.[day] || { status: 'A' };
            const hasData = (hours !== null && hours !== '') || (mileage !== null && mileage !== '');
            return {
                ...prev,
                [vehicleId]: {
                    ...(prev[vehicleId] || {}),
                    [day]: {
                        ...currentData,
                        ignition_time: hours,
                        mileage: mileage,
                        status: hasData ? 'P' : 'A'
                    }
                }
            };
        });
    };

    const calculateTotalUsage = (vehicleId, trackingMode) => {
        const vehicleData = attendance[vehicleId];
        if (!vehicleData) return 0;

        let total = 0;
        Object.values(vehicleData).forEach(dayData => {
            if (trackingMode === 'hours' && dayData.ignition_time) {
                total += parseFloat(dayData.ignition_time) || 0;
            } else if (trackingMode === 'mileage' && dayData.mileage) {
                total += parseFloat(dayData.mileage) || 0;
            }
        });
        return total;
    };

    const openUsageModal = (vehicle, trackingMode) => {
        const total = calculateTotalUsage(vehicle.id, trackingMode);
        setUsageModal({ show: true, vehicle, total, trackingMode });
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
                    <div className="flex flex-col items-end gap-3">
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
                        
                        <motion.button
                            onClick={() => setViewMode(viewMode === 'grid' ? 'summary' : 'grid')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`group relative flex items-center gap-3 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden border ${darkMode
                                ? (viewMode === 'summary' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400')
                                : (viewMode === 'summary' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 shadow-sm')
                            }`}
                        >
                            <div className="flex items-center gap-2 z-10">
                                {viewMode === 'grid' ? (
                                    <>
                                        <div className="relative">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                            </svg>
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                            </span>
                                        </div>
                                        Analytics Dashboard
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Return to Log
                                    </>
                                )}
                            </div>
                            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none transition-opacity ${viewMode === 'summary' ? 'opacity-10' : 'opacity-0'}`} />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Main Interactive Table Environment */}
            <div className="p-8 flex-1 overflow-hidden flex flex-col min-h-[500px]">
                {viewMode === 'grid' ? (
                    <div className={`rounded-2xl border flex-1 overflow-auto custom-scrollbar transition-all ${darkMode ? 'bg-[#0a0f18] border-white/5 shadow-inner' : 'bg-white border-slate-200 shadow-2xl shadow-indigo-100/10'}`}>
                        <div className="min-w-max">
                            <table className="w-full text-[11px] border-separate border-spacing-0">
                                <thead className="sticky top-0 z-40">
                                    <tr className={`${darkMode ? 'bg-slate-900/90' : 'bg-slate-50/90'} backdrop-blur-md`}>
                                        {/* STICKY LEFT HEADERS */}
                                        <th className={`p-4 text-left sticky left-0 top-0 z-50 w-10 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>#</th>
                                        <th className={`p-4 text-left sticky left-[2.5rem] top-0 z-50 w-28 font-black border-b border-r transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>VEH-CODE</th>
                                        <th className={`p-4 text-left sticky left-[9.5rem] top-0 z-50 w-32 font-black border-b border-r shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>TYPE</th>

                                        {/* MONTHLY GRID HEADERS */}
                                        {Array.from({ length: daysInMonth }, (_, i) => (
                                            <th key={i}
                                                onClick={() => setFocusDay(i + 1)}
                                                className={`px-1 py-4 text-center min-w-[3.5rem] cursor-pointer transition-all border-b border-l border-dashed ${i + 1 === focusDay
                                                    ? (darkMode ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-indigo-50 text-indigo-600 border-indigo-200')
                                                    : (darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500')}`}>
                                                {i + 1}
                                            </th>
                                        ))}
                                        <th className={`px-4 py-4 sticky right-0 top-0 z-50 w-16 text-center font-black border-b border-l shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)] transition-colors ${darkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                            TOTAL
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={daysInMonth + 4} className="p-32 text-center">
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
                                                        <td colSpan={daysInMonth + 4} className={`px-4 py-2 font-black text-[10px] uppercase tracking-[0.2em] border-b ${darkMode ? 'text-indigo-400 border-white/5' : 'text-indigo-700 border-slate-200'}`}>
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
                                                            updateCellData={updateCellData}
                                                            daysInMonth={daysInMonth}
                                                            timeLabel="Work Hrs"
                                                            onOpenUsageModal={openUsageModal}
                                                        />
                                                    ))}
                                                </>
                                            )}

                                            {/* STANDARD FLEET SECTION */}
                                            {vehicleGroups.standardFleet.length > 0 && (
                                                <>
                                                    <tr className={`${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50/70'}`}>
                                                        <td colSpan={daysInMonth + 4} className={`px-4 py-2 font-black text-[10px] uppercase tracking-[0.2em] border-b border-t ${darkMode ? 'text-emerald-400 border-white/5' : 'text-emerald-700 border-slate-200'}`}>
                                                            Standard Fleet (Mileage Tracking)
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
                                                            updateCellData={updateCellData}
                                                            daysInMonth={daysInMonth}
                                                            timeLabel="Mileage"
                                                            onOpenUsageModal={openUsageModal}
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
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 overflow-auto custom-scrollbar space-y-8 pb-10"
                    >
                        {/* ═══ TOP ANALYTICS STRIP ═══ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { 
                                    label: 'Fleet Reach', 
                                    value: vehicles.length, 
                                    color: 'indigo', 
                                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
                                    suffix: 'units'
                                },
                                { 
                                    label: 'Fleet Mileage', 
                                    value: vehicleGroups.standardFleet.reduce((acc, v) => acc + calculateTotalUsage(v.id, 'mileage'), 0).toLocaleString(), 
                                    color: 'emerald', 
                                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                                    suffix: 'meters'
                                },
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`relative p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-slate-900 border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/20'}`}
                                >
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${darkMode ? `bg-${stat.color}-500/10 text-${stat.color}-400` : `bg-${stat.color}-50 text-${stat.color}-600`}`}>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{stat.icon}</svg>
                                    </div>
                                    <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</div>
                                    <div className="flex items-baseline gap-2">
                                        <div className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stat.value}</div>
                                        <div className={`text-[10px] font-bold opacity-40`}>{stat.suffix}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* ═══ DETAILED FLEET REPORT ═══ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* HEAVY MACHINERY DASHBOARD */}
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className={`text-sm font-black uppercase tracking-tight flex items-center gap-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                        Operational Capacity
                                    </h3>
                                    <span className={`text-[10px] font-black uppercase opacity-40`}>Heavy Machinery</span>
                                </div>
                                <div className="space-y-4">
                                    {vehicleGroups.heavyMachinery.map((v, i) => {
                                        const totalSeconds = calculateTotalUsage(v.id, 'hours');
                                        // Assume 200 hours as 100% capacity for visual reference
                                        const percentage = Math.min((totalSeconds / (200 * 3600)) * 100, 100);
                                        return (
                                            <motion.div
                                                key={v.id}
                                                whileHover={{ x: 8 }}
                                                className={`group p-5 rounded-3xl border transition-all ${darkMode ? 'bg-slate-900/50 border-white/5 hover:bg-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5'}`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className={`text-lg font-black tracking-tighter leading-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{v.vehicle_code}</div>
                                                        <div className={`text-[10px] font-bold opacity-40 uppercase tracking-widest`}>{v.type}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-sm font-black tabular-nums ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{formatToHMS(totalSeconds)}</div>
                                                        <div className="text-[9px] font-bold opacity-30">MONTHLY TOTAL</div>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200/20 rounded-full overflow-hidden relative">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 1, delay: i * 0.1 }}
                                                        className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* STANDARD FLEET DASHBOARD */}
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className={`text-sm font-black uppercase tracking-tight flex items-center gap-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        Deployment Radius
                                    </h3>
                                    <span className={`text-[10px] font-black uppercase opacity-40`}>Standard Fleet</span>
                                </div>
                                <div className="space-y-4">
                                    {vehicleGroups.standardFleet.map((v, i) => {
                                        const total = calculateTotalUsage(v.id, 'mileage');
                                        // Assume 5000 units as 100% capacity for visual reference
                                        const percentage = Math.min((total / 5000) * 100, 100);
                                        return (
                                            <motion.div
                                                key={v.id}
                                                whileHover={{ x: -8 }}
                                                className={`group p-5 rounded-3xl border transition-all ${darkMode ? 'bg-slate-900/50 border-white/5 hover:bg-slate-800' : 'bg-white border-slate-100 hover:shadow-xl hover:shadow-emerald-500/5'}`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="text-left order-2">
                                                        <div className={`text-lg font-black tracking-tighter leading-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{v.vehicle_code}</div>
                                                        <div className={`text-[10px] font-bold opacity-40 uppercase tracking-widest`}>{v.type}</div>
                                                    </div>
                                                    <div className="text-left order-1">
                                                        <div className={`text-sm font-black tabular-nums ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{total.toLocaleString()} <span className="text-[10px] opacity-40">m</span></div>
                                                        <div className="text-[9px] font-bold opacity-30">MONTHLY DISTANCE</div>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200/20 rounded-full overflow-hidden relative">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 1, delay: i * 0.1 }}
                                                        className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
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

                {/* Monthly Usage Modal */}
                {usageModal.show && usageModal.vehicle && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
                        onClick={() => setUsageModal({ ...usageModal, show: false })}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className={`max-w-md w-full p-8 rounded-[2rem] shadow-2xl border flex flex-col relative overflow-hidden ${darkMode ? 'bg-slate-900 border-white/10 shadow-black' : 'bg-white border-slate-100'}`}
                        >
                            {/* Decorative Background element */}
                            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${usageModal.trackingMode === 'hours' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div>
                                    <h3 className={`text-sm font-black uppercase tracking-widest opacity-60 mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Monthly Summary</h3>
                                    <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{usageModal.vehicle.vehicle_code}</h2>
                                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{usageModal.vehicle.type} · {usageModal.vehicle.reg_no}</p>
                                </div>
                                <button
                                    onClick={() => setUsageModal({ ...usageModal, show: false })}
                                    className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className={`p-6 rounded-2xl flex flex-col items-center justify-center border relative z-10 ${darkMode
                                ? (usageModal.trackingMode === 'hours' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-emerald-500/10 border-emerald-500/20')
                                : (usageModal.trackingMode === 'hours' ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100')
                                }`}>
                                <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Total {usageModal.trackingMode === 'hours' ? 'Operating Time' : 'Distance Covered'}
                                </h4>

                                <div className={`flex items-baseline gap-2 ${usageModal.trackingMode === 'hours' ? (darkMode ? 'text-indigo-400' : 'text-indigo-600') : (darkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                                    <span className="text-4xl font-black tabular-nums tracking-tighter">
                                        {usageModal.trackingMode === 'hours' ? formatToHMS(usageModal.total) : usageModal.total.toLocaleString()}
                                    </span>
                                    <span className="text-sm font-bold opacity-70">
                                        {usageModal.trackingMode === 'hours' ? 'h' : 'm'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-8 relative z-10">
                                <button
                                    onClick={() => setUsageModal({ ...usageModal, show: false })}
                                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all border ${darkMode
                                        ? 'bg-slate-800 text-white border-white/10 hover:bg-slate-700'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                                        }`}
                                >
                                    Close Overview
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VehicleAttendance;
