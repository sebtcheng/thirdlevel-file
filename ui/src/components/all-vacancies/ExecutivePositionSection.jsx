import React from 'react';
import { Briefcase as FiBriefcase, MapPin as FiMapPin } from '@phosphor-icons/react';
import { EXECUTIVE_POSITIONS, DEPED_REGIONS } from './constants';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const ExecutivePositionSection = ({
    fieldErrors = [],
    appliedPosition,
    setAppliedPosition,
    targetRegion,
    setTargetRegion
}) => {
    return (
        <div className="bg-white border-2 border-slate-200 rounded-card p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <FiBriefcase className="text-brand-800" size={20} />
                    <h3 className="text-base font-black text-brand-800 uppercase tracking-wide">
                        1. Target Executive Designation & Region
                    </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                    Select one of the four sanctioned Third Level Executive designations and your target deployment region. Submissions are processed through the general executive pool and do not require selecting an individual plantilla item.
                </p>
            </div>

            {/* Target Executive Position Dropdown */}
            <div className="space-y-2">
                <FloatingLabelInput as="select" id="timon-position" error={fieldErrors.find((er) => er.id === 'timon-position')?.message} label="Target Executive Position" requiredMark icon={<FiBriefcase size={18} />} className="w-full" value={appliedPosition} onChange={e => setAppliedPosition(e.target.value)}>
                        <option value="">Select target executive position...</option>
                        {EXECUTIVE_POSITIONS.map(pos => (
                            <option key={pos.code} value={pos.code}>
                                {pos.title}
                            </option>
                        ))}
                    </FloatingLabelInput>
            </div>

            {/* Target Region Dropdown */}
            <div className="space-y-2 pt-2">
                <FloatingLabelInput as="select" id="timon-region" error={fieldErrors.find((er) => er.id === 'timon-region')?.message} label="Target DepEd Region" requiredMark icon={<FiMapPin size={18} />} className="w-full" value={targetRegion} onChange={e => setTargetRegion(e.target.value)}>
                        <option value="">Select target DepEd region...</option>
                        {DEPED_REGIONS.map(reg => (
                            <option key={reg} value={reg}>
                                {reg}
                            </option>
                        ))}
                    </FloatingLabelInput>
            </div>
        </div>
    );
};

export default ExecutivePositionSection;

