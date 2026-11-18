import React, { useEffect, useState } from 'react';
import { Briefcase as FiBriefcase, MapPin as FiMapPin } from '@phosphor-icons/react';
import { DEPED_REGIONS, getDivisionOptions } from './constants';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';
import { useAuth } from '../../context/AuthContext';
import { fetchLookupJson } from '../../utils/lookupCache';

const DesignationOICSection = ({
    fieldErrors = [],
    designationData,
    setDesignationData
}) => {
    const { token } = useAuth();
    const [regionDivisions, setRegionDivisions] = useState({});
    const [masterlistPositions, setMasterlistPositions] = useState([]);

    useEffect(() => {
        let alive = true;
        const authToken = token || localStorage.getItem('token');
        const load = async () => {
            try {
                // Shared, de-duplicated requests (see utils/lookupCache.js); /positions is also used by section 2.
                const [data, posData] = await Promise.all([
                    fetchLookupJson('/api/third-level/official-profiling/positions', { token: authToken }),
                    fetchLookupJson('/api/third-level/official-profiling/masterlist-positions', { token: authToken })
                ]);
                if (!alive) return;
                if (data.success) setRegionDivisions(data.regionDivisions || {});
                if (posData.success) setMasterlistPositions(posData.positions || []);
            } catch (err) {
                if (alive) console.error('Failed to load region/division lookups', err);
            }
        };
        load();
        return () => { alive = false; };
    }, [token]);

    const handleOicRegionChange = (e) => {
        setDesignationData(prev => ({ ...prev, assigned_oic_region: e.target.value, assigned_oic_division: '', assigned_oic_office: '' }));
    };

    const handleOicDivisionChange = (e) => {
        setDesignationData(prev => ({ ...prev, assigned_oic_division: e.target.value, assigned_oic_office: e.target.value }));
    };

    // Region keys come from the masterlist in whatever casing it holds ("REGION II"), so match case-insensitively.
    const oicDivisionOptions = getDivisionOptions(regionDivisions, designationData.assigned_oic_region);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDesignationData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const isAssigned = designationData.is_assigned_third_level === 'Yes';
    const currentDesignation = designationData.current_designation_preset;
    const designationMatch = currentDesignation
        ? masterlistPositions.find(p => p.toUpperCase() === currentDesignation.toUpperCase())
        : null;
    const designationOptions = currentDesignation && currentDesignation !== 'N/A' && !designationMatch
        ? [currentDesignation, ...masterlistPositions]
        : masterlistPositions;
    const designationValue = designationMatch || (currentDesignation === 'N/A' ? '' : (currentDesignation || ''));

    // Answering "No" clears the gated answers so a stale designation/OIC is never submitted.
    const handleAssignedChange = (e) => {
        const value = e.target.value;
        setDesignationData(prev => value === 'Yes'
            ? { ...prev, is_assigned_third_level: 'Yes' }
            : {
                ...prev,
                is_assigned_third_level: 'No',
                current_designation_preset: 'N/A',
                current_designation_custom: '',
                designation_capacity: '',
                assigned_oic_region: '',
                assigned_oic_division: '',
                assigned_oic_office: ''
            });
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

            {/* Gating question */}
            <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Are you currently assigned to a third level position? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                    {['Yes', 'No'].map((option) => (
                        <label
                            key={option}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                designationData.is_assigned_third_level === option
                                    ? 'bg-blue-50/70 border-brand-800 text-brand-800 shadow-sm'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                            <input
                                type="radio"
                                name="is_assigned_third_level"
                                value={option}
                                checked={designationData.is_assigned_third_level === option}
                                onChange={handleAssignedChange}
                                className="text-brand-800 focus:ring-brand-800"
                            />
                            <span className="text-xs font-bold">{option}</span>
                        </label>
                    ))}
                </div>
            </div>

            {isAssigned && (<>
            {/* Current Designation to Third Level */}
            <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    In what capacity are you assigned? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    {['Officer-in-Charge (OIC)', 'Full-Fledged'].map((option) => (
                        <label
                            key={option}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                designationData.designation_capacity === option
                                    ? 'bg-blue-50/70 border-brand-800 text-brand-800 shadow-sm'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                            <input
                                type="radio"
                                name="designation_capacity"
                                value={option}
                                checked={designationData.designation_capacity === option}
                                onChange={handleChange}
                                className="text-brand-800 focus:ring-brand-800"
                            />
                            <span className="text-xs font-bold">{option}</span>
                        </label>
                    ))}
                </div>
                {fieldErrors.find((er) => er.id === 'field-designation_capacity') && (
                    <p className="text-xs font-semibold text-danger-700">{fieldErrors.find((er) => er.id === 'field-designation_capacity').message}</p>
                )}
            </div>

            <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    What is your current designation to a third level position? <span className="text-rose-500">*</span>
                </label>
                <FloatingLabelInput as="select" error={fieldErrors.find((er) => er.id === 'field-current_designation_preset')?.message} label="Current Designation" icon={<FiBriefcase size={18} />} className="w-full" name="current_designation_preset" value={designationValue} onChange={handleChange}>
                    <option value="">Select designation...</option>
                    {designationOptions.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                    ))}
                </FloatingLabelInput>
            </div>

            {/* Assigned OIC Office */}
            <div className="-mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingLabelInput as="select" label="Region" icon={<FiMapPin size={18} />} className="w-full" name="assigned_oic_region" value={designationData.assigned_oic_region || ''} onChange={handleOicRegionChange}>
                        <option value="">Select region...</option>
                        {DEPED_REGIONS.map(reg => (
                            <option key={reg} value={reg}>{reg}</option>
                        ))}
                    </FloatingLabelInput>
                    <FloatingLabelInput as="select" label="Division" icon={<FiMapPin size={18} />} className="w-full" name="assigned_oic_division" value={designationData.assigned_oic_division || ''} onChange={handleOicDivisionChange} disabled={!designationData.assigned_oic_region}>
                        <option value="">Select division...</option>
                        {oicDivisionOptions.map(div => (
                            <option key={div} value={div}>{String(div).toUpperCase()}</option>
                        ))}
                    </FloatingLabelInput>
                </div>
            </div>
            </>)}
        </div>
    );
};

export default DesignationOICSection;

