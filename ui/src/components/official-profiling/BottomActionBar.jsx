import { Shield as FiShield, FloppyDisk as FiSave, SpinnerGap as FiLoader } from '@phosphor-icons/react';

const BottomActionBar = ({ handleSave, isEditing, saving }) => {
  return (
    <>
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t-2 border-slate-200 p-3 shadow-[0_-4px_20px_rgb(var(--rgb-heading)/0.1)] lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:z-20 lg:bg-white lg:py-4 lg:px-8 lg:shadow-none flex items-center justify-between shrink-0">
                            <span className="text-[15px] font-bold text-slate-400 uppercase tracking-widest hidden sm:flex items-center gap-2">
                                <FiShield className="text-emerald-500" size={16} /> Securely stored in DepEd database
                            </span>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <span className="text-[15px] font-bold text-slate-400 uppercase tracking-widest sm:hidden flex items-center gap-1.5">
                                    <FiShield className="text-emerald-500" size={16} /> Protected
                                </span>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !isEditing}
                                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-brand-800 hover:bg-blue-800 text-white font-black text-[15px] uppercase tracking-widest rounded-lg shadow-md hover:shadow-lg transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? <FiLoader className="animate-spin" size={16} /> : <FiSave size={16} />}
                                    {saving ? 'Saving...' : 'Save Progress'}
                                </button>
                            </div>
                        </div>
    </>
  );
};

export default BottomActionBar;
