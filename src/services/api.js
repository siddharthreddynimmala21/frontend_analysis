import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'; // Default to 3001 to match backend

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      
      // Handle authentication errors
      if (error.response.status === 401) {
        console.log('Authentication error - redirecting to login');
        // Clear invalid token
        localStorage.removeItem('token');
        
        // Show alert to user about authentication issue
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          // Only show alert if not already on login/register pages
          alert('Your session has expired or you are not authenticated. Please log in again.');
          
          // Redirect to login page
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      console.error('No response received. Backend may be down or unreachable.');
    }
    return Promise.reject(error);
  }
);

export const register = async (email) => {
  const response = await api.post('/api/auth/register', { email });
  return response.data;
};

export const verifyOTP = async (email, otp) => {
  const response = await api.post('/api/auth/verify-otp', { email, otp });
  return response.data;
};

export const setupPassword = async (email, otp, password) => {
  const response = await api.post('/api/auth/setup-password', { email, otp, password });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const resendOTP = async (email) => {
  const response = await api.post('/api/auth/resend-otp', { email });
  return response.data;
};

// Enhanced retry utility function
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry for client errors (4xx) except 408 (timeout) and 429 (rate limit)
      if (error.response && error.response.status >= 400 && error.response.status < 500 && 
          error.response.status !== 408 && error.response.status !== 429) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// RAG-based chat functions with enhanced error handling
export const uploadResumeForChat = async (formData) => {
  return retryWithBackoff(async () => {
    console.log('API: Starting resume upload request...');
    const response = await api.post('/api/chat/upload-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // Increased to 60 seconds for large files
    });
    console.log('API: Resume upload response received:', response.data);
    
    // Validate response structure
    if (!response.data || !response.data.success || !response.data.resume) {
      throw new Error('Invalid response structure from server');
    }
    
    return response.data;
  }, 3, 2000); // 3 retries with 2 second base delay
};

// Get all user resumes with enhanced retry logic
export const getResumesForChat = async () => {
  return retryWithBackoff(async () => {
    console.log('API: Fetching user resumes...');
    const response = await api.get('/api/chat/resumes');
    
    // Validate response structure
    if (!response.data || !response.data.hasOwnProperty('success')) {
      throw new Error('Invalid response structure from server');
    }
    
    console.log('API: Resumes fetched successfully:', response.data);
    return response.data;
  }, 3, 1000); // 3 retries with 1 second base delay
};

// Add a function to refresh resumes across all devices
export const refreshResumesAcrossDevices = async () => {
  try {
    // Force a fresh fetch from the server
    const response = await getResumesForChat();
    
    // Broadcast to other tabs/windows if they exist
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('resume-updates');
      channel.postMessage({ type: 'RESUMES_UPDATED', data: response });
    }
    
    return response;
  } catch (error) {
    console.error('Error refreshing resumes across devices:', error);
    throw error;
  }
};

// Delete a specific resume with retry logic
export const deleteResumeForChat = async (resumeId) => {
  return retryWithBackoff(async () => {
    console.log(`API: Starting resume deletion for ID: ${resumeId}`);
    const response = await api.delete(`/api/chat/resumes/${resumeId}`);
    
    // Validate response structure
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response structure from server');
    }
    
    console.log('API: Resume deletion successful:', response.data);
    return response.data;
  }, 3, 1000); // 3 retries with 1 second base delay
};

