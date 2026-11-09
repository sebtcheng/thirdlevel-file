import { Plus as FiPlus, Trash as FiTrash2 } from '@phosphor-icons/react';
import ModernDatePicker from '../ModernDatePicker';
import { inp } from './constants';
import { Field, SectionLabel } from './formParts';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const EligibilityTab = ({ isEditing, profile, setP, setProfile, tab }) => {
  return (
    <>
                                                {tab === 'eligibility' && (
                                                    <div className="space-y-6">
                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-6 lg:p-8 space-y-5 shadow-none">
                                                            <SectionLabel color="var(--color-brand-700)">Career Executive Service (CES)</SectionLabel>
                                                            <FloatingLabelInput as="select" label="CES Eligibility / Rank Status" disabled={!isEditing} value={profile.ces_stage || ''} onChange={e => setP('ces_stage', e.target.value)}>
                                                                    <option value="">Select Status</option>
                                                                    <option value="STAGE 1 (CES WRITTEN EXAMINATION)">Stage 1 (CES Written Examination)</option>
                                                                    <option value="STAGE 2 (ASSESSMENT CENTER)">Stage 2 (Assessment Center)</option>
                                                                    <option value="STAGE 3 (PERFORMANCE VALIDATION)">Stage 3 (Performance Validation)</option>
                                                                    <option value="STAGE 4 (BOARD INTERVIEW)">Stage 4 (Board Interview)</option>
                                                                    <option value="CES ELIGIBLE">CES Eligible</option>
                                                                    <option value="CESO RANK VI">CESO Rank VI</option>
                                                                    <option value="CESO RANK V">CESO Rank V</option>
                                                                    <option value="CESO RANK IV">CESO Rank IV</option>
                                                                    <option value="CESO RANK III">CESO Rank III</option>
                                                                    <option value="CESO RANK II">CESO Rank II</option>
                                                                    <option value="CESO RANK I">CESO Rank I</option>
                                                                    <option value="NOT APPLICABLE">Not Applicable</option>
                                                                </FloatingLabelInput>
                                                            <Field label="Date of Conferment (if applicable)">
                                                                <div className="relative">
                                                                    <ModernDatePicker disabled={!isEditing} value={profile.ces_conferment_date} onChange={val => setP('ces_conferment_date', val)} className={inp} />

                                                                </div>
                                                            </Field>
                                                        </div>

                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-6 lg:p-8 space-y-5 shadow-none">
                                                            <SectionLabel>Educational Management Test (EMT)</SectionLabel>
                                                            <Field label="Are you an EMT Passer?">
                                                                <div className="flex gap-1.5 p-1 bg-slate-100/70 rounded-xl max-w-xs border-2 border-slate-200/40">
                                                                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                                                                        <button disabled={!isEditing}
                                                                            key={String(opt.val)}
                                                                            onClick={() => setP('emt_passer', opt.val)}
                                                                            className={`flex-1 py-2 rounded-lg text-[15px] font-bold uppercase tracking-wider transition-all
                                                                        ${profile.emt_passer === opt.val
                                                                                    ? (opt.val ? 'bg-brand-800 text-white shadow-sm shadow-blue-900/10' : 'bg-gold text-white shadow-sm shadow-red-900/10')
                                                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    ))}
                                                                    <button
                                                                        onClick={() => setProfile(p => ({ ...p, emt_passer: null, emt_date: '' }))}
                                                                        className="px-3 py-2 rounded-lg text-[13.5px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:bg-transparent transition-all"
                                                                    >
                                                                        Clear
                                                                    </button>
                                                                </div>
                                                            </Field>
                                                            {profile.emt_passer === true && (
                                                                <Field label="Date passed EMT">
                                                                    <div className="relative">
                                                                        <ModernDatePicker disabled={!isEditing} value={profile.emt_date} onChange={val => setP('emt_date', val)} className={inp} />

                                                                    </div>
                                                                </Field>
                                                            )}
                                                        </div>

                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-6 lg:p-8 space-y-5 shadow-none">
                                                            <div className="flex items-center justify-between">
                                                                <SectionLabel>Other Civil Service Eligibility</SectionLabel>
                                                                {isEditing && <button
                                                                    onClick={() => setProfile(p => ({ ...p, eligibilities: [...(p.eligibilities || []), { eligibility: '', date: '', rating: '', place_of_assignment: '' }] }))}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-brand-700 text-[15px] font-black uppercase tracking-wider rounded-lg hover:bg-brand-700 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    <FiPlus size={12} /> Add Eligibility
                                                                </button>}
                                                            </div>

                                                            {(!profile.eligibilities || profile.eligibilities.length === 0) ? (
                                                                <div className="p-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                                                    <p className="text-[18px] font-semibold text-slate-400">No other eligibilities added.</p>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    {profile.eligibilities.map((elig, idx) => (
                                                                        <div key={elig.id || `elig-${idx}`} className="relative p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl group">
                                                                            {isEditing && <button
                                                                                onClick={() => setProfile(p => ({ ...p, eligibilities: p.eligibilities.filter((_, i) => i !== idx) }))}
                                                                                className="absolute -right-2 -top-2 p-1.5 bg-white border-2 border-slate-200 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:border-red-100 shadow-sm"
                                                                                title="Remove"
                                                                            >
                                                                                <FiTrash2 size={12} />
                                                                            </button>}
                                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                                                <FloatingLabelInput label="Eligibility" disabled={!isEditing} type="text" value={elig.eligibility || elig.title || ''} onChange={e => setProfile(p => ({ ...p, eligibilities: p.eligibilities.map((x, i) => i === idx ? { ...x, eligibility: e.target.value.toUpperCase(), title: undefined } : x) }))} placeholder="e.g. Career Service Professional" />
                                                                                <Field label="Date of Examination / Conferment">
                                                                                    <ModernDatePicker disabled={!isEditing}
                                                                                        value={elig.date || ''}
                                                                                        onChange={val => setProfile(p => ({ ...p, eligibilities: p.eligibilities.map((x, i) => i === idx ? { ...x, date: val } : x) }))}
                                                                                        className={inp}
                                                                                    />
                                                                                </Field>
                                                                                <FloatingLabelInput label="Rating" disabled={!isEditing} type="text" value={elig.rating || ''} onChange={e => setProfile(p => ({ ...p, eligibilities: p.eligibilities.map((x, i) => i === idx ? { ...x, rating: e.target.value } : x) }))} placeholder="e.g. 85.50" />
                                                                                <FloatingLabelInput label="Place of Examination / Conferment" disabled={!isEditing} type="text" value={elig.place_of_assignment || ''} onChange={e => setProfile(p => ({ ...p, eligibilities: p.eligibilities.map((x, i) => i === idx ? { ...x, place_of_assignment: e.target.value.toUpperCase() } : x) }))} placeholder="e.g. Manila" />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
    </>
  );
};

export default EligibilityTab;
