import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import databaseCalls from './database_calls';
import ResultTable from './data_table/result_table';
import AddCaseForm from './new_info/add_case_form';
import GraphVisual from './visualization/graph_visual';
import covidImage from './assets/covid_19.png';
import marshallLogo from './assets/marshall_logo.png';
import SearchBar from './data_table/search_bar';

const TABLE_NAME = 'cases';

function App() {
  const [rows, setRows] = useState([]);
  const [activePage, setActivePage] = useState('table');
  const [isTableZoomed, setIsTableZoomed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const lastNoResultsAlertQueryRef = useRef('');
  const defaultZoom = 0.8;
  const [zoomScale, setZoomScale] = useState(defaultZoom);

  const loadRows = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedRows = await databaseCalls.returnEntireTable(TABLE_NAME);
      setRows(fetchedRows);
    } catch {
      setError('Failed to load table data from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const columns = useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);

  useEffect(() => {
    setColumnFilters((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([column]) => columns.includes(column)));
      const hasChanged =
        Object.keys(prev).length !== Object.keys(next).length ||
        Object.entries(prev).some(([key, value]) => next[key] !== value);
      return hasChanged ? next : prev;
    });
  }, [columns]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const rowMatchesSearch = (row) => {
    if (!normalizedSearch) return true;
    return columns.some((column) => String(row[column] ?? '').toLowerCase().includes(normalizedSearch));
  };

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          rowMatchesSearch(row) &&
          columns.every((column) => {
            const selected = columnFilters[column];
            if (!selected) return true;
            return String(row[column]) === selected;
          }),
      ),
    [rows, columns, columnFilters, normalizedSearch],
  );

  const handleRowAdded = async () => {
    await loadRows();
    setActivePage('table');
  };

  const renderActivePage = () => {
    if (activePage === 'table') {
      return (
        <ResultTable
          rows={rows}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          zoomScale={zoomScale}
          searchQuery={searchQuery}
        />
      );
    }
    if (activePage === 'form') {
      return <AddCaseForm tableName={TABLE_NAME} onAdd={handleRowAdded} />;
    }
    if (activePage === 'visual') {
      return <GraphVisual rows={filteredRows} />;
    }
    return <ResultTable rows={rows} columnFilters={columnFilters} onColumnFiltersChange={setColumnFilters} zoomScale={zoomScale} />;
  };

  const handleTableZoomIn = () => {
    if (zoomScale === defaultZoom)
      setZoomScale(1.0);
    else setZoomScale((prev) => prev + 0.2);
  };

  const handleTableZoomOut = () => {
    if (zoomScale === defaultZoom)
      setZoomScale(0.6);
    else setZoomScale((prev) => prev - 0.2)
  };

  const handleTableResetZoom = () => {
    setZoomScale(defaultZoom);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    setIsTableZoomed(zoomScale !== defaultZoom);
  }, [zoomScale]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) {
      lastNoResultsAlertQueryRef.current = '';
      return;
    }

    if (filteredRows.length === 0 && lastNoResultsAlertQueryRef.current !== normalizedQuery) {
      window.alert('No results found');
      lastNoResultsAlertQueryRef.current = normalizedQuery;
    }
  }, [searchQuery, filteredRows.length]);

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={covidImage} alt="COVID-19 visual" className="header-image" />
        <h1>Vaccine Data</h1>
      </header>
      <div className="page-nav">
        <button type="button" onClick={() => setActivePage('table')} disabled={activePage === 'table'}>
          Table
        </button>
        <button type="button" onClick={() => setActivePage('form')} disabled={activePage === 'form'}>
          Add Case
        </button>
        <button type="button" onClick={() => setActivePage('visual')} disabled={activePage === 'visual'}>
          Visualize Data
        </button>
        <div className="zoom-controls">
          <button type="button" onClick={handleTableZoomOut} disabled={activePage !== 'table'}>
            -
          </button>
          <button type="button" onClick={handleTableResetZoom} disabled={activePage !== 'table' || zoomScale === defaultZoom}>
            Reset Zoom
          </button>
          <button type="button" onClick={handleTableZoomIn} disabled={activePage !== 'table'}>
            +
          </button>          
        </div>
      </div>
      <SearchBar onSearch={handleSearch} />

      {error ? <p>{error}</p> : null}
      {loading ? <p>Loading data...</p> : renderActivePage()}
      <img src={marshallLogo} alt="Marshall logo" className="corner-logo" />
    </div>
  );
}

export default App;