export const sendMessage = async (question, conversationHistory = [], resumeId) => {
  try {
    const response = await api.post('/api/chat/query', { 
      question,
      conversationHistory,
      resumeId
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const checkHasResume = async () => {
  try {
    const response = await api.get('/api/chat/has-resume');
    return response.data;
  } catch (error) {
    console.error('Error checking resume:', error);
    throw error;
  }
};

// Function to calculate the mean of an array using Python backend
export const calculateArrayMean = async (name, numbers) => {
  try {
    console.log('API: Sending array mean calculation request...');
    const response = await api.get('/api/python/hello', {
      params: {
        name,
        numbers
      }
    });
    
    console.log('API: Array mean calculation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error calculating array mean:', error);
    throw error;
  }
};

export const deleteResumeData = async () => {
  try {
    const response = await api.delete('/api/chat/resume-data');
    return response.data;
  } catch (error) {
    console.error('Error deleting resume data:', error);
    throw error;
  }
};

// Legacy chat function (for basic AI chat without RAG)
export const sendBasicMessage = async (prompt) => {
  try {
    const response = await api.post('/api/chat', { prompt });
    return response.data;
  } catch (error) {
    console.error('Error sending basic message:', error);
    throw error;
  }
};

/**
 * Upload and parse resume PDF
 * @param {FormData} formData - FormData containing the PDF file
 * @returns {Promise<Object>} Parsed resume text
 */
export const uploadResume = async (formData) => {
  try {
    console.log('Uploading resume...');
    
    // Log the contents of FormData
    for (let [key, value] of formData.entries()) {
      console.log(`FormData entry - Key: ${key}, Value:`, value);
    }

    // Use the configured API base URL instead of relative URL
    const response = await fetch(`${API_BASE_URL}/api/resume/parse`, {
      method: 'POST',
      body: formData,
    });

    // Log the full response details
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text for debugging
    const responseText = await response.text();
    console.log('Raw Response Text:', responseText);

    // Try to parse the response body
    let responseData;
    const contentType = response.headers.get('content-type');
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
      console.log('Parsed response:', responseData);
    } catch (parseError) {
      console.error('JSON Parsing Error:', parseError);
      console.log('Unparseable response text:', responseText);
      throw new Error(`Unexpected response format: ${responseText}`);
    }

    // Check for error in the response
    if (!response.ok) {
      throw new Error(
        responseData?.message || 
        responseData?.error || 
        'Failed to upload resume. Please try again.'
      );
    }

    // Validate response data
    if (!responseData) {
      throw new Error('No data received from server');
    }

    return responseData;
  } catch (error) {
    console.error('Resume Upload Full Error:', error);
    
    // More detailed error logging
    if (error instanceof TypeError) {
      console.error('Network Error:', error.message);
    }
    
    throw error;
  }
};

/**
 * Upload and analyze resume PDF with AI
 * Extracts structured information (work experience, education, skills)
 * @param {FormData} formData - FormData containing the PDF file, currentRole, targetRole, experience, and jobDescription
 * @returns {Promise<Object>} Structured resume analysis
 */
export const analyzeResume = async (formData) => {
  try {
    console.log('Analyzing resume with AI...');
    
    // Log the contents of FormData
    for (let [key, value] of formData.entries()) {
      console.log(`FormData entry - Key: ${key}, Value:`, value);
    }

    // Use the configured API base URL instead of relative URL
    const response = await fetch(`${API_BASE_URL}/api/python/analyze-resume`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    // Log the full response details
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text for debugging
    const responseText = await response.text();
    console.log('Raw Response Text:', responseText);

    // Try to parse the response body
    let responseData;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
      console.log('Parsed analysis response:', responseData);
    } catch (parseError) {
      console.error('JSON Parsing Error:', parseError);
      console.log('Unparseable response text:', responseText);
      throw new Error(`Unexpected response format: ${responseText}`);
    }

    // Check for error in the response
    if (!response.ok) {
      throw new Error(
        responseData?.message || 
        responseData?.error || 
        'Failed to analyze resume. Please try again.'
      );
    }

    // Validate response data
    if (!responseData) {
      throw new Error('No data received from server');
    }

    return responseData;
  } catch (error) {
    console.error('Resume Analysis Full Error:', error);
    
    // More detailed error logging
    if (error instanceof TypeError) {
      console.error('Network Error:', error.message);
    }
    
    throw error;
  }
};

export const forgotPassword = async (email) => {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
};

export const verifyResetOTP = async (email, otp) => {
  const response = await api.post('/api/auth/verify-reset-otp', { email, otp });
  return response.data;
};

export const resetPassword = async (email, otp, password) => {
  const response = await api.post('/api/auth/reset-password', { email, otp, password });
  return response.data;
};

/**
 * Upload resume and job description, match skills using Gemini
 * @param {FormData} formData - FormData containing the PDF file and jobDescription
 * @returns {Promise<Object>} Skill match report
 */
export const matchResumeSkills = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/match-skills`, {
      method: 'POST',
      body: formData,
    });
    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      throw new Error(`Unexpected response format: ${responseText}`);
    }
    if (!response.ok) {
      throw new Error(
        responseData?.message || 
        responseData?.error || 
        'Failed to match skills. Please try again.'
      );
    }
    if (!responseData) {
      throw new Error('No data received from server');
    }
    return responseData;
  } catch (error) {
    throw error;
  }
};

// Chat History Management API Functions

/**
 * Save chat history to the database
 * @param {Object} chatData - { chatId, resumeId, chatName, messages }
 * @returns {Promise<Object>} Success response
 */
export const saveChatHistory = async (chatData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(chatData)
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to save chat history');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get chat history from the database
 * @param {string} chatId - Chat ID
 * @returns {Promise<Array>} Array of messages
 */
export const getChatHistory = async (chatId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/history/${chatId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to get chat history');
    }
    return data.messages || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's chat sessions
 * @returns {Promise<Array>} Array of chat sessions
 */
export const getChatSessions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to get chat sessions');
    }
    return data.sessions || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Delete chat history
 * @param {string} chatId - Chat ID
 * @returns {Promise<Object>} Success response
 */
export const deleteChatHistory = async (chatId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/history/${chatId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to delete chat history');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate a job description using Gemini based on experience, role, and company
 * @param {Object} params - { experience, role, company }
 * @returns {Promise<string>} Generated job description
 */
export const generateJobDescription = async ({ experience, role, company }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/generate-jd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experience, role, company }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to generate job description');
    }
    return data.jobDescription;
  } catch (error) {
    throw error;
  }
};

/**
 * Get role relevance score using Gemini based on currentRole and targetRole
 * @param {Object} params - { currentRole, targetRole }
 * @returns {Promise<string>} Role relevance report
 */
export const getRoleRelevanceReport = async ({ currentRole, targetRole }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/role-relevance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentRole, targetRole }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to get role relevance report');
    }
    return data.report;
  } catch (error) {
    throw error;
  }
};

/**
 * Extract and analyze projects section for ATS optimization
 * @param {FormData} formData - FormData containing the PDF file
 * @returns {Promise<Object>} Projects and ATS analysis
 */
export const analyzeProjects = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/projects`, {
      method: 'POST',
      body: formData,
    });
    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      throw new Error(`Unexpected response format: ${responseText}`);
    }
    if (!response.ok) {
      throw new Error(
        responseData?.message || 
        responseData?.error || 
        'Failed to analyze projects. Please try again.'
      );
    }
    if (!responseData) {
      throw new Error('No data received from server');
    }
    return responseData;
  } catch (error) {
    throw error;
  }
};

/**
 * Extract and analyze work experience section for ATS optimization
 * @param {FormData} formData - FormData containing the PDF file
 * @returns {Promise<Object>} Work experience and ATS analysis
 */
export const analyzeWorkExperience = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/work-experience`, {
      method: 'POST',
      body: formData,
    });
    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      throw new Error(`Unexpected response format: ${responseText}`);
    }
    if (!response.ok) {
      throw new Error(
        responseData?.message || 
        responseData?.error || 
        'Failed to analyze work experience. Please try again.'
      );
    }
    if (!responseData) {
      throw new Error('No data received from server');
    }
    return responseData;
  } catch (error) {
    throw error;
  }
};

// The analyzeResume function is already defined earlier in this file
