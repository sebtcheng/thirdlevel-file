import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from '../../utils/staticElements.jsx';
import { X as FiX, User as FiUser, Briefcase as FiBriefcase, MapPin as FiMapPin, Calendar as FiCalendar, FileText as FiFileText, DownloadSimple as FiDownload, Eye as FiEye, Medal as FiAward, FloppyDisk as FiSave, CheckCircle as FiCheckCircle, Warning as FiAlertTriangle, SpinnerGap as FiLoader, Check as FiCheck, Clipboard as FiClipboard, Sliders as FiSliders, Shield as FiShield, CheckSquare as FiCheckSquare, List as FiList } from '@phosphor-icons/react';
import { apiUrl } from '../../utils/api';
import Swal from 'sweetalert2';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const POSITION_TITLES = {
    RD: 'Regional Director (RD)',
    ARD: 'Assistant Regional Director (ARD)',
    SDS: 'Schools Division Superintendent (SDS)',
    ASDS: 'Assistant Schools Division Superintendent (ASDS)'
};

// Verbatim legacy statutory legal questions
const STATUTORY_QUESTIONS = [
    {
        key: 'pending_admin_case',
        label: '1. Do you have any pending administrative case/s?'
    },
    {
        key: 'guilty_admin_details',
        label: '2. Have you ever been found guilty of any administrative offense?'
    },
    {
        key: 'criminally_charged_details',
        label: '3. Have you been criminally charged before any court?'
    },
    {
        key: 'convicted_crime_details',
        label: '4. Have you ever been convicted of any crime or violation of any law?'
    }
];

const INITIAL_NSC_MEMBERS = [
    { evaluator_id: '1', evaluator_name: 'Committee Member 1', leadership: '', experience: '', education: '', interview: '', notes: '' },
    { evaluator_id: '2', evaluator_name: 'Committee Member 2', leadership: '', experience: '', education: '', interview: '', notes: '' },
    { evaluator_id: '3', evaluator_name: 'Committee Member 3', leadership: '', experience: '', education: '', interview: '', notes: '' },
    { evaluator_id: '4', evaluator_name: 'Committee Member 4', leadership: '', experience: '', education: '', interview: '', notes: '' },
    { evaluator_id: '5', evaluator_name: 'Committee Member 5', leadership: '', experience: '', education: '', interview: '', notes: '' }
];

