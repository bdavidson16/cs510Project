import React, { useEffect, useMemo, useState } from 'react';
import './result_table.css';

const ResultTable = ({ rows, columnFilters = {}, onColumnFiltersChange, zoomScale, searchQuery = '' }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const columns = useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const rowMatchesSearch = (row) => {
    if (!normalizedSearch) return true;
    return columns.some((column) => String(row[column] ?? '').toLowerCase().includes(normalizedSearch));
  };

  const availableValuesByColumn = useMemo(() => {
    const values = {};
    for (const currentColumn of columns) {
      const candidateRows = rows.filter((row) => {
        if (!rowMatchesSearch(row)) return false;
        return columns.every((column) => {
          if (column === currentColumn) return true;
          const selected = columnFilters[column];
          if (!selected) return true;
          return String(row[column]) === selected;
        });
      });

      values[currentColumn] = [...new Set(candidateRows.map((row) => row[currentColumn]).filter((v) => v !== null && v !== undefined))].sort(
        (a, b) => String(a).localeCompare(String(b)),
      );
    }
    return values;
  }, [rows, columns, columnFilters, normalizedSearch]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      rowMatchesSearch(row) &&
      columns.every((column) => {
        const selected = columnFilters[column];
        if (!selected) return true;
        return String(row[column]) === selected;
      }),
    );
  }, [rows, columns, columnFilters, normalizedSearch]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === bValue) return 0;
      return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
    });
    return sortConfig.direction === 'ascending' ? sorted : sorted.reverse();
  }, [filteredRows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / itemsPerPage));
  const currentRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRows.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRows, currentPage]);

  const requestSort = (key) => {
    setCurrentPage(1);
    setSortConfig((prev) => {
      if (prev.key === key && prev.direction === 'ascending') {
        return { key, direction: 'descending' };
      }
      return { key, direction: 'ascending' };
    });
  };

  const handleFilterChange = (column, value) => {
    setCurrentPage(1);
    if (onColumnFiltersChange) {
      onColumnFiltersChange((prev) => ({ ...prev, [column]: value }));
    }
  };

  const formatOptionLabel = (value) => {
    const text = String(value);
    const maxLength = 40;
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return '--';
    return String(value);
  };

  if (rows.length === 0) {
    return <p>No data available.</p>;
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [columnFilters, searchQuery]);

  useEffect(() => {
    if (!onColumnFiltersChange) return;

    const hasInvalidFilter = columns.some((column) => {
      const selected = columnFilters[column];
      if (!selected) return false;
      return !availableValuesByColumn[column]?.some((value) => String(value) === selected);
    });

    if (!hasInvalidFilter) return;

    onColumnFiltersChange((prev) => {
      const next = { ...prev };
      for (const column of columns) {
        const selected = next[column];
        if (!selected) continue;
        const isValid = availableValuesByColumn[column]?.some((value) => String(value) === selected);
        if (!isValid) {
          next[column] = '';
        }
      }
      return next;
    });
  }, [columns, columnFilters, availableValuesByColumn, onColumnFiltersChange]);

  useEffect(() => {
    // only change font size if zoomScale is different from defaultZoom
    const defaultZoom = 1;
    if (zoomScale === defaultZoom) {
      document.documentElement.style.fontSize = '';
    } else {
      document.documentElement.style.fontSize = `${100 * zoomScale}%`;
    }
  }, [zoomScale]);

  return (
    <div className="table-wrapper">
      <table className={`result-table`}>
        <thead>
          <tr className="header-row">
            {columns.map((column) => (
              <th key={column} onClick={() => requestSort(column)}>
                {column}
                {sortConfig.key === column ? (sortConfig.direction === 'ascending' ? ' ^' : ' v') : ''}
              </th>
            ))}
          </tr>
          <tr className="filter-row">
            {columns.map((column) => (
              <th key={`filter-${column}`}>
                <select value={columnFilters[column] ?? ''} onChange={(event) => handleFilterChange(column, event.target.value)}>
                  <option value="">All</option>
                  {availableValuesByColumn[column].map((value) => (
                    <option className="filter-option" key={`${column}-${value}`} value={String(value)} title={String(value)}>
                      {formatOptionLabel(value)}
                    </option>
                  ))}
                </select>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-rows">
          {currentRows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {columns.map((column) => (
                <td key={`${rowIndex}-${column}`}>{formatCellValue(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-pagination">
        <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};

export default ResultTable;
