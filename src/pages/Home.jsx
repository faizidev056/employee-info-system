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
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center max-w-md w-full mx-4">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold mb-2 text-slate-900 tracking-tight">Welcome Back!</h1>
                <p className="mb-8 text-slate-500">You are successfully logged in to the Employee Info System.</p>
                <button onClick={handleSignOut} className="w-full px-6 py-3 text-white bg-slate-900 hover:bg-slate-800 rounded-xl font-medium transition-colors shadow-lg shadow-slate-900/20">
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Home;
