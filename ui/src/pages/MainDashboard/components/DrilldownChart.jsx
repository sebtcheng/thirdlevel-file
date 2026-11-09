import React from 'react';

const DrilldownChart = ({
  groupKey,
  groups,
  maxTotal,
  viewType,
  onRowDrill
}) => {
  const groupNames = Object.keys(groups).sort();

  if (groupNames.length === 0) {
    return (
      <p style={{ textAlign: 'center', padding: '30px', color: 'var(--mdb-muted)', fontSize: '13px', fontWeight: 600 }}>
        No matching records found for current filter selection.
      </p>
    );
  }

  if (viewType === 'stacked') {
    return (
      <div style={{ display: 'grid', gap: '6px' }}>
        {groupNames.map((gName) => {
          const g = groups[gName];
          const trackW = (g.total / maxTotal) * 100;
          const regW = (g.regular / g.total) * trackW;
          const oicW = (g.oic / g.total) * trackW;
          const vacW = (g.vacant / g.total) * trackW;

          return (
            <div
              key={gName}
              className="mdb-bar-row"
              onClick={() => onRowDrill(gName)}
              title={`Click to drill down into ${gName}`}
            >
              <div className="mdb-bar-row-label">{gName}</div>
              <div className="mdb-bar-track">
                {regW > 0 && (
                  <div
                    className="mdb-bar-segment"
                    style={{ width: `${regW}%`, background: 'var(--mdb-green)', color: 'white' }}
                  >
                    {regW >= 7 ? g.regular : ''}
                  </div>
                )}
                {oicW > 0 && (
                  <div
                    className="mdb-bar-segment"
                    style={{ width: `${oicW}%`, background: 'var(--mdb-gold)', color: 'var(--mdb-navy)' }}
                  >
                    {oicW >= 7 ? g.oic : ''}
                  </div>
                )}
                {vacW > 0 && (
                  <div
                    className="mdb-bar-segment"
                    style={{ width: `${vacW}%`, background: 'var(--mdb-red)', color: 'white' }}
                  >
                    {vacW >= 7 ? g.vacant : ''}
                  </div>
                )}
              </div>
              <div className="mdb-bar-row-total">{g.total}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--mdb-line)' }}>
      <table className="mdb-heatmap-table">
        <thead>
          <tr>
            <th>Group ({groupKey})</th>
            <th>Regular</th>
            <th>OIC</th>
            <th>Vacant</th>
            <th>Total Count</th>
          </tr>
        </thead>
        <tbody>
          {groupNames.map((gName) => {
            const g = groups[gName];
            return (
              <tr
                key={gName}
                onClick={() => onRowDrill(gName)}
                style={{ cursor: 'pointer' }}
                title={`Click to drill down into ${gName}`}
              >
                <td style={{ fontWeight: 700, textAlign: 'left', color: 'var(--mdb-navy)' }}>{gName}</td>
                <td style={{ background: `rgb(var(--rgb-success-700)/${Math.min(g.regular / maxTotal + 0.1, 0.85)})`, color: 'white' }}>
                  {g.regular}
                </td>
                <td style={{ background: `rgb(var(--rgb-gold)/${Math.min(g.oic / maxTotal + 0.1, 0.85)})`, color: 'var(--mdb-navy)' }}>
                  {g.oic}
                </td>
                <td style={{ background: `rgb(var(--rgb-danger-700)/${Math.min(g.vacant / maxTotal + 0.1, 0.85)})`, color: 'white' }}>
                  {g.vacant}
                </td>
                <td style={{ fontWeight: 800, color: 'var(--mdb-navy)' }}>{g.total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(DrilldownChart);
