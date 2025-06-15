import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // We will create this file for styles

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

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
      const aiMessage = { sender: 'ai', text: response.data.response };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMessage = { sender: 'ai', text: 'Sorry, I couldn\'t connect to the AI. Please try again.' };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
    setIsLoading(false);
  };

  return (
    <div className="app-container">
      <div className="chat-window">
        <div className="messages-area">
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
            placeholder="Ask the AI about U.S. Census data..."
            rows="3"
          />
          <button type="submit" disabled={isLoading}>Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;
