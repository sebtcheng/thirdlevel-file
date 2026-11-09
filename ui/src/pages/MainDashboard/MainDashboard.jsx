import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';
import { formatPositionTitle } from '../../utils/officialsUtils';

// Subcomponents
import DashboardHeader from './components/DashboardHeader';
import FilterPanel from './components/FilterPanel';
import KPISection from './components/KPISection';
import AnalyticsSection from './components/AnalyticsSection';
import CompositionChart from './components/CompositionChart';
import RiskChart from './components/RiskChart';
import MasterTable from './components/MasterTable';
import DetailModal from './components/DetailModal';
import CategoryPickerModal from './components/CategoryPickerModal';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorState from './components/ErrorState';

import './MainDashboard.css';
import AdminLayout from '../../components/layout/AdminLayout.jsx';

// Text cleaning engine
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

// Map backend DB fields to UI data structure
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

  // Calculate Service Years from effectivity date if present
  let serviceYears = 0;
  if (row.effectivity_date) {
    const effYear = new Date(Number(row.effectivity_date)).getFullYear();
    if (!isNaN(effYear) && effYear > 1950) {
      serviceYears = Math.max(0, new Date().getFullYear() - effYear);
    }
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
    Email: row.email || 'N/A',
    ServiceYears: serviceYears,
    Issue: !!(row.pending_admin_case || status === 'OIC' || status === 'Vacant')
  };
};

