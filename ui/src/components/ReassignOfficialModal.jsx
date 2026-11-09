import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X as FiX, MagnifyingGlass as FiSearch, ArrowRight as FiArrowRight, CloudArrowUp as FiUploadCloud, WarningCircle as FiAlertCircle, Check as FiCheck, CaretDown as FiChevronDown } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import { apiUrl } from '../utils/api';
import ModernDatePicker from './ModernDatePicker';
import FloatingLabelInput from './forms/FloatingLabelInput.jsx';
import FormErrorSummary from './forms/FormErrorSummary.jsx';

// ─── Helper ──────────────────────────────────────────────────────────────────
const isSuffixPlaceholder = (suffix) => {
  if (!suffix) return true;
  const s = String(suffix).trim().toLowerCase();
  return s === '' || s === 'not applicable' || s === 'not apllicable' || s === 'na' || s === 'n/a' || s === 'none';
};

const sanitizeSuffix = (suffix) => {
  if (isSuffixPlaceholder(suffix)) return '';
  return String(suffix).trim();
};

const fullName = (o) => {
  const suffix = sanitizeSuffix(o?.suffix);
  return `${o?.first_name || ''} ${o?.middle_name ? o.middle_name + ' ' : ''}${o?.last_name || ''}${suffix ? ' ' + suffix : ''}`.trim();
};

