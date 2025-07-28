import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

function ChartsPanel({ charts, variableLabels }) {
  if (!charts || charts.length === 0) {
    return (
      <div className="charts-panel">
        <h3>📊 Charts</h3>
        <p>No chart data available.</p>
      </div>
    );
  }

  // Color palette for better visual appeal
  const colorPalette = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', 
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fad0c4', '#ffd1ff', '#a8edea', '#fed6e3'
  ];

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
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={11}
                    stroke="#666"
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
                    fontSize={11}
                    stroke="#666"
                  />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelStyle={{ color: '#333', fontWeight: 'bold' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name={variableName}
                    radius={[6, 6, 0, 0]}
                  >
                    {chart.data.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={colorPalette[idx % colorPalette.length]} />
                    ))}
                  </Bar>
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
