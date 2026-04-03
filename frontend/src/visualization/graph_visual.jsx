/*
Shows graph visualization of COVID-19 data. This component is used in the Dashboard component.
*/

import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const GraphVisual = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return <p>No data available for graph visualization.</p>;
  }

  const firstColumn = Object.keys(rows[0])[0];
  const counts = rows.reduce((acc, row) => {
    const key = String(row[firstColumn] ?? 'Unknown');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(counts).slice(0, 20);
  const values = labels.map((label) => counts[label]);

  const chartData = {
    labels,
    datasets: [
      {
        label: `Row Count by ${firstColumn}`,
        data: values,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const handleXAxisLabelClick = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const label = labels[index];
      alert(`You clicked on label: ${label}`);
    }
  };

  options.onClick = handleXAxisLabelClick;

  const handleBarClick = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const label = labels[index];
      const value = values[index];
      alert(`You clicked on bar: ${label} with value: ${value}`);
    }
  };

  options.onClick = handleBarClick;

  const handleYAxisLabelChange = (event, elements) => {
    // User change choose from dropdown to change y-axis metric (not implemented in this example)
    const selectedMetric = event.target.value;
    const newValues = rows.map((row) => row[selectedMetric] ?? 0);
    chartData.datasets[0].data = newValues;
    // Force chart update (in a real implementation, you would use state to trigger this)
    event.target.chart.update();
  };

  const handleExportData = () => {
    const csvContent = `data:text/csv;charset=utf-8,${labels.join(',')}\n${values.join(',')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'graph_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportVisual = () => {
    const canvas = document.querySelector('.graph-visual canvas');
    if (canvas) {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.setAttribute('href', image);
      link.setAttribute('download', 'graph_visual.png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="graph-visual">
      <h3>Graph Visualization</h3>
      <button type="button" onClick={handleExportData}>Export Data</button>.
      <button type="button" onClick={handleExportVisual}>Export Visual</button>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default GraphVisual;
