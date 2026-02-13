import Navbar from '../components/Navbar';
import { Outlet, useLocation } from 'react-router-dom';
// import VehicleRegistrationsPage from './VehicleRegistrationsPage';
const Layout = () => {
    const location = useLocation();
    const hideNavbarPaths = ['/workers', '/dashboard'];
    const showNavbar = !hideNavbarPaths.includes(location.pathname);

    return (
        <div>
            {showNavbar && <Navbar />}
            {/* <VehicleRegistrationsPage /> */}
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
