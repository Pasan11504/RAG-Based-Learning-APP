import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import TeacherModules from './components/TeacherModules';
import AuthPortal from './components/AuthPortal';
import { listDocuments, getUserProfile } from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  const [model, setModel] = useState('llama-3.1-8b-instant');
  const [sessionId, setSessionId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('chat'); // Toggle for teachers: 'chat' or 'tools'

  const fetchDocs = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to sync inventory catalogs", error);
    }
  };

  // Re-verify sessions when the user reloads the tab
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profile = await getUserProfile();
          setUserRole(profile.role);
          setUserProfile(profile);
          setIsAuthenticated(true);
        } catch (err) {
          handleLogout();
        }
      }
    };
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDocs();
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = (role, profile) => {
    setUserRole(role);
    setUserProfile(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUserRole(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setSessionId(null);
    setMessages([]);
  };

  if (!isAuthenticated) {
    return <AuthPortal onAuthSuccess={handleAuthSuccess} />;
  }

  const showTeacherWorkspace = userRole === 'teacher' || userRole === 'admin';

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-white">
      <Sidebar 
        model={model} 
        setModel={setModel} 
        documents={documents} 
        fetchDocs={fetchDocs} 
        userRole={userRole}
        userProfile={userProfile}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Workspace Routing Control Bar */}
        {showTeacherWorkspace && (
          <div className="bg-gray-50 border-b px-6 py-2 flex gap-4">
            <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
              💬 Ask Chatbot
            </button>
            <button onClick={() => setActiveTab('tools')} className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${activeTab === 'tools' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
              🛠️ Teacher Dashboard Functions
            </button>
          </div>
        )}

        {/* View Switcher Engine */}
        {activeTab === 'tools' && showTeacherWorkspace ? (
          <TeacherModules documents={documents} model={model} />
        ) : (
          <ChatInterface 
            model={model} 
            sessionId={sessionId} 
            setSessionId={setSessionId} 
          />
        )}
      </div>
    </div>
  );
}

export default App;