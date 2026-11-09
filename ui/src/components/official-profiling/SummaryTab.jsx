import { motion, AnimatePresence } from '../../utils/staticElements.jsx';
import { User as FiUser, Medal as FiAward, Briefcase as FiBriefcase, FileText as FiFileText, Shield as FiShield, FloppyDisk as FiSave, CheckCircle as FiCheckCircle, UploadSimple as FiUpload, SpinnerGap as FiLoader, TrendUp as FiTrendingUp, Clock as FiClock, Star as FiStar, ArrowRight as FiArrowRight, Calendar as FiCalendar, DownloadSimple as FiDownload, X as FiX, Monitor as FiMonitor, File as FiFile, Printer as FiPrinter, Eye as FiEye, Heart as FiHeart, BookOpen as FiBookOpen, ArrowCounterClockwise as FiRotateCcw, Camera as FiCamera, ChartBar as FiBarChart2, CaretDown as FiChevronDown, House as FiHome, MapPin as FiMapPin, Stack as FiLayers, XCircle as FiXCircle } from '@phosphor-icons/react';
import depedLogo from '../../assets/DepED-Logo.png';
import { apiUrl } from '../../utils/api';
import { calculateDuration, sanitizeSuffix } from './helpers';
import { Field, SummaryRow } from './formParts';

