import { useState, useMemo, useEffect } from 'react';
import MapDisplay from './MapDisplay';
import ChartsPanel from './ChartsPanel';
import SummaryStatsPanel from './SummaryStatsPanel';
import { deriveAvailableYears, resolveDefaultYear } from '../utils/timeSeries';
import './TimeSeriesDashboard.css';

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

function computeSummaryStats(rows, variableId) {
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

function TimeSeriesDashboard({ dashboardData, currentYear = null, onYearChange, onBack }) {
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

  const years = useMemo(() => deriveAvailableYears(metadata, data), [metadata, data]);
  const defaultYear = resolveDefaultYear(years, metadata);

  const [internalYear, setInternalYear] = useState(currentYear ?? defaultYear);

  useEffect(() => {
    if (currentYear !== null && currentYear !== undefined) {
      setInternalYear(currentYear);
    }
  }, [currentYear]);

  useEffect(() => {
    if ((currentYear === null || currentYear === undefined) && defaultYear !== null) {
      setInternalYear(defaultYear);
    }
  }, [defaultYear, currentYear]);

  useEffect(() => {
    if (years.length > 0) {
      const normalized = internalYear ?? defaultYear ?? years[years.length - 1];
      if (!years.includes(Number(normalized))) {
        const fallback = years[years.length - 1];
        if (onYearChange) {
          onYearChange(fallback);
        } else {
          setInternalYear(fallback);
        }
      }
    }
  }, [years, internalYear, defaultYear, onYearChange]);

  const selectedYear = useMemo(() => {
    if (currentYear !== null && currentYear !== undefined) {
      return Number(currentYear);
    }
    if (internalYear !== null && internalYear !== undefined) {
      return Number(internalYear);
    }
    return defaultYear;
  }, [currentYear, internalYear, defaultYear]);

  const updateYear = (year) => {
    if (!Number.isNaN(Number(year))) {
      if (onYearChange) {
        onYearChange(Number(year));
      } else {
        setInternalYear(Number(year));
      }
    }
  };

  const filteredData = useMemo(() => {
    if (!selectedYear) {
      return [];
    }
    return data
      .filter((row) => Number(row.year) === Number(selectedYear))
      .map((row) => ({ ...row }));
  }, [data, selectedYear]);

  const computedSummaryStats = useMemo(
    () => computeSummaryStats(filteredData, primaryVariableId),
    [filteredData, primaryVariableId],
  );

  const summaryStatsPayload = useMemo(() => {
    if (!computedSummaryStats || !primaryVariableId) {
      return {};
    }
    return { [primaryVariableId]: computedSummaryStats };
  }, [computedSummaryStats, primaryVariableId]);

  const missingYears = errors?.missing_years || [];

  const handleYearChange = (event) => {
    const nextYear = Number(event.target.value);
    updateYear(nextYear);
  };

  const handleStepYear = (direction) => {
    if (years.length === 0) {
      return;
    }
    const currentIndex = years.indexOf(selectedYear);
    if (currentIndex === -1) {
      updateYear(years[years.length - 1]);
      return;
    }
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < years.length) {
      updateYear(years[nextIndex]);
    }
  };

  const largestIncrease = metrics?.largest_increase;
  const fastestGrowth = metrics?.fastest_growth;
  const yearRange = metrics?.year_range || [metadata.start_year, metadata.end_year];

  return (
    <div className="ts-dashboard">
      <div className="ts-header">
        {onBack && (
          <button type="button" className="ts-back-button" onClick={onBack}>
            ← Back to Chat
          </button>
        )}
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
              value={selectedYear ?? years[0]}
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
            key={`${primaryVariableId}-${selectedYear}`}
            data={filteredData}
            display_variable_id={primaryVariableId}
            variable_labels={variableLabels}
            geography_level={metadata.geography_level}
            metadata={metadata}
          />
        </div>

        <aside className="ts-sidebar">
          <section className="ts-summary">
            <SummaryStatsPanel
              summaryStatistics={summaryStatsPayload}
              variableLabels={variableLabels}
              selectedVariableId={primaryVariableId}
              dataRows={filteredData}
            />
          </section>

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
            <ChartsPanel
              charts={charts}
              variableLabels={variableLabels}
              currentYear={selectedYear}
            />
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
