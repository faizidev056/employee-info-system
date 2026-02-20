import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';

const VehicleAttendance = () => {
    const [vehicles, setVehicles] = useState([]);
    const [operationalData, setOperationalData] = useState({});
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [attendanceStatus, setAttendanceStatus] = useState({});

    // Helpers for time formatting
    const isWorkingHoursVehicle = (type) => {
        if (!type) return false;
        const t = type.toLowerCase();
        return t.includes('front end loader') || t.includes('front-end loader') || t.includes('front end blade') || t.includes('front-end blade');
    };

    const formatToHMS = (decimal) => {
        if (decimal === undefined || decimal === null || decimal === '' || isNaN(parseFloat(decimal)) || parseFloat(decimal) === 0) return '00:00:00';
        const num = parseFloat(decimal);
        const hours = Math.floor(num);
        const minutes = Math.floor((num - hours) * 60);
        const seconds = Math.round(((num - hours) * 60 - minutes) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Load vehicles from database on component mount
    useEffect(() => {
        loadVehicles();
    }, []);

    // Load fleet data for selected date when date changes
    useEffect(() => {
        loadFleetOperationalData(attendanceDate);
        loadAttendanceStatus(attendanceDate);
    }, [attendanceDate]);

    const loadVehicles = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vehicle_registrations')
                .select('id, reg_id, vehicle_code, type, status')
                .eq('status', 'Active')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading vehicles:', error);
                return;
            }

            setVehicles(data || []);
        } catch (err) {
            console.error('Unexpected error loading vehicles:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadAttendanceStatus = async (date) => {
        try {
            const { data, error } = await supabase
                .from('vehicle_attendance')
                .select('vehicle_id, status, mileage, ignition_time')
                .eq('attendance_date', date);

            if (error) {
                console.error('Error loading attendance status:', error);
                return;
            }

            const statusMap = {};
            if (data) {
                data.forEach(record => {
                    statusMap[record.vehicle_id] = {
                        status: record.status,
                        mileage: record.mileage,
                        ignition_time: record.ignition_time
                    };
                });
            }
            setAttendanceStatus(statusMap);
        } catch (err) {
            console.error('Unexpected error loading attendance status:', err);
        }
    };

    const loadFleetOperationalData = async (date) => {
        try {
            // Priority 1: Check fleet_mileage_reports (new source of truth)
            const { data: mileageData, error: mileageError } = await supabase
                .from('fleet_mileage_reports')
                .select('reg_no, mileage, ignition_time, threshold')
                .eq('date', date);

            if (mileageError) throw mileageError;

            const dataMap = {};

            // Map mileage data first
            if (mileageData && mileageData.length > 0) {
                mileageData.forEach((record) => {
                    dataMap[record.reg_no] = {
                        mileage: record.mileage,
                        ignition_time: record.ignition_time,
                        threshold: record.threshold
                    };
                });
            } else {
                // Priority 2: Fallback to fleet_daily_reports if no mileage report exists
                const { data: dailyData, error: dailyError } = await supabase
                    .from('fleet_daily_reports')
                    .select('reg_no, mileage, ignition_time')
                    .eq('date', date);

                if (dailyError) throw dailyError;

                if (dailyData) {
                    dailyData.forEach((record) => {
                        dataMap[record.reg_no] = {
                            mileage: record.mileage,
                            ignition_time: record.ignition_time,
                            threshold: null
                        };
                    });
                }
            }

            setOperationalData(dataMap);
        } catch (err) {
            console.error('Unexpected error loading operational data:', err);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-white/60 overflow-hidden transition-all duration-300"
        >
            {/* Header section with refined aesthetics */}
            <div className="p-10 border-b border-gray-100/50 flex flex-col md:flex-row justify-between items-center gap-8 bg-gradient-to-r from-white/40 to-transparent">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-600 shadow-lg shadow-indigo-200 flex items-center justify-center text-white">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Vehicle Attendance</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Day-wise fleet operational tracking & metrics</p>
                    </div>
                </div>

                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold ml-1">Select Attendance Date</span>
                    <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
                    />
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center text-slate-500">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="font-medium animate-pulse">Synchronizing vehicle archives...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20 text-center">Sr</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">veh-code</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">type of vehicle</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">ig time</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">mileage</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">attendance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white/30">
                            {vehicles.map((vehicle, index) => {
                                const opData = operationalData[vehicle.vehicle_code];
                                const attRecord = attendanceStatus[vehicle.id];

                                const isMarkedPresent = attRecord?.status === 'Present';
                                const hasData = !!opData || (attRecord?.mileage !== null && attRecord?.mileage !== undefined);
                                const isPresent = isMarkedPresent || !!opData;

                                // Prioritize pushed data, fallback to live operational data
                                const displayMileage = attRecord?.mileage ?? opData?.mileage;
                                const displayIgTime = attRecord?.ignition_time ?? opData?.ignition_time;

                                const workingHours = isWorkingHoursVehicle(vehicle.type);

                                return (
                                    <motion.tr
                                        key={vehicle.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="hover:bg-slate-50/50 transition-all duration-200 group"
                                    >
                                        <td className="px-8 py-5 text-sm font-bold text-slate-400 text-center">{index + 1}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{vehicle.vehicle_code}</span>
                                                <span className="text-[10px] font-bold text-slate-400 mt-0.5 mono">{vehicle.reg_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 whitespace-nowrap">
                                                {vehicle.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`font-mono text-sm font-bold ${displayIgTime !== undefined && displayIgTime !== null ? 'text-slate-700' : 'text-slate-300'}`}>
                                                {displayIgTime !== undefined && displayIgTime !== null ? (workingHours ? formatToHMS(displayIgTime) : `${displayIgTime || '0.00'} Hrs`) : '—'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`font-mono text-sm font-bold ${displayMileage !== undefined && displayMileage !== null ? 'text-slate-700' : 'text-slate-300'}`}>
                                                {displayMileage !== undefined && displayMileage !== null ? `${displayMileage || '0.00'} Km` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex justify-center">
                                                {isPresent ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        Present
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-50/50 border border-rose-100/50">
                                                        Absent
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty State */}
            {!loading && vehicles.length === 0 && (
                <div className="p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-900">No Active Vehicles</h3>
                    <p className="text-slate-500 mt-2 font-medium">There are no active vehicles registered for attendance tracking.</p>
                </div>
            )}
        </motion.div>
    );
};

export default VehicleAttendance;
