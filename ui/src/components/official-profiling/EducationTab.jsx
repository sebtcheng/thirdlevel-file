import { Plus as FiPlus, Trash as FiTrash2 } from '@phosphor-icons/react';
import ModernDatePicker from '../ModernDatePicker';
import YearInput from '../YearInput';
import { inp } from './constants';
import { Field, SectionLabel } from './formParts';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const EducationTab = ({ isEditing, profile, setP, setProfile, tab }) => {
  return (
    <>
                                                {tab === 'education' && (() => {
                                                    const renderDegreeSection = (title, degField, yrField, prevMin) => {
                                                        const degrees = (profile[degField] || '').split('\n');
                                                        const years = (profile[yrField] || '').split('\n');
                                                        const count = Math.max(degrees.length, years.length, 1);

                                                        const updateEntry = (idx, type, val) => {
                                                            if (type === 'deg') {
                                                                const newDegs = [...degrees];
                                                                newDegs[idx] = val;
                                                                setP(degField, newDegs.join('\n'));
                                                            } else {
                                                                const newYrs = [...years];
                                                                newYrs[idx] = val;
                                                                setP(yrField, newYrs.join('\n'));
                                                            }
                                                        };

                                                        return (
                                                            <div className="relative p-6 bg-brand-800/5 rounded-lg border-2 border-brand-700/10 space-y-4 mb-6 group">
                                                                <p className="text-[15px] font-black text-brand-800 uppercase tracking-widest">{title}</p>
                                                                {Array.from({ length: count }).map((_, idx) => (
                                                                    <div key={`${degField}-${idx}`} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                                                                        <FloatingLabelInput label="Degree / Course" disabled={!isEditing} type="text" value={degrees[idx] || ''} onChange={e => updateEntry(idx, 'deg', e.target.value)} placeholder="e.g. Bachelor of Science in Nursing" />
                                                                        <Field label="Year Graduated">
                                                                            <YearInput disabled={!isEditing} value={years[idx] || ''} onChange={val => updateEntry(idx, 'yr', val)} min={prevMin > 0 ? prevMin + 1 : 1900} placeholder="YYYY" />
                                                                        </Field>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    };

                                                    const bachelorYr = profile.bachelor_year || '';
                                                    const masterYr = profile.master_year || '';
                                                    const bYearNum = parseInt(bachelorYr.split('\n')[0]) || 0;
                                                    const mYearNum = parseInt(masterYr.split('\n')[0]) || 0;

                                                    return (
                                                        <div className="space-y-6">
                                                            <div className="bg-white border-2 border-brand-800 rounded-lg p-6 lg:p-8 space-y-5 shadow-none">
                                                                <div className="mb-6 flex justify-between items-center">
                                                                    <SectionLabel>Educational Attainment</SectionLabel>
                                                                    {isEditing && <div className="relative group/add-degree">
                                                                        <button type="button" className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[15px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2">
                                                                            <FiPlus size={14} /> Add Degree
                                                                        </button>
                                                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover/add-degree:opacity-100 group-hover/add-degree:visible transition-all z-10 flex flex-col p-1">
                                                                            <button disabled={!isEditing} type="button" onClick={() => { setP('bachelor_degree', (profile.bachelor_degree ? profile.bachelor_degree + '\n' : '')); setP('bachelor_year', (profile.bachelor_year ? profile.bachelor_year + '\n' : '')); }} className="text-left px-3 py-2 text-[15px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg uppercase tracking-wider">Bachelor's</button>
                                                                            <button disabled={!isEditing} type="button" onClick={() => { setP('master_degree', (profile.master_degree ? profile.master_degree + '\n' : '')); setP('master_year', (profile.master_year ? profile.master_year + '\n' : '')); }} className="text-left px-3 py-2 text-[15px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg uppercase tracking-wider">Master's</button>
                                                                            <button disabled={!isEditing} type="button" onClick={() => { setP('doctorate_degree', (profile.doctorate_degree ? profile.doctorate_degree + '\n' : '')); setP('doctorate_year', (profile.doctorate_year ? profile.doctorate_year + '\n' : '')); }} className="text-left px-3 py-2 text-[15px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg uppercase tracking-wider">Doctorate</button>
                                                                        </div>
                                                                    </div>}
                                                                </div>

                                                                {renderDegreeSection("Baccalaureate / Bachelor's Degree", 'bachelor_degree', 'bachelor_year', 1900)}
                                                                {renderDegreeSection("Master's Degree", 'master_degree', 'master_year', bYearNum)}
                                                                {renderDegreeSection("Doctorate", 'doctorate_degree', 'doctorate_year', mYearNum)}

                                                                <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-slate-100">
                                                                    <SectionLabel>Other Educational / Professional Courses</SectionLabel>
                                                                    {isEditing && <button
                                                                        onClick={() => setProfile(p => ({ ...p, other_courses: [...(p.other_courses || []), { course: '', date_from: '', date_to: '', details: '' }] }))}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-brand-700 text-[15px] font-black uppercase tracking-wider rounded-lg hover:bg-brand-700 hover:text-white transition-all shadow-sm"
                                                                    >
                                                                        <FiPlus size={14} /> Add Course
                                                                    </button>}
                                                                </div>

                                                                {(!profile.other_courses || profile.other_courses.length === 0) ? (
                                                                    <div className="p-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                                                        <p className="text-[18px] font-semibold text-slate-400">No other courses added.</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-4">
                                                                        {profile.other_courses.map((course, idx) => (
                                                                            <div key={course.id || `course-${idx}`} className="relative p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl group">
                                                                                {isEditing && <button
                                                                                    onClick={() => setProfile(p => ({ ...p, other_courses: p.other_courses.filter((_, i) => i !== idx) }))}
                                                                                    className="absolute -right-2 -top-2 p-1.5 bg-white border-2 border-slate-200 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:border-red-100 shadow-sm"
                                                                                    title="Remove"
                                                                                >
                                                                                    <FiTrash2 size={14} />
                                                                                </button>}
                                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
                                                                                    <FloatingLabelInput label="Course Title" disabled={!isEditing} type="text" value={course.course || ''} onChange={e => setProfile(p => ({ ...p, other_courses: p.other_courses.map((x, i) => i === idx ? { ...x, course: e.target.value } : x) }))} placeholder="e.g. Executive Leadership Program" />
                                                                                    <FloatingLabelInput label="Details" disabled={!isEditing} type="text" value={course.details || ''} onChange={e => setProfile(p => ({ ...p, other_courses: p.other_courses.map((x, i) => i === idx ? { ...x, details: e.target.value } : x) }))} placeholder="Sponsor, Location, etc." />
                                                                                </div>
                                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                                                    <Field label="Date From">
                                                                                        <div className="relative">
                                                                                            <ModernDatePicker disabled={!isEditing}
                                                                                                value={course.date_from || ''}
                                                                                                onChange={val => setProfile(p => ({ ...p, other_courses: p.other_courses.map((x, i) => i === idx ? { ...x, date_from: val } : x) }))}
                                                                                                className={inp}
                                                                                            />
                                                                                        </div>
                                                                                    </Field>
                                                                                    <Field label="Date To">
                                                                                        <div className="relative">
                                                                                            <ModernDatePicker disabled={!isEditing}
                                                                                                value={course.date_to || ''}
                                                                                                onChange={val => setProfile(p => ({ ...p, other_courses: p.other_courses.map((x, i) => i === idx ? { ...x, date_to: val } : x) }))}
                                                                                                minDate={course.date_from ? new Date(course.date_from) : undefined}
                                                                                                className={inp}
                                                                                            />
                                                                                            {course.date_from && course.date_to && new Date(course.date_to) <= new Date(course.date_from) && (
                                                                                                <p className="text-red-500 text-[15px] mt-1 font-semibold absolute -bottom-5">Must be after From Date.</p>
                                                                                            )}
                                                                                        </div>
                                                                                    </Field>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
    </>
  );
};

export default EducationTab;
