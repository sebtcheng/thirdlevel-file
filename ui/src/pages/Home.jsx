import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import PageTransition from '../components/PageTransition';
import UploadDirectoryModal from '../components/UploadDirectoryModal';
import NotableAchievementsModal from '../components/NotableAchievementsModal';
import RetireesModal from '../components/RetireesModal';
import RegisterPersonnelModal from '../components/RegisterPersonnelModal';
import ReassignOfficialModal from '../components/ReassignOfficialModal';
import AnalyticsSection from './MainDashboard/components/AnalyticsSection';
import './MainDashboard/MainDashboard.css';
import { UserPlus as FiUserPlus, CloudArrowUp as FiUploadCloud, List as FiList, House as FiHome, SignOut as FiLogOut, Medal as FiAward, Clock as FiClock, CaretRight as FiChevronRight, SquaresFour as FiGrid } from '@phosphor-icons/react';
import { getOfficialRegion, getOfficialLevel, formatPositionTitle } from '../utils/officialsUtils';
import PageHeaderCard from '../components/PageHeaderCard.jsx';
import AdminLayout from '../components/layout/AdminLayout.jsx';

// Text cleaning engine from MainDashboard
const repairMojibake = (text) => {
  return String(text || "")
    .replace(/Ã‘/g, "Ñ").replace(/Ã±/g, "ñ")
    .replace(/ã‘/g, "Ñ").replace(/ã±/g, "ñ")
    .replace(/Ã/g, "Á").replace(/Ã¡/g, "á")
    .replace(/Ã‰/g, "É").replace(/Ã©/g, "é")
    .replace(/â€“/g, "–").replace(/â€”/g, "—")
    .replace(/Â /g, " ").replace(/Â/g, "");
};

const REGION_CANONICAL_MAP = {
  'CENTRAL OFFICE': 'Central Office',
  'NCR': 'NCR',
  'CAR': 'CAR',
  'NIR': 'NIR',
  'BARMM': 'BARMM',
  'CARAGA': 'CARAGA',
  'REGION I': 'Region I',
  'REGION II': 'Region II',
  'REGION III': 'Region III',
  'REGION IV-A': 'Region IV-A',
  'REGION IV-B': 'Region IV-B',
  'REGION V': 'Region V',
  'REGION VI': 'Region VI',
  'REGION VII': 'Region VII',
  'REGION VIII': 'Region VIII',
  'REGION IX': 'Region IX',
  'REGION X': 'Region X',
  'REGION XI': 'Region XI',
  'REGION XII': 'Region XII',
  'REGION XIII': 'Region XIII',
};

const ACRONYMS_AND_NUMERALS = new Set([
  'NCR', 'CAR', 'NIR', 'BARMM', 'CARAGA', 'SDO', 'RO', 'CO', 'OIC', 'TLO', 'N/A',
  'I', 'II', 'III', 'IV', 'IV-A', 'IV-B', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'
]);
const LOWER_PARTICLES = new Set(['de', 'del', 'la', 'ng', 'of', 'and', 'in', 'sa', 'at']);

const formatWord = (w, isFirst) => {
  if (!w) return '';
  const upper = w.toUpperCase();
  if (ACRONYMS_AND_NUMERALS.has(upper)) return upper;
  if (!isFirst && LOWER_PARTICLES.has(w.toLowerCase())) return w.toLowerCase();
  if (w.includes('-')) {
    return w.split('-').map((part, pIdx) => formatWord(part, isFirst && pIdx === 0)).join('-');
  }
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
};

const canonicalCell = (text) => {
  if (!text) return '';
  let v = repairMojibake(text).replace(/\s+/g, ' ').trim();
  v = v.replace(/\bLas\s+Pi(?:ñ|Ã±|ã±|ï¿½||n)as\b/gi, 'Las Piñas')
       .replace(/\bPara(?:ñ|Ã±|ã±|ï¿½||n)aque\b/gi, 'Parañaque');

  const upper = v.toUpperCase();
  if (REGION_CANONICAL_MAP[upper]) return REGION_CANONICAL_MAP[upper];
  if (upper === 'N/A') return 'N/A';

  return v.split(' ').map((word, i) => formatWord(word, i === 0)).join(' ');
};

// Map backend DB fields to UI data structure for Bar Graph
const mapOfficialRecord = (row) => {
  const name = row.first_name && row.last_name
    ? canonicalCell(`${row.first_name} ${row.last_name}`)
    : row.first_name
    ? canonicalCell(row.first_name)
    : 'VACANT POSITION';

  let status = row.status || 'Regular';
  if (row.is_oic || (row.designation && row.designation.toUpperCase().includes('OIC'))) {
    status = 'OIC';
  } else if (!row.first_name || row.first_name.toUpperCase() === 'VACANT' || row.status === 'Vacated' || row.status === 'Vacant') {
    status = 'Vacant';
  } else if (status !== 'OIC' && status !== 'Vacant') {
    status = 'Regular';
  }

  return {
    TLO_id: row.TLOid || `TLO-${String(row.id || '').padStart(4, '0')}`,
    TLOid: row.TLOid,
    Name: name,
    Position: formatPositionTitle(row.position_title) || 'Unassigned Position',
    Employment_Status: status,
    Region: canonicalCell(row.region || row.strand || 'Central Office'),
    Division: canonicalCell(row.division || 'N/A'),
    Office: canonicalCell(row.office || ''),
    Province: canonicalCell(row.province || row.region || 'NCR'),
    Municipality: canonicalCell(row.municipality || row.division || 'Pasig City'),
    Email: row.email || 'N/A'
  };
};

const THIRD_LEVEL_POSITIONS = [
  'Secretary',
  'Undersecretary',
  'Assistant Secretary',
  'Director IV',
  'Director III',
  'Regional Director',
  'Assistant Regional Director',
  'Schools Division Superintendent',
  'Assistant Schools Division Superintendent',
  'RD',
  'ARD',
  'SDS',
  'ASDS'
];


