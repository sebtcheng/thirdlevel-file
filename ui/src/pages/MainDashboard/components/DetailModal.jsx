import React from 'react';
import { X as FiX } from '@phosphor-icons/react';

const DetailModal = ({ row, onClose }) => {
  if (!row) return null;

  const initial = (row.Name || 'V').charAt(0);

  return (
    <div className="mdb-modal-overlay" onClick={onClose}>
      <div className="mdb-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mdb-modal-close" onClick={onClose}>
          <FiX size={18} />
        </button>

        <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--mdb-blue-100)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--mdb-font-head)',
              fontWeight: 800,
              color: 'var(--mdb-navy)',
              fontSize: '22px',
              border: '2px solid var(--mdb-blue-400)'
            }}
          >
            {initial}
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'var(--mdb-navy)', fontFamily: 'var(--mdb-font-head)', fontSize: '20px', fontWeight: 800 }}>
              {row.Name}
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--mdb-muted)', fontSize: '13px', fontWeight: 600 }}>
              {row.Position} • {row.TLO_id || row.TLOid}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '12px', background: 'var(--mdb-blue-50)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--mdb-line)' }}>
          <div>
            <strong style={{ color: 'var(--mdb-navy)' }}>Employment Status:</strong> {row.Employment_Status}
          </div>
          <div>
            <strong style={{ color: 'var(--mdb-navy)' }}>Region:</strong> {row.Region}
          </div>
          <div>
            <strong style={{ color: 'var(--mdb-navy)' }}>Division:</strong> {row.Division}
          </div>
          <div>
            <strong style={{ color: 'var(--mdb-navy)' }}>Office Station:</strong> {row.Office}
          </div>
          <div>
            <strong style={{ color: 'var(--mdb-navy)' }}>Municipality:</strong> {row.Municipality || 'N/A'}
          </div>
          <div>
            <strong style={{ color: 'var(--mdb-navy)' }}>Service Tenure:</strong> {row.ServiceYears || 0} Years
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <strong style={{ color: 'var(--mdb-navy)' }}>Email Contact:</strong> {row.Email || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DetailModal);
