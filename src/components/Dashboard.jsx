import { useState } from 'react';
import MapDisplay from './MapDisplay';
import SummaryStatsPanel from './SummaryStatsPanel';
import ChartsPanel from './ChartsPanel';
import VariableSelector from './VariableSelector';
import './Dashboard.css';

function Dashboard({ dashboardData }) {
  const [selectedVariableId, setSelectedVariableId] = useState(
    dashboardData.metadata.display_variable_id
  );

  const handleVariableChange = (newVariableId) => {
    setSelectedVariableId(newVariableId);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Census Data Dashboard</h2>
        <p className="dashboard-summary">{dashboardData.summary_text}</p>
        <VariableSelector
          availableVariables={dashboardData.metadata.available_variables}
          selectedVariableId={selectedVariableId}
          onVariableChange={handleVariableChange}
        />
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-map">
          <MapDisplay
            data={dashboardData.data}
            display_variable_id={selectedVariableId}
            variable_labels={dashboardData.metadata.variable_labels}
            geography_level={dashboardData.metadata.geography_level}
          />
        </div>
        
        <div className="dashboard-stats">
          <SummaryStatsPanel
            summaryStatistics={dashboardData.summary_statistics}
            variableLabels={dashboardData.metadata.variable_labels}
            selectedVariableId={selectedVariableId}
          />
        </div>
        
        <div className="dashboard-charts">
          <ChartsPanel
            charts={dashboardData.charts}
            variableLabels={dashboardData.metadata.variable_labels}
            selectedVariableId={selectedVariableId}
          />
        </div>
        
        {dashboardData.insights && dashboardData.insights.length > 0 && (
          <div className="dashboard-insights">
            <h3>🔍 Key Insights</h3>
            <ul>
              {dashboardData.insights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
