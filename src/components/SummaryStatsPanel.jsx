import { useMemo } from 'react';

function computeStatsFromRows(rows, variableId) {
  if (!Array.isArray(rows) || !rows.length || !variableId) {
    return null;
  }

  const numericValues = rows
    .map((row) => Number(row?.[variableId]))
    .filter((value) => !Number.isNaN(value));

  if (!numericValues.length) {
    return null;
  }

  const sortedValues = [...numericValues].sort((a, b) => a - b);
  const mean = sortedValues.reduce((sum, value) => sum + value, 0) / sortedValues.length;
  const mid = Math.floor(sortedValues.length / 2);
  const median =
    sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];

  const minValue = Math.min(...sortedValues);
  const maxValue = Math.max(...sortedValues);

  const minRow = rows.find((row) => Number(row?.[variableId]) === minValue);
  const maxRow = rows.find((row) => Number(row?.[variableId]) === maxValue);

  return {
    mean,
    median,
    min: minValue,
    max: maxValue,
    count: sortedValues.length,
    min_entity_name: minRow?.NAME ?? 'N/A',
    max_entity_name: maxRow?.NAME ?? 'N/A',
  };
}

function SummaryStatsPanel({
  summaryStatistics = {},
  variableLabels = {},
  selectedVariableId,
  dataRows = [],
}) {
  const computedStats = useMemo(
    () => computeStatsFromRows(dataRows, selectedVariableId),
    [dataRows, selectedVariableId],
  );

  const stats = computedStats ?? summaryStatistics?.[selectedVariableId];
  const variableName = selectedVariableId
    ? variableLabels[selectedVariableId] || selectedVariableId
    : 'Selected Variable';

  if (!stats) {
    return (
      <div className="summary-stats-panel">
        <h3>📈 Summary Statistics</h3>
        <p>No statistics available for the selected variable.</p>
      </div>
    );
  }

  const isPercentageVariable = typeof selectedVariableId === 'string'
    && (selectedVariableId.includes('percentage') || selectedVariableId.includes('rate'));

  const formatNumber = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return 'N/A';
    }

    const numeric = Number(value);

    if (isPercentageVariable) {
      return `${numeric.toFixed(1)}%`;
    }

    if (Math.abs(numeric) >= 1000) {
      return numeric.toLocaleString();
    }

    if (Number.isInteger(numeric)) {
      return numeric.toString();
    }

    return numeric.toFixed(2);
  };

  const formatEntityName = (name) => {
    if (!name || name === 'N/A') {
      return 'N/A';
    }
    return name;
  };

  const renderStatValue = (label, value) => (
    <div className="stat-item">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{formatNumber(value)}</span>
    </div>
  );

  return (
    <div className="summary-stats-panel">
      <h3>📈 Summary Statistics</h3>
      <h4>{variableName}</h4>

      <div className="stats-grid">
        {renderStatValue('Mean:', stats.mean)}
        {renderStatValue('Median:', stats.median)}
        {renderStatValue('Minimum:', stats.min)}
        {renderStatValue('Maximum:', stats.max)}
        {renderStatValue('Count:', stats.count)}
      </div>

      <div className="extremes">
        <div className="extreme-item">
          <span className="extreme-label">Lowest:</span>
          <span className="extreme-value">{formatEntityName(stats.min_entity_name)}</span>
        </div>
        <div className="extreme-item">
          <span className="extreme-label">Highest:</span>
          <span className="extreme-value">{formatEntityName(stats.max_entity_name)}</span>
        </div>
      </div>
    </div>
  );
}

export default SummaryStatsPanel;
