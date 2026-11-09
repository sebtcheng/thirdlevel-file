import React, { useState, useEffect } from 'react';
import { X as FiX, Medal as FiAward, SignOut as FiLogOut, WarningCircle as FiAlertCircle, Calendar as FiCalendar, CaretDown as FiChevronDown, User as FiUser, Users as FiUsers, FileText as FiFileText } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';

const RetireesModal = ({ isOpen, onClose, retirees = [], applicationsThisMonth = [], elementsThisMonth = [] }) => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [activeTab, setActiveTab] = useState('retirees');

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

  return (
    <AnimatePresence>
      {(isOpen && user?.role === 'Central Office') && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white rounded-card shadow-2xl w-full max-w-2xl overflow-hidden"
          >
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 flex justify-between items-center text-white border-b-2 border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <FiAward size={26} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-[30px] font-black tracking-tight leading-none">Anticipated Vacancies</h2>
              <p className="text-[18px] text-blue-200 font-bold uppercase tracking-widest mt-1">
                Personnel Retiring Within 5 Years
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-red-500 rounded-xl transition-colors text-white"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="bg-slate-50 border-b-2 border-slate-100 px-6 py-2 flex gap-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('retirees')}
            className={`px-4 py-2 rounded-xl text-[18px] font-black uppercase tracking-widest transition-all ${activeTab === 'retirees' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
          >
            Anticipated Vacancies <span className="ml-1 bg-white/50 px-1.5 py-0.5 rounded-md text-[15px]">{retirees.length}</span>
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'retirees' && (
            retirees.length > 0 ? (
              <div className="space-y-3">
                {retirees.map(official => (
                  <div 
                    key={official.TLOid} 
                    className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-4 cursor-pointer"
                    onClick={() => setSelectedOfficial(official)}
                  >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-[24px] border-2 border-white shadow-sm flex-shrink-0">
                    {official.first_name?.[0] || ''}{official.last_name?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 truncate text-[24px] leading-tight">
                        {official.first_name} {official.last_name}
                      </h3>
                      {official.separationReason && (
                         <span className="text-[15px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-widest flex-shrink-0 max-w-[200px] truncate inline-block align-middle" title={official.separationReason}>
                           {official.separationReason}
                         </span>
                      )}
                      {official.isTurning65 && (
                         <span className="text-[15px] font-black px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 uppercase tracking-widest flex-shrink-0">
                           Turns 65
                         </span>
                      )}
                    </div>
                    <p className="text-[21px] text-slate-500 font-medium truncate mt-0.5">
                      {official.position_title || 'Unassigned'} • {official.office || 'No Office'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                     <div className="text-[15px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1 mb-1">
                        <FiLogOut size={15} /> Effectivity Date
                     </div>
                     <div className="text-[21px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-right">
                       {official.separationDate ? new Date(official.separationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                       {official.separationDate && new Date(official.separationDate) > new Date() ? (
                         <span className="block text-[13.5px] text-blue-500 uppercase mt-0.5">Upcoming</span>
                       ) : (
                         <span className="block text-[13.5px] text-green-600 uppercase mt-0.5">Completed</span>
                       )}
                     </div>
                  </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                <FiAward className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-[30px] font-black text-brand-800 uppercase tracking-tighter">No Anticipated Vacancies</h3>
                <p className="text-[21px] font-bold text-slate-400 mt-2">There are no personnel retiring within the next 5 years.</p>
              </div>
            )
          )}

        </div>
        
        <div className="bg-slate-50 p-4 border-t-2 border-slate-100 flex justify-end rounded-b-3xl">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl transition-colors shadow-sm text-[21px]"
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
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
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
