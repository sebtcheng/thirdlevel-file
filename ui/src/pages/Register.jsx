import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User as FiUser, Envelope as FiMail, Lock as FiLock, Phone as FiPhone, CheckCircle as FiCheckCircle, ArrowRight as FiArrowRight, ArrowLeft as FiArrowLeft, Shield as FiShield, DeviceMobile as FiSmartphone } from '@phosphor-icons/react';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';
import logo from '../assets/modern_logo.png';
import PageTransition from '../components/PageTransition';
import LoadingScreen from '../components/LoadingScreen';
import { apiUrl } from '../utils/api';
import Swal from 'sweetalert2';
import FloatingLabelInput from '../components/forms/FloatingLabelInput.jsx';
import FormErrorSummary from '../components/forms/FormErrorSummary.jsx';

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // Detect if arriving from Central Office auth gate
    const isCO = location.state?.isCO || false;
    const coAuthCode = location.state?.authCode || '';

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        contactNumber: '',
        auth_code: '',
        password: '',
        confirmPassword: '',
        passcode: '',
        role: isCO ? 'Central Office' : 'TLO Applicant'
    });


    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState([]);
    const fieldError = (id) => errors.find((er) => er.id === id)?.message;
    const [success, setSuccess] = useState(false);

    const [masterlistCheckStatus, setMasterlistCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'valid' | 'invalid'

    // Debounced masterlist check for non-CO accounts
    useEffect(() => {
        if (isCO || currentStep !== 2) return;

        const email = formData.email.trim();
        const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!email || !isValidFormat) {
            setMasterlistCheckStatus('idle');
            return;
        }

        if (!email.toLowerCase().endsWith('@deped.gov.ph')) {
            setMasterlistCheckStatus('invalid_domain');
            return;
        }

        const checkMasterlist = async () => {
            setMasterlistCheckStatus('checking');
            try {
                const res = await fetch(apiUrl(`/api/auth/check-masterlist-email?email=${encodeURIComponent(email)}&isCO=${isCO}`));
                if (res.ok) {
                    const data = await res.json();
                    if (data.alreadyRegistered) {
                        setMasterlistCheckStatus('already_registered');
                    } else if (data.inMasterlist) {
                        setMasterlistCheckStatus('valid');
                    } else {
                        setMasterlistCheckStatus('invalid');
                    }
                } else {
                    setMasterlistCheckStatus('idle');
                }
            } catch (err) {
                console.error("Masterlist check failed", err);
                setMasterlistCheckStatus('idle'); // fail closed (handled in submit/otp as well)
            }
        };

        const timer = setTimeout(checkMasterlist, 500);
        return () => clearTimeout(timer);
    }, [formData.email, isCO, currentStep]);

    useEffect(() => {
        if (!isCO) {
            setFormData(prev => ({ ...prev, role: 'TLO Applicant' }));
        }
    }, []);

    const handlePhoneChange = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
        setFormData(prev => ({ ...prev, contactNumber: val }));
    };


    const handleFinalStep = async () => {
        const found = [];
        if (!formData.email.toLowerCase().endsWith('@deped.gov.ph')) {
            found.push({ id: 'register-email', message: 'Only @deped.gov.ph emails are allowed for registration.' });
        } else if (masterlistCheckStatus === 'already_registered') {
            found.push({ id: 'register-email', message: 'This email is already registered for this portal. Please login instead.' });
        }
        if (isCO && formData.auth_code !== 'nVxCpLrTqWmK') {
            found.push({ id: 'register-auth-code', message: 'Invalid Authorization Code. Please ensure you have the correct code to register as an Administrator.' });
        }
        setErrors(found);
        if (found.length > 0) {
            document.getElementById(found[0].id)?.focus();
            return;
        }
        setCurrentStep(3);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setErrors([{ id: 'register-confirm-password', message: 'Passwords do not match' }]);
            document.getElementById('register-confirm-password')?.focus();
            return;
        }
        setErrors([]);

        setLoading(true);
        try {
            const res = await fetch(apiUrl('/api/auth/register-user'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.first_name,
                    lastName: formData.last_name,
                    contactNumber: formData.contactNumber,
                    role: formData.role,
                    passcode: formData.passcode,
                    isCO
                })
            });
            const data = await res.json();
            if (data.success) {
                login(data.user, data.token);
                setSuccess(true);

                const searchParams = new URLSearchParams(location.search);
                const targetRedirect = searchParams.get('returnUrl') || searchParams.get('redirect') || location.state?.redirectTo || location.state?.returnUrl;

                const redirectPath = (
                    targetRedirect &&
                    typeof targetRedirect === 'string' &&
                    targetRedirect.startsWith('/') &&
                    !targetRedirect.startsWith('//') &&
                    !targetRedirect.startsWith('/login') &&
                    !targetRedirect.startsWith('/register') &&
                    !targetRedirect.startsWith('/reset-password')
                ) ? targetRedirect : (
                    ['Personnel Admin', 'Admin', 'Super User', 'Central Office', 'Regional Office', 'School Division Office', 'CO_PD', 'RO_HRMO', 'SDO_HRMO'].includes(data.user?.role)
                        ? '/home'
                        : ['TLO Applicant', 'Third Level Applicant'].includes(data.user?.role)
                            ? '/timon-applications'
                            : '/official-profiling'
                );

                setTimeout(() => navigate(redirectPath, { replace: true }), 2000);
            } else {
                setError(data.error || "Registration failed");
            }
        } catch (err) {
            setError("Server error");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingScreen />;

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-white p-6">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10">
                        <FiCheckCircle size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4 italic uppercase">Identity Created</h2>
                    <p className="text-slate-500 font-medium mb-8 leading-relaxed max-w-sm mx-auto">Your recruitment profile has been initialized. Redirecting to your dashboard...</p>
                    <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                </motion.div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-transparent">

                <div className="relative z-10 w-[95%] max-w-xl">
                    <div className="bg-white border-2 border-brand-800 shadow-none rounded-lg p-8 md:p-12">

                        {/* HEADER */}
                        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <div className="w-16 h-16 bg-white/50 rounded-2xl shadow-inner flex items-center justify-center p-2 mb-6">
                                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <h1 className="page-title text-4xl text-brand-800 tracking-tight leading-none uppercase">
                                    Join <span className="text-brand-700 not-italic">Registry</span>
                                </h1>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-brand-700 animate-pulse"></span>
                                    Step {currentStep} of 3 • {currentStep === 1 ? 'Identity' : currentStep === 2 ? 'Verify' : 'Security'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${currentStep >= s ? 'bg-brand-800 w-16 shadow-[0_0_10px_rgb(var(--rgb-brand-700)/0.4)]' : 'bg-slate-200'}`}></div>
                                ))}
                            </div>
                        </div>

                        {/* STEP 1: IDENTITY */}
                        <FormErrorSummary errors={errors} />

                        {/* STEP 1: IDENTITY */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <FloatingLabelInput label="First Name" icon={<FiUser />} className="w-full" type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value.toUpperCase() })} placeholder="Juan" />
                                    </div>
                                    <div className="space-y-2">
                                        <FloatingLabelInput label="Last Name" icon={<FiUser />} className="w-full" type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value.toUpperCase() })} placeholder="Dela Cruz" />
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (formData.first_name && formData.last_name) {
                                            setCurrentStep(2);
                                        } else {
                                            Swal.fire('Notice', "Please complete all fields.", 'info');
                                        }
                                    }}
                                    className="w-full bg-brand-800 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group uppercase tracking-widest text-xs italic"
                                >
                                    Continue to Contact Info
                                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}

                        {/* STEP 2: CREDENTIALS */}
                        {currentStep === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                {isCO && (
                                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                        <FiShield size={16} className="text-brand-800 shrink-0" />
                                        <p className="text-[10px] font-black text-brand-800 uppercase tracking-widest">
                                            Central Office accounts must use an official @deped.gov.ph email.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative group">
                                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <FloatingLabelInput label="example@gmail.com" className="w-full" id="register-email" aria-invalid={fieldError('register-email') ? 'true' : undefined} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@gmail.com" />

                                        {!isCO && masterlistCheckStatus === 'valid' && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                                <FiCheckCircle size={18} />
                                            </div>
                                        )}
                                        {!isCO && masterlistCheckStatus === 'checking' && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    {!isCO && masterlistCheckStatus === 'invalid' && (
                                        <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                                            <FiShield className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-bold text-amber-600 leading-relaxed">
                                                Email not found in Masterlist. You may proceed to register, but your account will be set to "For Approval" and requires Central Office review.
                                            </p>
                                        </div>
                                    )}
                                    {masterlistCheckStatus === 'invalid_domain' && (
                                        <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">
                                            Only @deped.gov.ph emails are allowed for registration.
                                        </p>
                                    )}
                                    {masterlistCheckStatus === 'already_registered' && (
                                        <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">
                                            This email is already registered. Please sign in instead.
                                        </p>
                                    )}
                                </div>

                                {/* Phone & Auth Code */}
                                <div className={`grid gap-4 ${isCO ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                    <div className="space-y-2">
                                        <FloatingLabelInput label="Mobile Number" icon={<FiSmartphone />} className="w-full" type="text" value={formData.contactNumber} onChange={handlePhoneChange} placeholder="09XXXXXXXXX" />
                                    </div>
                                    {isCO && (
                                        <div className="space-y-2">
                                            <FloatingLabelInput id="register-auth-code" error={fieldError('register-auth-code')} label="Auth Code" icon={<FiShield />} className="w-full" type="text" value={formData.auth_code} onChange={e => setFormData({...formData, auth_code: e.target.value})} placeholder="Enter Auth Code" />
                                        </div>
                                    )}
                                </div>



                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setCurrentStep(1)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl active:scale-95 transition-all text-xs uppercase italic tracking-widest">Back</button>
                                    <button onClick={handleFinalStep} className="flex-[2] bg-brand-800 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-xs uppercase italic tracking-widest">Final Step</button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: SECURITY */}
                        {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <FloatingLabelInput label="New Password" icon={<FiLock />} className="w-full" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                                    </div>
                                    <div className="space-y-2">
                                        <FloatingLabelInput id="register-confirm-password" error={fieldError('register-confirm-password')} label="Confirm Password" icon={<FiLock />} className="w-full" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" />
                                    </div>
                                    <div className="space-y-2">
                                        <FloatingLabelInput label="Passcode (For account recovery)" icon={<FiLock />} className="w-full" type="text" maxLength={6} value={formData.passcode} onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                    e.target.value = val;
                                                    setFormData({ ...formData, passcode: val });
                                                }} placeholder="Enter 6-digit passcode" />
                                    </div>
                                </div>
                                {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">{error}</div>}
                                <div className="flex gap-4">
                                    <button onClick={() => setCurrentStep(2)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl active:scale-95 transition-all text-xs uppercase italic tracking-widest">Back</button>
                                    <button onClick={handleSubmit} disabled={loading} className="flex-[2] bg-brand-800 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 text-xs uppercase italic tracking-widest">
                                        Create Identity
                                        <FiCheckCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* FOOTER */}
                        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                Already have an account? <Link to={`/login${location.search}`} state={{ isCO, redirectTo: location.state?.redirectTo, returnUrl: location.state?.returnUrl }} className="text-brand-700 hover:text-blue-800 ml-1">Sign In Instead</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default Register;
