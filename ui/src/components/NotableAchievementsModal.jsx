import React, { useState, useRef } from 'react';
import ConfirmDestructiveDialog from './forms/ConfirmDestructiveDialog.jsx';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';
import { X as FiX, CloudArrowUp as FiUploadCloud, File as FiFile, CheckCircle as FiCheckCircle, WarningCircle as FiAlertCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { uploadNotableAchievements } from '../utils/directoryApi';

const NotableAchievementsModal = ({ isOpen, onClose, onSuccess }) => {
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [records, setRecords] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

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
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
        const missingHeaders = ['index_number', 'achievements'].filter(h => !headers.includes(h) && h !== 'achievements' && !headers.includes('achievement'));

        if (missingHeaders.length > 0) {
          throw new Error(`Missing required columns. Ensure index_number and achievements columns exist.`);
        }

        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedRecords = json.map((row, index) => {
          const index_number = parseInt(row['index_number'], 10);
          const achievement = String(row['achievements'] || row['achievement'] || '').trim();

          let isValid = true;
          let validationError = '';

          if (isNaN(index_number)) {
            isValid = false;
            validationError = 'Invalid index_number';
          } else if (!achievement) {
            isValid = false;
            validationError = 'Missing achievement';
          }

          return {
            rowNum: index + 2,
            index_number,
            achievement,
            isValid,
            validationError
          };
        });

        setRecords(parsedRecords);
      } catch (err) {
        Swal.fire('Parsing Error', err.message || 'Failed to read the file. Please check the format.', 'error');
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
      const results = await uploadNotableAchievements(validRecords, token);
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
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

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
            className="bg-white rounded-card shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border-2 border-blue-100"
            initial={{ opacity: 0, rotateY: -90, scale: 0.95 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, rotateX: -20, rotateY: 20 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.35 }}
            style={{ transformPerspective: 1200, transformOrigin: "center" }}
          >
            <div className="flex items-center justify-between p-6 border-b-2 border-blue-50 bg-brand-50">
              <div>
                <h2 className="modal-title text-[36px] text-brand-800 m-0 leading-tight">Notable Achievements</h2>
                <p className="text-[21px] font-bold text-slate-500 m-0 uppercase tracking-wider mt-1">Bulk Upload & Process</p>
              </div>
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <FiX size={26} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <h3 className="mt-4 text-[30px] font-black text-blue-900">Processing Records...</h3>
                  <p className="text-[21px] font-bold text-slate-500">Please wait while we update the database.</p>
                </div>
              )}

              {!file && !summary && (
                <div className="flex flex-col gap-6">
                  <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl">
                    <h4 className="font-bold text-blue-900 text-[21px]">Template Requirement</h4>
                    <p className="text-[21px] text-blue-700">Ensure your file has exactly these headers: <b>index_number</b> and <b>achievements</b></p>
                  </div>

                  <div
                    className="border-2 border-dashed border-blue-200 rounded-card p-12 flex flex-col items-center justify-center bg-white hover:bg-blue-50/50 hover:border-blue-400 transition-all cursor-pointer group"
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
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                      <FiUploadCloud size={44} />
                    </div>
                    <h3 className="text-[30px] font-black text-slate-800 mb-2">Click or drag file to upload</h3>
                    <p className="text-slate-500 font-medium text-center max-w-md text-[21px]">
                      Upload an Excel (.xlsx, .xls) or CSV file.
                    </p>
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
                    <button onClick={() => setConfirmRemove(true)} className="text-[21px] font-bold text-red-500 hover:text-red-700 px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                      Remove File
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

                  {records.length > 0 && (
                    <div className="bg-white rounded-card border-2 border-blue-100 shadow-sm overflow-hidden flex flex-col max-h-[300px]">
                      <div className="px-6 py-4 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-black text-brand-800 text-[21px]">Data Preview</h3>
                        <div className="text-[18px] font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase tracking-wider">
                          {records.filter(r => !r.isValid).length} Invalid Rows
                        </div>
                      </div>
                      <div className="overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                            <tr className="text-[15px] uppercase tracking-widest text-slate-500 font-black border-b-2 border-slate-200 whitespace-nowrap">
                              <th className="px-4 py-4">Status</th>
                              <th className="px-4 py-4">Hash Number</th>
                              <th className="px-4 py-4">Achievement</th>
                            </tr>
                          </thead>
                          <tbody className="text-[18px] font-medium">
                            {records.map((rec, idx) => (
                              <tr key={idx} className={`border-b-2 border-slate-50 hover:bg-slate-50 transition-colors ${!rec.isValid ? 'bg-red-50/50' : ''}`}>
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
                                <td className="px-4 py-3 font-bold text-slate-800">{rec.index_number}</td>
                                <td className="px-4 py-3 text-slate-600">{rec.achievement}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {summary && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-card border-2 border-blue-100 text-center">
                      <p className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                      <p className="text-[45px] font-black text-brand-800">{summary.summary.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-card border-2 border-green-200 text-center bg-green-50/30">
                      <p className="text-[15px] font-black text-green-600 uppercase tracking-widest mb-1">Inserted</p>
                      <p className="text-[45px] font-black text-green-700">{summary.summary.inserted}</p>
                    </div>
                    <div className="bg-white p-4 rounded-card border-2 border-amber-200 text-center bg-amber-50/30">
                      <p className="text-[15px] font-black text-amber-600 uppercase tracking-widest mb-1">Updated</p>
                      <p className="text-[45px] font-black text-amber-700">{summary.summary.updated}</p>
                    </div>
                    <div className="bg-white p-4 rounded-card border-2 border-red-200 text-center bg-red-50/30">
                      <p className="text-[15px] font-black text-red-500 uppercase tracking-widest mb-1">Failed</p>
                      <p className="text-[45px] font-black text-red-700">{summary.summary.failed}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-card border-2 border-blue-100 flex justify-center text-center">
                    <h3 className="font-black text-green-700 text-[27px]">Processing Complete!</h3>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t-2 border-blue-50 bg-white flex justify-end gap-3">
              {!summary ? (
                <>
                  <button
                    onClick={handleClose}
                    disabled={isProcessing}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 text-[18px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProceed}
                    disabled={!file || records.filter(r => r.isValid).length === 0 || isProcessing}
                    className="px-8 py-3 rounded-xl font-black text-white bg-brand-700 hover:bg-brand-700 transition-all shadow-lg shadow-brand-700/30 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 text-[18px]"
                  >
                    {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    Proceed
                  </button>
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

export default NotableAchievementsModal;
