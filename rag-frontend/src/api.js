const BASE_URL = 'http://127.0.0.1:8000';

export const getApiResponse = async (question, sessionId, model) => {
  const data = { question, model, ...(sessionId && { session_id: sessionId }) };
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  return response.json();
};

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${BASE_URL}/upload-doc`, {
    method: 'POST',
    body: formData, // fetch automatically sets the correct multipart/form-data boundary
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
  return response.json();
};

export const listDocuments = async () => {
  const response = await fetch(`${BASE_URL}/list-docs`);
  if (!response.ok) throw new Error(`List fetch failed: ${response.statusText}`);
  return response.json();
};

export const deleteDocument = async (fileId) => {
  const response = await fetch(`${BASE_URL}/delete-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
  if (!response.ok) throw new Error(`Delete failed: ${response.statusText}`);
  return response.json();
};