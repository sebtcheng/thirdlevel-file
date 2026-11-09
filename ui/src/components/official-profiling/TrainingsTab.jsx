import { motion } from '../../utils/staticElements.jsx';
import { Plus as FiPlus, Trash as FiTrash2, Info as FiInfo } from '@phosphor-icons/react';
import ModernDatePicker from '../ModernDatePicker';
import { Field, SectionLabel } from './formParts';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const TrainingsTab = ({ handleAddTraining, handleRemoveTraining, handleTrainingDateChange, isEditing, profile, setTrainings, tab, trainings }) => {
  return (
    <>
                                                {tab === 'trainings' && (
                                                    <div className="space-y-6">
                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-6 lg:p-8 space-y-5 shadow-none">
                                                            <SectionLabel color="var(--color-brand-700)">Professional Development Trainings</SectionLabel>

                                                            <div className="bg-brand-50/40 rounded-lg p-5 border-2 border-blue-100 flex items-center gap-3">
                                                                <FiInfo size={16} className="text-blue-400 shrink-0" />
                                                                <p className="text-[15px] font-bold text-brand-700">List all relevant trainings, seminars, and professional development programs attended. Include the total number of training hours accumulated.</p>
                                                            </div>

                                                            {/* Total Training Hours */}
                                                            <Field label="Total Number of Training Hours (Auto-computed)">
                                                                <div className="bg-slate-100 rounded-2xl py-3 px-5 text-[21px] font-black text-brand-800 border-2 border-slate-200">
                                                                    {profile.total_training_hours || '0'} Hours
                                                                </div>
                                                            </Field>

                                                            {/* Trainings List */}
                                                            <div className="space-y-3">
                                                                <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_140px_140px_80px_80px_44px] gap-3 px-2">
                                                                    {['Training / Seminar Name', 'Date From', 'Date To', 'Hrs/Day', 'Total Hrs', ''].map(h => (
                                                                        <span key={h} className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                                                                    ))}
                                                                </div>
                                                                {trainings.map((tr, idx) => (
                                                                    <motion.div key={tr.id || tr.training_id || `tr-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_140px_140px_80px_80px_44px] gap-3 items-center bg-slate-50/40 hover:bg-transparent p-4 rounded-2xl border-2 border-slate-200/50 transition-colors shadow-sm">
                                                                        <FloatingLabelInput label="Training / Seminar name" className="min-w-0" disabled={!isEditing} type="text" value={tr.training_name || ''} onChange={e => setTrainings(t => t.map((x, i) => i === idx ? { ...x, training_name: e.target.value.toUpperCase() } : x))} placeholder="Training / Seminar name" />
                                                                        <div className="relative">
                                                                            <ModernDatePicker disabled={!isEditing} value={tr.date_from ? tr.date_from.split('T')[0] : (tr.date_completed ? tr.date_completed.split('T')[0] : '')} onChange={val => handleTrainingDateChange(idx, 'date_from', val)} className="bg-white border-2 border-slate-200 focus:border-brand-700 focus:ring-2 focus:ring-blue-50/50 rounded-xl px-3 py-2 text-[18px] font-semibold text-slate-800 outline-none transition-all w-full shadow-sm" />
                                                                        </div>
                                                                        <div className="relative">
                                                                            <ModernDatePicker disabled={!isEditing} value={tr.date_to ? tr.date_to.split('T')[0] : (tr.date_completed ? tr.date_completed.split('T')[0] : '')} onChange={val => handleTrainingDateChange(idx, 'date_to', val)} minDate={tr.date_from ? new Date(tr.date_from) : undefined} className="bg-white border-2 border-slate-200 focus:border-brand-700 focus:ring-2 focus:ring-blue-50/50 rounded-xl px-3 py-2 text-[18px] font-semibold text-slate-800 outline-none transition-all w-full shadow-sm" />
                                                                            {tr.date_from && (tr.date_to || tr.date_completed) && new Date(tr.date_to || tr.date_completed) <= new Date(tr.date_from) && (
                                                                                <p className="text-red-500 text-[15px] mt-1 font-semibold absolute -bottom-5">Must be after From Date.</p>
                                                                            )}
                                                                        </div>
                                                                        <FloatingLabelInput as="select" label="8 hrs" className="min-w-0" disabled={!isEditing} value={tr.hours_per_day || '8'} onChange={e => handleTrainingDateChange(idx, 'hours_per_day', e.target.value)}>
                                                                            <option value="8">8 hrs</option>
                                                                            <option value="4">4 hrs</option>
                                                                            <option value="2">2 hrs</option>
                                                                        </FloatingLabelInput>
                                                                        <FloatingLabelInput label="Total" className="min-w-0" disabled={!isEditing} type="number" min="0" max="999" step="0.5" value={tr.hours || ''} onChange={e => { let v = e.target.value; if (v !== '' && Number(v) > 999) v = '999'; setTrainings(t => t.map((x, i) => i === idx ? { ...x, hours: v } : x)); }} placeholder="Total" />
                                                                        {isEditing && <button onClick={() => handleRemoveTraining(idx)} className="w-11 h-11 flex items-center justify-center bg-gold/10 text-gold rounded-xl hover:bg-gold hover:text-white transition-all"><FiTrash2 size={14} /></button>}
                                                                    </motion.div>
                                                                ))}
                                                                {isEditing && <button onClick={handleAddTraining} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[15px] uppercase tracking-widest hover:border-brand-700 hover:text-brand-800 transition-all flex items-center justify-center gap-2 mt-2">
                                                                    <FiPlus size={14} /> Add Training
                                                                </button>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
    </>
  );
};

export default TrainingsTab;
