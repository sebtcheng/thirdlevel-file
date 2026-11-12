import React from 'react';
import { FileText as FiFileText, CloudArrowUp as FiUploadCloud, Check as FiCheck, Trash as FiTrash2, ArrowSquareOut as FiExternalLink, Info as FiInfo, SpinnerGap as FiLoader } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import { REQUIRED_DOCUMENTS } from './constants';
import { apiUrl } from '../../utils/api';
import { deleteLocalDocument, getLocalDocument, openLocalDocument, isLocalBinaryId } from '../../utils/localDocumentStore';
import { useAuth } from '../../context/AuthContext';

// Stored files have a UUID binary id; the viewer link is only shown for those.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TwelveDocumentsSection = ({
    documents,
    setDocuments,
    uploadingDoc,
    setUploadingDoc,
    readOnly = false,
    applicationId = null
}) => {
    const { token } = useAuth();
    const [restoringDoc, setRestoringDoc] = React.useState({});
    const [restoringAll, setRestoringAll] = React.useState(false);
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
            const body = new FormData();
            body.append('file', file);
            const response = await fetch(apiUrl('/api/pooling/documents'), {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Could not upload the document.');
            const fileData = {
                key: docConfig.key,
                doc_type: docConfig.key,
                label: docConfig.label,
                file_name: file.name,
                mime_type: file.type || (docConfig.isImage ? 'image/jpeg' : 'application/pdf'),
                size_bytes: result.data.size_bytes,
                binary_id: result.data.binary_id,
                uploaded_at: result.data.uploaded_at
            };

            setDocuments(prev => ({
                ...prev,
                [docConfig.key]: fileData
            }));

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `${file.name} uploaded.`,
                showConfirmButton: false,
                timer: 2000
            });
        } catch (err) {
            console.error('[Document Upload Error]:', err);
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: err.message || 'Could not attach the document. Please try again.',
                confirmButtonColor: 'var(--color-brand-800)'
            });
        } finally {
            setUploadingDoc(prev => ({ ...prev, [docConfig.key]: false }));
        }
    };

    const handleViewLocal = async (binaryId) => {
        const opened = await openLocalDocument(binaryId);
        if (!opened) {
            Swal.fire({
                icon: 'info',
                title: 'File Not Available',
                text: 'This document is not stored on this device or browser, so it cannot be opened here.',
                confirmButtonColor: 'var(--color-brand-800)'
            });
        }
    };

    const handleRemove = (docKey) => {
        const removedId = documents[docKey]?.binary_id;
        if (isLocalBinaryId(removedId)) deleteLocalDocument(removedId).catch(() => {});
        setDocuments(prev => ({
            ...prev,
            [docKey]: null
        }));
    };

    const uploadLegacyDocument = async (docConfig, attached) => {
        const file = await getLocalDocument(attached.binary_id).catch(() => null);
        if (!file) return { ok: false, reason: 'missing' };
        const body = new FormData();
        body.append('file', file, attached.file_name || file.name);
        const response = await fetch(apiUrl(`/api/pooling/history/${applicationId}/documents/${encodeURIComponent(docConfig.key)}`), {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not restore the document.');
        setDocuments(prev => ({ ...prev, [docConfig.key]: { ...prev[docConfig.key], ...result.data } }));
        return { ok: true };
    };

    const handleRestoreToServer = async (docConfig, attached) => {
        if (!applicationId) return;
        setRestoringDoc(prev => ({ ...prev, [docConfig.key]: true }));
        try {
            const outcome = await uploadLegacyDocument(docConfig, attached);
            if (!outcome.ok) {
                Swal.fire({
                    icon: 'info',
                    title: 'File Not On This Device',
                    text: 'This document was kept in the browser where it was uploaded. Open this application there to restore it for administrators.',
                    confirmButtonColor: 'var(--color-brand-800)'
                });
                return;
            }
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Document restored for administrators.',
                showConfirmButton: false,
                timer: 2500
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Restore Failed',
                text: err.message || 'Could not restore the document. Please try again.',
                confirmButtonColor: 'var(--color-brand-800)'
            });
        } finally {
            setRestoringDoc(prev => ({ ...prev, [docConfig.key]: false }));
        }
    };

    const handleRestoreAll = async () => {
        if (!applicationId || restoringAll) return;
        const pending = REQUIRED_DOCUMENTS
            .map(config => ({ config, attached: documents[config.key] }))
            .filter(({ attached }) => attached && isLocalBinaryId(attached.binary_id));
        setRestoringAll(true);
        setRestoringDoc(Object.fromEntries(pending.map(({ config }) => [config.key, true])));
        let restored = 0;
        let missing = 0;
        const failed = [];
        try {
            for (const { config, attached } of pending) {
                try {
                    const outcome = await uploadLegacyDocument(config, attached);
                    if (outcome.ok) restored += 1;
                    else missing += 1;
                } catch (err) {
                    failed.push(`${config.label}: ${err.message}`);
                }
            }
        } finally {
            setRestoringAll(false);
            setRestoringDoc({});
        }
        const lines = [`${restored} restored`, `${missing} not on this device`];
        if (failed.length) lines.push(`${failed.length} failed`);
        Swal.fire({
            icon: failed.length ? 'warning' : restored > 0 ? 'success' : 'info',
            title: restored > 0 ? 'Documents Restored' : 'No Document Restored',
            html: `<p>${lines.join(' • ')}</p>${missing ? '<p style="margin-top:8px">Files kept on another device cannot be restored here. Open this application in the browser used to submit it.</p>' : ''}${failed.length ? `<p style="margin-top:8px">${failed.map(line => line.replace(/[<>&]/g, '')).join('<br>')}</p>` : ''}`,
            confirmButtonColor: 'var(--color-brand-800)'
        });
    };

    const legacyCount = Object.values(documents).filter(d => d && isLocalBinaryId(d.binary_id)).length;

    // Legacy submissions kept their files in this browser. Upload them automatically the first time
    // the applicant opens the submission, so administrators can preview the documents.
    const autoRestoreRef = React.useRef('');
    const documentsRef = React.useRef(documents);
    documentsRef.current = documents;
    React.useEffect(() => {
        if (!readOnly || !applicationId || autoRestoreRef.current === String(applicationId)) return;
        const pending = REQUIRED_DOCUMENTS
            .map(config => ({ config, attached: documentsRef.current[config.key] }))
            .filter(({ attached }) => attached && isLocalBinaryId(attached.binary_id));
        if (pending.length === 0) return;
        autoRestoreRef.current = String(applicationId);
        (async () => {
            setRestoringAll(true);
            let restored = 0;
            for (const { config, attached } of pending) {
                try {
                    const outcome = await uploadLegacyDocument(config, attached);
                    if (outcome.ok) restored += 1;
                } catch {
                    // Leave the document as browser-only; the manual button can retry.
                }
            }
            setRestoringAll(false);
            if (restored > 0) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `${restored} document(s) uploaded for administrators.`,
                    showConfirmButton: false,
                    timer: 3500
                });
            }
        })();
    }, [readOnly, applicationId, legacyCount]);

    return (
        <div className="bg-white border-2 border-slate-200 rounded-card p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <FiFileText size={20} className="text-brand-800" />
                    <h3 className="text-base font-black text-brand-800 uppercase tracking-wide">
                        5. Twelve (12) Required Document Attachments
                    </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                    Upload official documentary credentials in accordance with DepEd executive selection guidelines.
                </p>
            </div>

            {readOnly && applicationId && legacyCount > 0 && (
                <div role="status" className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center gap-3">
                    <FiInfo size={18} className="text-amber-700 mt-0.5 shrink-0" />
                    <div className="flex-1 text-xs text-amber-900 space-y-1">
                        <p className="font-bold">{legacyCount} document(s) are stored only in this browser.</p>
                        <p className="leading-relaxed">
                            Restore them to make them viewable by administrators. This only works in the browser where the files were uploaded.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRestoreAll}
                        disabled={restoringAll}
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {restoringAll ? <FiLoader size={14} className="animate-spin" /> : <FiUploadCloud size={14} />}
                        <span>{restoringAll ? 'Restoring...' : 'Restore all'}</span>
                    </button>
                </div>
            )}

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
                                        {isLocalBinaryId(attached.binary_id) && (
                                            <button
                                                type="button"
                                                onClick={() => handleViewLocal(attached.binary_id)}
                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                                                title="View document (stored in this browser)"
                                            >
                                                <FiExternalLink size={13} />
                                            </button>
                                        )}
                                        {readOnly && applicationId && isLocalBinaryId(attached.binary_id) && (
                                            <button
                                                type="button"
                                                onClick={() => handleRestoreToServer(doc, attached)}
                                                disabled={Boolean(restoringDoc[doc.key])}
                                                className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Restore to server so administrators can preview it"
                                            >
                                                {restoringDoc[doc.key] ? <FiLoader size={13} className="animate-spin" /> : <FiUploadCloud size={13} />}
                                            </button>
                                        )}
                                        {attached.binary_id && !isLocalBinaryId(attached.binary_id) && (!readOnly || UUID_RE.test(attached.binary_id)) && (
                                            <a
                                                href={apiUrl(`/api/binary/${attached.binary_id}`)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                                                title={readOnly ? 'View / download document' : 'View Document'}
                                            >
                                                <FiExternalLink size={13} />
                                            </a>
                                        )}
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(doc.key)}
                                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs transition-all"
                                                title="Remove document"
                                            >
                                                <FiTrash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : readOnly ? (
                                <div className="mt-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
                                    No document submitted
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

