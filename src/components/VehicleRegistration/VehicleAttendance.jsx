import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';

const VehicleAttendance = () => {
    const [vehicles, setVehicles] = useState([]);
    const [operationalData, setOperationalData] = useState({});
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    // Load vehicles from database on component mount
    useEffect(() => {
        loadVehicles();
    }, []);

    // Load fleet data for selected date when date changes
    useEffect(() => {
        loadFleetOperationalData(attendanceDate);
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

    const loadFleetOperationalData = async (date) => {
        try {
            const { data, error } = await supabase
                .from('fleet_daily_reports')
                .select('reg_no, mileage, ignition_time')
                .eq('date', date);

            if (error) {
                console.error('Error loading operational data:', error);
                return;
            }

            // Create a map of vehicle_code (reg_no) -> {mileage, ignition_time}
            const dataMap = {};
            if (data) {
                data.forEach((record) => {
                    dataMap[record.reg_no] = {
                        mileage: record.mileage,
                        ignition_time: record.ignition_time
                    };
                });
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
            className="bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden transition-all duration-300"
        >
            <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fleet Attendance</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Real-time operational metrics from fleet operations</p>
                    </div>
                </div>
                <div>
                    <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="px-4 py-2 bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Fetching vehicle status...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">Zakwan ID</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">Vehicle Code</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">Type</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] text-center">Working Hours</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] text-center">Mileage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {vehicles.map((vehicle) => {
                                const opData = operationalData[vehicle.vehicle_code] || { mileage: 0, ignition_time: 0 };
                                const isHeavyMachinery = vehicle.type === 'Front end blade' || vehicle.type === 'Front end loader';

                                return (
                                    <motion.tr
                                        key={vehicle.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-slate-50/80 transition-all duration-300"
                                    >
                                        <td className="px-8 py-5 text-sm font-bold text-slate-900 font-mono">{vehicle.reg_id}</td>
                                        <td className="px-8 py-5 text-sm font-semibold text-emerald-600 font-mono uppercase tracking-wider">{vehicle.vehicle_code}</td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                                                {vehicle.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {isHeavyMachinery ? (
                                                <div className="flex flex-col items-center">
                                                    <span className={`px-3 py-1 rounded-lg text-sm font-black ${opData.ignition_time > 0 ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-slate-400 bg-slate-50 border border-slate-100'}`}>
                                                        {opData.ignition_time || '0.00'} <span className="text-[10px] font-bold">Hrs</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {!isHeavyMachinery ? (
                                                <div className="flex flex-col items-center">
                                                    <span className={`px-3 py-1 rounded-lg text-sm font-black ${opData.mileage > 0 ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-slate-400 bg-slate-50 border border-slate-100'}`}>
                                                        {opData.mileage || '0.00'} <span className="text-[10px] font-bold">Km</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 font-bold">—</span>
                                            )}
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
                <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No Vehicles Active</h3>
                    <p className="text-slate-500 mt-1">There are no active vehicles registered in the system.</p>
                </div>
            )}
        </motion.div>
    );
};

export default VehicleAttendance;
