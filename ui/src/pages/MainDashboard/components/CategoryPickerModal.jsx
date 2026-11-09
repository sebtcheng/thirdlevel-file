import React from 'react';
import { X as FiX } from '@phosphor-icons/react';

const CategoryPickerModal = ({ isOpen, onClose, categories = [], selectedCategories = [], onSelectTop5, onSelectAll, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="mdb-modal-overlay" onClick={onClose}>
      <div className="mdb-modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mdb-modal-close" onClick={onClose}>
          <FiX size={18} />
        </button>
        <h3 style={{ marginTop: 0, color: 'var(--mdb-navy)', fontFamily: 'var(--mdb-font-head)', fontSize: '18px', fontWeight: 800 }}>
          Category Filter Picker
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--mdb-muted)', marginBottom: '16px', fontWeight: 500 }}>
          Select categories to display across KPI breakdown cards and chart segmentations.
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
          <button type="button" className="mdb-button secondary" style={{ height: '34px', fontSize: '11px' }} onClick={onSelectTop5}>
            Top 5
          </button>
          <button type="button" className="mdb-button secondary" style={{ height: '34px', fontSize: '11px' }} onClick={onSelectAll}>
            Select All
          </button>
          <button type="button" className="mdb-button outline" style={{ height: '34px', fontSize: '11px' }} onClick={onClear}>
            Clear
          </button>
        </div>

        <div
          style={{
            maxHeight: '280px',
            overflowY: 'auto',
            border: '1px solid var(--mdb-line)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            display: 'grid',
            gap: '10px',
            background: 'var(--mdb-blue-50)'
          }}
        >
          {categories.length > 0 ? (
            categories.map((cat) => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--mdb-navy)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  readOnly
                  style={{ accentColor: 'var(--mdb-blue-600)' }}
                />
                <span>{cat}</span>
              </label>
            ))
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--mdb-muted)', textAlign: 'center', margin: 0 }}>All active system categories selected.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CategoryPickerModal);
