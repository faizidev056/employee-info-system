import Navbar from '../components/Navbar';
import { Outlet, useLocation } from 'react-router-dom';
// import VehicleRegistrationsPage from './VehicleRegistrationsPage';
const Layout = () => {
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
            <div className="flex-none z-50">
                <Navbar />
            </div>
            {/* <VehicleRegistrationsPage /> */}
            <main className="flex-1 relative overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
