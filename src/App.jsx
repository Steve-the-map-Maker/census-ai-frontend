import { useState, useEffect } from 'react';
import axios from 'axios';
import MapDisplay from './components/MapDisplay';
import Dashboard from './components/Dashboard';
import './App.css'; // We will create this file for styles

// Help component
function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>🗺️ How to Use Census AI Visualizer</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="help-modal-body">
          <section>
            <h3>📊 What You Can Ask For</h3>
            <div className="help-examples">
              <div className="help-category">
                <h4>Basic Demographics</h4>
                <ul>
                  <li>"Show population by state"</li>
                  <li>"Map median household income"</li>
                  <li>"Counties in California by population"</li>
                  <li>"Show unemployment rates by state"</li>
                </ul>
              </div>
              
              <div className="help-category">
                <h4>Comparative Analysis</h4>
                <ul>
                  <li>"Which states have more men than women?"</li>
                  <li>"Show states with highest unemployment"</li>
                  <li>"Compare male vs female population"</li>
                </ul>
              </div>
              
              <div className="help-category">
                <h4>Geographic Levels</h4>
                <ul>
                  <li><strong>States:</strong> "Population by state"</li>
                  <li><strong>Counties:</strong> "Counties in Texas by income"</li>
                  <li><strong>Places:</strong> "Cities in Florida"</li>
                </ul>
              </div>
            </div>
          </section>
          
          <section>
            <h3>🎯 Available Data</h3>
            <div className="data-categories">
              <div className="data-category">
                <strong>Population:</strong> Total, by age, by gender
              </div>
              <div className="data-category">
                <strong>Economics:</strong> Income, employment, poverty
              </div>
              <div className="data-category">
                <strong>Housing:</strong> Ownership, units, values
              </div>
              <div className="data-category">
                <strong>Education:</strong> Attainment levels
              </div>
            </div>
          </section>
          
          <section>
            <h3>💡 Tips</h3>
            <ul>
              <li>Be specific about the geographic level (state, county, city)</li>
              <li>Use natural language - ask like you're talking to a person</li>
              <li>Try comparative questions to discover insights</li>
              <li>Click on map areas to see detailed data</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