// ─── Designation Combobox Component ─────────────────────────────────────────
const DesignationCombobox = ({ value, onChange, options = [], placeholder = 'e.g. Officer-in-Charge, Regional Director…' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'regular' | 'oic'
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 300 });

  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const preferredHeight = 320;
      
      // Flip up if space below is limited
      if (spaceBelow < 220 && rect.top > spaceBelow) {
        const topPos = Math.max(10, rect.top - Math.min(preferredHeight, rect.top - 20) - 6);
        setDropdownPos({
          top: topPos,
          left: rect.left,
          width: rect.width,
          maxHeight: Math.min(preferredHeight, rect.top - 20)
        });
      } else {
        setDropdownPos({
          top: rect.bottom + 6,
          left: rect.left,
          width: rect.width,
          maxHeight: Math.min(preferredHeight, Math.max(180, spaceBelow - 16))
        });
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, value]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const query = (value || '').trim().toLowerCase();
  
  const filteredOptions = useMemo(() => {
    let list = options;
    if (filterTab === 'regular') {
      list = list.filter(item => !/^OIC\b/i.test(item.trim()));
    } else if (filterTab === 'oic') {
      list = list.filter(item => /^OIC\b/i.test(item.trim()));
    }

    if (!query) return list;
    return list.filter(item => item.toLowerCase().includes(query));
  }, [options, filterTab, query]);

  const regularCount = useMemo(() => options.filter(item => !/^OIC\b/i.test(item.trim())).length, [options]);
  const oicCount = useMemo(() => options.filter(item => /^OIC\b/i.test(item.trim())).length, [options]);

  const handleSelect = (item) => {
    onChange(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const renderHighlighted = (text) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text;
    const before = text.substring(0, idx);
    const match = text.substring(idx, idx + query.length);
    const after = text.substring(idx + query.length);
    return (
      <>
        {before}
        <span className="bg-sky-200/80 text-brand-700 font-black rounded-lg px-0.5">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <FloatingLabelInput label={placeholder} className="w-full" ref={inputRef} type="text" value={value} onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }} onFocus={() => {
            updatePosition();
            setIsOpen(true);
          }} onKeyDown={handleKeyDown} placeholder={placeholder} style={{
            background: 'var(--color-white)',
            border: isOpen ? '2px solid var(--color-brand-700)' : '2px solid var(--color-muted)',
            boxShadow: isOpen ? '0 0 0 3px rgb(var(--rgb-brand-700)/0.12)' : 'none'
          }} />

        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              title="Clear selection"
            >
              <FiX size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else {
                updatePosition();
                setIsOpen(true);
                inputRef.current?.focus();
              }
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <FiChevronDown size={18} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: dropdownPos.maxHeight || 300,
            zIndex: 999999
          }}
          className="flex flex-col bg-white rounded-card border-2 border-sky-200 shadow-[0_20px_45px_-10px_rgb(var(--rgb-brand-800)/0.28)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Category Filter Tabs */}
          <div className="flex items-center gap-1.5 p-2 bg-gradient-to-r from-sky-50 to-slate-50 border-b-2 border-sky-100 shrink-0">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setFilterTab('all'); }}
              className={`px-2.5 py-1 rounded-lg text-[16.5px] font-black transition-all flex items-center gap-1 ${
                filterTab === 'all'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-sky-100/60 border-2 border-slate-200/60'
              }`}
            >
              <span>All</span>
              <span className={`text-[13.5px] px-1.5 py-0.2 rounded-full font-bold ${filterTab === 'all' ? 'bg-sky-900/40 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {options.length}
              </span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setFilterTab('regular'); }}
              className={`px-2.5 py-1 rounded-lg text-[16.5px] font-black transition-all flex items-center gap-1 ${
                filterTab === 'regular'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-sky-100/60 border-2 border-slate-200/60'
              }`}
            >
              <span>Regular</span>
              <span className={`text-[13.5px] px-1.5 py-0.2 rounded-full font-bold ${filterTab === 'regular' ? 'bg-sky-900/40 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {regularCount}
              </span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setFilterTab('oic'); }}
              className={`px-2.5 py-1 rounded-lg text-[16.5px] font-black transition-all flex items-center gap-1 ${
                filterTab === 'oic'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-sky-100/60 border-2 border-slate-200/60'
              }`}
            >
              <span>OIC</span>
              <span className={`text-[13.5px] px-1.5 py-0.2 rounded-full font-bold ${filterTab === 'oic' ? 'bg-sky-900/40 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {oicCount}
              </span>
            </button>
          </div>

          {/* Options Scrollable List */}
          <div className="overflow-y-auto flex-1 divide-y-2 divide-slate-100">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.toLowerCase() === (value || '').trim().toLowerCase();
                const isHighlighted = idx === highlightedIndex;
                const isOIC = /^OIC\b/i.test(opt.trim());

                return (
                  <div
                    key={opt}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-100/80 text-brand-700 font-black'
                        : isHighlighted
                        ? 'bg-sky-50/90 text-slate-800 font-bold'
                        : 'hover:bg-sky-50/50 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className={`text-[15px] font-black px-1.5 py-0.5 rounded-lg shrink-0 tracking-wider uppercase ${
                        isOIC
                          ? 'bg-amber-100/80 text-amber-800 border-2 border-amber-300/60'
                          : 'bg-sky-100/80 text-sky-800 border-2 border-sky-300/60'
                      }`}>
                        {isOIC ? 'OIC' : 'EXEC'}
                      </span>
                      <span className="text-[19px] truncate">
                        {renderHighlighted(opt)}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <FiCheck size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center">
                <p className="text-[18px] font-bold text-slate-600">
                  No preset matching "{value}"
                </p>
                <p className="text-[16.5px] text-slate-400 font-medium mt-0.5">
                  You can use this custom designation. Press Enter or click outside.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────
const ReassignOfficialModal = ({ isOpen, onClose, onRefresh, token, initialOfficial }) => {
  // Step 1 – official search/select
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Step 2 – target office & vacant position selection
  const [vacantSlots, setVacantSlots] = useState([]);
  const [loadingVacancies, setLoadingVacancies] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedVacantItem, setSelectedVacantItem] = useState('');

  // Destination fields
  const [newRegion, setNewRegion] = useState('');
  const [newDivision, setNewDivision] = useState('');
  const [newOffice, setNewOffice] = useState('');
  const [newStrand, setNewStrand] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [justification, setJustification] = useState('');

  // Lookup options
  const [options, setOptions] = useState({ regions: [], regionDivisions: {}, designations: [] });
  const [allOfficials, setAllOfficials] = useState([]);

  // File upload
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadingOfficials, setLoadingOfficials] = useState(false);

  // Dropdown positioning for official search
  const inputRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (dropdownOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [dropdownOpen, query]);

  const selectOfficial = (o) => {
    setSelected(o);
    setQuery(fullName(o));
    setDropdownOpen(false);
    setSelectedOffice('');
    setSelectedVacantItem('');
    setNewRegion('');
    setNewDivision('');
    setNewOffice('');
    setNewStrand('');
    setNewDesignation('');
    setJustification('');
    setFromDate(o?.appointment_date ? String(o.appointment_date).split('T')[0] : '');
    setToDate(new Date().toISOString().split('T')[0]);
  };

  // ── Reset on open/close ──
  useEffect(() => {
    if (!isOpen) return;
    if (initialOfficial) {
      selectOfficial(initialOfficial);
    } else {
      setQuery('');
      setSelected(null);
    }
    setSelectedOffice('');
    setSelectedVacantItem('');
    setNewRegion('');
    setNewDivision('');
    setNewOffice('');
    setNewStrand('');
    setNewDesignation('');
    setJustification('');
    setFromDate('');
    setToDate(new Date().toISOString().split('T')[0]);
    setFile(null);
    setDropdownOpen(false);
    fetchOfficials();
    fetchOptions();
    fetchVacancies();
  }, [isOpen, initialOfficial]);

  const fetchOfficials = async () => {
    setLoadingOfficials(true);
    try {
      const res = await fetch(apiUrl('/api/third-level/officials-registry/officials-kpi-summary'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAllOfficials(data.data.filter(o => o.status === 'Active' && o.first_name && o.first_name !== 'VACANT'));
      }
    } catch (err) {
      console.error('[ReassignModal] Failed to fetch officials', err);
    } finally {
      setLoadingOfficials(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await fetch(apiUrl('/api/third-level/official-profiling/positions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOptions({
          regions: data.regions || [],
          regionDivisions: data.regionDivisions || {},
          designations: data.designations || []
        });
      }
    } catch (err) {
      console.error('[ReassignModal] Failed to fetch options', err);
    }
  };

  const fetchVacancies = async () => {
    setLoadingVacancies(true);
    try {
      const res = await fetch(apiUrl('/api/third-level/official-profiling/vacancies'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setVacantSlots(data.data || []);
      }
    } catch (err) {
      console.error('[ReassignModal] Failed to fetch vacancies', err);
    } finally {
      setLoadingVacancies(false);
    }
  };

  // ── Target Offices derived from real vacant positions ──
  const uniqueTargetOffices = useMemo(() => {
    const offices = vacantSlots.map(s => s.office).filter(Boolean);
    return [...new Set(offices)].sort();
  }, [vacantSlots]);

  // ── Vacant positions scoped to selected office ──
  const filteredVacantPositions = useMemo(() => {
    if (!selectedOffice) return [];
    return vacantSlots.filter(s => s.office === selectedOffice);
  }, [vacantSlots, selectedOffice]);

  const handleSelectOffice = (off) => {
    setSelectedOffice(off);
    setSelectedVacantItem('');
    const sample = vacantSlots.find(s => s.office === off);
    if (sample) {
      setNewRegion(sample.region || '');
      setNewDivision(sample.division || '');
      setNewOffice(sample.office || off);
      setNewStrand(sample.strand || '');
    }
  };

  const handleSelectVacantPosition = (itemNum) => {
    setSelectedVacantItem(itemNum);
    const slot = vacantSlots.find(s => (s.item_number || s.TLOid) === itemNum);
    if (slot) {
      setNewRegion(slot.region || '');
      setNewDivision(slot.division || '');
      setNewOffice(slot.office || '');
      setNewStrand(slot.strand || '');
      const validTitle = slot.position_title && slot.position_title.toUpperCase() !== 'N/A' ? slot.position_title : (selected?.designation || '');
      setNewDesignation(validTitle);
    }
  };

  // ── Official search filtering ──
  const filteredOfficials = query.trim().length < 1
    ? []
    : allOfficials.filter(o => {
        const name = fullName(o).toLowerCase();
        const email = (o.email || '').toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || email.includes(q);
      }).slice(0, 10);

  // ── Divisions for selected region ──
  const isRegionOrOfficeName = (str) => {
    if (!str) return true;
    const up = String(str).trim().toUpperCase();
    if (newRegion && newRegion.trim().toUpperCase() === 'CENTRAL OFFICE') {
      return false;
    }
    if (newRegion && up === newRegion.trim().toUpperCase()) return true;
    if ((options.regions || []).some(r => r.toUpperCase() !== 'CENTRAL OFFICE' && r.toUpperCase() === up)) return true;
    return /^REGION\s+/i.test(up) || up === 'REGIONAL OFFICE' || up === 'N/A';
  };

  const availableDivisions = useMemo(() => {
    if (!newRegion) return [];
    if (newRegion.trim().toUpperCase() === 'CENTRAL OFFICE') {
      const coDivs = (options.regionDivisions?.['Central Office'] || options.regionDivisions?.['CENTRAL OFFICE'] || ['Central Office']);
      return coDivs.length > 0 ? coDivs : ['Central Office'];
    }
    const regionKey = Object.keys(options.regionDivisions || {}).find(r => r.toUpperCase() === newRegion.toUpperCase());
    const raw = regionKey ? options.regionDivisions[regionKey] : (options.divisions || []);
    return (raw || []).filter(d => !isRegionOrOfficeName(d));
  }, [newRegion, options.regionDivisions, options.divisions, options.regions]);

  // ── Same-assignment guard ──
  const isSameAssignment =
    selected &&
    newRegion &&
    newDivision &&
    newDesignation &&
    newRegion.trim().toUpperCase() === (selected.region || '').trim().toUpperCase() &&
    newDivision.trim().toUpperCase() === (selected.division || '').trim().toUpperCase() &&
    newDesignation.trim().toUpperCase() === (selected.designation || '').trim().toUpperCase();

  const canSubmit =
    selected &&
    (selectedVacantItem || (newRegion.trim() && newDivision.trim())) &&
    newDesignation.trim() &&
    toDate &&
    !isSameAssignment &&
    !submitting;

  const errors = {
    target: isSameAssignment ? 'New assignment is identical to the current one. Please select a different target office or vacant position.' : '',
    submit: submitError,
  };
  const summaryErrors = [errors.target, errors.submit].filter(Boolean);

  // ── Submit handler: Append-only Reassignment ──
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('tloId', selected.TLOid);
      formData.append('vacantItemNumber', selectedVacantItem || '');
      formData.append('target_TLOid', selectedVacantItem || '');
      formData.append('newRegion', newRegion.trim());
      formData.append('newDivision', newDivision.trim());
      formData.append('newOffice', newOffice || selectedOffice || '');
      formData.append('newStrand', newStrand || '');
      formData.append('newDesignation', newDesignation.trim());
      formData.append('effectiveDate', toDate || '');
      formData.append('inclusiveDateStart', fromDate || '');
      formData.append('inclusiveDateEnd', toDate || '');
      formData.append('justification', justification.trim());
      formData.append('remarks', justification.trim());

      const reassignRes = await fetch(apiUrl('/api/third-level/officials-registry/reassign-official'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const reassignData = await reassignRes.json();
      if (!reassignRes.ok || !reassignData.success) {
        throw new Error(reassignData.error || 'Reassignment failed');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Official Reassigned',
        text: `${fullName(selected)} has been successfully reassigned to ${newDivision || selectedOffice || 'target office'}, ${newRegion}.`,
        confirmButtonColor: 'var(--color-brand-700)'
      });
      onRefresh();
      onClose();
    } catch (err) {
      setSubmitError(`Reassignment failed: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--rgb-brand-800)/0.72)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-xl flex flex-col rounded-lg shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, var(--color-brand-50) 0%, var(--color-white) 60%)',
          border: '2px solid var(--color-brand-300)',
          maxHeight: '92vh'
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{
            background: 'linear-gradient(135deg, var(--color-brand-800) 0%, var(--color-brand-800) 100%)',
            borderBottom: '2px solid rgb(var(--rgb-white)/0.15)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
              style={{ background: 'rgb(var(--rgb-white)/0.12)' }}
            >
              <FiArrowRight size={20} color="white" />
            </div>
            <div>
              <p className="text-[13.5px] font-black text-sky-300 uppercase tracking-[0.2em] leading-none mb-0.5">
                Executive Dashboard
              </p>
              <h2 className="text-[24px] font-black text-white leading-none tracking-tight">
                Reassign Official
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
            style={{ background: 'rgb(var(--rgb-white)/0.1)' }}
          >
            <FiX size={18} color="white" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5">

          {/* — Official Search — */}
          <section>
            <label className="block text-[15px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Select Official
            </label>
            <div className="relative">
              <FiSearch
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none"
              />
              <FloatingLabelInput label={loadingOfficials ? 'Loading officials…' : 'Search by name or email…'} className="w-full" ref={inputRef} type="text" value={query} onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                  if (!e.target.value) setSelected(null);
                }} onFocus={() => setDropdownOpen(true)} onBlur={() => setTimeout(() => setDropdownOpen(false), 180)} placeholder={loadingOfficials ? 'Loading officials…' : 'Search by name or email…'} style={{
                  background: 'var(--color-white)',
                  border: '2px solid var(--color-brand-300)',
                  boxShadow: 'var(--shadow-xs)'
                }} disabled={loadingOfficials} />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSelected(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX size={16} />
                </button>
              )}
              {dropdownOpen && filteredOfficials.length > 0 && (
                <ul
                  style={{
                    position: 'fixed',
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 99999,
                    border: '2px solid var(--color-brand-300)',
                    background: 'white',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-xl)',
                    overflow: 'hidden',
                    maxHeight: '240px',
                    overflowY: 'auto'
                  }}
                >
                  {filteredOfficials.map((o) => (
                    <li
                      key={o.TLOid}
                      onMouseDown={() => selectOfficial(o)}
                      className="flex flex-col px-4 py-3 cursor-pointer transition-colors hover:bg-sky-50 border-b-2 border-slate-50 last:border-0"
                    >
                      <span className="font-black text-[19.5px] text-slate-800">{fullName(o)}</span>
                      <span className="text-[16.5px] text-slate-400 font-semibold mt-0.5">
                        {o.position_title || o.designation || '—'} · {o.region || '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {dropdownOpen && query.trim().length > 0 && filteredOfficials.length === 0 && !loadingOfficials && (
                <div
                  style={{
                    position: 'fixed',
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 99999,
                    border: '2px solid var(--color-brand-300)',
                    background: 'white',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--color-secondary)',
                    boxShadow: 'var(--shadow-xl)'
                  }}
                >
                  No active officials found for "{query}"
                </div>
              )}
            </div>
          </section>

          {/* — Current Assignment (read-only card) — */}
          {selected && (
            <section
              className="rounded-lg px-5 py-4 transition-all animate-in fade-in duration-150"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-50) 0%, var(--color-brand-100) 100%)',
                border: '2px solid var(--color-brand-300)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13.5px] font-black text-sky-600 uppercase tracking-[0.2em]">
                  Current Assignment
                </p>
                <span className="text-[15px] font-black px-2 py-0.5 rounded-full bg-sky-200/60 text-sky-800">
                  {selected.TLOid}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <InfoRow label="Name" value={fullName(selected)} span={2} />
                <InfoRow label="Position" value={selected.position_title || '—'} />
                <InfoRow label="Designation" value={selected.designation || '—'} />
                <InfoRow label="Region" value={selected.region || '—'} />
                <InfoRow label="Division" value={selected.division || '—'} />
              </div>
            </section>
          )}

          {/* — Destination Fields — */}
          {selected && (
            <section className="space-y-4 pt-1">
              <p className="text-[13.5px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                Target Assignment & Vacant Position
              </p>
              <div className="space-y-3.5">
                {/* 1. Target Office */}
                <div>
                  <FloatingLabelInput as="select" label="Select Target Office" requiredMark className="w-full" value={selectedOffice} onChange={(e) => handleSelectOffice(e.target.value)} style={{ background: 'var(--color-brand-50)', border: '2px solid var(--color-muted)' }}>
                      <option value="">Choose Office…</option>
                      {uniqueTargetOffices.map((off) => (
                        <option key={off} value={off}>{off}</option>
                      ))}
                    </FloatingLabelInput>
                </div>

                {/* 2. Vacant Position Picker */}
                <div>
                  <label className="block text-[15px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Select Vacant Position <span className="text-rose-500">*</span>
                  </label>
                  {!selectedOffice ? (
                    <div className="p-3.5 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 text-center">
                      <p className="text-[15px] font-black text-slate-400 uppercase tracking-wider">
                        Please select an office first to view vacant positions
                      </p>
                    </div>
                  ) : filteredVacantPositions.length === 0 ? (
                    <div className="p-3.5 rounded-lg bg-amber-50 border-2 border-dashed border-amber-200 text-center">
                      <p className="text-[15px] font-black text-amber-600 uppercase tracking-wider">
                        No vacant positions found in {selectedOffice}
                      </p>
                    </div>
                  ) : (
                    <FloatingLabelInput as="select" label="Choose Vacant Position…" className="w-full" value={selectedVacantItem} onChange={(e) => handleSelectVacantPosition(e.target.value)} style={{ background: 'var(--color-brand-50)', border: '2px solid var(--color-brand-300)' }}>
                        <option value="">Choose Vacant Position…</option>
                        {filteredVacantPositions.map((slot) => (
                          <option key={slot.item_number} value={slot.item_number}>
                            {slot.position_title} ({slot.item_number}){slot.strand ? ` — ${slot.strand}` : ''}
                          </option>
                        ))}
                      </FloatingLabelInput>
                  )}
                </div>

                {/* Selected Vacant Position Info Card */}
                {selectedVacantItem && (
                  <div
                    className="rounded-lg p-3.5 transition-all"
                    style={{ background: 'var(--color-success-50)', border: '2px solid var(--color-success-300)' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13.5px] font-black text-green-700 uppercase tracking-widest">
                        Selected Vacancy
                      </span>
                      <span className="text-[15px] font-black px-2 py-0.5 rounded-full bg-green-200 text-green-800">
                        {selectedVacantItem}
                      </span>
                    </div>
                    <p className="text-[19px] font-bold text-slate-800">
                      {newDesignation || 'Plantilla Position'}
                    </p>
                    <p className="text-[16.5px] text-slate-500 font-medium mt-0.5">
                      {newOffice} {newStrand ? `· ${newStrand}` : ''} {newRegion ? `(${newRegion})` : ''}
                    </p>
                  </div>
                )}

                {/* Date of Effectivity */}
                <div>
                  <label className="block text-[15px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Date of Effectivity <span className="text-rose-500">*</span>
                  </label>
                  <ModernDatePicker
                    value={toDate}
                    onChange={(val) => setToDate(val)}
                    placeholder="Select effective date"
                    className="!rounded-[14px] !py-2.5 !px-3 !text-[19.5px] !font-semibold !bg-brand-50 !border-2 !border-muted"
                  />
                </div>

                {/* Justification / Remarks */}
                <div>
                  <FloatingLabelInput as="textarea" label="Justification / Remarks" className="w-full" rows={2} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Optional reassignment note or administrative justification..." style={{ background: 'var(--color-white)', border: '2px solid var(--color-muted)' }} />
                </div>
              </div>

              {errors.target && (
                <p role="alert" className="mt-3 text-[13px] font-medium text-danger-700">{errors.target}</p>
              )}
            </section>
          )}

          {/* — Reassignment Order Upload (PDF) — */}
          {selected && (
            <section className="pt-1">
              <label className="block text-[15px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Reassignment Order (PDF) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg px-5 py-4 cursor-pointer transition-all hover:scale-[1.005]"
                style={{
                  border: file ? '2px solid var(--color-success-700)' : '2px dashed var(--color-brand-300)',
                  background: file ? 'var(--color-success-50)' : 'var(--color-brand-50)'
                }}
              >
                {file ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                      <FiCheck size={20} strokeWidth={3} />
                    </div>
                    <p className="text-[18px] font-black text-green-700">{file.name}</p>
                    <p className="text-[15px] text-slate-400 font-semibold">
                      {(file.size / 1024).toFixed(1)} KB · Click to change PDF
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-sm">
                      <FiUploadCloud size={20} />
                    </div>
                    <p className="text-[17px] font-black text-slate-700">Attach Reassignment Order (Optional)</p>
                    <p className="text-[14px] text-slate-400 font-semibold">PDF document only, max 10 MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </section>
          )}
        </div>

        <div className="px-7 pt-3">
          <FormErrorSummary errors={summaryErrors} />
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-end gap-3 px-7 py-4"
          style={{ borderTop: '2px solid var(--color-muted)', background: 'var(--color-brand-50)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-[18px] font-black text-slate-500 transition-colors hover:bg-slate-200/60"
            style={{ background: 'var(--color-brand-50)', border: '2px solid var(--color-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[18px] font-black text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-700) 0%, var(--color-brand-800) 100%)',
              boxShadow: canSubmit ? '0 4px 14px rgb(var(--rgb-brand-700)/0.35)' : 'none'
            }}
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Reassigning…
              </>
            ) : (
              <>
                <FiCheck size={16} /> Confirm Reassignment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── InfoRow sub-component ──────────────────────────────────────────────────
const InfoRow = ({ label, value, span = 1 }) => (
  <div className={`flex flex-col gap-0.5 ${span === 2 ? 'col-span-2' : ''}`}>
    <span className="text-[13.5px] font-black text-sky-600 uppercase tracking-widest">{label}</span>
    <span className="text-[19px] font-bold text-slate-700">{value}</span>
  </div>
);

export default ReassignOfficialModal;
