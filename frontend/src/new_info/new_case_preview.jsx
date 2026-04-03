/*
Shows preview of new data before it is added to the database. This component is used in the AddCaseForm component.

*/
import React, { useEffect } from 'react';
import './add_case_form.css';

const NewCasePreview = ({ newCase }) => {
  if (!newCase || Object.keys(newCase).length === 0) {
    return <p>No new case data to preview.</p>;
  }

  return (
    <div className="new-case-preview">
      <h3>New Case Preview</h3>
      <table>
        <thead>
          <tr>
            {Object.keys(newCase).map((key) => (
                <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {Object.values(newCase).map((value, index) => (
                <td key={index}>{String(value)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default NewCasePreview;
