import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '../../utils/staticElements.jsx';
import { Clock as FiClock, Info as FiInfo, X as FiX, Calendar as FiCalendar } from '@phosphor-icons/react';

const IncumbencyModal = ({ incumbents, incumbentsLoading, selectedPosition, setShowIncumbencyModal, showIncumbencyModal }) => {
  return (
    <>
                    {createPortal(
                        <AnimatePresence>
                            {showIncumbencyModal && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                        className="bg-white rounded-card w-full max-w-2xl shadow-[0_32px_64px_-12px_rgb(var(--rgb-heading)/0.14)] border-2 border-white/50 overflow-hidden relative"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent"></div>

                                        <div className="p-10 relative z-10">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-brand-700 font-black text-[15px] uppercase tracking-[0.2em] mb-2">
                                                        <FiClock /> Positional History
                                                    </div>
                                                    <h2 className="text-[45px] font-black text-brand-800 tracking-tighter uppercase italic leading-none">{selectedPosition?.title}</h2>
                                                    <p className="text-slate-400 font-medium text-[21px]">{selectedPosition?.office || 'Department of Education'}</p>
                                                </div>
                                                <button onClick={() => setShowIncumbencyModal(false)} className="p-3 rounded-card bg-white text-slate-400 hover:text-red-600 shadow-sm border-2 border-slate-200 transition-all">
                                                    <FiX size={24} />
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-[15px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 pb-3">Last Known Incumbents</h4>
                                                {incumbentsLoading ? (
                                                    <div className="h-48 flex items-center justify-center">
                                                        <div className="w-8 h-8 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                                    </div>
                                                ) : incumbents.length === 0 ? (
                                                    <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                                        <FiClock className="mx-auto text-slate-200 mb-4" size={32} />
                                                        <p className="text-slate-400 font-bold uppercase text-[15px] tracking-widest">No historical data recorded</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-5 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                                                        {incumbents.map((inc, i) => {
                                                            const startYear = inc.appointment_date ? new Date(inc.appointment_date).getFullYear() : 'Unknown';
                                                            const endYear = inc.is_current == 1 ? 'Present' : new Date(inc.tenure_date).getFullYear();
                                                            const yearDisplay = startYear === endYear ? startYear : `${startYear} - ${endYear}`;

                                                            return (
                                                                <div key={i} className="relative group">
                                                                    <div className={`absolute -left-[31px] top-5 w-4 h-4 rounded-full border-4 border-white shadow-sm ${inc.is_current == 1 ? 'bg-emerald-400' : 'bg-slate-300 group-hover:bg-blue-400'} transition-colors z-10`}></div>

                                                                    <div className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border-2 transition-all ${inc.is_current == 1 ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-white border-slate-200 hover:shadow-lg hover:shadow-blue-900/5 hover:border-blue-200'}`}>
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm ${inc.is_current == 1 ? 'bg-emerald-500 text-white' : 'bg-brand-800 text-white group-hover:bg-brand-700'} transition-colors`}>
                                                                                {inc.first_name ? inc.first_name[0] : 'V'}{inc.last_name ? inc.last_name[0] : ''}
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <h4 className="font-black text-brand-800 text-[24px] italic uppercase leading-none">
                                                                                        {inc.first_name || 'VACANT'} {inc.last_name || ''}
                                                                                    </h4>
                                                                                    {inc.is_current == 1 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[12px] font-black uppercase tracking-widest border-2 border-emerald-200">Active</span>}
                                                                                </div>
                                                                                <div className="text-[15px] font-bold text-slate-400 uppercase tracking-widest">ID: {inc.TLOid}</div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-4 md:mt-0 text-left md:text-right bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl">
                                                                            <div className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 md:justify-end">
                                                                                <FiCalendar size={12} /> Tenure Period
                                                                            </div>
                                                                            <div className={`font-black uppercase tracking-tight ${inc.is_current == 1 ? 'text-emerald-600 text-[21px]' : 'text-slate-600 text-[21px]'}`}>
                                                                                {yearDisplay}
                                                                            </div>
                                                                            <div className="text-[12px] font-bold text-slate-400 uppercase mt-1">
                                                                                Updated: {new Date(inc.tenure_date).toLocaleDateString()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-10 bg-brand-800 rounded-2xl p-6 text-white flex items-center justify-between border-2 border-white/10">
                                                <div className="flex items-center gap-4">
                                                    <FiInfo size={24} className="opacity-50" />
                                                    <p className="text-[15px] font-bold uppercase tracking-wide leading-relaxed">This ledger tracks movements based on administrative updates. Promoting or reassigning an official will append a new entry to this history.</p>
                                                </div>
                                                <button
                                                    onClick={() => setShowIncumbencyModal(false)}
                                                    className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-[15px] font-black uppercase tracking-widest transition-all border-2 border-white/20"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>,
                        document.body
                    )}
    </>
  );
};

export default IncumbencyModal;
