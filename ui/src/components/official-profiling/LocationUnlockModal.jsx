import { motion, AnimatePresence } from '../../utils/staticElements.jsx';
import { Warning as FiAlertTriangle, LockOpen as FiUnlock } from '@phosphor-icons/react';

const LocationUnlockModal = ({ profile, setIsLocationLocked, setShowLocationUnlockModal, showLocationUnlockModal }) => {
  return (
    <>
                        <AnimatePresence>
                            {showLocationUnlockModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border-2 border-slate-200 shadow-2xl space-y-5 relative"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border-2 border-amber-200">
                                                <FiAlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <h3 className="modal-title text-[27px] text-slate-800 tracking-tight">Confirm Location Change</h3>
                                                <p className="text-[16.5px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Location Access Verification</p>
                                            </div>
                                        </div>
                                        <p className="text-[18px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                                            Are you sure you want to unlock and modify your Region and Division? Changing these fields may alter your profile assignment and jurisdiction.
                                        </p>
                                        <div className="flex items-center justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowLocationUnlockModal(false)}
                                                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-[18px] hover:bg-slate-100 transition-all active:scale-95"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsLocationLocked(false);
                                                    setShowLocationUnlockModal(false);
                                                }}
                                                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[18px] uppercase tracking-wider transition-all shadow-md shadow-amber-600/20 active:scale-95 flex items-center gap-2"
                                            >
                                                <FiUnlock size={16} /> Yes, Unlock
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
    </>
  );
};

export default LocationUnlockModal;
