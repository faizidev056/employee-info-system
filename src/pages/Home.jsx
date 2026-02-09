import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50/50">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-4xl w-full mx-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 rounded-lg border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-semibold mb-2">Worker Manager</h2>
                        <p className="text-slate-500 mb-4">Manage employees, HR records, and attendance from the Worker Manager.</p>
                        <div className="flex space-x-2">
                            <button onClick={() => navigate('/workers?tab=dashboard')} className="px-4 py-2 rounded-md bg-slate-900 text-white">Open Worker Manager</button>
                        </div>
                    </div>

                    <div className="p-6 rounded-lg border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-semibold mb-2">Daily Report</h2>
                        <p className="text-slate-500 mb-4">Central hub for Daily Reporting — HR (Check-In / Check-Out) and Fleet reports.</p>
                        <div className="flex space-x-2">
                            <button onClick={() => navigate('/daily-report')} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Open Daily Report</button>
                        </div>
                    </div>

                    <div className="p-6 rounded-lg border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-semibold mb-2">Vehicle Registration</h2>
                        <p className="text-slate-500 mb-4">Manage fleet registration, vehicle details, and documents.</p>
                        <div className="flex space-x-2">
                            <button onClick={() => navigate('/vehicle-registration')} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Open Vehicle Reg.</button>
                        </div>
                    </div>

                    <div className="p-6 rounded-lg border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-semibold mb-2">Private HR</h2>
                        <p className="text-slate-500 mb-4">Private HR module for confidential HR records.</p>
                        <div className="flex space-x-2">
                            <button onClick={() => navigate('/private-hr')} className="px-4 py-2 rounded-md bg-rose-600 text-white">Open Private HR</button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button onClick={handleSignOut} className="px-6 py-2 text-sm text-slate-600 hover:text-slate-900">Sign Out</button>
                </div>
            </div>
        </div>
    );
};

export default Home;
