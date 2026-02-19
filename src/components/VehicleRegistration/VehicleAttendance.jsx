import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';

const VehicleAttendance = () => {
    const [vehicles, setVehicles] = useState([]);
    const [vehicleAttendance, setVehicleAttendance] = useState({});
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    // Load vehicles from database on component mount
    useEffect(() => {
        loadVehicles();
    }, []);

    // Load attendance for selected date when date changes
    useEffect(() => {
        loadVehicleAttendance(attendanceDate);
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

    const loadVehicleAttendance = async (date) => {
        try {
            const { data, error } = await supabase
                .from('vehicle_attendance')
                .select('vehicle_id, status')
                .eq('attendance_date', date);

            if (error) {
                console.error('Error loading attendance:', error);
                return;
            }

            // Create a map of vehicle_id -> status
            const attendanceMap = {};
            if (data) {
                data.forEach((record) => {
                    attendanceMap[record.vehicle_id] = record.status;
                });
            }
            setVehicleAttendance(attendanceMap);
        } catch (err) {
            console.error('Unexpected error loading attendance:', err);
        }
    };

    const handleStatusChange = async (vehicleId, newStatus) => {
        try {
            // Update local state immediately for better UX
            setVehicleAttendance((prev) => ({
                ...prev,
                [vehicleId]: newStatus,
            }));

            // Upsert attendance record in database
            const { error } = await supabase
                .from('vehicle_attendance')
                .upsert(
                    {
                        vehicle_id: vehicleId,
                        attendance_date: attendanceDate,
                        status: newStatus,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'vehicle_id,attendance_date' }
                );

            if (error) {
                console.error('Error saving attendance:', error);
                // Revert local state on error
                loadVehicleAttendance(attendanceDate);
            }
        } catch (err) {
            console.error('Unexpected error saving attendance:', err);
            loadVehicleAttendance(attendanceDate);
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
                        <p className="text-sm text-slate-500 mt-0.5">Mark daily operations and maintenance status</p>
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
                    <p>Loading vehicles...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">Zakwan ID</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">Vehicle Code</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">Type</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] text-center">Status</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {vehicles.map((vehicle) => {
                                const status = vehicleAttendance[vehicle.id] || 'Absent';
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
                                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                                {vehicle.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    status === 'Absent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                        'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${status === 'Present' ? 'bg-emerald-500' :
                                                        status === 'Absent' ? 'bg-rose-500' :
                                                            'bg-amber-500'
                                                    }`} />
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <button
                                                    onClick={() => handleStatusChange(vehicle.id, 'Present')}
                                                    className={`p-2.5 rounded-xl transition-all duration-300 ${status === 'Present'
                                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                        }`}
                                                    title="Mark Present"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(vehicle.id, 'Absent')}
                                                    className={`p-2.5 rounded-xl transition-all duration-300 ${status === 'Absent'
                                                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                                                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                                        }`}
                                                    title="Mark Absent"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(vehicle.id, 'Maintenance')}
                                                    className={`p-2.5 rounded-xl transition-all duration-300 ${status === 'Maintenance'
                                                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                                        }`}
                                                    title="Mark Maintenance"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>
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
                <div className="p-8 text-center text-slate-500">
                    <p>No vehicles found. Register a vehicle to start tracking attendance.</p>
                </div>
            )}
        </motion.div>
    );
};

export default VehicleAttendance;
