import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import chroma from 'chroma-js';
import 'leaflet/dist/leaflet.css';
import './MapDisplay.css';
import { DEFAULT_US_CENTER, getStateCenter, getStateCenterByFips, getStateFipsFromName } from '../utils/geography';

function MapDisplay({
  data,
  display_variable_id,
  variable_labels = {},
  geography_level,
  metadata = {},
  mapCenter,
  mapZoom,
}) {
  const [geoData, setGeoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  useEffect(() => {
    if (isFullScreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [isFullScreen]);

  const focusStateName = metadata?.state_name || metadata?.stateName || null;
  const focusStateFips = useMemo(() => {
    if (metadata?.state_fips) {
      return String(metadata.state_fips).padStart(2, '0');
    }
    if (focusStateName) {
      const fipsFromName = getStateFipsFromName(focusStateName);
      if (fipsFromName) {
        return fipsFromName;
      }
    }
    if (geography_level === 'county' && Array.isArray(data)) {
      const matchingRow = data.find((row) => row?.state !== undefined && row?.state !== null);
      if (matchingRow && matchingRow.state !== undefined && matchingRow.state !== null) {
        return String(matchingRow.state).padStart(2, '0');
      }
    }
    return null;
  }, [metadata, focusStateName, data, geography_level]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) {
      return [];
    }
    if (geography_level === 'county' && focusStateFips) {
      return data.filter((row) => String(row?.state).padStart(2, '0') === focusStateFips);
    }
    return data;
  }, [data, geography_level, focusStateFips]);
  
  const computedCenter = useMemo(() => {
    if (Array.isArray(mapCenter) && mapCenter.length === 2) {
      return mapCenter;
    }
    if (geography_level === 'county') {
      if (focusStateName) {
        return getStateCenter(focusStateName);
      }
      if (focusStateFips) {
        const centerFromFips = getStateCenterByFips(focusStateFips);
        if (centerFromFips) {
          return centerFromFips;
        }
      }
    }
    if (geography_level === 'state' && focusStateName) {
      return getStateCenter(focusStateName);
    }
    if (geography_level === 'state' && focusStateFips) {
      const centerFromFips = getStateCenterByFips(focusStateFips);
      if (centerFromFips) {
        return centerFromFips;
      }
    }
    return DEFAULT_US_CENTER;
  }, [mapCenter, geography_level, focusStateName, focusStateFips]);

  const computedZoom = useMemo(() => {
    if (typeof mapZoom === 'number') {
      return mapZoom;
    }
    if (geography_level === 'county') {
      return 6;
    }
    if (geography_level === 'state' && (focusStateName || focusStateFips)) {
      return 6;
    }
    return 4;
  }, [mapZoom, geography_level, focusStateName, focusStateFips]);

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
    if (!geoData || !filteredData || !display_variable_id) {
      return null;
    }
    
    console.log('Merging data with GeoJSON', { 
      demographicDataCount: filteredData.length,
      geoFeaturesCount: geoData.features.length,
      displayVariable: display_variable_id 
    });
    
    // Create a map for fast lookup of demographic data
    const dataMap = new Map();
    
    filteredData.forEach(item => {
      let key;
      if (geography_level === 'state') {
        if (item?.state !== undefined && item?.state !== null) {
          key = String(item.state).padStart(2, '0');
        }
      } else if (geography_level === 'county') {
        // Ensure proper padding for county FIPS codes
        if (item?.state !== undefined && item?.county !== undefined) {
          const stateFips = String(item.state).padStart(2, '0');
          const countyFips = String(item.county).padStart(3, '0');
          key = `${stateFips}${countyFips}`; // Combine state and county FIPS
        }
      }
      if (key) {
        dataMap.set(key, item);
      }
    });
    
    // Optionally filter GeoJSON features down to the focus state for county-level views
    const baseFeatures = Array.isArray(geoData.features) ? geoData.features : [];
    const shouldRestrictToState = focusStateFips && (
      geography_level === 'county' ||
      (geography_level === 'state' && filteredData.length > 0 && filteredData.length <= 5)
    );

    const filteredFeatures = shouldRestrictToState
      ? baseFeatures.filter((feature) => {
          const stateFp = feature.properties.STATEFP || feature.properties.STATE;
          return stateFp && String(stateFp).padStart(2, '0') === focusStateFips;
        })
      : baseFeatures;

    if (filteredFeatures.length === 0) {
      return null;
    }

    // Deep copy the GeoJSON to avoid mutating the original
    const { features: _originalFeatures, ...rest } = geoData;
    const enrichedGeoJson = {
      ...rest,
      features: filteredFeatures.map((feature) => JSON.parse(JSON.stringify(feature))),
    };
    
    // Merge data into GeoJSON features
    enrichedGeoJson.features.forEach((feature) => {
      let lookupKey;
      
      if (geography_level === 'state') {
        // For states, use the STATEFP or STATE property
        const stateProp = feature.properties.STATEFP || feature.properties.STATE;
        if (stateProp !== undefined && stateProp !== null) {
          lookupKey = String(stateProp).padStart(2, '0');
        }
      } else if (geography_level === 'county') {
        // For counties, combine state and county FIPS codes
        const stateFp = feature.properties.STATEFP || feature.properties.STATE;
        const countyFp = feature.properties.COUNTYFP || feature.properties.COUNTY;
        if (stateFp && countyFp) {
          const paddedState = String(stateFp).padStart(2, '0');
          const paddedCounty = String(countyFp).padStart(3, '0');
          lookupKey = `${paddedState}${paddedCounty}`;
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
  }, [geoData, filteredData, display_variable_id, geography_level, focusStateFips]);

  const dataBounds = useMemo(() => {
    if (!enrichedGeoJson) return null;
    try {
      const layer = L.geoJSON(enrichedGeoJson);
      return layer.getBounds();
    } catch (error) {
      console.warn('Unable to compute bounds for GeoJSON layer', error);
      return null;
    }
  }, [enrichedGeoJson]);
  
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

  function MapControls({ bounds, defaultCenter, defaultZoom, onToggleFullScreen }) {
    const map = useMap();

    const handleFitToData = () => {
      if (bounds) {
        map.fitBounds(bounds, { padding: [24, 24] });
      }
    };

    const handleResetView = () => {
      map.setView(defaultCenter, defaultZoom, { animate: true });
    };

    return (
      <div className="map-toolbar">
        <button
          type="button"
          className="map-toolbar-btn"
          onClick={handleFitToData}
          disabled={!bounds}
        >
          Fit to data
        </button>
        <button type="button" className="map-toolbar-btn" onClick={handleResetView}>
          Reset view
        </button>
        <button type="button" className="map-toolbar-btn" onClick={onToggleFullScreen}>
          {isFullScreen ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>
    );
  }
  
  // Determine appropriate zoom and center based on geography level
  return (
    <div className={`map-display ${isFullScreen ? 'map-display--fullscreen' : ''}`}>
      <div className="map-header">
        <div>
          <h3>{variableLabel}</h3>
          {metadata?.state_name && (
            <p className="map-subtitle">Focus: {metadata.state_name}</p>
          )}
        </div>
        <button
          className="legend-toggle"
          type="button"
          onClick={() => setLegendCollapsed((prev) => !prev)}
        >
          {legendCollapsed ? 'Show legend' : 'Hide legend'}
        </button>
      </div>

      <div className="map-body">
        {!legendCollapsed && (
          <div className="map-legend-card">
            <div className="map-legend">
              <span className="legend-label">Low</span>
              <div
                className="legend-gradient"
                style={{
                  background: `linear-gradient(to right, ${colorScale(minValue).hex()}, ${colorScale(maxValue).hex()})`,
                }}
              ></div>
              <span className="legend-label">High</span>
            </div>
            <p className="legend-note">Pinch to zoom • tap shapes for exact values</p>
          </div>
        )}

        <div className="map-canvas">
          <MapContainer
            center={computedCenter}
            zoom={computedZoom}
            className="leaflet-map"
            scrollWheelZoom
            zoomControl={false}
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
            <MapControls
              bounds={dataBounds}
              defaultCenter={computedCenter}
              defaultZoom={computedZoom}
              onToggleFullScreen={() => setIsFullScreen((prev) => !prev)}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default MapDisplay;