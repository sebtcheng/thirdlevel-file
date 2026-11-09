import React from 'react';
import { User as FiUser, CaretRight as FiChevronRight, CheckCircle as FiCheckCircle, Lock as FiLock } from '@phosphor-icons/react';
import { TABS } from './constants';

const Sidebar = ({ completeness, dataSource, isTabCompleted, setTab, tab }) => {
  return (
    <>
                    <aside className="hidden lg:flex flex-col bg-transparent border-r border-slate-200/80 w-[260px] h-full shrink-0 pt-6 overflow-hidden">
                        {/* Talent Portal Branding */}
                        <div className="px-5 pt-2 pb-4 border-b-2 border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brand-800/10 rounded-xl flex items-center justify-center text-brand-800">
                                    <FiUser size={20} />
                                </div>
                                <div>
                                    <p className="text-[21px] font-black text-brand-800 leading-tight">Talent Portal</p>
                                    <p className="text-[15px] font-medium text-slate-400">Applicant Workspace</p>
                                </div>
                            </div>
                        </div>
                        {/* Navigation */}
                        <div className="p-4 flex-1 overflow-y-auto thin-scrollbar">
                            <p className="px-3 py-2 text-[13.5px] font-bold text-slate-400 uppercase tracking-[0.2em]">Profile Sections</p>
                            <div className="space-y-1">
                                {TABS.filter(t => dataSource !== 'masterlist' || t.id !== 'application').map(t => {
                                    const isLocked = t.id === 'application' && completeness < 100;
                                    const active = tab === t.id;
                                    const completed = isTabCompleted(t.id);
                                    return (
                                        <React.Fragment key={t.id}>
                                            {t.id === 'application' && <div className="my-3 border-t-2 border-slate-100 mx-3" />}
                                            <button
                                                disabled={isLocked}
                                                onClick={() => !isLocked && setTab(t.id)}
                                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-[16.5px] font-bold transition-all
                                                    ${active ? 'bg-brand-800 text-white shadow-md shadow-blue-900/20' : 'text-slate-505 text-slate-500 hover:bg-transparent hover:text-slate-800'}
                                                    ${isLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                                            >
                                                <span className="flex items-center gap-3 min-w-0">
                                                    {React.createElement(t.icon, { size: 16, className: "shrink-0" })}
                                                    <span className="truncate">{t.label}</span>
                                                </span>
                                                {isLocked ? (
                                                    <FiLock size={12} className="shrink-0 opacity-50" />
                                                ) : completed ? (
                                                    <FiCheckCircle size={13} className={active ? 'text-emerald-300' : 'text-emerald-500'} />
                                                ) : active ? (
                                                    <FiChevronRight size={14} className="shrink-0 text-white" />
                                                ) : null}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>
    </>
  );
};

export default Sidebar;
