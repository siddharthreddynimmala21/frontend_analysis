import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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

export const sendMessage = async (prompt) => {
  try {
    const response = await api.post('/api/chat', { prompt });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
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
