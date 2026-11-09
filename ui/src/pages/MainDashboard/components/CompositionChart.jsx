import React from 'react';

const CompositionChart = ({ counts, total, viewType, onToggleView }) => {
  const regularPct = Math.round((counts.Regular / total) * 100) || 0;
  const oicPct = Math.round((counts.OIC / total) * 100) || 0;
  const vacantPct = Math.round((counts.Vacant / total) * 100) || 0;

  const regDash = (counts.Regular / total) * 100;
  const oicDash = (counts.OIC / total) * 100;
  const vacDash = (counts.Vacant / total) * 100;

  return (
    <section className="mdb-card">
      <div className="mdb-card-inner">
        <div className="mdb-card-header">
          <div>
            <h2>Position Composition Share</h2>
            <p className="mdb-card-subtitle">Distribution breakdown by selected category.</p>
          </div>
          <button
            type="button"
            className="mdb-chart-toggle"
            onClick={onToggleView}
          >
            {viewType === 'donut' ? 'Histogram' : 'Donut'}
          </button>
        </div>

        <div className="mdb-donut-container">
          {viewType === 'donut' ? (
            <>
              <div className="mdb-donut-svg-wrap">
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--color-muted)" strokeWidth="3.8" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="var(--mdb-green)"
                    strokeWidth="3.8"
                    strokeDasharray={`${regDash} 100`}
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="var(--mdb-gold)"
                    strokeWidth="3.8"
                    strokeDasharray={`${oicDash} 100`}
                    strokeDashoffset={`-${regDash}`}
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="var(--mdb-red)"
                    strokeWidth="3.8"
                    strokeDasharray={`${vacDash} 100`}
                    strokeDashoffset={`-${regDash + oicDash}`}
                  />
                </svg>
              </div>
              <table className="mdb-legend-table">
                <tbody>
                  <tr>
                    <td>
                      <span className="mdb-color-swatch" style={{ background: 'var(--mdb-green)' }} />
                      Regular Permanent
                    </td>
                    <td style={{ fontWeight: 800, textAlign: 'right', color: 'var(--mdb-navy)' }}>
                      {counts.Regular} ({regularPct}%)
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="mdb-color-swatch" style={{ background: 'var(--mdb-gold)' }} />
                      Acting OIC
                    </td>
                    <td style={{ fontWeight: 800, textAlign: 'right', color: 'var(--mdb-navy)' }}>
                      {counts.OIC} ({oicPct}%)
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="mdb-color-swatch" style={{ background: 'var(--mdb-red)' }} />
                      Vacant Position
                    </td>
                    <td style={{ fontWeight: 800, textAlign: 'right', color: 'var(--mdb-navy)' }}>
                      {counts.Vacant} ({vacantPct}%)
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : (
            <div style={{ width: '100%', display: 'grid', gap: '12px', padding: '10px 0' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--mdb-navy)' }}>
                  <span>Regular Permanent</span>
                  <span>{counts.Regular} ({regularPct}%)</span>
                </div>
                <div style={{ height: '12px', background: 'var(--mdb-green-100)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '4px' }}>
                  <div style={{ width: `${regDash}%`, height: '100%', background: 'var(--mdb-green)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--mdb-navy)' }}>
                  <span>Acting OIC</span>
                  <span>{counts.OIC} ({oicPct}%)</span>
                </div>
                <div style={{ height: '12px', background: 'var(--color-warning-50)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '4px' }}>
                  <div style={{ width: `${oicDash}%`, height: '100%', background: 'var(--mdb-gold)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--mdb-navy)' }}>
                  <span>Vacant Position</span>
                  <span>{counts.Vacant} ({vacantPct}%)</span>
                </div>
                <div style={{ height: '12px', background: 'var(--mdb-red-100)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '4px' }}>
                  <div style={{ width: `${vacDash}%`, height: '100%', background: 'var(--mdb-red)' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default React.memo(CompositionChart);
