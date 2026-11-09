// Force HMR
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House as FiHome, Users as FiUsers, SignOut as FiLogOut, CaretLeft as FiChevronLeft, CaretRight as FiChevronRight, List as FiMenu, X as FiX, Gear as FiSettings, Medal as FiAward, CheckCircle as FiCheckCircle, SquaresFour as FiGrid, Briefcase as FiBriefcase } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import newLogo from '../assets/modern_logo.png';

const AdminSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Hover State
    const [isHovered, setIsHovered] = useState(false);
    const sidebarCollapsed = !isHovered;

    // Mobile Open State
    const [isMobileOpen, setIsMobileOpen] = useState(false);



    // Close mobile menu when navigating
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    return (
        <>
            {/* Desktop Spacer */}
            <div className="hidden lg:block w-[96px] shrink-0" />

            {/* Mobile Hamburger Button (Floating) */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-brand-800 rounded-full flex items-center justify-center text-white shadow-2xl z-[50] border-2 border-blue-400 hover:bg-blue-800 transition-colors"
            >
                <FiMenu size={24} />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90]"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`fixed top-[72px] bottom-11 left-0 z-[100] flex shrink-0 bg-brand-800 border-r border-blue-900 flex-col pt-8 shadow-2xl transition-all duration-300 transform 
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
                lg:translate-x-0 
                ${sidebarCollapsed ? 'w-[320px] lg:w-[96px]' : 'w-[320px]'}`
                }>



                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="lg:hidden absolute right-4 top-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                    <FiX size={20} />
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

                <nav className={`flex flex-col gap-3 flex-1 ${sidebarCollapsed ? 'lg:px-4' : 'px-6'}`}>
                    <button
                        onClick={() => navigate('/home')}
                        title="Executive Dashboard"
                        className={`flex items-center gap-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.pathname === '/home' ? 'bg-white text-brand-800 shadow-lg' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}
                    >
                        <FiGrid size={18} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>Executive Dashboard</span>
                    </button>
                    <button
                        onClick={() => navigate('/officials-registry')}
                        title="Personnel Registry"
                        className={`flex items-center gap-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.pathname === '/officials-registry' && !location.search.includes('status=For%20Approval') && !location.search.includes('status=Applications') ? 'bg-white text-brand-800 shadow-lg' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}
                    >
                        <FiUsers size={18} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>Personnel Registry</span>
                    </button>
                    <button
                        onClick={() => navigate('/officials-registry?status=For%20Approval')}
                        title="Pending Approvals"
                        className={`flex items-center gap-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.search.includes('status=For%20Approval') ? 'bg-white text-brand-800 shadow-lg' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}
                    >
                        <FiCheckCircle size={18} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>Pending Approvals</span>
                    </button>
                    <button
                        onClick={() => navigate('/officials-registry?status=Applications')}
                        title="TIMON Applications"
                        className={`flex items-center gap-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${sidebarCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'} ${location.search.includes('status=Applications') ? 'bg-white text-brand-800 shadow-lg' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}
                    >
                        <FiBriefcase size={18} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>TIMON Applications</span>
                    </button>
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
