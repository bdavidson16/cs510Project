import axios from 'axios';

const API_URL = 'https://your-railway-app-url.railway.app/api';

const DatabaseCalls = {
  async returnEntireTable(table) {
    const response = await axios.get(`${API_URL}/table/${table}`);
    return response.data.rows ?? [];
  },

  async dropDownValues(table) {
    const response = await axios.get(`${API_URL}/table/${table}/filters`);
    return response.data.filters ?? {};
  },

  async addRow(table, row) {
    try {
      const response = await axios.post(`${API_URL}/table/${table}/rows`, { row });
      return response.data.row;
    } catch (error) {
      const detail = error?.response?.data?.detail;
      throw new Error(detail || 'Failed to add row.');
    }
  },

  async checkRowExists(table, rowData) {
    try {
      const response = await axios.get(`${API_URL}/table/${table}/row`, { params: rowData });
      return response.data.exists;
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
      throw new Error(message || 'Failed to check if row exists.');
    }
  },
};

export default DatabaseCalls;
