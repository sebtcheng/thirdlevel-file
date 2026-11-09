import React from 'react';
import { User as FiUser, List as FiList } from '@phosphor-icons/react';
import { TABS } from './constants';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const MobileToggleBar = ({ dataSource, isTabCompleted, setIsMobileMenuOpen, setTab, tab }) => {
  return (
    <>
                        <div className="lg:hidden flex flex-col gap-2.5 bg-white/90 backdrop-blur-md border-b-2 border-slate-200 p-3.5 shadow-sm shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-brand-800/10 flex items-center justify-center text-brand-800">
                                        {React.createElement(TABS.find(t => t.id === tab)?.icon || FiUser, { size: 16 })}
                                    </div>
                                    <div>
                                        <p className="text-[13.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">Active Section</p>
                                        <p className="text-[18px] font-black text-brand-800 uppercase tracking-wider mt-0.5">{TABS.find(t => t.id === tab)?.label}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-800/10 hover:bg-brand-800/20 text-brand-800 text-[18px] font-black rounded-lg transition-all border-2 border-brand-700/10"
                                >
                                    <FiList size={14} /> Full Menu
                                </button>
                            </div>
                            {/* Mobile Section Selection Dropdown */}
                            <div className="w-full">
                                <FloatingLabelInput as="select" label="Section" className="w-full" value={tab} onChange={(e) => setTab(e.target.value)}>
                                    {TABS.filter(t => dataSource !== 'masterlist' || t.id !== 'application').map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.label} {isTabCompleted(t.id) ? '✓' : ''}
                                        </option>
                                    ))}
                                </FloatingLabelInput>
                            </div>
                        </div>
    </>
  );
};

export default MobileToggleBar;
