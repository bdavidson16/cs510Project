import React, { useEffect, useMemo, useState } from 'react';
import DatabaseCalls from '../database_calls';
import './add_case_form.css';
import NewCasePreview from './new_case_preview';

const AddCaseForm = ({ tableName, onAdd }) => {
  const [filters, setFilters] = useState({});
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newCasePreview, setNewCasePreview] = useState(false);

  useEffect(() => {
    const loadFilters = async () => {
      setLoading(true);
      setError('');
      try {
        const dropdowns = await DatabaseCalls.dropDownValues(tableName);
        setFilters(dropdowns);
        const initialValues = Object.keys(dropdowns).reduce((acc, key) => {
          acc[key] = '';
          return acc;
        }, {});
        setFormValues(initialValues);
      } catch {
        setError('Could not load dropdown values.');
      } finally {
        setLoading(false);
      }
    };

    loadFilters();
  }, [tableName]);

  const columns = useMemo(() => Object.keys(filters), [filters]);
  const handleChange = (column, value) => {
    setFormValues((prev) => ({ ...prev, [column]: value }));
    if (value === 'Add New') {
      const newValue = prompt(`Enter new value for ${column}:`);
      if (newValue) {
        setFormValues((prev) => ({ ...prev, [column]: newValue }));
        setFilters((prev) => ({
          ...prev,
          [column]: [...(prev[column] || []), newValue],
        }));
      } else {
        setFormValues((prev) => ({ ...prev, [column]: '' }));
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const cleanedRow = Object.fromEntries(Object.entries(formValues).filter(([, value]) => value !== ''));
      const exists = await checkIfCaseExists(cleanedRow);
      if (exists) {
        setError('A row with the same values already exists. Please review before adding.');
        return;
      }
      const inserted = await DatabaseCalls.addRow(tableName, cleanedRow);
      onAdd(inserted);
    } catch (submitError) {
      setError(submitError.message || 'Failed to add row to the database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewCasePreview = (event) => {
    event.preventDefault();
    setNewCasePreview((prev) => !prev);
  };

  const previewRow = useMemo(
    () => Object.fromEntries(Object.entries(formValues).filter(([, value]) => value !== '')),
    [formValues],
  );

  const checkIfCaseExists = async (currentValues) => {
    const rowToCheck = Object.fromEntries(
      Object.entries(currentValues).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );
    if (Object.keys(rowToCheck).length === 0) return false;

    try {
      const exists = await DatabaseCalls.checkRowExists(tableName, rowToCheck);
      return exists;
    } catch (error) {
      console.error('Error checking if case exists:', error);
      return false;
    }
  };

  if (loading) return <p>Loading form options...</p>;
  if (columns.length === 0) return <p>No dropdown columns available.</p>;

  return (
    <form className="add-case-form" onSubmit={handleSubmit}>
      {columns.map((column) => (
        <label key={column}>
          {column}
          <select value={formValues[column] ?? ''} onChange={(event) => handleChange(column, event.target.value)}>
            <option value="">Select {column}</option>
            <option value="Add New">Add New</option>
            {(filters[column] ?? []).map((option, index) => (
              <option key={`${column}-${String(option)}-${index}`} value={String(option)}>
                {String(option)}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button type="button" onClick={handleNewCasePreview}>
        {newCasePreview ? 'Hide Preview' : 'Show Preview'}
      </button>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Add Row'}
      </button>
      {newCasePreview ? <NewCasePreview newCase={previewRow} /> : null}
      {error ? <p>{error}</p> : null}
    </form>
  );
};

export default AddCaseForm;
