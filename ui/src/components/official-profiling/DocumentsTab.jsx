import { FileText as FiFileText, CheckCircle as FiCheckCircle, Info as FiInfo, UploadSimple as FiUpload, DownloadSimple as FiDownload, Eye as FiEye } from '@phosphor-icons/react';

const DocumentsTab = ({ certified, handleDownloadDocument, handleFileUpload, handleViewDocument, isEditing, profile, tab, uploadedFileNames, uploadingDocs }) => {
  return (
    <>
                                                {tab === 'documents' && (
                                                    <div className="space-y-6">
                                                        <div className="flex items-start gap-4 p-6 bg-brand-50 rounded-lg border-2 border-blue-100">
                                                            <FiInfo className="text-brand-800 mt-1 shrink-0" size={18} />
                                                            <p className="text-[16.5px] font-bold text-brand-800 leading-relaxed">
                                                                Document uploads are processed by the Personnel Division. Files will be stored securely in the system once upload integration is completed. The reference IDs below track which documents have been linked to your profile.
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                            {[
                                                                { id: 'pds', label: 'Personal Data Sheet (PDS)', note: 'PDF/Word - properly signed & notarized', accept: '.pdf,.doc,.docx' },
                                                                { id: 'service_records', label: 'Service Records', note: 'PDF - certified true copy', accept: '.pdf' },
                                                            ].map(({ id, label, note, accept }) => (
                                                                <div key={id} className="flex flex-col gap-3 p-6 bg-slate-50/40 hover:bg-transparent border-2 border-slate-200/60 rounded-3xl transition-all duration-300 shadow-sm hover:shadow-md">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-transparent rounded-xl flex items-center justify-center text-brand-800"><FiFileText size={18} /></div>
                                                                        <div className="flex-1">
                                                                            <p className="text-[16.5px] font-black text-brand-800 leading-tight">{label}</p>
                                                                            <p className="text-[13.5px] font-bold text-slate-400 italic mt-0.5">{note}</p>
                                                                        </div>
                                                                        {profile[`${id}_binary_id`] && (
                                                                            <div className="text-emerald-500 flex items-center gap-1 text-[13.5px] font-black uppercase">
                                                                                <FiCheckCircle /> Linked
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-2 h-11">
                                                                        <div className="relative group/upload flex-1 h-full">
                                                                            <input disabled={!isEditing}
                                                                                type="file"
                                                                                accept={accept}
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files[0];
                                                                                    if (file) handleFileUpload(file, id);
                                                                                }}
                                                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                            />
                                                                            <div className={`h-full flex items-center justify-center gap-2.5 border-2 border-dashed rounded-xl px-4 py-2.5 text-[18px] font-semibold transition-all shadow-sm group-hover/upload:shadow-md ${profile[`${id}_binary_id`] ? 'bg-emerald-50/50 border-emerald-300 text-emerald-700 shadow-inner' : 'bg-white border-slate-300 text-slate-500 group-hover/upload:border-brand-700 group-hover/upload:text-brand-800'}`}>
                                                                                <FiUpload size={14} className={uploadingDocs[id] ? 'animate-bounce' : ''} />
                                                                                <span className="text-[15px] font-black uppercase tracking-widest truncate max-w-[200px]">
                                                                                    {uploadingDocs[id] ? 'Processing...' : profile[`${id}_binary_id`] ? (uploadedFileNames[id] ? `Saved ✓ — ${uploadedFileNames[id]}` : 'Document on file ✓') : 'Upload Document'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {profile[`${id}_binary_id`] && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleViewDocument(profile[`${id}_binary_id`])}
                                                                                    className="h-full flex items-center justify-center gap-2 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-[18px] font-semibold transition-all shadow-sm hover:shadow-md bg-white hover:border-brand-800 text-brand-800 group/view shrink-0"
                                                                                    title="View Document"
                                                                                >
                                                                                    <FiEye size={14} className="group-hover/view:scale-110 transition-transform" />
                                                                                    <span className="text-[15px] font-black uppercase tracking-widest hidden sm:inline">View</span>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDownloadDocument(profile[`${id}_binary_id`], label)}
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
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
    </>
  );
};

export default DocumentsTab;
