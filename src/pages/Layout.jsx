import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';
import VehicleRegistrationsPage from './VehicleRegistrationsPage';
const Layout = () => {
    return (
        <div>
            <Navbar />
            <VehicleRegistrationsPage />
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
