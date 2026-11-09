import React, { useState, useRef } from 'react';
import ConfirmDestructiveDialog from './forms/ConfirmDestructiveDialog.jsx';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';
import { X as FiX, CloudArrowUp as FiUploadCloud, File as FiFile, CheckCircle as FiCheckCircle, WarningCircle as FiAlertCircle, CaretLeft as FiChevronLeft, CaretRight as FiChevronRight, DownloadSimple as FiDownload, Plus as FiPlus, Users as FiUsers, FileText as FiFileText } from '@phosphor-icons/react';
import { apiUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { parseDirectoryFile } from '../utils/directoryParser';
import { uploadDirectoryBulk } from '../utils/directoryApi';

const UploadDirectoryModal = ({ isOpen, onClose, onSuccess }) => {
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [records, setRecords] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);


  // Pagination for preview
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const totalPages = Math.ceil(records.length / recordsPerPage);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = (file) => {
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/)) {
      Swal.fire('Invalid File', 'Please upload a valid Excel (.xlsx, .xls) or CSV file.', 'error');
      return;
    }

    setFile(file);
    setIsParsing(true);
    setSummary(null);
    setRecords([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsedRecords = await parseDirectoryFile(e.target.result);
        setRecords(parsedRecords);
        setCurrentPage(1);
      } catch (err) {
        Swal.fire(err.message.includes('Missing') ? 'Invalid Template' : 'Parsing Error', err.message || 'Failed to read the file. Please check the format.', 'error');
        setFile(null);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProceed = async () => {
    const validRecords = records.filter(r => r.isValid);
    if (validRecords.length === 0) {
      Swal.fire('No Valid Records', 'There are no valid records to process.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const results = await uploadDirectoryBulk(validRecords, token);
      setSummary(results);
      if (onSuccess) onSuccess();
    } catch (err) {
      Swal.fire('Processing Error', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setRecords([]);
    setSummary(null);
    setCurrentPage(1);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };


  const handleDownloadData = async () => {
    try {
      Swal.fire({ title: 'Preparing Download', text: 'Fetching existing directory...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await fetch(apiUrl('/api/third-level/officials-registry/officials?status=All'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error('Failed to fetch data');

      const wsData = data.data.map(r => ({
        'TLO_id': r.TLOid || '',
        'Strand': r.strand || '',
        'Region': r.region || '',
        'Office': r.office || '',
        'Division': r.division || '',
        'Name': `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        'Position': r.position_title || '',
        'Designation': r.designation || '',
        'Email': r.email || '',
        'Alternative Email 1': r.alt_email_1 || '',
        'Alternative Email 2': r.alt_email_2 || '',
        'Contact Details': r.contact_details || '',
        'Alternative Contact Details 1': r.alt_contact_1 || '',
        'Alternative Contact Details 2': r.alt_contact_2 || ''
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Directory");
      XLSX.writeFile(wb, "directory_export.csv");
      Swal.close();
    } catch (err) {
      Swal.fire('Error', 'Failed to download existing data.', 'error');
    }
  };

  // Remove the early return so AnimatePresence stays mounted
  // if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-800/60 backdrop-blur-sm p-4 font-['Plus_Jakarta_Sans',system-ui,sans-serif]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-card shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border-2 border-blue-100"
            initial={{ opacity: 0, rotateY: -90, scale: 0.95 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, rotateX: -20, rotateY: 20 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.35 }}
            style={{ transformPerspective: 1200, transformOrigin: "center" }}
          >
            <div className="flex items-start justify-between p-6 border-b-2 border-blue-50 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0 border-2 border-blue-100">
                  <FiUsers size={30} />
                </div>
                <div>
                  <h2 className="text-[36px] font-black text-brand-800 m-0 leading-tight">Add Officials Directory</h2>
                  <p className="text-[18px] font-bold text-slate-400 m-0 uppercase tracking-widest mt-1">BULK UPLOAD & PROCESS</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                <FiX size={26} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white relative">
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <h3 className="mt-4 text-[30px] font-black text-blue-900">Processing Records...</h3>
                  <p className="text-[21px] font-bold text-slate-500">Please wait while we update the database.</p>
                </div>
              )}

              {!file && !summary && (
                <div className="flex flex-col gap-6">
                  <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-600 shrink-0 border-2 border-cyan-100">
                        <FiFileText size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-brand-800 text-[24px]">Download Existing Data</h4>
                        <p className="text-[18px] text-slate-500 font-medium mt-0.5 max-w-lg leading-relaxed">
                          Ensure your file has these headers: TLO_id, Strand, Region, Office, Division, Name, Position, Designation, Email, Alternative Email 1/2, Contact Details 1/2.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 shrink-0">

                      <button onClick={handleDownloadData} className="text-[18px] font-bold text-brand-800 bg-white px-5 py-2.5 rounded-xl border-2 border-slate-200 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors">
                        <FiDownload /> Download Data
                      </button>
                    </div>
                  </div>

                  <div
                    className="border-2 border-dashed border-blue-200 rounded-card p-12 flex flex-col items-center justify-center bg-white hover:bg-blue-50/30 hover:border-blue-300 transition-all cursor-pointer group relative mt-4 mx-4 shadow-[0_0_40px_rgb(var(--rgb-brand-50)/1)]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      className="hidden"
                    />

                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-blue-50/80 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform duration-300">
                        <FiUploadCloud size={44} strokeWidth={2.5} />
                      </div>
                      <div className="absolute top-0 right-0 text-blue-300 animate-pulse">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" /></svg>
                      </div>
                      <div className="absolute bottom-2 left-0 text-blue-300 animate-pulse">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" /></svg>
                      </div>
                    </div>

                    <h3 className="text-[36px] font-black text-brand-800 mb-2">Drag and drop your file here</h3>
                    <p className="text-slate-500 font-medium mb-8 text-[21px]">or click to browse</p>

                    <div className="w-full max-w-sm flex items-center justify-center mb-6">
                      <div className="h-0.5 bg-slate-200 flex-1"></div>
                      <span className="px-4 text-[16.5px] font-bold text-slate-400 uppercase tracking-widest">Supported file types</span>
                      <div className="h-0.5 bg-slate-200 flex-1"></div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-xl border-2 border-green-100">
                        <div className="bg-green-500 text-white rounded-lg p-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </div>
                        <span className="text-[18px] font-bold text-green-700">Excel <span className="text-green-600/70 font-semibold">(.xlsx, .xls)</span></span>
                      </div>

                      <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl border-2 border-purple-100">
                        <div className="bg-purple-500 text-white rounded-lg p-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                        </div>
                        <span className="text-[18px] font-bold text-purple-700">CSV <span className="text-purple-600/70 font-semibold">(.csv)</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {file && !summary && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-white p-4 rounded-card border-2 border-blue-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <FiFile size={26} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-[21px]">{file.name}</h4>
                        <p className="text-[18px] font-bold text-slate-500 uppercase tracking-wider">
                          {isParsing ? 'Parsing...' : `${records.length} records found`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmRemove(true)} className="text-[21px] font-bold text-red-500 hover:text-red-700 px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                        Remove File/Clear
                      </button>
                    <ConfirmDestructiveDialog
                      open={confirmRemove}
                      title={`Remove ${file.name}?`}
                      body={`This clears the uploaded file and its ${records.length} parsed records. You will need to upload again.`}
                      confirmLabel="Remove file"
                      onConfirm={() => { setConfirmRemove(false); resetModal(); }}
                      onCancel={() => setConfirmRemove(false)}
                    />
                    </div>
                  </div>

                  {records.length > 0 && (
                    <div className="bg-white rounded-card border-2 border-blue-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="px-6 py-4 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-black text-brand-800 text-[21px]">Data Preview</h3>
                        <div className="text-[18px] font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase tracking-wider">
                          {records.filter(r => !r.isValid).length} Invalid Rows
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                            <tr className="text-[15px] uppercase tracking-widest text-slate-500 font-black border-b-2 border-slate-200 whitespace-nowrap">
                              <th className="px-4 py-4">Status</th>
                              <th className="px-4 py-4">Name</th>
                              <th className="px-4 py-4">Position</th>
                              <th className="px-4 py-4">Designation</th>
                              <th className="px-4 py-4">Office & Strand</th>
                              <th className="px-4 py-4">Email</th>
                              <th className="px-4 py-4">Alt Emails</th>
                              <th className="px-4 py-4">Contact Details</th>
                            </tr>
                          </thead>
                          <tbody className="text-[18px] font-medium">
                            {records.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage).map((rec, idx) => (
                              <tr key={idx} className={`border-b-2 border-slate-100 hover:bg-slate-50 transition-colors ${!rec.isValid ? 'bg-red-50/50' : ''}`}>
                                <td className="px-4 py-3">
                                  {rec.isValid ? (
                                    <span className="text-green-500 flex items-center gap-1 font-bold">
                                      <FiCheckCircle /> Valid
                                    </span>
                                  ) : (
                                    <span className="text-red-500 flex items-center gap-1 font-bold" title={rec.validationError}>
                                      <FiAlertCircle /> {rec.validationError}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{rec.full_name}</td>
                                <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={rec.position_title}>{rec.position_title || '-'}</td>
                                <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={rec.designation}>{rec.designation || '-'}</td>
                                <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={`${rec.office} • ${rec.strand}`}>
                                  {rec.office} {rec.office && rec.strand ? '•' : ''} {rec.strand}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {rec.isNoEmail ? <span className="text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-lg">N/A</span> : rec.email}
                                </td>
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                  {[rec.alt_email_1, rec.alt_email_2].filter(Boolean).join(', ') || '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={[rec.contact_details, rec.alt_contact_1, rec.alt_contact_2].filter(Boolean).join(' • ')}>
                                  {[rec.contact_details, rec.alt_contact_1, rec.alt_contact_2].filter(Boolean).join(' • ') || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="px-6 py-4 border-t-2 border-slate-100 flex items-center justify-between bg-slate-50">
                          <span className="text-[18px] font-bold text-slate-500 uppercase tracking-widest">
                            Page {currentPage} of {totalPages}
                          </span>
                          <div className="flex gap-2">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className="p-2 rounded-card bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                              <FiChevronLeft />
                            </button>
                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className="p-2 rounded-card bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                              <FiChevronRight />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {summary && (
                <div className="space-y-6">
                  <div className={`grid gap-4 ${summary.summary.failed > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
                    <div className="bg-white p-4 rounded-card border-2 border-blue-100 text-center">
                      <p className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-1">Total (CSV)</p>
                      <p className="text-[45px] font-black text-brand-800">{summary.summary.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-card border-2 border-green-200 text-center bg-green-50/30">
                      <p className="text-[15px] font-black text-green-600 uppercase tracking-widest mb-1">Inserted</p>
                      <p className="text-[45px] font-black text-green-700">{summary.summary.new}</p>
                    </div>
                    <div className="bg-white p-4 rounded-card border-2 border-amber-200 text-center bg-amber-50/30">
                      <p className="text-[15px] font-black text-amber-600 uppercase tracking-widest mb-1">Existing in DB</p>
                      <p className="text-[45px] font-black text-amber-700">{summary.summary.updated}</p>
                    </div>
                    {summary.summary.failed > 0 && (
                      <div className="bg-white p-4 rounded-card border-2 border-red-200 text-center bg-red-50/30">
                        <p className="text-[15px] font-black text-red-500 uppercase tracking-widest mb-1">Failed</p>
                        <p className="text-[45px] font-black text-red-700">{summary.summary.failed}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-card border-2 border-blue-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b-2 border-slate-100 bg-slate-50 flex gap-4 overflow-x-auto">
                      <h3 className="font-black text-brand-800 text-[21px]">Processing Results Breakdown</h3>
                    </div>
                    <div className="p-6 space-y-6 max-h-[40vh] overflow-y-auto">
                      {summary.newInserts.length > 0 && (
                        <div>
                          <h4 className="font-black text-green-700 text-[21px] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FiCheckCircle /> A. Newly Inserted ({summary.newInserts.length})
                          </h4>
                          <ul className="space-y-2">
                            {summary.newInserts.map((r, i) => (
                              <li key={i} className="text-[18px] text-slate-700 bg-green-50 p-3 rounded-lg font-medium flex flex-col gap-1 border-2 border-green-100">
                                <span className="font-bold text-slate-900">{r.full_name} <span className="text-green-600 ml-2">[{r.email}]</span></span>
                                <span className="text-slate-500">Row {r.rowNum} • {r.position_title} • {r.designation} • {r.office} • {r.strand}</span>
                                <span className="text-green-700 font-bold mt-1">Action: Inserted New Record</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {summary.updates.length > 0 && (
                        <div>
                          <h4 className="font-black text-amber-600 text-[21px] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FiCheckCircle /> B. Existing in Database ({summary.updates.length})
                          </h4>
                          <ul className="space-y-2">
                            {summary.updates.map((r, i) => (
                              <li key={i} className="text-[18px] text-slate-700 bg-amber-50 p-3 rounded-lg font-medium flex flex-col gap-1 border-2 border-amber-100">
                                <span className="font-bold text-slate-900">{r.full_name} <span className="text-amber-600 ml-2">[{r.email}]</span></span>
                                <span className="text-slate-500">Row {r.rowNum} • {r.position_title} • {r.designation} • {r.office} • {r.strand}</span>
                                <span className="text-amber-700 font-bold mt-1">Action: Already Exists (Skipped Update)</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {summary.failed.length > 0 && (
                        <div>
                          <h4 className="font-black text-red-500 text-[21px] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FiAlertCircle /> C. Failed Records ({summary.failed.length})
                          </h4>
                          <ul className="space-y-2">
                            {summary.failed.map((r, i) => (
                              <li key={i} className="text-[18px] text-slate-700 bg-red-50 p-3 rounded-lg font-medium flex flex-col gap-1 border-2 border-red-100">
                                <span className="font-bold text-slate-900">{r.record?.full_name || 'Unknown'} <span className="text-red-600 ml-2">[{r.record?.email || 'N/A'}]</span></span>
                                <span className="text-slate-500">Row {r.record?.rowNum} • {r.record?.position_title} • {r.record?.designation} • {r.record?.office} • {r.record?.strand}</span>
                                <span className="text-red-700 font-bold mt-1">Action: Failed ({r.error})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t-2 border-slate-100 bg-white flex items-center justify-between">
              {!summary ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border-2 border-blue-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                    </div>
                    <span className="text-[18px] text-slate-500"><strong className="text-slate-700">Tip:</strong> Download the template to ensure your file is formatted correctly.</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      disabled={isProcessing}
                      className="px-6 py-2.5 rounded-xl font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 text-[18px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProceed}
                      disabled={!file || records.filter(r => r.isValid).length === 0 || isProcessing}
                      className="px-8 py-2.5 rounded-xl font-bold text-white bg-brand-700 hover:bg-brand-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2 text-[18px]"
                    >
                      {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                      Proceed
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={handleClose}
                  className="px-8 py-3 rounded-xl font-black text-white bg-brand-700 hover:bg-brand-700 transition-all shadow-lg shadow-brand-700/30 text-[18px]"
                >
                  Close Summary
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UploadDirectoryModal;
