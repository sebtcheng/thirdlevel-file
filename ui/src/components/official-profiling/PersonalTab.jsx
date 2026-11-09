import { UploadSimple as FiUpload, Lock as FiLock, LockOpen as FiUnlock, ArrowCounterClockwise as FiRotateCcw } from '@phosphor-icons/react';
import { apiUrl } from '../../utils/api';
import ModernDatePicker from '../ModernDatePicker';
import { inp, sel } from './constants';
import { computeAge } from './helpers';
import { Field, SectionLabel } from './formParts';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const PersonalTab = ({ TLOid, availableDivisions, handleFileUpload, isDesignationOthers, isEditing, isLocationLocked, isPositionOthers, isSuffixNA, profile, regionsList, setIsSuffixNA, setP, setProfile, setShowLocationUnlockModal, tab, unifiedList, uploadingDocs }) => {
  return (
    <>
                                                {tab === 'personal' && (
                                                    <div className="space-y-6">
                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-8 lg:p-10 space-y-8 shadow-none">
                                                            <div>
                                                                <SectionLabel>Personal Information</SectionLabel>
                                                                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
                                                                    {/* CSC ID Upload */}
                                                                    <div className="w-full lg:w-[150px] shrink-0">
                                                                        <Field label="CSC Format ID Picture">
                                                                            <div className="relative group/upload w-full aspect-[3.5/4.5] max-w-[150px] mx-auto lg:mx-0 rounded-2xl border-2 border-dashed border-slate-300 bg-transparent hover:bg-slate-100 hover:border-brand-700 transition-all flex flex-col items-center justify-center overflow-hidden shadow-sm">
                                                                                <input disabled={!isEditing}
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files[0];
                                                                                        if (file) handleFileUpload(file, 'photo');
                                                                                    }}
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                                />
                                                                                {profile.photo_binary_id ? (
                                                                                    <>
                                                                                        <img src={apiUrl(`/api/binary/${profile.photo_binary_id}`)} alt="CSC ID" className="w-full h-full object-cover" />
                                                                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/upload:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-0 backdrop-blur-sm">
                                                                                            <FiUpload size={20} className="mb-2" />
                                                                                            <span className="text-[13.5px] font-black uppercase tracking-widest text-center px-2">Change Photo</span>
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center justify-center p-4 text-slate-400 group-hover/upload:text-brand-800 transition-colors">
                                                                                        <FiUpload size={24} className={uploadingDocs['photo'] ? 'animate-bounce' : 'mb-3'} />
                                                                                        <span className="text-[15px] font-black uppercase tracking-widest text-center leading-tight mt-1">
                                                                                            {uploadingDocs['photo'] ? 'Processing...' : 'Upload Photo'}
                                                                                        </span>
                                                                                        <span className="text-[12px] font-bold text-slate-400 italic mt-1.5 text-center">Passport size with handwritten name tag & signature</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </Field>
                                                                    </div>

                                                                    <div className="flex-1 w-full space-y-4">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                                                            <FloatingLabelInput label="First Name" disabled={!isEditing} type="text" value={profile.first_name} onChange={e => setP('first_name', e.target.value)} />
                                                                            <FloatingLabelInput label="Last Name" disabled={!isEditing} type="text" value={profile.last_name} onChange={e => setP('last_name', e.target.value)} />
                                                                            <FloatingLabelInput label="Middle Name" disabled={!isEditing} type="text" value={profile.middle_name} onChange={e => setP('middle_name', e.target.value)} />
                                                                            <Field label="Suffix">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <FloatingLabelInput label="Suffix" disabled={!isEditing || isSuffixNA} type="text" value={isSuffixNA ? '' : (profile.suffix || '')} onChange={e => {
                                                                                            if (isSuffixNA) setIsSuffixNA(false);
                                                                                            setP('suffix', e.target.value);
                                                                                        }} placeholder={isSuffixNA ? 'Not Applicable' : 'e.g. Jr., III'} />
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={!isEditing}
                                                                                        onClick={() => {
                                                                                            const nextNA = !isSuffixNA;
                                                                                            setIsSuffixNA(nextNA);
                                                                                            if (nextNA) {
                                                                                                setP('suffix', '');
                                                                                            }
                                                                                        }}
                                                                                        title={isSuffixNA ? "Click to enable Suffix entry" : "Click to mark Suffix as Not Applicable"}
                                                                                        className={`h-[38px] px-2.5 rounded-lg text-[15px] font-black uppercase tracking-wider transition-all border-2 shrink-0 flex items-center justify-center select-none ${
                                                                                            isSuffixNA
                                                                                                ? 'bg-brand-800 text-white border-brand-800 shadow-sm'
                                                                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                                                                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                                    >
                                                                                        N/A
                                                                                    </button>
                                                                                </div>
                                                                            </Field>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                                                            <FloatingLabelInput as="select" label="Gender" disabled={!isEditing} value={profile.gender} onChange={e => setP('gender', e.target.value)}>
                                                                                    <option value="">Select</option>
                                                                                    <option value="MALE">Male</option>
                                                                                    <option value="FEMALE">Female</option>
                                                                                </FloatingLabelInput>
                                                                            <Field label="Date of Birth">
                                                                                <div className="relative">
                                                                                    <ModernDatePicker disabled={!isEditing} maxDate={new Date()} value={profile.date_of_birth} onChange={val => setProfile(p => ({ ...p, date_of_birth: val, age: computeAge(val) }))} className={inp} />
                                                                                </div>
                                                                            </Field>
                                                                            <Field label="Age (auto-computed)">
                                                                                <div className="w-full bg-transparent border-2 border-slate-200 rounded-lg py-2.5 px-4 text-[18px] font-semibold text-slate-500 min-h-[38px] flex items-center justify-center">
                                                                                    {profile.age || '—'}
                                                                                </div>
                                                                            </Field>
                                                                            <FloatingLabelInput as="select" label="Civil Status" disabled={!isEditing} value={profile.civil_status} onChange={e => setP('civil_status', e.target.value)}>
                                                                                    <option value="">Select</option>
                                                                                    {['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED'].map(o => <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>)}
                                                                                </FloatingLabelInput>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="border-t-2 border-slate-100 pt-8">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <SectionLabel>Designation & Appointment</SectionLabel>
                                                                    <div className="flex items-center gap-2">
                                                                        {isLocationLocked ? (
                                                                            <button
                                                                                type="button"
                                                                                disabled={!isEditing}
                                                                                onClick={() => setShowLocationUnlockModal(true)}
                                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border-2 border-amber-200 rounded-xl text-[15px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                                                            >
                                                                                <FiLock size={12} className="text-amber-600" /> Unlock Location
                                                                            </button>
                                                                        ) : (
                                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl text-[15px] font-black uppercase tracking-wider">
                                                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                                <FiUnlock size={12} className="text-emerald-600" /> Location Unlocked
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                                                                    <FloatingLabelInput label="Unique Number" disabled={!isEditing} type="text" value={TLOid || ''} readOnly />
                                                                    <FloatingLabelInput as="select" label="Employment Status" disabled={!isEditing} value={profile.employment_status || ''} onChange={e => setP('employment_status', e.target.value)}>
                                                                            <option value="">Select Status</option>
                                                                            <option value="REGULAR">Regular</option>
                                                                            <option value="COTERMINOUS">Coterminous</option>
                                                                        </FloatingLabelInput>
                                                                    <Field label="Region">
                                                                        <div className="relative">
                                                                            <FloatingLabelInput as="select" label="Select Region" disabled={!isEditing || isLocationLocked} value={profile.region || ''} onChange={e => {
                                                                                    setP('region', e.target.value);
                                                                                    setP('division', '');
                                                                                }}>
                                                                                <option value="">Select Region</option>
                                                                                {(regionsList || []).map(r => (
                                                                                    <option key={r} value={r}>{r}</option>
                                                                                ))}
                                                                                {profile.region && !(regionsList || []).includes(profile.region) && (
                                                                                    <option value={profile.region}>{profile.region}</option>
                                                                                )}
                                                                            </FloatingLabelInput>
                                                                            {isLocationLocked && (
                                                                                <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                                                                            )}
                                                                        </div>
                                                                    </Field>
                                                                    <Field label="Division">
                                                                        <div className="relative">
                                                                            <FloatingLabelInput as="select" label="Division" disabled={!isEditing || isLocationLocked || !profile.region} value={profile.division || ''} onChange={e => setP('division', e.target.value)}>
                                                                                <option value="">{profile.region ? 'Select Division' : 'Select Region First'}</option>
                                                                                {(availableDivisions || []).map(d => (
                                                                                    <option key={d} value={d}>{d}</option>
                                                                                ))}
                                                                                {profile.division && !(availableDivisions || []).includes(profile.division) && (
                                                                                    <option value={profile.division}>{profile.division}</option>
                                                                                )}
                                                                            </FloatingLabelInput>
                                                                            {isLocationLocked && (
                                                                                <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                                                                            )}
                                                                        </div>
                                                                    </Field>
                                                                    <Field label="Position Title (As per Appointment)">
                                                                        {isPositionOthers ? (
                                                                            <FloatingLabelInput label="Please specify position title" trailing={<button type="button" disabled={!isEditing} onClick={() => setP('position_title', '')} title="Switch back to list selection" className="flex items-center text-secondary">
                                                                                    <FiRotateCcw size={13} />
                                                                                </button>} disabled={!isEditing} type="text" value={profile.position_title?.toUpperCase() === 'OTHERS' ? '' : profile.position_title} onChange={e => setP('position_title', e.target.value || 'Others')} placeholder="Please specify position title" autoFocus />
                                                                        ) : (
                                                                            <FloatingLabelInput as="select" label="Select Position Title" disabled={!isEditing} value={unifiedList.find(u => u.toUpperCase() === profile.position_title?.toUpperCase()) || profile.position_title || ''} onChange={e => setP('position_title', e.target.value)}>
                                                                                <option value="">Select Position Title</option>
                                                                                {unifiedList.map(o => <option key={o} value={o}>{o}</option>)}
                                                                                <option value="Others">Others</option>
                                                                            </FloatingLabelInput>
                                                                        )}
                                                                    </Field>
                                                                    <Field label="Designation">
                                                                        {profile.is_oic ? (
                                                                            isDesignationOthers ? (
                                                                                <FloatingLabelInput label="Please specify designation" trailing={<button type="button" disabled={!isEditing} onClick={() => setP('designation', '')} title="Switch back to list selection" className="flex items-center text-secondary">
                                                                                        <FiRotateCcw size={13} />
                                                                                    </button>} disabled={!isEditing} type="text" value={profile.designation?.toUpperCase() === 'OTHERS' ? '' : profile.designation} onChange={e => setP('designation', e.target.value || 'Others')} placeholder="Please specify designation" autoFocus />
                                                                            ) : (
                                                                                <FloatingLabelInput as="select" label="Select Designation" disabled={!isEditing} value={unifiedList.find(u => u.toUpperCase() === profile.designation?.toUpperCase()) || profile.designation || ''} onChange={e => setP('designation', e.target.value)}>
                                                                                    <option value="">Select Designation</option>
                                                                                    {unifiedList.map(o => <option key={o} value={o}>{o}</option>)}
                                                                                    <option value="Others">Others</option>
                                                                                </FloatingLabelInput>
                                                                            )
                                                                        ) : (
                                                                            <div className="w-full bg-slate-50/70 border-2 border-slate-200 rounded-lg py-2 px-3.5 text-[18px] font-semibold text-slate-400 min-h-[38px] h-[38px] flex items-center italic">
                                                                                Not Applicable (Regular)
                                                                            </div>
                                                                        )}
                                                                    </Field>
                                                                    <Field label="Officer-in-Charge (OIC) Status">
                                                                        <div className="flex items-center justify-between px-3.5 py-1.5 rounded-lg border-2 border-slate-200 bg-slate-50/60 min-h-[38px] h-[38px]">
                                                                            <span className={`text-[18px] font-bold ${profile.is_oic ? 'text-brand-800' : 'text-slate-500'}`}>
                                                                                {profile.is_oic ? 'Officer-in-Charge (OIC)' : 'Regular Appointment'}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                disabled={!isEditing}
                                                                                onClick={() => {
                                                                                    const newOicStatus = !profile.is_oic;
                                                                                    setP('is_oic', newOicStatus);
                                                                                    if (!newOicStatus) {
                                                                                        setP('designation', '');
                                                                                    }
                                                                                }}
                                                                                className={`w-11 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none disabled:opacity-50 ${profile.is_oic ? 'bg-brand-800' : 'bg-slate-300'}`}
                                                                            >
                                                                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${profile.is_oic ? 'translate-x-6' : 'translate-x-0'}`} />
                                                                            </button>
                                                                        </div>
                                                                    </Field>
                                                                    <Field label="Date of Present Position (Appointment Date)">
                                                                        <div className="relative">
                                                                            <ModernDatePicker disabled={!isEditing} value={profile.appointment_date} onChange={val => setP('appointment_date', val)} className={inp} />
                                                                        </div>
                                                                    </Field>
                                                                </div>
                                                            </div>

                                                            <div className="border-t-2 border-slate-100 pt-8">
                                                                <SectionLabel>Contact Details</SectionLabel>
                                                                <div className="space-y-4">
                                                                    <FloatingLabelInput label="Permanent Address" disabled={!isEditing} type="text" value={profile.permanent_address || ''} onChange={e => setP('permanent_address', e.target.value)} placeholder="House No., Street, Barangay, City/Municipality, Province" />
                                                                    <FloatingLabelInput label="Temporary Address" disabled={!isEditing} type="text" value={profile.temporary_address || ''} onChange={e => setP('temporary_address', e.target.value)} placeholder="House No., Street, Barangay, City/Municipality, Province" />
                                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                                        <FloatingLabelInput label="Phone Number" disabled={!isEditing} type="text" value={profile.alt_contact_details_1 || ''} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 11); setP('alt_contact_details_1', val); }} placeholder="e.g. +63 912 345 6789" />
                                                                        <FloatingLabelInput label="Alternative Email 1" disabled={!isEditing} type="email" value={profile.alt_email_1 || ''} onChange={e => setP('alt_email_1', e.target.value)} placeholder="e.g. personal@gmail.com" />
                                                                        <FloatingLabelInput label="Alternative Email 2" disabled={!isEditing} type="email" value={profile.alt_email_2 || ''} onChange={e => setP('alt_email_2', e.target.value)} placeholder="e.g. backup@yahoo.com" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
    </>
  );
};

export default PersonalTab;
