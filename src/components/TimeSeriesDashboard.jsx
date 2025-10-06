import { useState, useMemo, useEffect } from 'react';
import MapDisplay from './MapDisplay';
import ChartsPanel from './ChartsPanel';
import './TimeSeriesDashboard.css';

function buildYearList(metadata, data) {
  const yearSet = new Set();

  if (Array.isArray(metadata?.years_available)) {
    metadata.years_available.forEach((year) => {
      const numericYear = Number(year);
      if (!Number.isNaN(numericYear)) {
        yearSet.add(numericYear);
      }
    });
  }

  if (yearSet.size === 0 && Array.isArray(metadata?.years_requested)) {
    metadata.years_requested.forEach((year) => {
      const numericYear = Number(year);
      if (!Number.isNaN(numericYear)) {
        yearSet.add(numericYear);
      }
    });
  }

  if (yearSet.size === 0 && Number.isInteger(metadata?.start_year) && Number.isInteger(metadata?.end_year)) {
    for (let year = metadata.start_year; year <= metadata.end_year; year += 1) {
      yearSet.add(year);
    }
  }

  if (yearSet.size === 0 && Array.isArray(data)) {
    data.forEach((row) => {
      const numericYear = Number(row.year);
      if (!Number.isNaN(numericYear)) {
        yearSet.add(numericYear);
      }
    });
  }

  return Array.from(yearSet).sort((a, b) => a - b);
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  const numeric = Number(value);
  if (Math.abs(numeric) >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(numeric) >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}K`;
  }
  if (Number.isInteger(numeric)) {
    return numeric.toLocaleString();
  }
  return numeric.toFixed(2);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  return `${Number(value).toFixed(1)}%`;
}

function TimeSeriesDashboard({ dashboardData }) {
  const {
    summary_text: summaryText,
    data = [],
    metadata = {},
    charts = [],
    metrics = {},
    insights = [],
    errors = {},
  } = dashboardData;

  const primaryVariableId = metadata.primary_variable_code;
  const variableLabels = metadata.variable_labels || {};
  const primaryVariableLabel = metadata.primary_variable_label || variableLabels[primaryVariableId] || primaryVariableId;

  const years = useMemo(() => buildYearList(metadata, data), [metadata, data]);
  const defaultYear = years.length > 0
    ? years[years.length - 1]
    : Number(metadata?.end_year) || Number(metadata?.start_year) || null;

  const [selectedYear, setSelectedYear] = useState(defaultYear);

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  const filteredData = useMemo(() => {
    if (!selectedYear) {
      return [];
    }
    return data
      .filter((row) => Number(row.year) === Number(selectedYear))
      .map((row) => ({ ...row }));
  }, [data, selectedYear]);

  const missingYears = errors?.missing_years || [];

  const handleYearChange = (event) => {
    const nextYear = Number(event.target.value);
    if (!Number.isNaN(nextYear)) {
      setSelectedYear(nextYear);
    }
  };

  const handleStepYear = (direction) => {
    if (years.length === 0) {
      return;
    }
    const currentIndex = years.indexOf(selectedYear);
    if (currentIndex === -1) {
      setSelectedYear(years[years.length - 1]);
      return;
    }
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < years.length) {
      setSelectedYear(years[nextIndex]);
    }
  };

  const largestIncrease = metrics?.largest_increase;
  const fastestGrowth = metrics?.fastest_growth;
  const yearRange = metrics?.year_range || [metadata.start_year, metadata.end_year];

  return (
    <div className="ts-dashboard">
      <div className="ts-header">
        <h2>📈 Time-Series Dashboard</h2>
        <p>{summaryText}</p>
        <div className="ts-subtitle">
          <span>{primaryVariableLabel}</span>
          {metadata.state_name && <span>• Focus: {metadata.state_name}</span>}
        </div>
      </div>

      <div className="ts-controls">
        <button
          type="button"
          onClick={() => handleStepYear(-1)}
          disabled={years.length === 0 || selectedYear === years[0]}
        >
          ◀
        </button>
        <div className="ts-slider">
          <label htmlFor="year-slider">Year: <strong>{selectedYear || 'N/A'}</strong></label>
          {years.length > 0 ? (
            <input
              id="year-slider"
              type="range"
              min={years[0]}
              max={years[years.length - 1]}
              step={1}
              value={selectedYear || years[0]}
              onChange={handleYearChange}
            />
          ) : (
            <div className="ts-slider-placeholder">No year data available</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleStepYear(1)}
          disabled={years.length === 0 || selectedYear === years[years.length - 1]}
        >
          ▶
        </button>
      </div>

      <div className="ts-grid">
        <div className="ts-map">
          <div className="ts-map-header">
            <h3>{primaryVariableLabel}</h3>
            {selectedYear && <span>Showing {selectedYear}</span>}
          </div>
          <MapDisplay
            data={filteredData}
            display_variable_id={primaryVariableId}
            variable_labels={variableLabels}
            geography_level={metadata.geography_level}
          />
        </div>

        <aside className="ts-sidebar">
          <section className="ts-metrics">
            <h3>Key Changes {yearRange && yearRange.length === 2 && `(${yearRange[0]}–${yearRange[1]})`}</h3>
            <div className="ts-metric-grid">
              <article>
                <h4>Largest Change</h4>
                <p className="ts-metric-value">{formatNumber(largestIncrease?.metrics?.absolute_change)}</p>
                <p className="ts-metric-geo">{largestIncrease?.NAME || '—'}</p>
              </article>
              <article>
                <h4>Fastest Growth</h4>
                <p className="ts-metric-value">{formatPercent(fastestGrowth?.metrics?.percent_change)}</p>
                <p className="ts-metric-geo">{fastestGrowth?.NAME || '—'}</p>
              </article>
            </div>
            {missingYears.length > 0 && (
              <div className="ts-warning">
                Missing data for: {missingYears.join(', ')}
              </div>
            )}
          </section>

          <section className="ts-charts">
            <ChartsPanel charts={charts} variableLabels={variableLabels} />
          </section>

          {insights && insights.length > 0 && (
            <section className="ts-insights">
              <h3>Insights</h3>
              <ul>
                {insights.map((insight, idx) => (
                  <li key={idx}>{insight}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default TimeSeriesDashboard;
