import React from 'react';

const FormTabs = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="bg-white border-2 border-slate-200 rounded-card p-2 shadow-sm">
            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar gap-2">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={`py-3 px-4 sm:px-5 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-2.5 transition-all whitespace-nowrap cursor-pointer shrink-0 rounded-t-xl ${
                                isActive
                                    ? 'border-brand-800 text-brand-800 bg-blue-50/70 shadow-xs'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            {Icon && (
                                <Icon size={16} className={isActive ? 'text-brand-800' : 'text-slate-400'} />
                            )}
                            <span>{tab.label}</span>
                            {tab.isComplete && (
                                <span
                                    className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                                    title="Section complete"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default FormTabs;

