import React from 'react';
import { FileText as FiFileText, CloudArrowUp as FiUploadCloud, Check as FiCheck, Trash as FiTrash2, ArrowSquareOut as FiExternalLink, Info as FiInfo, SpinnerGap as FiLoader } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import { REQUIRED_DOCUMENTS } from './constants';
import { apiUrl } from '../../utils/api';

const TwelveDocumentsSection = ({
    documents,
    setDocuments,
    uploadingDoc,
    setUploadingDoc
}) => {
    const handleFileChange = async (docConfig, file) => {
        if (!file) return;

        // Size check: max 10MB
        if (file.size > 10 * 1024 * 1024) {
            Swal.fire({
                icon: 'warning',
                title: 'File Too Large',
                text: `${docConfig.label} exceeds the maximum allowed size of 10 MB.`,
                confirmButtonColor: 'var(--color-brand-800)'
            });
            return;
        }

        // Type check
        if (docConfig.isImage) {
            const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
            if (!isImg) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Invalid File Type',
                    text: `${docConfig.label} must be an image file (JPG, PNG, or WebP).`,
                    confirmButtonColor: 'var(--color-brand-800)'
                });
                return;
            }
        } else {
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (!isPdf) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Invalid File Type',
                    text: `${docConfig.label} must be a PDF file (.pdf only).`,
                    confirmButtonColor: 'var(--color-brand-800)'
                });
                return;
            }
        }

        setUploadingDoc(prev => ({ ...prev, [docConfig.key]: true }));

        try {
            // Read file metadata & create attachment descriptor
            const binaryId = 'bin-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
            const fileData = {
                key: docConfig.key,
                doc_type: docConfig.key,
                label: docConfig.label,
                file_name: file.name,
                mime_type: file.type || (docConfig.isImage ? 'image/jpeg' : 'application/pdf'),
                size_bytes: file.size,
                binary_id: binaryId,
                uploaded_at: new Date().toISOString()
            };

            setDocuments(prev => ({
                ...prev,
                [docConfig.key]: fileData
            }));

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `${file.name} attached.`,
                showConfirmButton: false,
                timer: 2000
            });
        } catch (err) {
            console.error('[Document Upload Error]:', err);
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: 'Could not attach the document. Please try again.',
                confirmButtonColor: 'var(--color-brand-800)'
            });
        } finally {
            setUploadingDoc(prev => ({ ...prev, [docConfig.key]: false }));
        }
    };

    const handleRemove = (docKey) => {
        setDocuments(prev => ({
            ...prev,
            [docKey]: null
        }));
    };

    return (
        <div className="bg-white border-2 border-slate-200 rounded-card p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <FiFileText className="text-brand-800" size={20} />
                    <h3 className="text-base font-black text-brand-800 uppercase tracking-wide">
                        5. Twelve (12) Required Document Attachments
                    </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                    Upload official documentary credentials in accordance with DepEd executive selection guidelines.
                </p>
            </div>

            {/* Instruction & Template Link Box */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <FiInfo size={18} className="text-blue-700 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-900 space-y-0.5">
                        <p className="font-bold">DepEd Documentary Submission Rules</p>
                        <p className="text-blue-800 leading-relaxed">
                            ID Picture (item 10) must be an image file (JPG/PNG/WebP); all other documents must be in PDF format (maximum 10 MB per file).
                        </p>
                    </div>
                </div>
                <a
                    href="https://tinyurl.com/3rdLevelForms"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-800 text-gold hover:bg-blue-900 text-xs font-black uppercase tracking-wider shrink-0 shadow-sm transition-all active:scale-95"
                >
                    <span>Download Templates</span>
                    <FiExternalLink size={13} />
                </a>
            </div>

            {/* 12 Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_DOCUMENTS.map((doc) => {
                    const attached = documents[doc.key];
                    const isUploading = Boolean(uploadingDoc[doc.key]);

                    return (
                        <div
                            key={doc.key}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                                attached
                                    ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                                    : doc.required
                                    ? 'bg-white border-slate-200 hover:border-slate-300'
                                    : 'bg-slate-50/50 border-slate-200/80'
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                                                {doc.label}
                                            </span>
                                            {doc.required ? (
                                                <span className="text-rose-500 font-bold text-xs">*</span>
                                            ) : (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-black uppercase tracking-wider">
                                                    Optional
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-medium leading-snug mt-1">
                                            {doc.instruction}
                                        </p>
                                    </div>

                                    {attached && (
                                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <FiCheck size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* File Status or Upload Drop Area */}
                            {attached ? (
                                <div className="mt-3 p-2.5 rounded-card bg-white border border-emerald-200 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FiFileText size={16} className="text-emerald-600 shrink-0" />
                                        <span className="text-xs font-mono font-bold text-slate-800 truncate" title={attached.file_name}>
                                            {attached.file_name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {attached.binary_id && (
                                            <a
                                                href={apiUrl(`/api/binary/${attached.binary_id}`)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                                                title="View Document"
                                            >
                                                <FiExternalLink size={13} />
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(doc.key)}
                                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs transition-all"
                                            title="Remove document"
                                        >
                                            <FiTrash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-3">
                                    <label className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                                        isUploading
                                            ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                                            : 'bg-white hover:bg-blue-50/50 border-slate-300 hover:border-brand-800 text-slate-600 hover:text-brand-800'
                                    }`}>
                                        {isUploading ? (
                                            <>
                                                <FiLoader className="animate-spin text-brand-800" size={14} />
                                                <span>Attaching...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FiUploadCloud size={15} />
                                                <span>Attach {doc.isImage ? 'Image' : 'PDF'}</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept={doc.accept}
                                            disabled={isUploading}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handleFileChange(doc, e.target.files[0]);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TwelveDocumentsSection;