const Home = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [applications, setApplications] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [allOfficials, setAllOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRegion, setFilterRegion] = useState('All regions');
  const [filterLevel, setFilterLevel] = useState('All levels');
  const [filterOffice, setFilterOffice] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [activeQueueFilter, setActiveQueueFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNotableModalOpen, setIsNotableModalOpen] = useState(false);
  const [isRetireesModalOpen, setIsRetireesModalOpen] = useState(false);
  const [isRegisterPersonnelOpen, setIsRegisterPersonnelOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignOfficialTarget, setReassignOfficialTarget] = useState(null);

  // Drilldown Hierarchy State for Bar Graph
  const [drillLevel, setDrillLevel] = useState(0); // 0: Region, 1: Division, 2: Municipality
  const [drillPath, setDrillPath] = useState([]);
  const [drilldownViewType, setDrilldownViewType] = useState('stacked'); // stacked | heatmap

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'reassign') {
      const tloId = params.get('tloid');
      if (tloId && allOfficials.length > 0) {
        const found = allOfficials.find(o => o.TLOid === tloId);
        if (found) setReassignOfficialTarget(found);
      }
      setIsReassignModalOpen(true);
    }
  }, [location.search, allOfficials]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [appsRes, offRes] = await Promise.all([
          fetch(apiUrl('/api/third-level/officials-registry/applications'), {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(apiUrl('/api/third-level/officials-registry/officials-kpi-summary'), {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const appsData = await appsRes.json();
        const offData = await offRes.json();

        if (appsData.success) setApplications(appsData.data);
        if (offData.success) {
          setAllOfficials(offData.data);
          setOfficials(offData.data.filter(o => o.status === 'Active'));
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token, refreshTrigger]);

  const retireesThisMonth = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const retirees = [];
    allOfficials.forEach(o => {
      if (!o.first_name || o.first_name === 'VACANT') return;

      let isTurning65 = false;
      if (o.date_of_birth) {
        const dob = new Date(o.date_of_birth);
        if (!isNaN(dob.getTime())) {
          isTurning65 = (dob.getFullYear() === currentYear - 65) && (dob.getMonth() === currentMonth);
        }
      }

      let isInactiveThisMonth = false;
      let effDate = null;
      const inactiveStatuses = ['Inactive', 'Resigning', 'Vacated'];
      if (inactiveStatuses.includes(o.status) || inactiveStatuses.includes(o.employment_status)) {
        effDate = new Date(o.effectivity_date || o.updated_at);
        if (!isNaN(effDate.getTime())) {
          isInactiveThisMonth = effDate.getFullYear() === currentYear && effDate.getMonth() === currentMonth;
        }
      }

      if (isTurning65 || isInactiveThisMonth) {
        let reason = 'Mandatory Retirement';
        let displayDate = null;

        if (isTurning65 && o.date_of_birth) {
          const dob = new Date(o.date_of_birth);
          displayDate = new Date(dob.getFullYear() + 65, dob.getMonth(), dob.getDate());
        }

        if (isInactiveThisMonth) {
          let baseStatus = o.status;
          if (o.status === 'Active') {
            baseStatus = o.employment_status || 'Inactive';
          }

          if (o.vacate_reason) {
            reason = `${baseStatus} - ${o.vacate_reason}`;
          } else {
            reason = baseStatus;
          }

          if (effDate) displayDate = effDate;
        }

        retirees.push({
          ...o,
          separationReason: reason,
          separationDate: displayDate,
          isTurning65
        });
      }
    });

    return retirees;
  }, [allOfficials]);

  const applicationsThisMonth = useMemo(() => {
    const today = new Date();
    return applications.filter(app => {
      const d = new Date(app.created_at || app.updated_at);
      return !isNaN(d) && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    });
  }, [applications]);

  const elementsThisMonth = useMemo(() => {
    const today = new Date();
    return officials.filter(o => {
      const d = new Date(o.created_at || o.updated_at);
      return !isNaN(d) && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    });
  }, [officials]);

  useEffect(() => {
    if (!loading && user?.role === 'Central Office') {
      if (!sessionStorage.getItem('hasSeenRetireesPrompt')) {
        setIsRetireesModalOpen(true);
        sessionStorage.setItem('hasSeenRetireesPrompt', 'true');
      }
    }
  }, [loading, user]);

  // KPIs Logic
  const thirdLevelCount = useMemo(() => {
    return officials.filter(o => !o.is_oic && THIRD_LEVEL_POSITIONS.includes(o.position_title)).length;
  }, [officials]);

  const divisionChiefsCount = useMemo(() => {
    return officials.filter(o => !o.is_oic && !THIRD_LEVEL_POSITIONS.includes(o.position_title)).length;
  }, [officials]);

  const sortBreakdown = (counts) => {
    const order = [
      'Secretary', 'Undersecretary', 'Assistant Sec', 'Assistant Secretary',
      'Director IV', 'Director III', 'Regional Dir', 'Regional Director',
      'ARD', 'Assistant Regional Director', 'SDS', 'Schools Division Superintendent',
      'ASDS', 'Assistant Schools Division Superintendent'
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
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
    );
  };

  const thirdLevelBreakdown = useMemo(() => {
    const counts = {};
    officials.filter(o => !o.is_oic && THIRD_LEVEL_POSITIONS.includes(o.position_title)).forEach(o => {
      if (o.first_name && o.first_name !== 'VACANT') {
        const pos = o.position_title || 'Unassigned';
        counts[pos] = (counts[pos] || 0) + 1;
      }
    });
    return sortBreakdown(counts);
  }, [officials]);

  const divisionChiefsBreakdown = useMemo(() => {
    const counts = {};
    officials.filter(o => !o.is_oic && !THIRD_LEVEL_POSITIONS.includes(o.position_title)).forEach(o => {
      if (o.first_name && o.first_name !== 'VACANT') {
        const pos = o.position_title || 'Unassigned';
        counts[pos] = (counts[pos] || 0) + 1;
      }
    });
    return sortBreakdown(counts);
  }, [officials]);

  const pendingVerifications = applications.length;

  const incompleteProfiles = useMemo(() => {
    return officials.filter(o => !o.photo_binary_id || !o.pds_binary_id || !o.contact_details).length;
  }, [officials]);

  const flaggedProfiles = useMemo(() => {
    return officials.filter(o => o.pending_admin_case === 'Yes' || o.guilty_admin_details === 'Yes' || o.criminally_charged_details === 'Yes' || o.convicted_crime_details === 'Yes').length;
  }, [officials]);

  const vacantOfficials = useMemo(() => {
    return allOfficials.filter(o => o.status === 'Vacated' || o.first_name === 'VACANT' || !o.first_name);
  }, [allOfficials]);

  const anticipatedVacancies = useMemo(() => {
    const today = new Date();
    const in5Years = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());

    return officials.filter(o => {
      if (!o.date_of_birth) return false;
      const dob = new Date(o.date_of_birth);
      const retirementDate = new Date(dob.getFullYear() + 65, dob.getMonth(), dob.getDate());
      return retirementDate >= today && retirementDate <= in5Years;
    }).map(o => {
      const dob = new Date(o.date_of_birth);
      return {
        ...o,
        separationReason: 'Anticipated Retirement',
        separationDate: new Date(dob.getFullYear() + 65, dob.getMonth(), dob.getDate()),
        isTurning65: false
      };
    });
  }, [officials]);

  const anticipatedVacanciesCount = anticipatedVacancies.length;

  const inactiveOfficials = useMemo(() => {
    return allOfficials.filter(o => o.status === 'Inactive');
  }, [allOfficials]);

  const vacantRegionBreakdown = useMemo(() => {
    const counts = {};
    vacantOfficials.forEach(o => {
      const region = getOfficialRegion(o);
      counts[region] = (counts[region] || 0) + 1;
    });
    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    );
  }, [vacantOfficials]);

  const inactiveRegionBreakdown = useMemo(() => {
    const counts = {};
    inactiveOfficials.forEach(o => {
      const region = getOfficialRegion(o);
      counts[region] = (counts[region] || 0) + 1;
    });
    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    );
  }, [inactiveOfficials]);

  const incompleteRegionBreakdown = useMemo(() => {
    const counts = {};
    const incompleteOfficials = officials.filter(o => !o.photo_binary_id || !o.pds_binary_id || !o.contact_details);
    incompleteOfficials.forEach(o => {
      const region = getOfficialRegion(o);
      counts[region] = (counts[region] || 0) + 1;
    });

    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
    );
  }, [officials]);

  const pendingRegionBreakdown = useMemo(() => {
    const counts = {};
    applications.forEach(app => {
      const region = getOfficialRegion(app);
      counts[region] = (counts[region] || 0) + 1;
    });

    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
    );
  }, [applications]);

  const flaggedRegionBreakdown = useMemo(() => {
    const counts = {};
    const flaggedOfficials = officials.filter(o => o.pending_admin_case === 'Yes' || o.guilty_admin_details === 'Yes' || o.criminally_charged_details === 'Yes' || o.convicted_crime_details === 'Yes');
    flaggedOfficials.forEach(o => {
      const region = getOfficialRegion(o);
      counts[region] = (counts[region] || 0) + 1;
    });

    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
    );
  }, [officials]);

  const elementsRegionBreakdown = useMemo(() => {
    const counts = {};
    officials.forEach(o => {
      const region = getOfficialRegion(o);
      counts[region] = (counts[region] || 0) + 1;
    });

    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
    );
  }, [officials]);

  const retireesRegionBreakdown = useMemo(() => {
    const counts = {};
    retireesThisMonth.forEach(o => {
      const region = getOfficialRegion(o);
      counts[region] = (counts[region] || 0) + 1;
    });

    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
    );
  }, [officials]);

  const anticipatedRegionBreakdown = useMemo(() => {
    const counts = {};
    anticipatedVacancies.forEach(o => {
      const region = getOfficialRegion(o);
      counts[region] = (counts[region] || 0) + 1;
    });

    return Object.fromEntries(
      Object.entries(counts).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
    );
  }, [anticipatedVacancies]);

  // Action Queue: combining pending apps and incomplete profiles for display
  const actionQueue = useMemo(() => {
    let queue = [];

    // Recent applications that need review
    applications.forEach(app => {
      queue.push({
        id: app.TLOid,
        email: app.email,
        name: `${app.first_name || ''} ${app.last_name || ''}`.trim(),
        desc: `Recent profile application · ${app.target_office || 'Unassigned'}`,
        status: 'For Review',
        badgeClass: 'warn',
        type: 'pending',
        region: getOfficialRegion(app),
        level: getOfficialLevel(app)
      });
    });

    // Incomplete active profiles
    officials.filter(o => !o.photo_binary_id || !o.pds_binary_id || !o.contact_details).forEach(o => {
      queue.push({
        id: o.TLOid,
        email: o.email,
        name: `${o.first_name || ''} ${o.last_name || ''}`.trim(),
        desc: `Missing valid PDS/Photo/Contact · ${o.office || 'Unassigned'}`,
        status: 'Action Required',
        badgeClass: 'risk',
        type: 'incomplete',
        region: getOfficialRegion(o),
        level: getOfficialLevel(o)
      });
    });

    // Flagged profiles
    officials.filter(o => o.pending_admin_case === 'Yes' || o.guilty_admin_details === 'Yes' || o.criminally_charged_details === 'Yes' || o.convicted_crime_details === 'Yes').forEach(o => {
      queue.push({
        id: o.TLOid,
        email: o.email,
        name: `${o.first_name || ''} ${o.last_name || ''}`.trim(),
        desc: `Administrative/Ombudsman Case Pending`,
        status: 'Flagged',
        badgeClass: 'risk',
        type: 'expiring',
        region: getOfficialRegion(o),
        level: getOfficialLevel(o)
      });
    });

    // Separations and Retirements
    retireesThisMonth.forEach(o => {
      queue.push({
        id: o.TLOid,
        email: o.email,
        name: `${o.first_name || ''} ${o.last_name || ''}`.trim(),
        desc: `${o.separationReason} · ${o.office || 'Unassigned'}`,
        status: o.isTurning65 ? 'Retiring' : 'Separated',
        badgeClass: 'warn',
        type: 'retirees',
        region: getOfficialRegion(o),
        level: getOfficialLevel(o)
      });
    });

    // Anticipated Retirees
    anticipatedVacancies.forEach(o => {
      if (!retireesThisMonth.find(r => r.TLOid === o.TLOid)) {
        queue.push({
          id: o.TLOid,
          email: o.email,
          name: `${o.first_name || ''} ${o.last_name || ''}`.trim(),
          desc: `Anticipated Retirement (Within 5 Yrs) · ${o.office || 'Unassigned'}`,
          status: 'Anticipated',
          badgeClass: 'warn',
          type: 'retirees',
          region: getOfficialRegion(o),
          level: getOfficialLevel(o)
        });
      }
    });

    // Vacant Positions
    vacantOfficials.forEach(o => {
      queue.push({
        id: o.TLOid,
        email: o.email,
        name: `${o.first_name || ''} ${o.last_name || ''}`.trim() || 'VACANT POSITION',
        desc: `Vacant Position · ${o.office || 'Unassigned'}`,
        status: 'Vacant',
        badgeClass: 'risk',
        type: 'vacant',
        region: getOfficialRegion(o),
        level: getOfficialLevel(o)
      });
    });

    // Inactive Personnel
    inactiveOfficials.forEach(o => {
      queue.push({
        id: o.TLOid,
        email: o.email,
        name: `${o.first_name || ''} ${o.last_name || ''}`.trim(),
        desc: `Inactive Personnel · ${o.office || 'Unassigned'}`,
        status: 'Inactive',
        badgeClass: 'warn',
        type: 'inactive',
        region: getOfficialRegion(o),
        level: getOfficialLevel(o)
      });
    });

    // Third Level Officials (Only show when explicitly filtered so it doesn't flood the 'All' queue)
    if (activeQueueFilter === 'thirdLevel') {
      officials.filter(o => THIRD_LEVEL_POSITIONS.includes(o.position_title)).forEach(o => {
        queue.push({
          id: o.TLOid,
          email: o.email,
          name: `${o.first_name || ''} ${o.last_name || ''}`.trim(),
          desc: `${o.position_title || 'Unassigned'} · ${o.office || 'Unassigned'}`,
          status: 'Active',
          badgeClass: 'neutral',
          type: 'thirdLevel',
          region: getOfficialRegion(o),
          level: getOfficialLevel(o)
        });
      });
    }

    // Filter by category
    if (activeQueueFilter !== 'all') {
      queue = queue.filter(q => q.type === activeQueueFilter);
    }

    // Filter by Region
    if (filterRegion !== 'All regions') {
      queue = queue.filter(q => q.region === filterRegion);
    }

    // Filter by Level
    if (filterLevel !== 'All levels') {
      queue = queue.filter(q => q.level === filterLevel);
    }

    // Filter by Office
    if (filterOffice !== 'All') {
      queue = queue.filter(q => {
        // Find corresponding official
        const official = officials.find(o => o.TLOid === q.id);
        return official && official.office === filterOffice;
      });
    }

    // Filter by Search Name
    if (filterSearch.trim() !== '') {
      const lowerSearch = filterSearch.toLowerCase();
      queue = queue.filter(q => q.name.toLowerCase().includes(lowerSearch) || (q.email && q.email.toLowerCase().includes(lowerSearch)));
    }

    return queue.slice(0, 8);
  }, [applications, officials, filterRegion, filterLevel, filterOffice, filterSearch, activeQueueFilter, retireesThisMonth, anticipatedVacancies]);

  const activityLogs = useMemo(() => {
    let filtered = [...allOfficials];

    // Category Filter
    if (activeQueueFilter !== 'all') {
      if (activeQueueFilter === 'incomplete') {
        filtered = filtered.filter(o => o.status === 'Active' && (!o.photo_binary_id || !o.pds_binary_id || !o.contact_details));
      } else if (activeQueueFilter === 'expiring') {
        filtered = filtered.filter(o => o.status === 'Active' && (o.pending_admin_case === 'Yes' || o.guilty_admin_details === 'Yes' || o.criminally_charged_details === 'Yes' || o.convicted_crime_details === 'Yes'));
      } else if (activeQueueFilter === 'retirees') {
        const retireeIds = retireesThisMonth.map(r => r.TLOid);
        const anticipatedIds = anticipatedVacancies.map(r => r.TLOid);
        filtered = filtered.filter(o => retireeIds.includes(o.TLOid) || anticipatedIds.includes(o.TLOid));
      } else if (activeQueueFilter === 'vacant') {
        filtered = filtered.filter(o => o.status === 'Vacated' || o.first_name === 'VACANT' || !o.first_name);
      } else if (activeQueueFilter === 'inactive') {
        filtered = filtered.filter(o => o.status === 'Inactive');
      } else if (activeQueueFilter === 'thirdLevel') {
        filtered = filtered.filter(o => o.status === 'Active' && THIRD_LEVEL_POSITIONS.includes(o.position_title));
      } else if (activeQueueFilter === 'pending') {
        filtered = []; // only apps
      }
    }

    // Region Filter
    if (filterRegion !== 'All regions') {
      filtered = filtered.filter(o => getOfficialRegion(o) === filterRegion);
    }

    // Level Filter
    if (filterLevel !== 'All levels') {
      filtered = filtered.filter(o => getOfficialLevel(o) === filterLevel);
    }

    // Office Filter
    if (filterOffice !== 'All') {
      filtered = filtered.filter(o => o.office === filterOffice);
    }

    // Search Filter
    if (filterSearch.trim() !== '') {
      const lowerSearch = filterSearch.toLowerCase();
      filtered = filtered.filter(o => {
        const name = `${o.first_name || ''} ${o.last_name || ''}`.trim().toLowerCase();
        const email = (o.email || '').toLowerCase();
        return name.includes(lowerSearch) || email.includes(lowerSearch);
      });
    }

    // Include applications
    let appsToInclude = [];
    if (activeQueueFilter === 'all' || activeQueueFilter === 'pending') {
      appsToInclude = [...applications];
      
      if (filterRegion !== 'All regions') {
        appsToInclude = appsToInclude.filter(a => getOfficialRegion(a) === filterRegion);
      }
      if (filterLevel !== 'All levels') {
        appsToInclude = appsToInclude.filter(a => getOfficialLevel(a) === filterLevel);
      }
      if (filterOffice !== 'All') {
        appsToInclude = appsToInclude.filter(a => a.target_office === filterOffice || a.office === filterOffice); 
      }
      if (filterSearch.trim() !== '') {
        const lowerSearch = filterSearch.toLowerCase();
        appsToInclude = appsToInclude.filter(a => {
          const name = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
          const email = (a.email || '').toLowerCase();
          return name.includes(lowerSearch) || email.includes(lowerSearch);
        });
      }
    }

    const combined = [
      ...filtered.map(o => ({ ...o, isApp: false })),
      ...appsToInclude.map(a => ({ ...a, isApp: true }))
    ];

    return combined
      .filter(o => o.updated_at)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 8)
      .map(o => {
        const date = new Date(o.updated_at);
        const isNew = o.created_at === o.updated_at;
        let logName = `${o.first_name || ''} ${o.last_name || ''}`.trim();
        if (!logName || logName === 'VACANT') {
          if (o.previous_incumbent) {
            logName = `Previous Holder: ${o.previous_incumbent}`;
          } else {
            logName = o.isApp ? 'New Applicant' : 'Vacant Position';
          }
        }

        return {
          id: o.TLOid,
          email: o.email,
          name: logName,
          action: o.isApp ? 'Application Submitted' : (o.status === 'Vacated' ? 'Position Vacated' : (isNew ? 'Profile Created' : 'Profile Updated')),
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
      });
  }, [allOfficials, applications, filterRegion, filterLevel, filterOffice, filterSearch, activeQueueFilter, retireesThisMonth, anticipatedVacancies]);

  const toggleFilter = (filter) => {
    setActiveQueueFilter(prev => prev === filter ? 'all' : filter);
  };

  // Drilldown Navigation Handlers for Bar Graph
  const handleRowDrill = useCallback((name) => {
    if (drillLevel < 2) {
      const newLevel = drillLevel + 1;
      const newPath = [...drillPath, name];
      setDrillLevel(newLevel);
      setDrillPath(newPath);
    }
  }, [drillLevel, drillPath]);

  const handleSetDrillLevel = useCallback((level, name) => {
    setDrillLevel(level);
    if (level === 0) {
      setDrillPath([]);
    } else if (level === 1) {
      setDrillPath([name]);
    } else if (level === 2) {
      setDrillPath([drillPath[0], name]);
    }
  }, [drillPath]);

  // Drilldown Aggregations for Bar Graph
  const { groupKey, groups, maxTotal } = useMemo(() => {
    let key = 'Region';
    if (drillLevel === 1) key = 'Division';
    if (drillLevel === 2) key = 'Municipality';

    let dataToAggregate = allOfficials.map(mapOfficialRecord);

    if (drillLevel >= 1 && drillPath[0]) {
      dataToAggregate = dataToAggregate.filter(d => d.Region === drillPath[0]);
    }
    if (drillLevel >= 2 && drillPath[1]) {
      dataToAggregate = dataToAggregate.filter(d => d.Division === drillPath[1]);
    }

    const groupMap = {};
    dataToAggregate.forEach(d => {
      const gName = d[key] || 'Unassigned';
      if (!groupMap[gName]) {
        groupMap[gName] = { total: 0, regular: 0, oic: 0, vacant: 0 };
      }
      groupMap[gName].total++;
      if (d.Employment_Status === 'Regular') groupMap[gName].regular++;
      if (d.Employment_Status === 'OIC') groupMap[gName].oic++;
      if (d.Employment_Status === 'Vacant') groupMap[gName].vacant++;
    });

    const max = Math.max(...Object.values(groupMap).map(g => g.total), 1);
    return { groupKey: key, groups: groupMap, maxTotal: max };
  }, [allOfficials, drillLevel, drillPath]);

  return (
    <PageTransition>
      <AdminLayout>
        
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* TOP NAVIGATION BAR */}
          <PageHeaderCard title="Executive Dashboard" subtitle="InsightED Top-Level Metrics">