// Phase 3: Utility function to merge demographic data with GeoJSON
function mergeData(geoJson, demographicData, geoLevel, variableId) {
  console.log('Merging data:', { geoLevel, variableId, demographicDataCount: demographicData.length });
  console.log('Sample demographic data item:', demographicData[0]);
  console.log('Sample GeoJSON feature properties:', geoJson.features[0]?.properties);
  
  // Create a map for fast lookup of demographic data
  const dataMap = new Map();
  
  demographicData.forEach(item => {
    let key;
    if (geoLevel === 'state') {
      key = item.state; // Use state FIPS code
    } else if (geoLevel === 'county') {
      // Ensure proper padding for county FIPS codes
      const stateFips = item.state.padStart(2, '0');
      const countyFips = item.county.padStart(3, '0');
      key = `${stateFips}${countyFips}`; // Combine state and county FIPS
    }
    if (key) {
      dataMap.set(key, item);
      console.log(`Added to dataMap: ${key} ->`, item);
    }
  });
  
  console.log('DataMap size:', dataMap.size);
  
  // Deep copy the GeoJSON to avoid mutating the original
  const enrichedGeoJson = JSON.parse(JSON.stringify(geoJson));
  
  // Merge data into GeoJSON features
  let matchedCount = 0;
  enrichedGeoJson.features.forEach((feature, index) => {
    let lookupKey;
    
    if (geoLevel === 'state') {
      // For states, use the STATEFP or STATE property (different GeoJSON files use different names)
      lookupKey = feature.properties.STATEFP || feature.properties.STATE;
    } else if (geoLevel === 'county') {
      // For counties, combine state and county FIPS codes
      // Handle different GeoJSON property names
      const stateFp = feature.properties.STATEFP || feature.properties.STATE;
      const countyFp = feature.properties.COUNTYFP || feature.properties.COUNTY;
      if (stateFp && countyFp) {
        // Ensure we pad county FIPS to 3 digits if needed
        const paddedCounty = countyFp.padStart(3, '0');
        lookupKey = `${stateFp}${paddedCounty}`;
      }
    }
    
    if (index < 3) console.log(`Feature ${index} lookupKey: ${lookupKey}, properties:`, feature.properties);
    
    if (lookupKey && dataMap.has(lookupKey)) {
      const demographicItem = dataMap.get(lookupKey);
      // Add all demographic data to the feature properties
      Object.keys(demographicItem).forEach(key => {
        if (key !== 'state' && key !== 'county') {
          feature.properties[key] = demographicItem[key];
        }
      });
      matchedCount++;
      if (index < 3) console.log(`Matched feature ${index}:`, feature.properties);
    } else {
      // Set null values for features without data
      feature.properties[variableId] = null;
      if (index < 3) console.log(`No match for feature ${index} with key: ${lookupKey}`);
    }
  });
  
  console.log(`Data merge completed. Matched ${matchedCount}/${enrichedGeoJson.features.length} features`);
  console.log('Sample merged feature:', enrichedGeoJson.features[0]);
  return enrichedGeoJson;
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Phase 3: GeoJSON data state management
  const [geoData, setGeoData] = useState({
    states: null,
    counties: null,
    country: null,
    isLoaded: false,
    loadingError: null
  });
  
  // Phase 3: Map display state
  const [activeMapData, setActiveMapData] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  // Debug logging for environment
  console.log('Frontend Environment Debug:');
  console.log('VITE_ENV:', import.meta.env.VITE_ENV);
  console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
  console.log('Computed backendUrl:', backendUrl);
  console.log('Environment mode:', import.meta.env.MODE);

  // Phase 3: Load GeoJSON files on component mount
  useEffect(() => {
    // Warm up the backend when the component mounts
    const warmUpBackend = async () => {
      try {
        console.log('Attempting to warm up backend...');
        await fetch(`${backendUrl}/`);
        console.log('Backend warm-up initiated successfully.');
      } catch (error) {
        console.error('Error warming up backend:', error);
      }
    };

    warmUpBackend();

    console.log('Starting GeoJSON data loading...');
    const loadGeoJSONData = async () => {
      try {
        console.log('Loading GeoJSON data...');
        
        // Use Promise.all for concurrent loading
        const [statesResponse, countiesResponse, countryResponse] = await Promise.all([
          fetch('/data/states.geojson'),
          fetch('/data/counties.geojson'), 
          fetch('/data/country.geojson')
        ]);

        console.log('Response status:', {
          states: statesResponse.status,
          counties: countiesResponse.status,
          country: countryResponse.status
        });

        // Check if all requests were successful
        if (!statesResponse.ok || !countiesResponse.ok || !countryResponse.ok) {
          throw new Error('Failed to fetch one or more GeoJSON files');
        }

        // Parse JSON concurrently
        const [statesData, countiesData, countryData] = await Promise.all([
          statesResponse.json(),
          countiesResponse.json(),
          countryResponse.json()
        ]);

        console.log('GeoJSON data loaded successfully:', {
          states: statesData.features?.length,
          counties: countiesData.features?.length,
          country: countryData.features?.length
        });

        setGeoData({
          states: statesData,
          counties: countiesData,
          country: countryData,
          isLoaded: true,
          loadingError: null
        });

      } catch (error) {
        console.error('Error loading GeoJSON data:', error);
        setGeoData(prev => ({
          ...prev,
          isLoaded: false,
          loadingError: error.message
        }));
      }
    };

    loadGeoJSONData();
  }, []); // Empty dependency array ensures this runs only once

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Make sure the backend URL is correct and accessible
      const response = await axios.post(`${backendUrl}/ask_ai`, { query: userMessage.text });
      const responseData = response.data;
      
      // Phase 7: Check if the response contains dashboard data or map data
      if ((responseData.type === 'dashboard_data' || responseData.type === 'map') && responseData.data && responseData.metadata) {
        console.log('Dashboard/Map response received:', responseData);
        
        // For dashboard_data, we use the new Dashboard component
        if (responseData.type === 'dashboard_data') {
          setActiveMapData({
            type: 'dashboard',
            dashboardData: responseData
          });
          
          // Add a text message about the dashboard
          const aiMessage = { 
            sender: 'ai', 
            text: responseData.summary_text || `Created dashboard for ${responseData.metadata.geography_level}-level analysis` 
          };
          setMessages((prevMessages) => [...prevMessages, aiMessage]);
        } else {
          // Original map logic for backwards compatibility
          // Get the appropriate GeoJSON data based on geography level
          let baseGeoJson;
          const geoLevel = responseData.metadata.geography_level;
          
          if (geoLevel === 'state') {
            baseGeoJson = geoData.states;
          } else if (geoLevel === 'county') {
            baseGeoJson = geoData.counties;
          } else {
            throw new Error(`Unsupported geography level: ${geoLevel}`);
          }
          
          if (!baseGeoJson) {
            throw new Error(`GeoJSON data not available for ${geoLevel} level`);
          }
          
          // Merge the demographic data with GeoJSON
          const enrichedGeoJson = mergeData(
            baseGeoJson,
            responseData.data,
            geoLevel,
            responseData.metadata.display_variable_id || responseData.metadata.variable_id
          );
          
          // Set the active map data to display the map
          setActiveMapData({
            type: 'map',
            geojsonData: enrichedGeoJson,
            variableId: responseData.metadata.display_variable_id || responseData.metadata.variable_id,
            variableLabels: responseData.metadata.variable_labels || {},
            metadata: responseData.metadata,
            mapCenter: getMapCenter(geoLevel, responseData.metadata.state_name),
            mapZoom: geoLevel === 'county' ? 6 : 4
          });
          
          // Also add a text message about the map
          const aiMessage = { 
            sender: 'ai', 
            text: responseData.summary || `Displaying ${geoLevel}-level map for ${responseData.metadata.variable_id}` 
          };
          setMessages((prevMessages) => [...prevMessages, aiMessage]);
        }
        
      } else {
        // Regular text response
        const aiMessage = { sender: 'ai', text: responseData.response || responseData.summary || 'No response received' };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      }
      
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMessage = { sender: 'ai', text: 'Sorry, I couldn\'t connect to the AI. Please try again.' };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
    setIsLoading(false);
  };

  // Phase 3: Map center coordinates for different states
  const STATE_CENTERS = {
    'alabama': [32.3617, -86.2792],
    'alaska': [64.0685, -152.2782],
    'arizona': [34.2744, -111.2847],
    'arkansas': [34.7519, -92.1313],
    'california': [36.7783, -119.4179],
    'colorado': [39.5501, -105.7821],
    'connecticut': [41.6219, -72.7273],
    'delaware': [38.9108, -75.5277],
    'florida': [27.7663, -81.6868],
    'georgia': [32.9866, -83.6487],
    'hawaii': [21.1098, -157.5311],
    'idaho': [44.2394, -114.5103],
    'illinois': [40.3363, -89.0022],
    'indiana': [39.8647, -86.2604],
    'iowa': [42.0046, -93.2140],
    'kansas': [38.5266, -96.7265],
    'kentucky': [37.6690, -84.6701],
    'louisiana': [31.1695, -91.8678],
    'maine': [44.6939, -69.3819],
    'maryland': [39.0639, -76.8021],
    'massachusetts': [42.2373, -71.5314],
    'michigan': [43.3266, -84.5361],
    'minnesota': [45.7326, -93.9196],
    'mississippi': [32.7673, -89.6812],
    'missouri': [38.4623, -92.3020],
    'montana': [47.0527, -110.2148],
    'nebraska': [41.1289, -98.2883],
    'nevada': [38.4199, -117.1219],
    'new hampshire': [43.4525, -71.5639],
    'new jersey': [40.3140, -74.5089],
    'new mexico': [34.8405, -106.2485],
    'new york': [42.9538, -75.5268],
    'north carolina': [35.6411, -79.8431],
    'north dakota': [47.5362, -99.7930],
    'ohio': [40.3888, -82.7649],
    'oklahoma': [35.5889, -96.9028],
    'oregon': [44.5672, -122.1269],
    'pennsylvania': [40.5773, -77.2640],
    'rhode island': [41.6762, -71.5562],
    'south carolina': [33.8191, -80.9066],
    'south dakota': [44.2853, -99.4632],
    'tennessee': [35.7449, -86.7489],
    'texas': [31.0545, -97.5635],
    'utah': [40.1135, -111.8535],
    'vermont': [44.0407, -72.7093],
    'virginia': [37.7693, -78.2057],
    'washington': [47.3826, -121.0152],
    'west virginia': [38.4680, -80.9696],
    'wisconsin': [44.2619, -89.6179],
    'wyoming': [42.7475, -107.2085]
  };

  // Utility function to get map center coordinates
  function getMapCenter(geoLevel, stateName) {
    if (geoLevel === 'state') {
      // For state-level maps, center on the US
      return [39.8283, -98.5795];
    } else if (geoLevel === 'county' && stateName) {
      // For county-level maps, center on the specific state
      const stateKey = stateName.toLowerCase();
      return STATE_CENTERS[stateKey] || [39.8283, -98.5795]; // Fallback to US center
    }
    // Default to US center
    return [39.8283, -98.5795];
  }

  return (
    <div className="app-container">
      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      
      {/* Phase 3: Show loading state until GeoJSON data is ready */}
      {!geoData.isLoaded && !geoData.loadingError && (
        <div className="loading-overlay">
          <div className="loading-content">
            <h2>Loading map data...</h2>
            <p>Preparing interactive maps for Census data visualization</p>
          </div>
        </div>
      )}
      
      {/* Phase 3: Show error state if GeoJSON loading failed */}
      {geoData.loadingError && (
        <div className="error-overlay">
          <div className="error-content">
            <h2>Error loading map data</h2>
            <p>{geoData.loadingError}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      )}

      {/* Main chat interface - only show when GeoJSON data is loaded */}
      {geoData.isLoaded && !activeMapData && (
        <div className="chat-window">
          <div className="messages-area">
            <div className="welcome-message">
              <div className="welcome-header">
                <h2>🗺️ Census AI Visualizer</h2>
                <button className="help-button" onClick={() => setShowHelp(true)}>
                  ❓ Help & Examples
                </button>
              </div>
              <p>Ask me about U.S. demographic data and I'll create interactive maps for you!</p>
              
              <div className="quick-examples">
                <h3>✨ Try These Examples:</h3>
                <div className="example-buttons">
                  <button 
                    className="example-button"
                    onClick={() => setInput("Show population by state")}
                  >
                    📊 Population by State
                  </button>
                  <button 
                    className="example-button"
                    onClick={() => setInput("Which states have more men than women?")}
                  >
                    👥 Gender Comparison
                  </button>
                  <button 
                    className="example-button"
                    onClick={() => setInput("Map median household income by state")}
                  >
                    💰 Income by State
                  </button>
                  <button 
                    className="example-button"
                    onClick={() => setInput("Counties in California by population")}
                  >
                    🏘️ California Counties
                  </button>
                </div>
              </div>
              
              <div className="features-highlight">
                <div className="feature">
                  <span className="feature-icon">🗺️</span>
                  <span>Interactive Maps</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">📈</span>
                  <span>Comparative Analysis</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">🎯</span>
                  <span>Natural Language Queries</span>
                </div>
              </div>
            </div>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <p>{msg.text}</p>
              </div>
            ))}
            {isLoading && (
              <div className="message ai typing-indicator">
                <p>AI is thinking...</p>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="message-input-form">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Census data maps - e.g., 'Show population by state'"
              rows="3"
            />
            <button type="submit" disabled={isLoading}>Send</button>
          </form>
        </div>
      )}

      {/* Phase 3: Map display area */}
      {activeMapData && (
        <div className="visualization-container">
          <div className="visualization-header">
            <button onClick={() => setActiveMapData(null)} className="back-button">
              ← Back to Chat
            </button>
            <h3>{activeMapData.type === 'dashboard' ? 'Census Data Dashboard' : 'Census Data Map'}</h3>
          </div>
          
          {activeMapData.type === 'dashboard' ? (
            <Dashboard dashboardData={activeMapData.dashboardData} />
          ) : (
            <MapDisplay
              geojsonData={activeMapData.geojsonData}
              variableId={activeMapData.variableId}
              variableLabels={activeMapData.variableLabels}
              mapCenter={activeMapData.mapCenter}
              mapZoom={activeMapData.mapZoom}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
