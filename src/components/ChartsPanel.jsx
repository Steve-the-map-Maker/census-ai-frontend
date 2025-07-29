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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const value = data.value;
      const variableName = data.name;
      const color = data.fill || data.color || '#667eea'; // Use the bar's fill color
      
      let formattedValue;
      if (variableName && (variableName.includes('%') || variableName.includes('Rate') || variableName.includes('Percentage'))) {
        formattedValue = `${value.toFixed(1)}%`;
      } else if (Math.abs(value) >= 1000) {
        formattedValue = value.toLocaleString();
      } else {
        formattedValue = value.toFixed(2);
      }

      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '13px'
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#333' }}>{label}</p>
          <p style={{ margin: 0, color: color }}>
            <span style={{ fontWeight: 'bold' }}>{variableName}:</span> {formattedValue}
          </p>
        </div>
      );
    }
    return null;
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
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <XAxis 
                    dataKey="name" 
                    angle={-35}
                    textAnchor="end"
                    height={100}
                    fontSize={10}
                    stroke="#666"
                    interval={0}
                    tick={{ fontSize: 10, fill: '#555' }}
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
                    fontSize={10}
                    stroke="#666"
                    tick={{ fontSize: 10, fill: '#555' }}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
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
