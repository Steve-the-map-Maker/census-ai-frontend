import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ChartsPanel({ charts, variableLabels }) {
  if (!charts || charts.length === 0) {
    return (
      <div className="charts-panel">
        <h3>📊 Charts</h3>
        <p>No chart data available.</p>
      </div>
    );
  }

  const formatTooltipValue = (value, name) => {
    // Check if this is likely a percentage
    if (name && (name.includes('%') || name.includes('Rate') || name.includes('Percentage'))) {
      return [`${value.toFixed(1)}%`, name];
    }
    
    // Format large numbers with commas
    if (Math.abs(value) >= 1000) {
      return [value.toLocaleString(), name];
    }
    
    return [value.toFixed(2), name];
  };

  return (
    <div className="charts-panel">
      <h3>📊 Charts</h3>
      {charts.map((chart, index) => {
        if (chart.chart_type === 'bar_chart') {
          const variableName = variableLabels[chart.variable_id] || chart.variable_id;
          
          return (
            <div key={index} className="chart-container">
              <h4>{chart.title}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chart.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000000) {
                        return `${(value / 1000000).toFixed(1)}M`;
                      } else if (Math.abs(value) >= 1000) {
                        return `${(value / 1000).toFixed(1)}K`;
                      }
                      return value.toString();
                    }}
                  />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{ 
                      backgroundColor: '#f9f9f9', 
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="#667eea" 
                    name={variableName}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        }
        
        return (
          <div key={index} className="chart-container">
            <p>Chart type "{chart.chart_type}" not supported yet.</p>
          </div>
        );
      })}
    </div>
  );
}

export default ChartsPanel;
