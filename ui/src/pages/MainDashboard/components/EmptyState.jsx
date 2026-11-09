import React from 'react';
import { Tray as FiInbox } from '@phosphor-icons/react';

const EmptyState = ({ message = "No official records match your criteria.", onReset }) => {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: 'var(--radius-md)', border: '2px dashed var(--mdb-line)' }}>
      <FiInbox size={48} style={{ color: 'var(--mdb-muted)', marginBottom: '12px' }} />
      <h3 style={{ margin: 0, color: 'var(--mdb-navy)', fontFamily: 'var(--mdb-font-head)', fontWeight: 800 }}>
        No Data Found
      </h3>
      <p style={{ margin: '6px 0 16px', color: 'var(--mdb-muted)', fontSize: '13px', fontWeight: 500 }}>
        {message}
      </p>
      {onReset && (
        <button type="button" className="mdb-button secondary" onClick={onReset}>
          Reset All Filters
        </button>
      )}
    </div>
  );
};

export default EmptyState;
