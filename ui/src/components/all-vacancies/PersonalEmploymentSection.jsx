import React from 'react';
import { User as FiUser, Info as FiInfo } from '@phosphor-icons/react';
import { formatContactNumber } from './constants';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const PersonalEmploymentSection = ({
    fieldErrors = [],
    personalData,
    setPersonalData
}) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (['surname', 'first_name', 'middle_name'].includes(name)) {
            finalValue = finalValue.toUpperCase();
        }

        if (name === 'date_of_birth' && value) {
            const todayStr = new Date().toISOString().split('T')[0];
            if (value > todayStr) {
                return;
            }
        }

        setPersonalData(prev => ({
            ...prev,
            [name]: finalValue
        }));
    };

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

            {/* ALL CAPS Standard Info Box */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-start gap-3">
                <FiInfo size={18} className="text-amber-700 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 space-y-0.5">
                    <p className="font-bold">Official DepEd Standard: ALL CAPS</p>
                    <p className="text-amber-800">
                        Please type your surname, first name, and middle name in <strong>ALL CAPITAL LETTERS</strong> as required by DepEd guidelines.
                    </p>
                </div>
            </div>

            {/* Name Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <FloatingLabelInput error={fieldErrors.find((er) => er.id === 'field-surname')?.message} label="Surname [ALL CAPS]" className="w-full" inputClassName="uppercase" type="text" name="surname" value={personalData.surname || ''} onChange={handleChange} placeholder="DELA CRUZ" required />
                </div>

                <div>
                    <FloatingLabelInput error={fieldErrors.find((er) => er.id === 'field-first_name')?.message} label="First Name [ALL CAPS]" className="w-full" inputClassName="uppercase" type="text" name="first_name" value={personalData.first_name || ''} onChange={handleChange} placeholder="JUAN" required />
                </div>

                <div>
                    <FloatingLabelInput label="Middle Name [ALL CAPS]" className="w-full" inputClassName="uppercase" type="text" name="middle_name" value={personalData.middle_name || ''} onChange={handleChange} placeholder="SANTOS" />
                </div>
            </div>

            {/* Date of Birth & Telephone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <FloatingLabelInput label="Date of Birth" className="w-full" type="date" name="date_of_birth" max={new Date().toISOString().split('T')[0]} value={personalData.date_of_birth || ''} onChange={handleChange} />
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
                    <FloatingLabelInput error={fieldErrors.find((er) => er.id === 'field-current_position')?.message} label="e.g. Chief Education Supervisor" className="w-full" type="text" name="current_position" value={personalData.current_position || ''} onChange={handleChange} placeholder="e.g. Chief Education Supervisor" required />
                </div>

                <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        In what Schools Division Office or Regional Office does your plantilla item belong to? <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 block mb-2 font-medium">
                        [i.e. SDO-Pasig City; SDO-Cebu City; Regional Office; For non-DepEd, include Agency and Office Assignment]
                    </span>
                    <FloatingLabelInput error={fieldErrors.find((er) => er.id === 'field-plantilla_office')?.message} label="e.g. SDO-Pasig City or Regional Office IV-A" className="w-full" type="text" name="plantilla_office" value={personalData.plantilla_office || ''} onChange={handleChange} placeholder="e.g. SDO-Pasig City or Regional Office IV-A" required />
                </div>
            </div>
        </div>
    );
};

export default PersonalEmploymentSection;

