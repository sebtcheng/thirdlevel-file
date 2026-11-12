import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CaretLeft as FiChevronLeft, CaretRight as FiChevronRight, CheckCircle as FiCheckCircle, Warning as FiAlertTriangle, Lock as FiLock, SignIn as FiLogIn, UserPlus as FiUserPlus, Clock as FiClock, User as FiUser, PaperPlaneTilt as FiSend, SpinnerGap as FiLoader, Clipboard as FiClipboard, CloudArrowUp as FiUploadCloud } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';
import { apiUrl } from '../utils/api';
import { fetchLookupJson } from '../utils/lookupCache';
import Swal from 'sweetalert2';
import FormErrorSummary from '../components/forms/FormErrorSummary.jsx';
import {
    ExecutivePositionSection,
    PersonalEmploymentSection,
    DesignationOICSection,
    EligibilitiesSection,
    TwelveDocumentsSection,
    StatutoryDeclarationsSection,
    FormTabs,
    REQUIRED_DOCUMENTS,
    formatContactNumber
} from '../components/all-vacancies';

const AllVacancies = () => {
    const navigate = useNavigate();
    // /timon-applications/:applicationId opens one past submission read-only; /timon-applications/new is the form.
    const { applicationId } = useParams();
    const { user, token, logout } = useAuth();

    // Intake window state
    const [windowLoading, setWindowLoading] = useState(true);
    const [intakeWindow, setIntakeWindow] = useState({
        isOpen: false,
        message: '',
        intake_start_date: null,
        intake_end_date: null
    });

    // Step 1: Executive Position & Region
    const [errors, setErrors] = useState([]);
    const [appliedPosition, setAppliedPosition] = useState('');
    const [targetRegion, setTargetRegion] = useState('');

    // Step 2: Personal Details & Current Employment
    const [personalData, setPersonalData] = useState({
        surname: (user?.last_name || '').toUpperCase(),
        first_name: (user?.first_name || '').toUpperCase(),
        middle_name: (user?.middle_name || '').toUpperCase(),
        date_of_birth: user?.birth_date || '',
        contact_number: formatContactNumber(user?.contact_number || user?.contact_details || ''),
        current_position: user?.position || user?.current_position || '',
        plantilla_office: user?.office || user?.plantilla_office || ''
    });

    // Step 3: Designation & OIC Assignment
    const [designationData, setDesignationData] = useState({
        is_assigned_third_level: 'No',
        designation_capacity: '',
        current_designation_preset: 'N/A',
        current_designation_custom: '',
        assigned_oic_region: '',
        assigned_oic_division: '',
        assigned_oic_office: ''
    });

    // Step 4: Examination & CES Eligibilities
    const [eligibilityData, setEligibilityData] = useState({
        is_let_passer: false,
        is_emt_passer: false,
        ces_eligibility_stage: 'Stage 1 (CES Written Examination)',
        ces_stage_date: ''
    });

    // Step 5: 12 Required Document Attachments
    const [documents, setDocuments] = useState({
        letter_of_intent: null,
        pds: null,
        work_experience_sheet: null,
        cv: null,
        outstanding_accomplishments: null,
        service_records: null,
        transcript_of_records: null,
        performance_eval: null,
        self_certification: null,
        id_picture: null,
        applicant_profile_doc: null,
        other_documents: null
    });
    const [uploadingDoc, setUploadingDoc] = useState({});

    // Step 6: Statutory Background Disclosures
    const [statutoryData, setStatutoryData] = useState({
        pending_admin_case: 'No',
        guilty_admin_details: 'No',
        criminally_charged_details: 'No',
        convicted_crime_details: 'No'
    });

    // Tab navigation state
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'questionnaire' | 'documents'

    // Submission status
    const [submitting, setSubmitting] = useState(false);
    const [submittedApplication, setSubmittedApplication] = useState(null);
    // Existing submission in the active application period (read-only mode)
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState(null);
    const [candidateHistory, setCandidateHistory] = useState([]);

    const NON_PENDING_STATUSES = ['rejected', 'disqualified', 'cancelled', 'withdrawn'];
    const hasDuplicatePending = !isReadOnly && Boolean(appliedPosition && targetRegion && candidateHistory.some(item =>
        item.applied_position === appliedPosition &&
        item.target_region === targetRegion &&
        !NON_PENDING_STATUSES.includes(String(item.status || 'submitted').toLowerCase())
    ));
    const duplicatePositionRegionError = hasDuplicatePending
        ? `You already have a pending application for ${appliedPosition} in ${targetRegion}. Please select a different region or position.`
        : '';

    // Tab definitions
    const tabs = [
        {
            id: 'profile',
            label: 'Tab 1: Profile & Designation',
            icon: FiUser,
            isComplete: Boolean(appliedPosition && targetRegion && personalData.surname && personalData.first_name && personalData.contact_number && personalData.current_position && personalData.plantilla_office)
        },
        {
            id: 'questionnaire',
            label: 'Tab 2: Questionnaire',
            icon: FiClipboard,
            isComplete: Boolean(eligibilityData.ces_eligibility_stage)
        },
        {
            id: 'documents',
            label: 'Tab 3: Document Uploads',
            icon: FiUploadCloud,
            isComplete: REQUIRED_DOCUMENTS.filter(d => d.required).every(d => Boolean(documents[d.key]))
        }
    ];

    // Fetch window status on mount
    useEffect(() => {
        let alive = true;
        const fetchStatus = async () => {
            setWindowLoading(true);
            try {
                // Short TTL: collapses the StrictMode double-mount into one request without serving stale status.
                const data = await fetchLookupJson('/api/pooling/status', { ttlMs: 3000, returnErrorBody: true });
                if (!alive) return;
                if (data.success) {
                    setIntakeWindow({
                        isOpen: Boolean(data.isOpen),
                        message: data.message || '',
                        intake_start_date: data.intake_start_date,
                        intake_end_date: data.intake_end_date
                    });
                } else {
                    setIntakeWindow({
                        isOpen: false,
                        message: data.error || 'TIMON applications window is currently closed.',
                        intake_start_date: null,
                        intake_end_date: null
                    });
                }
            } catch (err) {
                if (!alive) return;
                console.error('[TIMON Applications] Failed to fetch window status:', err);
                setIntakeWindow({
                    isOpen: false,
                    message: 'Could not connect to the TIMON applications service.',
                    intake_start_date: null,
                    intake_end_date: null
                });
            } finally {
                if (alive) setWindowLoading(false);
            }
        };

        fetchStatus();
        return () => { alive = false; };
    }, []);

    // Fills the form from a saved submission and locks it.
    const applySubmission = (app) => {
        const qr = app.questionnaire_responses || {};
        setExistingSubmission(app);
        setIsReadOnly(true);
        setAppliedPosition(app.applied_position || '');
        setTargetRegion(app.target_region || '');
        if (qr.personal_employment) setPersonalData(prev => ({ ...prev, ...qr.personal_employment }));
        if (qr.designation_oic) setDesignationData(prev => ({ ...prev, ...qr.designation_oic }));
        if (qr.eligibilities) setEligibilityData(prev => ({ ...prev, ...qr.eligibilities }));
        if (qr.statutory_declarations) setStatutoryData(prev => ({ ...prev, ...qr.statutory_declarations }));
        const docs = {};
        (app.document_attachments || []).forEach(d => { if (d?.doc_type) docs[d.doc_type] = d; });
        setDocuments(prev => ({ ...prev, ...docs }));
    };

    // History mode: load one of this registrant's submissions by id and force read-only.
    // New mode (/timon-applications/new): load candidate history so we can validate duplicate pending position + region.
    useEffect(() => {
        if (!token) return undefined;
        let alive = true;
        const headers = { Authorization: `Bearer ${token}` };
        const loadSubmission = async () => {
            try {
                if (applicationId) {
                    const res = await fetch(apiUrl(`/api/pooling/history/${encodeURIComponent(applicationId)}`), { headers });
                    if (!alive) return;
                    if (!res.ok) {
                        navigate('/timon-applications', { replace: true });
                        return;
                    }
                    const data = await res.json();
                    if (alive && data.success && data.application) applySubmission(data.application);
                    return;
                }

                const historyData = await fetchLookupJson('/api/pooling/history', { token, ttlMs: 3000 });
                if (alive && historyData?.data) {
                    setCandidateHistory(historyData.data);
                }
            } catch (err) {
                if (alive) console.error('[TIMON Applications] Failed to load existing submission:', err);
            }
        };
        loadSubmission();
        return () => { alive = false; };
    }, [token, applicationId]);

    // Sync authenticated user info when user changes
    useEffect(() => {
        if (user) {
            setPersonalData(prev => ({
                ...prev,
                surname: prev.surname || (user.last_name || '').toUpperCase(),
                first_name: prev.first_name || (user.first_name || '').toUpperCase(),
                middle_name: prev.middle_name || (user.middle_name || '').toUpperCase(),
                contact_number: prev.contact_number || formatContactNumber(user.contact_number || user.contact_details || ''),
                current_position: prev.current_position || user.position || user.current_position || '',
                plantilla_office: prev.plantilla_office || user.office || user.plantilla_office || ''
            }));
        }
    }, [user]);

    // Clear stale profile errors once the applicant leaves the profile tab.
    useEffect(() => {
        if (errors.length > 0 && activeTab !== 'profile') setErrors([]);
    }, [activeTab, errors.length]);

    const promptAuth = () => {
        Swal.fire({
            title: 'Authentication Required',
            text: 'Please sign in or register to submit your TIMON executive application.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sign In',
            cancelButtonText: 'Register',
            confirmButtonColor: 'var(--color-brand-800)'
        }).then((result) => {
            if (result.isConfirmed) {
                navigate('/login?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', { state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', portal: 'applicant' } });
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                navigate('/register?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', { state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', role: 'Third Level Applicant' } });
            }
        });
    };

    const validateProfileTab = () => {
        if (!user) {
            promptAuth();
            return false;
        }

        const found = [];
        if (!appliedPosition) found.push({ id: 'timon-position', message: 'Please select one of the four executive designations (RD, ARD, SDS, ASDS).' });
        if (!targetRegion) found.push({ id: 'timon-region', message: 'Please select a target DepEd region for your application.' });
        if (hasDuplicatePending) found.push({ id: 'timon-region', message: duplicatePositionRegionError });
        if (!personalData.surname) found.push({ id: 'field-surname', message: 'Please provide your Surname in ALL CAPS.' });
        if (!personalData.first_name) found.push({ id: 'field-first_name', message: 'Please provide your First Name in ALL CAPS.' });
        if (!personalData.contact_number) found.push({ id: 'field-contact_number', message: 'Please provide your 11-digit mobile/telephone contact number.' });
        if (!personalData.current_position) found.push({ id: 'field-current_position', message: 'Please provide your current plantilla position title.' });
        if (!personalData.plantilla_region) found.push({ id: 'field-plantilla_region', message: 'Please select the Region of your plantilla item.' });
        if (!personalData.plantilla_division) found.push({ id: 'field-plantilla_division', message: 'Please select the Division of your plantilla item.' });
        if (designationData.is_assigned_third_level === 'Yes') {
            if (!designationData.designation_capacity) found.push({ id: 'field-designation_capacity', message: 'Please indicate whether you are an Officer-in-Charge (OIC) or Full-Fledged.' });
            if (!designationData.current_designation_preset || designationData.current_designation_preset === 'N/A') found.push({ id: 'field-current_designation_preset', message: 'Please select your current designation.' });
        }
        setErrors(found);
        if (found.length > 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return false;
        }


        return true;
    };

    const validateQuestionnaireTab = () => {
        if (!user) {
            promptAuth();
            return false;
        }
        return true;
    };

    const handleTabChange = (targetTabId) => {
        if (targetTabId === activeTab) return;
        if (isReadOnly) { setActiveTab(targetTabId); return; }

        // If advancing forward from profile tab
        if (activeTab === 'profile' && (targetTabId === 'questionnaire' || targetTabId === 'documents')) {
            if (!validateProfileTab()) return;
        }

        // If advancing from questionnaire to documents
        if (activeTab === 'questionnaire' && targetTabId === 'documents') {
            if (!validateQuestionnaireTab()) return;
        }

        // If jumping directly to documents from elsewhere
        if (targetTabId === 'documents' && !validateProfileTab()) {
            setActiveTab('profile');
            return;
        }

        setActiveTab(targetTabId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleNext = () => {
        if (isReadOnly) {
            setActiveTab(activeTab === 'profile' ? 'questionnaire' : 'documents');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (activeTab === 'profile') {
            if (validateProfileTab()) {
                setActiveTab('questionnaire');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else if (activeTab === 'questionnaire') {
            if (validateQuestionnaireTab()) {
                setActiveTab('documents');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const handlePrev = () => {
        if (activeTab === 'documents') {
            setActiveTab('questionnaire');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (activeTab === 'questionnaire') {
            setActiveTab('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Authentication Check
        if (!user) {
            promptAuth();
            return;
        }

        // 2. Validate Tab 1: Profile & Designation
        if (!validateProfileTab()) {
            setActiveTab('profile');
            return;
        }

        // 3. Validate Tab 2: Questionnaire
        if (!validateQuestionnaireTab()) {
            setActiveTab('questionnaire');
            return;
        }

        // 4. Validate Tab 3: Required Documents
        const missingDocs = REQUIRED_DOCUMENTS.filter(doc => doc.required && !documents[doc.key]);
        if (missingDocs.length > 0) {
            setActiveTab('documents');
            Swal.fire({
                title: 'Required Documents Missing',
                html: `<div class="text-left text-xs space-y-1"><p class="font-bold text-slate-700">Please attach the following required documents:</p><ul class="list-disc pl-5 text-rose-600">${missingDocs.map(d => `<li>${d.label}</li>`).join('')}</ul></div>`,
                icon: 'warning',
                confirmButtonColor: 'var(--color-brand-800)'
            });
            return;
        }

        setSubmitting(true);

        try {
            const documentAttachments = Object.values(documents).filter(Boolean);

            const effectiveDesignation = designationData.current_designation_preset === 'Other'
                ? designationData.current_designation_custom.trim()
                : designationData.current_designation_preset;

            const payload = {
                candidate_id: user.uid || user.TLOid || user.id || user.email || 'APP-' + Date.now(),
                candidate_name: `${personalData.surname}, ${personalData.first_name} ${personalData.middle_name || ''}`.trim(),
                first_name: personalData.first_name.trim(),
                last_name: personalData.surname.trim(),
                email: user.email || '',
                contact_number: personalData.contact_number.trim(),
                applied_position: appliedPosition,
                target_region: targetRegion,
                questionnaire_responses: {
                    personal_employment: personalData,
                    designation_oic: {
                        ...designationData,
                        effective_designation: effectiveDesignation
                    },
                    eligibilities: eligibilityData,
                    statutory_declarations: statutoryData
                },
                document_attachments: documentAttachments
            };

            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(apiUrl('/api/pooling/applications'), {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));

            if (res.status === 409) {
                setActiveTab('profile');
                const dupMsg = data.error || `You already have a pending application for ${appliedPosition} in ${targetRegion}. Please select a different region or position.`;
                setErrors([{ id: 'timon-region', message: dupMsg }]);
                Swal.fire({
                    title: 'Pending Application Exists',
                    text: dupMsg,
                    icon: 'warning',
                    confirmButtonColor: 'var(--color-brand-800)'
                });
                return;
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to submit application.');
            }

            setSubmittedApplication(data.data);
            setCandidateHistory(prev => [
                {
                    id: data.data?.id,
                    applied_position: appliedPosition,
                    target_region: targetRegion,
                    status: 'submitted',
                    submission_timestamp: data.data?.submission_timestamp || new Date().toISOString()
                },
                ...prev
            ]);

            Swal.fire({
                title: 'Application Submitted!',
                text: `Your application for ${appliedPosition} in ${targetRegion} has been recorded in the TIMON Applications executive pool.`,
                icon: 'success',
                confirmButtonText: 'View Receipt',
                confirmButtonColor: 'var(--color-brand-800)',
                customClass: {
                    popup: 'rounded-3xl border-2 border-brand-800'
                }
            });
        } catch (err) {
            console.error('[Submit Error]:', err);
            Swal.fire({
                title: 'Submission Failed',
                text: err.message,
                icon: 'error',
                confirmButtonColor: 'var(--color-brand-800)'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 text-brand-800 flex flex-col">
                {/* Header Banner */}
                <header className="bg-brand-800 text-white relative overflow-hidden shadow-lg border-b border-brand-700/20 py-8 px-6 lg:px-12 shrink-0">
                    <div className="absolute -top-[100%] right-[-10%] w-[50%] h-[300%] bg-brand-700 rounded-lg opacity-80 pointer-events-none transform rotate-12 z-0"></div>
                    <div className="max-w-[1200px] mx-auto flex flex-col gap-6 relative z-10">
                        {/* Top Navigation Row */}
                        <div className="flex justify-between items-center w-full">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 text-blue-200 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
                            >
                                <FiChevronLeft size={18} /> Back
                            </button>
                            {user ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-blue-100 bg-white/10 px-3 py-1.5 rounded-full">
                                        <FiUser size={13} className="text-gold" />
                                        <span>{user.first_name || user.email}</span>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="flex items-center gap-1.5 text-rose-300 hover:text-rose-100 font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        <FiLock size={13} /> Sign Out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => navigate('/login?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', { state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', portal: 'applicant' } })}
                                        className="flex items-center gap-1.5 text-blue-200 hover:text-white font-black text-xs uppercase tracking-wider transition-all"
                                    >
                                        <FiLogIn size={14} /> Sign In
                                    </button>
                                    <button
                                        onClick={() => navigate('/register?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', { state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', role: 'Third Level Applicant' } })}
                                        className="flex items-center gap-1.5 bg-gold text-brand-800 px-3.5 py-1.5 rounded-full font-black text-xs uppercase tracking-wider hover:bg-yellow-400 transition-all shadow-sm"
                                    >
                                        <FiUserPlus size={14} /> Register
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Title Row */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gold">
                                Department of Education • TIMON Official Roster
                            </span>
                            <h1 className="page-title text-2xl md:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
                                TIMON Applications
                            </h1>
                            <p className="text-blue-100/80 text-xs md:text-sm font-semibold max-w-2xl leading-relaxed">
                                Formal application intake portal for Third Level Executive designations (RD, ARD, SDS, ASDS) across Regional and Schools Division leadership positions.
                            </p>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 max-w-[1100px] w-full mx-auto p-6 md:p-10 space-y-8">
                    {/* Status Loading Skeleton */}
                    {windowLoading && !applicationId ? (
                        <div className="bg-white border-2 border-slate-200 rounded-card p-12 text-center shadow-sm">
                            <FiLoader className="animate-spin text-brand-800 mx-auto mb-4" size={36} />
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Checking Application Window Status...</h3>
                        </div>
                    ) : !intakeWindow.isOpen && !applicationId ? (
                        /* Closed Window State */
                        <div className="bg-white border-2 border-rose-200 rounded-card p-8 md:p-12 text-center space-y-6 shadow-sm">
                            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                                <FiLock size={32} />
                            </div>
                            <div className="space-y-2 max-w-lg mx-auto">
                                <span className="text-xs font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                                    Intake Window Closed
                                </span>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                    TIMON Applications Are Currently Closed
                                </h2>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    {intakeWindow.message || 'The application window for Third Level Executive designations is not currently accepting submissions. Please check back during scheduled intake periods.'}
                                </p>
                            </div>

                            {intakeWindow.intake_start_date && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                                    <FiClock size={14} className="text-slate-400" />
                                    <span>Scheduled Window: {new Date(intakeWindow.intake_start_date).toLocaleDateString()} — {intakeWindow.intake_end_date ? new Date(intakeWindow.intake_end_date).toLocaleDateString() : 'TBA'}</span>
                                </div>
                            )}

                            <div>
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-6 py-3 bg-brand-800 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-900 transition-all shadow-sm"
                                >
                                    Return to Nexus Gate
                                </button>
                            </div>
                        </div>
                    ) : submittedApplication ? (
                        /* Submitted Receipt View */
                        <div className="bg-white border-2 border-emerald-300 rounded-card p-8 md:p-12 text-center space-y-6 shadow-md">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                                <FiCheckCircle size={36} />
                            </div>
                            <div className="space-y-2 max-w-lg mx-auto">
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                                    Application Confirmed
                                </span>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                    TIMON Application Recorded
                                </h2>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    Your executive application dossier has been submitted for review under the Records Management division.
                                </p>
                            </div>

                            {/* Summary Receipt Box */}
                            <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Candidate:</span>
                                    <span className="font-bold text-slate-800">{submittedApplication.candidate_name}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Designation:</span>
                                    <span className="font-bold text-brand-800">{submittedApplication.applied_position}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Target Region:</span>
                                    <span className="font-bold text-slate-800">{submittedApplication.target_region}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Timestamp:</span>
                                    <span className="font-mono text-slate-700">
                                        {new Date(submittedApplication.submission_timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-center gap-3 pt-2">
                                <button
                                    onClick={() => setSubmittedApplication(null)}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Submit Another Application
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-6 py-3 bg-brand-800 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-900 transition-all shadow-sm"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Active Application Intake Form */
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Intake Window Active Notification Bar */}
                            {!applicationId && <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                                        Active Intake Window
                                    </span>
                                    {intakeWindow.intake_end_date && (
                                        <span className="text-xs font-medium text-emerald-700 hidden sm:inline">
                                            • Closes: {new Date(intakeWindow.intake_end_date).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-emerald-700 bg-white/70 px-3 py-1 rounded-full border border-emerald-200">
                                    Third Level Executive
                                </span>
                            </div>}

                            {isReadOnly && (
                                <div role="status" className="flex items-start gap-3 p-5 bg-blue-50 rounded-2xl border-2 border-brand-800/30">
                                    <FiLock className="text-brand-800 mt-0.5 shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-black text-brand-800 uppercase tracking-wide">Application Submitted — Read-Only</h4>
                                        <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                                            You have already submitted an application for the current active period
                                            {existingSubmission?.submission_timestamp ? ` on ${new Date(existingSubmission.submission_timestamp).toLocaleString()}` : ''}.
                                            Your answers and documents are shown below and can no longer be edited.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Unauthenticated User Warning / Gate Banner */}
                            {!user && (
                                <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FiAlertTriangle className="text-amber-600" size={20} />
                                        <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">
                                            Applicant Authentication Required
                                        </h4>
                                    </div>
                                    <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                                        You must sign in or register an applicant account before completing and submitting your TIMON executive application.
                                    </p>
                                    <div className="flex flex-wrap gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/login?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', { state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', portal: 'applicant' } })}
                                            className="px-5 py-2.5 bg-brand-800 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-blue-900 transition-all shadow-sm flex items-center gap-2"
                                        >
                                            <FiLogIn size={14} /> Sign In
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/register?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', { state: { redirectTo: '/timon-applications', returnUrl: '/timon-applications', role: 'Third Level Applicant' } })}
                                            className="px-5 py-2.5 bg-white border-2 border-brand-800 text-brand-800 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                                        >
                                            <FiUserPlus size={14} /> Register New Account
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Form Tab Headers */}
                            <FormTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

                            {/* Tab 1: Profile & Designation */}
                            {activeTab === 'profile' && (
                                <div className="space-y-8">
                                    <FormErrorSummary errors={errors} />
                                    {/* Section 1: Executive Position & Target Region (Decoupled from database plantilla items) */}
                                    <fieldset disabled={isReadOnly} className="space-y-8 border-0 p-0 m-0 min-w-0">
                                    <ExecutivePositionSection
                                        fieldErrors={errors}
                                        appliedPosition={appliedPosition}
                                        setAppliedPosition={setAppliedPosition}
                                        targetRegion={targetRegion}
                                        setTargetRegion={setTargetRegion}
                                        duplicateError={duplicatePositionRegionError}
                                    />

                                    {/* Section 2: Personal Details & Current Employment */}
                                    <PersonalEmploymentSection
                                        fieldErrors={errors}
                                        personalData={personalData}
                                        setPersonalData={setPersonalData}
                                    />

                                    {/* Section 3: Third Level Designation & OIC Assignment */}
                                    <DesignationOICSection
                                        fieldErrors={errors}
                                        designationData={designationData}
                                        setDesignationData={setDesignationData}
                                    />
                                    </fieldset>

                                    {/* Tab 1 Navigation Action Bar */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white border-2 border-slate-200 rounded-card shadow-sm">
                                        <span className="text-xs font-semibold text-slate-500">
                                            Step 1 of 3: Complete executive designation, personal info, and office assignment.
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="w-full sm:w-auto px-6 py-3 bg-brand-800 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-900 transition-all shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <span>Proceed to Questionnaire</span>
                                            <FiChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Questionnaire */}
                            {activeTab === 'questionnaire' && (
                                <div className="space-y-8">
                                    <fieldset disabled={isReadOnly} className="space-y-8 border-0 p-0 m-0 min-w-0">
                                    {/* Section 4: Examination & CES Eligibilities */}
                                    <EligibilitiesSection
                                        eligibilityData={eligibilityData}
                                        setEligibilityData={setEligibilityData}
                                    />

                                    {/* Section 6: Statutory Civil Service Background Disclosures */}
                                    <StatutoryDeclarationsSection
                                        statutoryData={statutoryData}
                                        setStatutoryData={setStatutoryData}
                                    />
                                    </fieldset>

                                    {/* Tab 2 Navigation Action Bar */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white border-2 border-slate-200 rounded-card shadow-sm">
                                        <button
                                            type="button"
                                            onClick={handlePrev}
                                            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <FiChevronLeft size={16} />
                                            <span>Back to Profile</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="w-full sm:w-auto px-6 py-3 bg-brand-800 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-900 transition-all shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <span>Proceed to Document Uploads</span>
                                            <FiChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Document Uploads */}
                            {activeTab === 'documents' && (
                                <div className="space-y-8">
                                    {/* Section 5: Twelve (12) Required Document Attachments */}
                                    <TwelveDocumentsSection
                                        documents={documents}
                                        setDocuments={setDocuments}
                                        uploadingDoc={uploadingDoc}
                                        setUploadingDoc={setUploadingDoc}
                                        readOnly={isReadOnly}
                                        applicationId={applicationId || submittedApplication?.id || null}
                                    />

                                    {/* Final Review & Submission Action Bar */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white border-2 border-brand-800 rounded-card shadow-sm">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={handlePrev}
                                                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                                            >
                                                <FiChevronLeft size={16} />
                                                <span>Back</span>
                                            </button>
                                            {!isReadOnly && <div className="text-xs font-semibold text-slate-500">
                                                By submitting, you certify under oath that all responses and attached credentials are true, correct, and complete.
                                            </div>}
                                        </div>
                                        {!isReadOnly && <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full sm:w-auto px-8 py-4 bg-brand-800 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-900 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                                        >
                                            {submitting ? (
                                                <>
                                                    <FiLoader className="animate-spin" size={16} />
                                                    Submitting Application...
                                                </>
                                            ) : (
                                                <>
                                                    <FiSend size={16} />
                                                    Submit TIMON Application
                                                </>
                                            )}
                                        </button>}
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </main>
            </div>
        </PageTransition>
    );
};

export default AllVacancies;
