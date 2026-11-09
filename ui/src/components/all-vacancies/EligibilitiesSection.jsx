import React from 'react';
import { Medal as FiAward } from '@phosphor-icons/react';
import { CES_STAGES } from './constants';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const EligibilitiesSection = ({
    eligibilityData,
    setEligibilityData
}) => {
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'ces_stage_date' && value) {
            const todayStr = new Date().toISOString().split('T')[0];
            if (value > todayStr) {
                return;
            }
        }

        setEligibilityData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="bg-white border-2 border-slate-200 rounded-card p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <FiAward className="text-brand-800" size={20} />
                    <h3 className="text-base font-black text-brand-800 uppercase tracking-wide">
                        4. Examination & CES Eligibilities
                    </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                    Professional licensure and Career Executive Service Board (CESB) eligibility progress credentials.
                </p>
            </div>

            {/* LET & EMT Radios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200/80 space-y-3">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                        Are you a passer of the Licensure Examination for Teachers (LET)? <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-6 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="is_let_passer"
                                checked={eligibilityData.is_let_passer === true}
                                onChange={() => setEligibilityData(prev => ({ ...prev, is_let_passer: true }))}
                                className="text-brand-800 focus:ring-brand-800"
                            />
                            <span className="text-xs font-bold text-slate-800">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="is_let_passer"
                                checked={eligibilityData.is_let_passer === false}
                                onChange={() => setEligibilityData(prev => ({ ...prev, is_let_passer: false }))}
                                className="text-brand-800 focus:ring-brand-800"
                            />
                            <span className="text-xs font-bold text-slate-800">No</span>
                        </label>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200/80 space-y-3">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                        Are you a passer of the Educational Management Test (EMT)? <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-6 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="is_emt_passer"
                                checked={eligibilityData.is_emt_passer === true}
                                onChange={() => setEligibilityData(prev => ({ ...prev, is_emt_passer: true }))}
                                className="text-brand-800 focus:ring-brand-800"
                            />
                            <span className="text-xs font-bold text-slate-800">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="is_emt_passer"
                                checked={eligibilityData.is_emt_passer === false}
                                onChange={() => setEligibilityData(prev => ({ ...prev, is_emt_passer: false }))}
                                className="text-brand-800 focus:ring-brand-800"
                            />
                            <span className="text-xs font-bold text-slate-800">No</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* CES Eligibility Stage & Stage Date */}
            <div className="space-y-4 pt-2">
                <div>
                    <FloatingLabelInput as="select" label="What is the highest stage of the Career Executive Service (CES) eligibility process that you have passed/completed?" requiredMark className="w-full" name="ces_eligibility_stage" value={eligibilityData.ces_eligibility_stage || 'Stage 1 (CES Written Examination)'} onChange={handleChange}>
                        {CES_STAGES.map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                        ))}
                    </FloatingLabelInput>
                </div>

                <div>
                    <FloatingLabelInput label="Date Appointed/Conferred/Passed the CESO/CES eligibility process [Highest Stage]" className="w-full" type="date" name="ces_stage_date" max={new Date().toISOString().split('T')[0]} value={eligibilityData.ces_stage_date || ''} onChange={handleChange} />
                    <span className="text-[10px] text-slate-400 block mt-1">Cannot be a future date</span>
                </div>
            </div>
        </div>
    );
};

export default EligibilitiesSection;

