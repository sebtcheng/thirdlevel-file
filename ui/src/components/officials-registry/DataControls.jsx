import { MagnifyingGlass as FiSearch, CaretRight as FiChevronRight, SquaresFour as FiGrid, List as FiList, Stack as FiLayers } from '@phosphor-icons/react';
import { expandAcronym } from '../../utils/officialsUtils';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const DataControls = ({ dependentOffices, designationFilter, designations, levelFilter, officeFilter, oicOnly, positionFilter, regionFilter, searchTerm, setActiveTab, setDesignationFilter, setLevelFilter, setOfficeFilter, setOicOnly, setPositionFilter, setRegionFilter, setSearchTerm, setStatusTab, setStrandFilter, setTableFilters, setViewMode, strandFilter, strands, tabPositions, viewMode }) => {
  return (
    <>
                        <div className="card-surface p-4 mb-6 flex flex-col gap-2.5">
                            {/* TOP ROW: FILTERS */}
                            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 w-full">
                                {/* DROPDOWNS */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 xl:flex xl:flex-[4] gap-2">
                                    {/* Level Dropdown */}
                                    <FloatingLabelInput as="select" label="Level" className="w-full xl:flex-1" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} title={levelFilter}>
                                            <option value="All">All CO / RO / SDO</option>
                                            <option value="Central Office">Central Office</option>
                                            <option value="Regional Office">Regional Office</option>
                                            <option value="Schools Division Office">Schools Division Office</option>
                                        </FloatingLabelInput>

                                    {/* Region Dropdown */}
                                    <FloatingLabelInput as="select" label="Region" className="w-full xl:flex-1" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} title={regionFilter}>
                                            <option value="All">All Regions</option>
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
                                            <option value="NCR">NCR</option>
                                            <option value="CAR">CAR</option>
                                            <option value="NIR">NIR</option>
                                            <option value="BARMM">BARMM</option>
                                        </FloatingLabelInput>

                                    {/* Strand / Division Dropdown */}
                                    {levelFilter === 'Central Office' || regionFilter === 'Central Office' ? (
                                        <FloatingLabelInput as="select" label="Strand" className="w-full xl:flex-1" value={strandFilter} onChange={(e) => setStrandFilter(e.target.value)} title={strandFilter === 'All' ? 'All Strands' : strandFilter}>
                                                <option value="All">All Strands</option>
                                                {strands.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </FloatingLabelInput>
                                    ) : (
                                        <FloatingLabelInput as="select" label="Division" className="w-full xl:flex-1" value={officeFilter} onChange={(e) => setOfficeFilter(e.target.value)} title={officeFilter === 'All' ? 'All Divisions' : officeFilter}>
                                                <option value="All">All Divisions</option>
                                                {dependentOffices.map(o => (
                                                    <option key={o} value={o}>{o}</option>
                                                ))}
                                            </FloatingLabelInput>
                                    )}

                                    {/* Designation Dropdown */}
                                    <FloatingLabelInput as="select" label="Designation" className="w-full xl:flex-1" value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)} title={designationFilter === 'All' ? 'All Designations' : expandAcronym(designationFilter)}>
                                            <option value="All">All Designations</option>
                                            {designations.map(d => (
                                                <option key={d} value={d}>{expandAcronym(d)}</option>
                                            ))}
                                        </FloatingLabelInput>

                                    {/* Position Dropdown */}
                                    <FloatingLabelInput as="select" label="Position" className="w-full xl:flex-1" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} title={positionFilter}>
                                            <option value="All">All Positions</option>
                                            {tabPositions.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </FloatingLabelInput>
                                </div>

                                {/* BUTTONS */}
                                <div className="flex items-center gap-2 w-full xl:w-auto">
                                    {/* OIC Toggle */}
                                    <button
                                        onClick={() => setOicOnly(!oicOnly)}
                                        className={`h-[44px] px-4 flex-1 xl:flex-none rounded-full transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 border-2 ${oicOnly ? 'bg-brand-800 border-brand-800' : 'bg-brand-50 border-brand-300 hover:bg-sky-100'}`}
                                        title="Toggle OIC only"
                                    >
                                        <span className={`text-[15px] font-black uppercase tracking-widest ${oicOnly ? 'text-white' : 'text-brand-800'}`}>OIC ONLY</span>
                                        <div className={`w-8 h-4 rounded-full relative transition-colors shrink-0 ${oicOnly ? 'bg-amber-400' : 'bg-slate-300'}`}>
                                            <div className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${oicOnly ? 'translate-x-[16px]' : 'translate-x-0'}`} />
                                        </div>
                                    </button>

                                    {/* Reset Filters */}
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setTableFilters({});
                                            setStatusTab('All');
                                            setActiveTab('All');
                                            setLevelFilter('All');
                                            setRegionFilter('All');
                                            setStrandFilter('All');
                                            setOfficeFilter('All');
                                            setPositionFilter('All');
                                            setDesignationFilter('All');
                                            setOicOnly(false);
                                        }}
                                        className="h-[44px] px-5 flex-1 xl:flex-none bg-transparent text-rose-500 rounded-full border-2 border-rose-200 font-black text-[15px] tracking-widest uppercase hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center whitespace-nowrap shrink-0"
                                        title="Reset all filters"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {/* BOTTOM ROW: SEARCH BAR & VIEW TOGGLES */}
                            <div className="flex items-center gap-2 w-full">
                                <FloatingLabelInput label="Search" icon={<FiSearch size={16} />} className="w-full" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, position, or office..." />
                                {/* VIEW TOGGLES */}
                                <div className="flex items-center gap-2 shrink-0 px-1">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-brand-800 text-white border-b-[3px] border-gold shadow-sm transform -translate-y-[1px]' : 'bg-brand-100 text-brand-800 hover:bg-brand-300'}`}
                                        title="Table view"
                                    >
                                        <FiList size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-brand-800 text-white border-b-[3px] border-gold shadow-sm transform -translate-y-[1px]' : 'bg-brand-100 text-brand-800 hover:bg-brand-300'}`}
                                        title="Grid view"
                                    >
                                        <FiGrid size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('directory')}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === 'directory' ? 'bg-brand-800 text-white border-b-[3px] border-gold shadow-sm transform -translate-y-[1px]' : 'bg-brand-100 text-brand-800 hover:bg-brand-300'}`}
                                        title="Organizational Directory"
                                    >
                                        <FiLayers size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
    </>
  );
};

export default DataControls;
