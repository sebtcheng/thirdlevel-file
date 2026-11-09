import React from 'react';
import { WarningCircle as FiAlertCircle, ArrowsClockwise as FiRefreshCw } from '@phosphor-icons/react';

const ErrorState = ({ error, onRetry }) => {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)', border: '2px solid var(--mdb-red-100)' }}>
      <FiAlertCircle size={48} style={{ color: 'var(--mdb-red)', marginBottom: '12px' }} />
      <h3 style={{ margin: 0, color: 'var(--mdb-red)', fontFamily: 'var(--mdb-font-head)', fontWeight: 800 }}>
        Failed to Load Dashboard Data
      </h3>
      <p style={{ margin: '6px 0 16px', color: 'var(--color-danger-700)', fontSize: '13px', fontWeight: 500 }}>
        {error || 'An unexpected network error occurred while communicating with the server.'}
      </p>
      {onRetry && (
        <button type="button" className="mdb-button gold" onClick={onRetry}>
          <FiRefreshCw size={14} /> Retry Connection
        </button>
      )}
    </div>
  );
};

export default ErrorState;
