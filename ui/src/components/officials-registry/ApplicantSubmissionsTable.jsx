import React, { useState, useEffect, useCallback } from 'react';
import { motion } from '../../utils/staticElements.jsx';
import { MagnifyingGlass as FiSearch, Briefcase as FiBriefcase, MapPin as FiMapPin, Calendar as FiCalendar, User as FiUser, CaretLeft as FiChevronLeft, CaretRight as FiChevronRight, ArrowsClockwise as FiRefreshCw, Sliders as FiSliders, Eye as FiEye, Medal as FiAward } from '@phosphor-icons/react';
import { apiUrl } from '../../utils/api';
import ApplicantInspectionModal from './ApplicantInspectionModal';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const POSITION_BADGES = {
    RD: { label: 'Regional Director', badge: 'bg-brand-800 text-gold border-brand-800' },
    ARD: { label: 'Asst. Regional Director', badge: 'bg-brand-700 text-white border-brand-700' },
    SDS: { label: 'Schools Div. Supt.', badge: 'bg-brand-700 text-white border-brand-700' },
    ASDS: { label: 'Asst. Schools Div. Supt.', badge: 'bg-brand-700 text-white border-brand-700' }
};

const ApplicantSubmissionsTable = ({ token, isCentralOffice = true }) => {
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Filters & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('All');
    const [regionFilter, setRegionFilter] = useState('All');
    const [sortBy, setSortBy] = useState('submission_timestamp');
    const [sortOrder, setSortOrder] = useState('DESC');

    // Inspection Modal state
    const [selectedApplicationId, setSelectedApplicationId] = useState(null);
    const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);

    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                sortBy,
                sortOrder
            });

            if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());
            if (positionFilter !== 'All') queryParams.append('position', positionFilter);
            if (regionFilter !== 'All') queryParams.append('region', regionFilter);

            const res = await fetch(apiUrl(`/api/admin/records/applications?${queryParams.toString()}`), {
                headers: {
                    Authorization: `Bearer ${token || localStorage.getItem('token')}`
                }
            });

            const data = await res.json();
            if (data.success) {
                setSubmissions(data.data || []);
                if (data.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        total: data.pagination.total,
                        totalPages: data.pagination.totalPages || 1
                    }));
                }
            } else {
                setSubmissions([]);
            }
        } catch (err) {
            console.error('[ApplicantSubmissionsTable] Fetch error:', err);
            setSubmissions([]);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, sortBy, sortOrder, searchTerm, positionFilter, regionFilter, token]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const handleSort = (columnKey) => {
        if (sortBy === columnKey) {
            setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
        } else {
            setSortBy(columnKey);
            setSortOrder('DESC');
        }
    };

    const handleOpenInspection = (id) => {
        setSelectedApplicationId(id);
        setIsInspectionModalOpen(true);
    };

    const handleCloseInspection = () => {
        setIsInspectionModalOpen(false);
        setSelectedApplicationId(null);
    };

    const handleScoreSaved = () => {
        fetchSubmissions();
    };

    return (
        <div className="space-y-6">
            {/* Header Control Card */}
            <div className="card-surface p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold uppercase tracking-[0.2em] text-brand-700">
                                Records Management • Applications
                            </span>
                        </div>
                        <h2 className="text-xl font-semibold text-brand-800 tracking-tight mt-0.5">
                            TIMON Applications Submissions
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchSubmissions}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-[13px] font-semibold uppercase tracking-wide hover:border-brand-800 hover:text-brand-800 transition-all"
                            title="Refresh Submissions"
                        >
                            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={14} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    {/* Search */}
                    <FloatingLabelInput label="Search candidate name or email" icon={<FiSearch size={16} />} className="w-full" type="text" value={searchTerm} onChange={e => {
                                setSearchTerm(e.target.value);
                                setPagination(p => ({ ...p, page: 1 }));
                            }} placeholder="Search candidate name or email..." />

                    {/* Position Filter */}
                    <FloatingLabelInput as="select" label="Applied Position" className="w-full" value={positionFilter} onChange={e => {
                                setPositionFilter(e.target.value);
                                setPagination(p => ({ ...p, page: 1 }));
                            }}>
                            <option value="All">All Applied Positions</option>
                            <option value="RD">Regional Director (RD)</option>
                            <option value="ARD">Assistant Regional Director (ARD)</option>
                            <option value="SDS">Schools Division Superintendent (SDS)</option>
                            <option value="ASDS">Assistant Schools Division Superintendent (ASDS)</option>
                        </FloatingLabelInput>

                    {/* Target Region Filter */}
                    <FloatingLabelInput as="select" label="Target Region" className="w-full" value={regionFilter} onChange={e => {
                                setRegionFilter(e.target.value);
                                setPagination(p => ({ ...p, page: 1 }));
                            }}>
                            <option value="All">All Target Regions</option>
                            <option value="Central Office">Central Office</option>
                            <option value="Region I">Region I</option>
                            <option value="Region II">Region II</option>
                            <option value="Region III">Region III</option>
                            <option value="Region IV-A">Region IV-A</option>
                            <option value="Region IV-B">Region IV-B</option>
                            <option value="Region V">Region V</option>
                            <option value="Region VI">Region VI</option>
                            <option value="Region VII">Region VII</option>
                            <option value="Region VIII">Region VIII</option>
                            <option value="Region IX">Region IX</option>
                            <option value="Region X">Region X</option>
                            <option value="Region XI">Region XI</option>
                            <option value="Region XII">Region XII</option>
                            <option value="CARAGA">CARAGA</option>
                            <option value="CAR">CAR</option>
                            <option value="NCR">NCR</option>
                            <option value="BARMM">BARMM</option>
                        </FloatingLabelInput>

                    {/* Quick Counts Indicator */}
                    <div className="flex items-center justify-end px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600">
                        <span>Showing {submissions.length} of {pagination.total} Submissions</span>
                    </div>
                </div>
            </div>

            {/* Submissions Data Table */}
            <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-auto">
                        <thead>
                            <tr className="bg-white border-b border-muted text-heading text-[13px] font-semibold uppercase tracking-wide">
                                <th
                                    onClick={() => handleSort('candidate_name')}
                                    className="px-6 py-4 cursor-pointer hover:bg-brand-50 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Candidate Name</span>
                                        {sortBy === 'candidate_name' && (
                                            <span className="text-brand-800">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('applied_position')}
                                    className="px-6 py-4 cursor-pointer hover:bg-brand-50 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Applied Position</span>
                                        {sortBy === 'applied_position' && (
                                            <span className="text-brand-800">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('target_region')}
                                    className="px-6 py-4 cursor-pointer hover:bg-brand-50 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Target Region</span>
                                        {sortBy === 'target_region' && (
                                            <span className="text-brand-800">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('submission_timestamp')}
                                    className="px-6 py-4 cursor-pointer hover:bg-brand-50 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Submission Timestamp</span>
                                        {sortBy === 'submission_timestamp' && (
                                            <span className="text-brand-800">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('overall_qualification_status')}
                                    className="px-6 py-4 cursor-pointer hover:bg-brand-50 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>QS Status</span>
                                        {sortBy === 'overall_qualification_status' && (
                                            <span className="text-brand-800">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center">NSC Score</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-muted bg-white text-[15px] font-medium text-heading">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-16 text-center text-slate-400">
                                        <div className="w-8 h-8 border-3 border-brand-800/20 border-t-brand-800 rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="font-semibold uppercase tracking-wide text-[13px]">Loading Submissions...</p>
                                    </td>
                                </tr>
                            ) : submissions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-16 text-center text-slate-400">
                                        <FiBriefcase className="mx-auto mb-3 text-slate-300" size={32} />
                                        <h4 className="font-semibold uppercase tracking-tight text-brand-800 text-base">No Submissions Found</h4>
                                        <p className="font-medium text-slate-400 mt-1">Try adjusting your position or regional filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((row) => {
                                    const badgeInfo = POSITION_BADGES[row.applied_position] || {
                                        label: row.applied_position,
                                        badge: 'bg-slate-800 text-white border-slate-800'
                                    };

                                    const formattedDate = row.submission_timestamp
                                        ? new Date(row.submission_timestamp).toLocaleString('en-US', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        })
                                        : '—';

                                    const nscAverage = row.nsc_average_score;

                                    return (
                                        <tr
                                            key={row.id}
                                            onClick={() => handleOpenInspection(row.id)}
                                            className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                                        >
                                            {/* Candidate Name */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-800 flex items-center justify-center font-semibold shrink-0 border border-blue-100">
                                                        <FiUser size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="person-title text-brand-800 text-[17px] leading-tight group-hover:text-brand-700 transition-colors">
                                                            {row.candidate_name}
                                                        </p>
                                                        <p className="font-data text-[13px] text-secondary">
                                                            {row.email || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Applied Position */}
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-2">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold uppercase tracking-wide border ${badgeInfo.badge}`}>
                                                        {row.applied_position}
                                                    </span>
                                                    <span className="text-[13px] font-medium text-slate-600 hidden lg:inline">
                                                        {badgeInfo.label}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Target Region */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                                    <FiMapPin className="text-brand-800 shrink-0" size={14} />
                                                    <span>{row.target_region}</span>
                                                </div>
                                            </td>

                                            {/* Submission Timestamp */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                                                    <FiCalendar className="text-slate-400 shrink-0" size={14} />
                                                    <span>{formattedDate}</span>
                                                </div>
                                            </td>

                                            {/* QS Status */}
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold uppercase tracking-wide border inline-flex items-center gap-1 ${
                                                    row.overall_qualification_status === 'QUALIFIED'
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                        : row.overall_qualification_status === 'NOT QUALIFIED'
                                                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                                                            : 'bg-slate-100 text-slate-700 border-slate-300'
                                                }`}>
                                                    {row.overall_qualification_status || 'UNASSESSED'}
                                                </span>
                                            </td>

                                            {/* NSC Score */}
                                            <td className="px-6 py-4 text-center">
                                                {nscAverage !== null && nscAverage !== undefined ? (
                                                    <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[13px] inline-flex items-center gap-1" title="Completed NSC Average Score">
                                                        <FiAward size={12} /> {nscAverage}
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-400 font-medium text-[13px] inline-flex items-center gap-1" title="NSC evaluation pending (all 5 member scores required)">
                                                        <FiAward size={12} /> --
                                                    </span>
                                                )}
                                            </td>

                                            {/* Action */}
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenInspection(row.id);
                                                    }}
                                                    className="px-4 py-2 rounded-xl bg-brand-800 text-white hover:bg-blue-900 text-[13px] font-semibold uppercase tracking-wide transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                                                >
                                                    <FiEye size={14} /> Inspect
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-slate-50 border-t-2 border-slate-100 gap-4">
                        <p className="text-[13px] font-medium text-slate-400 uppercase tracking-wide">
                            Page {pagination.page} of {pagination.totalPages} ({pagination.total} submissions)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[13px] font-medium uppercase tracking-wide hover:border-brand-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                            >
                                <FiChevronLeft size={16} /> Prev
                            </button>
                            <span className="text-[13px] font-semibold text-brand-800 px-2">
                                {pagination.page}
                            </span>
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[13px] font-medium uppercase tracking-wide hover:border-brand-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                            >
                                Next <FiChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Inspection & Document Review Modal */}
            <ApplicantInspectionModal
                isOpen={isInspectionModalOpen}
                applicationId={selectedApplicationId}
                onClose={handleCloseInspection}
                token={token}
                onScoreSaved={handleScoreSaved}
            />
        </div>
    );
};

export default ApplicantSubmissionsTable;

