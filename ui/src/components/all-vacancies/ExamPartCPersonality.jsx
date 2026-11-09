import React from 'react';
import { APPLICANT_EXAM_DATA } from '../../constants/applicantExamQuestions';

const ExamPartCPersonality = ({ partCRatings, setPartCRatings, partCSets, setPartCSets }) => {
    const handleRating = (statementId, rating) => {
        setPartCRatings(prev => ({
            ...prev,
            [statementId]: rating
        }));
    };

    const handleSetChoice = (setId, type, optionIdx) => {
        setPartCSets(prev => ({
            ...prev,
            [setId]: {
                ...(prev[setId] || {}),
                [type]: optionIdx
            }
        }));
    };

    return (
        <div className="bg-white border-2 border-brand-800 rounded-card p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">
                    Assessment • Part C
                </span>
                <h3 className="text-base font-black text-brand-800 mt-0.5">
                    Behavioral & Leadership Questionnaire
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                    Rate how accurately each statement reflects your typical executive approach (1 = Disagree, 5 = Strongly Agree).
                </p>
            </div>

            {/* Statements Rating (Sampled or Paginated) */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-wider">
                    Section 1: Work Style Statements (50 Items)
                </h4>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {APPLICANT_EXAM_DATA.statements.map((stmt) => (
                        <div
                            key={stmt.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 gap-2 text-xs"
                        >
                            <span className="font-semibold text-slate-700">
                                {stmt.id}. {stmt.text}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[1, 2, 3, 4, 5].map((val) => {
                                    const isSelected = partCRatings[stmt.id] === val;
                                    return (
                                        <button
                                            type="button"
                                            key={val}
                                            onClick={() => handleRating(stmt.id, val)}
                                            className={`w-7 h-7 rounded text-[11px] font-black border transition-all ${
                                                isSelected
                                                    ? 'bg-brand-800 text-white border-brand-800'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            {val}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Forced-Choice Sets */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-wider">
                    Section 2: Forced Choice Profiles (20 Sets)
                </h4>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {APPLICANT_EXAM_DATA.sets.map((set) => (
                        <div key={set.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                            <span className="text-[11px] font-black text-brand-800 uppercase">
                                Set {set.id}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {set.options.map((opt, optIdx) => {
                                    const currentSet = partCSets[set.id] || {};
                                    const isMost = currentSet.most === optIdx;
                                    const isLeast = currentSet.least === optIdx;

                                    return (
                                        <div key={optIdx} className="p-2.5 rounded bg-white border border-slate-200 text-xs flex flex-col justify-between gap-2">
                                            <span className="text-slate-700 font-medium text-[11px]">{opt}</span>
                                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10px] font-bold">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetChoice(set.id, 'most', optIdx)}
                                                    className={`px-2 py-0.5 rounded transition-all ${
                                                        isMost ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    Most Like Me
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetChoice(set.id, 'least', optIdx)}
                                                    className={`px-2 py-0.5 rounded transition-all ${
                                                        isLeast ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    Least Like Me
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExamPartCPersonality;

