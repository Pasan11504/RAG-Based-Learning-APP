import React, { useState } from 'react';
import { uploadDocument, deleteDocument } from '../api';

const Sidebar = ({ model, setModel, documents, fetchDocs, userRole, userProfile, onLogout }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState('');

  const canManageDocs = userRole === 'admin' || userRole === 'teacher';

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadDocument(file);
      alert('File uploaded and parsed into multilingual space successfully!');
      setFile(null);
      fetchDocs();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFileId) return;
    try {
      await deleteDocument(selectedFileId);
      alert('File dropped successfully!');
      setSelectedFileId('');
      fetchDocs();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="w-80 h-screen bg-gray-50 border-r p-4 flex flex-col gap-6 overflow-y-auto font-sans">
      {/* Profile Context Banner */}
      <div className="p-3 bg-white rounded-lg border shadow-sm">
        <h4 className="font-bold text-gray-700">👤 {userProfile?.name || 'Loading Name...'}</h4>
        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">{userRole} Space</p>
        {userProfile?.school && <p className="text-xs text-gray-400 mt-1">🏫 {userProfile.school}</p>}
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2">Selected Processing Model</label>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full p-2 border rounded bg-white text-sm">
          <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant</option>
        </select>
      </div>

      {/* Upload Block (Conditional on RBAC) */}
      {canManageDocs ? (
        <div className="p-3 bg-white border rounded-lg space-y-3 shadow-sm">
          <h3 className="font-bold text-sm text-gray-800">Upload Course Resource Packet</h3>
          <input type="file" accept=".pdf,.docx,.html" onChange={(e) => setFile(e.target.files[0])} className="w-full text-xs" />
          <button onClick={handleUpload} disabled={!file || isUploading} className="w-full bg-blue-600 text-white p-2 rounded text-sm font-semibold disabled:bg-gray-300">
            {isUploading ? 'Indexing Materials...' : 'Upload Asset'}
          </button>
        </div>
      ) : (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg">
          💡 <strong>Student Note:</strong> Your queries match verified textbooks uploaded by curriculum teachers.
        </div>
      )}

      {/* Uploaded Inventory Collection */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-sm text-gray-800">Knowledge Base Base</h3>
          <button onClick={fetchDocs} className="text-xs text-blue-600 hover:underline">Refresh Inventory</button>
        </div>
        <div className="flex-1 overflow-y-auto border p-2 rounded bg-white text-xs space-y-1.5 max-h-48">
          {documents.length === 0 ? <p className="text-gray-400 text-center py-2">No resource blocks loaded.</p> : (
            documents.map(doc => (
              <div key={doc.id} className="border-b pb-1 last:border-0 last:pb-0">
                <span className="font-semibold text-gray-700 block truncate">{doc.filename}</span>
                <span className="text-gray-400">ID reference parameter: {doc.id}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Deletion Partition (Conditional on RBAC) */}
      {canManageDocs && documents.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className="w-full p-2 border rounded text-xs bg-white">
            <option value="">Select asset target to drop...</option>
            {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}
          </select>
          <button onClick={handleDelete} disabled={!selectedFileId} className="w-full bg-red-500 text-white p-2 rounded text-xs font-semibold disabled:bg-gray-300">
            Purge Selected Footprint
          </button>
        </div>
      )}

      {/* Signout Controls */}
      <button onClick={onLogout} className="w-full bg-gray-200 text-gray-700 p-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors mt-auto">
        🔓 Close System Session
      </button>
    </div>
  );
};

export default Sidebar;