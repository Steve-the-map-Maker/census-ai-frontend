function SummaryStatsPanel({ summaryStatistics, variableLabels, selectedVariableId }) {
  const stats = summaryStatistics[selectedVariableId];
  const variableName = variableLabels[selectedVariableId] || selectedVariableId;

  if (!stats) {
    return (
      <div className="summary-stats-panel">
        <h3>📈 Summary Statistics</h3>
        <p>No statistics available for the selected variable.</p>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    
    // For percentages (values that are likely percentages)
    if (selectedVariableId.includes('percentage') || selectedVariableId.includes('rate')) {
      return `${num.toFixed(1)}%`;
    }
    
    // For large numbers, add commas
    if (Math.abs(num) >= 1000) {
      return num.toLocaleString();
    }
    
    return num.toFixed(2);
  };

  return (
    <div className="summary-stats-panel">
      <h3>📈 Summary Statistics</h3>
      <h4>{variableName}</h4>
      
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Mean:</span>
          <span className="stat-value">{formatNumber(stats.mean)}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Median:</span>
          <span className="stat-value">{formatNumber(stats.median)}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Minimum:</span>
          <span className="stat-value">{formatNumber(stats.min)}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Maximum:</span>
          <span className="stat-value">{formatNumber(stats.max)}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Count:</span>
          <span className="stat-value">{stats.count}</span>
        </div>
      </div>
      
      {stats.min_entity_name && stats.max_entity_name && (
        <div className="extremes">
          <div className="extreme-item">
            <span className="extreme-label">Lowest:</span>
            <span className="extreme-value">{stats.min_entity_name}</span>
          </div>
          <div className="extreme-item">
            <span className="extreme-label">Highest:</span>
            <span className="extreme-value">{stats.max_entity_name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SummaryStatsPanel;
