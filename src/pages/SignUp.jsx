import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const SignUp = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                // Signed up and logged in immediately
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
        <div className="flex justify-center items-center h-screen">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center">Sign Up</h2>
                <form onSubmit={handleSignUp} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 mt-1 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 mt-1 border rounded-md"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-2 text-white bg-blue-600 rounded-md">
                        {loading ? 'Signing up...' : 'Sign Up'}
                    </button>
                    {error && <p className="text-red-500">{error}</p>}
                </form>
                <p className="text-center">
                    Already have an account? <Link to="/login" className="text-blue-600">Log In</Link>
                </p> 
            </div>
        </div>
    );
};

export default SignUp;
