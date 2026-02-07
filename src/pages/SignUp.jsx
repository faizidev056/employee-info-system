import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const SignUp = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) {
                setError(error.message);
            } else if (data?.session) {
                navigate('/');
            } else {
                alert('Check your email for the confirmation link!');
                navigate('/login');
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex justify-center items-center min-h-screen overflow-hidden font-sans bg-slate-950">
            {/* Gradient mesh background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.35),transparent),radial-gradient(ellipse_60%_60%_at_80%_50%,rgba(99,102,241,0.2),transparent),radial-gradient(ellipse_50%_50%_at_20%_80%,rgba(6,182,212,0.2),transparent)]" />
            {/* Floating glass orbs */}
            <div className="glassy-orb absolute -top-32 -right-32 w-[480px] h-[480px] bg-violet-500 animate-float" style={{ opacity: 0.35 }} />
            <div className="glassy-orb absolute top-1/2 -left-40 w-[360px] h-[360px] bg-cyan-400 animate-float-delayed" style={{ opacity: 0.25 }} />
            <div className="glassy-orb absolute -bottom-24 left-1/3 w-[320px] h-[320px] bg-indigo-500" style={{ opacity: 0.3, animationDelay: '2s' }} />
            {/* Subtle grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

            <div className="relative z-10 w-full max-w-[420px] mx-4 p-10 rounded-3xl border border-white/10 bg-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-white mb-6 shadow-lg backdrop-blur-sm">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Create account</h2>
                    <p className="text-white/60 text-sm mt-3 font-medium">Enter your details to get started.</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3.5 rounded-xl text-white placeholder:text-white/40 text-sm font-medium bg-white/[0.06] border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 focus:bg-white/[0.1] transition-all duration-300"
                            placeholder="you@company.com"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider ml-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3.5 pr-20 rounded-xl text-white placeholder:text-white/40 text-sm font-medium bg-white/[0.06] border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 focus:bg-white/[0.1] transition-all duration-300"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 px-4 flex items-center text-xs font-semibold text-white/50 hover:text-white/90 transition-colors uppercase tracking-wider"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full py-3.5 rounded-xl font-bold text-sm text-white bg-white/15 border border-white/20 hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden shadow-lg"
                    >
                        <span className="relative flex items-center justify-center gap-2">
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing up...
                                </>
                            ) : (
                                <>
                                    Sign Up
                                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                                    </svg>
                                </>
                            )}
                        </span>
                    </button>
                </form>

                <p className="text-center mt-8 text-sm text-white/60 font-medium">
                    Already have an account? <Link to="/login" className="text-white font-semibold hover:text-white/90 underline decoration-white/30 underline-offset-4 transition-colors">Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default SignUp;
