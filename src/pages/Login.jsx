import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setError(error.message);
            } else if (data?.session) {
                // session present immediately, navigate to app
                navigate('/');
            } else {
                // No immediate session returned; rely on auth state listener to update session.
                // Show a short message and navigate to the root to let the listener handle redirecting.
                navigate('/');
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-[#FAFAFA]">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900 mb-4 shadow-md shadow-slate-900/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
                    <p className="text-slate-500 text-sm mt-2">Please enter your details to sign in.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-gray-400"
                            placeholder="Enter your email"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-gray-400"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 text-white bg-slate-900 hover:bg-slate-800 rounded-lg font-medium text-sm transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-slate-500">
                    Don't have an account? <Link to="/signup" className="text-slate-900 font-semibold hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
