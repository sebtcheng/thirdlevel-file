import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';
import { apiUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { X as FiX, SignIn as FiLogIn, UserPlus as FiUserPlus, Shield as FiShield, BookOpen as FiBookOpen, ArrowSquareOut as FiExternalLink, Lock as FiLock, Briefcase as FiBriefcase, ArrowRight as FiArrowRight, CheckCircle as FiCheckCircle, Check as FiCheck, Clock as FiClock, FileText as FiFileText, Database as FiDatabase } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import PageTransition from '../components/PageTransition';
import './NexusGate.css';
import modernLogo from '../assets/modern_logo.png';
import depedLogo from '../assets/DepED-Logo.png';
import buildingBg from '../assets/deped_building_bg.png';
// import buildingBg from '../assets/deped_building_bg.jpeg';

const NexusGate = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Layout Swap State for Position Changing Animation
    const [isSwapped, setIsSwapped] = useState(false);

    // Applicant pooling intake window state
    const [poolingActive, setPoolingActive] = useState(false);

    useEffect(() => {
        fetch(apiUrl('/api/pooling/status'))
            .then(res => res.json())
            .then(data => {
                if (data.success && data.isOpen) {
                    setPoolingActive(true);
                }
            })
            .catch(() => {});
    }, []);

    // Recruitment portal modal
    const [showRecruitModal, setShowRecruitModal] = useState(false);

    // Central Office auth gate modal
    const [showCOGate, setShowCOGate] = useState(false);

    // Records Management User Guide modal
    const [showGuideModal, setShowGuideModal] = useState(false);

    // Track clicked card for animation
    const [clickedCard, setClickedCard] = useState(null);

    // Records Management Capsule visibility state (triggered on DepEd logo hover)
    const [showAdminCapsule, setShowAdminCapsule] = useState(false);
    const adminCapsuleTimerRef = useRef(null);

    const handleAdminHoverEnter = () => {
        if (adminCapsuleTimerRef.current) {
            clearTimeout(adminCapsuleTimerRef.current);
            adminCapsuleTimerRef.current = null;
        }
        setShowAdminCapsule(true);
    };

    const handleAdminHoverLeave = () => {
        if (adminCapsuleTimerRef.current) {
            clearTimeout(adminCapsuleTimerRef.current);
        }
        adminCapsuleTimerRef.current = setTimeout(() => {
            setShowAdminCapsule(false);
        }, 1000);
    };

    const handleLockedVacanciesClick = (e) => {
        e.stopPropagation();
        if (!user) {
            navigate('/login?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', {
                state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', portal: 'applicant' }
            });
        } else {
            navigate('/timon-applications');
        }
    };

    const closeCOGate = () => {
        setShowCOGate(false);
    };

    const handlePortalClick = (portalId) => {
        setClickedCard(portalId);
        setTimeout(() => {
            if (portalId === 'admin') {
                navigate('/login', { state: { redirectTo: '/home', isCO: true } });
            } else if (portalId === 'records') {
                navigate('/login', { state: { redirectTo: '/official-profiling', isCO: false } });
            } else {
                navigate('/login');
            }
        }, 350);
    };

    const itemLeft = {
        hidden: { opacity: 0, x: -50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
        exit: { opacity: 0, x: -50, transition: { duration: 0.3, ease: "easeIn" } }
    };

    const itemRight = {
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
        exit: { opacity: 0, x: 50, transition: { duration: 0.3, ease: "easeIn" } }
    };

    // Hero Section Component
    const renderHeroContent = (direction = 'left') => (
        <div
            className="nexus-hero-panel"
            onClick={() => setIsSwapped(prev => !prev)}
            title="Click to toggle panel position"
            style={{ cursor: 'pointer' }}
        >
            {/* Background image & gradient overlay */}
            <div className="nexus-bg-image-wrapper">
                <img src={buildingBg} alt="DepEd Headquarters" className="nexus-bg-image" />
                <div className="nexus-bg-gradient-overlay" />
            </div>

            <div className="nexus-hero-content">
                {/* Top Logos */}
                <div className="nexus-logo-group">
                    <div
                        className="nexus-logo-box"
                        onMouseEnter={handleAdminHoverEnter}
                        onMouseLeave={handleAdminHoverLeave}
                    >
                        <img src={depedLogo} alt="DepEd Logo" className="nexus-logo-img" />
                    </div>

                    <div className="nexus-logo-box">
                        <img src={modernLogo} alt="InsightED Logo" className="nexus-logo-img" />
                    </div>
                </div>

                {/* Admin Access Capsule Bar - Shown on DepEd Logo hover */}
                <AnimatePresence>
                    {showAdminCapsule && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.8, ease: "easeOut" } }}
                            transition={{ duration: 0.3 }}
                            onMouseEnter={handleAdminHoverEnter}
                            onMouseLeave={handleAdminHoverLeave}
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePortalClick('admin');
                            }}
                            className="nexus-admin-capsule-bar"
                            title="Click for Admin Records Management Login"
                        >
                            <div className="nexus-admin-shield-icon">
                                <FiShield size={18} className="text-brand-800" />
                            </div>
                            <span className="nexus-admin-capsule-title">Records Management</span>
                            <span className="nexus-admin-access-badge">ADMIN ACCESS</span>
                            <span className="nexus-admin-arrow">→</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Hero Section */}
                <div className="nexus-hero-bottom-content">
                    {/* Title Section */}
                    <motion.div variants={direction === 'left' ? itemLeft : itemRight} className="nexus-title-section">
                        <h1 className="nexus-main-title">
                            Welcome to<br />
                            <span className="nexus-title-highlight">
                                Insight<span className="nexus-red-text">ED</span> Nexus
                            </span>
                        </h1>

                        {/* Yellow Underline Accent */}
                        <div className="nexus-yellow-line">
                            <div className="nexus-line-bar" />
                        </div>

                        <p className="nexus-subtitle">
                            The official platform of the Department of Education for managing personnel records and advancing careers.
                        </p>
                    </motion.div>

                    {/* Feature Columns */}
                    <motion.div variants={direction === 'left' ? itemLeft : itemRight} className="nexus-features-row">
                        <div className="nexus-feature-item">
                            <div className="nexus-feature-icon-wrap">
                                <FiClock size={28} className="nexus-feature-icon" strokeWidth={1.75} />
                            </div>
                            <h4 className="nexus-feature-title">Save Time</h4>
                            <p className="nexus-feature-desc">Streamlined processes and quick access to records.</p>
                        </div>
                        <div className="nexus-feature-item">
                            <div className="nexus-feature-icon-wrap">
                                <FiFileText size={28} className="nexus-feature-icon" strokeWidth={1.75} />
                            </div>
                            <h4 className="nexus-feature-title">Less Paperwork</h4>
                            <p className="nexus-feature-desc">Digital records reduce manual work and paper use.</p>
                        </div>
                        <div className="nexus-feature-item">
                            <div className="nexus-feature-icon-wrap">
                                <FiDatabase size={28} className="nexus-feature-icon" strokeWidth={1.75} />
                            </div>
                            <h4 className="nexus-feature-title">All in One Place</h4>
                            <p className="nexus-feature-desc">Centralized information for better accuracy and accessibility.</p>
                        </div>
                    </motion.div>

                    {/* Bottom Security / Trust Card */}
                    <motion.div variants={direction === 'left' ? itemLeft : itemRight} className="nexus-trust-card">
                        <div className="nexus-trust-icon-wrapper">
                            <FiShield size={32} className="nexus-trust-icon" strokeWidth={1.75} />
                            <FiCheck size={16} className="nexus-trust-icon" strokeWidth={2.75} style={{ position: 'absolute' }} />
                        </div>
                        <div className="nexus-trust-text">
                            <h3>Official Department of Education Platform</h3>
                            <p>Your data is protected with enterprise-grade security and privacy standards.</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );

    // Cards Section Component
    const renderCardsContent = (direction = 'right') => (
        <div className="nexus-cards-panel">
            {/* Top Right User Guide Header Button */}
            <div className="nexus-top-actions">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowGuideModal(true);
                    }}
                    className="nexus-guide-btn"
                >
                    <FiBookOpen size={14} className="text-amber-400" />
                    <span>USER GUIDE</span>
                </button>
            </div>

            {/* Cards Container */}
            <div className="nexus-cards-stack">
                {/* ── CARD 1: THIRD LEVEL PORTAL ── */}
                <motion.div
                    variants={direction === 'right' ? itemRight : itemLeft}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePortalClick('records')}
                    className="nexus-card nexus-card-thirdlevel"
                >
                    {/* Watermark Classical Government Building Background Graphic */}
                    <div className="nexus-watermark nexus-watermark-columns">
                        <svg viewBox="0 0 280 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Pediment / Triangular Roof */}
                            <path d="M140 18 L15 80 H265 Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                            <path d="M140 32 L38 80 H242 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                            <circle cx="140" cy="58" r="6" fill="currentColor" fillOpacity="0.4" />
                            {/* Entablature Beam */}
                            <rect x="20" y="84" width="240" height="12" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
                            {/* 4 Columns */}
                            <g fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2">
                                <rect x="36" y="104" width="28" height="96" rx="4" />
                                <rect x="92" y="104" width="28" height="96" rx="4" />
                                <rect x="148" y="104" width="28" height="96" rx="4" />
                                <rect x="204" y="104" width="28" height="96" rx="4" />
                            </g>
                            {/* Base Steps */}
                            <rect x="16" y="204" width="248" height="8" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="10" y="215" width="260" height="8" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="4" y="226" width="272" height="8" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    </div>

                    <div className="nexus-card-header">
                        <div className="nexus-card-badge nexus-badge-yellow shadow-md">
                            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
                                <circle cx="20" cy="16" r="8" fill="var(--color-brand-800)" />
                                <path d="M8 38C8 30.268 13.3726 24 20 24C22.42 24 24.673 24.836 26.5 26.27" stroke="var(--color-brand-800)" strokeWidth="5" strokeLinecap="round" />
                                <path d="M34 26L41 29V35C41 38.5 37.5 42 34 43C30.5 42 27 38.5 27 35V29L34 26Z" fill="var(--color-brand-800)" stroke="var(--color-gold)" strokeWidth="2" strokeLinejoin="round" />
                                <path d="M31 34.5L33 36.5L37 32.5" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    <div className="nexus-card-body">
                        <span className="nexus-role-tag text-warning-700">FOR THIRD LEVEL PERSONNEL</span>
                        <h2 className="nexus-card-title">Third Level Portal</h2>
                        <p className="nexus-card-desc">
                            Access and update your professional and personnel information, upload supporting documents, and review your official Third Level profile records. The portal supports leadership profiling, talent management, succession planning, and other human resource management initiatives of the Department.
                        </p>
                    </div>

                    <div className="nexus-card-footer">
                        <span className="nexus-action-link text-brand-800">
                            CONTINUE <FiArrowRight size={16} />
                        </span>
                    </div>
                </motion.div>

                {/* ── CARD 2: VACANCIES (LOCKED) ── */}
                <motion.div
                    variants={direction === 'right' ? itemRight : itemLeft}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLockedVacanciesClick}
                    className="nexus-card nexus-card-vacancies"
                >
                    {/* Watermark Executive Chair Background Graphic */}
                    <div className="nexus-watermark nexus-watermark-chair">
                        <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="65" y="20" width="70" height="90" rx="16" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" />
                            <rect x="45" y="115" width="110" height="24" rx="10" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5" />
                            <path d="M45 70 H35 V110 H45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <path d="M155 70 H165 V110 H155" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <rect x="94" y="142" width="12" height="35" rx="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
                            <path d="M100 177 L60 200 M100 177 L140 200 M100 177 L100 210 M100 177 L40 185 M100 177 L160 185" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="60" cy="200" r="4" fill="currentColor" />
                            <circle cx="140" cy="200" r="4" fill="currentColor" />
                            <circle cx="100" cy="210" r="4" fill="currentColor" />
                            <circle cx="40" cy="185" r="4" fill="currentColor" />
                            <circle cx="160" cy="185" r="4" fill="currentColor" />
                        </svg>
                    </div>

                    <div className="nexus-card-header">
                        <div className="nexus-card-badge nexus-badge-blue">
                            <FiBriefcase size={22} className="text-brand-700" />
                        </div>
                        {poolingActive ? (
                            <div className="nexus-locked-pill !border-emerald-400 !bg-emerald-950/40 !text-emerald-300">
                                <FiCheckCircle size={12} className="text-emerald-400" />
                                <span>INTAKE OPEN</span>
                            </div>
                        ) : (
                            <div className="nexus-locked-pill">
                                <FiLock size={12} className="text-gold" />
                                <span>LOCKED</span>
                            </div>
                        )}
                    </div>

                    <div className="nexus-card-body">
                        <span className="nexus-role-tag text-brand-700">EXECUTIVE APPLICATIONS</span>
                        <h2 className="nexus-card-title">TIMON Applications</h2>
                        <span className="nexus-sub-tag text-brand-700">THIRD LEVEL VACANCIES & ROSTER</span>
                        <p className="nexus-card-desc mt-1">
                            Apply for third-level executive designations (RD, ARD, SDS, ASDS) in designated regions during active intake windows.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );

    return (
        <PageTransition>
            <div className={`nexus-gate-container ${isSwapped ? 'swapped' : ''}`}>
                <AnimatePresence mode="wait">
                    {!isSwapped ? (
                        <motion.div
                            key="normal"
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={{
                                visible: { transition: { staggerChildren: 0.1 } },
                                exit: { transition: { staggerChildren: 0.05 } }
                            }}
                            className="nexus-layout-grid"
                        >
                            {renderHeroContent('left')}
                            {renderCardsContent('right')}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="swapped"
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={{
                                visible: { transition: { staggerChildren: 0.1 } },
                                exit: { transition: { staggerChildren: 0.05 } }
                            }}
                            className="nexus-layout-grid swapped"
                        >
                            {renderCardsContent('left')}
                            {renderHeroContent('right')}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── RECRUITMENT MODAL ── */}
                <AnimatePresence>
                    {showRecruitModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRecruitModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl border-2 border-brand-800 overflow-hidden">
                                <div className="p-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-black text-brand-800 tracking-tight italic uppercase">Application Access</h2>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verify your InsightED account status</p>
                                        </div>
                                        <button onClick={() => setShowRecruitModal(false)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                                            <FiX size={24} className="text-slate-400" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button onClick={() => navigate('/login?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', { state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', portal: 'applicant' } })} className="group p-6 bg-blue-50 hover:bg-blue-600 rounded-3xl border border-blue-100 transition-all duration-300 text-left">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform shadow-sm"><FiLogIn size={24} /></div>
                                            <h3 className="font-black text-blue-900 group-hover:text-white uppercase tracking-tight italic">I have an account</h3>
                                            <p className="text-[10px] font-bold text-blue-600 group-hover:text-blue-100 uppercase tracking-wide mt-1">Sign in to continue</p>
                                        </button>
                                        <button onClick={() => navigate('/register?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', { state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', role: 'Third Level Applicant' } })} className="group p-6 bg-slate-50 hover:bg-brand-700 rounded-3xl border border-slate-200 transition-all duration-300 text-left">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-600 mb-4 group-hover:scale-110 transition-transform shadow-sm"><FiUserPlus size={24} /></div>
                                            <h3 className="font-black text-slate-900 group-hover:text-white uppercase tracking-tight italic">Portal Registration</h3>
                                            <p className="text-[10px] font-bold text-slate-500 group-hover:text-blue-100 uppercase tracking-wide mt-1">Personnel & Applicants</p>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ── CENTRAL OFFICE AUTH GATE ── */}
                <AnimatePresence>
                    {showCOGate && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCOGate} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-lg shadow-2xl border-2 border-brand-800 overflow-hidden">
                                <div className="bg-brand-800 px-10 py-8 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                            <FiShield size={22} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-sm uppercase tracking-widest leading-none">Third Level</p>
                                            <p className="text-blue-200 text-[9px] font-bold uppercase tracking-widest mt-1">Administrative Portal</p>
                                        </div>
                                    </div>
                                    <button onClick={closeCOGate} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                        <FiX size={20} className="text-white/70" />
                                    </button>
                                </div>

                                <div className="p-10">
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-2xl font-black text-brand-800 tracking-tight italic uppercase">How would you like to proceed?</h2>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Sign in to your existing account or register a new one</p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <button
                                                onClick={() => navigate('/login', { state: { isCO: true } })}
                                                className="group p-6 bg-blue-50 hover:bg-brand-800 rounded-3xl border border-blue-100 transition-all duration-300 text-left flex items-center gap-4"
                                            >
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-800 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                                    <FiLogIn size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 group-hover:text-white uppercase tracking-tight italic">Sign In</h3>
                                                    <p className="text-[10px] font-bold text-slate-500 group-hover:text-blue-100 uppercase tracking-wide mt-0.5">I already have an account</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => navigate('/register', { state: { isCO: true } })}
                                                className="group p-6 bg-slate-50 hover:bg-brand-800 rounded-3xl border border-slate-200 transition-all duration-300 text-left flex items-center gap-4"
                                            >
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                                    <FiUserPlus size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 group-hover:text-white uppercase tracking-tight italic">Register New Account</h3>
                                                    <p className="text-[10px] font-bold text-slate-500 group-hover:text-blue-100 uppercase tracking-wide mt-0.5">Create a Central Office account</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ── RECORDS MANAGEMENT USER GUIDE MODAL ── */}
                <AnimatePresence>
                    {showGuideModal && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 lg:p-8">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowGuideModal(false)}
                                className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-6xl h-[88vh] bg-white rounded-3xl shadow-2xl border border-white/40 flex flex-col overflow-hidden z-10"
                            >
                                <div className="px-6 py-4 bg-brand-800 text-white flex items-center justify-between shrink-0 shadow-md">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                                            <FiBookOpen size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wide text-white">Records Management User Guide</h3>
                                            <p className="text-[10px] text-blue-200 font-medium">Department of Education · Personnel Division</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a
                                            href="https://maiariii.github.io/insighted-newguides/tlo_guide/guide-template.html"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                                        >
                                            <FiExternalLink size={14} />
                                            <span>Open Full Tab</span>
                                        </a>
                                        <button
                                            onClick={() => setShowGuideModal(false)}
                                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                                        >
                                            <FiX size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 w-full h-full bg-slate-100 relative">
                                    <iframe
                                        src="https://maiariii.github.io/insighted-newguides/tlo_guide/guide-template.html"
                                        title="Records Management User Guide"
                                        className="w-full h-full border-0"
                                    />
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
};

export default NexusGate;