const MainDashboard = () => {
  const { token } = useAuth();

  // Primary Data State
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOfficeType, setSelectedOfficeType] = useState('');

  // Advanced Mode Controls
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [globalDistribution, setGlobalDistribution] = useState('Position');
  const [selectedUnit, setSelectedUnit] = useState('count');
  const [jurisdiction, setJurisdiction] = useState('municipality');

  // Drilldown Hierarchy State
  const [drillLevel, setDrillLevel] = useState(0); // 0: Region, 1: Division, 2: Municipality
  const [drillPath, setDrillPath] = useState([]);
  const [drilldownViewType, setDrilldownViewType] = useState('stacked'); // stacked | heatmap

  // Chart View States
  const [donutViewType, setDonutViewType] = useState('donut'); // donut | histogram
  const [issueViewType, setIssueViewType] = useState('histogram'); // histogram | donut

  // Table Search, Sorting, & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('TLO_id');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal States
  const [detailModalRow, setDetailModalRow] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Fetch Master Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/third-level/officials-registry/officials-kpi-summary'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped = json.data.map(mapOfficialRecord);
        setAllData(mapped);
      } else {
        throw new Error(json.error || 'Failed to parse official registry records');
      }
    } catch (err) {
      console.error('MainDashboard Fetch Error:', err);
      setError(err.message || 'Connection error while loading dashboard dataset.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Filter Options
  const regions = useMemo(() => {
    return Array.from(new Set(allData.map(d => d.Region).filter(Boolean))).sort();
  }, [allData]);

  const divisions = useMemo(() => {
    if (!selectedRegion) return [];
    return Array.from(new Set(allData.filter(d => d.Region === selectedRegion).map(d => d.Division).filter(Boolean))).sort();
  }, [allData, selectedRegion]);

  const officeTypes = useMemo(() => {
    const divisionNames = new Set(allData.map(d => d.Division).filter(Boolean));
    return Array.from(new Set(
      allData
        .map(d => d.Office)
        .filter(o => o && o !== 'Main Station' && !divisionNames.has(o))
    )).sort();
  }, [allData]);

  const categoryList = useMemo(() => {
    return Array.from(new Set(allData.map(d => formatPositionTitle(d.Position)).filter(Boolean))).sort();
  }, [allData]);

  // Filter Cascade Handlers
  const handleRegionChange = useCallback((regionVal) => {
    setSelectedRegion(regionVal);
    setSelectedDivision('');
    if (regionVal) {
      setDrillLevel(1);
      setDrillPath([regionVal]);
    } else {
      setDrillLevel(0);
      setDrillPath([]);
    }
    setCurrentPage(1);
  }, []);

  const handleDivisionChange = useCallback((divVal) => {
    setSelectedDivision(divVal);
    if (divVal && selectedRegion) {
      setDrillLevel(2);
      setDrillPath([selectedRegion, divVal]);
    }
    setCurrentPage(1);
  }, [selectedRegion]);

  const handleResetFilters = useCallback(() => {
    setSelectedRegion('');
    setSelectedDivision('');
    setSelectedStatus('');
    setSelectedOfficeType('');
    setSearchQuery('');
    setDrillLevel(0);
    setDrillPath([]);
    setCurrentPage(1);
  }, []);

  // Filtered Master Dataset
  const filteredData = useMemo(() => {
    return allData.filter(d => {
      if (selectedRegion && d.Region !== selectedRegion) return false;
      if (selectedDivision && d.Division !== selectedDivision) return false;
      if (selectedStatus && d.Employment_Status !== selectedStatus) return false;
      if (selectedOfficeType && d.Office !== selectedOfficeType) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(d.Position)) return false;
      return true;
    });
  }, [allData, selectedRegion, selectedDivision, selectedStatus, selectedOfficeType, selectedCategories]);

  // KPI Computations
  const kpiMetrics = useMemo(() => {
    const totalCount = filteredData.length;
    const totalYears = filteredData.reduce((sum, d) => sum + (d.ServiceYears || 0), 0);
    const regularCount = filteredData.filter(d => d.Employment_Status === 'Regular').length;
    const oicCount = filteredData.filter(d => d.Employment_Status === 'OIC').length;
    const vacantCount = filteredData.filter(d => d.Employment_Status === 'Vacant').length;

    return { totalCount, totalYears, regularCount, oicCount, vacantCount };
  }, [filteredData]);

  // Drilldown Aggregations
  const { groupKey, groups, maxTotal } = useMemo(() => {
    let key = 'Region';
    if (drillLevel === 1) key = 'Division';
    if (drillLevel === 2) key = 'Municipality';

    const groupMap = {};
    filteredData.forEach(d => {
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
  }, [filteredData, drillLevel]);

  const handleRowDrill = useCallback((name) => {
    if (drillLevel < 2) {
      const newLevel = drillLevel + 1;
      const newPath = [...drillPath, name];
      setDrillLevel(newLevel);
      setDrillPath(newPath);
      if (newLevel === 1) setSelectedRegion(name);
      if (newLevel === 2) setSelectedDivision(name);
    }
  }, [drillLevel, drillPath]);

  const handleSetDrillLevel = useCallback((level, name) => {
    setDrillLevel(level);
    if (level === 0) {
      setDrillPath([]);
      setSelectedRegion('');
      setSelectedDivision('');
    } else if (level === 1) {
      setDrillPath([name]);
      setSelectedRegion(name);
      setSelectedDivision('');
    } else if (level === 2) {
      setDrillPath([drillPath[0], name]);
      setSelectedDivision(name);
    }
  }, [drillPath]);

  // Composition Chart Counts
  const compositionCounts = useMemo(() => {
    return {
      Regular: kpiMetrics.regularCount,
      OIC: kpiMetrics.oicCount,
      Vacant: kpiMetrics.vacantCount
    };
  }, [kpiMetrics]);

  // Risk Flag Counts
  const issueCount = useMemo(() => {
    return filteredData.filter(d => d.Issue).length;
  }, [filteredData]);

  // Table Search, Sorting, & Pagination
  const searchFilteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredData;

    return filteredData.filter(d => (
      d.Name.toLowerCase().includes(q) ||
      d.Position.toLowerCase().includes(q) ||
      d.Office.toLowerCase().includes(q) ||
      d.TLO_id.toLowerCase().includes(q) ||
      d.Region.toLowerCase().includes(q) ||
      d.Division.toLowerCase().includes(q)
    ));
  }, [filteredData, searchQuery]);

  const sortedData = useMemo(() => {
    const list = [...searchFilteredData];
    list.sort((a, b) => {
      const valA = a[sortColumn] || '';
      const valB = b[sortColumn] || '';
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return list;
  }, [searchFilteredData, sortColumn, sortAsc]);

  const totalRows = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const startRow = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);

  const handleSort = useCallback((col) => {
    if (sortColumn === col) {
      setSortAsc(prev => !prev);
    } else {
      setSortColumn(col);
      setSortAsc(true);
    }
  }, [sortColumn]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Category Modal Handlers
  const handleSelectTop5 = useCallback(() => {
    setSelectedCategories(categoryList.slice(0, 5));
  }, [categoryList]);

  const handleSelectAll = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const handleClearCategories = useCallback(() => {
    setSelectedCategories(['__NONE__']);
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        
        <LoadingSpinner />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        
        <div className="mdb-container" style={{ padding: '40px' }}>
          <ErrorState error={error} onRetry={fetchData} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      

      <div className="flex-1 flex flex-col min-w-0 relative mdb-container">
        {/* TOP NAVIGATION BAR */}
        <DashboardHeader recordCount={filteredData.length} />

        <main className="mdb-main">
          {/* Main Content Container */}
          <div className="mdb-content">
            {/* Filter & Data Controls Card */}
            <FilterPanel
              regions={regions}
              divisions={divisions}
              officeTypes={officeTypes}
              selectedRegion={selectedRegion}
              selectedDivision={selectedDivision}
              selectedStatus={selectedStatus}
              selectedOfficeType={selectedOfficeType}
              isAdvancedMode={isAdvancedMode}
              globalDistribution={globalDistribution}
              selectedUnit={selectedUnit}
              jurisdiction={jurisdiction}
              onRegionChange={handleRegionChange}
              onDivisionChange={handleDivisionChange}
              onStatusChange={(val) => { setSelectedStatus(val); setCurrentPage(1); }}
              onOfficeTypeChange={(val) => { setSelectedOfficeType(val); setCurrentPage(1); }}
              onDistributionChange={setGlobalDistribution}
              onUnitChange={setSelectedUnit}
              onJurisdictionChange={setJurisdiction}
              onResetFilters={handleResetFilters}
              onToggleAdvancedMode={() => setIsAdvancedMode(prev => !prev)}
              onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
            />

            {/* KPI Metrics Grid */}
            <KPISection kpiData={kpiMetrics} />

            {/* Geographic & Organizational Drilldown Analytics Card */}
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

            {/* Dual Side-by-Side Chart Panels */}
            <div className="mdb-dual-grid">
              <CompositionChart
                counts={compositionCounts}
                total={filteredData.length || 1}
                viewType={donutViewType}
                onToggleView={() => setDonutViewType(prev => prev === 'donut' ? 'histogram' : 'donut')}
              />

              <RiskChart
                issueCount={issueCount}
                totalCount={filteredData.length || 1}
                viewType={issueViewType}
                onToggleView={() => setIssueViewType(prev => prev === 'histogram' ? 'donut' : 'histogram')}
              />
            </div>

            {/* Master Records Registry Table */}
            <MasterTable
              paginatedRows={paginatedRows}
              totalRows={totalRows}
              startRow={startRow}
              endRow={endRow}
              currentPage={currentPage}
              totalPages={totalPages}
              searchQuery={searchQuery}
              sortColumn={sortColumn}
              sortAsc={sortAsc}
              onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
              onSort={handleSort}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              onRowClick={(row) => setDetailModalRow(row)}
            />
          </div>
        </main>
      </div>

      {/* Official Detail Modal Popover */}
      <DetailModal
        row={detailModalRow}
        onClose={() => setDetailModalRow(null)}
      />

      {/* Category Picker Modal */}
      <CategoryPickerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categoryList}
        selectedCategories={selectedCategories}
        onSelectTop5={handleSelectTop5}
        onSelectAll={handleSelectAll}
        onClear={handleClearCategories}
      />
    </AdminLayout>
  );
};

export default MainDashboard;
