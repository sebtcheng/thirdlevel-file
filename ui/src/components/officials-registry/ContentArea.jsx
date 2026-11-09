import { motion, AnimatePresence } from '../../utils/staticElements.jsx';
import { MagnifyingGlass as FiSearch, CheckCircle as FiCheckCircle, Clock as FiClock, ArrowRight as FiArrowRight, User as FiUser, Stack as FiLayers, X as FiX, Trash as FiTrash2, ArrowsClockwise as FiRefreshCw, Calendar as FiCalendar } from '@phosphor-icons/react';
import { TestTube as FaVial } from '@phosphor-icons/react';
import { apiUrl } from '../../utils/api';
import { expandAcronym } from '../../utils/officialsUtils';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const ContentArea = ({ StatusBadge, currentPage, directoryGroups, getOfficialRegion, handleOpenReassignModal, handlePositionClick, handleRegistrationAction, handleSort, handleToggleTestAccount, loading, navigate, officials, openActionModal, pageButtons, pageCount, pageSize, pagedRecords, setCurrentPage, setTableFilters, sortConfig, tableColumns, tableFilterOptions, tableFilters, totalRecords, user, viewMode }) => {
  return (
    <>
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <div className="h-96 flex items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-[var(--navy)]/10 border-t-[var(--navy)] rounded-full animate-spin"></div>
                                </div>
                            ) : officials.length === 0 ? (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6"><FiSearch size={40} /></div>
                                    <h3 className="text-xl font-[var(--font-heading)] font-semibold text-[var(--navy)] uppercase italic tracking-tight">No Records Found</h3>
                                    <p className="text-slate-400 font-medium mt-2">Adjust your filters or try a different search term.</p>
                                </motion.div>
                            ) : viewMode === 'table' ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-surface overflow-x-auto">
                                    <div className="w-full">
                                        <table className="hidden md:table w-full min-w-[1100px] text-left border-collapse table-fixed">
                                            <thead>
                                                <tr className="bg-white border-b border-muted">
                                                    {tableColumns.map((column, index) => (
                                                        <th key={column.key} className={`px-2 py-4 text-left align-top relative ${column.width || ''}`}>

                                                            <button onClick={() => handleSort(column.key)} className="mb-1.5 flex w-full items-center gap-1 text-left text-[13px] font-semibold uppercase tracking-wide text-heading">
                             <span className="truncate">{column.label}</span>
                             <span className={`flex w-3 items-center justify-end text-base leading-none transition-colors ${sortConfig.key === column.key ? "text-brand-800" : "text-secondary"}`}>
                                 {sortConfig.key === column.key ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↓"}
                             </span>
                         </button>
                         <FloatingLabelInput as="select" aria-label={`Filter ${column.label}`} className="w-full" value={tableFilters[column.key] || ""} onChange={(e) => setTableFilters(current => ({ ...current, [column.key]: e.target.value }))}>
                             <option value="">All</option>
                                                                    {(tableFilterOptions[column.key] || []).map(option => (
                                                                        <option key={option} value={option}>{option}</option>
                                                                    ))}
                         </FloatingLabelInput>
                                                        </th>
                                                    ))}

                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-muted bg-white">
                                                {pagedRecords.map((item) => (
                                                    <tr key={item.TLOid} className="group transition-colors relative hover:bg-slate-50/80">
                                                        <td className="px-3 py-4 align-middle max-w-[120px]">
                                                            <div className="font-semibold text-brand-800 text-[15px] uppercase tracking-tight truncate" title={item.status === 'Inactive' ? 'N/A' : (item.region || 'N/A')}>
                                                                <span>{item.status === 'Inactive' ? 'N/A' : (item.region || 'N/A')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-4 align-middle max-w-[200px]">
                                                            <div className="text-[15px] font-bold text-slate-700 uppercase tracking-wide truncate" title={item.status === 'Inactive' ? 'N/A' : ((item.region || getOfficialRegion(item)) === 'Central Office' ? (item.strand || item.division || 'N/A') : (item.division || 'N/A'))}>
                                                                {item.status === 'Inactive' ? 'N/A' : ((item.region || getOfficialRegion(item)) === 'Central Office' ? (item.strand || item.division || 'N/A') : (item.division || 'N/A'))}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-4 align-middle">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-400 font-semibold text-sm border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                                    {item.photo_binary_id ? (
                                                                        <img src={apiUrl(`/api/binary/${item.photo_binary_id}`)} alt="" className="w-full h-full object-cover" />
                                                                    ) : <FiUser size={18} />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            onClick={() => item.email && navigate(`/official-profiling?email=${encodeURIComponent(item.email)}`)}
                                                                            className={`person-title text-brand-800 text-[17px] leading-none transition-colors truncate ${item.email ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                                                                            title={item.email ? "View Official Profile" : ""}
                                                                        >
                                                                            {item.first_name ? `${item.first_name} ${item.last_name || ''}` : <span className="text-rose-500 italic tracking-wide text-[15px]">VACANT POSITION</span>}
                                                                        </div>
                                                                        {item.is_testaccount && (
                                                                            <span title="Test Account" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100/90 border-2 border-purple-300 text-purple-700 text-[13.5px] font-semibold uppercase tracking-wider shrink-0 shadow-sm">
                                                                                <FaVial size={12} className="text-purple-600 shrink-0" />
                                                                                <span>TEST ACCOUNT</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[13.5px] font-bold text-slate-400 uppercase tracking-wide mt-1 flex items-center gap-1.5 truncate">
                                                                        <FiArrowRight className="text-brand-700 shrink-0" size={10} />
                                                                        <span className="truncate">{item.email}</span>
                                                                        {item.status !== 'Inactive' && item.effectivity_date && (
                                                                            <>
                                                                                <span className="mx-1">•</span>
                                                                                <FiCalendar className="text-slate-300 shrink-0" size={10} />
                                                                                {(() => {
                                                                                    const effDate = new Date(item.effectivity_date);
                                                                                    if (isNaN(effDate.getTime())) return <span className="text-slate-400">Invalid</span>;

                                                                                    const today = new Date();
                                                                                    effDate.setHours(0, 0, 0, 0);
                                                                                    today.setHours(0, 0, 0, 0);

                                                                                    const diffTime = today.getTime() - effDate.getTime();
                                                                                    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                                                                                    if (item.status === 'Resigning' || item.status === 'Vacated') {
                                                                                        return <span className="text-rose-500">Vacated {days >= 0 ? `${days}d ago` : `in ${Math.abs(days)}d`}</span>;
                                                                                    }
                                                                                    return <span className={days >= 0 ? 'text-emerald-600' : 'text-blue-500'}>
                                                                                        {days >= 0 ? `${days}d in Pos` : `Starts in ${Math.abs(days)}d`}
                                                                                    </span>;
                                                                                })()}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-4 align-middle max-w-[150px]">
                                                            {(!item.first_name || item.first_name === 'VACANT' || item.status === 'Vacated' || item.profile_completion == null) ? (
                                                                <span className="text-slate-300 font-bold text-[15px]">—</span>
                                                            ) : (
                                                                <div className="flex flex-col gap-1.5 w-full pr-2">
                                                                    <span className="text-[15px] font-bold text-brand-800 leading-none">
                                                                        {Math.min(100, Math.max(0, Math.round(item.profile_completion)))}%
                                                                    </span>
                                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                                        <div
                                                                            className="h-full bg-brand-800 rounded-full transition-all duration-300"
                                                                            style={{ width: `${Math.min(100, Math.max(0, Math.round(item.profile_completion)))}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-1 py-4 align-middle max-w-[200px]">
                                                            <div
                                                                onClick={() => handlePositionClick(item)}
                                                                title={item.status === 'Inactive' ? 'N/A' : ((item.position_title || '').replace(/^(OIC\s*-\s*|OIC\s+)/i, '').replace(/\s*\(?OIC\)?\s*$/i, '').trim() || 'Unassigned')}
                                                                className="flex w-fit max-w-full items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50/80 border-2 border-amber-300 text-amber-600 text-[13.5px] font-semibold uppercase tracking-wide shadow-sm cursor-pointer hover:bg-amber-100 hover:border-amber-400 transition-colors"
                                                            >
                                                                <span className="truncate">{item.status === 'Inactive' ? 'N/A' : ((item.position_title || '').replace(/^(OIC\s*-\s*|OIC\s+)/i, '').replace(/\s*\(?OIC\)?\s*$/i, '').trim() || 'Unassigned')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-1 py-4 align-middle max-w-[120px]">
                                                            <div
                                                                onClick={() => handlePositionClick(item)}
                                                                title={item.status === 'Inactive' ? 'N/A' : ((expandAcronym(item.designation) || '').replace(/^(OIC\s*-\s*|OIC\s+)/i, '').replace(/\s*\(?OIC\)?\s*$/i, '').trim() || 'No Designation')}
                                                                className="text-[15px] font-semibold text-brand-800 uppercase tracking-wide truncate cursor-pointer hover:text-blue-600 hover:underline transition-colors w-full"
                                                            >
                                                                {item.status === 'Inactive' ? 'N/A' : ((expandAcronym(item.designation) || '').replace(/^(OIC\s*-\s*|OIC\s+)/i, '').replace(/\s*\(?OIC\)?\s*$/i, '').trim() || 'No Designation')}
                                                            </div>
                                                        </td>
                                                        <td className="px-1 py-4 align-middle text-center max-w-[60px]">
                                                            <div className="flex justify-start items-center ml-2">
                                                                {(item.is_oic || (item.designation && item.designation.toUpperCase().includes('OIC'))) ? (
                                                                    <span className="px-2 py-1 rounded-full bg-gold/20 border-2 border-gold text-brand-700 text-[13.5px] font-semibold uppercase tracking-wide shadow-sm">Yes</span>
                                                                ) : (
                                                                    <span className="px-2 py-1 rounded-full bg-slate-100 border-2 border-slate-200 text-slate-400 text-[13.5px] font-semibold uppercase tracking-wide shadow-sm">No</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-1 py-4 align-middle static md:relative">
                                                            <StatusBadge status={item.status} />

                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-sm border-2 border-slate-200 pointer-events-none group-hover:pointer-events-auto">
                                                                {item.status === 'For Approval' && user?.role === 'Central Office' && (
                                                                    <>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'approve'); }} title="Approve" className="flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide hover:bg-emerald-500 hover:text-white transition-all border-2 border-emerald-100 shadow-sm shrink-0">
                                                                            <FiCheckCircle size={14} />
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'reject'); }} title="Reject" className="flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide hover:bg-rose-500 hover:text-white transition-all border-2 border-rose-100 shadow-sm shrink-0">
                                                                            <FiX size={14} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {item.status === 'Rejected' && user?.role === 'Central Office' && (
                                                                    <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'retrieve'); }} title="Retrieve" className="flex items-center justify-center gap-1 px-2 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide hover:bg-sky-500 hover:text-white transition-all border-2 border-sky-100 shadow-sm shrink-0">
                                                                        <FiRefreshCw size={14} />
                                                                    </button>
                                                                )}
                                                                {item.status !== 'Inactive' && item.status !== 'For Approval' && item.status !== 'Rejected' && user?.role === 'Central Office' && (
                                                                    <button onClick={() => handleOpenReassignModal(item)} title="Reassign" className="flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide hover:bg-amber-500 hover:text-white transition-all border-2 border-amber-100 shadow-sm shrink-0">
                                                                        <FiLayers size={14} />
                                                                    </button>
                                                                )}
                                                                {item.first_name && item.status !== 'Reassigning' && item.status !== 'Pending Assignment' && item.status !== 'For Approval' && item.status !== 'Rejected' && user?.role === 'Central Office' && (
                                                                    <button onClick={() => openActionModal(item, 'vacate')} title="Vacate" className="flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide hover:bg-rose-500 hover:text-white transition-all border-2 border-rose-100 shadow-sm shrink-0">
                                                                        <FiTrash2 size={14} />
                                                                    </button>
                                                                )}
                                                                {user?.role === 'Central Office' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleToggleTestAccount(item); }}
                                                                        title={item.is_testaccount ? "Remove Test Account Flag" : "Mark as Test Account"}
                                                                        className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[15px] font-semibold uppercase tracking-wide transition-all border-2 shadow-sm shrink-0 ${
                                                                            item.is_testaccount
                                                                                ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                                                                                : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white'
                                                                        }`}
                                                                    >
                                                                        <FaVial size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* MOBILE CARD VIEW */}
                                        <div className="md:hidden flex flex-col divide-y-2 divide-slate-100">
                                            {pagedRecords.map((item) => (
                                                <div key={item.TLOid} className="p-4 bg-white hover:bg-slate-50/50 transition-colors flex flex-col gap-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-400 font-semibold text-sm border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                                {item.photo_binary_id ? (
                                                                    <img src={apiUrl(`/api/binary/${item.photo_binary_id}`)} alt="" className="w-full h-full object-cover" />
                                                                ) : <FiUser size={18} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div onClick={() => item.email && navigate(`/official-profiling?email=${encodeURIComponent(item.email)}`)} className="font-semibold text-brand-800 text-[17px] leading-none transition-colors truncate">
                                                                        {item.first_name ? `${item.first_name} ${item.last_name || ''}` : <span className="text-rose-500 italic tracking-wide text-[15px]">VACANT POSITION</span>}
                                                                    </div>
                                                                    {item.is_testaccount && (
                                                                        <span title="Test Account" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-100/90 border-2 border-purple-300 text-purple-700 text-[12px] font-semibold uppercase tracking-wider shrink-0 shadow-sm">
                                                                            <FaVial size={10} className="text-purple-600 shrink-0" />
                                                                            <span>TEST</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[15px] font-bold text-slate-400 mt-1 truncate">{item.email || 'No Email'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0"><StatusBadge status={item.status} /></div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 mt-1 bg-slate-50/50 rounded-xl p-3 border-2 border-slate-200">
                                                        <div className="flex justify-between items-center text-[15px] gap-2">
                                                            <span className="font-semibold text-slate-400 uppercase tracking-wide shrink-0">{((item.region || getOfficialRegion(item)) === 'Central Office') ? 'Strand' : 'Office'}</span>
                                                            <span className="font-semibold text-brand-800 text-right truncate max-w-[65%]">
                                                                {(item.region) ? `${item.region} • ` : 'N/A • '}{((item.region || getOfficialRegion(item)) === 'Central Office' ? item.strand : item.division) || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[15px] gap-2">
                                                            <span className="font-semibold text-slate-400 uppercase tracking-wide shrink-0">Position</span>
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50/80 border-2 border-amber-300 text-amber-600 font-semibold uppercase tracking-wide shrink-0 max-w-[65%] truncate">
                                                                <span className="truncate">{item.status === 'Inactive' ? 'N/A' : (item.position_title || 'Unassigned')}</span>
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[15px] gap-2">
                                                            <span className="font-semibold text-slate-400 uppercase tracking-wide shrink-0">Designation</span>
                                                            <span className="font-semibold text-brand-800 text-right truncate max-w-[65%]">{expandAcronym(item.designation) || 'No Designation'}</span>
                                                        </div>
                                                    </div>

                                                    {item.status === 'For Approval' && user?.role === 'Central Office' && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'approve'); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide border-2 border-emerald-100 hover:bg-emerald-500 hover:text-white transition-all">
                                                                <FiCheckCircle size={14} /> Approve
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'reject'); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide border-2 border-rose-100 hover:bg-rose-500 hover:text-white transition-all">
                                                                <FiX size={14} /> Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                    {item.status === 'Rejected' && user?.role === 'Central Office' && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'retrieve'); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-50 text-sky-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide border-2 border-sky-100 hover:bg-sky-500 hover:text-white transition-all">
                                                                <FiRefreshCw size={14} /> Retrieve
                                                            </button>
                                                        </div>
                                                    )}
                                                    {item.status !== 'Inactive' && item.status !== 'For Approval' && item.status !== 'Rejected' && user?.role === 'Central Office' && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <button onClick={(e) => { e.stopPropagation(); handleOpenReassignModal(item); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide border-2 border-amber-100 hover:bg-amber-500 hover:text-white transition-all">
                                                                <FiLayers size={14} /> Reassign
                                                            </button>
                                                            {item.first_name && item.status !== 'Reassigning' && item.status !== 'Pending Assignment' && (
                                                                <button onClick={(e) => { e.stopPropagation(); openActionModal(item, 'vacate'); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-[15px] font-semibold uppercase tracking-wide border-2 border-rose-100 hover:bg-rose-500 hover:text-white transition-all">
                                                                    <FiTrash2 size={14} /> Vacate
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* TABLE FOOTER / PAGINATION */}
                                        <div className="px-8 py-5 bg-white border-t-2 border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <span className="text-[15px] font-semibold text-slate-400 uppercase tracking-wide">
                                                Showing {totalRecords === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-500 rounded-xl text-[15px] font-semibold uppercase tracking-wide disabled:opacity-40">Previous</button>
                                                {pageButtons.map(page => typeof page === 'number' ? (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`w-10 h-10 rounded-xl text-[15px] font-semibold border-2 transition-all ${currentPage === page ? 'bg-brand-800 text-white border-brand-700' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'}`}
                                                    >
                                                        {page}
                                                    </button>
                                                ) : (
                                                    <span key={page} className="px-1 text-[15px] font-semibold text-slate-300">...</span>
                                                ))}
                                                <span className="px-2 py-2 text-[15px] font-semibold text-slate-400 uppercase tracking-wide">Page {currentPage} of {pageCount}</span>
                                                <button disabled={currentPage === pageCount} onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-500 rounded-xl text-[15px] font-semibold uppercase tracking-wide disabled:opacity-40">Next</button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : viewMode === 'grid' ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {pagedRecords.map((item) => (
                                            <motion.div
                                                key={item.TLOid}
                                                whileHover={{ y: -4 }}
                                                onClick={() => item.email && navigate(`/official-profiling?email=${encodeURIComponent(item.email)}`)}
                                                className={`card-surface p-5 group flex flex-col justify-between h-full relative overflow-hidden ${item.email ? 'cursor-pointer' : 'cursor-default'}`}
                                            >
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                                <div>
                                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center text-blue-300 font-semibold text-xl border-2 border-white shadow-md overflow-hidden shrink-0">
                                                            {item.photo_binary_id ? (
                                                                <img src={apiUrl(`/api/binary/${item.photo_binary_id}`)} alt="" className="w-full h-full object-cover" />
                                                            ) : <FiUser size={20} />}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {item.is_oic && <span className="px-2 py-0.5 bg-gold text-brand-700 border-2 border-yellow-200 rounded-full text-[10.5px] font-semibold uppercase tracking-wide">OIC</span>}
                                                            <div className="scale-75 origin-top-right">
                                                                <StatusBadge status={item.status} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1 relative z-10">
                                                        <h3 className="text-[17px] font-semibold text-brand-800 tracking-tighter leading-tight uppercase italic line-clamp-2">
                                                            {item.first_name ? <>{item.first_name} {item.last_name}</> : <span className="text-rose-500">VACANT POSITION</span>}
                                                        </h3>
                                                        {item.status !== 'Inactive' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handlePositionClick(item); }}
                                                                className="text-[12px] font-semibold text-brand-800 uppercase tracking-[0.2em] hover:text-brand-700 transition-colors text-left flex items-center gap-1 w-full"
                                                                title="Positional History"
                                                            >
                                                                <span className="truncate">{item.position_title || 'Candidate'}</span>
                                                                <FiClock className="text-slate-400 shrink-0" size={10} />
                                                            </button>
                                                        )}

                                                        {item.concurrent_positions && (
                                                            <div className="mt-2 bg-emerald-50 rounded-xl p-2.5 border-2 border-emerald-100 shadow-sm">
                                                                <div className="text-[9px] font-semibold text-emerald-600 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                                                    Concurrent Role
                                                                </div>
                                                                <div className="text-[12px] font-bold text-emerald-800 leading-snug line-clamp-2">
                                                                    {item.concurrent_positions.split(' | ').map((pos, idx) => (
                                                                        <div key={idx} className="mb-0.5 last:mb-0 truncate">
                                                                            {pos}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 pt-3 border-t-2 border-slate-100 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Strand</span>
                                                            <span className="text-[12px] font-bold text-slate-700 truncate max-w-[60%] text-right">{item.status === 'Inactive' ? 'N/A' : (item.strand || 'N/A')}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Office</span>
                                                            <span className="text-[12px] font-bold text-slate-700 truncate ml-2 text-right">{item.status === 'Inactive' ? 'N/A' : (item.office || 'Main Office')}</span>
                                                        </div>
                                                        {item.updated_at && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Updated</span>
                                                                <span className="text-[12px] font-bold text-slate-700 truncate ml-2 text-right">
                                                                    {new Date(item.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-3 border-t-2 border-slate-100 flex flex-col gap-3 relative z-20" onClick={e => e.stopPropagation()}>
                                                    <div className="flex flex-wrap justify-center gap-1.5">
                                                        {item.status === 'For Approval' && user?.role === 'Central Office' && (
                                                            <>
                                                                <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'approve'); }} className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-md text-[10.5px] font-semibold uppercase tracking-wide hover:bg-emerald-500 hover:text-white transition-all border-2 border-emerald-100 shadow-sm">
                                                                    <FiCheckCircle size={12} /> Approve
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'reject'); }} className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 text-rose-600 rounded-md text-[10.5px] font-semibold uppercase tracking-wide hover:bg-rose-500 hover:text-white transition-all border-2 border-rose-100 shadow-sm">
                                                                    <FiX size={12} /> Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        {item.status === 'Rejected' && user?.role === 'Central Office' && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleRegistrationAction(item.TLOid, 'retrieve'); }} className="flex items-center gap-1 px-2 py-1.5 bg-sky-50 text-sky-600 rounded-md text-[10.5px] font-semibold uppercase tracking-wide hover:bg-sky-500 hover:text-white transition-all border-2 border-sky-100 shadow-sm">
                                                                <FiRefreshCw size={12} /> Retrieve
                                                            </button>
                                                        )}
                                                        {item.status !== 'Inactive' && item.status !== 'For Approval' && item.status !== 'Rejected' && user?.role === 'Central Office' && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleOpenReassignModal(item); }} className="flex items-center gap-1 px-2 py-1.5 bg-amber-50 text-amber-600 rounded-md text-[10.5px] font-semibold uppercase tracking-wide hover:bg-amber-500 hover:text-white transition-all border-2 border-amber-100 shadow-sm">
                                                                <FiLayers size={12} /> Reassign
                                                            </button>
                                                        )}
                                                        {item.first_name && item.status !== 'Reassigning' && item.status !== 'Pending Assignment' && item.status !== 'For Approval' && item.status !== 'Rejected' && user?.role === 'Central Office' && (
                                                            <button onClick={(e) => { e.stopPropagation(); openActionModal(item, 'vacate'); }} className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 text-rose-600 rounded-md text-[10.5px] font-semibold uppercase tracking-wide hover:bg-rose-500 hover:text-white transition-all border-2 border-rose-100 shadow-sm">
                                                                <FiTrash2 size={12} /> Vacate
                                                            </button>
                                                        )}
                                                    </div>
                                                    {item.status !== 'Inactive' && (
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-[10.5px] font-semibold text-slate-300 uppercase tracking-wide italic flex items-center gap-1 group-hover:text-brand-700 transition-colors">
                                                                Full Profile <FiArrowRight size={12} />
                                                            </div>
                                                            <button onClick={() => handlePositionClick(item)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-brand-800 hover:text-white transition-all border-2 border-slate-200" title="Positional History">
                                                                <FiClock size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="px-8 py-5 card-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <span className="text-[15px] font-semibold text-slate-400 uppercase tracking-wide">
                                            Showing {totalRecords === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-slate-50 border-2 border-slate-200 text-slate-500 rounded-xl text-[15px] font-semibold uppercase tracking-wide disabled:opacity-40">Previous</button>
                                            {pageButtons.map(page => typeof page === 'number' ? (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-10 h-10 rounded-xl text-[15px] font-semibold border-2 transition-all ${currentPage === page ? 'bg-brand-800 text-white border-brand-700' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'}`}
                                                >
                                                    {page}
                                                </button>
                                            ) : (
                                                <span key={page} className="px-1 text-[15px] font-semibold text-slate-300">...</span>
                                            ))}
                                            <span className="px-2 py-2 text-[15px] font-semibold text-slate-400 uppercase tracking-wide">Page {currentPage} of {pageCount}</span>
                                            <button disabled={currentPage === pageCount} onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} className="px-4 py-2 bg-slate-50 border-2 border-slate-200 text-slate-500 rounded-xl text-[15px] font-semibold uppercase tracking-wide disabled:opacity-40">Next</button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                                    {Object.entries(directoryGroups).map(([groupName, members]) => (
                                        <div key={groupName} className="bg-slate-50/50 p-8 rounded-lg border-2 border-slate-200">
                                            <h3 className="text-center font-semibold text-[36px] text-brand-800 tracking-tighter mb-8 uppercase">{groupName}</h3>

                                            <div className="flex flex-wrap justify-center gap-6">
                                                {members.map(item => (
                                                    <div key={item.TLOid} className="card-surface p-6 w-[280px] flex flex-col items-center text-center relative shadow-xl shadow-slate-200/50 hover:border-brand-700 transition-colors cursor-pointer" onClick={() => item.email && navigate(`/official-profiling?email=${encodeURIComponent(item.email)}`)}>
                                                        <div className="absolute -top-4 bg-brand-700 text-white text-[15px] font-semibold uppercase tracking-wide px-4 py-1.5 rounded-full shadow-md w-[90%] truncate border-2 border-sky-600">
                                                            {item.position_title || 'Position Unknown'}
                                                        </div>
                                                        <div className="mt-4 font-semibold text-[27px] text-slate-800 leading-tight uppercase italic min-h-[50px] flex items-center justify-center">
                                                            {item.first_name ? `${item.first_name} ${item.last_name}` : <span className="text-rose-500 not-italic">VACANT</span>}
                                                        </div>
                                                        <div className="text-[15px] font-bold text-slate-500 mt-2 min-h-[30px] flex items-center justify-center">{item.designation || 'No Designation'}</div>
                                                        <div className="w-full h-0.5 bg-slate-200 my-4"></div>
                                                        <div className="text-[13.5px] font-semibold text-slate-400 uppercase tracking-wide">
                                                            Appointed: <span className="text-brand-700 ml-1">{item.appointment_date ? new Date(item.appointment_date).toLocaleDateString() : item.effectivity_date ? new Date(item.effectivity_date).toLocaleDateString() : 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(directoryGroups).length === 0 && (
                                        <div className="py-20 text-center">
                                            <FiLayers className="mx-auto text-slate-200 mb-6" size={64} />
                                            <h2 className="text-2xl font-semibold text-brand-800 uppercase tracking-tighter mb-2">No Directory Data</h2>
                                            <p className="text-slate-500 font-bold max-w-md mx-auto">No records found matching the current filters.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
    </>
  );
};

export default ContentArea;
