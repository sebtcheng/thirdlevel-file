import { useState } from 'react';
import AdminSidebar from '../AdminSidebar';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';

// Admin shell: full-width header on top, sidebar and content below, footer at the end of the scrolling content.
const AdminLayout = ({ children }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    return (
    <div className="flex h-screen flex-col overflow-hidden">
        <AppHeader isNavigationOpen={isMobileOpen} onToggleNavigation={() => setIsMobileOpen(open => !open)} />
        <div className="flex min-h-0 flex-1">
            <AdminSidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                <div className="flex flex-1 flex-col">{children}</div>
            </div>
        </div>
        <AppFooter />
    </div>
);
};

export default AdminLayout;
