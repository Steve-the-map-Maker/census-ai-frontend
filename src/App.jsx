import { useState, useEffect } from 'react';
import axios from 'axios';
import MapDisplay from './components/MapDisplay';
import Dashboard from './components/Dashboard';
import TimeSeriesDashboard from './components/TimeSeriesDashboard';
import './App.css'; // We will create this file for styles
import { deriveAvailableYears, resolveDefaultYear } from './utils/timeSeries';
import { getStateCenter, DEFAULT_US_CENTER } from './utils/geography';

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

function buildConversationContext({
  previousQuery,
  responsePayload,
  currentYear,
  availableYears,
  activeFilters,
}) {
  if (!responsePayload || typeof responsePayload !== 'object') {
    return previousQuery ? { previous_query: previousQuery } : null;
  }

  const metadata = responsePayload.metadata || {};

  return {
    previous_query: previousQuery,
    dashboard_summary: responsePayload.summary_text || metadata.summary_text || '',
    current_year: currentYear ?? metadata.active_year ?? null,
    available_years: Array.isArray(availableYears) ? availableYears : metadata.years_available || [],
    active_filters: activeFilters || metadata.applied_filters || [],
    raw_payload: responsePayload,
    derived_metrics: metadata.derived_metrics || [],
    geography_level: metadata.geography_level,
    display_variable_id: metadata.display_variable_id || metadata.primary_variable_code,
  };
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [conversationContext, setConversationContext] = useState(null);
  const [currentYear, setCurrentYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  
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
      const requestPayload = conversationContext
        ? {
            query: userMessage.text,
            conversation_context: { ...conversationContext, current_query: userMessage.text },
          }
        : { query: userMessage.text };

      const response = await axios.post(`${backendUrl}/ask_ai`, requestPayload);
      const responseData = response.data;
      
      // Phase 7: Check if the response contains dashboard data or map data
      if ((responseData.type === 'dashboard_data' || responseData.type === 'map' || responseData.type === 'time_series_dashboard') && responseData.data && responseData.metadata) {
        console.log('Dashboard/Map response received:', responseData);
        
        // For dashboard_data, we use the new Dashboard component
        if (responseData.type === 'dashboard_data') {
          setActiveMapData({
            type: 'dashboard',
            dashboardData: responseData
          });
          setCurrentYear(null);
          setAvailableYears([]);
          const appliedFilters = responseData.metadata?.applied_filters || [];
          setActiveFilters(appliedFilters);
          setConversationContext(
            buildConversationContext({
              previousQuery: userMessage.text,
              responsePayload: responseData,
              currentYear: null,
              availableYears: [],
              activeFilters: appliedFilters,
            })
          );
          
          // Add a text message about the dashboard
          const aiMessage = { 
            sender: 'ai', 
            text: responseData.summary_text || `Created dashboard for ${responseData.metadata.geography_level}-level analysis` 
          };
          setMessages((prevMessages) => [...prevMessages, aiMessage]);
        } else if (responseData.type === 'time_series_dashboard') {
          const years = deriveAvailableYears(responseData.metadata, responseData.data);
          const metadataActiveYear = responseData.metadata?.active_year;
          const defaultYear = metadataActiveYear ?? resolveDefaultYear(years, responseData.metadata);
          setAvailableYears(years);
          setCurrentYear(defaultYear);
          setActiveMapData({
            type: 'time_series',
            dashboardData: responseData
          });

          const appliedFilters = responseData.metadata?.applied_filters || [];
          setActiveFilters(appliedFilters);
          setConversationContext(
            buildConversationContext({
              previousQuery: userMessage.text,
              responsePayload: responseData,
              currentYear: defaultYear,
              availableYears: years,
              activeFilters: appliedFilters,
            })
          );

          const aiMessage = {
            sender: 'ai',
            text: responseData.summary_text || 'Generated time-series dashboard.'
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
          // Set the active map data to display the map
          setActiveMapData({
            type: 'map',
            data: responseData.data,
            displayVariableId: responseData.metadata.display_variable_id || responseData.metadata.variable_id,
            variableLabels: responseData.metadata.variable_labels || {},
            metadata: responseData.metadata,
            mapCenter: getMapCenter(geoLevel, responseData.metadata.state_name),
            mapZoom: geoLevel === 'county' ? 6 : 4
          });
          setCurrentYear(null);
          setAvailableYears([]);
          setActiveFilters(responseData.metadata?.applied_filters || []);
          
          // Also add a text message about the map
          const aiMessage = { 
            sender: 'ai', 
            text: responseData.summary || `Displaying ${geoLevel}-level map for ${responseData.metadata.variable_id}` 
          };
          setMessages((prevMessages) => [...prevMessages, aiMessage]);

          setConversationContext(
            buildConversationContext({
              previousQuery: userMessage.text,
              responsePayload: responseData,
              currentYear: null,
              availableYears: [],
              activeFilters: [],
            })
          );
        }
        
      } else {
        // Regular text response
        const aiMessage = { sender: 'ai', text: responseData.response || responseData.summary || 'No response received' };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
        setConversationContext((prevContext) =>
          buildConversationContext({
            previousQuery: userMessage.text,
            responsePayload: prevContext?.raw_payload,
            currentYear,
            availableYears,
            activeFilters,
          })
        );
      }
      
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMessage = { sender: 'ai', text: 'Sorry, I couldn\'t connect to the AI. Please try again.' };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
    setIsLoading(false);
  };

  // Phase 3: Map center coordinates for different states
  function getMapCenter(geoLevel, stateName) {
    if (geoLevel === 'county' && stateName) {
      return getStateCenter(stateName);
    }
    return DEFAULT_US_CENTER;
  }

  const handleTimeSeriesYearChange = (year) => {
    if (year === null || year === undefined || Number.isNaN(Number(year))) {
      return;
    }
    const normalizedYear = Number(year);
    setCurrentYear(normalizedYear);
    setConversationContext((prev) =>
      prev
        ? {
            ...prev,
            current_year: normalizedYear,
          }
        : prev
    );
  };

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
          
          {activeMapData.type === 'dashboard' && (
            <Dashboard dashboardData={activeMapData.dashboardData} />
          )}
          {activeMapData.type === 'time_series' && (
            <TimeSeriesDashboard
              dashboardData={activeMapData.dashboardData}
              currentYear={currentYear}
              onYearChange={handleTimeSeriesYearChange}
              onBack={() => setActiveMapData(null)}
            />
          )}
          {activeMapData.type === 'map' && (
            <MapDisplay
              data={activeMapData.data}
              display_variable_id={activeMapData.displayVariableId}
              variable_labels={activeMapData.variableLabels}
              geography_level={activeMapData.metadata?.geography_level}
              metadata={activeMapData.metadata}
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
