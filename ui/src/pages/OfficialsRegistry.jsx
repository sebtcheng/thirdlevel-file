import React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from '../utils/staticElements.jsx';
import { Users as FiUsers, MagnifyingGlass as FiSearch, CaretRight as FiChevronRight, Info as FiInfo } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';
import Swal from 'sweetalert2';
import { apiUrl } from '../utils/api';
import { formatPositionTitle } from '../utils/officialsUtils';
import sgMap from '../utils/sgMap.json';
import ReassignOfficialModal from '../components/ReassignOfficialModal';
import { DataControls, ApprovalTabs, StatsCards, ContentArea, IncumbencyModal, ActionModal, ApplicantSubmissionsTable, THIRD_LEVEL_POSITIONS } from '../components/officials-registry';
import FloatingLabelInput from '../components/forms/FloatingLabelInput.jsx';
import PageHeaderCard from '../components/PageHeaderCard.jsx';
import AdminLayout from '../components/layout/AdminLayout.jsx';
// Hero header text follows the active registry tab.
const REGISTRY_HEADERS = {
    default: { title: "Personnel Registry", subtitle: "Official leadership management • Third level officials command dashboard" },
    "For Approval": { title: "Pending Approvals", subtitle: "Personnel registrations waiting for review and approval" },
    Rejected: { title: "Rejected Registrations", subtitle: "Personnel registrations that were declined" },
    Applications: { title: "TIMON Applications", subtitle: "Executive designation applications submitted through the TIMON portal" },
};