const SummaryTab = ({ applicationStatus, certified, certifying, completeness, dataSource, dpaConsent, exportModalOpen, exporting, generateCSV, generatePDF, generatePPT, handleCertify, handleFileUpload, handleSubmitApplication, handleViewDocument, history, isEditing, prevPositions, previewContainerRef, previewScale, profile, saving, selectedExportType, setDpaConsent, setExportModalOpen, setSelectedExportType, setTab, setTruthConsent, tab, targetVacancyId, truthConsent, uploadingDocs, vacancies }) => {
  return (
    <>
                                                {tab === 'summary' && (
                                                    <div className="bg-slate-50 min-h-screen">
                                                        <div className="space-y-6">

                                                            {/* PROFILE SUMMARY */}
                                                            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-8 relative">
                                                                <div className="absolute top-8 right-8 z-[51]">
                                                                    <button onClick={() => setExportModalOpen(!exportModalOpen)} className="flex items-center gap-2 bg-brand-700 border-2 border-blue-400/30 px-5 py-2.5 rounded-lg text-white hover:bg-blue-700 font-bold text-[16.5px] transition-all shadow-sm relative z-[51]">
                                                                        <FiDownload size={18} /> Export Profile
                                                                    </button>
                                                                    <AnimatePresence>
                                                                        {/* Reusing existing exportModalOpen block logic but keeping it hidden inside this div */}
                                                                        {exportModalOpen && (
                                                                            /* existing export modal code will go here - I will retain the original modal code */
                                                                            <AnimatePresence>
                                                                                {exportModalOpen && (
                                                                                    <motion.div
                                                                                        initial={{ opacity: 0 }}
                                                                                        animate={{ opacity: 1 }}
                                                                                        exit={{ opacity: 0 }}
                                                                                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-900/60 backdrop-blur-sm"
                                                                                    >
                                                                                        <motion.div
                                                                                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                                                                            className="relative w-full max-w-[1200px] bg-white rounded-lg shadow-2xl border-2 border-white/50 flex flex-col lg:flex-row overflow-hidden max-h-full"
                                                                                            onClick={e => e.stopPropagation()}
                                                                                        >
                                                                                            {/* Sidebar Options */}
                                                                                            <div className="w-full lg:w-64 bg-transparent border-r-2 border-slate-200 p-6 flex flex-col gap-3 shrink-0">
                                                                                                <div className="flex items-center justify-between mb-4">
                                                                                                    <div>
                                                                                                        <h2 className="text-[21px] font-black text-brand-800 uppercase tracking-tight italic">Export Options</h2>
                                                                                                    </div>
                                                                                                    <button onClick={() => setExportModalOpen(false)} className="w-8 h-8 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-full flex items-center justify-center transition-colors shadow-sm border-2 border-slate-200">
                                                                                                        <FiX size={18} />
                                                                                                    </button>
                                                                                                </div>
                                                                                                {[
                                                                                                    { id: 'csv', label: 'Data Export (CSV)', icon: FiFileText, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                                                                                    { id: 'pdf', label: 'Document (PDF)', icon: FiFile, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
                                                                                                    { id: 'ppt', label: 'Presentation (PPT)', icon: FiMonitor, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                                                                                                ].map(opt => (
                                                                                                    <button
                                                                                                        key={opt.id}
                                                                                                        onClick={() => setSelectedExportType(opt.id)}
                                                                                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${selectedExportType === opt.id ? `${opt.border} ${opt.bg} shadow-sm` : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                                                                                    >
                                                                                                        <opt.icon size={18} className={selectedExportType === opt.id ? opt.color : 'text-slate-400'} />
                                                                                                        <div>
                                                                                                            <p className={`text-[15px] font-black uppercase tracking-tight ${selectedExportType === opt.id ? opt.color : 'text-slate-600'}`}>{opt.label}</p>
                                                                                                        </div>
                                                                                                    </button>
                                                                                                ))}

                                                                                                <div className="mt-auto pt-6 flex flex-col gap-3">
                                                                                                    {selectedExportType === 'pdf' && (
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                const printContent = document.getElementById('pdf-preview-content').outerHTML;
                                                                                                                const printWindow = window.open('', '_blank');
                                                                                                                printWindow.document.write(`
                                                                                                                                                            <html>
                                                                                                                                                            <head>
                                                                                                                                                                <title>Print Profile</title>
                                                                                                                                                                <script src="https://cdn.tailwindcss.com"></script>
                                                                                                                                                                <style>
                                                                                                                                                                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
                                                                                                                                                                    body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                                                                                                                                                    @page { size: landscape; margin: 10mm; }
                                                                                                                                                                </style>
                                                                                                                                                            </head>
                                                                                                                                                            <body>
                                                                                                                                                                <div class="flex justify-center items-start w-full h-full">
                                                                                                                                                                    ${printContent}
                                                                                                                                                                </div>
                                                                                                                                                                <script>
                                                                                                                                                                    window.onload = function() {
                                                                                                                                                                        setTimeout(function() {
                                                                                                                                                                            window.print();
                                                                                                                                                                            window.close();
                                                                                                                                                                        }, 800);
                                                                                                                                                                    };
                                                                                                                                                                </script>
                                                                                                                                                            </body>
                                                                                                                                                            </html>
                                                                                                                                                        `);
                                                                                                                printWindow.document.close();
                                                                                                            }}
                                                                                                            disabled={exporting}
                                                                                                            className="w-full py-4 bg-emerald-600 text-white font-black text-[15px] uppercase tracking-widest rounded-xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                                                                        >
                                                                                                            <FiPrinter size={18} />
                                                                                                            Print Document
                                                                                                        </button>
                                                                                                    )}
                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            if (selectedExportType === 'csv') generateCSV();
                                                                                                            if (selectedExportType === 'pdf') generatePDF();
                                                                                                            if (selectedExportType === 'ppt') generatePPT();
                                                                                                        }}
                                                                                                        disabled={exporting}
                                                                                                        className="w-full py-4 bg-brand-800 text-white font-black text-[15px] uppercase tracking-widest rounded-xl shadow-xl hover:bg-brand-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                                                                    >
                                                                                                        {exporting ? <FiLoader className="animate-spin" size={18} /> : <FiDownload size={18} />}
                                                                                                        {exporting ? 'Generating...' : `Download`}
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Preview Area */}
                                                                                            <div ref={previewContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10 flex flex-col items-center bg-slate-100/50">
                                                                                                {selectedExportType === 'csv' && (
                                                                                                    <div className="w-full max-w-4xl bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                                                                                        <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                                                                                                            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500" /><div className="w-3 h-3 rounded-full bg-amber-500" /><div className="w-3 h-3 rounded-full bg-emerald-500" /></div>
                                                                                                            <span className="text-[16.5px] text-slate-300 font-mono ml-2">profile_{profile.last_name || 'export'}.csv</span>
                                                                                                        </div>
                                                                                                        <div className="p-0 overflow-x-auto custom-scrollbar">
                                                                                                            <table className="w-full text-left border-collapse text-[16.5px] font-mono whitespace-nowrap">
                                                                                                                <thead className="bg-transparent sticky top-0">
                                                                                                                    <tr className="border-b-2 border-slate-200 text-slate-500">
                                                                                                                        <th className="p-4 font-bold">Data Field</th><th className="p-4 font-bold">Exported Value</th>
                                                                                                                    </tr>
                                                                                                                </thead>
                                                                                                                <tbody>
                                                                                                                    {[
                                                                                                                        ['First Name', profile.first_name], ['Last Name', profile.last_name], ['Middle Name', profile.middle_name],
                                                                                                                        ['Gender', profile.gender], ['Date of Birth', profile.date_of_birth], ['Age', profile.age],
                                                                                                                        ['Total Years in Third Level', profile.total_years_third_level],
                                                                                                                        ['Permanent Address', profile.permanent_address], ['Temporary Address', profile.temporary_address], ['CES Stage', profile.ces_stage],
                                                                                                                        ['Highest Education', profile.highest_education], ['Program / Course', profile.education_program],
                                                                                                                        ['Latest Rating', profile.performance_rating_1], ['Total Managerial Exp.', profile.managerial_experience_total],
                                                                                                                    ].map(([k, v], i) => (
                                                                                                                        <tr key={i} className="border-b-2 border-slate-100 text-slate-700 hover:bg-white bg-slate-50/30">
                                                                                                                            <td className="px-4 py-3 font-bold text-slate-500 border-r-2 border-slate-100">{k}</td><td className="px-4 py-3">{v || '—'}</td>
                                                                                                                        </tr>
                                                                                                                    ))}
                                                                                                                </tbody>
                                                                                                            </table>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}

                                                                                                {(selectedExportType === 'pdf' || selectedExportType === 'ppt') && (
                                                                                                    <div className="overflow-hidden flex justify-center w-full bg-slate-50/50 py-10 rounded-2xl border-2 border-slate-200 shadow-inner hide-scrollbar">
                                                                                                        <div className="bg-white shadow-2xl border-2 border-slate-200 transition-transform duration-200 shrink-0 w-[1000px]" style={{ transform: `scale(${previewScale * 0.5})`, transformOrigin: 'top center', marginBottom: `-${700 * (1 - previewScale * 0.5)}px` }}>
                                                                                                            <div className="p-8 mx-auto w-[1000px] min-h-[700px] relative text-black bg-white" id={selectedExportType === 'pdf' ? "pdf-preview-content" : "ppt-preview-content"}>
                                                                                                                <div className="absolute top-0 left-0 w-full h-2 bg-brand-800"></div>
                                                                                                                <div className="flex justify-between items-start mb-5 pt-2">
                                                                                                                    <div className="flex gap-5 items-center">
                                                                                                                        <img src={depedLogo} alt="Logo" className="w-20 h-20 object-contain" />
                                                                                                                        <div>
                                                                                                                            <h1 className="person-title text-2xl uppercase tracking-tight text-brand-800">{profile.last_name || ''}{sanitizeSuffix(profile.suffix) ? ` ${sanitizeSuffix(profile.suffix)}` : ''}, {profile.first_name || ''} {profile.middle_name || ''}</h1>
                                                                                                                            <h2 className="text-lg font-bold uppercase mt-1 text-slate-800 flex items-center gap-2 flex-wrap">
                                                                                                                                <span>{profile.position_title || 'N/A'}</span>
                                                                                                                                {profile.is_oic && <span className="px-2 py-0.5 rounded-full bg-gold text-brand-800 text-[9px] font-black uppercase tracking-widest leading-none">OIC</span>}
                                                                                                                                {profile.office ? `, ${profile.office}` : ''}
                                                                                                                            </h2>
                                                                                                                            {profile.designation &&
                                                                                                                                profile.designation.trim() !== '' &&
                                                                                                                                profile.designation.trim().toLowerCase() !== 'no designation' &&
                                                                                                                                profile.designation.trim().toLowerCase() !== 'none' &&
                                                                                                                                profile.designation.trim().toLowerCase() !== (profile.position_title || '').trim().toLowerCase() && (
                                                                                                                                <p className="text-sm font-semibold italic text-brand-800 mt-0.5">
                                                                                                                                    {profile.designation}
                                                                                                                                </p>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                    <div className="flex gap-6 items-start">
                                                                                                                        <div className="w-[84px] h-[84px] bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 border-2 border-slate-200 uppercase tracking-widest shrink-0 overflow-hidden">
                                                                                                                            {profile.photo_binary_id ? (
                                                                                                                                <img src={apiUrl(`/api/binary/${profile.photo_binary_id}`)} alt="Photo" className="w-full h-full object-cover" />
                                                                                                                            ) : (
                                                                                                                                "2x2 Photo"
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                <div className="grid grid-cols-12 gap-8">
                                                                                                                    <div className="col-span-7 space-y-5">
                                                                                                                        <table className="w-full text-xs border-collapse">
                                                                                                                            <thead>
                                                                                                                                <tr><th colSpan={3} className="bg-brand-800 text-white font-bold py-2 border-2 border-slate-400 text-center uppercase tracking-widest text-[11px]">Managerial Experience</th></tr>
                                                                                                                            </thead>
                                                                                                                            <tbody>
                                                                                                                                {(() => {
                                                                                                                                    const list = (prevPositions && prevPositions.length > 0) ? prevPositions : (history || []);
                                                                                                                                    const displayList = list.filter(h => h.position_title || h.position_name || h.office).slice(0, 4);
                                                                                                                                    if (displayList.length === 0) {
                                                                                                                                        return (
                                                                                                                                            <tr><td colSpan={3} className="border-2 border-slate-400 px-3 py-1.5 text-center text-slate-500 italic">No experience listed</td></tr>
                                                                                                                                        );
                                                                                                                                    }
                                                                                                                                    const rows = [];
                                                                                                                                    displayList.forEach((h, i) => {
                                                                                                                                        const title = h.position_title || h.position_name || '—';
                                                                                                                                        const officeName = h.office || '—';
                                                                                                                                        const dur = h.start_date && h.end_date ? calculateDuration(h.start_date, h.end_date) : { years: 0, months: 0 };
                                                                                                                                        rows.push(
                                                                                                                                            <tr key={`parent-${i}`} className="text-slate-800 bg-slate-50/30 font-semibold">
                                                                                                                                                <td className="border-2 border-slate-400 px-3 py-1.5 font-bold w-1/3">{title}</td>
                                                                                                                                                <td className="border-2 border-slate-400 px-3 py-1.5 w-1/3">{officeName}</td>
                                                                                                                                                <td className="border-2 border-slate-400 px-3 py-1.5 text-center font-medium">{dur.years} yrs., {dur.months} mos.</td>
                                                                                                                                            </tr>
                                                                                                                                        );
                                                                                                                                        if (h.oic_positions && Array.isArray(h.oic_positions) && h.oic_positions.length > 0) {
                                                                                                                                            h.oic_positions.forEach((oic, oicIdx) => {
                                                                                                                                                if (oic.oic_position_name || oic.oic_office) {
                                                                                                                                                    const oicTitle = oic.oic_position_name || 'OIC Position';
                                                                                                                                                    const oicOffice = oic.oic_office || '—';
                                                                                                                                                    const oicDur = oic.oic_start_date && oic.oic_end_date ? calculateDuration(oic.oic_start_date, oic.oic_end_date) : { years: 0, months: 0 };
                                                                                                                                                    rows.push(
                                                                                                                                                        <tr key={`child-${i}-${oicIdx}`} className="text-slate-700 text-[11px] bg-amber-50/50">
                                                                                                                                                            <td className="border-2 border-slate-400 px-3 py-1.5 pl-6 font-medium">
                                                                                                                                                                <span className="text-brand-800 font-bold">└─ OIC:</span> {oicTitle}
                                                                                                                                                            </td>
                                                                                                                                                            <td className="border-2 border-slate-400 px-3 py-1.5 text-slate-600">{oicOffice}</td>
                                                                                                                                                            <td className="border-2 border-slate-400 px-3 py-1.5 text-center font-normal">{oicDur.years} yrs., {oicDur.months} mos.</td>
                                                                                                                                                        </tr>
                                                                                                                                                    );
                                                                                                                                                }
                                                                                                                                            });
                                                                                                                                        }
                                                                                                                                    });
                                                                                                                                    return rows;
                                                                                                                                })()}
                                                                                                                            </tbody>
                                                                                                                        </table>
                                                                                                                        <table className="w-full text-xs border-collapse">
                                                                                                                            <thead>
                                                                                                                                <tr><th colSpan={3} className="bg-brand-800 text-white font-bold py-2 border-2 border-slate-400 text-center uppercase tracking-widest text-[11px]">Educational Attainment</th></tr>
                                                                                                                            </thead>
                                                                                                                            <tbody className="text-slate-800">
                                                                                                                                <tr>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/4 font-medium text-center">Doctorate</td>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/2">{profile.doctorate_degree || '—'}</td>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/4 text-center font-medium">{profile.doctorate_year || '—'}</td>
                                                                                                                                </tr>
                                                                                                                                <tr>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/4 font-medium text-center">Master's Degree</td>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/2">{profile.master_degree || '—'}</td>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/4 text-center font-medium">{profile.master_year || '—'}</td>
                                                                                                                                </tr>
                                                                                                                                <tr>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/4 font-medium text-center">Baccalaureate</td>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/2">{profile.bachelor_degree || '—'}</td>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 w-1/4 text-center font-medium">{profile.bachelor_year || '—'}</td>
                                                                                                                                </tr>
                                                                                                                            </tbody>
                                                                                                                        </table>
                                                                                                                    </div>
                                                                                                                    <div className="col-span-5 space-y-5 relative">
                                                                                                                        <div className="absolute -top-12 left-0 w-20">
                                                                                                                            <div className="bg-amber-500 text-white font-bold py-0.5 text-center text-[10px] uppercase tracking-widest">Age</div>
                                                                                                                            <div className="border-2 border-amber-500 py-1 text-center font-bold text-base text-brand-800 bg-white">{profile.age || '—'}</div>
                                                                                                                        </div>
                                                                                                                        <table className="w-full text-xs border-collapse mt-8">
                                                                                                                            <thead>
                                                                                                                                <tr><th colSpan={3} className="bg-red-700 text-white font-bold py-2 border-2 border-red-700 text-center uppercase tracking-widest text-[11px]">Performance Rating</th></tr>
                                                                                                                                <tr className="bg-red-50 text-[10px] font-black text-red-900 border-2 border-slate-400">
                                                                                                                                    <th className="px-3 py-1 text-left border-2 border-slate-400">Period / Type</th>
                                                                                                                                    <th className="px-2 py-1 text-center border-2 border-slate-400 w-16">Year</th>
                                                                                                                                    <th className="px-2 py-1 text-center border-2 border-slate-400 w-16">Rating</th>
                                                                                                                                </tr>
                                                                                                                            </thead>
                                                                                                                            <tbody className="text-slate-800">
                                                                                                                                {(() => {
                                                                                                                                    const extractPdfYear = (p) => {
                                                                                                                                        if (!p) return '—';
                                                                                                                                        const m = String(p).match(/\b(19\d\d|20\d\d)\b/);
                                                                                                                                        return m ? m[1] : (String(p).split('-')[0] || String(p));
                                                                                                                                    };
                                                                                                                                    const rows = [];
                                                                                                                                    if (profile.cespes_1_rating) rows.push(
                                                                                                                                        <tr key="cespes-1"><td className="border-2 border-slate-400 px-3 py-1.5">{profile.cespes_rating_1_period || ''} 1st sem (CESPES)</td><td className="border-2 border-slate-400 px-2 py-1.5 text-center font-semibold text-slate-600">{extractPdfYear(profile.cespes_rating_1_period)}</td><td className="border-2 border-slate-400 px-3 py-1.5 text-center font-black">{profile.cespes_1_rating}</td></tr>
                                                                                                                                    );
                                                                                                                                    if (profile.cespes_2_rating) rows.push(
                                                                                                                                        <tr key="cespes-2"><td className="border-2 border-slate-400 px-3 py-1.5">{profile.cespes_rating_2_period || ''} 2nd sem (CESPES)</td><td className="border-2 border-slate-400 px-2 py-1.5 text-center font-semibold text-slate-600">{extractPdfYear(profile.cespes_rating_2_period)}</td><td className="border-2 border-slate-400 px-3 py-1.5 text-center font-black">{profile.cespes_2_rating}</td></tr>
                                                                                                                                    );
                                                                                                                                    if (profile.performance_rating_1) rows.push(
                                                                                                                                        <tr key="opcrf-1"><td className="border-2 border-slate-400 px-3 py-1.5">{profile.performance_rating_1_period || ''} (OPCRF)</td><td className="border-2 border-slate-400 px-2 py-1.5 text-center font-semibold text-slate-600">{extractPdfYear(profile.performance_rating_1_period)}</td><td className="border-2 border-slate-400 px-3 py-1.5 text-center font-black">{profile.performance_rating_1}</td></tr>
                                                                                                                                    );
                                                                                                                                    if (profile.performance_rating_2) rows.push(
                                                                                                                                        <tr key="opcrf-2"><td className="border-2 border-slate-400 px-3 py-1.5">{profile.performance_rating_2_period || ''} (OPCRF)</td><td className="border-2 border-slate-400 px-2 py-1.5 text-center font-semibold text-slate-600">{extractPdfYear(profile.performance_rating_2_period)}</td><td className="border-2 border-slate-400 px-3 py-1.5 text-center font-black">{profile.performance_rating_2}</td></tr>
                                                                                                                                    );
                                                                                                                                    if (profile.performance_rating_3) rows.push(
                                                                                                                                        <tr key="opcrf-3"><td className="border-2 border-slate-400 px-3 py-1.5">{profile.performance_rating_3_period || ''} (OPCRF)</td><td className="border-2 border-slate-400 px-2 py-1.5 text-center font-semibold text-slate-600">{extractPdfYear(profile.performance_rating_3_period)}</td><td className="border-2 border-slate-400 px-3 py-1.5 text-center font-black">{profile.performance_rating_3}</td></tr>
                                                                                                                                    );
                                                                                                                                    if (rows.length === 0) {
                                                                                                                                        return <tr><td colSpan={3} className="border-2 border-slate-400 px-3 py-2 text-center text-slate-400 italic">No ratings listed</td></tr>;
                                                                                                                                    }
                                                                                                                                    return rows;
                                                                                                                                })()}
                                                                                                                            </tbody>
                                                                                                                        </table>
                                                                                                                        <table className="w-full text-xs border-collapse">
                                                                                                                            <thead>
                                                                                                                                <tr><th colSpan={2} className="bg-red-700 text-white font-bold py-2 border-2 border-red-700 text-center uppercase tracking-widest text-[11px]">Eligibility</th></tr>
                                                                                                                            </thead>
                                                                                                                            <tbody className="text-slate-800">
                                                                                                                                <tr>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 font-medium">Career Executive Service (CES): {profile.ces_stage || 'Not Applicable'}</td>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 text-center font-black">{profile.ces_conferment_date || '—'}</td>
                                                                                                                                </tr>
                                                                                                                                <tr>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 font-medium">Educational Management Test (EMT): {profile.emt_passer === true ? 'Passed' : profile.emt_passer === false ? 'Not Passed' : 'Not Applicable'}</td>
                                                                                                                                    <td className="border-2 border-slate-400 px-3 py-1.5 text-center font-black">{profile.emt_date || '—'}</td>
                                                                                                                                </tr>
                                                                                                                            </tbody>
                                                                                                                        </table>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>

                                                                <div className="flex items-center gap-3 mb-8">
                                                                    <FiUser className="text-brand-800" size={24} />
                                                                    <h2 className="text-[21px] font-black text-brand-800 uppercase tracking-widest">Profile Summary</h2>
                                                                </div>

                                                                {/* Personal Information */}
                                                                <div className="mb-8">
                                                                    <h3 className="text-[15px] font-bold text-slate-400 uppercase tracking-widest mb-4">Personal Information</h3>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                                                        <div><p className="text-[15px] text-slate-400 mb-1">First Name</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.first_name || '—'}</p></div>
                                                                        <div><p className="text-[15px] text-slate-400 mb-1">Last Name</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.last_name || '—'}</p></div>
                                                                        <div><p className="text-[15px] text-slate-400 mb-1">Middle Name</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.middle_name || '—'}</p></div>
                                                                        <div><p className="text-[15px] text-slate-400 mb-1">Suffix</p><p className="text-[18px] font-black text-slate-800 uppercase">{sanitizeSuffix(profile.suffix) || '—'}</p></div>
                                                                        <div></div>{/* Empty column for alignment if needed */}

                                                                        <div className="flex items-start gap-2">
                                                                            <FiUser size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Gender</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.gender || '—'}</p></div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiCalendar size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Date of Birth</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.date_of_birth || '—'}</p></div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiUser size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Age</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.age || '—'}</p></div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiHeart size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Civil Status</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.civil_status || '—'}</p></div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiStar size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Target Application</p>
                                                                                <p className="text-[18px] font-black text-slate-800 uppercase">
                                                                                    {(() => {
                                                                                        const vac = targetVacancyId ? vacancies.find(x => x.TLOid === targetVacancyId) : null;
                                                                                        return vac ? vac.position_title : (profile.applied_position || profile.position_title || 'General Roster');
                                                                                    })()}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="w-full h-0.5 bg-slate-200 my-8"></div>

                                                                {/* Designation & Appointment */}
                                                                <div className="mb-8">
                                                                    <h3 className="text-[15px] font-bold text-slate-400 uppercase tracking-widest mb-4">Designation & Appointment</h3>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                                                        <div className="col-span-2">
                                                                            <p className="text-[15px] text-slate-400 mb-1">Position Title</p>
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-[18px] font-black text-slate-800 uppercase">{profile.position_title || '—'}</p>
                                                                                {profile.is_oic && <span className="px-1.5 py-0.5 rounded bg-gold text-brand-800 text-[13.5px] font-black uppercase">OIC</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiCalendar size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Date of Present Position</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.appointment_date || '—'}</p></div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiHome size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Permanent Address</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.permanent_address || '—'}</p></div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiMapPin size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Temporary Address</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.temporary_address || '—'}</p></div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="w-full h-0.5 bg-slate-200 my-8"></div>

                                                                {/* Eligibility */}
                                                                <div>
                                                                    <h3 className="text-[15px] font-bold text-slate-400 uppercase tracking-widest mb-4">Eligibility</h3>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
                                                                        <div className="col-span-2"><p className="text-[15px] text-slate-400 mb-1">Career Executive Service (CES)</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.ces_stage || '—'}</p></div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiCalendar size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">CES Conferment Date</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.ces_conferment_date || '—'}</p></div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiBookOpen size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">Educational Management Test (EMT)</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.emt_passer === true ? 'Yes' : profile.emt_passer === false ? 'No' : '—'}</p></div>
                                                                        </div>
                                                                        <div className="flex items-start gap-2">
                                                                            <FiCalendar size={18} className="text-blue-500 mt-0.5" />
                                                                            <div><p className="text-[15px] text-slate-400 mb-1">EMT Date</p><p className="text-[18px] font-black text-slate-800 uppercase">{profile.emt_date || '—'}</p></div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Eligibilities List */}
                                                                    {profile.eligibilities && profile.eligibilities.length > 0 && (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                                                                            {profile.eligibilities.map((elig, idx) => {
                                                                                const name = elig.eligibility || elig.title || 'Untitled';
                                                                                const meta = [
                                                                                    elig.rating ? `Rating: ${elig.rating}` : '',
                                                                                    elig.date ? `Date: ${new Date(elig.date).toLocaleDateString()}` : '',
                                                                                    elig.place_of_assignment ? `Place: ${elig.place_of_assignment}` : ''
                                                                                ].filter(Boolean).join(' | ');

                                                                                return (
                                                                                    <div key={idx} className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2 text-[16.5px]">
                                                                                            <span className="font-black text-blue-600 uppercase w-24">{name}:</span>
                                                                                            <span className="text-slate-600">{meta || '—'}</span>
                                                                                        </div>
                                                                                        {/* Star Rating Visualization (dummy logic if not real rating format, but image shows stars) */}
                                                                                        <div className="flex text-yellow-400 gap-0.5">
                                                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                                                <FiStar key={star} size={14} fill={(elig.rating && parseInt(elig.rating) >= star) ? 'currentColor' : 'none'} className={(elig.rating && parseInt(elig.rating) >= star) ? '' : 'text-slate-200'} />
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* EDUCATION */}
                                                            <div className="mb-10">
                                                                <div className="flex items-center gap-4 mb-6 px-2">
                                                                    <div className="w-12 h-12 bg-blue-50 text-brand-700 rounded-full flex items-center justify-center shadow-sm border-2 border-blue-100/50">
                                                                        <FiAward size={22} />
                                                                    </div>
                                                                    <div>
                                                                        <h2 className="text-[21px] font-black text-brand-800 uppercase tracking-widest leading-tight">Education</h2>
                                                                        <p className="text-[18px] font-medium text-slate-400 mt-0.5">Your academic background and qualifications</p>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6 lg:p-8">
                                                                    {(!profile.education_degrees || profile.education_degrees.length === 0) ? (
                                                                        (profile.highest_education || profile.education_program) ? (
                                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 relative">
                                                                                <div className="flex gap-4 items-start">
                                                                                    <div className="w-10 h-10 bg-blue-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0 border-2 border-blue-100/50">
                                                                                        <FiAward size={18} />
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-1 min-w-0 mt-0.5">
                                                                                        <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest truncate">Highest Education</span>
                                                                                        <span className="text-[18px] font-black text-slate-800 uppercase break-words">{profile.highest_education || '—'}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-4 items-start">
                                                                                    <div className="w-10 h-10 bg-blue-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0 border-2 border-blue-100/50">
                                                                                        <FiFileText size={18} />
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-1 min-w-0 mt-0.5">
                                                                                        <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest truncate">Specific Degree</span>
                                                                                        <span className="text-[18px] font-black text-slate-800 uppercase break-words">{profile.specific_degree || '—'}</span>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="col-span-1 lg:col-span-2 border-t-2 border-slate-200 my-[-1rem] hidden lg:block" />

                                                                                <div className="flex gap-4 items-start">
                                                                                    <div className="w-10 h-10 bg-blue-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0 border-2 border-blue-100/50">
                                                                                        <FiBookOpen size={18} />
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-1 min-w-0 mt-0.5">
                                                                                        <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest truncate">Program / Course</span>
                                                                                        <span className="text-[18px] font-black text-slate-800 uppercase break-words">{profile.education_program || '—'}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-4 items-start">
                                                                                    <div className="w-10 h-10 bg-blue-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0 border-2 border-blue-100/50">
                                                                                        <FiCalendar size={18} />
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-1 min-w-0 mt-0.5">
                                                                                        <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest truncate">Year Graduated</span>
                                                                                        <span className="text-[18px] font-black text-slate-800 uppercase break-words">{profile.education_year_graduated || '—'}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-[21px] font-bold text-slate-400 text-center py-4">No degrees added</p>
                                                                        )
                                                                    ) : (
                                                                        <div className="space-y-12">
                                                                            {profile.education_degrees.map((deg, idx) => (
                                                                                <div key={idx} className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 relative">
                                                                                    <div className="flex gap-4 items-start">
                                                                                        <div className="w-10 h-10 bg-blue-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0 border-2 border-blue-100/50">
                                                                                            <FiAward size={18} />
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1 min-w-0 mt-0.5">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest truncate">Highest Education</span>
                                                                                            <span className="text-[18px] font-black text-slate-800 uppercase break-words">{deg.highest_education || '—'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex gap-4 items-start">
                                                                                        <div className="w-10 h-10 bg-blue-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0 border-2 border-blue-100/50">
                                                                                            <FiFileText size={18} />
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1 min-w-0 mt-0.5">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest truncate">Specific Degree</span>
                                                                                            <span className="text-[18px] font-black text-slate-800 uppercase break-words">{deg.specific_degree || '—'}</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="col-span-1 lg:col-span-2 border-t-2 border-slate-200 my-[-1rem] hidden lg:block" />

                                                                                    <div className="flex gap-4 items-start">
                                                                                        <div className="w-10 h-10 bg-blue-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0 border-2 border-blue-100/50">
                                                                                            <FiBookOpen size={18} />
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1 min-w-0 mt-0.5">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest truncate">Program / Course</span>
                                                                                            <span className="text-[18px] font-black text-slate-800 uppercase break-words">{deg.education_program || '—'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex gap-4 items-start">
                                                                                        <div className="w-10 h-10 bg-blue-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0 border-2 border-blue-100/50">
                                                                                            <FiCalendar size={18} />
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1 min-w-0 mt-0.5">
                                                                                            <span className="text-[13.5px] font-black text-slate-400 uppercase tracking-widest truncate">Year Graduated</span>
                                                                                            <span className="text-[18px] font-black text-slate-800 uppercase break-words">{deg.education_year_graduated || '—'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {profile.other_courses && profile.other_courses.length > 0 && (
                                                                        <div className="mt-8 bg-brand-50 rounded-2xl p-6 lg:p-8 border-2 border-slate-200">
                                                                            <div className="flex items-center gap-3 mb-6">
                                                                                <div className="w-8 h-8 bg-blue-100/70 text-brand-700 rounded-full flex items-center justify-center shrink-0">
                                                                                    <FiLayers size={16} />
                                                                                </div>
                                                                                <h3 className="text-[16.5px] font-black text-brand-700 uppercase tracking-widest">Other Courses</h3>
                                                                            </div>

                                                                            <div className="space-y-4">
                                                                                {profile.other_courses.map((course, idx) => (
                                                                                    <div key={idx} className={`flex items-start gap-5 ${idx !== profile.other_courses.length - 1 ? 'pb-4 border-b-2 border-dashed border-slate-200' : ''}`}>
                                                                                        <div className="bg-blue-50/80 text-brand-700 px-3 py-2 rounded-xl text-[16.5px] font-black shrink-0 min-w-[70px] text-center uppercase tracking-wider border-2 border-blue-100/50 shadow-[0_1px_2px_rgb(var(--rgb-heading)/0.02)]">
                                                                                            {course.course ? (course.course.length > 8 ? course.course.substring(0, 8) + '...' : course.course) + ':' : '—:'}
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                                                            <span className="text-[18px] font-black text-brand-800">
                                                                                                {course.date_from ? new Date(course.date_from).toLocaleDateString() : '—'} to {course.date_to ? new Date(course.date_to).toLocaleDateString() : '—'}
                                                                                            </span>
                                                                                            {course.details && <span className="text-[16.5px] font-bold text-slate-500">{course.details}</span>}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* PERFORMANCE HISTORY */}
                                                            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-8">
                                                                <div className="flex items-center gap-3 mb-6">
                                                                    <FiBarChart2 className="text-brand-800" size={24} />
                                                                    <h2 className="text-[21px] font-black text-brand-800 uppercase tracking-widest">Performance History</h2>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                    {/* Ratings */}
                                                                    <div className="border-b-2 md:border-b-0 md:border-r-2 border-slate-200 pb-4 md:pb-0 md:pr-4">
                                                                        <p className="text-[15px] text-slate-400 mb-1">Latest Rating (1st)</p>
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-[21px] font-black text-slate-800">{profile.performance_rating_1 ? `${profile.performance_rating_1} (${profile.performance_rating_1_period})` : '—'}</p>
                                                                            <FiTrendingUp className="text-emerald-500" size={18} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="border-b-2 md:border-b-0 md:border-r-2 border-slate-200 pb-4 md:pb-0 md:pr-4">
                                                                        <p className="text-[15px] text-slate-400 mb-1">Previous Rating (2nd)</p>
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-[21px] font-black text-slate-800">{profile.performance_rating_2 ? `${profile.performance_rating_2} (${profile.performance_rating_2_period})` : '—'}</p>
                                                                            <FiTrendingUp className="text-emerald-500" size={18} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="pb-4 md:pb-0">
                                                                        <p className="text-[15px] text-slate-400 mb-1">Oldest Rating (3rd)</p>
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-[21px] font-black text-slate-800">{profile.performance_rating_3 ? `${profile.performance_rating_3} (${profile.performance_rating_3_period})` : '—'}</p>
                                                                            <FiTrendingUp className="text-emerald-500" size={18} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="border-b-2 md:border-b-0 md:border-r-2 border-slate-200 pb-4 md:pb-0 md:pr-4 md:-mt-4">
                                                                        <p className="text-[15px] text-slate-400 mb-1">CSPMS 2nd Sem</p>
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-[21px] font-black text-slate-800">{profile.cespes_2_rating ? `${profile.cespes_2_rating} (${profile.cespes_rating_2_period})` : '—'}</p>
                                                                            <FiTrendingUp className="text-emerald-500" size={18} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="pb-4 md:pb-0 md:-mt-4">
                                                                        <p className="text-[15px] text-slate-400 mb-1">Total Managerial Experience</p>
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-[21px] font-black text-slate-800">{profile.managerial_experience_total || '—'}</p>
                                                                            <FiBriefcase className="text-blue-500" size={18} />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Achievements */}
                                                                <div className="mt-8">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <FiAward className="text-amber-500" size={18} />
                                                                        <h3 className="text-[15px] font-bold text-slate-400 uppercase tracking-widest">Notable Achievements</h3>
                                                                    </div>
                                                                    {Array.isArray(profile.notable_achievements) && profile.notable_achievements.length > 0 ? (
                                                                        <div className="pl-6 space-y-1">
                                                                            {profile.notable_achievements.map((item, i) => {
                                                                                const title = typeof item === 'object' && item !== null ? item.title : String(item || '');
                                                                                const year = typeof item === 'object' && item !== null ? item.year : '';
                                                                                if (!title) return null;
                                                                                return (
                                                                                    <p key={i} className="text-[18px] font-black text-slate-800 uppercase">
                                                                                        • {title} {year ? `(${year})` : ''}
                                                                                    </p>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-[18px] font-black text-slate-800 uppercase pl-6">—</p>
                                                                    )}
                                                                </div>

                                                                {/* Previous Positions */}
                                                                {prevPositions.length > 0 && (
                                                                    <div className="mt-8">
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <FiRotateCcw className="text-blue-500" size={18} />
                                                                            <h3 className="text-[15px] font-bold text-slate-400 uppercase tracking-widest">Previous Position ({prevPositions.length})</h3>
                                                                        </div>
                                                                        <div className="pl-6 space-y-2">
                                                                            {prevPositions.map((p, i) => (
                                                                                <div key={i} className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 flex gap-4">
                                                                                    <span className="text-[18px] font-black text-slate-800">{i + 1}.</span>
                                                                                    <div>
                                                                                        <p className="text-[18px] font-black text-slate-800 uppercase">{p.position_name || '—'}</p>
                                                                                        <p className="text-[15px] text-slate-500 uppercase mt-0.5">{p.office} | {p.start_date ? `${p.start_date} - ${p.end_date || 'Present'}` : ''}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* DOCUMENTS */}
                                                            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-8">
                                                                <div className="flex items-center gap-3 mb-6">
                                                                    <FiFileText className="text-brand-800" size={24} />
                                                                    <h2 className="text-[21px] font-black text-brand-800 uppercase tracking-widest">Documents</h2>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    {[
                                                                        { key: 'photo', dbKey: 'photo_binary_id', label: '2x2 Photo', accept: 'image/*' },
                                                                        { key: 'pds', dbKey: 'pds_binary_id', label: 'PDS', accept: '.pdf,.doc,.docx' },
                                                                        { key: 'service_records', dbKey: 'service_records_binary_id', label: 'Performance Rating', accept: '.pdf' },
                                                                    ].map(d => (
                                                                        <div key={d.key} className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 ${profile[d.dbKey] ? 'bg-emerald-50/30 border-emerald-200' : 'bg-transparent border-slate-200'}`}>
                                                                            {d.key === 'photo' ? <FiCamera size={28} className={profile[d.dbKey] ? 'text-emerald-500' : 'text-slate-300'} /> : <FiFileText size={28} className={profile[d.dbKey] ? 'text-emerald-500' : 'text-slate-300'} />}
                                                                            <div className="text-center">
                                                                                <p className={`text-[18px] font-black uppercase tracking-wider ${profile[d.dbKey] ? 'text-emerald-700' : 'text-slate-500'}`}>{d.label}</p>
                                                                                <p className={`text-[13.5px] font-bold uppercase tracking-widest mt-1 ${profile[d.dbKey] ? 'text-emerald-500' : 'text-slate-400'}`}>{profile[d.dbKey] ? 'Uploaded' : 'Missing'}</p>
                                                                            </div>

                                                                            <div className="flex gap-2 w-full mt-4">
                                                                                <div className="relative group/upload flex-1">
                                                                                    <input disabled={!isEditing} type="file" accept={d.accept} onChange={(e) => { const file = e.target.files[0]; if (file) handleFileUpload(file, d.key); }} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full" />
                                                                                    <div className="flex items-center justify-center gap-1.5 border-2 border-slate-200 rounded-lg px-2 py-2 text-[15px] font-bold transition-all bg-white text-blue-700 hover:border-blue-300 w-full">
                                                                                        <FiUpload size={14} className={uploadingDocs[d.key] ? 'animate-bounce' : ''} />
                                                                                        <span>{uploadingDocs[d.key] ? '...' : 'Upload'}</span>
                                                                                    </div>
                                                                                </div>
                                                                                {profile[d.dbKey] && (
                                                                                    <button onClick={() => handleViewDocument(profile[d.dbKey])} className="flex-1 flex items-center justify-center gap-1.5 border-2 border-slate-200 rounded-lg px-2 py-2 text-[15px] font-bold transition-all bg-white hover:border-blue-300 text-blue-700">
                                                                                        <FiEye size={14} />
                                                                                        <span>View</span>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* LEGAL DISCLOSURES */}
                                                            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-8">
                                                                <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => {
                                                                    // Let's implement an inline toggle state for Legal Disclosures
                                                                    const el = document.getElementById('legal-collapse');
                                                                    if (el) {
                                                                        el.classList.toggle('hidden');
                                                                        document.getElementById('legal-chevron').classList.toggle('rotate-180');
                                                                    }
                                                                }}>
                                                                    <div className="flex items-center gap-3">
                                                                        <FiShield className="text-blue-600" size={24} />
                                                                        <h2 className="text-[21px] font-black text-slate-800 uppercase tracking-widest">Legal Disclosures</h2>
                                                                    </div>
                                                                    <FiChevronDown id="legal-chevron" className="text-slate-400 transition-transform" size={24} />
                                                                </div>

                                                                <div id="legal-collapse" className="hidden border-t-2 border-slate-100 pt-6 mt-4">
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                                        <SummaryRow label="Pending Administrative Cases" value={profile.pending_admin_case === 'Yes' ? 'Yes' : 'No'} />
                                                                        <SummaryRow label="Guilty of Admin Offense" value={profile.guilty_admin_details === 'Yes' ? 'Yes' : 'No'} />
                                                                        <SummaryRow label="Criminally Charged" value={profile.criminally_charged_details === 'Yes' ? 'Yes' : 'No'} />
                                                                        <SummaryRow label="Convicted of Crime" value={profile.convicted_crime_details === 'Yes' ? 'Yes' : 'No'} />
                                                                    </div>
                                                                </div>
                                                            </div>


                                                            {/* DATA PRIVACY & CERTIFICATION */}
                                                            <div className="mt-8">
                                                                {/* ── Data Privacy & Certification ── */}
                                                                <div className="bg-white rounded-lg border-2 border-brand-700/20 shadow-sm overflow-hidden">

                                                                    {/* Header */}
                                                                    <div className="bg-brand-800 px-8 py-6 flex items-center gap-4">
                                                                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                                                                            <FiShield size={22} className="text-white" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-white font-black text-[21px] uppercase tracking-widest">Data Privacy Notice & Certification</p>
                                                                            <p className="text-blue-200 text-[13.5px] font-bold uppercase tracking-widest mt-0.5">Republic Act No. 10173 — Data Privacy Act of 2012</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="p-8 space-y-6">
                                                                        {/* DepEd DPA Notice */}
                                                                        <div className="bg-transparent rounded-lg p-6 text-[16.5px] font-bold text-slate-600 leading-relaxed border-2 border-slate-200">
                                                                            <p>Pursuant to <span className="text-brand-800 font-black">Republic Act No. 10173</span> or <span className="text-brand-800 font-black">Data Privacy Act of 2012</span>, the personal data collected shall be kept confidential and shall not be disclosed, divulged nor used beyond its intended purpose. It may not be reproduced in whole, or in part, nor may any of the information contained therein be disclosed without the prior notice and/or consent of DepEd.</p>
                                                                        </div>

                                                                        {/* Certification Checkboxes */}
                                                                        <div className="space-y-4">
                                                                            <button
                                                                                onClick={() => setDpaConsent(v => !v)}
                                                                                className={`w-full flex items-start gap-4 p-5 rounded-lg border-2 text-left transition-all ${dpaConsent ? 'bg-brand-50 border-brand-700' : 'bg-transparent border-slate-200 hover:border-slate-300'}`}
                                                                            >
                                                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${dpaConsent ? 'bg-brand-800 border-brand-700' : 'border-slate-300 bg-white'}`}>
                                                                                    {dpaConsent && <FiCheckCircle size={14} className="text-white" />}
                                                                                </div>
                                                                                <p className="text-[16.5px] font-bold text-slate-700 leading-relaxed">
                                                                                    I have read and fully understood the Data Privacy Notice above. I hereby give my <span className="text-brand-800 font-black">informed consent</span> to the collection, processing, and use of my personal information by the Department of Education for the purposes stated herein, in compliance with the Data Privacy Act of 2012.
                                                                                </p>
                                                                            </button>

                                                                            <button
                                                                                onClick={() => setTruthConsent(v => !v)}
                                                                                className={`w-full flex items-start gap-4 p-5 rounded-lg border-2 text-left transition-all ${truthConsent ? 'bg-emerald-50 border-emerald-500' : 'bg-transparent border-slate-200 hover:border-slate-300'}`}
                                                                            >
                                                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${truthConsent ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>
                                                                                    {truthConsent && <FiCheckCircle size={14} className="text-white" />}
                                                                                </div>
                                                                                <p className="text-[16.5px] font-bold text-slate-700 leading-relaxed">
                                                                                    I hereby <span className="text-emerald-700 font-black">certify under oath</span> that all information I have provided in this profile is true, correct, and complete to the best of my knowledge. I understand that any false statement or misrepresentation shall subject me to the penalties prescribed under applicable laws and civil service rules.
                                                                                </p>
                                                                            </button>
                                                                        </div>

                                                                        {/* Action Buttons */}
                                                                        {!certified ? (
                                                                            <div className="space-y-3 pt-2 w-full">
                                                                                <div className="flex flex-col sm:flex-row gap-3">
                                                                                    {dataSource === 'masterlist' ? (
                                                                                        <button
                                                                                            onClick={() => handleCertify(false)}
                                                                                            disabled={!dpaConsent || !truthConsent || certifying}
                                                                                            className="flex-1 py-5 bg-brand-800 text-white font-black text-[15px] uppercase tracking-widest rounded-full shadow-2xl shadow-blue-900/30 hover:bg-brand-800 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                                                                        >
                                                                                            {certifying ? <FiLoader className="animate-spin" size={18} /> : <FiCheckCircle size={18} />}
                                                                                            {certifying ? 'Certifying...' : 'Certify — Profile is Up-to-Date'}
                                                                                        </button>
                                                                                    ) : (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={() => handleCertify(false)}
                                                                                                disabled={!dpaConsent || !truthConsent || certifying || applicationStatus === 'applied'}
                                                                                                className="flex-1 py-5 bg-slate-800 text-white font-black text-[15px] uppercase tracking-widest rounded-full hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                                                                            >
                                                                                                {certifying ? <FiLoader className="animate-spin" size={18} /> : <FiSave size={18} />}
                                                                                                Save Consent Only
                                                                                            </button>
                                                                                            {completeness === 100 && (applicationStatus === null || applicationStatus === 'disapproved') && (
                                                                                                <button
                                                                                                    onClick={handleSubmitApplication}
                                                                                                    disabled={!dpaConsent || !truthConsent || saving}
                                                                                                    className="flex-1 py-5 bg-brand-800 text-white font-black text-[15px] uppercase tracking-widest rounded-full shadow-2xl shadow-blue-900/30 hover:bg-brand-800 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 border-2 border-white/20"
                                                                                                >
                                                                                                    {saving ? <FiLoader className="animate-spin" size={18} /> : <FiArrowRight size={18} />}
                                                                                                    {saving ? 'Processing...' : 'Submit Final Application'}
                                                                                                </button>
                                                                                            )}
                                                                                            {applicationStatus === 'applied' && (
                                                                                                <div className="flex-1 flex items-center justify-center gap-3 py-5 bg-amber-50 border-2 border-amber-200 rounded-full text-amber-600 text-[15px] font-black uppercase tracking-widest">
                                                                                                    <FiClock size={16} /> Applied (Pending Review)
                                                                                                </div>
                                                                                            )}
                                                                                            {applicationStatus === 'disapproved' && (
                                                                                                <div className="flex-1 flex items-center justify-center gap-3 py-5 bg-rose-50 border-2 border-rose-200 rounded-full text-rose-600 text-[15px] font-black uppercase tracking-widest">
                                                                                                    <FiXCircle size={16} /> Disapproved
                                                                                                </div>
                                                                                            )}
                                                                                            {applicationStatus === 'approved' && (
                                                                                                <div className="flex-1 flex items-center justify-center gap-3 py-5 bg-emerald-50 border-2 border-emerald-200 rounded-full text-emerald-600 text-[15px] font-black uppercase tracking-widest">
                                                                                                    <FiCheckCircle size={16} /> Approved
                                                                                                </div>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                                {(!dpaConsent || !truthConsent) && (
                                                                                    <p className="text-[13.5px] font-bold text-slate-400 text-center mt-2 w-full">Please check both declarations above to proceed.</p>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center justify-center gap-4 py-6 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                                                                                <FiCheckCircle size={28} className="text-emerald-500" />
                                                                                <div>
                                                                                    <p className="font-black text-emerald-700 text-[21px] uppercase tracking-wider">Certified Successfully</p>
                                                                                    <p className="text-[15px] font-bold text-emerald-500 mt-0.5">Your consent and certification have been recorded.</p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
    </>
  );
};

export default SummaryTab;
