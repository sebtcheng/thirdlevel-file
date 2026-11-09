import { motion } from '../../utils/staticElements.jsx';
import { Medal as FiAward, CaretLeft as FiChevronLeft, Plus as FiPlus, Trash as FiTrash2, Clock as FiClock, Pulse as FiActivity } from '@phosphor-icons/react';
import ModernDatePicker from '../ModernDatePicker';
import { PREVIOUS_POSITION_OPTIONS } from './constants';
import { SectionLabel } from './formParts';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const ExperienceTab = ({ handleAddPosition, handleRemovePosition, history, historyLoading, isEditing, prevPositions, profile, setPrevPositions, tab }) => {
  return (
    <>
                                                {tab === 'experience' && (
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                                                            <div className="md:col-span-2">
                                                                <div className="bg-white border-2 border-brand-800 rounded-lg p-8 shadow-none h-full">
                                                                    <SectionLabel>Managerial Experience</SectionLabel>
                                                                    <div className="bg-brand-50/50 p-6 rounded-3xl border-2 border-blue-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                                                                        <div>
                                                                            <p className="text-[15px] font-black text-brand-800 uppercase tracking-widest mb-1">Total Managerial Experience</p>
                                                                            <p className="text-[13.5px] font-bold text-slate-400 italic leading-tight">Automatically computed based on your previous positions.</p>
                                                                        </div>
                                                                        <div className="bg-white px-6 py-3 rounded-2xl border-2 border-blue-200 shadow-sm">
                                                                            <p className="text-[30px] font-black text-brand-800 tracking-tight">{profile.managerial_experience_total || '0 Years, 0 Months'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* SIDEBAR: CAREER PROGRESSION */}
                                                            <div className="md:col-span-1">
                                                                <div className="bg-white border-2 border-brand-800 rounded-lg p-8 shadow-none">
                                                                    <div className="flex items-center gap-3 mb-8">
                                                                        <div className="w-10 h-10 bg-brand-50 text-brand-700 rounded-2xl flex items-center justify-center">
                                                                            <FiClock size={20} />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-[21px] font-black text-brand-800 uppercase tracking-tight italic leading-none">Career Progression</h3>
                                                                            <p className="text-[13.5px] font-bold text-slate-400 uppercase tracking-widest mt-1">Professional Journey</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-6 relative">
                                                                        {/* Vertical Line */}
                                                                        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200"></div>

                                                                        {historyLoading ? (
                                                                            <div className="py-12 text-center">
                                                                                <div className="w-6 h-6 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                                                                            </div>
                                                                        ) : history.length === 0 ? (
                                                                            <div className="py-12 text-center bg-transparent rounded-3xl border-2 border-dashed border-slate-200">
                                                                                <FiClock className="mx-auto text-slate-200 mb-2" size={24} />
                                                                                <p className="text-[13.5px] font-black text-slate-300 uppercase tracking-[0.2em]">Initial Entry Record</p>
                                                                            </div>
                                                                        ) : (
                                                                            history.map((item, idx) => (
                                                                                <div key={item.id || item.history_id || `hist-${idx}`} className="flex gap-6 relative z-10">
                                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md shrink-0 ${idx === 0 ? 'bg-brand-800 text-white shadow-blue-500/30' : 'bg-slate-200 text-slate-500'}`}>
                                                                                        {idx === 0 ? <FiAward size={14} /> : <FiActivity size={14} />}
                                                                                    </div>
                                                                                    <div className="flex-1 pt-1">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <h4 className="text-[16.5px] font-black text-brand-800 uppercase tracking-tight leading-none italic">{item.position_title}</h4>
                                                                                            <span className="text-[12px] font-bold text-slate-400 bg-transparent px-2 py-0.5 rounded-full">{new Date(item.updated_at).getFullYear()}</span>
                                                                                        </div>
                                                                                        <p className="text-[15px] font-bold text-brand-700 uppercase tracking-widest mt-2">{item.office || item.division || 'Department of Education'}</p>
                                                                                        {item.previous_incumbent && (
                                                                                            <p className="text-[13.5px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                                                                                                <FiChevronLeft size={10} className="rotate-180" />
                                                                                                Prev. Incumbent: <span className="text-slate-600">{item.previous_incumbent}</span>
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-8 shadow-none">
                                                            <SectionLabel color="var(--color-brand-800)">Previous Positions Held</SectionLabel>
                                                            <div className="space-y-3">
                                                                <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px_80px_44px] gap-3 px-2">
                                                                    {['Position', 'Office / Division', 'From', 'To', 'OIC?', ''].map(h => <span key={h} className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest">{h}</span>)}
                                                                </div>
                                                                {prevPositions.map((pos, idx) => (
                                                                    <div key={pos.id || pos.position_id || `pos-${idx}`} className="relative mb-2">
                                                                        {(() => {
                                                                            const isPrevPosOthers = pos.position_name === 'Others' || (pos.position_name && !PREVIOUS_POSITION_OPTIONS.some(o => o.toUpperCase() === pos.position_name.toUpperCase()));
                                                                            return (
                                                                                <>
                                                                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px_80px_44px] gap-4 xl:gap-3 items-start xl:items-center bg-slate-50/40 hover:bg-transparent p-4 md:p-6 xl:p-4 rounded-2xl border-2 border-slate-200/60 transition-colors shadow-sm relative z-10">
                                                                                        <div className="flex flex-col gap-1.5 w-full">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest xl:hidden">Position</span>
                                                                                            <FloatingLabelInput as="select" label="Select Position" className="min-w-0" disabled={!isEditing} value={isPrevPosOthers ? 'Others' : (pos.position_name?.toUpperCase() || '')} onChange={e => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, position_name: e.target.value } : x))}>
                                                                                                <option value="">Select Position</option>
                                                                                                {PREVIOUS_POSITION_OPTIONS.map(o => <option key={o} value={o.toUpperCase()}>{o}</option>)}
                                                                                                <option value="Others">Others</option>
                                                                                            </FloatingLabelInput>
                                                                                            {isPrevPosOthers && (
                                                                                                <FloatingLabelInput label="Type the position you held" className="mt-2 w-full" disabled={!isEditing} type="text" value={pos.position_name === 'Others' ? '' : pos.position_name} onChange={e => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, position_name: e.target.value.toUpperCase() || 'Others' } : x))} placeholder="Type the position you held" autoFocus />
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1.5 w-full">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest xl:hidden">Office / Division</span>
                                                                                            <FloatingLabelInput label="Office" className="min-w-0" disabled={!isEditing} type="text" value={pos.office || ''} onChange={e => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, office: e.target.value } : x))} placeholder="Office" />
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1.5 w-full">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest xl:hidden">From Date</span>
                                                                                            <div className="relative">
                                                                                                <ModernDatePicker disabled={!isEditing} value={pos.start_date ? pos.start_date.split('T')[0] : ''} onChange={val => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, start_date: val } : x))} className="bg-white border-2 border-slate-200 focus:border-brand-700 focus:ring-2 focus:ring-blue-50/50 rounded-xl px-3 py-2 text-[18px] font-semibold text-slate-800 outline-none transition-all w-full shadow-sm" />
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1.5 w-full">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest xl:hidden">To Date</span>
                                                                                            <div className="relative">
                                                                                                <ModernDatePicker disabled={!isEditing} value={pos.end_date ? pos.end_date.split('T')[0] : ''} onChange={val => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, end_date: val } : x))} minDate={pos.start_date ? new Date(pos.start_date) : undefined} className="bg-white border-2 border-slate-200 focus:border-brand-700 focus:ring-2 focus:ring-blue-50/50 rounded-xl px-3 py-2 text-[18px] font-semibold text-slate-800 outline-none transition-all w-full shadow-sm" />
                                                                                                {pos.start_date && pos.end_date && new Date(pos.end_date) <= new Date(pos.start_date) && (
                                                                                                    <p className="text-red-500 text-[15px] mt-1 font-semibold absolute -bottom-5">Must be after From Date.</p>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1.5 w-full">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest xl:hidden">OIC Status</span>
                                                                                            <button onClick={() => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, oic_positions: [...(x.oic_positions || []), { id: `tmp-oic-${Date.now()}`, oic_position_name: '', oic_office: '', oic_start_date: '', oic_end_date: '' }] } : x))} className="flex items-center justify-center gap-1 text-[13.5px] font-black uppercase py-2 px-1 rounded-xl transition-all bg-white border-2 border-slate-200 text-slate-500 shadow-sm hover:border-gold hover:text-gold">
                                                                                                <FiPlus size={14} /> Add OIC
                                                                                            </button>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1.5 w-full md:w-auto md:self-end justify-center xl:items-center">
                                                                                            <span className="text-[13.5px] font-black text-slate-gold uppercase tracking-widest xl:hidden md:invisible">Action</span>
                                                                                            {isEditing && <button onClick={() => handleRemovePosition(idx)} className="w-full xl:w-11 h-11 flex items-center justify-center bg-gold/10 text-gold rounded-xl hover:bg-gold hover:text-white transition-all"><FiTrash2 size={14} /></button>}
                                                                                        </div>
                                                                                    </motion.div>

                                                                                    {(pos.oic_positions || []).map((oic, oicIdx) => {
                                                                                        const isOicPosOthers = oic.oic_position_name === 'Others' || (oic.oic_position_name && !PREVIOUS_POSITION_OPTIONS.some(o => o.toUpperCase() === oic.oic_position_name.toUpperCase()));
                                                                                        return (
                                                                                            <motion.div key={oic.id || `oic-${idx}-${oicIdx}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="ml-8 mt-2 pl-6 border-l-2 border-dashed border-gold relative">
                                                                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px_80px_44px] gap-4 xl:gap-3 items-start xl:items-center bg-white p-4 rounded-2xl border-2 border-gold/30 transition-colors shadow-sm relative mb-2">
                                                                                                    <div className="absolute -left-6 top-1/2 w-6 h-0.5 border-t-2 border-dashed border-gold"></div>
                                                                                                    <div className="flex flex-col gap-1.5 w-full">
                                                                                                        <span className="text-[13.5px] font-black text-gold uppercase tracking-widest xl:hidden">OIC Position</span>
                                                                                                        <FloatingLabelInput as="select" label="Select OIC Position" className="min-w-0" disabled={!isEditing} value={isOicPosOthers ? 'Others' : (oic.oic_position_name?.toUpperCase() || '')} onChange={e => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, oic_positions: x.oic_positions.map((o, j) => j === oicIdx ? { ...o, oic_position_name: e.target.value } : o) } : x))}>
                                                                                                            <option value="">Select OIC Position</option>
                                                                                                            {PREVIOUS_POSITION_OPTIONS.map(o => <option key={o} value={o.toUpperCase()}>{o}</option>)}
                                                                                                            <option value="Others">Others</option>
                                                                                                        </FloatingLabelInput>
                                                                                                        {isOicPosOthers && (
                                                                                                            <FloatingLabelInput label="Type the position you held" className="mt-2 w-full" disabled={!isEditing} type="text" value={oic.oic_position_name === 'Others' ? '' : oic.oic_position_name} onChange={e => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, oic_positions: x.oic_positions.map((o, j) => j === oicIdx ? { ...o, oic_position_name: e.target.value.toUpperCase() || 'Others' } : o) } : x))} placeholder="Type the position you held" autoFocus />
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="flex flex-col gap-1.5 w-full">
                                                                                                        <span className="text-[13.5px] font-black text-gold uppercase tracking-widest xl:hidden">OIC Office / Division</span>
                                                                                                        <FloatingLabelInput label="OIC Office" className="min-w-0" disabled={!isEditing} type="text" value={oic.oic_office || ''} onChange={e => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, oic_positions: x.oic_positions.map((o, j) => j === oicIdx ? { ...o, oic_office: e.target.value } : o) } : x))} placeholder="OIC Office" />
                                                                                                    </div>
                                                                                                    <div className="flex flex-col gap-1.5 w-full">
                                                                                                        <span className="text-[13.5px] font-black text-gold uppercase tracking-widest xl:hidden">OIC From Date</span>
                                                                                                        <div className="relative">
                                                                                                            <ModernDatePicker disabled={!isEditing} value={oic.oic_start_date ? oic.oic_start_date.split('T')[0] : ''} onChange={val => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, oic_positions: x.oic_positions.map((o, j) => j === oicIdx ? { ...o, oic_start_date: val } : o) } : x))} className="bg-white border-2 border-gold/50 focus:border-gold focus:ring-2 focus:ring-gold/30 rounded-xl px-3 py-2 text-[18px] font-semibold text-slate-800 outline-none transition-all w-full shadow-sm" />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex flex-col gap-1.5 w-full">
                                                                                                        <span className="text-[13.5px] font-black text-gold uppercase tracking-widest xl:hidden">OIC To Date</span>
                                                                                                        <div className="relative">
                                                                                                            <ModernDatePicker disabled={!isEditing} value={oic.oic_end_date ? oic.oic_end_date.split('T')[0] : ''} onChange={val => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, oic_positions: x.oic_positions.map((o, j) => j === oicIdx ? { ...o, oic_end_date: val } : o) } : x))} minDate={oic.oic_start_date ? new Date(oic.oic_start_date) : undefined} className="bg-white border-2 border-gold/50 focus:border-gold focus:ring-2 focus:ring-gold/30 rounded-xl px-3 py-2 text-[18px] font-semibold text-slate-800 outline-none transition-all w-full shadow-sm" />
                                                                                                            {oic.oic_start_date && oic.oic_end_date && new Date(oic.oic_end_date) <= new Date(oic.oic_start_date) && (
                                                                                                                <p className="text-red-500 text-[15px] mt-1 font-semibold absolute -bottom-5">Must be after From Date.</p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="hidden xl:block"></div>
                                                                                                    <div className="flex flex-col gap-1.5 w-full md:w-auto md:self-end justify-center xl:items-center">
                                                                                                        <span className="text-[13.5px] font-black text-gold uppercase tracking-widest xl:hidden md:invisible">Action</span>
                                                                                                        {isEditing && <button onClick={() => setPrevPositions(p => p.map((x, i) => i === idx ? { ...x, oic_positions: x.oic_positions.filter((_, j) => j !== oicIdx) } : x))} className="w-full xl:w-11 h-11 flex items-center justify-center bg-gold/10 text-gold rounded-xl hover:bg-gold hover:text-white transition-all"><FiTrash2 size={14} /></button>}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </motion.div>
                                                                                        );
                                                                                    })}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                ))}
                                                                {isEditing && <button onClick={handleAddPosition} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[15px] uppercase tracking-widest hover:border-brand-700 hover:text-brand-800 transition-all flex items-center justify-center gap-2 mt-2">
                                                                    <FiPlus size={14} /> Add Position
                                                                </button>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
    </>
  );
};

export default ExperienceTab;
