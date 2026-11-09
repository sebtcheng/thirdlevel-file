import { motion } from '../../utils/staticElements.jsx';
import { User as FiUser, CaretLeft as FiChevronLeft, Lock as FiLock } from '@phosphor-icons/react';
import { apiUrl } from '../../utils/api';

const HeaderBanner = ({ TLOid, applicationId, applicationStatus, completeness, fullName, handleEditToggle, isEditing, isTlo, logout, navigate, profile }) => {
  return (
    <>
                <div className="bg-brand-800 text-white relative overflow-hidden shadow-lg border-b-2 border-brand-700/20 py-6 px-6 lg:px-8 shrink-0">
                    <div className="absolute -top-[100%] right-[-10%] w-[50%] h-[300%] bg-brand-700 rounded-lg opacity-90 pointer-events-none transform rotate-12 z-0"></div>
                    <div className="max-w-[1400px] mx-auto flex flex-col gap-6 relative z-10">
                        {/* Top Navigation Row */}
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-6">
                                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-300 hover:text-white font-bold text-[15px] uppercase tracking-wider transition-all">
                                    <FiChevronLeft size={16} /> Back
                                </button>
                            </div>
                            <div className="flex items-center gap-4">
                                {!isTlo && (
                                    <button onClick={handleEditToggle} className={`px-5 py-2 font-bold rounded-full text-[15px] uppercase tracking-widest transition-all hidden sm:block border ${!isEditing ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400 border-yellow-600 shadow-md' : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border-blue-500/30'}`}>
                                        {isEditing ? "Cancel Edit" : "Edit Profile"}
                                    </button>
                                )}
                                <button onClick={logout} className="flex items-center gap-2 text-slate-300 hover:text-red-400 font-bold text-[15px] uppercase tracking-wider transition-all">
                                    <FiLock size={14} /> Sign Out
                                </button>
                            </div>
                        </div>
                        {!isTlo && (
                            <div className="sm:hidden flex items-center justify-end w-full mt-2">
                                <button onClick={handleEditToggle} className={`px-5 py-2 font-bold rounded-full text-[15px] uppercase tracking-widest transition-all border ${!isEditing ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400 border-yellow-600 shadow-md' : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border-blue-500/30'}`}>
                                    {isEditing ? "Cancel Edit" : "Edit Profile"}
                                </button>
                            </div>
                        )}

                        {/* Profile Info Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                            {/* Left: Avatar + Profile Info */}
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="relative shrink-0">
                                    <div className="w-[56px] h-[56px] md:w-[72px] md:h-[72px] bg-white/10 rounded-full flex items-center justify-center text-white/60 border border-white/20 shadow-lg shadow-black/10 overflow-hidden">
                                        {profile.photo_binary_id ? (
                                            <img src={apiUrl(`/api/binary/${profile.photo_binary_id}`)} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <FiUser size={30} className="md:hidden" />
                                                <FiUser size={36} className="hidden md:block" />
                                            </>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 md:w-4 md:h-4 bg-emerald-400 rounded-full border-[2px] md:border-[2.5px] border-brand-900 shadow-sm" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="person-title text-xl md:text-2xl lg:text-3xl text-white tracking-tight leading-none truncate">{fullName}</h1>
                                        {applicationStatus && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gold text-brand-800 text-[12px] md:text-[13.5px] font-black uppercase tracking-wider rounded-full shadow-sm">
                                                <span className="w-1 h-1 bg-brand-800 rounded-full" />
                                                {applicationStatus === 'under_review' ? 'In Review' : applicationStatus === 'approved' ? 'Approved' : applicationStatus === 'disapproved' ? 'Denied' : 'Draft'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-blue-200/80 text-[18px] md:text-[21px] font-medium mt-1 truncate flex items-center gap-2">
                                        <span>{profile.position_title || 'No position selected'}{(profile.designation && profile.designation !== profile.position_title) ? ` - ${profile.designation}` : ''}</span>
                                        {profile.is_oic && <span className="px-1.5 py-0.5 rounded bg-gold text-brand-800 text-[12px] font-black uppercase tracking-widest leading-none">OIC</span>}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-blue-300/60 text-[13.5px] md:text-[16.5px] font-medium">
                                        {TLOid && (
                                            <span className="flex items-center gap-1">
                                                • {TLOid}
                                            </span>
                                        )}
                                        {applicationId && (
                                            <>
                                                <span className="opacity-30">·</span>
                                                <span className="flex items-center gap-1">
                                                    APP-{String(applicationId).padStart(4, '0')}
                                                </span>
                                            </>
                                        )}
                                        {TLOid && <span className="opacity-30">·</span>}
                                        <span className="flex items-center gap-1">
                                            Applied {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        {profile.updated_at && <span className="opacity-30">·</span>}
                                        {profile.updated_at && (
                                            <span className="flex items-center gap-1">
                                                Last Updated: {new Date(profile.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Progress Card */}
                            <div className="shrink-0">
                                <div className="w-40 bg-brand-700 border border-white/5 rounded-2xl p-3 shadow-lg flex flex-col justify-center">
                                    <p className="text-slate-400 text-[12px] font-black uppercase tracking-widest leading-none">Progress</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-gold font-black text-[27px] leading-none">{completeness}%</p>
                                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${completeness}%` }}
                                                className="h-full bg-gold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    </>
  );
};

export default HeaderBanner;
