import { motion } from '../../utils/staticElements.jsx';
import { User as FiUser, CaretLeft as FiChevronLeft, Lock as FiLock } from '@phosphor-icons/react';
import { apiUrl } from '../../utils/api';

const HeaderBanner = ({ TLOid, applicationId, applicationStatus, completeness, fullName, handleEditToggle, isEditing, isTlo, logout, navigate, profile }) => {
  return (
    <>
                <div className="bg-brand-800 text-white relative overflow-hidden shadow-lg border-b-2 border-brand-700/20 py-3 px-4 sm:px-6 xl:px-0 shrink-0">
                    <div className="absolute -top-[100%] right-[-10%] w-[50%] h-[300%] bg-brand-700 rounded-lg opacity-90 pointer-events-none transform rotate-12 z-0"></div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 relative z-10 xl:flex-nowrap xl:gap-0">
                        {/* Back sits above the sidebar; the rest lines up with the form below. */}
                        <div className="xl:w-[260px] xl:shrink-0 xl:px-5">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-300 hover:text-white font-bold text-[13px] uppercase tracking-wider transition-all">
                                <FiChevronLeft size={16} /> Back
                            </button>
                        </div>
                        <div className="contents xl:block xl:min-w-0 xl:flex-1 xl:px-6">
                            <div className="contents xl:mx-auto xl:flex xl:w-full xl:max-w-[1400px] xl:items-center xl:gap-5">
                            {/* Left: Avatar + Profile Info */}
                            <div className="order-2 flex w-full sm:w-[calc(100%-11rem)] items-center gap-4 min-w-0 xl:order-none xl:w-auto xl:flex-1">
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 rounded-full flex items-center justify-center text-white/60 border border-white/20 shadow-lg shadow-black/10 overflow-hidden">
                                        {profile.photo_binary_id ? (
                                            <img src={apiUrl(`/api/binary/${profile.photo_binary_id}`)} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <FiUser size={24} className="md:hidden" />
                                                <FiUser size={28} className="hidden md:block" />
                                            </>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 md:w-4 md:h-4 bg-emerald-400 rounded-full border-[2px] md:border-[2.5px] border-brand-900 shadow-sm" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="person-title text-xl md:text-2xl text-white tracking-tight leading-tight break-words">{fullName}</h1>
                                        {applicationStatus && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gold text-brand-800 text-[12px] font-black uppercase tracking-wider rounded-full shadow-sm">
                                                <span className="w-1 h-1 bg-brand-800 rounded-full" />
                                                {applicationStatus === 'under_review' ? 'In Review' : applicationStatus === 'approved' ? 'Approved' : applicationStatus === 'disapproved' ? 'Denied' : 'Draft'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-blue-200/80 text-[15px] font-medium mt-0.5 leading-snug">
                                        <span>{profile.position_title || 'No position selected'}{(profile.designation && profile.designation !== profile.position_title) ? ` - ${profile.designation}` : ''}</span>
                                        {profile.is_oic && <span className="ml-2 inline-block align-middle px-1.5 py-0.5 rounded bg-gold text-brand-800 text-[12px] font-black uppercase tracking-widest leading-none">OIC</span>}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-blue-300/60 text-[13px] font-medium">
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
                            <div className="order-3 shrink-0 xl:order-none">
                                <div className="w-40 bg-brand-700 border border-white/5 rounded-2xl px-3 py-2 shadow-lg flex flex-col justify-center">
                                    <p className="text-blue-100 text-[12px] font-black uppercase tracking-widest leading-none">Progress</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-gold font-black text-[20px] leading-none">{completeness}%</p>
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

                                <div className="order-1 ml-auto flex shrink-0 items-center gap-3 xl:order-none xl:ml-0">
                                    {!isTlo && (
                                        <button onClick={handleEditToggle} className={`px-4 py-2 font-bold rounded-full text-[13px] uppercase tracking-widest transition-all border ${!isEditing ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400 border-yellow-600 shadow-md' : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border-blue-500/30'}`}>
                                            {isEditing ? "Cancel Edit" : "Edit Profile"}
                                        </button>
                                    )}
                                    <button onClick={logout} className="flex items-center gap-2 text-slate-300 hover:text-red-400 font-bold text-[13px] uppercase tracking-wider transition-all">
                                        <FiLock size={14} /> Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    </>
  );
};

export default HeaderBanner;