<div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[15px] font-medium text-heading leading-tight">{user?.first_name} {user?.last_name}</span>
                <span className="text-[13px] text-secondary">{user?.role}</span>
              </div>
            </div>
</PageHeaderCard>
          <style>{`
          .dashboard-wrap { padding:16px 32px 28px; }
          @media(max-width:767px){ .dashboard-wrap { padding:16px; } }
          .hero { background:var(--color-brand-800); color:white; border-radius:var(--radius-md); padding:28px; }
          .hero small { color:var(--color-gold); font-weight:600; letter-spacing:.16em; text-transform:uppercase; }
          .hero h1 { margin:10px 0 8px; font-family:var(--font-title); font-size:32px; line-height:1.25; font-weight:700; }
          .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }
          .kpi { position:relative; display:flex; flex-direction:column; background:var(--card-bg); border:var(--card-border); border-radius:var(--card-radius); padding:18px; transition:border-color 0.2s; }
          .kpi:hover { border-color:var(--color-brand-300); }
          .kpi.active-filter { background:var(--color-brand-50); outline: 3px solid var(--color-brand-300); outline-offset: -2px; }
          .kpi p { order:1; margin:0; color:var(--color-heading); font-family:var(--font-ui); font-size:15px; font-weight:600; }
          .kpi h2 { order:3; margin:12px 0 0; font-family:var(--font-data); font-size:32px; line-height:1.25; font-weight:700; color:var(--color-brand-800); }
          .kpi > div:not(.kpi-subheader):not(.kpi-tooltip) { order:3; margin-top:12px; }
          .kpi > div:not(.kpi-subheader):not(.kpi-tooltip) h2 { margin:0; }
          .kpi > div:not(.kpi-subheader):not(.kpi-tooltip) { display:flex; align-items:center; gap:12px; }
          .kpi > div:not(.kpi-subheader):not(.kpi-tooltip) h2 { order:1; }
          .kpi > div:not(.kpi-subheader):not(.kpi-tooltip) span { order:2; }
          .kpi .kpi-subheader { order:2; margin-top:2px; font-family:var(--font-body); font-size:13px; line-height:1.45; font-weight:400; color:var(--color-secondary); display:block; }
          .kpi-tooltip { position:absolute; right:0; top:100%; margin-top:8px; width:280px; background:rgb(var(--rgb-white)/0.95); backdrop-filter:blur(8px); border:1px solid var(--color-muted); border-radius:var(--radius-md); box-shadow:var(--shadow-lg); padding:16px; opacity:0; pointer-events:none; transition:all 0.2s; z-index:60; max-height:400px; overflow-y:auto; }
          .kpi:first-child .kpi-tooltip { right:auto; left:0; }
          .kpi-tooltip::-webkit-scrollbar { width: 4px; }
          .kpi-tooltip::-webkit-scrollbar-thumb { background-color: var(--color-muted); border-radius: var(--radius-md); }
          .kpi:hover .kpi-tooltip { opacity:1; pointer-events:auto; }
          .kpi-tooltip h4 { margin:0 0 12px; font-size:10px; font-weight:600; color:var(--color-secondary); text-transform:uppercase; letter-spacing:0.1em; border-bottom:1px solid var(--color-brand-50); padding-bottom:8px; }
          .kpi-tooltip-row { display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid var(--color-brand-50); font-size:12px; }
          .kpi-tooltip-row:last-child { border-bottom:0; }
          .kpi-tooltip-row span.label { color:var(--color-secondary); font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:8px; }
          .kpi-tooltip-row span.count { color:var(--color-heading); font-weight:600; background:var(--color-brand-100); padding:2px 8px; border-radius:var(--radius-md); }
          .grid-layout { display:grid; grid-template-columns:1.2fr 1fr 280px; gap:16px; margin-top:16px; }
          .dash-card { background:var(--card-bg); border:var(--card-border); box-shadow:var(--card-shadow); border-radius:var(--card-radius); overflow:hidden; display:flex; flex-direction:column; }
          .dash-head { padding:18px 20px; border-bottom:1px solid var(--color-muted); }
          .dash-head h3 { margin:0; color:var(--color-brand-800); font-family:var(--font-ui); font-size:20px; font-weight:600; }
          .dash-head p { margin:4px 0 0; color:var(--color-secondary); font-size:0.875rem; }
          .chips { padding:14px 20px; border-bottom:1px solid var(--color-muted); display:flex; gap:8px; flex-wrap:wrap; }
          .chip { background:var(--color-brand-100); color:var(--color-brand-700); border-radius:var(--radius-md); padding:8px 12px; font-size:12px; font-weight:600; }
          .queue-row { display:grid; grid-template-columns:1fr auto; gap:12px; padding:16px 20px; border-bottom:1px solid var(--color-brand-50); align-items:center; cursor:pointer; transition:background 0.2s; }
          .queue-row:hover { background:var(--color-brand-50); }
          .queue-row strong { display:block; color:var(--color-heading); font-family:var(--font-title); font-size:1rem; font-weight:700; } 
          .queue-row span { color:var(--color-secondary); font-size:12px; }
          .queue-badge { border-radius:var(--radius-md); padding:8px 10px; font-size:11px; font-weight:600; height:max-content; white-space:nowrap; }
          .queue-badge.warn { background:var(--color-warning-50); color:var(--color-warning-700); } 
          .queue-badge.risk { background:var(--color-danger-50); color:var(--color-danger-700); }
          .queue-badge.neutral { background:var(--color-brand-50); color:var(--color-secondary); }
          .side { padding:18px; display:grid; gap:10px; align-content:start; }
          .action-btn { border:1px solid var(--color-brand-300); background:var(--color-brand-50); border-radius:var(--radius-md); padding:14px; font-weight:600; color:var(--color-brand-800); cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:8px; justify-content:center; }
          .action-btn:hover { background:var(--color-brand-100); border-color:var(--color-brand-300); }
          .action-btn.primary { background:var(--color-brand-700); color:white; border-color:var(--color-brand-700); }
          .action-btn.primary:hover { background:var(--color-brand-700); border-color:var(--color-brand-700); }
          .log-row { padding:16px 20px; border-bottom:1px solid var(--color-brand-50); display:flex; flex-direction:column; gap:6px; cursor:pointer; transition:background 0.2s; }
          .log-row:hover { background:var(--color-brand-50); }
          .log-row:last-child { border-bottom:none; }
          .log-row strong { color:var(--color-heading); font-family:var(--font-title); font-size:1rem; font-weight:700; }
          .log-row .meta { display:flex; justify-content:space-between; align-items:center; }
          .log-row .time { color:var(--color-secondary); font-size:11px; font-weight:700; display:flex; align-items:center; gap:4px; }
          .log-row .action { font-size:11px; padding:4px 8px; border-radius:var(--radius-md); font-weight:800; text-transform:uppercase; letter-spacing:0.05em; }
          .log-row .action.updated { background:var(--color-brand-100); color:var(--color-brand-700); }
          .log-row .action.created { background:var(--color-success-50); color:var(--color-success-700); }
          @media(max-width:1024px){
            .grid-layout { grid-template-columns:1fr 1fr; }
            .grid-layout > aside { grid-column: span 2; }
          }
          @media(max-width:800px){ 
            .kpis { grid-template-columns:repeat(2,1fr); }
            .grid-layout { grid-template-columns:1fr; } 
            .grid-layout > aside { grid-column: span 1; }
            .hero h1 { font-size:32px; } 
          }
          @media(max-width:500px){ 
            .kpis { grid-template-columns:1fr; }
          }
        `}</style>

          <div className="dashboard-wrap">
            <section className="kpis">
              <div className={`kpi ${activeQueueFilter === 'thirdLevel' ? 'active-filter' : ''}`} onClick={() => toggleFilter('thirdLevel')} style={{ cursor: 'pointer', outlineColor: 'var(--color-brand-300)' }}>
                <p>Total Third Level Officials</p>
                <h2>{loading ? '-' : thirdLevelCount}</h2>
                <div className="kpi-subheader">Active assigned personnel</div>
                <div className="kpi-tooltip" onClick={e => e.stopPropagation()}>
                  <h4>Position Breakdown</h4>
                  {Object.keys(thirdLevelBreakdown).length > 0 ? Object.entries(thirdLevelBreakdown).map(([position, count], idx) => (
                    <div key={position} className="kpi-tooltip-row">
                      <span className="label" title={position}>
                        <span className="text-slate-400 font-black mr-1">{idx + 1}.</span> {position}
                      </span>
                      <span className="count">{count}</span>
                    </div>
                  )) : (
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">No records</div>
                  )}
                </div>
              </div>
              <div className={`kpi amber ${activeQueueFilter === 'incomplete' ? 'active-filter' : ''}`} onClick={() => toggleFilter('incomplete')} style={{ cursor: 'pointer' }}>
                <p>Complete Profiles</p>
                <div className="flex items-center gap-3 mt-2">
                  <h2 className="!mt-0">{loading ? '-' : (officials.length - incompleteProfiles)}</h2>
                  <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-md border border-rose-100">-{incompleteProfiles} Deficit</span>
                </div>
                <div className="kpi-subheader mt-1">100% compliant records</div>
                <div className="kpi-tooltip" onClick={e => e.stopPropagation()}>
                  <h4>Incomplete Profiles by Region</h4>
                  {Object.keys(incompleteRegionBreakdown).length > 0 ? Object.entries(incompleteRegionBreakdown).map(([region, count], idx) => (
                    <div key={region} className="kpi-tooltip-row">
                      <span className="label" title={region}>
                        <span className="text-slate-400 font-black mr-1">{idx + 1}.</span> {region}
                      </span>
                      <span className="count bg-rose-50 text-rose-600">{count}</span>
                    </div>
                  )) : (
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">All complete</div>
                  )}
                </div>
              </div>
              <div className={`kpi purple ${activeQueueFilter === 'retirees' ? 'active-filter' : ''}`} onClick={() => toggleFilter('retirees')} style={{ cursor: 'pointer' }}>
                <p>Anticipated Vacancies</p>
                <div className="flex items-center gap-3 mt-2">
                  <h2 className="!mt-0">{loading ? '-' : anticipatedVacanciesCount}</h2>
                  <span className="text-purple-500 text-[10px] font-black uppercase tracking-widest bg-purple-50 px-2 py-1 rounded-md border border-purple-100" title="Separating this month">{loading ? '-' : retireesThisMonth.length} Separating</span>
                </div>
                <div className="kpi-subheader mt-1">Retiring within 5 years</div>
                <div className="kpi-tooltip" onClick={e => e.stopPropagation()}>
                  <h4>Region Breakdown</h4>
                  {Object.keys(anticipatedRegionBreakdown).length > 0 ? Object.entries(anticipatedRegionBreakdown).map(([region, count], idx) => (
                    <div key={region} className="kpi-tooltip-row">
                      <span className="label" title={region}>
                        <span className="text-slate-400 font-black mr-1">{idx + 1}.</span> {region}
                      </span>
                      <span className="count">{count}</span>
                    </div>
                  )) : (
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">No records</div>
                  )}
                </div>
              </div>
              <div className={`kpi red ${activeQueueFilter === 'vacant' ? 'active-filter' : ''}`} onClick={() => toggleFilter('vacant')} style={{ cursor: 'pointer' }}>
                <p>Total Vacant Positions</p>
                <h2>{loading ? '-' : vacantOfficials.length}</h2>
                <div className="kpi-subheader">Unfilled positions</div>
                <div className="kpi-tooltip" onClick={e => e.stopPropagation()}>
                  <h4>Region Breakdown</h4>
                  {Object.keys(vacantRegionBreakdown).length > 0 ? Object.entries(vacantRegionBreakdown).map(([region, count], idx) => (
                    <div key={region} className="kpi-tooltip-row">
                      <span className="label" title={region}>
                        <span className="text-slate-400 font-black mr-1">{idx + 1}.</span> {region}
                      </span>
                      <span className="count">{count}</span>
                    </div>
                  )) : (
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">No records</div>
                  )}
                </div>
              </div>
              <div className={`kpi blue ${activeQueueFilter === 'inactive' ? 'active-filter' : ''}`} onClick={() => toggleFilter('inactive')} style={{ cursor: 'pointer' }}>
                <p>Total Inactive Personnel</p>
                <h2>{loading ? '-' : inactiveOfficials.length}</h2>
                <div className="kpi-subheader">Personnel off duty</div>
                <div className="kpi-tooltip" onClick={e => e.stopPropagation()}>
                  <h4>Region Breakdown</h4>
                  {Object.keys(inactiveRegionBreakdown).length > 0 ? Object.entries(inactiveRegionBreakdown).map(([region, count], idx) => (
                    <div key={region} className="kpi-tooltip-row">
                      <span className="label" title={region}>
                        <span className="text-slate-400 font-black mr-1">{idx + 1}.</span> {region}
                      </span>
                      <span className="count">{count}</span>
                    </div>
                  )) : (
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">No records</div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid-layout">
              <main className="dash-card">
                <div className="dash-head flex justify-between items-center">
                  <div>
                    <h3>Action Queue</h3>
                    <p>
                      {activeQueueFilter === 'all' && "Records requiring review or correction."}
                      {activeQueueFilter === 'pending' && "Showing only pool of applicants."}
                      {activeQueueFilter === 'incomplete' && "Showing only incomplete profiles."}
                      {activeQueueFilter === 'expiring' && "Showing only profiles with pending cases/expiring IDs."}
                      {activeQueueFilter === 'retirees' && "Showing separations and retirees for this month."}
                    </p>
                  </div>
                  {(activeQueueFilter !== 'all' || filterRegion !== 'All regions' || filterLevel !== 'All levels' || filterOffice !== 'All' || filterSearch !== '') && (
                    <button
                      onClick={() => {
                        setActiveQueueFilter('all');
                        setFilterRegion('All regions');
                        setFilterLevel('All levels');
                        setFilterOffice('All');
                        setFilterSearch('');
                      }}
                      className="text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div className="chips">
                  <span className="chip">Status</span>
                  <span className="chip">Department</span>
                  <span className="chip">Missing ID</span>
                  <span className="chip">Flagged</span>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-slate-400 font-bold text-sm">Loading queue...</div>
                ) : actionQueue.length > 0 ? (
                  actionQueue.map((item, idx) => (
                    <div key={idx} className="queue-row" onClick={() => navigate(item.email ? `/official-profiling?email=${encodeURIComponent(item.email)}` : '/officials-registry')}>
                      <div>
                        <strong>{item.name || 'Unknown User'}</strong>
                        <span>{item.desc}</span>
                      </div>
                      <b className={`queue-badge ${item.badgeClass}`}>{item.status}</b>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 font-bold text-sm">No pending actions</div>
                )}
              </main>

              <main className="dash-card">
                <div className="dash-head flex justify-between items-center">
                  <div>
                    <h3>Activity Logs</h3>
                    <p>
                      {activeQueueFilter === 'all' && filterRegion === 'All regions' && filterLevel === 'All levels' && filterOffice === 'All' && filterSearch === '' 
                        ? "Recent profile updates and creations." 
                        : "Showing filtered recent activity."}
                    </p>
                  </div>
                  {(activeQueueFilter !== 'all' || filterRegion !== 'All regions' || filterLevel !== 'All levels' || filterOffice !== 'All' || filterSearch !== '') && (
                    <button
                      onClick={() => {
                        setActiveQueueFilter('all');
                        setFilterRegion('All regions');
                        setFilterLevel('All levels');
                        setFilterOffice('All');
                        setFilterSearch('');
                      }}
                      className="text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div className="chips">
                  <span className="chip">Personnel</span>
                  <span className="chip">Timestamp</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center text-slate-400 font-bold text-sm">Loading logs...</div>
                  ) : activityLogs.length > 0 ? (
                    activityLogs.map((log, idx) => (
                      <div key={idx} className="log-row" onClick={() => navigate(log.email ? `/official-profiling?email=${encodeURIComponent(log.email)}` : '/officials-registry')}>
                        <strong>{log.name}</strong>
                        <div className="meta">
                          <span className={`action ${log.action === 'Profile Created' ? 'created' : 'updated'}`}>{log.action}</span>
                          <span className="time"><FiClock /> {log.date} at {log.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 font-bold text-sm">No recent activity</div>
                  )}
                </div>
              </main>

              <aside className="dash-card side">
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  className={`action-btn primary ${user?.role !== 'Central Office' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  onClick={() => setIsUploadModalOpen(true)}
                  disabled={user?.role !== 'Central Office'}
                  title={user?.role !== 'Central Office' ? 'Only Central Office can upload directory data.' : ''}
                >
                  <FiUploadCloud />Upload Officials Directory Data
                </button>
                <button
                  className={`action-btn primary ${user?.role !== 'Central Office' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  onClick={() => setIsRegisterPersonnelOpen(true)}
                  disabled={user?.role !== 'Central Office'}
                  title={user?.role !== 'Central Office' ? 'Only Central Office can register personnel.' : ''}
                >
                  <FiUserPlus />Register Third Level Personnel
                </button>
                <button
                  className={`action-btn primary ${user?.role !== 'Central Office' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  onClick={() => setIsReassignModalOpen(true)}
                  disabled={user?.role !== 'Central Office'}
                  title={user?.role !== 'Central Office' ? 'Only Central Office can reassign officials.' : ''}
                >
                  <FiList />Reassign Official
                </button>
                <button
                  className="action-btn primary"
                  onClick={() => navigate('/notable-achievements')}
                >
                  <FiAward />Notable Achievements
                </button>
              </aside>
            </section>

            {/* Geographic & Organizational Drilldown Bar Graph */}
            <div className="mt-6">
              <AnalyticsSection
                drillLevel={drillLevel}
                drillPath={drillPath}
                drilldownViewType={drilldownViewType}
                groups={groups}
                maxTotal={maxTotal}
                groupKey={groupKey}
                onToggleView={() => setDrilldownViewType(prev => prev === 'stacked' ? 'heatmap' : 'stacked')}
                onSetDrillLevel={handleSetDrillLevel}
                onRowDrill={handleRowDrill}
              />
            </div>
          </div>
        </div>
      </AdminLayout>
      <UploadDirectoryModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
      <RegisterPersonnelModal
        isOpen={isRegisterPersonnelOpen}
        onClose={() => setIsRegisterPersonnelOpen(false)}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        token={token}
      />
      <ReassignOfficialModal
        isOpen={isReassignModalOpen}
        initialOfficial={reassignOfficialTarget}
        onClose={() => {
          setIsReassignModalOpen(false);
          setReassignOfficialTarget(null);
        }}
        onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        token={token}
      />
      <NotableAchievementsModal
        isOpen={isNotableModalOpen}
        onClose={() => setIsNotableModalOpen(false)}
        onSuccess={() => { }}
      />
      <RetireesModal
        isOpen={isRetireesModalOpen}
        onClose={() => setIsRetireesModalOpen(false)}
        retirees={anticipatedVacancies}
        applicationsThisMonth={applicationsThisMonth}
        elementsThisMonth={elementsThisMonth}
      />
    </PageTransition>
  );
};

export default Home;
