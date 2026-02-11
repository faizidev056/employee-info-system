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
            className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 overflow-hidden"
        >
            <div className="p-6 border-b border-white/40 bg-white/30 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Vehicle Attendance</h2>
                    <p className="text-sm text-slate-500 mt-1">Mark daily attendance for the fleet</p>
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
                        <thead>
                            <tr className="bg-white/40 border-b border-white/50 backdrop-blur-sm">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reg ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle Code</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50">
                            {vehicles.map((vehicle) => {
                                const status = vehicleAttendance[vehicle.id] || 'Absent';
                                return (
                                    <tr key={vehicle.id} className="hover:bg-white/40 transition-colors bg-transparent">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{vehicle.reg_id}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{vehicle.vehicle_code}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100/80 text-slate-800 backdrop-blur-sm">
                                                {vehicle.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'Present' ? 'bg-green-100/80 text-green-800 border border-green-200' :
                                                status === 'Absent' ? 'bg-red-100/80 text-red-800 border border-red-200' :
                                                    'bg-amber-100/80 text-amber-800 border border-amber-200'
                                                }`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center space-x-2">
                                                <button
                                                    onClick={() => handleStatusChange(vehicle.id, 'Present')}
                                                    className="p-1.5 rounded-xl text-green-600 hover:bg-green-50/80 transition-all backdrop-blur-sm"
                                                    title="Mark Present"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(vehicle.id, 'Absent')}
                                                    className="p-1.5 rounded-xl text-red-600 hover:bg-red-50/80 transition-all backdrop-blur-sm"
                                                    title="Mark Absent"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(vehicle.id, 'Maintenance')}
                                                    className="p-1.5 rounded-xl text-amber-600 hover:bg-amber-50/80 transition-all backdrop-blur-sm"
                                                    title="Mark Maintenance"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
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
