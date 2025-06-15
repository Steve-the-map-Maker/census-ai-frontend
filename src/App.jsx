import { useState, useEffect } from 'react';
import axios from 'axios';
import MapDisplay from './components/MapDisplay';
import './App.css'; // We will create this file for styles

// Phase 3: Utility function to merge demographic data with GeoJSON
function mergeData(geoJson, demographicData, geoLevel, variableId) {
  console.log('Merging data:', { geoLevel, variableId, demographicDataCount: demographicData.length });
  
  // Create a map for fast lookup of demographic data
  const dataMap = new Map();
  
  demographicData.forEach(item => {
    let key;
    if (geoLevel === 'state') {
      key = item.state; // Use state FIPS code
    } else if (geoLevel === 'county') {
      key = `${item.state}${item.county}`; // Combine state and county FIPS
    }
    if (key) {
      dataMap.set(key, item);
    }
  });
  
  // Deep copy the GeoJSON to avoid mutating the original
  const enrichedGeoJson = JSON.parse(JSON.stringify(geoJson));
  
  // Merge data into GeoJSON features
  enrichedGeoJson.features.forEach(feature => {
    let lookupKey;
    
    if (geoLevel === 'state') {
      // For states, use the STATEFP or STATE property
      lookupKey = feature.properties.STATEFP || feature.properties.STATE;
    } else if (geoLevel === 'county') {
      // For counties, combine state and county FIPS codes
      const stateFp = feature.properties.STATEFP;
      const countyFp = feature.properties.COUNTYFP;
      if (stateFp && countyFp) {
        lookupKey = `${stateFp}${countyFp}`;
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
      feature.properties[variableId] = null;
    }
  });
  
  console.log('Data merge completed. Sample feature:', enrichedGeoJson.features[0]);
  return enrichedGeoJson;
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Phase 3: Load GeoJSON files on component mount
  useEffect(() => {
    const loadGeoJSONData = async () => {
      try {
        console.log('Loading GeoJSON data...');
        
        // Use Promise.all for concurrent loading
        const [statesResponse, countiesResponse, countryResponse] = await Promise.all([
          fetch('/data/states.geojson'),
          fetch('/data/counties.geojson'), 
          fetch('/data/country.geojson')
        ]);

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
      
      // Phase 3: Check if the response contains map data
      if (responseData.type === 'map' && responseData.data && responseData.metadata) {
        console.log('Map response received:', responseData);
        
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
          responseData.metadata.variable_id
        );
        
        // Set the active map data to display the map
        setActiveMapData({
          geojsonData: enrichedGeoJson,
          variableId: responseData.metadata.variable_id,
          metadata: responseData.metadata,
          mapCenter: geoLevel === 'county' ? [36.7783, -119.4179] : [39.8283, -98.5795], // California center for counties, US center for states
          mapZoom: geoLevel === 'county' ? 6 : 4
        });
        
        // Also add a text message about the map
        const aiMessage = { 
          sender: 'ai', 
          text: responseData.summary || `Displaying ${geoLevel}-level map for ${responseData.metadata.variable_id}` 
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
        
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

  return (
    <div className="app-container">
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
              <h2>🗺️ Census AI Visualizer</h2>
              <p>Ask me about U.S. demographic data and I can show you interactive maps!</p>
              <p className="suggestion">Try: "Show me a map of population by state" or "Map median income for California counties"</p>
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
        <div className="map-container">
          <div className="map-header">
            <button onClick={() => setActiveMapData(null)} className="back-button">
              ← Back to Chat
            </button>
            <h3>Census Data Map</h3>
          </div>
          <MapDisplay
            geojsonData={activeMapData.geojsonData}
            variableId={activeMapData.variableId}
            mapCenter={activeMapData.mapCenter}
            mapZoom={activeMapData.mapZoom}
          />
        </div>
      )}
    </div>
  );
}

export default App;
