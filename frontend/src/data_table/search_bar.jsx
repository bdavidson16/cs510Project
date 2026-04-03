import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const submitSearch = () => {
    // pass search query to result_table component, trimming whitespace
    onSearch?.(query.trim());
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      submitSearch();
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        placeholder="Search..."
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="button" onClick={submitSearch}>
        Search
      </button>
    </div>
  );
};

export default SearchBar;
