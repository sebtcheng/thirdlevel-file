import React, { useState, useEffect } from 'react';
import { motion } from '../utils/staticElements.jsx';
import { FloppyDisk as FiSave, Lock as FiLock, User as FiUser, Eye as FiEye, EyeSlash as FiEyeOff, SignOut as FiLogOut, Gear as FiSettings } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import FloatingLabelInput from '../components/forms/FloatingLabelInput.jsx';
import FormErrorSummary from '../components/forms/FormErrorSummary.jsx';
import PageHeaderCard from '../components/PageHeaderCard.jsx';
import AdminLayout from '../components/layout/AdminLayout.jsx';

const Settings = () => {
    const { user, token, setUser, logout } = useAuth();
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        passcode: '',
        confirmPasscode: ''
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const fieldError = (id) => errors.find((er) => er.id === id)?.message;
    const [showPassword, setShowPassword] = useState(false);
    const [showPasscode, setShowPasscode] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                firstName: user.first_name || '',
                lastName: user.last_name || ''
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const found = [];
        if (formData.password && formData.password !== formData.confirmPassword) {
            found.push({ id: 'settings-confirm-password', message: 'Passwords do not match' });
        }
        if (formData.passcode && formData.passcode !== formData.confirmPasscode) {
            found.push({ id: 'settings-confirm-passcode', message: 'Passcodes do not match' });
        }
        if (formData.passcode && formData.passcode.length !== 6) {
            found.push({ id: 'settings-passcode', message: 'Passcode must be exactly 6 digits' });
        }
        setErrors(found);
        if (found.length > 0) {
            document.getElementById(found[0].id)?.focus();
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(apiUrl('/api/auth/user/settings'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    password: formData.password || undefined,
                    passcode: formData.passcode || undefined
                })
            });

            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Your settings have been updated.',
                    icon: 'success',
                    confirmButtonColor: 'var(--color-brand-800)'
                });
                
                // Clear sensitive fields
                setFormData(prev => ({
                    ...prev,
                    password: '',
                    confirmPassword: '',
                    passcode: '',
                    confirmPasscode: ''
                }));

                // Update context if user data returned
                if (data.user && setUser) {
                    setUser(prev => {
                        const updatedUser = {
                            ...prev,
                            first_name: data.user.first_name,
                            last_name: data.user.last_name
                        };
                        // Persist to localStorage so it survives page refreshes
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                        localStorage.setItem('remembered_user', JSON.stringify(updatedUser));
                        return updatedUser;
                    });
                }
            } else {
                throw new Error(data.error || 'Failed to update settings');
            }
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            
            
            <main className="flex-1 flex flex-col relative">
                {/* TOP NAVIGATION BAR */}
                <PageHeaderCard title="Account Settings" subtitle="Update your personal information and security credentials.">
<div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[15px] font-medium text-heading leading-tight">{user?.first_name} {user?.last_name}</span>
                            <span className="text-[13px] text-secondary">{user?.role}</span>
                        </div>
                    </div>
</PageHeaderCard>
                
                <div className="p-8 lg:p-12 max-w-4xl mx-auto w-full mt-4">
                    

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-card border-2 border-brand-800 p-8 shadow-xl"
                    >
                        <form onSubmit={handleSave} className="space-y-8">
                            <FormErrorSummary errors={errors} />
                            
                            {/* Personal Information */}
                            <div>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <FiUser size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold text-brand-800">Personal Information</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <FloatingLabelInput label="First Name" className="w-full" type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Enter first name" />
                                    </div>
                                    <div className="space-y-2">
                                        <FloatingLabelInput label="Last Name" className="w-full" type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Enter last name" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <FloatingLabelInput label="Email Address" className="w-full" type="email" value={user?.email || ''} disabled />
                                        <p className="text-[10px] text-slate-400 font-medium ml-1 mt-1">Email address cannot be changed.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Security */}
                            <div>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 mt-8">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                        <FiLock size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold text-brand-800">Security Credentials</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <FloatingLabelInput id="settings-password" label="New Password" className="w-full" type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to keep current" />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-800 transition-colors"
                                            >
                                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <FloatingLabelInput id="settings-confirm-password" error={fieldError('settings-confirm-password')} label="Confirm Password" className="w-full" type={showPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm new password" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative">
                                            <FloatingLabelInput id="settings-passcode" error={fieldError('settings-passcode')} label="New Passcode (6-Digit)" className="w-full" inputClassName="font-mono tracking-widest" type={showPasscode ? "text" : "password"} name="passcode" value={formData.passcode} onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0,6);
                                                    handleChange({ target: { name: 'passcode', value: val } });
                                                }} placeholder="••••••" maxLength={6} />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPasscode(!showPasscode)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-800 transition-colors"
                                            >
                                                {showPasscode ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <FloatingLabelInput id="settings-confirm-passcode" error={fieldError('settings-confirm-passcode')} label="Confirm Passcode" className="w-full" inputClassName="font-mono tracking-widest" type={showPasscode ? "text" : "password"} name="confirmPasscode" value={formData.confirmPasscode} onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0,6);
                                                handleChange({ target: { name: 'confirmPasscode', value: val } });
                                            }} placeholder="••••••" maxLength={6} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end">
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-3 px-8 py-4 bg-brand-800 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-blue-900 transition-colors shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <FiSave size={18} />
                                    {loading ? 'Saving Changes...' : 'Save Settings'}
                                </button>
                            </div>

                        </form>
                    </motion.div>

                </div>
            </main>
        </AdminLayout>
    );
};

export default Settings;
