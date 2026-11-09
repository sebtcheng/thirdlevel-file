import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Envelope as FiMail, Lock as FiLock, Eye as FiEye, EyeSlash as FiEyeOff, ArrowRight as FiArrowRight, ArrowLeft as FiArrowLeft, WarningCircle as FiAlertCircle, DeviceMobile as FiSmartphone, Key as FiKey, X as FiX } from '@phosphor-icons/react';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';
import logo from '../assets/modern_logo.png';
import PageTransition from '../components/PageTransition';
import LoadingScreen from '../components/LoadingScreen';
import PinLogin from '../components/PinLogin';
import Swal from 'sweetalert2';
import FloatingLabelInput from '../components/forms/FloatingLabelInput.jsx';
import FormErrorSummary from '../components/forms/FormErrorSummary.jsx';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isCO = location.state?.isCO || false;

    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [passcode, setPasscode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [loginMode, setLoginMode] = useState('password'); // 'password' | 'passcode'
    const [isSchoolHead, setIsSchoolHead] = useState(false); // Standalone is usually for Officials/Applicants
    const [isPortalEnforced, setIsPortalEnforced] = useState(true);
    const [showBackPrompt, setShowBackPrompt] = useState(false);
    const [showDialpadModal, setShowDialpadModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [errors, setErrors] = useState([]);
    const fieldError = (id) => errors.find((er) => er.id === id)?.message;
    const [forgotLoading, setForgotLoading] = useState(false);

    // UI flows & Remembered user handling
    const [rememberedUser, setRememberedUser] = useState(() => {
        const stored = localStorage.getItem('remembered_user');
        if (stored) {
            try {
                const user = JSON.parse(stored);
                // Sanitize in memory: strip sensitive credential fields if present
                ['passcode', 'password', 'pin', 'password_hash', 'passcode_hash'].forEach(field => {
                    delete user[field];
                });

                const isCOPortal = location.state?.isCO || false;

                // Check if user role matches the portal constraint
                const roleLower = user.role?.toLowerCase() || '';
                const isAllowed = isCOPortal
                    ? (['personnel admin', 'super user', 'central office', 'regional office', 'school division office'].includes(roleLower))
                    : (roleLower === 'tlo applicant');

                if (isAllowed) return user;

                // If it doesn't match, silently clear it so they see normal login
                localStorage.removeItem('remembered_user');
            } catch (e) {
                localStorage.removeItem('remembered_user');
            }
        }
        return null;
    });

    // Default to password authentication when password is configured or present
    const [usePassword, setUsePassword] = useState(() => {
        const stored = localStorage.getItem('remembered_user');
        if (stored) {
            try {
                const u = JSON.parse(stored);
                // If user has a password (or by default for regular accounts), default to password mode
                if (u.has_password !== false) return true;
                // Only if account is explicitly passcode-only without a password, show PinLogin
                if (u.has_passcode && !u.has_password) return false;
            } catch (e) {
                return true;
            }
        }
        return true;
    });

    // Populate login identifier from remembered user if available
    useEffect(() => {
        if (rememberedUser?.email && !loginId) {
            setLoginId(rememberedUser.email);
        }
    }, [rememberedUser]);

    // ... hooks already declared above ...

    const { login, loginWithCredentials, verifyPin, logout } = useAuth();

    const getTargetRedirect = (roleLower) => {
        const searchParams = new URLSearchParams(location.search);
        const targetRedirect = searchParams.get('returnUrl') || searchParams.get('redirect') || location.state?.redirectTo || location.state?.returnUrl;

        if (
            targetRedirect &&
            typeof targetRedirect === 'string' &&
            targetRedirect.startsWith('/') &&
            !targetRedirect.startsWith('//') &&
            !targetRedirect.startsWith('/login') &&
            !targetRedirect.startsWith('/register') &&
            !targetRedirect.startsWith('/reset-password')
        ) {
            return targetRedirect;
        }

        if (['personnel admin', 'super user', 'central office', 'regional office', 'school division office', 'co_pd', 'ro_hrmo', 'sdo_hrmo'].includes(roleLower)) {
            return '/home';
        } else if (['tlo applicant', 'third level applicant'].includes(roleLower)) {
            return '/timon-applications';
        } else {
            return '/official-profiling';
        }
    };

    useEffect(() => {
        // Standalone app defaults
        setIsSchoolHead(false);
        setIsPortalEnforced(true);
    }, []);

    const handleModeChange = (newMode) => {
        if (newMode === loginMode) return;
        setLoginMode(newMode);
        setShowPassword(false);
        // Strictly never copy password into passcode state or vice versa
    };

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setErrors([]);
        setLoading(true);

        try {
            const secret = loginMode === 'password' ? password : passcode;
            if (!secret) {
                setLoading(false);
                setErrors([{ id: 'login-secret', message: `Please enter your ${loginMode === 'password' ? 'password' : 'passcode'}.` }]);
                document.getElementById('login-secret')?.focus();
                return;
            }

            const data = await loginWithCredentials(loginId, secret, isCO);
            if (data.success) {
                const roleLower = data.user.role?.toLowerCase() || '';
                // Role enforcement
                if (isCO) {
                    if (!['personnel admin', 'super user', 'central office', 'regional office', 'school division office', 'co_pd', 'ro_hrmo', 'sdo_hrmo'].includes(roleLower)) {
                        setLoading(false);
                        logout();
                        return Swal.fire('Access Denied', 'This portal is restricted to Administrative Personnel.', 'error');
                    }
                } else {
                    if (!['tlo applicant', 'third level official', 'third level applicant', 'user'].includes(roleLower)) {
                        setLoading(false);
                        logout();
                        return Swal.fire('Access Denied', 'This portal is restricted to Third Level Personnel.', 'error');
                    }
                }

                // Sanitize user before storing in remembered_user (no credential material)
                const sanitizedUser = { ...data.user };
                ['passcode', 'password', 'pin', 'password_hash', 'passcode_hash'].forEach(field => {
                    delete sanitizedUser[field];
                });
                localStorage.setItem('remembered_user', JSON.stringify(sanitizedUser));

                // Role-based redirection
                navigate(getTargetRedirect(roleLower), { replace: true });
            } else {
                Swal.fire('Login Failed', data.error || 'Invalid credentials', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Login failed. Please check your connection.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePinVerify = async (completedPin) => {
        setLoading(true);
        try {
            const data = await verifyPin(loginId, completedPin, isCO);
            if (data.success) {
                const roleLower = data.user.role?.toLowerCase() || '';
                // Role enforcement
                if (isCO) {
                    if (!['personnel admin', 'super user', 'central office', 'regional office', 'school division office', 'co_pd', 'ro_hrmo', 'sdo_hrmo'].includes(roleLower)) {
                        setLoading(false);
                        logout();
                        return Swal.fire('Access Denied', 'This portal is restricted to Administrative Personnel.', 'error');
                    }
                } else {
                    if (!['tlo applicant', 'third level official', 'third level applicant', 'user'].includes(roleLower)) {
                        setLoading(false);
                        logout();
                        return Swal.fire('Access Denied', 'This portal is restricted to Third Level Personnel.', 'error');
                    }
                }

                // Sanitize user before storing in remembered_user (no credential material)
                const sanitizedUser = { ...data.user };
                ['passcode', 'password', 'pin', 'password_hash', 'passcode_hash'].forEach(field => {
                    delete sanitizedUser[field];
                });
                localStorage.setItem('remembered_user', JSON.stringify(sanitizedUser));

                // Role-based redirection
                navigate(getTargetRedirect(roleLower), { replace: true });
            } else {
                Swal.fire('Login Failed', data.error || 'Invalid credentials', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Login failed. Please check your connection.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotEmail) {
            Swal.fire('Error', 'Please enter your email.', 'error');
            return;
        }
        setForgotLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, isCO })
            });
            const data = await response.json();
            if (response.ok) {
                Swal.fire('Success', data.message, 'success');
                setShowForgotModal(false);
                setForgotEmail('');
            } else {
                Swal.fire('Error', data.error || 'Request failed.', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Failed to send reset link.', 'error');
        } finally {
            setForgotLoading(false);
        }
    };

    if (loading && !showDialpadModal) {
        return <LoadingScreen />;
    }

    return (
        <PageTransition>
            <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-transparent">
                {/* DECORATIVE SHAPES */}
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-700/10 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gold/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-brand-800/10 rounded-full blur-[80px] animate-blob animation-delay-4000"></div>

                <div className="relative z-10 w-[90%] max-w-md">
                    <div className="bg-white p-8 rounded-lg border-2 border-brand-800 shadow-none transform transition-all hover:scale-[1.01] duration-500 relative">

                        {/* BACK BUTTON */}
                        <button
                            onClick={() => navigate('/')}
                            className="absolute top-6 left-6 p-2 rounded-xl bg-white/50 text-slate-400 hover:text-brand-800 hover:bg-white transition-all shadow-sm border border-slate-100 group z-20"
                        >
                            <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>

                        {/* HEADER */}
                        <div className="text-center mb-8">
                            <div className="relative w-24 h-24 mx-auto mb-4 bg-white/50 rounded-2xl shadow-inner flex items-center justify-center p-2">
                                <img src={logo} alt="InsightED Logo" className="w-full h-full object-contain drop-shadow-sm" />
                            </div>
                            <h1 className="page-title text-3xl text-brand-800 tracking-tight">InsightED</h1>
                            <p className="text-slate-500 text-sm mt-2 font-medium italic">Recruitment Hub</p>
                        </div>

                        {rememberedUser && !usePassword ? (
                            <PinLogin
                                rememberedUser={rememberedUser}
                                onSwitchAccount={() => {
                                    localStorage.removeItem('remembered_user');
                                    setRememberedUser(null);
                                    setUsePassword(true);
                                    setLoginId('');
                                    setPassword('');
                                    setPasscode('');
                                }}
                                onUsePassword={() => setUsePassword(true)}
                            />
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-6">
                                <FormErrorSummary errors={errors} />
                                <div className="space-y-4">
                                    {/* IDENTIFIER */}
                                    <div className="space-y-2">
                                        <FloatingLabelInput label="Account Identity" icon={<FiMail />} className="w-full" type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} onFocus={() => setFocusedInput('id')} onBlur={() => setFocusedInput(null)} placeholder="Registered Email" autoComplete="username" required />
                                    </div>

                                    {/* AUTH MODE TOGGLE */}
                                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                                        <button
                                            type="button"
                                            onClick={() => handleModeChange('password')}
                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginMode === 'password' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Password
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleModeChange('passcode')}
                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginMode === 'passcode' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Passcode
                                        </button>
                                    </div>

                                    {/* SECRET INPUT */}
                                    <div className="space-y-2">
                                        <div className={`relative group transition-all duration-300 ${focusedInput === 'secret' ? 'scale-[1.02]' : ''}`}>
                                            {loginMode === 'password' ? (
                                                <FloatingLabelInput label="Security Password" icon={<FiLock className="w-5 h-5" />} trailing={<button type="button" onClick={() => setShowPassword(!showPassword)} className="flex items-center p-1 hover:text-brand-800" aria-label={showPassword ? "Hide secret" : "Show secret"}>{showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}</button>} className="w-full" id="login-secret" aria-invalid={fieldError('login-secret') ? 'true' : undefined} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocusedInput('secret')} onBlur={() => setFocusedInput(null)} placeholder="••••••••" autoComplete="current-password" required />
                                            ) : (
                                                <FloatingLabelInput label="6-Digit Passcode" icon={<FiLock className="w-5 h-5" />} trailing={<button type="button" onClick={() => setShowPassword(!showPassword)} className="flex items-center p-1 hover:text-brand-800" aria-label={showPassword ? "Hide secret" : "Show secret"}>{showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}</button>} className="w-full" id="login-secret" aria-invalid={fieldError('login-secret') ? 'true' : undefined} type={showPassword ? 'text' : 'password'} value={passcode} onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                        setPasscode(val);
                                                    }} onFocus={() => {
                                                        setFocusedInput('secret');
                                                        setShowDialpadModal(true);
                                                    }} onBlur={() => setFocusedInput(null)} placeholder="••••••" maxLength={6} inputMode="numeric" pattern="[0-9]*" readOnly autoComplete="off" required />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(true)}
                                        className="text-[10px] font-black text-brand-800 uppercase tracking-widest hover:text-blue-800 transition-colors"
                                    >
                                        Forgot {loginMode === 'password' ? 'Password' : 'Passcode'}?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                                >
                                    {loading ? 'Authenticating...' : 'Sign In to Portal'}
                                    <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>
                        )}

                        {/* FOOTER */}
                        <div className="mt-8">
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <div className="h-px bg-slate-200 flex-1"></div>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OR</span>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </div>
                            <Link to={`/register${location.search}`} state={{ isCO, redirectTo: location.state?.redirectTo, returnUrl: location.state?.returnUrl }} className="w-full bg-white border-2 border-blue-100 hover:border-blue-600 hover:bg-blue-50 text-blue-700 font-black py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center">
                                Create Account
                            </Link>
                        </div>
                    </div>
                </div>

                {/* MODALS (Dialpad, Forgot etc) */}
                <AnimatePresence>
                    {showDialpadModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white rounded-lg p-8 max-w-sm w-full shadow-2xl relative border border-white/20"
                            >
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2 uppercase italic">Enter Passcode</h2>
                                    <div className="flex justify-center gap-3 mb-8 mt-6">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${passcode.length > i ? 'bg-brand-800 border-blue-600 scale-110' : 'bg-slate-200 border-transparent'}`} />
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-6 w-full max-w-[260px] mx-auto">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => passcode.length < 6 && setPasscode(prev => prev + num)}
                                                className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-200 active:scale-95 text-2xl font-black text-slate-700 shadow-sm transition-all"
                                            >
                                                {num}
                                            </button>
                                        ))}
                                        <div className="col-start-2">
                                            <button
                                                type="button"
                                                onClick={() => passcode.length < 6 && setPasscode(prev => prev + '0')}
                                                className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-200 active:scale-95 text-2xl font-black text-slate-700 shadow-sm transition-all"
                                            >
                                                0
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPasscode(prev => prev.slice(0, -1))}
                                            className="w-16 h-16 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <FiX className="w-8 h-8" />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDialpadModal(false)}
                                    className="w-full bg-brand-800 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
                                >
                                    Done
                                </button>
                            </motion.div>
                        </div>
                    )}

                    {showForgotModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                                className="bg-white rounded-lg p-10 max-w-sm w-full shadow-2xl text-center"
                            >
                                <div className="w-20 h-20 bg-blue-50 text-brand-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><FiKey className="w-10 h-10" /></div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic mb-4">Reset Password</h2>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">Enter your email address and we'll send you a link to reset your password.</p>
                                
                                <div className="mb-6 text-left">
                                    <FloatingLabelInput label="Email address" icon={<FiMail />} className="w-full" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Email address" />
                                </div>

                                <div className="space-y-3">
                                    <button 
                                        onClick={handleForgotPassword} 
                                        disabled={forgotLoading}
                                        className="w-full bg-brand-800 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-[12px] uppercase tracking-widest disabled:opacity-70"
                                    >
                                        {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                    <button onClick={() => setShowForgotModal(false)} className="w-full bg-slate-50 text-slate-400 font-black py-4 rounded-2xl active:scale-95 transition-all text-[10px] uppercase tracking-widest">Cancel</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
};

export default Login;
