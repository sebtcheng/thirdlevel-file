import { Warning as FiAlertTriangle, UploadSimple as FiUpload, DownloadSimple as FiDownload, Eye as FiEye } from '@phosphor-icons/react';
import { Field } from './formParts';

const LegalTab = ({ handleDownloadDocument, handleFileUpload, handleViewDocument, isEditing, profile, setP, tab, uploadedFileNames, uploadingDocs }) => {
  return (
    <>
                                                {tab === 'legal' && (
                                                    <div className="space-y-6">
                                                        <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-lg border-2 border-amber-200">
                                                            <FiAlertTriangle className="text-amber-500 mt-1 shrink-0" size={20} />
                                                            <div>
                                                                <p className="text-[16.5px] font-black text-amber-800 uppercase tracking-widest mb-1">Confidential Section</p>
                                                                <p className="text-[16.5px] font-bold text-amber-700 leading-relaxed">
                                                                    This section is optional and strictly confidential per civil service guidelines. You may opt not to disclose. Information entered here is accessible only to authorized Personnel Division personnel.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white border-2 border-brand-800 rounded-lg p-8 shadow-none space-y-6">
                                                            <Field label="Pending Administrative Case/s?">
                                                                <div className="flex gap-1.5 p-1 bg-slate-100/70 rounded-xl max-w-xs border-2 border-slate-200/40">
                                                                    {[{ val: 'Yes', label: 'Yes' }, { val: 'No', label: 'No' }].map(opt => (
                                                                        <button disabled={!isEditing}
                                                                            key={opt.val}
                                                                            onClick={() => setP('pending_admin_case', opt.val)}
                                                                            className={`w-full py-3 px-4 rounded-xl font-black text-[16.5px] uppercase tracking-widest transition-all
                                                                        ${profile.pending_admin_case?.toUpperCase() === opt.val.toUpperCase()
                                                                                    ? 'bg-brand-700 text-white shadow-lg shadow-brand-700/20'
                                                                                    : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-brand-700 hover:text-brand-700'
                                                                                }`}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </Field>
                                                            <div className="space-y-6">
                                                                <Field label="Have you ever been found guilty of any administrative offense?">
                                                                    <div className="flex gap-1.5 p-1 bg-slate-100/70 rounded-xl max-w-xs border-2 border-slate-200/40">
                                                                        {[{ val: 'Yes', label: 'Yes' }, { val: 'No', label: 'No' }].map(opt => (
                                                                            <button disabled={!isEditing}
                                                                                key={opt.val}
                                                                                onClick={() => setP('guilty_admin_details', opt.val)}
                                                                                className={`w-full py-3 px-4 rounded-xl font-black text-[16.5px] uppercase tracking-widest transition-all
                                                                            ${profile.guilty_admin_details?.toUpperCase() === opt.val.toUpperCase()
                                                                                        ? 'bg-brand-700 text-white shadow-lg shadow-brand-700/20'
                                                                                        : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-brand-700 hover:text-brand-700'
                                                                                    }`}
                                                                            >
                                                                                {opt.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </Field>
                                                                <Field label="Have you been criminally charged before any court?">
                                                                    <div className="flex gap-1.5 p-1 bg-slate-100/70 rounded-xl max-w-xs border-2 border-slate-200/40">
                                                                        {[{ val: 'Yes', label: 'Yes' }, { val: 'No', label: 'No' }].map(opt => (
                                                                            <button disabled={!isEditing}
                                                                                key={opt.val}
                                                                                onClick={() => setP('criminally_charged_details', opt.val)}
                                                                                className={`w-full py-3 px-4 rounded-xl font-black text-[16.5px] uppercase tracking-widest transition-all
                                                                            ${profile.criminally_charged_details?.toUpperCase() === opt.val.toUpperCase()
                                                                                        ? 'bg-brand-700 text-white shadow-lg shadow-brand-700/20'
                                                                                        : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-brand-700 hover:text-brand-700'
                                                                                    }`}
                                                                            >
                                                                                {opt.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </Field>
                                                                <Field label="Have you ever been convicted of any crime or violation of any law?">
                                                                    <div className="flex gap-1.5 p-1 bg-slate-100/70 rounded-xl max-w-xs border-2 border-slate-200/40">
                                                                        {[{ val: 'Yes', label: 'Yes' }, { val: 'No', label: 'No' }].map(opt => (
                                                                            <button disabled={!isEditing}
                                                                                key={opt.val}
                                                                                onClick={() => setP('convicted_crime_details', opt.val)}
                                                                                className={`w-full py-3 px-4 rounded-xl font-black text-[16.5px] uppercase tracking-widest transition-all
                                                                            ${profile.convicted_crime_details?.toUpperCase() === opt.val.toUpperCase()
                                                                                        ? 'bg-brand-700 text-white shadow-lg shadow-brand-700/20'
                                                                                        : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-brand-700 hover:text-brand-700'
                                                                                    }`}
                                                                            >
                                                                                {opt.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </Field>
                                                            </div>
                                                            <div className="pt-6 border-t-2 border-slate-100 mt-6">
                                                                <Field label="Executive Summary of Pending Case/s, Copies of Complaints, Counter-Affidavits, and Other Supporting Documents">
                                                                    <div className="flex flex-col gap-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                                                                        <div className="flex gap-2 h-11">
                                                                            <div className="relative group/upload flex-1 h-full">
                                                                                <input disabled={!isEditing}
                                                                                    type="file"
                                                                                    accept=".pdf,.doc,.docx"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files[0];
                                                                                        if (file) handleFileUpload(file, 'executive_summary');
                                                                                    }}
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                                />
                                                                                <div className={`h-full flex items-center justify-center gap-2.5 border-2 border-dashed rounded-xl px-4 py-2.5 text-[18px] font-semibold transition-all shadow-sm group-hover/upload:shadow-md ${profile.executive_summary_binary_id ? 'bg-emerald-50/50 border-emerald-300 text-emerald-700 shadow-inner' : 'bg-white border-slate-300 text-slate-500 group-hover/upload:border-brand-700 group-hover/upload:text-brand-800'}`}>
                                                                                    <FiUpload size={14} className={uploadingDocs.executive_summary ? 'animate-bounce' : ''} />
                                                                                    <span className="text-[15px] font-black uppercase tracking-widest truncate max-w-[200px]">
                                                                                        {uploadingDocs.executive_summary ? 'Processing...' : profile.executive_summary_binary_id ? (uploadedFileNames.executive_summary ? `Saved ✓ — ${uploadedFileNames.executive_summary}` : 'Document on file ✓') : 'Upload Document'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            {profile.executive_summary_binary_id && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => handleViewDocument(profile.executive_summary_binary_id)}
                                                                                        className="h-full flex items-center justify-center gap-2 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-[18px] font-semibold transition-all shadow-sm hover:shadow-md bg-white hover:border-brand-800 text-brand-800 group/view shrink-0"
                                                                                        title="View Document"
                                                                                    >
                                                                                        <FiEye size={14} className="group-hover/view:scale-110 transition-transform" />
                                                                                        <span className="text-[15px] font-black uppercase tracking-widest hidden sm:inline">View</span>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDownloadDocument(profile.executive_summary_binary_id, 'Executive Summary of Pending Case/s, Copies of Complaints, Counter-Affidavits, and Other Supporting Documents')}
                                                                                        className="h-full flex items-center justify-center gap-2 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-[18px] font-semibold transition-all shadow-sm hover:shadow-md bg-white hover:border-brand-800 text-brand-800 group/download shrink-0"
                                                                                        title="Download Document"
                                                                                    >
                                                                                        <FiDownload size={14} className="group-hover/download:-translate-y-0.5 transition-transform" />
                                                                                        <span className="text-[15px] font-black uppercase tracking-widest hidden sm:inline">Download</span>
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </Field>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
    </>
  );
};

export default LegalTab;
