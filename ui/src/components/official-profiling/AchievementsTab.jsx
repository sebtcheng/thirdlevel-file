import { useState } from 'react';
import { motion } from '../../utils/staticElements.jsx';
import { Plus as FiPlus, Trash as FiTrash2, Info as FiInfo } from '@phosphor-icons/react';
import YearInput from '../YearInput';
import { Field, SectionLabel } from './formParts';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';
import ConfirmDestructiveDialog from '../forms/ConfirmDestructiveDialog.jsx';

const AchievementsTab = ({ isEditing, notableAchievementsOptions, profile, setP, tab }) => {
  const [pendingRemoveIdx, setPendingRemoveIdx] = useState(null);
  return (
    <>
                                                {tab === 'achievements' && (
                                                    <div className="space-y-6">
                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-8 shadow-none space-y-6">
                                                            <div className="flex items-center justify-between">
                                                                <SectionLabel color="var(--color-gold)">Notable Achievements (If Any)</SectionLabel>
                                                            </div>

                                                            {(() => {
                                                                const achList = Array.isArray(profile.notable_achievements) ? profile.notable_achievements : [];
                                                                const layerCount = Math.max(achList.length, 1);

                                                                const updateAchievementEntry = (idx, newTitle, newYr) => {
                                                                    const newAchs = achList.map(item => typeof item === 'object' && item !== null ? { ...item } : { title: String(item || ''), year: '' });
                                                                    if (!newAchs[idx]) newAchs[idx] = { title: '', year: '' };
                                                                    if (newTitle !== undefined) newAchs[idx].title = newTitle;
                                                                    if (newYr !== undefined) newAchs[idx].year = newYr;
                                                                    setP('notable_achievements', newAchs);
                                                                };

                                                                const removeAchievementEntry = (idx) => {
                                                                    const newAchs = achList.filter((_, i) => i !== idx);
                                                                    setP('notable_achievements', newAchs);
                                                                };

                                                                return (
                                                                    <div className="space-y-6">
                                                                        {Array.from({ length: layerCount }).map((_, idx) => {
                                                                            const item = achList[idx] || { title: '', year: '' };
                                                                            const valAch = typeof item === 'object' && item !== null ? (item.title || '') : String(item || '');
                                                                            const valYr = typeof item === 'object' && item !== null ? (item.year || '') : '';
                                                                            return (
                                                                                <motion.div
                                                                                    key={`ach-layer-${idx}`}
                                                                                    initial={{ opacity: 0, y: 6 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    className="p-5 bg-slate-50/60 rounded-2xl border-2 border-slate-200/80 relative space-y-4"
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        <span className="text-[15px] font-black text-slate-400 uppercase tracking-widest">
                                                                                            Achievement Entry {layerCount > 1 ? `#${idx + 1}` : ''}
                                                                                        </span>
                                                                                        {isEditing && layerCount > 1 && (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => setPendingRemoveIdx(idx)}
                                                                                                className="text-amber-600 hover:text-amber-800 text-[15px] font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-lg border-2 border-amber-200 transition-colors cursor-pointer"
                                                                                                title="Remove Achievement Entry"
                                                                                            >
                                                                                                <FiTrash2 size={14} /> Remove
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                                        <FloatingLabelInput as="select" label="Awards / Recognitions / Notable Achievements (If Any)" disabled={!isEditing} value={valAch} onChange={e => updateAchievementEntry(idx, e.target.value, undefined)}>
                                                                                                <option value="">-- Select Achievement --</option>
                                                                                                {notableAchievementsOptions.map((ach, i) => (
                                                                                                    <option key={`opt-${idx}-${i}`} value={ach}>{ach}</option>
                                                                                                ))}
                                                                                                {valAch && !notableAchievementsOptions.includes(valAch) && (
                                                                                                    <option value={valAch}>{valAch}</option>
                                                                                                )}
                                                                                            </FloatingLabelInput>
                                                                                        <Field label="Year Received">
                                                                                            <YearInput
                                                                                                disabled={!isEditing}
                                                                                                value={valYr}
                                                                                                onChange={val => updateAchievementEntry(idx, undefined, val)}
                                                                                                placeholder="YYYY"
                                                                                            />
                                                                                        </Field>
                                                                                    </div>
                                                                                </motion.div>
                                                                            );
                                                                        })}

                                                                        {isEditing && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setP('notable_achievements', [...achList, { title: '', year: '' }])}
                                                                                className="w-full py-4 border-2 border-dashed border-amber-300 bg-amber-50/30 rounded-2xl text-amber-800 font-black text-[15px] uppercase tracking-widest hover:border-amber-500 hover:bg-amber-50 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                                                                            >
                                                                                <FiPlus size={14} /> Add Another Achievement Layer
                                                                            </button>
                                                                        )}
                       <ConfirmDestructiveDialog
                           open={pendingRemoveIdx !== null}
                           title={`Remove achievement entry #${(pendingRemoveIdx ?? 0) + 1}?`}
                           body="This removes the entry and its title and year from the profile. Changes apply when you save."
                           confirmLabel="Remove entry"
                           onConfirm={() => { removeAchievementEntry(pendingRemoveIdx); setPendingRemoveIdx(null); }}
                           onCancel={() => setPendingRemoveIdx(null)}
                       />
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Individual Accomplishments & Additional Awards */}
                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-6 lg:p-8 space-y-5 shadow-none">
                                                            <SectionLabel color="var(--color-brand-700)">Additional Awards &amp; Notable Accomplishments</SectionLabel>

                                                            <div className="bg-brand-50/40 rounded-lg p-5 border-2 border-blue-100 flex items-center gap-3">
                                                                <FiInfo size={16} className="text-blue-400 shrink-0" />
                                                                <p className="text-[15px] font-bold text-brand-700">List any additional awards, recognitions, or notable individual accomplishments (supports multiple awards with different years).</p>
                                                            </div>

                                                            <div className="space-y-3">
                                                                {(profile.individual_accomplishments || []).map((acc, idx) => {
                                                                    // acc may be a plain string (legacy/new) or { id, description, award_year } (loaded from relational table)
                                                                    const accText = typeof acc === 'object' && acc !== null ? (acc.description || '') : (acc || '');
                                                                    const accYear = typeof acc === 'object' && acc !== null ? (acc.award_year || '') : '';
                                                                    const accId = typeof acc === 'object' && acc !== null ? acc.id : undefined;
                                                                    return (
                                                                        <motion.div key={accId || `acc-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-center gap-3 bg-slate-50/40 hover:bg-transparent p-4 rounded-2xl border-2 border-slate-200/50 transition-colors shadow-sm">
                                                                            <FloatingLabelInput label="Award / Recognition / Notable accomplishment title" className="w-full" disabled={!isEditing} type="text" maxLength={150} value={accText} onChange={e => {
                                                                                    const newAccs = [...(profile.individual_accomplishments || [])];
                                                                                    const val = e.target.value;
                                                                                    newAccs[idx] = typeof acc === 'object' && acc !== null
                                                                                        ? { ...acc, description: val }
                                                                                        : { description: val, award_year: accYear };
                                                                                    setP('individual_accomplishments', newAccs);
                                                                                }} placeholder="Award / Recognition / Notable accomplishment title" />
                                                                            <div className="w-full md:w-44 shrink-0">
                                                                                <YearInput disabled={!isEditing}
                                                                                    value={accYear}
                                                                                    onChange={val => {
                                                                                        const newAccs = [...(profile.individual_accomplishments || [])];
                                                                                        newAccs[idx] = typeof acc === 'object' && acc !== null
                                                                                            ? { ...acc, award_year: val }
                                                                                            : { description: accText, award_year: val };
                                                                                        setP('individual_accomplishments', newAccs);
                                                                                    }}
                                                                                    placeholder="Year (YYYY)"
                                                                                />
                                                                            </div>
                                                                            {isEditing && <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newAccs = (profile.individual_accomplishments || []).filter((_, i) => i !== idx);
                                                                                    setP('individual_accomplishments', newAccs);
                                                                                }}
                                                                                className="w-11 h-11 flex items-center justify-center shrink-0 bg-gold/10 text-gold rounded-xl hover:bg-gold hover:text-white transition-all"
                                                                                title="Remove Award"
                                                                            >
                                                                                <FiTrash2 size={14} />
                                                                            </button>}
                                                                        </motion.div>
                                                                    );
                                                                })}
                                                                {isEditing && <button disabled={!isEditing}
                                                                    type="button"
                                                                    onClick={() => setP('individual_accomplishments', [...(profile.individual_accomplishments || []), { description: '', award_year: '' }])}
                                                                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-black text-[15px] uppercase tracking-widest hover:border-brand-700 hover:text-brand-800 transition-all flex items-center justify-center gap-2 mt-2"
                                                                >
                                                                    <FiPlus size={14} /> Add Award / Notable Accomplishment
                                                                </button>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
    </>
  );
};

export default AchievementsTab;
