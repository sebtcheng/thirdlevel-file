import { motion, AnimatePresence } from '../../utils/staticElements.jsx';
import { User as FiUser, CheckCircle as FiCheckCircle, Lock as FiLock, ArrowRight as FiArrowRight, X as FiX } from '@phosphor-icons/react';
import { TABS } from './constants';

const MobileDrawer = ({ completeness, dataSource, isMobileMenuOpen, isTabCompleted, setIsMobileMenuOpen, setTab, tab }) => {
  return (
    <>
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="fixed inset-0 bg-slate-900/60 z-50 lg:hidden"
                            />
                            {/* Drawer Content */}
                            <motion.aside
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 shadow-2xl flex flex-col lg:hidden"
                            >
                                {/* Header */}
                                <div className="px-5 pt-5 pb-4 border-b-2 border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-800/10 rounded-xl flex items-center justify-center text-brand-800">
                                            <FiUser size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[21px] font-black text-brand-800 leading-tight">Talent Portal</p>
                                            <p className="text-[15px] font-medium text-slate-400">Applicant Workspace</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="w-8 h-8 rounded-full bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <FiX size={16} />
                                    </button>
                                </div>
                                {/* Navigation */}
                                <div className="p-4 flex-1 overflow-y-auto">
                                    <p className="px-3 py-2 text-[13.5px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile Sections</p>
                                    <div className="space-y-1">
                                        {TABS.filter(t => dataSource !== 'masterlist' || t.id !== 'application').map(t => {
                                            const isLocked = t.id === 'application' && completeness < 100;
                                            const active = tab === t.id;
                                            const completed = isTabCompleted(t.id);
                                            return (
                                                <button
                                                    key={t.id}
                                                    disabled={isLocked}
                                                    onClick={() => {
                                                        if (!isLocked) {
                                                            setTab(t.id);
                                                            setIsMobileMenuOpen(false);
                                                        }
                                                    }}
                                                    className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left text-[18px] font-semibold transition-all
                                                        ${active ? 'bg-brand-800 text-white shadow-md shadow-blue-900/20' : 'text-slate-600 hover:bg-transparent hover:text-slate-800'}
                                                        ${isLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                                                >
                                                    <span className="flex items-center gap-3 min-w-0">
                                                        <t.icon size={16} className="shrink-0" />
                                                        <span className="truncate">{t.label}</span>
                                                    </span>
                                                    {isLocked ? (
                                                        <FiLock size={12} className="shrink-0 opacity-50" />
                                                    ) : completed ? (
                                                        <FiCheckCircle size={14} className={active ? 'text-emerald-300' : 'text-emerald-500'} />
                                                    ) : active ? (
                                                        <FiArrowRight size={12} className="shrink-0" />
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
    </>
  );
};

export default MobileDrawer;
