import React from 'react';
import { Briefcase as FiBriefcase } from '@phosphor-icons/react';
import { DESIGNATION_PRESETS } from './constants';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const DesignationOICSection = ({
    fieldErrors = [],
    designationData,
    setDesignationData
}) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setDesignationData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="bg-white border-2 border-slate-200 rounded-card p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <FiBriefcase className="text-brand-800" size={20} />
                    <h3 className="text-base font-black text-brand-800 uppercase tracking-wide">
                        3. Third Level Designation & OIC Assignment
                    </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                    Current executive designation or interim officer-in-charge responsibilities within DepEd or affiliated agencies.
                </p>
            </div>

            {/* Current Designation to Third Level */}
            <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    What is your current designation to a third level position? <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 block mb-3 font-medium">
                    [For others, input full designation. Do not abbreviate]
                </span>

                <div className="space-y-2.5">
                    {DESIGNATION_PRESETS.map((option) => (
                        <label
                            key={option}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                designationData.current_designation_preset === option
                                    ? 'bg-blue-50/70 border-brand-800 text-brand-800 shadow-sm'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                            <input
                                type="radio"
                                name="current_designation_preset"
                                value={option}
                                checked={designationData.current_designation_preset === option}
                                onChange={handleChange}
                                className="mt-0.5 text-brand-800 focus:ring-brand-800"
                            />
                            <span className="text-xs font-bold leading-relaxed">{option}</span>
                        </label>
                    ))}
                </div>

                {designationData.current_designation_preset === 'Other' && (
                    <div className="mt-3">
                        <FloatingLabelInput error={fieldErrors.find((er) => er.id === 'field-current_designation_custom')?.message} label="Specify Designation" className="w-full" type="text" name="current_designation_custom" value={designationData.current_designation_custom || ''} onChange={handleChange} placeholder="Input full designation (do not abbreviate)" required />
                    </div>
                )}
            </div>

            {/* Assigned OIC Office */}
            <div className="pt-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Assigned Schools Division Office as designated OIC
                </label>
                <span className="text-[11px] text-slate-500 block mb-2 font-medium">
                    [i.e. SDO-Pasig City; SDO-Cebu City; Regional Office; For non-DepEd, include Agency and Office Assignment]
                </span>
                <FloatingLabelInput label="e.g. SDO-Manila (or leave blank if N/A)" className="w-full" type="text" name="assigned_oic_office" value={designationData.assigned_oic_office || ''} onChange={handleChange} placeholder="e.g. SDO-Manila (or leave blank if N/A)" />
            </div>
        </div>
    );
};

export default DesignationOICSection;

