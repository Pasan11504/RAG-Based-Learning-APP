// const BASE_URL = 'http://127.0.0.1:8000';

// // Helper function to extract auth headers securely
// const getAuthHeaders = (extraHeaders = {}) => {
//   const token = localStorage.getItem('token');
//   return {
//     ...extraHeaders,
//     ...(token && { 'Authorization': `Bearer ${token}` })
//   };
// };

// export const registerUser = async (payload) => {
//   const response = await fetch(`${BASE_URL}/auth/register`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
//     body: JSON.stringify(payload),
//   });
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.detail || `Registration failed: ${response.statusText}`);
//   }
//   return response.json();
// };

// export const loginUser = async (email, password) => {
//   const response = await fetch(`${BASE_URL}/auth/login`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
//     body: JSON.stringify({ email, password }),
//   });
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.detail || `Login failed: ${response.statusText}`);
//   }
//   return response.json();
// };

// export const getUserProfile = async () => {
//   const response = await fetch(`${BASE_URL}/profile`, {
//     method: 'GET',
//     headers: getAuthHeaders({ 'Accept': 'application/json' }),
//   });
//   if (!response.ok) throw new Error(`Profile fetch failed: ${response.statusText}`);
//   return response.json();
// };

// export const getApiResponse = async (question, sessionId, model) => {
//   const data = { question, model, ...(sessionId && { session_id: sessionId }) };
//   const response = await fetch(`${BASE_URL}/chat`, {
//     method: 'POST',
//     headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
//     body: JSON.stringify(data),
//   });
//   if (!response.ok) throw new Error(`API error: ${response.statusText}`);
//   return response.json();
// };

// export const uploadDocument = async (file) => {
//   const formData = new FormData();
//   formData.append('file', file);
  
//   const response = await fetch(`${BASE_URL}/upload-doc`, {
//     method: 'POST',
//     headers: getAuthHeaders(),
//     body: formData,
//   });
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
//   }
//   return response.json();
// };

// export const listDocuments = async () => {
//   const response = await fetch(`${BASE_URL}/list-docs`, {
//     method: 'GET',
//     headers: getAuthHeaders({ 'Accept': 'application/json' }),
//   });
//   if (!response.ok) throw new Error(`List fetch failed: ${response.statusText}`);
//   return response.json();
// };

// export const deleteDocument = async (fileId) => {
//   const response = await fetch(`${BASE_URL}/delete-doc`, {
//     method: 'POST',
//     headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
//     body: JSON.stringify({ file_id: parseInt(fileId, 10) }),
//   });
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.detail || `Delete failed: ${response.statusText}`);
//   }
//   return response.json();
// };

// export const generateQuiz = async (fileId, questionType, numQuestions, model) => {
//   const response = await fetch(`${BASE_URL}/generate-quiz`, {
//     method: 'POST',
//     headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
//     body: JSON.stringify({
//       file_id: parseInt(fileId, 10),
//       question_type: questionType,
//       num_questions: parseInt(numQuestions, 10),
//       model: model
//     }),
//   });
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.detail || `Quiz generation failed: ${response.statusText}`);
//   }
//   return response.json();
// };

// export const autoMarkAnswer = async (payload) => {
//   const response = await fetch(`${BASE_URL}/auto-mark`, {
//     method: 'POST',
//     headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
//     body: JSON.stringify({
//       question_text: payload.questionText,
//       model_answer: payload.modelAnswer,
//       student_answer: payload.studentAnswer,
//       max_marks: parseInt(payload.maxMarks, 10),
//       model: payload.model
//     }),
//   });
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.detail || `Auto marking processing broke: ${response.statusText}`);
//   }
//   return response.json();
// };


// // Add to the very bottom of src/api.js

// export const generateLessonPlan = async (fileId, topic, durationMinutes) => {
//   const response = await fetch(`${BASE_URL}/generate-lesson`, {
//     method: 'POST',
//     headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
//     body: JSON.stringify({
//       file_id: parseInt(fileId, 10),
//       topic: topic,
//       duration_minutes: parseInt(durationMinutes, 10)
//     }),
//   });
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.detail || `Lesson generation failed: {response.statusText}`);
//   }
//   return response.json();
// };



// // Add to the very bottom of src/api.js

// export const generateTextbookQuizApi = async (fileId, questionType, numQuestions) => {
//   const response = await fetch(`${BASE_URL}/generate-quiz`, {
//     method: 'POST',
//     headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
//     body: JSON.stringify({
//       file_id: parseInt(fileId, 10),
//       question_type: questionType,
//       num_questions: parseInt(numQuestions, 10)
//     }),
//   });
//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.detail || `Quiz generation failed: ${response.statusText}`);
//   }
//   return response.json();
// };


const BASE_URL = 'http://127.0.0.1:8000';

// Helper function to extract auth headers securely
const getAuthHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem('token');
  return {
    ...extraHeaders,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const registerUser = async (payload) => {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Registration failed: ${response.statusText}`);
  }
  return response.json();
};

export const loginUser = async (email, password) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Login failed: ${response.statusText}`);
  }
  return response.json();
};

export const getUserProfile = async () => {
  const response = await fetch(`${BASE_URL}/profile`, {
    method: 'GET',
    headers: getAuthHeaders({ 'Accept': 'application/json' }),
  });
  if (!response.ok) throw new Error(`Profile fetch failed: ${response.statusText}`);
  return response.json();
};

export const getApiResponse = async (question, sessionId, model) => {
  const data = { question, model, ...(sessionId && { session_id: sessionId }) };
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
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
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
  }
  return response.json();
};

export const listDocuments = async () => {
  const response = await fetch(`${BASE_URL}/list-docs`, {
    method: 'GET',
    headers: getAuthHeaders({ 'Accept': 'application/json' }),
  });
  if (!response.ok) throw new Error(`List fetch failed: ${response.statusText}`);
  return response.json();
};

export const deleteDocument = async (fileId) => {
  const response = await fetch(`${BASE_URL}/delete-doc`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
    body: JSON.stringify({ file_id: parseInt(fileId, 10) }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Delete failed: ${response.statusText}`);
  }
  return response.json();
};

export const generateLessonPlan = async (fileId, topic, durationMinutes) => {
  const response = await fetch(`${BASE_URL}/generate-lesson`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
    body: JSON.stringify({
      file_id: parseInt(fileId, 10),
      topic: topic,
      duration_minutes: parseInt(durationMinutes, 10)
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Lesson generation failed: ${response.statusText}`);
  }
  return response.json();
};

export const generateTextbookQuizApi = async (fileId, questionType, numQuestions) => {
  const response = await fetch(`${BASE_URL}/generate-quiz`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
    body: JSON.stringify({
      file_id: parseInt(fileId, 10),
      question_type: questionType,
      num_questions: parseInt(numQuestions, 10)
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Quiz generation failed: ${response.statusText}`);
  }
  return response.json();
};

export const autoMarkAnswer = async (payload) => {
  const response = await fetch(`${BASE_URL}/auto-mark`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
    body: JSON.stringify({
      question_text: payload.questionText,
      model_answer: payload.modelAnswer,
      student_answer: payload.studentAnswer,
      max_marks: parseInt(payload.maxMarks, 10)
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Auto marking processing broke: ${response.statusText}`);
  }
  return response.json();
};