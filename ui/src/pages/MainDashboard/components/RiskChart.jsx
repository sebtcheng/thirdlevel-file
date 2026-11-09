import React from 'react';

const RiskChart = ({ issueCount, totalCount, viewType, onToggleView }) => {
  const normalCount = Math.max(0, totalCount - issueCount);
  const total = totalCount || 1;

  const issuePct = Math.round((issueCount / total) * 100);
  const normalPct = Math.round((normalCount / total) * 100);

  return (
    <section className="mdb-card">
      <div className="mdb-card-inner">
        <div className="mdb-card-header">
          <div>
            <h2>Designation &amp; Qualification Risks</h2>
            <p className="mdb-card-subtitle">Tracking OIC appointments and administrative review flags.</p>
          </div>
          <button
            type="button"
            className="mdb-chart-toggle"
            onClick={onToggleView}
          >
            {viewType === 'histogram' ? 'Donut' : 'Histogram'}
          </button>
        </div>

        {viewType === 'histogram' ? (
          <div style={{ display: 'grid', gap: '14px', padding: '10px 0' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--mdb-navy)' }}>
                <span>OIC / Action Flagged</span>
                <span>{issueCount} ({issuePct}%)</span>
              </div>
              <div style={{ height: '14px', background: 'var(--color-warning-50)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ width: `${(issueCount / total) * 100}%`, height: '100%', background: 'var(--mdb-amber)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--mdb-navy)' }}>
                <span>Verified Regular Records</span>
                <span>{normalCount} ({normalPct}%)</span>
              </div>
              <div style={{ height: '14px', background: 'var(--mdb-blue-100)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ width: `${(normalCount / total) * 100}%`, height: '100%', background: 'var(--mdb-blue-600)' }} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: '32px', fontFamily: 'var(--mdb-font-head)', fontWeight: 800, color: 'var(--mdb-amber)', margin: 0 }}>
              {issueCount} Flags
            </p>
            <p style={{ fontSize: '12px', color: 'var(--mdb-muted)', margin: '6px 0 0', fontWeight: 600 }}>
              Requiring Central Office Administrative Action ({issuePct}% of total)
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default React.memo(RiskChart);
