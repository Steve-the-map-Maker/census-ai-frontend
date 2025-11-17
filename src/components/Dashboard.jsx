import { useState, useEffect, useMemo } from 'react';
import MapDisplay from './MapDisplay';
import SummaryStatsPanel from './SummaryStatsPanel';
import ChartsPanel from './ChartsPanel';
import VariableSelector from './VariableSelector';
import { deriveAvailableYears, resolveDefaultYear } from '../utils/timeSeries';
import './Dashboard.css';

const isMobileScreen = () =>
  typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

const deriveStats = (rows = [], summaryStatistics = {}, variableId) => {
  if (!variableId) return null;
  if (summaryStatistics?.[variableId]) {
    return summaryStatistics[variableId];
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const numericValues = rows
    .map((row) => Number(row?.[variableId]))
    .filter((value) => !Number.isNaN(value));

  if (!numericValues.length) {
    return null;
  }

  const sorted = [...numericValues].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const minValue = sorted[0];
  const maxValue = sorted[sorted.length - 1];
  const minRow = rows.find((row) => Number(row?.[variableId]) === minValue);
  const maxRow = rows.find((row) => Number(row?.[variableId]) === maxValue);

  return {
    mean,
    median,
    min: minValue,
    max: maxValue,
    count: sorted.length,
    min_entity_name: minRow?.NAME ?? 'N/A',
    max_entity_name: maxRow?.NAME ?? 'N/A',
  };
};

const formatStatValue = (value, variableId = '') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A';
  }

  const numeric = Number(value);
  const treatAsPercentage =
    typeof variableId === 'string' &&
    (variableId.includes('percentage') || variableId.includes('rate'));

  if (treatAsPercentage) {
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

function Dashboard({ dashboardData, isTimeSeries = false, currentYear = null, onYearChange, onBack }) {
  // Time-series vs static data detection
  const allData = useMemo(() => dashboardData.data || [], [dashboardData.data]);
  const metadata = useMemo(() => dashboardData.metadata || {}, [dashboardData.metadata]);
  const hasYearColumn = Array.isArray(allData) && allData.length > 0 && allData[0]?.year !== undefined;
  const detectedTimeSeries = isTimeSeries || hasYearColumn;

  const primaryVariableId = metadata.primary_variable_code || metadata.display_variable_id;
  const variableLabels = metadata.variable_labels || {};
  
  const [selectedVariableId, setSelectedVariableId] = useState(primaryVariableId);
  const [isMobile, setIsMobile] = useState(isMobileScreen());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('stats');

  // Time-series year management
  const years = useMemo(() => {
    if (!detectedTimeSeries) return [];
    return deriveAvailableYears(metadata, allData);
  }, [detectedTimeSeries, metadata, allData]);

  const defaultYear = useMemo(() => {
    if (!detectedTimeSeries || years.length === 0) return null;
    return resolveDefaultYear(years, metadata);
  }, [detectedTimeSeries, years, metadata]);

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

  const selectedYear = useMemo(() => {
    if (!detectedTimeSeries) return null;
    if (currentYear !== null && currentYear !== undefined) {
      return Number(currentYear);
    }
    if (internalYear !== null && internalYear !== undefined) {
      return Number(internalYear);
    }
    return defaultYear;
  }, [detectedTimeSeries, currentYear, internalYear, defaultYear]);

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
    if (!detectedTimeSeries) {
      return allData;
    }
    if (!selectedYear) {
      return [];
    }
    return allData.filter((row) => Number(row.year) === Number(selectedYear));
  }, [detectedTimeSeries, allData, selectedYear]);

  // Mobile/desktop responsive behavior
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) {
        setIsDrawerOpen(false);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const currentStats = useMemo(
    () =>
      deriveStats(
        filteredData,
        dashboardData.summary_statistics,
        selectedVariableId,
      ),
    [filteredData, dashboardData.summary_statistics, selectedVariableId],
  );

  const insightsAvailable = Array.isArray(dashboardData.insights) && dashboardData.insights.length > 0;
  const chartsAvailable = Array.isArray(dashboardData.charts) && dashboardData.charts.length > 0;

  const availablePanels = useMemo(
    () => [
      { id: 'stats', label: 'Summary', icon: '📈', disabled: false },
      { id: 'charts', label: 'Charts', icon: '📊', disabled: !chartsAvailable },
      { id: 'insights', label: 'Insights', icon: '🔍', disabled: !insightsAvailable },
    ],
    [chartsAvailable, insightsAvailable],
  );

  const firstAvailablePanel = useMemo(
    () => availablePanels.find((panel) => !panel.disabled)?.id ?? 'stats',
    [availablePanels],
  );

  useEffect(() => {
    const currentPanelStillValid = availablePanels.some(
      (panel) => panel.id === activePanel && !panel.disabled,
    );
    if (!currentPanelStillValid) {
      setActivePanel(firstAvailablePanel);
    }
  }, [activePanel, availablePanels, firstAvailablePanel]);

  const handleVariableChange = (newVariableId) => {
    setSelectedVariableId(newVariableId);
  };

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const renderActivePanel = () => {
    if (activePanel === 'charts' && !chartsAvailable) {
      return <p className="panel-placeholder">Charts will appear when available.</p>;
    }

    if (activePanel === 'insights' && !insightsAvailable) {
      return <p className="panel-placeholder">Insights will appear when available.</p>;
    }

    switch (activePanel) {
      case 'charts':
        return (
          <ChartsPanel
            charts={dashboardData.charts}
            variableLabels={variableLabels}
            selectedVariableId={selectedVariableId}
            currentYear={detectedTimeSeries ? selectedYear : null}
          />
        );
      case 'insights':
        return (
          <div className="dashboard-insights">
            <ul>
              {dashboardData.insights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </div>
        );
      case 'stats':
      default:
        return (
          <SummaryStatsPanel
            summaryStatistics={dashboardData.summary_statistics}
            variableLabels={variableLabels}
            selectedVariableId={selectedVariableId}
            dataRows={filteredData}
          />
        );
    }
  };

  const handleYearChange = (event) => {
    const nextYear = Number(event.target.value);
    updateYear(nextYear);
  };

  const handleStepYear = (direction) => {
    if (years.length === 0) return;
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

  const metrics = dashboardData.metrics || {};
  const largestIncrease = metrics.largest_increase;
  const fastestGrowth = metrics.fastest_growth;
  const yearRange = metrics.year_range || [metadata.start_year, metadata.end_year];
  const missingYears = dashboardData.errors?.missing_years || [];

  const quickStats = currentStats
    ? [
        { label: 'Median', value: currentStats.median },
        { label: 'Mean', value: currentStats.mean },
        { label: 'Range', value: currentStats.max - currentStats.min },
        { label: 'Count', value: currentStats.count },
      ].filter(({ value }) => value !== null && value !== undefined)
    : [];

  const topBottomEntities = currentStats
    ? [
        { label: 'Low', value: currentStats.min_entity_name },
        { label: 'High', value: currentStats.max_entity_name },
      ]
    : [];

  return (
    <div className="map-first-dashboard">
      <header className="dashboard-hero">
        <div>
          {onBack && (
            <button type="button" className="back-link" onClick={onBack}>
              ← Back to Chat
            </button>
          )}
          <p className="dashboard-eyebrow">
            {detectedTimeSeries ? 'Time-series analysis' : 'AI-powered census explorer'}
          </p>
          <h2>{detectedTimeSeries ? 'Explore change over time' : 'Explore patterns through the map first'}</h2>
          <p>{dashboardData.summary_text}</p>
        </div>
        <div className="hero-actions">
          {!detectedTimeSeries && metadata.available_variables && (
            <VariableSelector
              availableVariables={metadata.available_variables}
              selectedVariableId={selectedVariableId}
              onVariableChange={handleVariableChange}
            />
          )}
          <button
            type="button"
            className="drawer-toggle-btn"
            onClick={toggleDrawer}
          >
            {isDrawerOpen ? 'Hide data panels' : 'Show data panels'}
          </button>
        </div>
      </header>

      {detectedTimeSeries && years.length > 0 && (
        <div className="ts-year-controls">
          <button
            type="button"
            className="year-step-btn"
            onClick={() => handleStepYear(-1)}
            disabled={selectedYear === years[0]}
          >
            ◀
          </button>
          <div className="year-slider-block">
            <label htmlFor="year-slider">
              Year: <strong>{selectedYear || 'N/A'}</strong>
            </label>
            <input
              id="year-slider"
              type="range"
              min={years[0]}
              max={years[years.length - 1]}
              step={1}
              value={selectedYear ?? years[0]}
              onChange={handleYearChange}
            />
          </div>
          <button
            type="button"
            className="year-step-btn"
            onClick={() => handleStepYear(1)}
            disabled={selectedYear === years[years.length - 1]}
          >
            ▶
          </button>
        </div>
      )}

      <div className="map-first-grid">
        <section className="map-focus-column">
          <div className="map-focus-card">
            <div className="map-focus-header">
              <div>
                <p className="map-focus-label">
                  {detectedTimeSeries ? `${selectedYear || 'N/A'}` : 'Current variable'}
                </p>
                <h3>
                  {variableLabels?.[selectedVariableId] || selectedVariableId}
                </h3>
              </div>
              <div className="map-focus-tags">
                <span>{metadata.geography_level}</span>
                {metadata?.state_name && <span>{metadata.state_name}</span>}
              </div>
            </div>

            <MapDisplay
              key={`${selectedVariableId}-${selectedYear || 'static'}`}
              data={filteredData}
              display_variable_id={selectedVariableId}
              variable_labels={variableLabels}
              geography_level={metadata.geography_level}
              metadata={metadata}
            />

            {quickStats.length > 0 && (
              <div className="map-quick-stats">
                {quickStats.map((stat) => (
                  <div className="map-quick-card" key={stat.label}>
                    <p className="label">{stat.label}</p>
                    <p className="value">{formatStatValue(stat.value, selectedVariableId)}</p>
                  </div>
                ))}
              </div>
            )}

            {topBottomEntities.length > 0 && (
              <div className="map-entities-pill">
                {topBottomEntities.map((item) => (
                  <span key={item.label}>
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="data-drawer data-drawer--desktop" aria-label="Data panels">
          <div className="drawer-tabs">
            {availablePanels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                className={`drawer-tab ${panel.id === activePanel ? 'is-active' : ''}`}
                onClick={() => setActivePanel(panel.id)}
                disabled={panel.disabled}
              >
                <span role="img" aria-hidden="true">{panel.icon}</span>
                {panel.label}
              </button>
            ))}
          </div>
          <div className="drawer-body">
            {detectedTimeSeries && (largestIncrease || fastestGrowth) && (
              <section className="ts-metrics-summary">
                <h3>Key Changes {yearRange && yearRange.length === 2 && `(${yearRange[0]}–${yearRange[1]})`}</h3>
                <div className="ts-metric-grid">
                  {largestIncrease && (
                    <article>
                      <h4>Largest Change</h4>
                      <p className="ts-metric-value">{formatStatValue(largestIncrease.metrics?.absolute_change)}</p>
                      <p className="ts-metric-geo">{largestIncrease.NAME || '—'}</p>
                    </article>
                  )}
                  {fastestGrowth && (
                    <article>
                      <h4>Fastest Growth</h4>
                      <p className="ts-metric-value">{formatStatValue(fastestGrowth.metrics?.percent_change)}%</p>
                      <p className="ts-metric-geo">{fastestGrowth.NAME || '—'}</p>
                    </article>
                  )}
                </div>
                {missingYears.length > 0 && (
                  <div className="ts-warning">Missing data for: {missingYears.join(', ')}</div>
                )}
              </section>
            )}
            {renderActivePanel()}
          </div>
        </aside>
      </div>

      <div className={`data-drawer data-drawer--mobile ${isDrawerOpen ? 'is-open' : ''}`}>
        <div className="drawer-handle" />
        <div className="drawer-tabs">
          {availablePanels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              className={`drawer-tab ${panel.id === activePanel ? 'is-active' : ''}`}
              onClick={() => setActivePanel(panel.id)}
              disabled={panel.disabled}
            >
              <span role="img" aria-hidden="true">{panel.icon}</span>
              {panel.label}
            </button>
          ))}
        </div>
        <div className="drawer-body">
          {detectedTimeSeries && (largestIncrease || fastestGrowth) && (
            <section className="ts-metrics-summary">
              <h3>Key Changes {yearRange && yearRange.length === 2 && `(${yearRange[0]}–${yearRange[1]})`}</h3>
              <div className="ts-metric-grid">
                {largestIncrease && (
                  <article>
                    <h4>Largest Change</h4>
                    <p className="ts-metric-value">{formatStatValue(largestIncrease.metrics?.absolute_change)}</p>
                    <p className="ts-metric-geo">{largestIncrease.NAME || '—'}</p>
                  </article>
                )}
                {fastestGrowth && (
                  <article>
                    <h4>Fastest Growth</h4>
                    <p className="ts-metric-value">{formatStatValue(fastestGrowth.metrics?.percent_change)}%</p>
                    <p className="ts-metric-geo">{fastestGrowth.NAME || '—'}</p>
                  </article>
                )}
              </div>
              {missingYears.length > 0 && (
                <div className="ts-warning">Missing data for: {missingYears.join(', ')}</div>
              )}
            </section>
          )}
          {renderActivePanel()}
        </div>
      </div>

      {isDrawerOpen && isMobile && (
        <button type="button" className="drawer-backdrop" onClick={toggleDrawer} aria-label="Close data drawer" />
      )}
    </div>
  );
}

export default Dashboard;
