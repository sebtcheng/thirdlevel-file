import React from 'react';
import { Gear as FiSettings, ArrowCounterClockwise as FiRotateCcw, Sliders as FiSliders } from '@phosphor-icons/react';
import FloatingLabelInput from '../../../components/forms/FloatingLabelInput.jsx';

const FilterPanel = ({
  regions = [],
  divisions = [],
  officeTypes = [],
  selectedRegion,
  selectedDivision,
  selectedStatus,
  selectedOfficeType,
  isAdvancedMode,
  globalDistribution,
  selectedUnit,
  jurisdiction,
  onRegionChange,
  onDivisionChange,
  onStatusChange,
  onOfficeTypeChange,
  onDistributionChange,
  onUnitChange,
  onJurisdictionChange,
  onResetFilters,
  onToggleAdvancedMode,
  onOpenCategoryModal
}) => {
  return (
    <section className="mdb-card">
      <div className="mdb-card-inner">
        <div className="mdb-card-header">
          <div>
            <h2>Data Controls &amp; Segmentation</h2>
            <p className="mdb-card-subtitle">
              Filter inventory by location, employment status, designation, and global segmentation metrics.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`mdb-button ${isAdvancedMode ? 'outline' : 'secondary'}`}
              onClick={onResetFilters}
            >
              <FiRotateCcw size={14} /> Reset Filters
            </button>
            {/* <button
              type="button"
              className={`mdb-button ${isAdvancedMode ? 'secondary' : 'gold'}`}
              onClick={onToggleAdvancedMode}
            >
              <FiSliders size={14} /> {isAdvancedMode ? 'Toggle Basic Mode' : 'Toggle Advanced Mode'}
            </button> */}
          </div>
        </div>

        {/* Basic Filters Subcard */}
        <div className="mdb-controls-subcard">
          <div className="mdb-controls-row">
            <FloatingLabelInput as="select" label="Region" value={selectedRegion} onChange={(e) => onRegionChange(e.target.value)}>
                <option value="">All Regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </FloatingLabelInput>

            <FloatingLabelInput as="select" label="Division" value={selectedDivision} onChange={(e) => onDivisionChange(e.target.value)}>
                <option value="">{selectedRegion ? `All Divisions (${selectedRegion})` : 'Select Region First'}</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </FloatingLabelInput>

            <FloatingLabelInput as="select" label="Employment Status" value={selectedStatus} onChange={(e) => onStatusChange(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Regular">Regular / Permanent</option>
                <option value="OIC">Designated OIC</option>
                <option value="Vacant">Vacant Position</option>
              </FloatingLabelInput>

            <FloatingLabelInput as="select" label="Office" value={selectedOfficeType} onChange={(e) => onOfficeTypeChange(e.target.value)}>
                <option value="">All Offices</option>
                {officeTypes.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </FloatingLabelInput>
          </div>
        </div>

        {/* Advanced Controls Subcard */}
        {isAdvancedMode && (
          <div className="mdb-advanced-subcard">
            <h3>Advanced Controls</h3>
            <div className="mdb-controls-row">
              <label className="mdb-label">
                <span>Distribution By</span>
                <FloatingLabelInput as="select" label="Position Title" trailing={<button type="button" style={{ width: '40px' }} onClick={onOpenCategoryModal} title="Category Picker" className="flex items-center text-secondary">
                    <FiSettings size={14} />
                  </button>} value={globalDistribution} onChange={(e) => onDistributionChange(e.target.value)}>
                    <option value="Position">Position Title</option>
                    <option value="Employment_Status">Employment Status</option>
                    <option value="Region">Region</option>
                    <option value="Office">Office / Station</option>
                  </FloatingLabelInput>
              </label>

              <FloatingLabelInput as="select" label="Units / Aggregation Metric" value={selectedUnit} onChange={(e) => onUnitChange(e.target.value)}>
                  <option value="count">Number of Personnel (Headcount)</option>
                  <option value="years">Sum of Years in Service</option>
                </FloatingLabelInput>

              <FloatingLabelInput as="select" label="Jurisdiction Level" value={jurisdiction} onChange={(e) => onJurisdictionChange(e.target.value)}>
                  <option value="municipality">Municipality / City</option>
                  <option value="district">Legislative District</option>
                </FloatingLabelInput>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default React.memo(FilterPanel);