const OfficialsRegistry = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, token } = useAuth();

    // --- SEARCHABLE SELECT COMPONENT ---
    const SearchableSelect = ({ label, options, value, onChange, placeholder, info }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [search, setSearch] = useState('');

        const filteredOptions = options.filter(opt =>
            opt.label.toLowerCase().includes(search.toLowerCase()) ||
            opt.sublabel?.toLowerCase().includes(search.toLowerCase())
        );

        const selectedOption = options.find(opt => opt.value === value);

        return (
            <div className="relative">
                {label && <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-3 block">{label}</label>}
                {info && <p className="text-[13.5px] text-slate-400 font-bold mb-3">{info}</p>}

                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-slate-50 border-2 border-slate-200 hover:border-brand-800/20 cursor-pointer rounded-2xl py-4 px-5 flex justify-between items-center transition-all group"
                >
                    <div className="flex flex-col">
                        <span className={`text-[21px] font-bold ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        {selectedOption?.sublabel && (
                            <span className="text-[15px] text-slate-400 font-bold">{selectedOption.sublabel}</span>
                        )}
                    </div>
                    <FiChevronRight className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-brand-700' : 'text-slate-300'}`} size={18} />
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-[120]" onClick={() => setIsOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-card shadow-2xl border-2 border-slate-200 z-[130] overflow-hidden flex flex-col max-h-[450px]"
                            >
                                <div className="p-4 border-b-2 border-slate-100 bg-slate-50/50">
                                    <FloatingLabelInput label="Search options" icon={<FiSearch size={16} />} className="w-full" autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search options..." autoComplete="off" />
                                </div>
                                <div className="overflow-y-auto py-2 custom-scrollbar">
                                    {filteredOptions.length > 0 ? (
                                        filteredOptions.map((opt) => (
                                            <div
                                                key={opt.value}
                                                onClick={() => {
                                                    onChange(opt.value);
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }}
                                                className={`px-5 py-4 cursor-pointer flex flex-col hover:bg-blue-50 transition-colors ${value === opt.value ? 'bg-blue-50/50 border-l-4 border-brand-800' : 'border-l-4 border-transparent'}`}
                                            >
                                                <span className={`text-[18px] font-black uppercase tracking-tight ${value === opt.value ? 'text-blue-700' : 'text-slate-700'}`}>
                                                    {opt.label}
                                                </span>
                                                {opt.sublabel && (
                                                    <span className="text-[15px] text-slate-400 font-bold mt-0.5">{opt.sublabel}</span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 text-center">
                                            <FiInfo className="mx-auto text-slate-200 mb-2" size={24} />
                                            <p className="text-[15px] font-bold text-slate-400 uppercase tracking-widest">No options found</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const [officials, setOfficials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingPersonnel, setIsAddingPersonnel] = useState(false);
    
    const [statusTab, setStatusTab] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('status') || 'All';
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const statusParam = params.get('status');
        if (statusParam) {
            setStatusTab(statusParam);
        } else {
            setStatusTab('All');
        }
    }, [location.search]);

    const [activeTab, setActiveTab] = useState('All');
    const [levelFilter, setLevelFilter] = useState('All');
    const [regionFilter, setRegionFilter] = useState('All');
    const [strandFilter, setStrandFilter] = useState('All');
    
    const handleRegistrationAction = async (TLOid, action) => {
        let denial_reason = '';
        if (action === 'reject') {
            const { value: reason, isConfirmed } = await Swal.fire({
                title: 'Reject Registration',
                text: 'Please provide a reason for rejecting this registration:',
                input: 'textarea',
                inputPlaceholder: 'Type reason for rejection here...',
                inputValidator: (value) => {
                    if (!value || !value.trim()) {
                        return 'You must provide a reason for rejection!';
                    }
                },
                showCancelButton: true,
                confirmButtonColor: 'var(--color-danger-600)',
                cancelButtonColor: 'var(--color-brand-800)',
                confirmButtonText: 'Confirm Reject'
            });
            if (!isConfirmed) return;
            denial_reason = reason.trim();
        } else if (action === 'approve') {
            const result = await Swal.fire({
                title: 'Confirm Approval',
                text: 'Are you sure you want to approve this official registration? An official approval notification email will be sent to the official.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: 'var(--color-brand-800)',
                cancelButtonColor: 'var(--color-danger-600)',
                confirmButtonText: 'Yes, Approve!'
            });
            if (!result.isConfirmed) return;
        } else {
            const result = await Swal.fire({
                title: `Confirm ${action}`,
                text: `Are you sure you want to ${action} this registration?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: 'var(--color-brand-800)',
                cancelButtonColor: 'var(--color-danger-600)',
                confirmButtonText: 'Yes, proceed!'
            });
            if (!result.isConfirmed) return;
        }

        try {
            const res = await fetch(apiUrl('/api/third-level/officials-registry/process-registration'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ TLOid, action, denial_reason })
            });
            const data = await res.json();
            if (data.success) {
                const actionLabel = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : `${action}d`;
                Swal.fire('Success', `Registration ${actionLabel} successfully and notification email dispatched to official.`, 'success');
                fetchOfficials();
            } else {
                Swal.fire('Error', data.error || 'Failed to process registration', 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'An error occurred while processing', 'error');
        }
    };

    const handleToggleTestAccount = async (item) => {
        const targetStatus = !item.is_testaccount;
        const officialName = item.first_name ? `${item.first_name} ${item.last_name || ''}` : item.TLOid;
        const confirmText = targetStatus
            ? `Are you sure you want to mark ${officialName} as a TEST ACCOUNT?`
            : `Are you sure you want to remove the TEST ACCOUNT flag from ${officialName}?`;

        const confirmRes = await Swal.fire({
            title: 'Update Test Account Status?',
            text: confirmText,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--color-brand-700)',
            cancelButtonColor: 'var(--color-secondary)',
            confirmButtonText: targetStatus ? 'Yes, Mark as Test' : 'Yes, Remove Flag'
        });

        if (!confirmRes.isConfirmed) return;

        try {
            const res = await fetch(apiUrl('/api/third-level/officials-registry/toggle-test-account'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ TLOid: item.TLOid, is_testaccount: targetStatus })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: targetStatus ? 'Marked as Test Account' : 'Test Account Flag Removed',
                    showConfirmButton: false,
                    timer: 2000
                });
                fetchOfficials();
            } else {
                Swal.fire('Error', data.error || 'Failed to update test account status', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'An error occurred while updating status', 'error');
        }
    };
    const [officeFilter, setOfficeFilter] = useState('All');
    const [positionFilter, setPositionFilter] = useState('All');
    const [designationFilter, setDesignationFilter] = useState('All');
    const [viewMode, setViewMode] = useState('table');
    const [strands, setStrands] = useState([]);
    const [offices, setOffices] = useState([]);
    const [tabPositions, setTabPositions] = useState([]); // Positions specifically for the active tab
    const [designations, setDesignations] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'status', direction: 'asc' });
    const [tableFilters, setTableFilters] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [oicOnly, setOicOnly] = useState(false);
    const [kpiSummary, setKpiSummary] = useState([]);
    const [kpiCounts, setKpiCounts] = useState({
        totalThirdLevel: 0,
        totalVacant: 0,
        totalOic: 0,
        totalConcurrent: 0
    });
    const [totalRecords, setTotalRecords] = useState(0);

    const isThirdLevel = (o) => THIRD_LEVEL_POSITIONS.includes(o.position_title) || THIRD_LEVEL_POSITIONS.includes(o.designation) || (o.designation && o.designation.toUpperCase().includes('OIC'));
    const isOIC = (o) => o.is_oic || (o.designation && o.designation.toUpperCase().includes('OIC'));

    const thirdLevelOfficials = useMemo(() => {
        return kpiSummary.filter(o => !isOIC(o) && THIRD_LEVEL_POSITIONS.includes(o.position_title));
    }, [kpiSummary]);

    const thirdLevelOic = useMemo(() => {
        return kpiSummary.filter(o => isOIC(o) && isThirdLevel(o));
    }, [kpiSummary]);

    const divisionChiefsOic = useMemo(() => {
        return kpiSummary.filter(o => isOIC(o) && !isThirdLevel(o));
    }, [kpiSummary]);

    const divisionChiefs = useMemo(() => {
        return kpiSummary.filter(o => !isOIC(o) && !THIRD_LEVEL_POSITIONS.includes(o.position_title));
    }, [kpiSummary]);

    // Active counts for KPI cards (to match Home page logic which only counts Active)
    const thirdLevelActiveCount = useMemo(() => thirdLevelOfficials.filter(o => o.status === 'Active').length, [thirdLevelOfficials]);
    const thirdLevelOicActiveCount = useMemo(() => thirdLevelOic.filter(o => o.status === 'Active').length, [thirdLevelOic]);
    const divisionChiefsOicActiveCount = useMemo(() => divisionChiefsOic.filter(o => o.status === 'Active').length, [divisionChiefsOic]);
    const divisionChiefsActiveCount = useMemo(() => divisionChiefs.filter(o => o.status === 'Active').length, [divisionChiefs]);

    // Position breakdowns for hover cards
    const sortBreakdown = (counts) => {
        const order = [
            'Secretary',
            'Undersecretary',
            'Assistant Sec',
            'Assistant Secretary',
            'Director IV',
            'Director III',
            'Regional Dir',
            'Regional Director',
            'ARD',
            'Assistant Regional Director',
            'SDS',
            'Schools Division Superintendent',
            'ASDS',
            'Assistant Schools Division Superintendent'
        ];

        const getWeight = (pos) => {
            const cleanPos = pos.replace(/^(OIC-?\s*)|(\s*\(OIC\))$/ig, '').trim();
            const index = order.findIndex(p => p.toLowerCase() === cleanPos.toLowerCase());
            if (index !== -1) return index;

            const fallbackIndex = order.findIndex(p => p.toLowerCase() === pos.toLowerCase());
            return fallbackIndex === -1 ? 999 : fallbackIndex;
        };

        return Object.fromEntries(
            Object.entries(counts).sort((a, b) => {
                const weightA = getWeight(a[0]);
                const weightB = getWeight(b[0]);
                if (weightA !== weightB) return weightA - weightB;
                // fallback to count (descending) or alphabetical
                if (b[1] !== a[1]) return b[1] - a[1];
                return a[0].localeCompare(b[0]);
            })
        );
    };

    const thirdLevelBreakdown = useMemo(() => {
        const counts = {};
        thirdLevelOfficials.forEach(o => {
            if (o.status === 'Active' && o.first_name && o.first_name !== 'VACANT') {
                const pos = o.position_title || 'Unassigned';
                counts[pos] = (counts[pos] || 0) + 1;
            }
        });
        return sortBreakdown(counts);
    }, [thirdLevelOfficials]);

    const thirdLevelOicBreakdown = useMemo(() => {
        const counts = {};
        thirdLevelOic.forEach(o => {
            if (o.status === 'Active' && o.first_name && o.first_name !== 'VACANT') {
                const pos = o.position_title || 'Unassigned';
                counts[pos] = (counts[pos] || 0) + 1;
            }
        });
        return sortBreakdown(counts);
    }, [thirdLevelOic]);

    const divisionChiefsBreakdown = useMemo(() => {
        const counts = {};
        divisionChiefsOic.forEach(o => {
            if (o.status === 'Active' && o.first_name && o.first_name !== 'VACANT') {
                const pos = o.position_title || 'Unassigned';
                counts[pos] = (counts[pos] || 0) + 1;
            }
        });
        return sortBreakdown(counts);
    }, [divisionChiefsOic]);

    const divisionChiefsNotOicBreakdown = useMemo(() => {
        const counts = {};
        divisionChiefs.forEach(o => {
            if (o.status === 'Active' && o.first_name && o.first_name !== 'VACANT') {
                const pos = o.position_title || 'Unassigned';
                counts[pos] = (counts[pos] || 0) + 1;
            }
        });
        return sortBreakdown(counts);
    }, [divisionChiefs]);

    const fetchTabPositions = async () => {
        try {
            // Fetch all positions for the current tab to keep the dropdown stable
            const queryParams = new URLSearchParams();

            // Map the frontend tab to backend category
            let backendCategory = 'Third Level';
            if (activeTab === 'Officer in Charge' || activeTab === 'Division Chiefs (OIC)') {
                backendCategory = 'OIC / Chiefs';
            } else if (activeTab === 'Division Chiefs') {
                backendCategory = 'Division Chiefs';
            } else if (activeTab === 'All') {
                backendCategory = 'All';
            }
            queryParams.append('category', backendCategory);
            queryParams.append('status', 'Active');
            const res = await fetch(apiUrl(`/api/third-level/officials-registry/officials?${queryParams.toString()}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                let filteredData = data.data;
                if (activeTab === 'Officer in Charge') {
                    filteredData = data.data.filter(o => THIRD_LEVEL_POSITIONS.includes(o.position_title) || THIRD_LEVEL_POSITIONS.includes(o.designation) || (o.designation && o.designation.toUpperCase().includes('OIC')));
                } else if (activeTab === 'Division Chiefs (OIC)') {
                    filteredData = data.data.filter(o => !(THIRD_LEVEL_POSITIONS.includes(o.position_title) || THIRD_LEVEL_POSITIONS.includes(o.designation) || (o.designation && o.designation.toUpperCase().includes('OIC'))));
                } else if (activeTab === 'Division Chiefs') {
                    filteredData = data.data.filter(o => !THIRD_LEVEL_POSITIONS.includes(o.position_title));
                }
                let formattedPositions = filteredData
                    .map(o => formatPositionTitle(o.position_title))
                    .filter(Boolean);
                let uniquePositions = [...new Set(formattedPositions)].sort();

                // Remove Vacant Tests from selector
                uniquePositions = uniquePositions.filter(p => !p.toUpperCase().includes('VACANT TEST'));

                setTabPositions(uniquePositions);
            }
        } catch (err) {
            console.error('Failed to fetch tab positions:', err);
        }
    };

    useEffect(() => {
        fetchTabPositions();
    }, [activeTab]);
    const [showIncumbencyModal, setShowIncumbencyModal] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [incumbents, setIncumbents] = useState([]);
    const [incumbentsLoading, setIncumbentsLoading] = useState(false);

    // Admin Action State
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionOfficial, setActionOfficial] = useState(null);
    const [adminAction, setAdminAction] = useState(''); // 'reassign' | 'succeed' | 'vacate'
    const [justification, setJustification] = useState('');
    const [vacateReason, setVacateReason] = useState('');
    const [effectivityDate, setEffectivityDate] = useState('');
    const [targetSlot, setTargetSlot] = useState('');
    const [vacantSlots, setVacantSlots] = useState([]);
    const [activeOfficials, setActiveOfficials] = useState([]);
    const [unassignedPersonnel, setUnassignedPersonnel] = useState([]);
    const [unassignedSearch, setUnassignedSearch] = useState('');
    const [unassignedLoading, setUnassignedLoading] = useState(false);
    const [assigneeSlot, setAssigneeSlot] = useState('');
    const [successorSlot, setSuccessorSlot] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const unassignedAbortRef = useRef(null);
    const unassignedCacheRef = useRef(new Map());
    const [selectedOffice, setSelectedOffice] = useState('');
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignOfficialTarget, setReassignOfficialTarget] = useState(null);

    const handleOpenReassignModal = (item) => {
        setReassignOfficialTarget(item);
        setIsReassignModalOpen(true);
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'reassign') {
            const tloId = params.get('tloid');
            if (tloId && officials.length > 0) {
                const found = officials.find(o => o.TLOid === tloId);
                if (found) setReassignOfficialTarget(found);
            }
            setIsReassignModalOpen(true);
        }
    }, [location.search, officials]);

    const uniqueOffices = useMemo(() => {
        const offices = vacantSlots.map(slot => slot.office).filter(Boolean);
        return [...new Set(offices)].sort();
    }, [vacantSlots]);

    const filteredVacantSlots = useMemo(() => {
        if (!selectedOffice) return [];
        return vacantSlots.filter(slot => slot.office === selectedOffice);
    }, [vacantSlots, selectedOffice]);

    const ListRowsIcon = () => (
        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    );

    useEffect(() => {
        fetchKpiSummary();
        fetchStrands();
        fetchTabPositions();
        fetchOfficials();
    }, [searchTerm, strandFilter, officeFilter, positionFilter, designationFilter, currentPage, activeTab, statusTab, oicOnly, sortConfig, tableFilters, viewMode, levelFilter, regionFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab, strandFilter, officeFilter, positionFilter, designationFilter, sortConfig, tableFilters, statusTab, oicOnly, viewMode, levelFilter, regionFilter]);

    const fetchStrands = async () => {
        try {
            // Simplified fetch for strands - we can also hardcode or fetch distinct from masterlist
            const res = await fetch(apiUrl('/api/third-level/officials-registry/officials?status=All'), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                let uniqueStrands = [...new Set(data.data.map(o => o.strand).filter(Boolean))].sort();

                // Exclude Regions and Vacant strands
                uniqueStrands = uniqueStrands.filter(s => {
                    const upper = s.toUpperCase();
                    if (upper.includes('VACANT')) return false;
                    if (upper.startsWith('REGION ')) return false;
                    const regions = ['NCR', 'CAR', 'NIR', 'BARMM', 'CARAGA'];
                    if (regions.includes(upper)) return false;
                    return true;
                });

                setStrands(uniqueStrands);
                let uniqueOffices = [...new Set(data.data.map(o => o.office).filter(Boolean))].sort();
                setOffices(uniqueOffices);
                let uniqueDesignations = [...new Set(data.data.map(o => o.designation).filter(Boolean))].sort();
                setDesignations(uniqueDesignations);
            }
        } catch (err) {
            console.error('Failed to fetch strands:', err);
        }
    };


    const fetchKpiSummary = async () => {
        try {
            const queryParams = new URLSearchParams();
            if (searchTerm) queryParams.append('search', searchTerm);
            if (strandFilter !== 'All') queryParams.append('strand', strandFilter);
            if (officeFilter !== 'All') queryParams.append('office', officeFilter);
            if (positionFilter !== 'All') queryParams.append('position', positionFilter);
            if (designationFilter !== 'All') queryParams.append('designation', designationFilter);
            if (levelFilter !== 'All') queryParams.append('level', levelFilter);
            if (regionFilter !== 'All') queryParams.append('region', regionFilter);
            if (oicOnly) queryParams.append('is_oic', 'true');

            const res = await fetch(apiUrl(`/api/third-level/officials-registry/officials-kpi-summary?${queryParams.toString()}`), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                if (data.kpis) {
                    setKpiCounts({
                        totalThirdLevel: parseInt(data.kpis.total_third_level || 0),
                        totalVacant: parseInt(data.kpis.total_vacant || 0),
                        totalOic: parseInt(data.kpis.total_oic || 0),
                        totalConcurrent: parseInt(data.kpis.total_concurrent || 0)
                    });
                }
                if (data.data) {
                    setKpiSummary(data.data);
                }
            }
        } catch (err) {
            console.error('Failed to fetch KPI summary:', err);
        }
    };

    const fetchOfficials = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (searchTerm) queryParams.append('search', searchTerm);
            if (statusTab !== 'All') {
                queryParams.append('status', statusTab === 'Vacant' ? 'Vacated' : statusTab);
            } else {
                queryParams.append('status', 'All');
            }
            if (activeTab !== 'All') queryParams.append('category', activeTab);
            if (strandFilter !== 'All') queryParams.append('strand', strandFilter);
            if (officeFilter !== 'All') queryParams.append('office', officeFilter);
            if (positionFilter !== 'All') queryParams.append('position', positionFilter);
            if (designationFilter !== 'All') queryParams.append('designation', designationFilter);
            if (levelFilter !== 'All') queryParams.append('level', levelFilter);
            if (regionFilter !== 'All') queryParams.append('region', regionFilter);
            if (oicOnly) queryParams.append('is_oic', 'true');
            if (sortConfig.key) {
                queryParams.append('sortColumn', sortConfig.key);
                queryParams.append('sortDirection', sortConfig.direction);
            }
            // Column filters
            Object.keys(tableFilters).forEach(key => {
                if (tableFilters[key]) queryParams.set(key, tableFilters[key]);
            });

            if (viewMode !== 'directory') {
                const pageSize = 20;
                queryParams.append('page', currentPage);
                queryParams.append('limit', pageSize);
            }

            const res = await fetch(apiUrl(`/api/third-level/officials-registry/officials?${queryParams.toString()}`), {
                headers: {
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setOfficials(data.data);
                setTotalRecords(data.total);
            }
        } catch (err) {
            console.error('Failed to fetch officials:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!showActionModal) {
            setIsAddingPersonnel(false);
        }
    }, [showActionModal]);

    const fetchIncumbents = async (position, office) => {
        setIncumbentsLoading(true);
        setIncumbents([]);
        try {
            const res = await fetch(apiUrl(`/api/third-level/officials-registry/position-incumbents?position_title=${encodeURIComponent(position)}&office=${encodeURIComponent(office || '')}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setIncumbents(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch incumbents:', err);
        } finally {
            setIncumbentsLoading(false);
        }
    };

    const handlePositionClick = (official) => {
        setSelectedPosition({ title: official.position_title, office: official.office });
        setShowIncumbencyModal(true);
        fetchIncumbents(official.position_title, official.office);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'inactive': return 'bg-slate-50 text-slate-400 border-slate-100';
            case 'retired': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'succeeded': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
            case 'vacated':
            case 'vacant': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-blue-50 text-brand-700 border-blue-100';
        }
    };

    const StatusBadge = ({ status }) => {
        const displayStatus = status === 'Vacated' ? 'Vacant' : status;
        return (
            <span className={`px-3 py-1 rounded-full text-[15px] font-black uppercase tracking-widest border-2 ${getStatusColor(displayStatus)}`}>
                {displayStatus || 'Unknown'}
            </span>
        );
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (searchTerm) queryParams.append('search', searchTerm);
            if (strandFilter !== 'All') queryParams.append('strand', strandFilter);
            if (positionFilter !== 'All') queryParams.append('position', positionFilter);

            const res = await fetch(apiUrl(`/api/third-level/officials-registry/applications?${queryParams.toString()}`), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setApplications(data.data);
        } catch (err) {
            console.error('Failed to fetch applications:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnassignedPersonnel = async (search = '') => {
        const normalizedSearch = search.trim();
        if (unassignedCacheRef.current.has(normalizedSearch)) {
            setUnassignedPersonnel(unassignedCacheRef.current.get(normalizedSearch));
            return;
        }

        if (unassignedAbortRef.current) {
            unassignedAbortRef.current.abort();
        }

        const controller = new AbortController();
        unassignedAbortRef.current = controller;
        setUnassignedLoading(true);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('limit', normalizedSearch ? '75' : '50');
            if (normalizedSearch) queryParams.append('search', normalizedSearch);
            const res = await fetch(apiUrl(`/api/third-level/officials-registry/unassigned-personnel?${queryParams.toString()}`), {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` },
                signal: controller.signal
            });
            const data = await res.json();
            if (data.success) {
                unassignedCacheRef.current.set(normalizedSearch, data.data);
                setUnassignedPersonnel(data.data);
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Failed to fetch unassigned personnel:', err);
        } finally {
            if (unassignedAbortRef.current === controller) {
                unassignedAbortRef.current = null;
                setUnassignedLoading(false);
            }
        }
    };



    const handleAdminAction = async () => {
        if (!justification && adminAction !== 'reassign') return Swal.fire('Notice', 'Please provide a justification.', 'info');
        if ((adminAction === 'vacate' || adminAction === 'reassign') && !effectivityDate) return Swal.fire('Notice', 'Please select a Date of Effectivity.', 'info');
        if (adminAction === 'vacate' && !vacateReason) return Swal.fire('Notice', 'Please select a Reason for Vacating.', 'info');

        if (adminAction === 'reassign') {
            const isVacant = !actionOfficial?.first_name || actionOfficial?.first_name === 'VACANT';
            if (isVacant && !assigneeSlot) {
                return Swal.fire('Notice', 'Please select personnel to reassign to this position.', 'info');
            }
            if (!isVacant && !targetSlot) {
                return Swal.fire('Notice', 'Please select a vacant position to reassign this official to.', 'info');
            }
        }

        setActionLoading(true);
        try {
            const personName = `${actionOfficial?.first_name || ''} ${actionOfficial?.last_name || ''}`.trim();
            const positionName = actionOfficial?.position_title || 'position';

            const res = await fetch(apiUrl('/api/third-level/officials-registry/admin-action'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    TLOid: actionOfficial.TLOid,
                    action: adminAction,
                    justification,
                    vacateReason: adminAction === 'vacate' ? vacateReason : undefined,
                    effectivityDate,
                    target_TLOid: targetSlot || undefined,
                    successor_TLOid: successorSlot || undefined,
                    assignee_TLOid: assigneeSlot || undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                const isVacant = !actionOfficial?.first_name || actionOfficial?.first_name === 'VACANT';
                const message = adminAction === 'vacate'
                    ? `${personName || 'Official'} has vacated ${positionName}`
                    : adminAction === 'reassign'
                        ? (isVacant ? `Personnel reassigned to ${positionName}` : `${personName || 'Official'} reassigned successfully.`)
                        : `Official ${adminAction}ed successfully.`;
                Swal.fire('Notice', message, 'info');
                setShowActionModal(false);
                fetchOfficials();
            } else {
                Swal.fire('Notice', data.error || 'Action failed.', 'info');
            }
        } catch (err) {
            Swal.fire('Notice', 'Action failed: ' + err.message, 'info');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelVacate = async () => {
        const result = await Swal.fire({
            title: 'Cancel Action?',
            text: 'Are you sure you want to cancel this scheduled action and restore the official to Active status?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--color-brand-800)',
            cancelButtonColor: 'var(--color-danger-600)',
            confirmButtonText: 'Yes, cancel it!'
        });
        if (!result.isConfirmed) return;
        setActionLoading(true);
        try {
            const res = await fetch(apiUrl('/api/third-level/officials-registry/admin-action'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    TLOid: actionOfficial.TLOid,
                    action: 'cancel-vacate',
                    justification: 'Cancelled scheduled action'
                })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('Notice', 'Action cancelled successfully. Official is now Active.', 'info');
                setShowActionModal(false);
                fetchOfficials();
            } else {
                Swal.fire('Notice', data.error || 'Action failed.', 'info');
            }
        } catch (err) {
            Swal.fire('Notice', 'Action failed: ' + err.message, 'info');
        } finally {
            setActionLoading(false);
        }
    };

    const openActionModal = async (official, action) => {
        setActionOfficial(official);
        setAdminAction(action);
        setJustification('');
        setVacateReason('');

        if ((action === 'vacate' && ['Vacating', 'Resigning', 'Inactive'].includes(official.status)) ||
            (action === 'reassign' && ['Reassigning', 'Pending Assignment'].includes(official.status))) {

            if (official.effectivity_date) {
                const d = new Date(official.effectivity_date);
                const offset = d.getTimezoneOffset();
                const localDate = new Date(d.getTime() - (offset * 60 * 1000));
                setEffectivityDate(localDate.toISOString().split('T')[0]);
            }
            try {
                const res = await fetch(apiUrl(`/api/third-level/officials-registry/officials/${official.TLOid}/last-vacate-update`), {
                    headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
                });
                const data = await res.json();
                if (data.success && data.data) {
                    setVacateReason(data.data.vacate_reason || '');
                    setJustification(data.data.remarks || '');
                }
            } catch (err) {
                console.error('Failed to fetch last update:', err);
            }

            if (action === 'reassign') {
                if (official.reassign_target_tloid) {
                    const targetRow = officials.find(o => o.TLOid === official.reassign_target_tloid);
                    if (targetRow) {
                        setSelectedOffice(targetRow.office || 'Main Office');
                    }
                    setTargetSlot(official.reassign_target_tloid);
                }
                if (official.reassign_assignee_tloid) {
                    setAssigneeSlot(official.reassign_assignee_tloid);
                }
            } else {
                setTargetSlot('');
                setAssigneeSlot('');
                setSelectedOffice('');
            }
        } else {
            setEffectivityDate('');
            setTargetSlot('');
            setAssigneeSlot('');
            setSelectedOffice('');
        }
        setSuccessorSlot('');
        setUnassignedSearch('');
        setVacantSlots([]);
        setShowActionModal(true);
        if (action === 'reassign') {
            const isVacant = !official.first_name || official.first_name === 'VACANT';
            if (isVacant) {
                setUnassignedPersonnel(unassignedCacheRef.current.get('') || []);
            } else {
                try {
                    const res = await fetch(apiUrl('/api/third-level/official-profiling/vacancies'), {
                        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        let fetchedVacancies = data.data;
                        if (official.reassign_target_tloid) {
                            const targetRow = officials.find(o => o.TLOid === official.reassign_target_tloid);
                            if (targetRow && !fetchedVacancies.some(v => v.TLOid === targetRow.TLOid)) {
                                fetchedVacancies.push(targetRow);
                            }
                        }
                        setVacantSlots(fetchedVacancies);
                    }
                } catch (err) {
                    console.error('Failed to fetch vacancies:', err);
                }
            }
        }
        if (action === 'succeed') {
            try {
                const res = await fetch(apiUrl(`/api/third-level/officials-registry/active-officials?exclude_TLOid=${official.TLOid}`), {
                    headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
                });
                const data = await res.json();
                if (data.success) setActiveOfficials(data.data);
            } catch (err) {
                console.error('Failed to fetch active officials:', err);
            }
        }
    };

    useEffect(() => {
        if (!showActionModal || adminAction !== 'reassign') return;
        const isVacant = !actionOfficial?.first_name || actionOfficial?.first_name === 'VACANT';
        if (!isVacant) return;
        const timer = setTimeout(() => fetchUnassignedPersonnel(unassignedSearch), 350);
        return () => clearTimeout(timer);
    }, [unassignedSearch, showActionModal, adminAction, actionOfficial]);

    const getOfficialLevel = (item) => {
        if (item.region) {
            if (item.region === 'Central Office') return 'Central Office';
            const pos = item.position_title || '';
            const office = item.office || '';
            const isROPosition = /(Regional Director|RD|ARD)/i.test(pos);
            const isSDOPosition = /(Schools Division Superintendent|SDS|ASDS)/i.test(pos);
            if (isSDOPosition) return 'Schools Division Office';
            if (isROPosition || office.toLowerCase().includes('regional office') || office.toLowerCase() === 'ro') return 'Regional Office';
            return 'Schools Division Office';
        }

        const strand = item.strand || '';
        const office = item.office || '';
        const pos = item.position_title || '';
        const division = item.division || '';

        const isROPosition = /(Regional Director|RD|ARD)/i.test(pos);
        const isSDOPosition = /(Schools Division Superintendent|SDS|ASDS)/i.test(pos);
        const isROOffice = office.toLowerCase().includes('regional office') || office.toLowerCase() === 'ro' || (strand && office.toLowerCase() === strand.toLowerCase());

        if (isSDOPosition || division) return 'Schools Division Office';
        if (isROPosition || isROOffice) return 'Regional Office';

        const isRegionStrand = /^(Region|NCR|CAR|NIR|BARMM)/i.test(strand);
        if (isRegionStrand) {
            if (!office || office.toLowerCase() === strand.toLowerCase() || office.toLowerCase().includes('regional office') || office.toLowerCase() === 'ro') return 'Regional Office';
            return 'Schools Division Office';
        }

        return 'Central Office';
    };

    const getOfficialRegion = (item) => {
        if (item.region) return item.region;
        const level = getOfficialLevel(item);
        if (level === 'Central Office') return 'Central Office';

        const strand = (item.strand || '').trim().toUpperCase();
        if (strand.includes('REGION XIII') || strand.includes('CARAGA')) return 'CARAGA';

        const knownRegions = [
            'REGION I', 'REGION II', 'REGION III', 'REGION IV-A', 'REGION IV-B',
            'REGION V', 'REGION VI', 'REGION VII', 'REGION VIII', 'REGION IX',
            'REGION X', 'REGION XI', 'REGION XII', 'NCR', 'CAR', 'NIR', 'BARMM'
        ];

        const found = knownRegions.find(r => strand.startsWith(r));
        if (found) {
            // Convert back to proper case for display
            if (found === 'NCR') return 'NCR';
            if (found === 'CAR') return 'CAR';
            if (found === 'NIR') return 'NIR';
            if (found === 'BARMM') return 'BARMM';
            // Title case the Region format
            return found.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
        }

        return 'Unknown Region';
    };

    const isCentralOfficeView = levelFilter === 'Central Office' || regionFilter === 'Central Office' || tableFilters['region'] === 'Central Office';

    const tableColumns = useMemo(() => ([
        {
            key: 'region',
            label: 'Region',
            width: 'w-[9%]',
            value: (item) => getOfficialRegion(item),
            filterValue: (item) => getOfficialRegion(item)
        },
        {
            key: 'division',
            label: isCentralOfficeView ? 'Strand' : 'Division',
            width: 'w-[13%]',
            value: (item) => (item.region || getOfficialRegion(item)) === 'Central Office' ? (item.strand || item.division || item.office || '') : (item.division || item.office || ''),
            filterValue: (item) => (item.region || getOfficialRegion(item)) === 'Central Office' ? (item.strand || item.division || item.office || 'No Division') : (item.division || item.office || 'No Division')
        },
        {
            key: 'name',
            label: 'Official Profile',
            width: 'w-[22%]',
            value: (item) => `${item.first_name || 'VACANT POSITION'} ${item.last_name || ''}`,
            filterValue: (item) => item.first_name ? `${item.first_name} ${item.last_name || ''}`.trim() : 'VACANT POSITION'
        },
        {
            key: 'profile_completion',
            label: 'Profile Completion',
            width: 'w-[14%]',
            value: (item) => item.profile_completion != null ? `${item.profile_completion}%` : '—',
            filterValue: (item) => item.profile_completion != null ? `${item.profile_completion}%` : '—'
        },
        {
            key: 'position_title',
            label: 'Position',
            width: 'w-[16%]',
            value: (item) => (item.position_title || '').replace(/^(OIC\s*-\s*|OIC\s+)/i, '').replace(/\s*\(?OIC\)?\s*$/i, '').trim() || '',
            filterValue: (item) => (item.position_title || 'Unassigned').replace(/^(OIC\s*-\s*|OIC\s+)/i, '').replace(/\s*\(?OIC\)?\s*$/i, '').trim() || 'Unassigned'
        },
        {
            key: 'designation',
            label: 'Designation',
            width: 'w-[11%]',
            value: (item) => (item.designation || '').replace(/^(OIC\s*-\s*|OIC\s+)/i, '').replace(/\s*\(?OIC\)?\s*$/i, '').trim() || '',
            filterValue: (item) => (item.designation || 'No Designation').replace(/^(OIC\s*-\s*|OIC\s+)/i, '').replace(/\s*\(?OIC\)?\s*$/i, '').trim() || 'No Designation'
        },
        {
            key: 'is_oic',
            label: 'OIC',
            width: 'w-[5%]',
            value: (item) => (item.is_oic || (item.designation && item.designation.toUpperCase().includes('OIC'))) ? 'Yes' : 'No',
            filterValue: (item) => (item.is_oic || (item.designation && item.designation.toUpperCase().includes('OIC'))) ? 'Yes' : 'No'
        },
        {
            key: 'status',
            label: 'Status',
            width: 'w-[10%]',
            value: (item) => item.status === 'Vacated' ? 'Vacant' : (item.status || ''),
            filterValue: (item) => item.status === 'Vacated' ? 'Vacant' : (item.status || 'Unknown')
        }
    ]), [levelFilter, regionFilter, tableFilters]);

    const tableFilterOptions = useMemo(() => {
        return tableColumns.reduce((options, column) => {
            let dataForColumn = kpiSummary;

            if (levelFilter !== 'All') {
                dataForColumn = dataForColumn.filter(item => getOfficialLevel(item) === levelFilter);
            }
            if (regionFilter !== 'All') {
                dataForColumn = dataForColumn.filter(item => getOfficialRegion(item) === regionFilter);
            }
            if (strandFilter !== 'All') {
                dataForColumn = dataForColumn.filter(item => item.strand === strandFilter);
            }
            if (officeFilter !== 'All') {
                dataForColumn = dataForColumn.filter(item => item.office === officeFilter);
            }
            if (designationFilter !== 'All') {
                dataForColumn = dataForColumn.filter(item => item.designation === designationFilter);
            }
            if (positionFilter !== 'All') {
                dataForColumn = dataForColumn.filter(item => item.position_title === positionFilter);
            }
            if (statusTab !== 'All') {
                const targetStatus = statusTab === 'Vacant' ? 'Vacated' : statusTab;
                dataForColumn = dataForColumn.filter(item => item.status === targetStatus);
            }
            if (oicOnly) {
                dataForColumn = dataForColumn.filter(item => item.is_oic);
            }
            if (activeTab !== 'All') {
                if (activeTab === 'Third Level Officials') {
                    dataForColumn = dataForColumn.filter(item => !item.is_oic && THIRD_LEVEL_POSITIONS.includes(item.position_title));
                } else if (activeTab === 'Officer in Charge') {
                    dataForColumn = dataForColumn.filter(item => item.is_oic && THIRD_LEVEL_POSITIONS.includes(item.position_title));
                } else if (activeTab === 'Division Chiefs (OIC)') {
                    dataForColumn = dataForColumn.filter(item => item.is_oic && !THIRD_LEVEL_POSITIONS.includes(item.position_title));
                } else if (activeTab === 'Division Chiefs') {
                    dataForColumn = dataForColumn.filter(item => !item.is_oic && !THIRD_LEVEL_POSITIONS.includes(item.position_title));
                }
            }

            Object.keys(tableFilters).forEach(key => {
                if (key !== column.key && tableFilters[key]) {
                    const filterCol = tableColumns.find(c => c.key === key);
                    if (filterCol) {
                        dataForColumn = dataForColumn.filter(item => {
                            const val = (filterCol.filterValue ? filterCol.filterValue(item) : filterCol.value(item))?.trim();
                            return val === tableFilters[key];
                        });
                    }
                }
            });

            const values = dataForColumn
                .map(item => (column.filterValue ? column.filterValue(item) : column.value(item))?.trim())
                .filter(Boolean);

            if (column.key === 'division' && isCentralOfficeView) {
                // Ensure all strands are always visible in the dropdown, even if currently empty
                options[column.key] = [...new Set([...values, ...strands])].sort((a, b) => a.localeCompare(b));
            } else {
                options[column.key] = [...new Set(values)].sort((a, b) => a.localeCompare(b));
            }

            return options;
        }, {});
    }, [kpiSummary, tableColumns, tableFilters, levelFilter, regionFilter, strandFilter, officeFilter, designationFilter, positionFilter, statusTab, oicOnly, activeTab, strands, isCentralOfficeView]);

    const dependentOffices = useMemo(() => {
        let data = kpiSummary;
        if (regionFilter !== 'All') {
            data = data.filter(item => getOfficialRegion(item) === regionFilter);
        }
        const availableOffices = data.map(item => item.office).filter(Boolean);
        return [...new Set(availableOffices)].sort((a, b) => a.localeCompare(b));
    }, [kpiSummary, regionFilter]);

    useEffect(() => {
        setOfficeFilter('All');
        setStrandFilter('All');
    }, [regionFilter, levelFilter]);



    const directoryGroups = useMemo(() => {
        if (viewMode !== 'directory') return {};
        const groups = {};
        officials.forEach(item => {
            const key = item.office || item.region || 'Unassigned Office';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        // Sort each group's members by Salary Grade (Descending)
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                const cleanPosA = (a.position_title || '').replace(/^(OIC-?\s*)|(\s*\(OIC\))$/ig, '').trim();
                const cleanPosB = (b.position_title || '').replace(/^(OIC-?\s*)|(\s*\(OIC\))$/ig, '').trim();
                const sgA = sgMap[cleanPosA] || sgMap[a.position_title] || 0;
                const sgB = sgMap[cleanPosB] || sgMap[b.position_title] || 0;

                // If SG is the same, sort alphabetically by name
                if (sgB === sgA) {
                    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
                    return nameA.localeCompare(nameB);
                }

                return sgB - sgA;
            });
        });

        return groups;
    }, [officials, viewMode]);

    const pageSize = 20;
    const pageCount = Math.ceil(totalRecords / pageSize);
    const pagedRecords = officials;
    const pageButtons = useMemo(() => {
        const visible = new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1].filter(page => page >= 1 && page <= pageCount));
        const pages = [];
        let previous = 0;
        [...visible].sort((a, b) => a - b).forEach(page => {
            if (page - previous > 1) pages.push('ellipsis-' + page);
            pages.push(page);
            previous = page;
        });
        return pages;
    }, [currentPage, pageCount]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };


    const handleProcessApplication = async (app_TLOid, action, denial_reason = '') => {
        let finalReason = denial_reason;
        if (action === 'reject' && !finalReason) {
            const { value: reason, isConfirmed } = await Swal.fire({
                title: 'Reject Application',
                text: 'Please provide a reason for disapproving this application:',
                input: 'textarea',
                inputPlaceholder: 'Reason for disapproval...',
                inputValidator: (value) => {
                    if (!value || !value.trim()) {
                        return 'You must provide a reason for disapproval!';
                    }
                },
                showCancelButton: true,
                confirmButtonColor: 'var(--color-danger-600)',
                cancelButtonColor: 'var(--color-brand-800)',
                confirmButtonText: 'Confirm Disapprove'
            });
            if (!isConfirmed) return;
            finalReason = reason.trim();
        } else if (action === 'approve') {
            const result = await Swal.fire({
                title: 'Confirm Approval',
                text: 'Are you sure you want to approve this application? An approval notification email will be sent to the official.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: 'var(--color-brand-800)',
                cancelButtonColor: 'var(--color-danger-600)',
                confirmButtonText: 'Yes, Approve Application!'
            });
            if (!result.isConfirmed) return;
        }

        setProcessingId(app_TLOid);
        try {
            const res = await fetch(apiUrl('/api/third-level/officials-registry/process-application'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ app_TLOid, action, denial_reason: finalReason })
            });
            const data = await res.json();
            if (data.success) {
                fetchApplications();
                const actionText = action === 'approve' ? 'approved' : 'disapproved';
                Swal.fire('Success', `Application ${actionText} successfully and notification email sent.`, 'success');
            } else {
                Swal.fire('Notice', data.error || 'Processing failed.', 'info');
            }
        } catch (err) {
            Swal.fire('Notice', 'Processing failed: ' + err.message, 'info');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <PageTransition>
            <AdminLayout>
                
                <div className="flex-1 flex flex-col min-w-0 relative bg-transparent">
                    {/* TOP NAVIGATION BAR */}
                    <PageHeaderCard title={REGISTRY_HEADERS[statusTab]?.title ?? REGISTRY_HEADERS.default.title} subtitle={REGISTRY_HEADERS[statusTab]?.subtitle ?? REGISTRY_HEADERS.default.subtitle}>
<div className="flex items-center gap-6">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[15px] font-medium text-heading leading-tight">
                                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'System Admin'}
                                </span>
                                <span className="text-[13px] text-secondary">
                                    {user?.role || 'Central Office'}
                                </span>
                            </div>
                        </div>
</PageHeaderCard>

                    <main className="flex-1 px-8 pb-8 pt-6 w-full dashboard-theme !bg-transparent">
                        {/* APPROVAL / REJECTED / APPLICATIONS TABS */}
                        <ApprovalTabs navigate={navigate} officials={officials} statusTab={statusTab} />

                        {statusTab === 'Applications' ? (
                            <ApplicantSubmissionsTable token={token} isCentralOffice={isCentralOfficeView} />
                        ) : (
                            <>
                                {/* UNIFIED DATA CONTROLS TAB */}
                                <DataControls dependentOffices={dependentOffices} designationFilter={designationFilter} designations={designations} levelFilter={levelFilter} officeFilter={officeFilter} oicOnly={oicOnly} positionFilter={positionFilter} regionFilter={regionFilter} searchTerm={searchTerm} setActiveTab={setActiveTab} setDesignationFilter={setDesignationFilter} setLevelFilter={setLevelFilter} setOfficeFilter={setOfficeFilter} setOicOnly={setOicOnly} setPositionFilter={setPositionFilter} setRegionFilter={setRegionFilter} setSearchTerm={setSearchTerm} setStatusTab={setStatusTab} setStrandFilter={setStrandFilter} setTableFilters={setTableFilters} setViewMode={setViewMode} strandFilter={strandFilter} strands={strands} tabPositions={tabPositions} viewMode={viewMode} />

                                {/* STATS CARDS */}
                                <StatsCards activeTab={activeTab} kpiCounts={kpiCounts} setActiveTab={setActiveTab} setLevelFilter={setLevelFilter} setOfficeFilter={setOfficeFilter} setPositionFilter={setPositionFilter} setRegionFilter={setRegionFilter} setStatusTab={setStatusTab} setStrandFilter={setStrandFilter} statusTab={statusTab} />

                                {/* MAIN CONTENT AREA */}
                                <ContentArea StatusBadge={StatusBadge} currentPage={currentPage} directoryGroups={directoryGroups} getOfficialRegion={getOfficialRegion} handleOpenReassignModal={handleOpenReassignModal} handlePositionClick={handlePositionClick} handleRegistrationAction={handleRegistrationAction} handleSort={handleSort} handleToggleTestAccount={handleToggleTestAccount} loading={loading} navigate={navigate} officials={officials} openActionModal={openActionModal} pageButtons={pageButtons} pageCount={pageCount} pageSize={pageSize} pagedRecords={pagedRecords} setCurrentPage={setCurrentPage} setTableFilters={setTableFilters} sortConfig={sortConfig} tableColumns={tableColumns} tableFilterOptions={tableFilterOptions} tableFilters={tableFilters} totalRecords={totalRecords} user={user} viewMode={viewMode} />
                            </>
                        )}
                    </main>

                    {/* INCUMBENCY HISTORY MODAL */}
                    <IncumbencyModal incumbents={incumbents} incumbentsLoading={incumbentsLoading} selectedPosition={selectedPosition} setShowIncumbencyModal={setShowIncumbencyModal} showIncumbencyModal={showIncumbencyModal} />

                    {/* ADMIN ACTION MODAL */}
                    <ActionModal SearchableSelect={SearchableSelect} actionLoading={actionLoading} actionOfficial={actionOfficial} activeOfficials={activeOfficials} adminAction={adminAction} assigneeSlot={assigneeSlot} effectivityDate={effectivityDate} fetchUnassignedPersonnel={fetchUnassignedPersonnel} filteredVacantSlots={filteredVacantSlots} handleAdminAction={handleAdminAction} handleCancelVacate={handleCancelVacate} isAddingPersonnel={isAddingPersonnel} justification={justification} selectedOffice={selectedOffice} setAssigneeSlot={setAssigneeSlot} setEffectivityDate={setEffectivityDate} setIsAddingPersonnel={setIsAddingPersonnel} setJustification={setJustification} setSelectedOffice={setSelectedOffice} setShowActionModal={setShowActionModal} setSuccessorSlot={setSuccessorSlot} setTargetSlot={setTargetSlot} setUnassignedSearch={setUnassignedSearch} setVacateReason={setVacateReason} showActionModal={showActionModal} successorSlot={successorSlot} targetSlot={targetSlot} token={token} unassignedCacheRef={unassignedCacheRef} unassignedLoading={unassignedLoading} unassignedPersonnel={unassignedPersonnel} unassignedSearch={unassignedSearch} uniqueOffices={uniqueOffices} user={user} vacateReason={vacateReason} />

                    <ReassignOfficialModal
                        isOpen={isReassignModalOpen}
                        initialOfficial={reassignOfficialTarget}
                        onClose={() => {
                            setIsReassignModalOpen(false);
                            setReassignOfficialTarget(null);
                        }}
                        onRefresh={fetchOfficials}
                        token={token}
                    />

                    <footer className="mt-auto p-12 text-center bg-white border-t-2 border-slate-100 flex flex-col items-center gap-6">
                        <div className="space-y-1">
                            <p className="text-slate-400 text-[13.5px] font-black uppercase tracking-[0.3em]">© 2026 Department of Education • InsightEd Nexus Portal</p>
                            <p className="text-[12px] font-bold text-slate-300 uppercase tracking-widest italic">Strictly for Personnel Division Administrative Use Only</p>
                        </div>
                    </footer>
                </div>
            </AdminLayout>
        </PageTransition>
    );
};

export default OfficialsRegistry;

