import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const PrivateRoute = ({ children }) => {
    const session = supabase.auth.getSession();

    return session ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
