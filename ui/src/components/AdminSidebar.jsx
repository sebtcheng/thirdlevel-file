// Force HMR
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House as FiHome, Users as FiUsers, SignOut as FiLogOut, CaretLeft as FiChevronLeft, CaretRight as FiChevronRight, List as FiMenu, X as FiX, Gear as FiSettings, Medal as FiAward, CheckCircle as FiCheckCircle, SquaresFour as FiGrid, Briefcase as FiBriefcase } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import newLogo from '../assets/modern_logo.png';

const AdminSidebar = ({ isMobileOpen, setIsMobileOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Hover State
    const [isHovered, setIsHovered] = useState(false);
    const sidebarCollapsed = !isHovered;




    // Close mobile menu when navigating
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname, setIsMobileOpen]);

    // Close the mobile drawer with Escape.
    useEffect(() => {
        if (!isMobileOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setIsMobileOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isMobileOpen, setIsMobileOpen]);

    return (
        <>
            {/* Desktop Spacer */}
            <div className="hidden lg:block w-[96px] shrink-0" />

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] ui-fade-in"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div
                id="admin-sidebar"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ background: 'linear-gradient(180deg, var(--sidebar-gradient-1) 0%, var(--sidebar-gradient-2) 55%, var(--sidebar-gradient-3) 100%)' }}
                className={`fixed top-[72px] bottom-11 left-0 z-[100] flex shrink-0 border-r border-brand-900 flex-col pt-8 shadow-2xl transition-all duration-200 transform 
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
                lg:translate-x-0 
                ${sidebarCollapsed ? 'w-[320px] lg:w-[96px]' : 'w-[320px]'}`
                }>



                {/* Mobile Close Button */}
                <button
                    type="button"
                    onClick={() => setIsMobileOpen(false)}
                    aria-label="Close navigation menu"
                    aria-controls="admin-sidebar"
                    aria-expanded={isMobileOpen}
                    title="Collapse navigation"
                    className="lg:hidden absolute right-2 top-8 w-11 h-11 rounded-md flex items-center justify-center text-blue-200 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white transition-colors"
                >
                    <FiChevronLeft size={22} />
                </button>

                {/* LOGO */}
                <div className={`px-6 mb-12 flex ${sidebarCollapsed ? 'lg:justify-center' : 'justify-start'}`}>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand-800 font-black text-xl shadow-inner border border-white/5 shrink-0 overflow-hidden">
                            <img src={newLogo} alt="Logo" className="w-8 h-8 object-contain" />
                        </div>
                        <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-32 opacity-100'}`}>
                            <h2 className="text-sm font-black text-white uppercase tracking-tight italic leading-none">InsightED</h2>
                            <p className="text-[10px] text-blue-300 font-bold tracking-widest uppercase mt-1">Admin Workspace</p>
                        </div>
                    </div>
                </div>

                <nav className={`flex flex-col gap-2.5 flex-1 ${sidebarCollapsed ? 'lg:px-4' : 'px-6'}`}>
                    <button
                        onClick={() => navigate('/home')}
                        title="Executive Dashboard"
                        className={`relative flex items-center gap-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.pathname === '/home' ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20' : 'text-blue-200 hover:bg-white/10 hover:text-white hover:translate-x-0.5'}`}
                    >
                        {location.pathname === '/home' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-gold" aria-hidden="true" />}
                        <FiGrid size={18} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>Executive Dashboard</span>
                    </button>
                    <button
                        onClick={() => navigate('/officials-registry')}
                        title="Personnel Registry"
                        className={`relative flex items-center gap-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.pathname === '/officials-registry' && !location.search.includes('status=For%20Approval') && !location.search.includes('status=Applications') ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20' : 'text-blue-200 hover:bg-white/10 hover:text-white hover:translate-x-0.5'}`}
                    >
                        {location.pathname === '/officials-registry' && !location.search.includes('status=For%20Approval') && !location.search.includes('status=Applications') && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-gold" aria-hidden="true" />}
                        <FiUsers size={18} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>Personnel Registry</span>
                    </button>
                    <button
                        onClick={() => navigate('/officials-registry?status=For%20Approval')}
                        title="Pending Approvals"
                        className={`relative flex items-center gap-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.search.includes('status=For%20Approval') ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20' : 'text-blue-200 hover:bg-white/10 hover:text-white hover:translate-x-0.5'}`}
                    >
                        {location.search.includes('status=For%20Approval') && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-gold" aria-hidden="true" />}
                        <FiCheckCircle size={18} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>Pending Approvals</span>
                    </button>
                    <button
                        onClick={() => navigate('/officials-registry?status=Applications')}
                        title="TIMON Applications"
                        className={`relative flex items-center gap-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.search.includes('status=Applications') ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20' : 'text-blue-200 hover:bg-white/10 hover:text-white hover:translate-x-0.5'}`}
                    >
                        {location.search.includes('status=Applications') && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-gold" aria-hidden="true" />}
                        <FiBriefcase size={18} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>TIMON Applications</span>
                    </button>
                    {['Central Office', 'Admin', 'Super User', 'Personnel Admin'].includes(user?.role) && (
                        <button
                            onClick={() => navigate('/control-center')}
                            title="Control Center"
                            className={`relative flex items-center gap-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.pathname === '/control-center' ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20' : 'text-blue-200 hover:bg-white/10 hover:text-white hover:translate-x-0.5'}`}
                        >
                            {location.pathname === '/control-center' && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-gold" aria-hidden="true" />}
                            <FiSettings size={18} className="shrink-0" />
                            <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>Control Center</span>
                        </button>
                    )}
                </nav>

                <div className={`border-t border-blue-800/50 mt-auto flex flex-col gap-4 ${sidebarCollapsed ? 'lg:p-4' : 'p-8'}`}>
                    <div className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:h-0 lg:opacity-0' : 'h-6 opacity-100'}`}>
                        <p className="text-[9px] font-black text-blue-400/50 uppercase tracking-[0.2em] text-center whitespace-nowrap">Department of Education</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminSidebar;
