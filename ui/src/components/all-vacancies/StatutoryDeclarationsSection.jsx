import React from 'react';
import { Shield as FiShield } from '@phosphor-icons/react';

const STATUTORY_QUESTIONS = [
    {
        key: 'pending_admin_case',
        label: '1. Do you have any pending administrative case/s filed against you?'
    },
    {
        key: 'guilty_admin_details',
        label: '2. Have you ever been found guilty of any administrative offense?'
    },
    {
        key: 'criminally_charged_details',
        label: '3. Have you been criminally charged before any regular court or tribunal?'
    },
    {
        key: 'convicted_crime_details',
        label: '4. Have you ever been convicted of any crime or violation of any law, decree, or ordinance?'
    }
];

const StatutoryDeclarationsSection = ({
    statutoryData,
    setStatutoryData
}) => {
    const handleToggle = (key, val) => {
        setStatutoryData(prev => ({
            ...prev,
            [key]: val
        }));
    };

    return (
        <div className="bg-white border-2 border-slate-200 rounded-card p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <FiShield className="text-brand-800" size={20} />
                    <h3 className="text-base font-black text-brand-800 uppercase tracking-wide">
                        6. Statutory Civil Service Background Disclosures
                    </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                    Standard background disclosures required for presidential and executive appointment consideration.
                </p>
            </div>

            <div className="space-y-3.5">
                {STATUTORY_QUESTIONS.map(item => {
                    const currentVal = statutoryData[item.key] || 'No';
                    return (
                        <div
                            key={item.key}
                            className="p-4 rounded-2xl bg-slate-50/70 border-2 border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                            <span className="text-xs font-bold text-slate-700 max-w-xl leading-relaxed">
                                {item.label}
                            </span>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {['No', 'Yes'].map(opt => {
                                    const isSelected = currentVal === opt;
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => handleToggle(item.key, opt)}
                                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                                isSelected
                                                    ? opt === 'Yes'
                                                        ? 'bg-amber-600 text-white shadow-sm'
                                                        : 'bg-brand-800 text-white shadow-sm'
                                                    : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StatutoryDeclarationsSection;

