import React, { useState } from 'react';
import { uploadDocument, deleteDocument } from '../api';

const Sidebar = ({ model, setModel, documents, fetchDocs }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadDocument(file);
      alert('File uploaded successfully!');
      setFile(null);
      fetchDocs(); // Refresh list after upload
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
      alert('File deleted successfully!');
      setSelectedFileId('');
      fetchDocs(); // Refresh list after delete
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="w-80 h-screen bg-gray-50 border-r p-4 flex flex-col gap-6 overflow-y-auto">
      {/* Model Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2">Select Model</label>
        <select 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4o-mini">gpt-4o-mini</option>
        </select>
      </div>

      {/* Upload Document */}
      <div>
        <h3 className="font-semibold mb-2">Upload Document</h3>
        <input 
          type="file" 
          accept=".pdf,.docx,.html" 
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-2 text-sm"
        />
        <button 
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full bg-blue-600 text-white p-2 rounded disabled:bg-gray-400"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* Uploaded Documents */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Uploaded Documents</h3>
          <button onClick={fetchDocs} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        <div className="text-xs text-gray-600 mb-4 max-h-40 overflow-y-auto border p-2 rounded bg-white">
          {documents.length === 0 ? "No documents uploaded." : (
            documents.map(doc => (
              <div key={doc.id} className="border-b py-1 last:border-0">
                {doc.filename} <br/>
                <span className="text-gray-400">ID: {doc.id}</span>
              </div>
            ))
          )}
        </div>

        {/* Delete Document */}
        <select 
          value={selectedFileId} 
          onChange={(e) => setSelectedFileId(e.target.value)}
          className="w-full p-2 border rounded text-sm mb-2"
        >
          <option value="">Select doc to delete...</option>
          {documents.map(doc => (
            <option key={doc.id} value={doc.id}>{doc.filename}</option>
          ))}
        </select>
        <button 
          onClick={handleDelete}
          disabled={!selectedFileId}
          className="w-full bg-red-500 text-white p-2 rounded disabled:bg-gray-400"
        >
          Delete Selected
        </button>
      </div>
    </div>
  );
};

export default Sidebar;