import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://suthra-punjab-management.netlify.app/reset-password',
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage('Password reset link sent! Please check your email.');
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-40 -right-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md animate-fade-in">
                {/* Card Container */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100/50 backdrop-blur-sm hover:shadow-3xl transition-shadow duration-500">

                    {/* Top Blue Gradient Section */}
                    <div className="h-28 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 relative overflow-hidden shadow-lg">
                        <div className="absolute inset-0 opacity-10">
                            <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                                <defs>
                                    <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <circle cx="20" cy="20" r="1" fill="white" opacity="0.5" />
                                    </pattern>
                                </defs>
                                <rect width="400" height="100" fill="url(#dots)" />
                            </svg>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="px-8 py-10">

                        {/* Logo and Title */}
                        <div className="text-center mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-50 mb-4 transform -mt-16 border-4 border-white shadow-2xl hover:scale-105 transition-transform duration-300">
                                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Forgot Password?</h1>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed">No worries, we'll send you reset instructions</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>

                            {/* Email Input */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-blue-400 group-focus-within:text-blue-600 group-focus-within:scale-110 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="Enter your email"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-200/50 transition-all duration-300 font-medium shadow-sm hover:shadow-md"
                                />
                            </div>

                            {/* Success Message */}
                            {message && (
                                <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3 animate-in fade-in shadow-md">
                                    <div className="flex-shrink-0">
                                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-green-700 font-medium">{message}</p>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 animate-in fade-in shadow-md">
                                    <div className="flex-shrink-0">
                                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                </div>
                            )}

                            {/* Reset Password Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300/50 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2 group relative overflow-hidden"
                                style={{ backgroundSize: '200% 200%' }}
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-semibold">Send Reset Link</span>
                                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </div>
                            </button>

                            {/* Back to Login */}
                            <div className="text-center mt-6">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-all group"
                                >
                                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to Login
                                </Link>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <p className="text-center text-xs text-gray-500 font-medium">
                                Remember your password? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Trust Badge */}
                <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <p className="text-gray-500 text-xs font-semibold flex items-center justify-center gap-2 uppercase tracking-wide">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Secure & encrypted connection</span>
                    </p>
                </div>
            </div>

            {/* Add to global styles for animation */}
            <style>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animate-fade-in {
                    animation: fade-in 0.8s ease-out forwards;
                    opacity: 0;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                .shadow-3xl {
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                }
            `}</style>
        </div>
    );
};

export default ForgotPassword;
