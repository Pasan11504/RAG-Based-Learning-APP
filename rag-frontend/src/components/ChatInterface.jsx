import React, { useState, useRef, useEffect } from 'react';
import { getApiResponse } from '../api';

const ChatInterface = ({ model, sessionId, setSessionId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

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
      setMessages(prev => [...prev, { role: 'assistant', content: `Processing Failure error: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-white font-sans">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-gray-400 text-center mt-10">
            🤖 Ask anything from your uploaded learning materials...
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl rounded-lg p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 border'}`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
              
              {msg.details && (
                <details className="mt-4 text-xs bg-white p-2 rounded text-gray-700 cursor-pointer border">
                  <summary className="font-semibold outline-none">Execution Metrics Tracker</summary>
                  <div className="mt-2 space-y-1 border-t pt-2 text-gray-500">
                    <p><strong>Model Engine:</strong> <code>{msg.details.model}</code></p>
                    <p><strong>Active Session ID:</strong> <code>{msg.details.session_id}</code></p>
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 text-sm rounded-lg p-4 animate-pulse border">
              Analyzing text indexes and compiling output...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t bg-gray-50">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            className="flex-1 p-3 border rounded-lg focus:outline-blue-500 shadow-sm text-sm"
            placeholder="Ask a question from the uploaded textbooks..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button 
            type="submit" 
            disabled={isTyping || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-sm disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
          >
            Send Question
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;