import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';
import { CheckCircle as FiCheckCircle, SpinnerGap as FiLoader, ArrowsClockwise as FiRefreshCw } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';
import html2pdf from 'html2pdf.js';
import PptxGenJS from 'pptxgenjs';
import depedLogo from '../assets/DepED-Logo.png';
import { apiUrl } from '../utils/api';
import { compressImageClientSide } from '../utils/imageCompressor';
import Swal from 'sweetalert2';
import { toUpper } from '../utils/textUtils';
import { MobileDrawer, HeaderBanner, Sidebar, MobileToggleBar, PersonalTab, EligibilityTab, ExperienceTab, EducationTab, PerformanceTab, AchievementsTab, TrainingsTab, DocumentsTab, LegalTab, SummaryTab, BottomActionBar, LocationUnlockModal, TABS, calculateDuration, formatDateStr, isSuffixPlaceholder, sanitizeSuffix, buildFullName } from '../components/official-profiling';
const OfficialProfiling = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlEmail = searchParams.get('email');
    const urlVacancy = searchParams.get('vacancy');
    const { user, token, logout } = useAuth();

    const [status, setStatus] = useState('loading'); // loading | found | not-found | error
    const [TLOid, setTlid] = useState(null);
    const [applicationId, setApplicationId] = useState(null);
    const [applicationStatus, setApplicationStatus] = useState(null); // draft|pending_review|denied|approved|null(masterlist)
    const [denialReason, setDenialReason] = useState('');
    const [dataSource, setDataSource] = useState(null); // 'staging' | 'masterlist'
    const [tab, setTab] = useState('personal');
    const [saving, setSaving] = useState(false);
    const [uploadingDocs, setUploadingDocs] = useState({});
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saved, setSaved] = useState(false);
    const isTlo = user?.role?.toLowerCase() === 'tlo applicant';
    const [isEditing, setIsEditing] = useState(isTlo);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSuffixNA, setIsSuffixNA] = useState(false);

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [profile, setProfile] = useState({
        last_name: '', first_name: '', middle_name: '', suffix: '',
        gender: '', date_of_birth: '', age: '', civil_status: '',
        employment_status: '', position_title: '', designation: '', is_oic: false, appointment_date: '',
        region: '', division: '', office: '', strand: '',
        emt_passer: null, emt_date: '', ces_stage: '', ces_conferment_date: '',
        total_years_third_level: '', permanent_address: '', temporary_address: '',
        highest_education: '', specific_degree: '', education_program: '', education_year_graduated: '',
        bachelor_degree: '', bachelor_year: '', master_degree: '', master_year: '', doctorate_degree: '', doctorate_year: '',
        notable_achievements: [], individual_accomplishments: [],
        eligibilities: [], other_courses: [],
        performance_rating_1: '', performance_rating_1_period: '',
        performance_rating_2: '', performance_rating_2_period: '',
        performance_rating_3: '', performance_rating_3_period: '',
        cespes_1_rating: '', cespes_2_rating: '',
        cespes_rating_1_period: '', cespes_rating_2_period: '',
        managerial_experience_total: '',
        pending_admin_case: '',
        guilty_admin_details: '', criminally_charged_details: '', convicted_crime_details: '',
        updated_at: null,
    });
    const [prevPositions, setPrevPositions] = useState([]);
    const [trainings, setTrainings] = useState([]);
    const [completeness, setCompleteness] = useState(0);
    const [dpaConsent, setDpaConsent] = useState(false);
    const [truthConsent, setTruthConsent] = useState(false);
    const [certified, setCertified] = useState(false);
    const [certifying, setCertifying] = useState(false);
    const [vacancies, setVacancies] = useState([]);
    const [vacanciesLoading, setVacanciesLoading] = useState(false);
    const [positionsList, setPositionsList] = useState([]);
    const [designationsList, setDesignationsList] = useState([]);
    const [regionsList, setRegionsList] = useState([]);
    const [regionDivisions, setRegionDivisions] = useState({});
    const [divisionsList, setDivisionsList] = useState([]);
    const [isLocationLocked, setIsLocationLocked] = useState(true);
    const [showLocationUnlockModal, setShowLocationUnlockModal] = useState(false);
    const [targetVacancyId, setTargetVacancyId] = useState(null);
    const [notableAchievementsOptions, setNotableAchievementsOptions] = useState([]);

    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [selectedExportType, setSelectedExportType] = useState('csv');
    const [exporting, setExporting] = useState(false);
    const [previewScale, setPreviewScale] = useState(1);
    const [selectedEducationType, setSelectedEducationType] = useState('');
    const [uploadedFileNames, setUploadedFileNames] = useState({});
    const previewContainerRef = React.useRef(null);

    React.useEffect(() => {
        if (!exportModalOpen) return;
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                // Previews are 1000px wide, plus padding -> ~1040px
                const targetWidth = 1040;
                if (width < targetWidth) {
                    setPreviewScale(width / targetWidth);
                } else {
                    setPreviewScale(1);
                }
            }
        });

        // Use timeout to allow DOM to render before observing
        const timeoutId = setTimeout(() => {
            if (previewContainerRef.current) {
                observer.observe(previewContainerRef.current);
            }
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [exportModalOpen, selectedExportType]);
    const fullName = buildFullName(profile) || 'Official Profiling';
    // completedTabs: how many of the 9 content tabs satisfy isTabCompleted
    // (isTabCompleted is defined below, so we compute this after it is defined)

    const isTabCompleted = (tabId) => {
        if (tabId === 'personal') {
            return !!(
                profile.first_name &&
                profile.last_name &&
                profile.gender &&
                profile.date_of_birth &&
                profile.civil_status &&
                profile.photo_binary_id &&
                profile.employment_status &&
                profile.region &&
                profile.position_title &&
                profile.appointment_date &&
                (!profile.is_oic || profile.designation) &&
                profile.permanent_address &&
                (profile.alt_contact_details_1 || profile.contact_details)
            );
        }
        if (tabId === 'eligibility') {
            return !!(profile.ces_stage || profile.emt_passer !== null || (profile.eligibilities && profile.eligibilities.length > 0));
        }
        if (tabId === 'experience') {
            return prevPositions.length > 0;
        }
        if (tabId === 'education') {
            return !!(
                (profile.education_degrees && profile.education_degrees.length > 0) ||
                profile.bachelor_degree ||
                profile.master_degree ||
                profile.doctorate_degree ||
                profile.highest_education
            );
        }
        if (tabId === 'performance') {
            return !!(profile.performance_rating_1 && profile.performance_rating_1_period);
        }
        if (tabId === 'trainings') {
            return trainings.length > 0;
        }
        if (tabId === 'achievements') {
            return !!((Array.isArray(profile.notable_achievements) && profile.notable_achievements.length > 0) || (profile.individual_accomplishments && profile.individual_accomplishments.length > 0));
        }
        if (tabId === 'documents') {
            return !!(profile.pds_binary_id && profile.service_records_binary_id);
        }
        if (tabId === 'legal') {
            return !!(profile.pending_admin_case && profile.guilty_admin_details && profile.criminally_charged_details && profile.convicted_crime_details);
        }
        if (tabId === 'application') {
            return true;
        }
        if (tabId === 'summary') {
            return !!(certified || profile.dpa_consented_at);
        }
        return false;
    };

    // Export Logic
    const generateCSV = () => {
        setExporting(true);
        try {
            const header = [
                'First Name', 'Last Name', 'Middle Name', 'Suffix', 'Gender', 'Date of Birth', 'Age', 'Civil Status',
                'Position Title', 'Designation', 'Date of Present Position', 'Permanent Address',
                'Career Executive Service (CES)', 'CES Conferment Date', 'Educational Management Test (EMT)', 'EMT Date', 'Other Eligibilities',
                'Highest Education', 'Specific Degree', 'Program / Course', 'Year Graduated',
                'Latest Rating (1st)', 'Previous Rating (2nd)', 'CESPES 1st Sem', 'CESPES 2nd Sem', 'Total Managerial Experience',
                'Notable Achievements', 'Previous Position 1', 'Documents 2x2 Photo', 'Administrative Cases', 'Ombudsman / CSC Cases'
            ];
            const achFormatted = (Array.isArray(profile.notable_achievements) ? profile.notable_achievements : []).map(a => typeof a === 'object' && a !== null ? `${a.title || ''}${a.year ? ' (' + a.year + ')' : ''}` : String(a)).join(' | ');
            const row = [
                profile.first_name, profile.last_name, profile.middle_name, sanitizeSuffix(profile.suffix), profile.gender, profile.date_of_birth, profile.age, profile.civil_status,
                profile.position_title, profile.designation, profile.appointment_date, profile.permanent_address,
                profile.ces_stage, profile.ces_conferment_date, profile.emt_passer === true ? 'Yes' : profile.emt_passer === false ? 'No' : '', profile.emt_date,
                (profile.eligibilities || []).map(e => `${e.eligibility || e.title || 'Untitled'} (${[e.date ? new Date(e.date).toLocaleDateString() : '', e.rating ? 'Rating: ' + e.rating : '', e.place_of_assignment ? 'Place: ' + e.place_of_assignment : '', e.details || ''].filter(Boolean).join(' | ')})`).join('; '),
                profile.highest_education, profile.specific_degree, profile.education_program, profile.education_year_graduated,
                profile.performance_rating_1, profile.performance_rating_2, profile.cespes_1_rating, profile.cespes_2_rating, profile.managerial_experience_total,
                [achFormatted, ...(profile.individual_accomplishments || [])].filter(Boolean).join(' | '), prevPositions[0]?.position_name || '', profile.photo_binary_id ? 'Uploaded' : 'Missing', profile.pending_admin_case, profile.ombudsman_case
            ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',');

            const csvContent = "data:text/csv;charset=utf-8," + header.join(',') + "\n" + row;
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `profile_${profile.last_name || 'export'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error(err);
            Swal.fire('Notice', "Failed to generate CSV", 'info');
        } finally {
            setExporting(false);
            setExportModalOpen(false);
        }
    };

    const generatePDF = () => {
        setExporting(true);
        try {
            const element = document.getElementById('pdf-preview-content');
            if (!element) {
                setExporting(false);
                return;
            }
            const opt = {
                margin: 0,
                filename: `profile_${profile.last_name || 'export'}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { scale: 3, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'in', format: [13.33, 7.5], orientation: 'landscape' }
            };
            html2pdf().set(opt).from(element).save().then(() => setExporting(false));
        } catch (err) {
            console.error(err);
            Swal.fire('Notice', "Failed to generate PDF", 'info');
            setExporting(false);
        }
    };

    const generatePPT = () => {
        setExporting(true);
        try {
            let pres = new PptxGenJS();
            pres.layout = 'LAYOUT_16x9';
            let slide = pres.addSlide();

            // Header: Logo, Name and Position
            slide.addImage({ path: depedLogo, x: 0.4, y: 0.2, w: 1.1, h: 1.1 });
            const pSuffix = sanitizeSuffix(profile.suffix);
            slide.addText(`${profile.last_name?.toUpperCase() || ''}${pSuffix ? ' ' + pSuffix : ''}, ${profile.first_name?.toUpperCase() || ''} ${profile.middle_name?.toUpperCase() || ''}`.trim(), { x: 1.6, y: 0.3, w: 4.3, h: 0.6, fontSize: 32, bold: true, color: '000000' });
            let posText = profile.position_title || '';
            if (profile.is_oic) {
                posText += ' (OIC)';
            }
            if (profile.office) {
                posText += `, ${profile.office}`;
            }

            const hasCustomDesignation = profile.designation &&
                profile.designation.trim() !== '' &&
                profile.designation.trim().toLowerCase() !== 'no designation' &&
                profile.designation.trim().toLowerCase() !== 'none' &&
                profile.designation.trim().toLowerCase() !== (profile.position_title || '').trim().toLowerCase();

            if (hasCustomDesignation) {
                slide.addText(posText, { x: 1.6, y: 0.85, w: 6.8, h: 0.35, fontSize: 18, bold: true, color: '000000' });
                slide.addText(profile.designation, { x: 1.6, y: 1.2, w: 6.8, h: 0.3, fontSize: 13, italic: true, bold: true, color: '08315F' });
            } else {
                slide.addText(posText, { x: 1.6, y: 0.9, w: 6.8, h: 0.5, fontSize: 20, bold: true, color: '000000' });
            }

            // Top Right: Photo
            if (profile.photo_binary_id) {
                slide.addImage({ path: apiUrl(`/api/binary/${profile.photo_binary_id}`), x: 8.6, y: 0.2, w: 1.2, h: 1.2 });
            } else {
                slide.addShape(pres.ShapeType.rect, { x: 8.6, y: 0.2, w: 1.2, h: 1.2, fill: { color: 'E2E8F0' } });
                slide.addText('2x2 Photo', { x: 8.6, y: 0.2, w: 1.2, h: 1.2, align: 'center', color: '64748B', fontSize: 10 });
            }

            // Managerial Experience Table
            let histRows = [
                [{ text: 'Managerial Experience', options: { colspan: 3, fill: '0038A8', color: 'FFFFFF', bold: true, align: 'center', fontSize: 14 } }]
            ];
            const displayHistory = (prevPositions && prevPositions.length > 0) ? prevPositions : (history || []);
            const filteredHistory = displayHistory.filter(h => h.position_title || h.position_name || h.office).slice(0, 4);
            filteredHistory.forEach(h => {
                const title = h.position_title || h.position_name || '—';
                const officeName = h.office || '—';
                const dur = h.start_date && h.end_date ? calculateDuration(h.start_date, h.end_date) : { years: 0, months: 0 };
                histRows.push([
                    { text: title, options: { fill: 'F8FAFC', fontSize: 10, color: '000000', bold: true } },
                    { text: officeName, options: { fill: 'F8FAFC', fontSize: 10, color: '000000' } },
                    { text: `${dur.years} yrs., ${dur.months} mos.`, options: { fill: 'F8FAFC', fontSize: 10, color: '000000' } }
                ]);

                // Nested Child OIC positions under Parent
                if (h.oic_positions && Array.isArray(h.oic_positions) && h.oic_positions.length > 0) {
                    h.oic_positions.forEach(oic => {
                        if (oic.oic_position_name || oic.oic_office) {
                            const oicTitle = `   └─ OIC: ${oic.oic_position_name || 'OIC Position'}`;
                            const oicOffice = oic.oic_office || '—';
                            const oicDur = oic.oic_start_date && oic.oic_end_date ? calculateDuration(oic.oic_start_date, oic.oic_end_date) : { years: 0, months: 0 };
                            histRows.push([
                                { text: oicTitle, options: { fill: 'FEF3C7', fontSize: 9, color: '08315F' } },
                                { text: oicOffice, options: { fill: 'FEF3C7', fontSize: 9, color: '334155' } },
                                { text: `${oicDur.years} yrs., ${oicDur.months} mos.`, options: { fill: 'FEF3C7', fontSize: 9, color: '334155' } }
                            ]);
                        }
                    });
                }
            });
            if (filteredHistory.length === 0) histRows.push([{ text: 'No experience listed', options: { colspan: 3, fill: 'FFFFFF', fontSize: 10, align: 'center' } }]);
            slide.addTable(histRows, { x: 0.4, y: 1.6, w: 5.5, colW: [1.8, 2.3, 1.4], border: { pt: 1, color: '64748B' } });

            // Educational Attainment Table
            let eduRows = [
                [{ text: 'Educational Attainment', options: { colspan: 3, fill: '0038A8', color: 'FFFFFF', bold: true, align: 'center', fontSize: 14 } }]
            ];
            eduRows.push([
                { text: 'Doctorate', options: { fill: 'FFFFFF', fontSize: 10, color: '000000', bold: true } },
                { text: profile.doctorate_degree || '—', options: { fill: 'FFFFFF', fontSize: 10, color: '000000' } },
                { text: profile.doctorate_year || '—', options: { fill: 'FFFFFF', fontSize: 10, align: 'center', color: '000000' } }
            ]);
            eduRows.push([
                { text: "Master's Degree", options: { fill: 'FFFFFF', fontSize: 10, color: '000000', bold: true } },
                { text: profile.master_degree || '—', options: { fill: 'FFFFFF', fontSize: 10, color: '000000' } },
                { text: profile.master_year || '—', options: { fill: 'FFFFFF', fontSize: 10, align: 'center', color: '000000' } }
            ]);
            eduRows.push([
                { text: 'Baccalaureate', options: { fill: 'FFFFFF', fontSize: 10, color: '000000', bold: true } },
                { text: profile.bachelor_degree || '—', options: { fill: 'FFFFFF', fontSize: 10, color: '000000' } },
                { text: profile.bachelor_year || '—', options: { fill: 'FFFFFF', fontSize: 10, align: 'center', color: '000000' } }
            ]);
            slide.addTable(eduRows, { x: 0.4, y: 3.8, w: 5.5, colW: [1.5, 3.0, 1.0], border: { pt: 1, color: '64748B' } });

            // Age Box
            slide.addShape(pres.ShapeType.rect, { x: 6.2, y: 1.6, w: 1.0, h: 0.25, fill: { color: 'F59E0B' } });
            slide.addText('Age', { x: 6.2, y: 1.6, w: 1.0, h: 0.25, color: 'FFFFFF', bold: true, align: 'center', fontSize: 12 });
            slide.addShape(pres.ShapeType.rect, { x: 6.2, y: 1.85, w: 1.0, h: 0.4, fill: { color: 'FFFFFF' }, line: { color: '64748B' } });
            slide.addText(`${profile.age || ''}`, { x: 6.2, y: 1.85, w: 1.0, h: 0.4, align: 'center', fontSize: 14, color: '000000' });

            // Performance Rating Table
            const extractPptYear = (period) => {
                if (!period) return '—';
                const match = String(period).match(/\b(19\d\d|20\d\d)\b/);
                return match ? match[1] : (String(period).split('-')[0] || String(period));
            };

            let perfRows = [
                [{ text: 'Performance Rating', options: { colspan: 3, fill: 'B91C1C', color: 'FFFFFF', bold: true, align: 'center', fontSize: 12 } }],
                [
                    { text: 'Period / Type', options: { fill: 'FEE2E2', fontSize: 9, bold: true, color: '991B1B' } },
                    { text: 'Year', options: { fill: 'FEE2E2', fontSize: 9, bold: true, align: 'center', color: '991B1B' } },
                    { text: 'Rating', options: { fill: 'FEE2E2', fontSize: 9, bold: true, align: 'center', color: '991B1B' } }
                ]
            ];

            if (profile.cespes_1_rating) perfRows.push([
                { text: `${profile.cespes_rating_1_period || ''} 1st sem (CESPES)`, options: { fontSize: 9, color: '000000' } },
                { text: extractPptYear(profile.cespes_rating_1_period), options: { fontSize: 9, align: 'center', color: '000000', bold: true } },
                { text: String(profile.cespes_1_rating), options: { fontSize: 9, align: 'center', color: '000000', bold: true } }
            ]);
            if (profile.cespes_2_rating) perfRows.push([
                { text: `${profile.cespes_rating_2_period || ''} 2nd sem (CESPES)`, options: { fontSize: 9, color: '000000' } },
                { text: extractPptYear(profile.cespes_rating_2_period), options: { fontSize: 9, align: 'center', color: '000000', bold: true } },
                { text: String(profile.cespes_2_rating), options: { fontSize: 9, align: 'center', color: '000000', bold: true } }
            ]);
            if (profile.performance_rating_1) perfRows.push([
                { text: `${profile.performance_rating_1_period || ''} (OPCRF)`, options: { fontSize: 9, color: '000000' } },
                { text: extractPptYear(profile.performance_rating_1_period), options: { fontSize: 9, align: 'center', color: '000000', bold: true } },
                { text: String(profile.performance_rating_1), options: { fontSize: 9, align: 'center', color: '000000', bold: true } }
            ]);
            if (profile.performance_rating_2) perfRows.push([
                { text: `${profile.performance_rating_2_period || ''} (OPCRF)`, options: { fontSize: 9, color: '000000' } },
                { text: extractPptYear(profile.performance_rating_2_period), options: { fontSize: 9, align: 'center', color: '000000', bold: true } },
                { text: String(profile.performance_rating_2), options: { fontSize: 9, align: 'center', color: '000000', bold: true } }
            ]);
            if (profile.performance_rating_3) perfRows.push([
                { text: `${profile.performance_rating_3_period || ''} (OPCRF)`, options: { fontSize: 9, color: '000000' } },
                { text: extractPptYear(profile.performance_rating_3_period), options: { fontSize: 9, align: 'center', color: '000000', bold: true } },
                { text: String(profile.performance_rating_3), options: { fontSize: 9, align: 'center', color: '000000', bold: true } }
            ]);

            if (perfRows.length === 2) perfRows.push([{ text: 'No ratings', options: { colspan: 3, fontSize: 10, align: 'center', color: '000000' } }]);
            slide.addTable(perfRows, { x: 6.2, y: 2.4, w: 3.6, colW: [2.1, 0.7, 0.8], border: { pt: 1, color: 'B91C1C' }, fill: 'FFFFFF' });

            // Eligibility Table
            let eligRows = [
                [{ text: 'Eligibility', options: { colspan: 2, fill: 'B91C1C', color: 'FFFFFF', bold: true, align: 'center', fontSize: 12 } }]
            ];
            eligRows.push([{ text: `CES: ${profile.ces_stage || 'Not Applicable'}`, options: { fontSize: 10, color: '000000' } }, { text: profile.ces_conferment_date || '', options: { fontSize: 10, align: 'center', color: '000000' } }]);
            eligRows.push([{ text: `EMT: ${profile.emt_passer === true ? 'Passed' : profile.emt_passer === false ? 'Not Passed' : 'Not Applicable'}`, options: { fontSize: 10, color: '000000' } }, { text: profile.emt_date || '', options: { fontSize: 10, align: 'center', color: '000000' } }]);

            if (profile.eligibilities && profile.eligibilities.length > 0) {
                profile.eligibilities.forEach(elig => {
                    const name = elig.eligibility || elig.title || 'Untitled';
                    const meta = [
                        elig.rating ? `Rating: ${elig.rating}` : '',
                        elig.date ? `Date: ${new Date(elig.date).toLocaleDateString()}` : '',
                        elig.place_of_assignment ? `Place: ${elig.place_of_assignment}` : ''
                    ].filter(Boolean).join(' | ');
                    const fallback = elig.details || '—';
                    eligRows.push([{ text: name, options: { fontSize: 10, color: '000000' } }, { text: meta || fallback, options: { fontSize: 10, align: 'center', color: '000000' } }]);
                });
            }

            slide.addTable(eligRows, { x: 6.2, y: 4.0, w: 3.6, colW: [2.0, 1.6], border: { pt: 1, color: 'B91C1C' }, fill: 'FFFFFF' });
            pres.writeFile({ fileName: `profile_${profile.last_name || 'export'}.pptx` }).then(() => setExporting(false));
        } catch (err) {
            console.error(err);
            Swal.fire('Notice', "Failed to generate PPT", 'info');
            setExporting(false);
        }
    };

    // Recompute progress whenever any tab dependency changes
    useEffect(() => {
        const progressTabs = TABS.filter(t => dataSource !== 'masterlist' || t.id !== 'application').map(t => t.id);
        const completedCount = progressTabs.filter(tabId => isTabCompleted(tabId)).length;
        setCompleteness(Math.round((completedCount / progressTabs.length) * 100));
    }, [profile, prevPositions, trainings, dpaConsent, truthConsent, certified, dataSource]);
    useEffect(() => {
        if (completeness === 100 && profile.profiling_status !== 'profiling completed') {
            setP('profiling_status', 'profiling completed');
        } else if (completeness < 100 && profile.profiling_status === 'profiling completed') {
            setP('profiling_status', 'profiling');
        }
    }, [completeness]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                document.documentElement.style.overflow = 'hidden';
                document.body.style.overflow = 'hidden';
                document.documentElement.style.height = '100%';
                document.body.style.height = '100%';
            } else {
                document.documentElement.style.overflow = '';
                document.body.style.overflow = '';
                document.documentElement.style.height = '';
                document.body.style.height = '';
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.documentElement.style.height = '';
            document.body.style.height = '';
        };
    }, []);

    useEffect(() => {
        let parsedUrlEmail = urlEmail;
        if (parsedUrlEmail) {
            parsedUrlEmail = parsedUrlEmail.replace(/ /g, '+');
        }
        const emailToLookup = parsedUrlEmail || user?.email || user?.userEmail || localStorage.getItem('userEmail');
        if (emailToLookup) {
            lookupByEmail(emailToLookup);
        } else {
            const timer = setTimeout(() => {
                if (!user && !localStorage.getItem('userEmail')) {
                    setStatus('not-found');
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [user, urlEmail]);

    useEffect(() => {
        if (TLOid) {
            fetchHistory(TLOid);
        }
    }, [TLOid]);

    const fetchHistory = async (id) => {
        setHistoryLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/third-level/official-profiling/${id}/career-path`), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setHistory(data.data);
        } catch (err) {
            console.error('Failed to fetch career path:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Managerial Experience Auto-Computation
    useEffect(() => {
        let totalYears = 0;
        let totalMonths = 0;

        // 1. Previous Positions
        prevPositions.forEach(pos => {
            if (pos.start_date) {
                const dur = calculateDuration(pos.start_date, pos.end_date);
                totalYears += dur.years;
                totalMonths += dur.months;
            }
        });

        // Normalize months
        totalYears += Math.floor(totalMonths / 12);
        totalMonths = totalMonths % 12;

        const resultStr = `${totalYears} Year${totalYears !== 1 ? 's' : ''}, ${totalMonths} Month${totalMonths !== 1 ? 's' : ''}`;
        if (profile.managerial_experience_total !== resultStr) {
            setProfile(prev => ({ ...prev, managerial_experience_total: resultStr }));
        }
    }, [prevPositions]);

    // Training Hours Auto-Computation
    useEffect(() => {
        const total = trainings.reduce((acc, tr) => acc + (parseFloat(tr.hours) || 0), 0);
        if (parseFloat(profile.total_training_hours) !== total) {
            setProfile(prev => ({ ...prev, total_training_hours: total }));
        }
    }, [trainings]);

    // Highest Education Auto-Sync
    useEffect(() => {
        let hEd = '';
        let hProg = '';
        let hYear = '';

        const doc = (profile.doctorate_degree || '').split('\n').filter(Boolean);
        const docY = (profile.doctorate_year || '').split('\n').filter(Boolean);
        const mas = (profile.master_degree || '').split('\n').filter(Boolean);
        const masY = (profile.master_year || '').split('\n').filter(Boolean);
        const bac = (profile.bachelor_degree || '').split('\n').filter(Boolean);
        const bacY = (profile.bachelor_year || '').split('\n').filter(Boolean);

        if (doc.length > 0) {
            hEd = 'Doctorate';
            hProg = doc[0];
            hYear = docY[0] || '';
        } else if (mas.length > 0) {
            hEd = "Master's Degree";
            hProg = mas[0];
            hYear = masY[0] || '';
        } else if (bac.length > 0) {
            hEd = "Baccalaureate / Bachelor's Degree";
            hProg = bac[0];
            hYear = bacY[0] || '';
        }

        if (profile.highest_education !== hEd || profile.education_program !== hProg || profile.education_year_graduated !== hYear) {
            setProfile(prev => ({
                ...prev,
                highest_education: hEd,
                education_program: hProg,
                education_year_graduated: hYear
            }));
        }
    }, [profile.doctorate_degree, profile.master_degree, profile.bachelor_degree, profile.doctorate_year, profile.master_year, profile.bachelor_year]);

    // Removed reactive degree year clearing because it prevents typing (e.g. typing "20" evaluates to 20 < 2010 and gets cleared).
    // Validation is already properly handled by `validateProfile` on save.

    const lookupByEmail = async (email) => {
        if (!email) { setStatus('not-found'); return; }
        try {
            const res = await fetch(apiUrl(`/api/third-level/official-profiling/by-email?email=${encodeURIComponent(email)}`), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                const d = data.data;
                setTlid(d.TLOid || d.app_TLOid);
                setApplicationId(d.application_id || null);
                setApplicationStatus(data.source === 'masterlist' ? null : d.application_status);
                setDenialReason(d.denial_reason || '');
                setDataSource(data.source);
                setTargetVacancyId(urlVacancy || d.target_TLOid || null);
                if (urlVacancy) {
                    setTab('summary');
                }

                // ─────────────────────────────────────────────────────────────
                // EDUCATION: Fallback chain
                // Priority 1: d.education_records  (relational — new)
                // Priority 2: d.education_degrees  (JSONB — existing)
                // Priority 3: d.bachelor_degree     (legacy newline text)
                // ─────────────────────────────────────────────────────────────
                let bacDegs = [];
                let bacYrs = [];
                let masDegs = [];
                let masYrs = [];
                let docDegs = [];
                let docYrs = [];

                const relationalEdu = Array.isArray(d.education_records) && d.education_records.length > 0;
                if (relationalEdu) {
                    // Priority 1: relational rows { id, level, degree, year_graduated }
                    d.education_records.forEach(rec => {
                        const lv = (rec.level || '').toUpperCase();
                        const deg = rec.degree || '';
                        const yr = rec.year_graduated ? String(rec.year_graduated) : '';
                        if (lv === 'BACHELOR') {
                            if (deg) bacDegs.push(deg);
                            if (yr) bacYrs.push(yr);
                        } else if (lv === 'MASTER') {
                            if (deg) masDegs.push(deg);
                            if (yr) masYrs.push(yr);
                        } else if (lv === 'DOCTORATE') {
                            if (deg) docDegs.push(deg);
                            if (yr) docYrs.push(yr);
                        }
                    });
                } else {
                    // Priority 2: education_degrees JSONB (existing logic — preserved)
                    const educationDegrees = d.education_degrees || [];
                    educationDegrees.forEach(deg => {
                        const highest = (deg.highest_education || '').toUpperCase();
                        const degreeName = deg.specific_degree || deg.education_program || '';
                        const year = deg.education_year_graduated || '';
                        if (highest.includes('BACHELOR') || highest.includes('BACCALAUREATE')) {
                            if (degreeName) bacDegs.push(degreeName);
                            if (year) bacYrs.push(year);
                        } else if (highest.includes('MASTER')) {
                            if (degreeName) masDegs.push(degreeName);
                            if (year) masYrs.push(year);
                        } else if (highest.includes('DOCTOR')) {
                            if (degreeName) docDegs.push(degreeName);
                            if (year) docYrs.push(year);
                        }
                    });
                }

                const hasEducationDegrees = relationalEdu || Array.isArray(d.education_degrees);
                // Priority 3 (legacy text) is the fallback inside the ternary below
                const bachelor_degree = hasEducationDegrees ? bacDegs.join('\n') : (d.bachelor_degree || '');
                const bachelor_year = hasEducationDegrees ? bacYrs.join('\n') : (d.bachelor_year || '');
                const master_degree = hasEducationDegrees ? masDegs.join('\n') : (d.master_degree || '');
                const master_year = hasEducationDegrees ? masYrs.join('\n') : (d.master_year || '');
                const doctorate_degree = hasEducationDegrees ? docDegs.join('\n') : (d.doctorate_degree || '');
                const doctorate_year = hasEducationDegrees ? docYrs.join('\n') : (d.doctorate_year || '');

                // ─────────────────────────────────────────────────────────────
                // ELIGIBILITIES: Fallback chain
                // Priority 1: d.eligibility_records (relational)
                // Priority 2: d.eligibilities        (JSONB — existing)
                // ─────────────────────────────────────────────────────────────
                const formatDateStr = (val) => {
                    if (!val) return '';
                    if (typeof val === 'string') return val.split('T')[0];
                    if (val instanceof Date) return val.toISOString().split('T')[0];
                    return String(val).split('T')[0];
                };

                let resolvedEligibilities;
                if (Array.isArray(d.eligibility_records) && d.eligibility_records.length > 0) {
                    // Map relational columns back to the frontend object shape
                    resolvedEligibilities = d.eligibility_records.map(rec => ({
                        id: rec.id,
                        eligibility: rec.eligibility_type,
                        date: formatDateStr(rec.conferment_date),
                        rating: rec.rating || '',
                        place_of_assignment: rec.place_of_assignment || '',
                        details: rec.details || ''
                    }));
                } else {
                    // Priority 2: existing JSONB (preserved as-is)
                    resolvedEligibilities = d.eligibilities || [];
                }

                // ─────────────────────────────────────────────────────────────
                // ACCOMPLISHMENTS: Fallback chain
                // Priority 1: d.accomplishment_records (relational)
                // Priority 2: d.individual_accomplishments (JSONB — existing)
                // ─────────────────────────────────────────────────────────────
                let resolvedAccomplishments;
                if (Array.isArray(d.accomplishment_records) && d.accomplishment_records.length > 0) {
                    // Preserve the DB row id so save round-trips use UPDATE, not INSERT+DELETE
                    resolvedAccomplishments = d.accomplishment_records.map(rec => ({
                        id: rec.id,
                        description: rec.description || '',
                        award_year: rec.award_year || null,
                    }));
                } else {
                    resolvedAccomplishments = d.individual_accomplishments || [];
                }

                // ─────────────────────────────────────────────────────────────
                // OTHER COURSES: Fallback chain
                // Priority 1: d.other_course_records (relational)
                // Priority 2: d.other_courses         (JSONB — existing)
                // ─────────────────────────────────────────────────────────────
                let resolvedOtherCourses;
                if (Array.isArray(d.other_course_records) && d.other_course_records.length > 0) {
                    // Map relational columns back to frontend shape: { course, date_from, date_to, details }
                    resolvedOtherCourses = d.other_course_records.map(rec => ({
                        id: rec.id,
                        course: rec.course_title || '',
                        date_from: formatDateStr(rec.date_from),
                        date_to: formatDateStr(rec.date_to),
                        details: rec.details || ''
                    }));
                } else {
                    resolvedOtherCourses = d.other_courses || [];
                }

                const rawSuffix = d.suffix || '';
                const isNA = isSuffixPlaceholder(rawSuffix);
                setIsSuffixNA(isNA);

                setProfile({
                    last_name: d.last_name || '',
                    first_name: d.first_name || '',
                    middle_name: d.middle_name || '',
                    suffix: isNA ? '' : rawSuffix,
                    gender: d.gender || '',
                    date_of_birth: formatDateStr(d.date_of_birth),
                    age: d.age ?? '',
                    civil_status: d.civil_status || '',
                    employment_status: d.employment_status || '',
                    position_title: d.position_title || '',
                    designation: d.designation || '',
                    region: d.region || '',
                    division: d.division || '',
                    office: d.office || '',
                    strand: d.strand || '',
                    is_oic: (d.designation && typeof d.designation === 'string' && d.designation.toUpperCase().includes('OIC')) ? true : (d.is_oic ?? false),
                    appointment_date: formatDateStr(d.appointment_date),
                    emt_passer: d.emt_passer ?? null,
                    emt_date: formatDateStr(d.emt_date),
                    ces_stage: d.ces_stage || '',
                    ces_conferment_date: formatDateStr(d.ces_conferment_date),
                    total_years_third_level: d.total_years_third_level ?? '',
                    permanent_address: d.permanent_address || '',
                    temporary_address: d.temporary_address || '',
                    highest_education: d.highest_education || '',
                    specific_degree: d.specific_degree || '',
                    education_program: d.education_program || '',
                    education_year_graduated: d.education_year_graduated ?? '',
                    bachelor_degree,
                    bachelor_year,
                    master_degree,
                    master_year,
                    doctorate_degree,
                    doctorate_year,
                    education_degrees: d.education_degrees || [],
                    notable_achievements: (() => {
                        if (Array.isArray(d.notable_achievements)) return d.notable_achievements;
                        if (typeof d.notable_achievements === 'string' && d.notable_achievements.trim().startsWith('[')) {
                            try { return JSON.parse(d.notable_achievements); } catch (e) { return []; }
                        }
                        if (typeof d.notable_achievements === 'string' && d.notable_achievements) {
                            const titles = d.notable_achievements.split('\n');
                            const years = (d.notable_achievements_year || '').split('\n');
                            return titles.map((t, idx) => ({ title: t, year: years[idx] || '' }));
                        }
                        return [];
                    })(),
                    // Fallback chain applied above: relational → JSONB
                    eligibilities: resolvedEligibilities,
                    other_courses: resolvedOtherCourses,
                    individual_accomplishments: resolvedAccomplishments,
                    performance_rating_1: d.performance_rating_1 || '',
                    performance_rating_1_period: d.performance_rating_1_period || '',
                    performance_rating_2: d.performance_rating_2 || '',
                    performance_rating_2_period: d.performance_rating_2_period || '',
                    performance_rating_3: d.performance_rating_3 || '',
                    performance_rating_3_period: d.performance_rating_3_period || '',
                    cespes_1_rating: d.cespes_1_rating || '',
                    cespes_2_rating: d.cespes_2_rating || '',
                    cespes_rating_1_period: d.cespes_rating_1_period || '',
                    cespes_rating_2_period: d.cespes_rating_2_period || '',
                    managerial_experience_total: d.managerial_experience_total || '',
                    pending_admin_case: d.pending_admin_case || '',
                    guilty_admin_details: d.guilty_admin_details || '',
                    criminally_charged_details: d.criminally_charged_details || '',
                    convicted_crime_details: d.convicted_crime_details || '',
                    alt_email_1: d.alt_email_1 || '',
                    alt_email_2: d.alt_email_2 || '',
                    alt_contact_details_1: d.alt_contact_details_1 || d.contact_details || '',
                    alt_contact_details_2: d.alt_contact_details_2 || '',
                    contact_details: d.contact_details || d.alt_contact_details_1 || '',
                    photo_binary_id: d.photo_binary_id || null,
                    pds_binary_id: d.pds_binary_id || null,
                    profile_word_binary_id: d.profile_word_binary_id || null,
                    profile_ppt_binary_id: d.profile_ppt_binary_id || null,
                    service_records_binary_id: d.service_records_binary_id || null,
                    sandiganbayan_clearance_binary_id: d.sandiganbayan_clearance_binary_id || null,
                    nbi_clearance_binary_id: d.nbi_clearance_binary_id || null,
                    csc_clearance_binary_id: d.csc_clearance_binary_id || null,
                    ombudsman_clearance_binary_id: d.ombudsman_clearance_binary_id || null,
                    executive_summary_binary_id: d.executive_summary_binary_id || null,
                    dpa_consented_at: d.dpa_consented_at || null,
                    updated_at: d.updated_at || null,
                });

                // POSITIONS: Fallback chain
                // Priority 1: d.position_history (relational)
                // Priority 2: d.previous_positions (JSONB — existing)
                let resolvedPrevPositions;
                if (Array.isArray(d.position_history) && d.position_history.length > 0) {
                    // Map relational columns back to frontend shape
                    resolvedPrevPositions = d.position_history.map(rec => ({
                        id: rec.id,
                        position_name: rec.position_name || '',
                        office: rec.office || rec.division || '',
                        division: rec.division || '',
                        strand: rec.strand || '',
                        region: rec.region || '',
                        designation: rec.designation || '',
                        start_date: formatDateStr(rec.inclusive_date_start),
                        end_date: formatDateStr(rec.inclusive_date_end),
                        oic_positions: rec.oic_positions || [],
                        status: rec.status || 'Inactive',
                        oic: Boolean(rec.oic ?? false),
                        is_oic: Boolean(rec.oic ?? false)
                    }));
                } else {
                    resolvedPrevPositions = (d.previous_positions || []).map(p => ({
                        ...p,
                        office: p.office || p.division || '',
                        region: p.region || '',
                        designation: p.designation || '',
                        status: p.status || 'Inactive',
                        oic: Boolean(p.oic ?? p.is_oic ?? false),
                        is_oic: Boolean(p.oic ?? p.is_oic ?? false)
                    }));
                }

                // TRAININGS: Fallback chain
                // Priority 1: d.training_records (relational)
                // Priority 2: d.relevant_trainings (JSONB — existing)
                let resolvedTrainings;
                if (Array.isArray(d.training_records) && d.training_records.length > 0) {
                    resolvedTrainings = d.training_records.map(rec => {
                        const dateFrom = formatDateStr(rec.inclusive_date_start);
                        const dateTo = formatDateStr(rec.inclusive_date_end);
                        let hours = rec.hours != null ? String(rec.hours) : '';
                        let hours_per_day = '8';

                        // Auto-compute hours from date range if hours is missing or zero
                        if ((!hours || hours === '0') && dateFrom && dateTo) {
                            const d1 = new Date(dateFrom);
                            const d2 = new Date(dateTo);
                            if (!isNaN(d1) && !isNaN(d2) && d1 <= d2) {
                                const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
                                hours = String(diffDays * 8);
                                hours_per_day = '8';
                            }
                        } else if (hours && hours !== '0' && dateFrom && dateTo) {
                            // Back-compute hours_per_day from stored hours + date range
                            const d1 = new Date(dateFrom);
                            const d2 = new Date(dateTo);
                            if (!isNaN(d1) && !isNaN(d2) && d1 <= d2) {
                                const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
                                const derivedHpd = parseFloat(hours) / diffDays;
                                if ([2, 4, 8].includes(Math.round(derivedHpd))) {
                                    hours_per_day = String(Math.round(derivedHpd));
                                }
                            }
                        }

                        return {
                            id: rec.id,
                            training_name: rec.training_name || '',
                            date_from: dateFrom,
                            date_to: dateTo,
                            conducted_by: rec.conducted_by || '',
                            hours,
                            hours_per_day,
                        };
                    });
                } else {
                    resolvedTrainings = d.relevant_trainings || [];
                }

                setPrevPositions(resolvedPrevPositions);
                setTrainings(resolvedTrainings);

                if (d.dpa_consented_at) {
                    setCertified(true);
                    setDpaConsent(true);
                    setTruthConsent(true);
                }

                setStatus('found');
            } else {
                if (user?.email) {
                    handleInitializeRecord();
                } else {
                    setStatus('error');
                }
            }
        } catch (err) {
            console.error("Lookup Error:", err);
            setStatus('error');
        }
    };

    const handleInitializeRecord = async () => {
        if (!user?.email) return;
        setSaving(true);
        try {
            const res = await fetch(apiUrl('/api/third-level/official-profiling/initialize'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    email: user.email,
                    first_name: user.firstName || user.first_name || '',
                    last_name: user.lastName || user.last_name || '',
                    role: user.role
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    throw new Error(`Server returned status ${res.status}: ${errorText || 'No details'}`);
                }
                throw new Error(errorData.error || 'Initialization failed.');
            }

            const data = await res.json();
            if (data.success) {
                lookupByEmail(user.email);
            }
        } catch (err) {
            console.error("Initialization Error:", err);
            Swal.fire('Notice', 'Initialization failed: ' + err.message, 'info');
        } finally {
            setSaving(false);
        }
    };

    const setP = (field, value) => {
        const skipFields = new Set([
            'email', 'alt_email_1', 'alt_email_2', 'suffix',
            'photo_binary_id', 'pds_binary_id', 'profile_word_binary_id', 'profile_ppt_binary_id', 'service_records_binary_id',
            'sandiganbayan_clearance_binary_id', 'nbi_clearance_binary_id', 'csc_clearance_binary_id', 'ombudsman_clearance_binary_id', 'executive_summary_binary_id',
            'target_TLOid', 'application_status', 'profiling_status', 'is_oic',
            'pending_admin_case', 'guilty_admin_details', 'criminally_charged_details', 'convicted_crime_details', 'ces_stage', 'gender', 'civil_status', 'employment_status'
        ]);
        let finalValue = value;
        if (typeof value === 'string' && !skipFields.has(field)) {
            finalValue = toUpper(value);
        }
        setProfile(p => ({ ...p, [field]: finalValue }));
    };
    const validateProfile = () => {
        // 1. Date of Birth
        if (profile.date_of_birth) {
            const dob = new Date(profile.date_of_birth);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dob > today) {
                Swal.fire('Validation Error', 'Date of Birth cannot be in the future.', 'error');
                return false;
            }
        }

        // 1b. Position Title and Designation "Others" validation
        const posTitle = (profile.position_title || '').trim();
        if (posTitle.toUpperCase() === 'OTHERS' || !posTitle) {
            Swal.fire('Validation Error', 'Please specify your Position Title.', 'error');
            return false;
        }

        if (profile.is_oic) {
            const desig = (profile.designation || '').trim();
            if (desig.toUpperCase() === 'OTHERS' || !desig) {
                Swal.fire('Validation Error', 'Please specify your Designation.', 'error');
                return false;
            }
        }

        // 2. Alternative Email 1 & 2
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (profile.alt_email_1) {
            if (!emailRegex.test(profile.alt_email_1)) {
                Swal.fire('Validation Error', 'Alternative Email 1 is malformed or contains an invalid domain.', 'error');
                return false;
            }
        }
        if (profile.alt_email_2) {
            if (!emailRegex.test(profile.alt_email_2)) {
                Swal.fire('Validation Error', 'Alternative Email 2 is malformed or contains an invalid domain.', 'error');
                return false;
            }
        }

        // 3. Year Graduated
        if (profile.education_year_graduated) {
            const yr = Number(profile.education_year_graduated);
            if (isNaN(yr) || yr < 1900) {
                Swal.fire('Validation Error', 'Year Graduated must be 1900 or later.', 'error');
                return false;
            }
        }

        // 3b. Degree Year Ordering
        const bacY = (profile.bachelor_year || '').split('\n').map(y => parseInt(y)).filter(y => !isNaN(y));
        const masY = (profile.master_year || '').split('\n').map(y => parseInt(y)).filter(y => !isNaN(y));
        const docY = (profile.doctorate_year || '').split('\n').map(y => parseInt(y)).filter(y => !isNaN(y));

        const maxBac = bacY.length > 0 ? Math.max(...bacY) : 0;
        const maxMas = masY.length > 0 ? Math.max(...masY) : 0;

        if (maxBac > 0 && masY.some(m => m <= maxBac)) {
            Swal.fire('Validation Error', 'Master\'s Degree year must be strictly greater than Bachelor\'s Degree year.', 'error');
            return false;
        }
        if (maxMas > 0 && docY.some(d => d <= maxMas)) {
            Swal.fire('Validation Error', 'Doctorate year must be strictly greater than Master\'s Degree year.', 'error');
            return false;
        }

        // 3c. Rating Period Validation
        const currentMonth = new Date().toISOString().substring(0, 7);
        if (profile.performance_rating_1_period && profile.performance_rating_1_period > currentMonth) {
            Swal.fire('Validation Error', 'Latest Performance Rating period cannot be in the future.', 'error');
            return false;
        }
        if (profile.performance_rating_2_period && profile.performance_rating_2_period > currentMonth) {
            Swal.fire('Validation Error', 'Previous Performance Rating period cannot be in the future.', 'error');
            return false;
        }
        if (profile.performance_rating_3_period && profile.performance_rating_3_period > currentMonth) {
            Swal.fire('Validation Error', 'Oldest Performance Rating period cannot be in the future.', 'error');
            return false;
        }
        if (profile.performance_rating_3_period && profile.performance_rating_2_period && profile.performance_rating_3_period > profile.performance_rating_2_period) {
            Swal.fire('Validation Error', 'Previous Rating period cannot be earlier than Oldest Rating period.', 'error');
            return false;
        }
        if (profile.performance_rating_2_period && profile.performance_rating_1_period && profile.performance_rating_2_period > profile.performance_rating_1_period) {
            Swal.fire('Validation Error', 'Latest Rating period cannot be earlier than Previous Rating period.', 'error');
            return false;
        }

        if (profile.cespes_rating_1_period && profile.cespes_rating_1_period > currentMonth) {
            Swal.fire('Validation Error', 'CESPES 1st Semester period cannot be in the future.', 'error');
            return false;
        }
        if (profile.cespes_rating_2_period && profile.cespes_rating_2_period > currentMonth) {
            Swal.fire('Validation Error', 'CESPES 2nd Semester period cannot be in the future.', 'error');
            return false;
        }
        if (profile.cespes_rating_1_period && profile.cespes_rating_2_period && profile.cespes_rating_1_period > profile.cespes_rating_2_period) {
            Swal.fire('Validation Error', 'CESPES 2nd Semester period cannot be earlier than 1st Semester period.', 'error');
            return false;
        }

        // 4. Date Ranges
        const validateRange = (from, to, ctx) => {
            if (from && to) {
                const d1 = new Date(from);
                const d2 = new Date(to);
                if (d2 <= d1) {
                    Swal.fire('Validation Error', `In ${ctx}: To Date must be after From Date.`, 'error');
                    return false;
                }
            }
            return true;
        };

        for (let i = 0; i < prevPositions.length; i++) {
            const p = prevPositions[i];
            if (!validateRange(p.start_date, p.end_date, `Managerial Experience #${i + 1}`)) return false;
            if (p.oic_positions) {
                for (let j = 0; j < p.oic_positions.length; j++) {
                    const oic = p.oic_positions[j];
                    if (!validateRange(oic.oic_start_date, oic.oic_end_date, `Managerial Experience #${i + 1} (OIC #${j + 1})`)) return false;
                }
            }
        }

        for (let i = 0; i < trainings.length; i++) {
            const t = trainings[i];
            if (!validateRange(t.date_from, t.date_to, `Relevant Training #${i + 1}`)) return false;
        }

        if (profile.other_courses && profile.other_courses.length > 0) {
            for (let i = 0; i < profile.other_courses.length; i++) {
                const c = profile.other_courses[i];
                if (!validateRange(c.date_from, c.date_to, `Other Training/Course #${i + 1}`)) return false;
            }
        }

        return true;
    };

    const handleSave = async () => {
        if (!TLOid) return;
        if (!validateProfile()) return;
        setSaving(true);
        setSaveSuccess(false);
        try {
            const targetVacancy = vacancies.find(v => v.TLOid === targetVacancyId);
            const cleanOIC = (oics) => (oics || []).filter(o => o.oic_position_name?.trim() || o.oic_office?.trim() || o.oic_start_date?.trim() || o.oic_end_date?.trim());
            const cleanPrevPositions = prevPositions
                .map(p => ({ ...p, oic_positions: cleanOIC(p.oic_positions) }))
                .filter(p => p.position_name?.trim() || p.office?.trim() || p.start_date?.trim() || p.end_date?.trim() || p.oic_positions.length > 0);

            const cleanTrainings = trainings.filter(t => t.training_name?.trim() || t.date_from?.trim() || t.date_to?.trim()).map(t => ({
                ...t,
                training_name: t.training_name ? t.training_name.toUpperCase() : ''
            }));

            const degreesList = [];

            const bacDegrees = (profile.bachelor_degree || '').split('\n');
            const bacYears = (profile.bachelor_year || '').split('\n');
            const bacCount = Math.max(bacDegrees.length, bacYears.length);
            for (let i = 0; i < bacCount; i++) {
                const deg = (bacDegrees[i] || '').trim();
                const yr = (bacYears[i] || '').trim();
                if (deg || yr) {
                    degreesList.push({
                        highest_education: "BACCALAUREATE / BACHELOR'S DEGREE",
                        specific_degree: deg,
                        education_program: deg,
                        education_year_graduated: yr
                    });
                }
            }

            const masDegrees = (profile.master_degree || '').split('\n');
            const masYears = (profile.master_year || '').split('\n');
            const masCount = Math.max(masDegrees.length, masYears.length);
            for (let i = 0; i < masCount; i++) {
                const deg = (masDegrees[i] || '').trim();
                const yr = (masYears[i] || '').trim();
                if (deg || yr) {
                    degreesList.push({
                        highest_education: "MASTER'S DEGREE",
                        specific_degree: deg,
                        education_program: deg,
                        education_year_graduated: yr
                    });
                }
            }

            const docDegrees = (profile.doctorate_degree || '').split('\n');
            const docYears = (profile.doctorate_year || '').split('\n');
            const docCount = Math.max(docDegrees.length, docYears.length);
            for (let i = 0; i < docCount; i++) {
                const deg = (docDegrees[i] || '').trim();
                const yr = (docYears[i] || '').trim();
                if (deg || yr) {
                    degreesList.push({
                        highest_education: "DOCTORATE",
                        specific_degree: deg,
                        education_program: deg,
                        education_year_graduated: yr
                    });
                }
            }

            const payload = {
                ...profile,
                suffix: (isSuffixNA || isSuffixPlaceholder(profile.suffix)) ? '' : (profile.suffix || '').trim(),
                contact_details: profile.alt_contact_details_1 || profile.contact_details || '',
                previous_positions: cleanPrevPositions,
                relevant_trainings: cleanTrainings,
                education_degrees: degreesList,
                target_TLOid: targetVacancyId,
                position_applied_for: targetVacancy ? targetVacancy.position_title : profile.position_applied_for,
                profiling_status: completeness === 100 ? 'profiling completed' : 'profiling'
            };

            const res = await fetch(apiUrl(`/api/third-level/official-profiling/${TLOid}/profile`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setProfile(prev => ({ ...prev, education_degrees: degreesList }));
                if (data.data && Array.isArray(data.data.position_history)) {
                    const mapped = data.data.position_history.map(rec => ({
                        id: rec.id,
                        position_name: rec.position_name || '',
                        office: rec.office || rec.division || '',
                        division: rec.division || '',
                        strand: rec.strand || '',
                        region: rec.region || '',
                        designation: rec.designation || '',
                        start_date: formatDateStr(rec.inclusive_date_start),
                        end_date: formatDateStr(rec.inclusive_date_end),
                        oic_positions: rec.oic_positions || [],
                        status: rec.status || 'Inactive',
                        oic: Boolean(rec.oic ?? false),
                        is_oic: Boolean(rec.oic ?? false)
                    }));
                    setPrevPositions(mapped);
                }
                if (TLOid) {
                    fetchHistory(TLOid);
                }
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 5000);
            } else {
                Swal.fire('Notice', data.error || 'Save failed.', 'info');
            }
        } catch (err) {
            Swal.fire('Notice', 'Save failed: ' + err.message, 'info');
        } finally {
            setSaving(false);
        }
    };

    const handleCertify = async (thenNavigate = false) => {
        if (!TLOid) return;
        setCertifying(true);
        try {
            const consentTimestamp = new Date().toISOString();
            const res = await fetch(apiUrl(`/api/third-level/official-profiling/${TLOid}/profile`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ dpa_consented_at: consentTimestamp })
            });
            const data = await res.json();
            if (data.success) {
                setCertified(true);
                setDpaConsent(true);
                setTruthConsent(true);
                setProfile(prev => ({ ...prev, dpa_consented_at: consentTimestamp }));
                if (thenNavigate) setTab('summary');
            } else {
                Swal.fire('Notice', data.error || 'Certification failed.', 'info');
            }
        } catch (err) {
            Swal.fire('Notice', 'Certification failed: ' + err.message, 'info');
        } finally {
            setCertifying(false);
        }
    };

    const fetchVacancies = async () => {
        setVacanciesLoading(true);
        try {
            const res = await fetch(apiUrl('/api/third-level/official-profiling/vacancies'), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setVacancies(data.data);
        } catch (err) {
            console.error('Failed to fetch vacancies:', err);
        } finally {
            setVacanciesLoading(false);
        }
    };

    const handleSubmitApplication = async () => {
        if (!TLOid) return;
        setSaving(true);
        try {
            const res = await fetch(apiUrl('/api/third-level/official-profiling/submit-application'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    app_TLOid: TLOid,
                    target_TLOid: targetVacancyId || null,
                    applied_position: profile.applied_position || profile.position_title || 'RD',
                    target_region: profile.target_region || profile.assigned_region || profile.region || 'Central Office'
                })
            });
            const data = await res.json();
            if (data.success) {
                setApplicationStatus('under_review');
                setTab('summary');
            } else {
                Swal.fire('Notice', data.error || 'Submission failed.', 'info');
            }
        } catch (err) {
            Swal.fire('Notice', 'Submission failed: ' + err.message, 'info');
        } finally {
            setSaving(false);
        }
    };

    const fetchPositionsList = async () => {
        try {
            const res = await fetch(apiUrl('/api/third-level/official-profiling/positions'), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                const validPositions = (data.positions || []).filter(p => {
                    const upper = p.toUpperCase();
                    return upper !== 'N/A' && upper !== 'NA' && upper !== 'OTHERS' && !/\bOIC\b/i.test(upper);
                });
                setPositionsList(validPositions);

                const validDesignations = (data.designations || []).filter(d => {
                    const upper = d.toUpperCase();
                    return upper !== 'N/A' && upper !== 'NA' && upper !== 'OTHERS' && !/\bOIC\b/i.test(upper);
                });
                setDesignationsList(validDesignations);

                if (Array.isArray(data.regions)) setRegionsList(data.regions);
                if (data.regionDivisions && typeof data.regionDivisions === 'object') setRegionDivisions(data.regionDivisions);
                if (Array.isArray(data.divisions)) setDivisionsList(data.divisions);
            }
        } catch (err) {
            console.error('Failed to fetch positions:', err);
        }
    };

    useEffect(() => {
        fetchVacancies();
        fetchPositionsList();
    }, []);

    const defaultPositions = [
        'Undersecretary',
        'Assistant Secretary',
        'Director IV',
        'Director III',
        'Chief Administrative Officer'
    ];

    // Merge positions and designations case-insensitively
    const positionMap = new Map();
    const addPos = (p) => {
        if (!p) return;
        const up = p.toUpperCase();
        const existing = positionMap.get(up);
        if (!existing) {
            positionMap.set(up, p);
        } else if (existing === up && p !== up) {
            // Replace all-uppercase version with mixed-case/title-case version
            positionMap.set(up, p);
        }
    };

    positionsList.forEach(addPos);
    designationsList.forEach(addPos);

    if (positionMap.size === 0) {
        defaultPositions.forEach(addPos);
    }

    const unifiedList = Array.from(positionMap.values()).sort();

    const availableDivisions = React.useMemo(() => {
        if (profile.region && profile.region.trim().toUpperCase() === 'CENTRAL OFFICE') {
            const coDivs = (regionDivisions?.['Central Office'] || regionDivisions?.['CENTRAL OFFICE'] || ['Central Office']);
            return coDivs.length > 0 ? coDivs : ['Central Office'];
        }
        
        let rawList = divisionsList || [];
        if (profile.region && regionDivisions) {
            const regionKey = Object.keys(regionDivisions).find(k => k.trim().toUpperCase() === profile.region.trim().toUpperCase());
            if (regionKey && Array.isArray(regionDivisions[regionKey])) {
                rawList = regionDivisions[regionKey];
            } else {
                rawList = [];
            }
        }
        
        return rawList.filter(d => {
            if (!d) return false;
            const up = String(d).trim().toUpperCase();
            if (profile.region && up === profile.region.trim().toUpperCase()) return false;
            if ((regionsList || []).some(r => r.toUpperCase() !== 'CENTRAL OFFICE' && r.toUpperCase() === up)) return false;
            return !/^REGION\s+/i.test(up) && up !== 'REGIONAL OFFICE' && up !== 'N/A';
        });
    }, [profile.region, regionDivisions, divisionsList, regionsList]);

    const isPositionOthers = profile.position_title?.toUpperCase() === 'OTHERS' || (profile.position_title && !unifiedList.some(u => u.toUpperCase() === profile.position_title.toUpperCase()));
    const isDesignationOthers = profile.designation?.toUpperCase() === 'OTHERS' || (profile.designation && !unifiedList.some(u => u.toUpperCase() === profile.designation.toUpperCase()));

    const fetchNotableAchievements = async () => {
        try {
            const res = await fetch(apiUrl('/api/third-level/official-profiling/notable-achievements'), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setNotableAchievementsOptions(data.data);
        } catch (err) {
            console.error('Failed to fetch notable achievements:', err);
        }
    };

    useEffect(() => {
        if (tab === 'achievements' && notableAchievementsOptions.length === 0) {
            fetchNotableAchievements();
        }
    }, [tab, notableAchievementsOptions.length]);

    const handleResubmit = async () => {
        if (!applicationId) return;
        setSaving(true);
        try {
            const res = await fetch(apiUrl(`/api/third-level/officials-registry/applications/${applicationId}/resubmit`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setApplicationStatus('under_review');
                setDenialReason('');
            } else {
                Swal.fire('Notice', data.error || 'Resubmit failed.', 'info');
            }
        } catch (err) {
            Swal.fire('Notice', 'Resubmit failed: ' + err.message, 'info');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (file, docType) => {
        if (!TLOid || !file) return;

        if (docType === 'photo') {
            if (!file.type.startsWith('image/')) {
                Swal.fire('Notice', 'Please upload a valid image file (PNG, JPG) for the ID Picture.', 'info');
                return;
            }


        }

        setUploadingDocs(prev => ({ ...prev, [docType]: true }));
        try {
            let fileToUpload = file;

            // Compress 2x2 ID Picture
            if (docType === 'photo') {
                fileToUpload = await compressImageClientSide(file, 800, 0.9);
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);

            const res = await fetch(apiUrl(`/api/third-level/official-profiling/${TLOid}/upload/${docType}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                const docMap = {
                    'photo': 'photo_binary_id',
                    'pds': 'pds_binary_id',
                    'profile_word': 'profile_word_binary_id',
                    'profile_ppt': 'profile_ppt_binary_id',
                    'service_records': 'service_records_binary_id',
                    'sandiganbayan_clearance': 'sandiganbayan_clearance_binary_id',
                    'nbi_clearance': 'nbi_clearance_binary_id',
                    'csc_clearance': 'csc_clearance_binary_id',
                    'ombudsman_clearance': 'ombudsman_clearance_binary_id',
                    'executive_summary': 'executive_summary_binary_id'
                };
                setP(docMap[docType], data.binary_id);
                setUploadedFileNames(prev => ({ ...prev, [docType]: file.name }));
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                Swal.fire('Notice', data.error || 'Upload failed.', 'info');
            }
        } catch (err) {
            Swal.fire('Notice', 'Upload failed: ' + err.message, 'info');
        } finally {
            setUploadingDocs(prev => ({ ...prev, [docType]: false }));
        }
    };

    const handleViewDocument = (binaryId) => {
        window.open(apiUrl(`/api/binary/${binaryId}`), '_blank');
    };

    const handleEditToggle = () => {
        if (!isEditing) {
            Swal.fire({
                title: 'Edit Profile',
                text: 'Are you sure you want to edit profile info?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: 'var(--color-gold)',
                cancelButtonColor: 'var(--color-secondary)',
                confirmButtonText: 'Yes, edit profile'
            }).then((result) => {
                if (result.isConfirmed) {
                    setIsEditing(true);
                }
            });
        } else {
            setIsEditing(false);
        }
    };

    const handleDownloadDocument = async (binaryId, label) => {
        try {
            Swal.fire({ title: 'Downloading...', text: 'Please wait while we fetch the document.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await fetch(apiUrl(`/api/binary/${binaryId}`), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Failed to download document');

            let filename = '';
            const disposition = res.headers.get('Content-Disposition');
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
            }

            const blob = await res.blob();
            if (!filename) {
                let ext = '';
                if (blob.type === 'application/pdf') ext = '.pdf';
                else if (blob.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ext = '.docx';
                else if (blob.type === 'application/msword') ext = '.doc';
                else if (blob.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') ext = '.pptx';
                else if (blob.type === 'application/vnd.ms-powerpoint') ext = '.ppt';
                else if (blob.type.startsWith('image/')) ext = '.' + blob.type.split('/')[1];

                const safeLabel = label.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
                const name = buildFullName(profile).replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
                filename = `${name}_${safeLabel}${ext}`;
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            Swal.close();
        } catch (err) {
            Swal.fire('Error', 'Could not download the document.', 'error');
        }
    };

    const handleAddPosition = () => setPrevPositions(p => [...p, { position_id: `tmp-${Date.now()}`, position_name: '', designation: '', office: '', division: '', region: '', start_date: '', end_date: '', status: 'Inactive', oic: false, is_oic: false, isNew: true }]);
    const handleRemovePosition = (idxToRemove) => {
        setPrevPositions(p => p.filter((_, idx) => idx !== idxToRemove));
    };

    const handleAddTraining = () => setTrainings(t => [...t, { training_id: `tmp-${Date.now()}`, training_name: '', date_from: '', date_to: '', hours_per_day: '8', hours: '', isNew: true }]);
    const handleRemoveTraining = (idxToRemove) => {
        setTrainings(t => t.filter((_, idx) => idx !== idxToRemove));
    };

    const handleTrainingDateChange = (idx, field, val) => {
        setTrainings(t => t.map((x, i) => {
            if (i !== idx) return x;
            const newX = { ...x, [field]: val };
            const from = newX.date_from || newX.date_completed;
            const to = newX.date_to || newX.date_completed;
            const hrsPerDay = parseFloat(newX.hours_per_day) || 8;
            if (from && to) {
                const d1 = new Date(from);
                const d2 = new Date(to);
                if (d1 <= d2) {
                    const diffTime = Math.abs(d2 - d1);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    newX.hours = String(diffDays * hrsPerDay);
                }
            }
            return newX;
        }));
    };

    // ── LOADING ──
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-14 h-14 border-[5px] border-brand-700 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Loading Your Profile...</p>
                </div>
            </div>
        );
    }


    // ── MAIN PROFILING FORM ──
    return (
        <PageTransition>
            <div className="min-h-screen bg-transparent text-brand-800 relative overflow-x-hidden lg:h-screen lg:flex lg:flex-col lg:overflow-hidden">
                {/* Ambient Decorative Background Elements */}

                {/* ── Mobile Sidebar Drawer ── */}
                <MobileDrawer completeness={completeness} dataSource={dataSource} isMobileMenuOpen={isMobileMenuOpen} isTabCompleted={isTabCompleted} setIsMobileMenuOpen={setIsMobileMenuOpen} setTab={setTab} tab={tab} />

                {/* ── Unified Premium Header Banner ── */}
                <HeaderBanner TLOid={TLOid} applicationId={applicationId} applicationStatus={applicationStatus} completeness={completeness} fullName={fullName} handleEditToggle={handleEditToggle} isEditing={isEditing} isTlo={isTlo} logout={logout} navigate={navigate} profile={profile} />

                {/* ── Body Content ── */}
                <div className="w-full flex-1 flex flex-row lg:overflow-hidden bg-transparent">
                    {/* Sidebar (Desktop Only) */}
                    <Sidebar completeness={completeness} dataSource={dataSource} isTabCompleted={isTabCompleted} setTab={setTab} tab={tab} />

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                        {/* Mobile Toggle Bar */}
                        <MobileToggleBar dataSource={dataSource} isTabCompleted={isTabCompleted} setIsMobileMenuOpen={setIsMobileMenuOpen} setTab={setTab} tab={tab} />

                        {/* Scrollable Form Area */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-transparent pb-32 lg:pb-24">
                            <div className="max-w-[1400px] w-full mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                                    <div className="md:col-span-3">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={tab}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.15 }}
                                            >

                                                {/* ── PERSONAL INFO ── */}
                                                <PersonalTab TLOid={TLOid} availableDivisions={availableDivisions} handleFileUpload={handleFileUpload} isDesignationOthers={isDesignationOthers} isEditing={isEditing} isLocationLocked={isLocationLocked} isPositionOthers={isPositionOthers} isSuffixNA={isSuffixNA} profile={profile} regionsList={regionsList} setIsSuffixNA={setIsSuffixNA} setP={setP} setProfile={setProfile} setShowLocationUnlockModal={setShowLocationUnlockModal} tab={tab} unifiedList={unifiedList} uploadingDocs={uploadingDocs} />

                                                {/* ── ELIGIBILITY ── */}
                                                <EligibilityTab isEditing={isEditing} profile={profile} setP={setP} setProfile={setProfile} tab={tab} />

                                                {/* ── EXPERIENCE ── */}
                                                <ExperienceTab handleAddPosition={handleAddPosition} handleRemovePosition={handleRemovePosition} history={history} historyLoading={historyLoading} isEditing={isEditing} prevPositions={prevPositions} profile={profile} setPrevPositions={setPrevPositions} tab={tab} />

                                                {/* ── EDUCATION ── */}
                                                <EducationTab isEditing={isEditing} profile={profile} setP={setP} setProfile={setProfile} tab={tab} />

                                                {/* ── PERFORMANCE RATINGS ── */}
                                                <PerformanceTab isEditing={isEditing} profile={profile} setP={setP} tab={tab} />

                                                {/* ── ACHIEVEMENTS ── */}
                                                <AchievementsTab isEditing={isEditing} notableAchievementsOptions={notableAchievementsOptions} profile={profile} setP={setP} tab={tab} />

                                                {/* ── PROFESSIONAL DEVELOPMENT TRAININGS ── */}
                                                <TrainingsTab handleAddTraining={handleAddTraining} handleRemoveTraining={handleRemoveTraining} handleTrainingDateChange={handleTrainingDateChange} isEditing={isEditing} profile={profile} setTrainings={setTrainings} tab={tab} trainings={trainings} />

                                                {/* ── DOCUMENTS ── */}
                                                <DocumentsTab certified={certified} handleDownloadDocument={handleDownloadDocument} handleFileUpload={handleFileUpload} handleViewDocument={handleViewDocument} isEditing={isEditing} profile={profile} tab={tab} uploadedFileNames={uploadedFileNames} uploadingDocs={uploadingDocs} />

                                                {/* ── LEGAL ── */}
                                                <LegalTab handleDownloadDocument={handleDownloadDocument} handleFileUpload={handleFileUpload} handleViewDocument={handleViewDocument} isEditing={isEditing} profile={profile} setP={setP} tab={tab} uploadedFileNames={uploadedFileNames} uploadingDocs={uploadingDocs} />



                                                {/* ── SUMMARY & CERTIFY ── */}
                                                <SummaryTab applicationStatus={applicationStatus} certified={certified} certifying={certifying} completeness={completeness} dataSource={dataSource} dpaConsent={dpaConsent} exportModalOpen={exportModalOpen} exporting={exporting} generateCSV={generateCSV} generatePDF={generatePDF} generatePPT={generatePPT} handleCertify={handleCertify} handleFileUpload={handleFileUpload} handleSubmitApplication={handleSubmitApplication} handleViewDocument={handleViewDocument} history={history} isEditing={isEditing} prevPositions={prevPositions} previewContainerRef={previewContainerRef} previewScale={previewScale} profile={profile} saving={saving} selectedExportType={selectedExportType} setDpaConsent={setDpaConsent} setExportModalOpen={setExportModalOpen} setSelectedExportType={setSelectedExportType} setTab={setTab} setTruthConsent={setTruthConsent} tab={tab} targetVacancyId={targetVacancyId} truthConsent={truthConsent} uploadingDocs={uploadingDocs} vacancies={vacancies} />

                                            </motion.div>
                                        </AnimatePresence>

                                        {/* Global Save Success Notification */}
                                        <AnimatePresence>
                                            {saveSuccess && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 20 }}
                                                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border-2 border-emerald-400/30 backdrop-blur-md"
                                                >
                                                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                                        <FiCheckCircle size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[18px] font-black uppercase tracking-widest">Progress Saved</p>
                                                        <p className="text-[15px] font-bold opacity-80">Your profile data is secure in our registry.</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {applicationStatus === 'disapproved' && tab === 'summary' && (
                                            <div className="mt-10 flex justify-center">
                                                <button
                                                    onClick={handleResubmit}
                                                    disabled={saving}
                                                    className="px-12 py-4 bg-gold text-white font-black text-[15px] uppercase tracking-widest rounded-full shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/35 hover:scale-[1.02] transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-4 border-2 border-amber-300"
                                                >
                                                    {saving ? <FiLoader className="animate-spin" size={18} /> : <FiRefreshCw size={18} />}
                                                    {saving ? 'Submitting...' : 'Resubmit Application'}
                                                </button>
                                            </div>
                                        )}
                                    </div>


                                </div>
                            </div>
                        </div>

                        {/* Persistent Bottom Action Bar */}
                        <BottomActionBar handleSave={handleSave} isEditing={isEditing} saving={saving} />




                        {/* Location Unlock Confirmation Modal */}
                        <LocationUnlockModal profile={profile} setIsLocationLocked={setIsLocationLocked} setShowLocationUnlockModal={setShowLocationUnlockModal} showLocationUnlockModal={showLocationUnlockModal} />

                        {/* Removed Global Export Modal because it was moved into Summary Tab as an inline popover */}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default OfficialProfiling;