const ApplicantInspectionModal = ({ isOpen, applicationId, onClose, token, onScoreSaved }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'documents_qs' | 'nsc_scoring' | 'summary'
    const [applicant, setApplicant] = useState(null);

    // Tab 2: Qualification Standards (QS) state
    const [qsEducationMet, setQsEducationMet] = useState(false);
    const [qsExperienceMet, setQsExperienceMet] = useState(false);
    const [qsTrainingMet, setQsTrainingMet] = useState(false);
    const [qsEligibilityMet, setQsEligibilityMet] = useState(false);
    const [savingQS, setSavingQS] = useState(false);

    // Tab 3: NSC Scoring state (up to 5 evaluators)
    const [nscMembers, setNscMembers] = useState(INITIAL_NSC_MEMBERS);
    const [activeMemberIndex, setActiveMemberIndex] = useState(0);
    const [savingNSC, setSavingNSC] = useState(false);

    // Fetch Application Details & relations
    const fetchDetail = useCallback(async () => {
        if (!applicationId) return;
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/admin/records/applications/${applicationId}`), {
                headers: {
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (data.success && data.data) {
                const appData = data.data;
                setApplicant(appData);

                // Populate QS Standards booleans
                setQsEducationMet(Boolean(appData.qs_education_met));
                setQsExperienceMet(Boolean(appData.qs_experience_met));
                setQsTrainingMet(Boolean(appData.qs_training_met));
                setQsEligibilityMet(Boolean(appData.qs_eligibility_met));

                // Populate NSC evaluator scores
                const fetchedScores = Array.isArray(appData.nsc_scores) ? appData.nsc_scores : [];
                const merged = INITIAL_NSC_MEMBERS.map((defaultMember) => {
                    const found = fetchedScores.find(
                        s => String(s.evaluator_id) === String(defaultMember.evaluator_id) ||
                             String(s.evaluator_id) === `evaluator_${defaultMember.evaluator_id}` ||
                             String(s.evaluator_id) === `member_${defaultMember.evaluator_id}`
                    );
                    if (found) {
                        return {
                            evaluator_id: defaultMember.evaluator_id,
                            evaluator_name: found.evaluator_name || defaultMember.evaluator_name,
                            leadership: found.leadership !== null && found.leadership !== undefined ? found.leadership : '',
                            experience: found.experience !== null && found.experience !== undefined ? found.experience : '',
                            education: found.education !== null && found.education !== undefined ? found.education : '',
                            interview: found.interview !== null && found.interview !== undefined ? found.interview : '',
                            notes: found.notes || '',
                            total: found.total
                        };
                    }
                    return defaultMember;
                });
                setNscMembers(merged);
            } else {
                throw new Error(data.error || 'Failed to load applicant detail.');
            }
        } catch (err) {
            console.error('[ApplicantInspectionModal] Fetch error:', err);
            Swal.fire('Error', err.message || 'Could not retrieve application details.', 'error');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [applicationId, token, onClose]);

    useEffect(() => {
        if (!isOpen || !applicationId) {
            setApplicant(null);
            setActiveTab('basic');
            setActiveMemberIndex(0);
            return;
        }
        fetchDetail();
    }, [isOpen, applicationId, fetchDetail]);

    // Calculate individual weighted score for an evaluator
    const calculateMemberTotal = (member) => {
        const l = parseFloat(member.leadership) || 0;
        const ex = parseFloat(member.experience) || 0;
        const ed = parseFloat(member.education) || 0;
        const i = parseFloat(member.interview) || 0;
        const total = (l * 0.35) + (ex * 0.35) + (ed * 0.20) + (i * 0.10);
        return total > 0 ? parseFloat(total.toFixed(2)) : 0;
    };

    // Calculate overall average across members who have scored
    const overallNSCAverage = useMemo(() => {
        if (applicant?.nsc_average_score !== null && applicant?.nsc_average_score !== undefined) {
            return applicant.nsc_average_score;
        }
        const scoredMembers = nscMembers.map(m => calculateMemberTotal(m)).filter(tot => tot > 0);
        if (scoredMembers.length === 0) return null;
        const sum = scoredMembers.reduce((acc, curr) => acc + curr, 0);
        return parseFloat((sum / scoredMembers.length).toFixed(2));
    }, [applicant?.nsc_average_score, nscMembers]);

    // Handle QS toggle
    const handleSaveQS = async () => {
        setSavingQS(true);
        try {
            const payload = {
                qs_education_met: qsEducationMet,
                qs_experience_met: qsExperienceMet,
                qs_training_met: qsTrainingMet,
                qs_eligibility_met: qsEligibilityMet
            };

            const res = await fetch(apiUrl(`/api/admin/records/applications/${applicationId}/qs`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update qualification standards.');
            }

            // Sync applicant state with server response (enforcing server's overall status)
            setApplicant(prev => ({
                ...prev,
                qs_education_met: data.data.qs_education_met,
                qs_experience_met: data.data.qs_experience_met,
                qs_training_met: data.data.qs_training_met,
                qs_eligibility_met: data.data.qs_eligibility_met,
                overall_qualification_status: data.data.overall_qualification_status
            }));

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: data.data.overall_qualification_status === 'QUALIFIED' ? 'success' : 'info',
                title: `QS Evaluation Saved: ${data.data.overall_qualification_status}`,
                showConfirmButton: false,
                timer: 2500
            });

            if (onScoreSaved) {
                onScoreSaved();
            }
        } catch (err) {
            console.error('[ApplicantInspectionModal] Save QS error:', err);
            Swal.fire('Save Failed', err.message, 'error');
        } finally {
            setSavingQS(false);
        }
    };

    // Update specific field for currently active member
    const handleMemberScoreChange = (field, val) => {
        setNscMembers(prev => {
            const updated = [...prev];
            if (field === 'evaluator_name' || field === 'notes') {
                updated[activeMemberIndex] = { ...updated[activeMemberIndex], [field]: val };
            } else {
                if (val === '') {
                    updated[activeMemberIndex] = { ...updated[activeMemberIndex], [field]: '' };
                } else {
                    const num = Math.min(100, Math.max(0, parseFloat(val) || 0));
                    updated[activeMemberIndex] = { ...updated[activeMemberIndex], [field]: num };
                }
            }
            return updated;
        });
    };

    // Save active member or all members to backend
    const handleSaveNSCMember = async (saveAll = false) => {
        setSavingNSC(true);
        try {
            let payload;
            if (saveAll) {
                payload = {
                    scores: nscMembers.map(m => ({
                        evaluator_id: m.evaluator_id,
                        evaluator_name: m.evaluator_name,
                        leadership: parseFloat(m.leadership) || 0,
                        experience: parseFloat(m.experience) || 0,
                        education: parseFloat(m.education) || 0,
                        interview: parseFloat(m.interview) || 0,
                        notes: m.notes
                    }))
                };
            } else {
                const cur = nscMembers[activeMemberIndex];
                payload = {
                    evaluator_id: cur.evaluator_id,
                    evaluator_name: cur.evaluator_name,
                    leadership: parseFloat(cur.leadership) || 0,
                    experience: parseFloat(cur.experience) || 0,
                    education: parseFloat(cur.education) || 0,
                    interview: parseFloat(cur.interview) || 0,
                    notes: cur.notes
                };
            }

            const res = await fetch(apiUrl(`/api/admin/records/applications/${applicationId}/nsc-scores`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save NSC score.');
            }

            // Sync updated scores & average from server
            setApplicant(prev => ({
                ...prev,
                nsc_scores: data.data.scores,
                nsc_average_score: data.data.overall_average_score,
                nsc_summary: data.data
            }));

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `NSC Scores Saved. Overall Average: ${data.data.overall_average_score || '—'}`,
                showConfirmButton: false,
                timer: 2500
            });

            if (onScoreSaved) {
                onScoreSaved();
            }
        } catch (err) {
            console.error('[ApplicantInspectionModal] Save NSC error:', err);
            Swal.fire('Save Failed', err.message, 'error');
        } finally {
            setSavingNSC(false);
        }
    };

    const handlePreviewDocument = (doc) => {
        if (!doc.binary_id && !doc.preview_url) {
            Swal.fire('Preview Unavailable', 'Document binary stream is not ready for direct preview.', 'info');
            return;
        }
        const url = doc.preview_url ? apiUrl(doc.preview_url) : apiUrl(`/api/binary/${doc.binary_id}`);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadDocument = (doc) => {
        if (!doc.binary_id && !doc.download_url) {
            Swal.fire('Download Unavailable', 'Document binary content is not accessible.', 'info');
            return;
        }
        const url = doc.download_url ? apiUrl(doc.download_url) : apiUrl(`/api/binary/${doc.binary_id}`);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', doc.file_name || 'document.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    const currentMember = nscMembers[activeMemberIndex];
    const currentMemberTotal = calculateMemberTotal(currentMember);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-4xl bg-white rounded-card border-2 border-brand-800 shadow-2xl overflow-hidden z-10 my-8 flex flex-col max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="bg-brand-800 text-white p-6 sm:p-7 flex items-center justify-between shrink-0 border-b border-blue-900 relative">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-gold font-black border border-white/10 shrink-0">
                                <FiBriefcase size={22} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">
                                        TIMON Applications • Inspection & Deliberation
                                    </span>
                                    {applicant && (
                                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 text-[10px] font-bold">
                                            #{applicant.id}
                                        </span>
                                    )}
                                </div>
                                <h2 className="modal-title text-xl sm:text-2xl text-white tracking-tight mt-0.5 truncate">
                                    {applicant ? applicant.candidate_name : 'Loading Applicant...'}
                                </h2>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
                            title="Close Modal"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* 4-Tab Navigation Header */}
                    <div className="flex border-b border-slate-200 bg-slate-50 px-6 sm:px-8 gap-2 overflow-x-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab('basic')}
                            className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                                activeTab === 'basic'
                                    ? 'border-brand-800 text-brand-800 bg-white rounded-t-xl shadow-sm'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <FiUser size={14} /> Tab 1: Basic Information
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('documents_qs')}
                            className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                                activeTab === 'documents_qs'
                                    ? 'border-brand-800 text-brand-800 bg-white rounded-t-xl shadow-sm'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <FiFileText size={14} /> Tab 2: Documentary & QS
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('nsc_scoring')}
                            className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                                activeTab === 'nsc_scoring'
                                    ? 'border-brand-800 text-brand-800 bg-white rounded-t-xl shadow-sm'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <FiAward size={14} /> Tab 3: NSC Scoring
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('summary')}
                            className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                                activeTab === 'summary'
                                    ? 'border-brand-800 text-brand-800 bg-white rounded-t-xl shadow-sm'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <FiClipboard size={14} /> Tab 4: Summary
                        </button>
                    </div>

                    {/* Body Content */}
                    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                        {loading ? (
                            <div className="py-24 text-center">
                                <FiLoader className="animate-spin text-brand-800 mx-auto mb-3" size={34} />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Application Dossier...</p>
                            </div>
                        ) : !applicant ? (
                            <div className="py-16 text-center text-slate-400 font-bold">
                                Applicant record details could not be loaded.
                            </div>
                        ) : (
                            <>
                                {/* ================= TAB 1: BASIC INFORMATION ================= */}
                                {activeTab === 'basic' && (
                                    <div className="space-y-6">
                                        {/* Applicant Target & Position Card */}
                                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                                <FiUser className="text-brand-800" size={16} />
                                                <h3 className="text-xs font-black text-brand-800 uppercase tracking-widest">
                                                    Target Position & Regional Jurisdiction
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Applied Position</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="px-2.5 py-1 rounded-md bg-brand-800 text-white text-xs font-black">
                                                            {applicant.applied_position}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-700 truncate">
                                                            {POSITION_TITLES[applicant.applied_position] || applicant.applied_position}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Region</p>
                                                    <div className="flex items-center gap-1.5 mt-1 text-slate-800 font-black text-sm">
                                                        <FiMapPin className="text-brand-700 shrink-0" size={15} />
                                                        <span className="truncate">{applicant.target_region}</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate ID</p>
                                                    <p className="text-xs font-bold text-slate-700 mt-1 truncate">
                                                        {applicant.candidate_id || `APP-${applicant.id}`}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submission Date</p>
                                                    <div className="flex items-center gap-1.5 mt-1 text-slate-700 font-bold text-xs">
                                                        <FiCalendar className="text-slate-400 shrink-0" size={14} />
                                                        <span>
                                                            {new Date(applicant.submission_timestamp).toLocaleString('en-US', {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short'
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Email</p>
                                                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                                                        {applicant.email || '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Number</p>
                                                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                                                        {applicant.contact_number || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Restored Statutory Legal Questionnaire Responses */}
                                        <div className="p-6 rounded-card bg-white border-2 border-slate-200 space-y-4 shadow-sm">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <FiShield className="text-brand-800" size={16} />
                                                    <h3 className="text-xs font-black text-brand-800 uppercase tracking-widest">
                                                        Statutory Legal & Integrity Disclosures (Civil Service Standard)
                                                    </h3>
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-brand-800 border border-blue-200">
                                                    Verified Intake Questions
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {STATUTORY_QUESTIONS.map((q) => {
                                                    const rawVal = applicant.questionnaire_responses?.[q.key];
                                                    const isYes = String(rawVal).toLowerCase() === 'yes';

                                                    return (
                                                        <div
                                                            key={q.key}
                                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-3"
                                                        >
                                                            <div className="min-w-0 pr-3">
                                                                <p className="text-xs font-bold text-slate-800 leading-snug">
                                                                    {q.label}
                                                                </p>
                                                            </div>
                                                            <div className="shrink-0 flex items-center gap-2">
                                                                <span
                                                                    className={`px-3.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                                                                        isYes
                                                                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                                                                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                    }`}
                                                                >
                                                                    {isYes ? <FiAlertTriangle size={13} /> : <FiCheck size={13} />}
                                                                    {rawVal || 'No'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ================= TAB 2: DOCUMENTARY SUBMISSIONS & QS ================= */}
                                {activeTab === 'documents_qs' && (
                                    <div className="space-y-6">
                                        {/* Submissions List */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <FiFileText className="text-brand-800" size={16} />
                                                    <h3 className="text-xs font-black text-brand-800 uppercase tracking-widest">
                                                        Attached Documentary Evidence
                                                    </h3>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400">
                                                    {applicant.documents?.length || 0} Attached File(s)
                                                </span>
                                            </div>

                                            {(!applicant.documents || applicant.documents.length === 0) ? (
                                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                                    <FiAlertTriangle className="text-amber-500 mx-auto mb-2" size={24} />
                                                    <p className="text-xs font-bold text-slate-500">No document attachments registered on this application.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {applicant.documents.map((doc, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-card bg-white border-2 border-slate-100 hover:border-slate-200 transition-all gap-4 shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-800 flex items-center justify-center shrink-0">
                                                                    <FiFileText size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="text-xs font-black text-brand-800 uppercase truncate">
                                                                            {doc.file_name}
                                                                        </h4>
                                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                                                            {doc.doc_type}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                                                        {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB` : 'Verified attachment'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePreviewDocument(doc)}
                                                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-brand-800 hover:text-white text-brand-800 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                                                >
                                                                    <FiEye size={14} /> Preview
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownloadDocument(doc)}
                                                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-800 hover:bg-blue-900 text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                                                >
                                                                    <FiDownload size={14} /> Download
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Qualification Standards (QS) Evaluation & Server-Derived Status */}
                                        <div className="p-6 rounded-card bg-white border-2 border-brand-800 space-y-5 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                                                <div className="flex items-center gap-2">
                                                    <FiCheckSquare className="text-brand-800" size={18} />
                                                    <div>
                                                        <h3 className="text-xs font-black text-brand-800 uppercase tracking-widest">
                                                            Qualification Standards (QS) Checklist
                                                        </h3>
                                                        <p className="text-[11px] font-medium text-slate-500">
                                                            All 4 criteria must be satisfied for a status of QUALIFIED.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Real-time Server-derived Status Badge */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase text-slate-400">Server QS Status:</span>
                                                    {applicant.overall_qualification_status === 'QUALIFIED' ? (
                                                        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border-2 border-emerald-300 font-black text-xs uppercase flex items-center gap-1.5">
                                                            <FiCheckCircle size={14} /> QUALIFIED
                                                        </span>
                                                    ) : applicant.overall_qualification_status === 'NOT QUALIFIED' ? (
                                                        <span className="px-3.5 py-1.5 rounded-xl bg-rose-100 text-rose-800 border-2 border-rose-300 font-black text-xs uppercase flex items-center gap-1.5">
                                                            <FiAlertTriangle size={14} /> NOT QUALIFIED
                                                        </span>
                                                    ) : (
                                                        <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 border-2 border-slate-200 font-black text-xs uppercase">
                                                            PENDING EVALUATION
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 4 QS Standards Toggles / Checkboxes */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* 1. Education Met */}
                                                <div
                                                    onClick={() => setQsEducationMet(!qsEducationMet)}
                                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                                                        qsEducationMet
                                                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center shrink-0 border-2 transition-all ${
                                                        qsEducationMet ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                                                    }`}>
                                                        {qsEducationMet && <FiCheck size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-black text-slate-800 uppercase">
                                                                1. Education Standard
                                                            </h4>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                                qsEducationMet ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                                {qsEducationMet ? 'Met ✓' : 'Not Met'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] font-medium text-slate-600 mt-1 leading-relaxed">
                                                            Master&apos;s Degree in Education / relevant field or CES / CSEE educational eligibility.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 2. Experience Met */}
                                                <div
                                                    onClick={() => setQsExperienceMet(!qsExperienceMet)}
                                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                                                        qsExperienceMet
                                                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center shrink-0 border-2 transition-all ${
                                                        qsExperienceMet ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                                                    }`}>
                                                        {qsExperienceMet && <FiCheck size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-black text-slate-800 uppercase">
                                                                2. Experience Standard
                                                            </h4>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                                qsExperienceMet ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                                {qsExperienceMet ? 'Met ✓' : 'Not Met'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] font-medium text-slate-600 mt-1 leading-relaxed">
                                                            5+ years of relevant supervisory, administrative, or executive managerial experience.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 3. Training Met */}
                                                <div
                                                    onClick={() => setQsTrainingMet(!qsTrainingMet)}
                                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                                                        qsTrainingMet
                                                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center shrink-0 border-2 transition-all ${
                                                        qsTrainingMet ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                                                    }`}>
                                                        {qsTrainingMet && <FiCheck size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-black text-slate-800 uppercase">
                                                                3. Training Standard
                                                            </h4>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                                qsTrainingMet ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                                {qsTrainingMet ? 'Met ✓' : 'Not Met'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] font-medium text-slate-600 mt-1 leading-relaxed">
                                                            120+ hours of relevant executive leadership / managerial training recognized by CSC.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 4. Eligibility Met */}
                                                <div
                                                    onClick={() => setQsEligibilityMet(!qsEligibilityMet)}
                                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                                                        qsEligibilityMet
                                                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center shrink-0 border-2 transition-all ${
                                                        qsEligibilityMet ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                                                    }`}>
                                                        {qsEligibilityMet && <FiCheck size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-black text-slate-800 uppercase">
                                                                4. Eligibility Standard
                                                            </h4>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                                qsEligibilityMet ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                                {qsEligibilityMet ? 'Met ✓' : 'Not Met'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] font-medium text-slate-600 mt-1 leading-relaxed">
                                                            CESO, CSEE, Career Executive Service Eligibility, or equivalent third-level rating.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3">
                                                <p className="text-[11px] font-bold text-slate-400">
                                                    Status is computed and enforced strictly on the server upon saving.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveQS}
                                                    disabled={savingQS}
                                                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-800 hover:bg-blue-900 text-white font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {savingQS ? (
                                                        <>
                                                            <FiLoader className="animate-spin" size={14} /> Saving Evaluation...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiSave size={14} /> Save QS Evaluation
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ================= TAB 3: NSC SCORING ================= */}
                                {activeTab === 'nsc_scoring' && (
                                    <div className="space-y-6">
                                        {/* Top Banner: NSC Aggregated Overall Average */}
                                        <div className="p-6 rounded-2xl bg-brand-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">
                                                        National Screening Committee (NSC)
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-black tracking-tight text-white">
                                                    Executive Evaluation Scoring Matrix
                                                </h3>
                                                <p className="text-xs text-blue-200">
                                                    Aggregate average across up to 5 committee evaluators (35% Leadership, 35% Experience, 20% Education, 10% Deliberation).
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-2xl border border-white/10 shrink-0">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-gold">
                                                        Overall Average Score
                                                    </p>
                                                    <p className="text-2xl font-black text-white">
                                                        {overallNSCAverage !== null && overallNSCAverage !== undefined ? overallNSCAverage : '—'} <span className="text-xs text-blue-200 font-semibold">/ 100</span>
                                                    </p>
                                                </div>
                                                <div className="w-12 h-12 rounded-xl bg-gold text-brand-800 flex items-center justify-center font-black">
                                                    <FiAward size={24} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Committee Member Tabs Selector */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black text-brand-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <FiSliders size={14} /> Committee Evaluators (5 Members)
                                                </h4>
                                                <span className="text-xs font-bold text-slate-400">
                                                    Select member to input or edit scores
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                {nscMembers.map((member, idx) => {
                                                    const tot = calculateMemberTotal(member);
                                                    const isActive = activeMemberIndex === idx;

                                                    return (
                                                        <button
                                                            key={member.evaluator_id}
                                                            type="button"
                                                            onClick={() => setActiveMemberIndex(idx)}
                                                            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                                                isActive
                                                                    ? 'border-brand-800 bg-blue-50/60 shadow-sm'
                                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase text-slate-400">
                                                                    Member {idx + 1}
                                                                </span>
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                                                    tot > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-400'
                                                                }`}>
                                                                    {tot > 0 ? tot : '—'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-800 truncate mt-1">
                                                                {member.evaluator_name || `Member ${idx + 1}`}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Active Evaluator Input Form Card */}
                                        <div className="p-6 rounded-card bg-white border-2 border-slate-200 space-y-5 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-700">
                                                        Active Evaluator Form • Slot #{activeMemberIndex + 1}
                                                    </span>
                                                    <FloatingLabelInput label="Evaluator Full Name / Title" className="block mt-0.5 w-full sm:w-80" type="text" value={currentMember.evaluator_name} onChange={e => handleMemberScoreChange('evaluator_name', e.target.value)} placeholder="Evaluator Full Name / Title" />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400">Member Weighted Score:</span>
                                                    <span className="px-3.5 py-1.5 rounded-xl bg-brand-800 text-gold font-black text-xs">
                                                        {currentMemberTotal > 0 ? currentMemberTotal : '—'} / 100
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Criteria Inputs */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="space-y-1.5">
                                                    <FloatingLabelInput label="Executive Leadership (35%)" className="w-full" inputClassName="text-center" type="number" min="0" max="100" step="0.5" value={currentMember.leadership} onChange={e => handleMemberScoreChange('leadership', e.target.value)} placeholder="0 - 100" />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <FloatingLabelInput label="Experience & Track Record (35%)" className="w-full" inputClassName="text-center" type="number" min="0" max="100" step="0.5" value={currentMember.experience} onChange={e => handleMemberScoreChange('experience', e.target.value)} placeholder="0 - 100" />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <FloatingLabelInput label="Education & CES Rank (20%)" className="w-full" inputClassName="text-center" type="number" min="0" max="100" step="0.5" value={currentMember.education} onChange={e => handleMemberScoreChange('education', e.target.value)} placeholder="0 - 100" />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <FloatingLabelInput label="Deliberation / Panel (10%)" className="w-full" inputClassName="text-center" type="number" min="0" max="100" step="0.5" value={currentMember.interview} onChange={e => handleMemberScoreChange('interview', e.target.value)} placeholder="0 - 100" />
                                                </div>
                                            </div>

                                            {/* Evaluator Notes */}
                                            <div className="space-y-1.5">
                                                <FloatingLabelInput as="textarea" label="Evaluator Remarks & Deliberation Notes" className="w-full" rows="2" value={currentMember.notes} onChange={e => handleMemberScoreChange('notes', e.target.value)} placeholder="Enter notes, observations, or deliberation comments for this evaluator..." />
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveNSCMember(false)}
                                                    disabled={savingNSC}
                                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-brand-800 hover:text-white text-brand-800 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    <FiSave size={14} /> Save This Member (#{activeMemberIndex + 1})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveNSCMember(true)}
                                                    disabled={savingNSC}
                                                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-800 hover:bg-blue-900 text-white font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {savingNSC ? (
                                                        <>
                                                            <FiLoader className="animate-spin" size={14} /> Saving Matrix...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiAward size={14} /> Save Entire Scoring Matrix
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Committee Evaluation Summary Matrix Table */}
                                        <div className="p-6 rounded-card bg-white border border-slate-200 space-y-3">
                                            <h4 className="text-xs font-black text-brand-800 uppercase tracking-wider flex items-center gap-1.5">
                                                <FiList size={14} /> Summary Matrix of 5 Committee Evaluators
                                            </h4>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="border-b-2 border-slate-200 text-slate-400 font-black uppercase text-[10px]">
                                                            <th className="py-2.5 px-3">Evaluator</th>
                                                            <th className="py-2.5 px-3 text-center">Leadership (35%)</th>
                                                            <th className="py-2.5 px-3 text-center">Experience (35%)</th>
                                                            <th className="py-2.5 px-3 text-center">Education (20%)</th>
                                                            <th className="py-2.5 px-3 text-center">Deliberation (10%)</th>
                                                            <th className="py-2.5 px-3 text-right">Weighted Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                                        {nscMembers.map((m, idx) => {
                                                            const t = calculateMemberTotal(m);
                                                            return (
                                                                <tr key={m.evaluator_id} className="hover:bg-slate-50">
                                                                    <td className="py-2.5 px-3">
                                                                        <span className="font-black text-brand-800 mr-1.5">#{idx + 1}</span>
                                                                        <span>{m.evaluator_name || `Member ${idx + 1}`}</span>
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center text-slate-600">{m.leadership !== '' ? m.leadership : '—'}</td>
                                                                    <td className="py-2.5 px-3 text-center text-slate-600">{m.experience !== '' ? m.experience : '—'}</td>
                                                                    <td className="py-2.5 px-3 text-center text-slate-600">{m.education !== '' ? m.education : '—'}</td>
                                                                    <td className="py-2.5 px-3 text-center text-slate-600">{m.interview !== '' ? m.interview : '—'}</td>
                                                                    <td className="py-2.5 px-3 text-right font-black text-brand-800">
                                                                        {t > 0 ? t : '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-brand-800">
                                                            <td className="py-3 px-3 uppercase text-[10px] tracking-wider">Overall Committee Average</td>
                                                            <td colSpan="4" className="py-3 px-3 text-center text-slate-400 font-semibold text-[11px]">
                                                                Aggregated server-side across all completed evaluators
                                                            </td>
                                                            <td className="py-3 px-3 text-right text-sm text-brand-700">
                                                                {overallNSCAverage !== null && overallNSCAverage !== undefined ? overallNSCAverage : '—'}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ================= TAB 4: SUMMARY ================= */}
                                {activeTab === 'summary' && (
                                    <div className="space-y-6">
                                        {/* Rollup Header Card */}
                                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <FiClipboard className="text-brand-800" size={16} />
                                                    <h3 className="text-xs font-black text-brand-800 uppercase tracking-widest">
                                                        Candidate Rollup Summary & Executive Standing
                                                    </h3>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                    Read-Only Deliberation View
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate</p>
                                                    <p className="text-sm font-black text-brand-800 mt-0.5 truncate">{applicant.candidate_name}</p>
                                                    <p className="text-[11px] font-medium text-slate-500">{applicant.email || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position & Region</p>
                                                    <p className="text-sm font-black text-slate-800 mt-0.5">
                                                        {applicant.applied_position} • {applicant.target_region}
                                                    </p>
                                                    <p className="text-[11px] font-medium text-slate-500 truncate">
                                                        {POSITION_TITLES[applicant.applied_position] || applicant.applied_position}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall QS Status</p>
                                                    <div className="mt-1">
                                                        {applicant.overall_qualification_status === 'QUALIFIED' ? (
                                                            <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs uppercase inline-flex items-center gap-1">
                                                                <FiCheckCircle size={13} /> QUALIFIED
                                                            </span>
                                                        ) : applicant.overall_qualification_status === 'NOT QUALIFIED' ? (
                                                            <span className="px-3 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-black text-xs uppercase inline-flex items-center gap-1">
                                                                <FiAlertTriangle size={13} /> NOT QUALIFIED
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs uppercase inline-block">
                                                                PENDING QS
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NSC Average Score</p>
                                                    <p className="text-xl font-black text-brand-700 mt-0.5">
                                                        {overallNSCAverage !== null && overallNSCAverage !== undefined ? `${overallNSCAverage} / 100` : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Split Sections: QS Details & Statutory Disclosures */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Left: Qualification Standards (QS) Review */}
                                            <div className="p-6 rounded-card bg-white border-2 border-slate-200 space-y-4 shadow-sm">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                    <FiCheckSquare className="text-brand-800" size={16} />
                                                    <h4 className="text-xs font-black text-brand-800 uppercase tracking-wider">
                                                        Qualification Standards (QS) Rollup
                                                    </h4>
                                                </div>

                                                <div className="space-y-2.5 text-xs">
                                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                                        <span className="font-bold text-slate-700">1. Education Standard</span>
                                                        <span className={`px-2.5 py-0.5 rounded font-black uppercase text-[10px] ${
                                                            applicant.qs_education_met ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                            {applicant.qs_education_met ? 'MET ✓' : 'NOT MET'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                                        <span className="font-bold text-slate-700">2. Experience Standard</span>
                                                        <span className={`px-2.5 py-0.5 rounded font-black uppercase text-[10px] ${
                                                            applicant.qs_experience_met ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                            {applicant.qs_experience_met ? 'MET ✓' : 'NOT MET'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                                        <span className="font-bold text-slate-700">3. Training Standard</span>
                                                        <span className={`px-2.5 py-0.5 rounded font-black uppercase text-[10px] ${
                                                            applicant.qs_training_met ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                            {applicant.qs_training_met ? 'MET ✓' : 'NOT MET'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                                        <span className="font-bold text-slate-700">4. Eligibility Standard</span>
                                                        <span className={`px-2.5 py-0.5 rounded font-black uppercase text-[10px] ${
                                                            applicant.qs_eligibility_met ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                            {applicant.qs_eligibility_met ? 'MET ✓' : 'NOT MET'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Statutory Disclosures Rollup */}
                                            <div className="p-6 rounded-card bg-white border-2 border-slate-200 space-y-4 shadow-sm">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                    <FiShield className="text-brand-800" size={16} />
                                                    <h4 className="text-xs font-black text-brand-800 uppercase tracking-wider">
                                                        Statutory Integrity Disclosures
                                                    </h4>
                                                </div>

                                                <div className="space-y-2.5 text-xs">
                                                    {STATUTORY_QUESTIONS.map(q => {
                                                        const isYes = String(applicant.questionnaire_responses?.[q.key]).toLowerCase() === 'yes';
                                                        return (
                                                            <div key={q.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                                                <span className="font-medium text-slate-700 truncate pr-2" title={q.label}>
                                                                    {q.label.replace(/^\d+\.\s*/, '')}
                                                                </span>
                                                                <span className={`px-2.5 py-0.5 rounded font-black uppercase text-[10px] shrink-0 ${
                                                                    isYes ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                                                }`}>
                                                                    {isYes ? 'YES (FLAG)' : 'CLEAR'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom: NSC Evaluation Committee Scores Breakdown */}
                                        <div className="p-6 rounded-card bg-white border-2 border-brand-800 space-y-4 shadow-sm">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <FiAward className="text-brand-800" size={18} />
                                                    <h4 className="text-xs font-black text-brand-800 uppercase tracking-wider">
                                                        NSC Committee Evaluator Scores
                                                    </h4>
                                                </div>
                                                <div className="text-xs font-bold text-slate-600">
                                                    Overall Deliberation Score: <span className="font-black text-brand-700 text-sm">{overallNSCAverage !== null && overallNSCAverage !== undefined ? overallNSCAverage : '—'}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                                {nscMembers.map((m, idx) => {
                                                    const tot = calculateMemberTotal(m);
                                                    return (
                                                        <div key={m.evaluator_id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                                                            <span className="text-[10px] font-black uppercase text-slate-400">
                                                                Evaluator {idx + 1}
                                                            </span>
                                                            <p className="text-xs font-black text-slate-800 truncate" title={m.evaluator_name}>
                                                                {m.evaluator_name || `Member ${idx + 1}`}
                                                            </p>
                                                            <p className="text-lg font-black text-brand-800 mt-1">
                                                                {tot > 0 ? tot : '—'} <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
                                                            </p>
                                                            {m.notes && (
                                                                <p className="text-[10px] text-slate-500 italic truncate" title={m.notes}>
                                                                    &quot;{m.notes}&quot;
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ApplicantInspectionModal;
