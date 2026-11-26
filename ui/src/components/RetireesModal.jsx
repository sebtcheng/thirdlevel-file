import React, { useState, useEffect, useMemo } from 'react';
import { X as FiX, Medal as FiAward, Calendar as FiCalendar, CaretDown as FiChevronDown } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';
import { groupRetireesByYear } from '../utils/retireeGroups';
import RetireeRow from './anticipated-vacancies/RetireeRow';

const RetireesModal = ({ isOpen, onClose, retirees = [], applicationsThisMonth = [], elementsThisMonth = [] }) => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const yearGroups = useMemo(() => groupRetireesByYear(retirees), [retirees]);

  useEffect(() => {
    if (selectedOfficial && selectedOfficial.separationReason !== 'Mandatory Retirement') {
      setLoadingRemarks(true);
      fetch(apiUrl(`/api/third-level/officials-registry/officials/${selectedOfficial.TLOid}/last-vacate-update`), {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) setRemarks(data.data.remarks || 'No remarks provided.');
        else setRemarks('No remarks provided.');
        setLoadingRemarks(false);
      })
      .catch(() => { setRemarks('Error loading remarks.'); setLoadingRemarks(false); });
    } else {
      setRemarks('Mandatory Retirement');
    }
  }, [selectedOfficial, token]);

  // z-[120]: above the app top bar, which is z-[110].
  return (
    <AnimatePresence>
      {(isOpen && user?.role === 'Central Office') && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="anticipated-vacancies-title"
            className="bg-white rounded-card shadow-2xl w-full max-w-3xl max-h-[80dvh] sm:max-h-[75dvh] flex flex-col overflow-hidden"
          >
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-4 sm:px-6 py-5 flex justify-between items-center gap-3 text-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 p-2 rounded-xl flex-shrink-0">
              <FiAward size={26} className="text-yellow-400" />
            </div>
            <div className="min-w-0">
              <h2 id="anticipated-vacancies-title" className="text-[24px] font-bold leading-tight">Anticipated Vacancies</h2>
              <p className="text-[15px] text-blue-100 mt-0.5">
                {retirees.length} personnel retiring within 5 years
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close anticipated vacancies"
            className="p-2 bg-white/10 hover:bg-red-600 rounded-xl transition-colors text-white flex-shrink-0"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {retirees.length > 0 ? (
            yearGroups.map(({ label, officials }) => (
              <section key={label} aria-label={label}>
                <div className="sticky top-0 z-10 bg-slate-50 px-4 sm:px-6 py-2 flex items-baseline justify-between gap-4">
                  <h3 className="font-heading font-bold text-[17px] text-blue-800">{label}</h3>
                  <span className="text-[15px] text-slate-500">{officials.length} retiring</span>
                </div>
                <ul className="divide-y divide-slate-200">
                  {officials.map(official => (
                    <li key={official.TLOid}>
                      <RetireeRow official={official} onSelect={setSelectedOfficial} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <FiAward className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-[20px] font-bold text-brand-800">No Anticipated Vacancies</h3>
              <p className="text-[15px] text-slate-500 mt-2">There are no personnel retiring within the next 5 years.</p>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-4 sm:px-6 py-4 border-t border-slate-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-colors shadow-sm text-[15px]"
          >
            Acknowledge
          </button>
        </div>
      </motion.div>

      {/* INNER MODAL FOR DETAILS */}
      <AnimatePresence>
        {selectedOfficial && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-card w-full max-w-xl shadow-2xl border-2 border-slate-200"
              >
                <div className="p-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <span className="text-[15px] font-black text-brand-700 uppercase tracking-widest mb-2 block">Administrative Action</span>
                            <h2 className="text-[45px] font-black text-brand-800 tracking-tighter uppercase italic leading-none">
                                VACATING OFFICIAL
                            </h2>
                            <p className="text-slate-400 text-[21px] font-bold mt-2">
                                {selectedOfficial.first_name} {selectedOfficial.last_name}
                            </p>
                        </div>
                        <button onClick={() => setSelectedOfficial(null)} className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 transition-all border-2 border-slate-200">
                            <FiX size={22} />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="mb-4">
                            <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Date of Effectivity</label>
                            <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-5 text-[21px] font-bold text-slate-700 flex justify-between items-center cursor-not-allowed">
                                <span>{selectedOfficial.separationDate ? new Date(selectedOfficial.separationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                                <FiCalendar className="text-slate-400" size={20} />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Reason for Vacating</label>
                            <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-5 text-[21px] font-bold text-slate-700 flex justify-between items-center cursor-not-allowed">
                                <span>{selectedOfficial.separationReason?.split(' - ')[1] || selectedOfficial.separationReason || 'N/A'}</span>
                                <FiChevronDown className="text-slate-400" size={20} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Justification / Remarks</label>
                            <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-5 text-[21px] font-bold text-slate-700 min-h-[100px] cursor-not-allowed">
                                {loadingRemarks ? 'Loading...' : remarks}
                            </div>
                        </div>
                    </div>
                </div>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RetireesModal;
