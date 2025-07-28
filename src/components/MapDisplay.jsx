import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import chroma from 'chroma-js';
import 'leaflet/dist/leaflet.css';
import './MapDisplay.css';

function MapDisplay({ 
  data, 
  display_variable_id, 
  variable_labels = {}, 
  geography_level,
  mapCenter = [39.8283, -98.5795], 
  mapZoom = 4 
}) {
  const [geoData, setGeoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load GeoJSON data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        setIsLoading(true);
        
        let geoJsonUrl;
        if (geography_level === 'state') {
          geoJsonUrl = '/data/states.geojson';
        } else if (geography_level === 'county') {
          geoJsonUrl = '/data/counties.geojson';
        } else {
          console.warn(`Unsupported geography level: ${geography_level}`);
          setIsLoading(false);
          return;
        }
        
        console.log(`Loading GeoJSON from: ${geoJsonUrl}`);
        const response = await fetch(geoJsonUrl);
        if (!response.ok) {
          throw new Error(`Failed to load GeoJSON: ${response.status}`);
        }
        
        const geoJson = await response.json();
        console.log(`Loaded ${geoJson.features?.length} ${geography_level} features`);
        setGeoData(geoJson);
      } catch (error) {
        console.error('Error loading GeoJSON data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (geography_level) {
      loadGeoData();
    }
  }, [geography_level]);
  
  // Merge demographic data with GeoJSON
  const enrichedGeoJson = useMemo(() => {
    if (!geoData || !data || !display_variable_id) {
      return null;
    }
    
    console.log('Merging data with GeoJSON', { 
      demographicDataCount: data.length, 
      geoFeaturesCount: geoData.features.length,
      displayVariable: display_variable_id 
    });
    
    // Create a map for fast lookup of demographic data
    const dataMap = new Map();
    
    data.forEach(item => {
      let key;
      if (geography_level === 'state') {
        key = item.state; // Use state FIPS code
      } else if (geography_level === 'county') {
        // Ensure proper padding for county FIPS codes
        const stateFips = item.state.padStart(2, '0');
        const countyFips = item.county.padStart(3, '0');
        key = `${stateFips}${countyFips}`; // Combine state and county FIPS
      }
      if (key) {
        dataMap.set(key, item);
      }
    });
    
    // Deep copy the GeoJSON to avoid mutating the original
    const enrichedGeoJson = JSON.parse(JSON.stringify(geoData));
    
    // Merge data into GeoJSON features
    enrichedGeoJson.features.forEach((feature) => {
      let lookupKey;
      
      if (geography_level === 'state') {
        // For states, use the STATEFP or STATE property
        lookupKey = feature.properties.STATEFP || feature.properties.STATE;
      } else if (geography_level === 'county') {
        // For counties, combine state and county FIPS codes
        const stateFp = feature.properties.STATEFP || feature.properties.STATE;
        const countyFp = feature.properties.COUNTYFP || feature.properties.COUNTY;
        if (stateFp && countyFp) {
          const paddedCounty = countyFp.padStart(3, '0');
          lookupKey = `${stateFp}${paddedCounty}`;
        }
      }
      
      if (lookupKey && dataMap.has(lookupKey)) {
        const demographicItem = dataMap.get(lookupKey);
        // Add all demographic data to the feature properties
        Object.keys(demographicItem).forEach(key => {
          if (key !== 'state' && key !== 'county') {
            feature.properties[key] = demographicItem[key];
          }
        });
      } else {
        // Set null values for features without data
        feature.properties[display_variable_id] = null;
      }
    });
    
    console.log('Data merge complete', { 
      featuresWithData: enrichedGeoJson.features.filter(f => f.properties[display_variable_id] !== null).length 
    });
    
    return enrichedGeoJson;
  }, [geoData, data, display_variable_id, geography_level]);
  
  if (isLoading) {
    return (
      <div className="map-loading">
        <h3>🗺️ Loading Map...</h3>
        <p>Preparing geographic data for visualization</p>
      </div>
    );
  }
  
  if (!enrichedGeoJson) {
    return (
      <div className="map-loading">
        <h3>⚠️ Map Unavailable</h3>
        <p>Unable to load geographic data for {geography_level} level</p>
      </div>
    );
  }
  
  // Rest of the MapDisplay logic (color scale, styling, etc.)
  const variableLabel = variable_labels[display_variable_id] || display_variable_id;
  
  // Calculate min and max values for the color scale
  const values = enrichedGeoJson.features
    .map(feature => {
      const value = feature.properties[display_variable_id];
      return parseFloat(value);
    })
    .filter(value => !isNaN(value) && value !== null && value !== undefined);
  
  if (values.length === 0) {
    return (
      <div className="map-loading">
        <h3>📊 No Data Available</h3>
        <p>No valid data found for {variableLabel}</p>
      </div>
    );
  }
  
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Create a color scale using chroma-js
  const colorScale = chroma.scale(['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494']).domain([minValue, maxValue]);
  
  // Style function for GeoJSON features
  const style = (feature) => {
    const value = parseFloat(feature.properties[display_variable_id]);
    let fillColor = '#cccccc'; // default gray color
    
    if (!isNaN(value) && value !== null && value !== undefined) {
      try {
        fillColor = colorScale(value).hex();
      } catch (error) {
        console.warn('Error applying color scale for value:', value, error);
        fillColor = '#cccccc';
      }
    }
    
    return {
      fillColor: fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  };
  
  // Create popup content for features
  const onEachFeature = (feature, layer) => {
    const value = feature.properties[display_variable_id];
    const name = feature.properties.NAME || 'Unknown';
    
    let formattedValue = 'No data';
    if (value !== null && value !== undefined && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      // Format based on variable type
      if (display_variable_id.includes('income') || display_variable_id.includes('value')) {
        formattedValue = `$${numValue.toLocaleString()}`;
      } else if (display_variable_id.includes('percentage') || display_variable_id.includes('rate')) {
        formattedValue = `${numValue.toFixed(1)}%`;
      } else if (numValue >= 1000) {
        formattedValue = numValue.toLocaleString();
      } else {
        formattedValue = numValue.toFixed(2);
      }
    }
    
    layer.bindPopup(`
      <div style="font-family: Arial, sans-serif;">
        <strong>${name}</strong><br/>
        ${variableLabel}: ${formattedValue}
      </div>
    `);
    
    // Add hover effects
    layer.on({
      mouseover: function(e) {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#666',
          dashArray: '',
          fillOpacity: 0.9
        });
        layer.bringToFront();
      },
      mouseout: function(e) {
        // Reset to original style
        const layer = e.target;
        layer.setStyle(style(feature));
      }
    });
  };
  
  // Determine appropriate zoom and center based on geography level
  const mapSettings = {
    center: geography_level === 'county' ? mapCenter : [39.8283, -98.5795],
    zoom: geography_level === 'county' ? Math.max(mapZoom, 6) : 4
  };
  
  return (
    <div className="map-display">
      <div className="map-header">
        <h3>{variableLabel}</h3>
        <div className="map-legend">
          <span className="legend-label">Low</span>
          <div className="legend-gradient" style={{
            background: `linear-gradient(to right, ${colorScale(minValue).hex()}, ${colorScale(maxValue).hex()})`
          }}></div>
          <span className="legend-label">High</span>
        </div>
      </div>
      
      <MapContainer 
        center={mapSettings.center} 
        zoom={mapSettings.zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON 
          data={enrichedGeoJson} 
          style={style}
          onEachFeature={onEachFeature}
          key={display_variable_id} // Force re-render when variable changes
        />
      </MapContainer>
    </div>
  );
}

export default MapDisplay;