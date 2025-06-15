import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import chroma from 'chroma-js';
import 'leaflet/dist/leaflet.css';
import './MapDisplay.css';

function MapDisplay({ geojsonData, variableId, mapCenter = [39.8283, -98.5795], mapZoom = 4 }) {
  console.log('MapDisplay props:', { variableId, featureCount: geojsonData.features?.length });
  console.log('Sample feature properties:', geojsonData.features?.[0]?.properties);
  
  // Calculate min and max values for the color scale
  const values = geojsonData.features
    .map(feature => {
      const value = feature.properties[variableId];
      console.log(`Feature property ${variableId}:`, value, typeof value);
      return parseFloat(value);
    })
    .filter(value => !isNaN(value) && value !== null && value !== undefined);
  
  console.log('Values for color scale:', { values: values.slice(0, 5), total: values.length, variableId });
  
  if (values.length === 0) {
    console.warn('No valid values found for color scale');
    console.log('Available properties in first feature:', Object.keys(geojsonData.features?.[0]?.properties || {}));
    return <div>No data available for visualization. Variable: {variableId}</div>;
  }
  
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  console.log('Min/Max values:', { minValue, maxValue });
  
  // Create a color scale using chroma-js with error handling
  let colorScale;
  try {
    colorScale = chroma.scale(['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494']).domain([minValue, maxValue]);
  } catch (error) {
    console.error('Error creating color scale:', error);
    // Fallback to a simple color scale
    colorScale = chroma.scale(['#cccccc', '#333333']).domain([minValue, maxValue]);
  }
  
  // Style function for GeoJSON features
  const style = (feature) => {
    const value = parseFloat(feature.properties[variableId]);
    let fillColor = '#cccccc'; // default gray color
    
    if (!isNaN(value) && value !== null && value !== undefined) {
      try {
        fillColor = colorScale(value).hex();
      } catch (error) {
        console.warn('Error applying color scale to value:', value, error);
        fillColor = '#cccccc';
      }
    }
    
    return {
      fillColor: fillColor,
      weight: 1,
      opacity: 1,
      color: '#666',
      fillOpacity: 0.7
    };
  };
  
  // Handle mouse events and tooltip
  const onEachFeature = (feature, layer) => {
    const value = feature.properties[variableId];
    const name = feature.properties.NAME || feature.properties.name || 'Unknown';
    const formattedValue = value ? parseFloat(value).toLocaleString() : 'No data';
    
    layer.bindTooltip(
      `<strong>${name}</strong><br/>${variableId}: ${formattedValue}`,
      {
        permanent: false,
        direction: 'center',
        className: 'custom-tooltip'
      }
    );
    
    // Add hover effects
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 2,
          color: '#333',
          fillOpacity: 0.9
        });
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(style(feature));
      }
    });
  };

  return (
    <div className="map-display">
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          key={JSON.stringify(geojsonData)}
          data={geojsonData}
          style={style}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
      
      {/* Legend */}
      <div className="map-legend">
        <h4>Legend</h4>
        <div className="legend-scale">
          <div className="legend-labels">
            <span>{minValue.toLocaleString()}</span>
            <span>{maxValue.toLocaleString()}</span>
          </div>
          <div 
            className="legend-gradient"
            style={{
              background: `linear-gradient(to right, ${colorScale(minValue).hex()}, ${colorScale(maxValue).hex()})`
            }}
          ></div>
        </div>
        <p className="legend-description">{variableId}</p>
      </div>
    </div>
  );
}

export default MapDisplay;
