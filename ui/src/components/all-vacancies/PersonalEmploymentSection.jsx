import React, { useEffect, useState } from 'react';
import { User as FiUser, Briefcase as FiBriefcase, MapPin as FiMapPin } from '@phosphor-icons/react';
import { MantineProvider } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
// Mantine stylesheets are imported once in src/main.jsx.
import { formatContactNumber, DEPED_REGIONS, getDivisionOptions } from './constants';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';
import { useAuth } from '../../context/AuthContext';
import { fetchLookupJson } from '../../utils/lookupCache';

const PROFILING_API = '/api/third-level/official-profiling';

const toIsoDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const PersonalEmploymentSection = ({
    fieldErrors = [],
    personalData,
    setPersonalData
}) => {
    const { token } = useAuth();
    const [tloPositions, setTloPositions] = useState([]);
    const [regionDivisions, setRegionDivisions] = useState({});

    useEffect(() => {
        let alive = true;
        const authToken = token || localStorage.getItem('token');
        const load = async () => {
            try {
                // Shared, de-duplicated requests (see utils/lookupCache.js).
                const [posData, lookupData] = await Promise.all([
                    fetchLookupJson(`${PROFILING_API}/tlo-positions`, { token: authToken }),
                    fetchLookupJson(`${PROFILING_API}/positions`, { token: authToken })
                ]);
                if (!alive) return;
                if (posData.success) setTloPositions(posData.positions || []);
                if (lookupData.success) setRegionDivisions(lookupData.regionDivisions || {});
            } catch (err) {
                if (alive) console.error('Failed to load position/region lookups', err);
            }
        };
        load();
        return () => { alive = false; };
    }, [token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (['surname', 'first_name', 'middle_name'].includes(name)) {
            finalValue = finalValue.toUpperCase();
        }

        setPersonalData(prev => ({
            ...prev,
            [name]: finalValue
        }));
    };

    // Region resets Division; plantilla_office stays the combined value other code relies on.
    const handleRegionChange = (e) => {
        setPersonalData(prev => ({ ...prev, plantilla_region: e.target.value, plantilla_division: '', plantilla_office: '' }));
    };

    const handleDivisionChange = (e) => {
        setPersonalData(prev => ({ ...prev, plantilla_division: e.target.value, plantilla_office: e.target.value }));
    };

    // Region keys come from the masterlist in whatever casing it holds ("REGION II"), so match case-insensitively.
    const divisionOptions = getDivisionOptions(regionDivisions, personalData.plantilla_region);
    // A saved position that differs only by case maps to the list entry instead of adding a duplicate.
    const savedPosition = (personalData.current_position || '').trim();
    const savedMatch = tloPositions.find(p => p.position_name.toUpperCase() === savedPosition.toUpperCase());
    const positionOptions = !savedPosition || savedMatch
        ? tloPositions
        : [{ id: 'current', position_name: savedPosition }, ...tloPositions];
    const positionValue = savedMatch ? savedMatch.position_name : savedPosition;

    const handleContactChange = (e) => {
        const formatted = formatContactNumber(e.target.value);
        setPersonalData(prev => ({
            ...prev,
            contact_number: formatted
        }));
    };

    return (
        <div className="bg-white border-2 border-slate-200 rounded-card p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <FiUser className="text-brand-800" size={20} />
                    <h3 className="text-base font-black text-brand-800 uppercase tracking-wide">
                        2. Personal Details & Current Employment
                    </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                    Official personal identity and current plantilla assignment in accordance with DepEd executive guidelines.
                </p>
            </div>

            {/* Name Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <FloatingLabelInput error={fieldErrors.find((er) => er.id === 'field-surname')?.message} label="Surname" className="w-full" inputClassName="uppercase" type="text" name="surname" value={personalData.surname || ''} onChange={handleChange} placeholder="DELA CRUZ" required />
                </div>

                <div>
                    <FloatingLabelInput error={fieldErrors.find((er) => er.id === 'field-first_name')?.message} label="First Name" className="w-full" inputClassName="uppercase" type="text" name="first_name" value={personalData.first_name || ''} onChange={handleChange} placeholder="JUAN" required />
                </div>

                <div>
                    <FloatingLabelInput label="Middle Name" className="w-full" inputClassName="uppercase" type="text" name="middle_name" value={personalData.middle_name || ''} onChange={handleChange} placeholder="SANTOS" />
                </div>
            </div>

            {/* Date of Birth & Telephone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="mb-1.5 block text-[13px] font-semibold leading-4 text-heading">Date of Birth</label>
                    <MantineProvider withGlobalClasses={false}>
                        <DatePickerInput
                            name="date_of_birth"
                            placeholder="Select date"
                            valueFormat="YYYY-MM-DD"
                            maxDate={new Date()}
                            clearable
                            value={personalData.date_of_birth ? new Date(`${personalData.date_of_birth}T00:00:00`) : null}
                            onChange={(d) => setPersonalData(prev => ({ ...prev, date_of_birth: d ? toIsoDate(d) : '' }))}
                            styles={{ input: { height: 44, fontSize: 15, borderRadius: 6 } }}
                        />
                    </MantineProvider>
                    <span className="text-[10px] text-slate-400 block mt-1">Cannot be a future date</span>
                </div>

                <div>
                    <FloatingLabelInput error={fieldErrors.find((er) => er.id === 'field-contact_number')?.message} label="Telephone / Contact Number" className="w-full" inputClassName="font-mono tracking-wide" type="tel" name="contact_number" value={personalData.contact_number || ''} onChange={handleContactChange} placeholder="0917-123-4567" maxLength={13} required />
                    <span className="text-[10px] text-slate-400 block mt-1">11 digits (formatted with dashes)</span>
                </div>
            </div>

            {/* Current Position & Plantilla Office */}
            <div className="space-y-4 pt-2">
                <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        What is your current position? <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 block mb-2 font-medium">
                        [For other positions, do not abbreviate. e.g. Education Program Supervisor, Public Schools District Supervisor]
                    </span>
                    <FloatingLabelInput as="select" error={fieldErrors.find((er) => er.id === 'field-current_position')?.message} label="Current Position" icon={<FiBriefcase size={18} />} className="w-full" name="current_position" value={positionValue} onChange={handleChange} required>
                        <option value="">Select current position...</option>
                        {positionOptions.map(pos => (
                            <option key={pos.id} value={pos.position_name}>{pos.position_name}</option>
                        ))}
                    </FloatingLabelInput>
                </div>

                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FloatingLabelInput as="select" error={fieldErrors.find((er) => er.id === 'field-plantilla_region')?.message} label="Region" icon={<FiMapPin size={18} />} className="w-full" name="plantilla_region" value={personalData.plantilla_region || ''} onChange={handleRegionChange} required>
                            <option value="">Select region...</option>
                            {DEPED_REGIONS.map(reg => (
                                <option key={reg} value={reg}>{reg}</option>
                            ))}
                        </FloatingLabelInput>
                        <FloatingLabelInput as="select" error={fieldErrors.find((er) => er.id === 'field-plantilla_division')?.message} label="Division" icon={<FiMapPin size={18} />} className="w-full" name="plantilla_division" value={personalData.plantilla_division || ''} onChange={handleDivisionChange} disabled={!personalData.plantilla_region} required>
                            <option value="">Select division...</option>
                            {divisionOptions.map(div => (
                                <option key={div} value={div}>{String(div).toUpperCase()}</option>
                            ))}
                        </FloatingLabelInput>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalEmploymentSection;

