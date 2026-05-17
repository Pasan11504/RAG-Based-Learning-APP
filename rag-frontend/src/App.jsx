import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { listDocuments } from './api';

function App() {
  // Global states (Replacing st.session_state)
  const [model, setModel] = useState('gpt-4o');
  const [sessionId, setSessionId] = useState(null);
  const [documents, setDocuments] = useState([]);

  // Fetch documents on initial load
  const fetchDocs = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  return (
    <div className="flex h-screen w-full font-sans">
      <Sidebar 
        model={model} 
        setModel={setModel} 
        documents={documents} 
        fetchDocs={fetchDocs} 
      />
      <ChatInterface 
        model={model} 
        sessionId={sessionId} 
        setSessionId={setSessionId} 
      />
    </div>
  );
}

export default App;