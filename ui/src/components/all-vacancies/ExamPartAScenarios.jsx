import React from 'react';
import { CheckCircle as FiCheckCircle } from '@phosphor-icons/react';
import { APPLICANT_EXAM_DATA } from '../../constants/applicantExamQuestions';

const ExamPartAScenarios = ({ partAAnswers, setPartAAnswers }) => {
    const handleSelectOption = (scenarioId, optionIdx) => {
        setPartAAnswers(prev => ({
            ...prev,
            [scenarioId]: optionIdx
        }));
    };

    return (
        <div className="bg-white border-2 border-brand-800 rounded-card p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">
                    Assessment • Part A
                </span>
                <h3 className="text-base font-black text-brand-800 mt-0.5">
                    Situational Judgment Scenarios
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                    Evaluate each scenario and select the most appropriate executive leadership response.
                </p>
            </div>

            <div className="space-y-6">
                {APPLICANT_EXAM_DATA.scenarios.map((scenario) => (
                    <div key={scenario.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-brand-800 uppercase">
                                {scenario.title}
                            </span>
                            {partAAnswers[scenario.id] !== undefined && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                    <FiCheckCircle size={14} /> Answered
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                            {scenario.prompt}
                        </p>
                        <div className="space-y-2 pt-1">
                            {scenario.options.map((opt, idx) => {
                                const isSelected = partAAnswers[scenario.id] === idx;
                                return (
                                    <button
                                        type="button"
                                        key={idx}
                                        onClick={() => handleSelectOption(scenario.id, idx)}
                                        className={`w-full text-left p-3 rounded-lg text-xs font-medium border transition-all flex items-start gap-2.5 ${
                                            isSelected
                                                ? 'bg-brand-800 text-white border-brand-800'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 font-bold text-[10px] ${
                                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="leading-snug">{opt}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExamPartAScenarios;

