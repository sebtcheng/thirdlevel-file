import React from 'react';
import { MagnifyingGlass as FiSearch, CaretLeft as FiChevronLeft, CaretRight as FiChevronRight } from '@phosphor-icons/react';
import FloatingLabelInput from '../../../components/forms/FloatingLabelInput.jsx';

const MasterTable = ({
  paginatedRows,
  totalRows,
  startRow,
  endRow,
  currentPage,
  totalPages,
  searchQuery,
  sortColumn,
  sortAsc,
  onSearchChange,
  onSort,
  onPrevPage,
  onNextPage,
  onRowClick
}) => {
  return (
    <section className="mdb-card">
      <div className="mdb-card-inner">
        <div className="mdb-card-header">
          <div>
            <h2>Third-Level Officials Records Registry</h2>
            <p className="mdb-card-subtitle">
              Searchable, sortable master database with frozen identity columns.
            </p>
          </div>
          <div style={{ position: 'relative', width: '260px' }}>
            <FloatingLabelInput label="Search by name, position, office" type="search" placeholder="Search by name, position, office..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
        </div>

        <div className="mdb-table-wrap">
          <table className="mdb-data-table">
            <thead>
              <tr>
                <th className="mdb-sticky-col-1" onClick={() => onSort('TLO_id')}>
                  TLO ID {sortColumn === 'TLO_id' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="mdb-sticky-col-2" onClick={() => onSort('Name')}>
                  Official Name {sortColumn === 'Name' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => onSort('Position')}>
                  Position Title {sortColumn === 'Position' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => onSort('Employment_Status')}>
                  Status {sortColumn === 'Employment_Status' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => onSort('Region')}>
                  Region {sortColumn === 'Region' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => onSort('Division')}>
                  Division {sortColumn === 'Division' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => onSort('Office')}>
                  Office / Station {sortColumn === 'Office' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => onSort('Email')}>
                  Email Address {sortColumn === 'Email' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => {
                  const statusClass =
                    row.Employment_Status === 'Regular'
                      ? 'regular'
                      : row.Employment_Status === 'OIC'
                      ? 'oic'
                      : 'vacant';

                  return (
                    <tr key={row.TLO_id || row.TLOid} onClick={() => onRowClick(row)}>
                      <td className="mdb-sticky-col-1" style={{ fontWeight: 700, color: 'var(--mdb-blue-600)' }}>
                        {row.TLO_id || row.TLOid}
                      </td>
                      <td className="mdb-sticky-col-2" style={{ fontWeight: 700, color: 'var(--mdb-navy)' }}>
                        {row.Name}
                      </td>
                      <td>{row.Position}</td>
                      <td>
                        <span className={`mdb-badge ${statusClass}`}>{row.Employment_Status}</span>
                      </td>
                      <td>{row.Region}</td>
                      <td>{row.Division}</td>
                      <td>{row.Office}</td>
                      <td>{row.Email || 'N/A'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '28px', color: 'var(--mdb-muted)', fontWeight: 600 }}>
                    No matching official records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--mdb-muted)' }}>
          <span>
            Showing {totalRows > 0 ? startRow : 0} to {endRow} of {totalRows} records
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="mdb-button outline"
              style={{ width: '90px', height: '34px' }}
              onClick={onPrevPage}
              disabled={currentPage <= 1}
            >
              <FiChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              className="mdb-button outline"
              style={{ width: '90px', height: '34px' }}
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
            >
              Next <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(MasterTable);
