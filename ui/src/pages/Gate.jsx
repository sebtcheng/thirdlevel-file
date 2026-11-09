import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from '../utils/staticElements.jsx';
import { SignIn as LogIn, UserPlus as UserPlus, ArrowRight as ArrowRight, Briefcase as Briefcase, ShieldCheck as ShieldCheck } from '@phosphor-icons/react';

const Gate = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            navigate('/official-profiling');
        }
    }, [user, loading, navigate]);

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        hover: { y: -8, scale: 1.02 }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-50 relative overflow-hidden px-6">
            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-50 rounded-full blur-[120px] opacity-70" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-50 rounded-full blur-[120px] opacity-70" />
            </div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16 relative z-10"
            >
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-brand-700 text-[10px] font-black uppercase tracking-widest mb-6">
                    <ShieldCheck size={14} />
                    Secure Personnel Portal
                </div>
                <h1 className="page-title text-4xl md:text-5xl text-slate-900 tracking-tight">
                    Third Level <span className="text-brand-700 not-italic">Officials</span>
                </h1>
                <p className="text-slate-500 font-medium mt-3">Personnel Division • TLM Section Recruitment Hub</p>
            </motion.div>

            {/* Choice Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
                {/* Login Card */}
                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    onClick={() => navigate('/login')}
                    className="cursor-pointer group bg-white rounded-lg p-10 shadow-2xl shadow-blue-900/10 border border-slate-100 flex flex-col justify-between min-h-[360px] transition-all"
                >
                    <div>
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg mb-8 group-hover:scale-110 transition-transform">
                            <LogIn size={32} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight italic leading-none uppercase mb-2">
                            I have an <span className="text-brand-700 not-italic">Account</span>
                        </h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Already registered? Sign in to continue your profile updates or check your application status.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-8 text-brand-700 font-black text-xs uppercase tracking-widest group-hover:gap-5 transition-all">
                        <span>Sign In Now</span>
                        <ArrowRight size={16} />
                    </div>
                </motion.div>

                {/* Register Card */}
                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/register')}
                    className="cursor-pointer group bg-white rounded-lg p-10 shadow-2xl shadow-blue-900/10 border border-slate-100 flex flex-col justify-between min-h-[360px] transition-all"
                >
                    <div>
                        <div className="w-16 h-16 rounded-2xl bg-brand-700 text-white flex items-center justify-center shadow-lg mb-8 group-hover:scale-110 transition-transform">
                            <UserPlus size={32} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight italic leading-none uppercase mb-2">
                            New <span className="text-brand-700 not-italic">Applicant</span>
                        </h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            First time here? Initialize your professional profile to begin your career progression journey.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-8 text-brand-700 font-black text-xs uppercase tracking-widest group-hover:gap-5 transition-all">
                        <span>Initialize Profile</span>
                        <ArrowRight size={16} />
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-20 text-center"
            >
                <div className="flex flex-col items-center gap-6">

                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                        © 2026 Department of Education • InsightEd Nexus
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Gate;
