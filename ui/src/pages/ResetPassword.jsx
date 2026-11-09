import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock as FiLock, Eye as FiEye, EyeSlash as FiEyeOff } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import PageTransition from '../components/PageTransition';
import logo from '../assets/modern_logo.png';
import FormErrorSummary from '../components/forms/FormErrorSummary.jsx';
import FloatingLabelInput from '../components/forms/FloatingLabelInput.jsx';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const fieldError = (id) => errors.find((er) => er.id === id)?.message;

    const handleReset = async (e) => {
        e.preventDefault();

        const found = [];
        if (!token) found.push({ message: 'Invalid or missing reset token.' });
        if (password.length < 8) found.push({ id: 'reset-password', message: 'Password must be at least 8 characters long.' });
        if (password !== confirmPassword) found.push({ id: 'reset-confirm-password', message: 'Passwords do not match.' });
        setErrors(found);
        if (found.length > 0) {
            const first = found.find((er) => er.id);
            if (first) document.getElementById(first.id)?.focus();
            return;
        }

        setLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire('Success', data.message, 'success').then(() => {
                    navigate('/');
                });
            } else {
                Swal.fire('Error', data.error || 'Failed to reset password.', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Failed to connect to the server.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-10 max-w-md w-full shadow-2xl relative border border-white/20">
                    <div className="text-center mb-8">
                        <img src={logo} alt="DepEd Logo" className="w-20 mx-auto mb-6" />
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Reset Password</h2>
                        <p className="text-slate-500 text-sm mt-2 font-medium">Enter your new password below.</p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-5" noValidate>
                        <FormErrorSummary errors={errors} />
                        <FloatingLabelInput label="New Password" icon={<FiLock />} trailing={<button type="button" onClick={() => setShowPassword(!showPassword)} className="flex items-center text-secondary">
                                {showPassword ? (
                                    <FiEyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                                ) : (
                                    <FiEye className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                                )}
                            </button>} className="w-full" id="reset-password" aria-invalid={fieldError('reset-password') ? 'true' : undefined} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" />

                        {fieldError('reset-password') && <p className="-mt-3 text-[13px] font-medium text-danger-700">{fieldError('reset-password')}</p>}

                        <FloatingLabelInput label="Confirm New Password" icon={<FiLock />} trailing={<button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="flex items-center text-secondary">
                                {showConfirmPassword ? (
                                    <FiEyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                                ) : (
                                    <FiEye className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                                )}
                            </button>} className="w-full" id="reset-confirm-password" aria-invalid={fieldError('reset-confirm-password') ? 'true' : undefined} type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" />

                        {fieldError('reset-confirm-password') && <p className="-mt-3 text-[13px] font-medium text-danger-700">{fieldError('reset-confirm-password')}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-800 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-70 mt-6"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </div>
        </PageTransition>
    );
};

export default ResetPassword;
