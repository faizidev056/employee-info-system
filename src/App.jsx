import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import WorkerManagerPage from './pages/WorkerManagerPage';
import DailyReportPage from './pages/DailyReportPage';
import VehicleRegistrationPage from './pages/VehicleRegistrationPage';
import PrivateHRPage from './pages/PrivateHRPage';
import Dashboard from './pages/Dashboard';
import Layout from './pages/Layout';

function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Routes>
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
            <Route path="/signup" element={!session ? <SignUp /> : <Navigate to="/" />} />
            <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/" />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={session ? <Layout /> : <Navigate to="/login" />}>
                <Route index element={<Home />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="workers" element={<WorkerManagerPage />} />
                <Route path="daily-report" element={<DailyReportPage />} />
                <Route path="vehicle-registration" element={<VehicleRegistrationPage />} />
                <Route path="private-hr" element={<PrivateHRPage />} />
            </Route>
        </Routes>
    );
}

export default App;