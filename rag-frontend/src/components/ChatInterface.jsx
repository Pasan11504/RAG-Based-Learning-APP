import React, { useState, useRef, useEffect } from 'react';
import { getApiResponse } from '../api';

const ChatInterface = ({ model, sessionId, setSessionId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const response = await getApiResponse(userMsg, sessionId, model);
      if (response.session_id) setSessionId(response.session_id);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer,
        details: response
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-gray-400 text-center mt-10">Start a conversation...</div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl rounded-lg p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              
              {/* Expander for Assistant details (equivalent to st.expander) */}
              {msg.details && (
                <details className="mt-4 text-sm bg-white p-2 rounded text-gray-800 cursor-pointer border">
                  <summary className="font-semibold outline-none">Details</summary>
                  <div className="mt-2 space-y-2">
                    <p><strong>Model Used:</strong> <code>{msg.details.model}</code></p>
                    <p><strong>Session ID:</strong> <code>{msg.details.session_id}</code></p>
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-lg p-4 animate-pulse">Generating response...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-4 border-t bg-gray-50">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            className="flex-1 p-3 border rounded-lg focus:outline-blue-500 shadow-sm"
            placeholder="Type your query here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button 
            type="submit" 
            disabled={isTyping || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;