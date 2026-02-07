import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
        <div className="relative flex justify-center items-center h-screen bg-white overflow-hidden font-sans">
            {/* Elegant Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-gray-50 via-white to-white"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-gray-50 rounded-full blur-3xl opacity-60 animate-pulse"></div>
            <div className="absolute top-1/2 -left-24 w-72 h-72 bg-gray-100 rounded-full blur-3xl opacity-40 animate-float"></div>
            <div className="absolute -bottom-12 left-1/2 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-60 animate-float-delayed"></div>
            
            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015]"></div>

            <div className="relative z-10 w-full max-w-[400px] p-10 bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] border border-white/50 ring-1 ring-gray-100/50">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 text-white mb-6 shadow-lg shadow-slate-900/20 ring-4 ring-slate-50">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
                    <p className="text-slate-500 text-sm mt-3 font-medium">Please enter your details to sign in.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-900 uppercase tracking-widest ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-gray-50/50 border-0 border-b-2 border-gray-100 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-0 focus:border-slate-900 focus:bg-white transition-all duration-300 placeholder:text-gray-400 font-medium"
                            placeholder="Enter your email"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-900 uppercase tracking-widest ml-1">Password</label>
                        <div className="relative group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-50/50 border-0 border-b-2 border-gray-100 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-0 focus:border-slate-900 focus:bg-white transition-all duration-300 placeholder:text-gray-400 font-medium"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 px-4 flex items-center text-xs font-semibold text-gray-400 hover:text-slate-900 transition-colors uppercase tracking-wider"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center gap-2 animate-fade-in">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full py-3.5 bg-slate-950 text-white rounded-xl font-bold text-sm shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] hover:shadow-[0_6px_20px_rgba(93,93,93,0.23)] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                        <span className="relative flex items-center justify-center gap-2">
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                                    </svg>
                                </>
                            )}
                        </span>
                    </button>
                </form>

                <p className="text-center mt-8 text-sm text-slate-500 font-medium">
                    Don't have an account? <Link to="/signup" className="text-slate-900 font-bold hover:underline decoration-2 underline-offset-4 transition-all">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
